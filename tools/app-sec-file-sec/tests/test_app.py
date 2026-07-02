"""Tests for AI Guard Chat API. Use pytest; mocks external Ollama and Guard calls."""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

# Reset module-level config before importing app so tests don't share state
import app as app_module


@pytest.fixture
def client():
    return TestClient(app_module.app)


@pytest.fixture(autouse=True)
def reset_config():
    """Reset in-memory config before each test."""
    cfg = app_module._config
    cfg["ollama_base_url"] = ""
    cfg["ollama_model"] = ""
    cfg["v1_api_key"] = ""
    cfg["v1_guard_url_base"] = app_module.DEFAULT_GUARD_URL
    cfg["v1_guard_enabled"] = True
    cfg["v1_guard_detailed"] = False
    cfg["enforce_side"] = "both"
    yield
    # teardown: leave default
    cfg["ollama_base_url"] = ""
    cfg["ollama_model"] = ""
    cfg["v1_api_key"] = ""


def test_healthz(client):
    r = client.get("/healthz")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert "ollama_configured" in data
    assert "guard_configured" in data


def test_get_config(client):
    r = client.get("/api/config")
    assert r.status_code == 200
    data = r.json()
    assert "ollama_base_url" in data
    assert "ollama_model" in data
    assert "v1_guard_url_base" in data
    assert data["v1_guard_url_base"] == app_module.DEFAULT_GUARD_URL


def test_update_config(client):
    r = client.post(
        "/api/config",
        json={
            "ollama_base_url": "http://ollama:11434",
            "ollama_model": "llama3.2",
            "v1_api_key": "secret123456",
            "v1_guard_url_base": "https://api.xdr.trendmicro.com/v3.0/aiSecurity/applyGuardrails",
            "v1_guard_enabled": True,
            "v1_guard_detailed": False,
            "enforce_side": "both",
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["ollama_base_url"] == "http://ollama:11434"
    assert data["ollama_model"] == "llama3.2"
    assert data["v1_api_key_set"] is True
    assert data["v1_api_key_masked"] != "secret123456"

    assert app_module._config["ollama_base_url"] == "http://ollama:11434"
    assert app_module._config["ollama_model"] == "llama3.2"
    assert app_module._config["v1_api_key"] == "secret123456"


def test_list_ollama_models_requires_url(client):
    r = client.get("/api/ollama/models")
    assert r.status_code == 400
    assert "base URL" in (r.json().get("detail") or "")


@patch("app.httpx.AsyncClient")
def test_list_ollama_models_success(mock_client_class, client):
    mock_resp = MagicMock()
    mock_resp.json.return_value = {"models": [{"name": "llama3.2", "details": {}}]}
    mock_resp.raise_for_status = MagicMock()

    mock_instance = AsyncMock()
    mock_instance.get = AsyncMock(return_value=mock_resp)
    mock_instance.__aenter__ = AsyncMock(return_value=mock_instance)
    mock_instance.__aexit__ = AsyncMock(return_value=None)
    mock_client_class.return_value = mock_instance

    r = client.get("/api/ollama/models?base_url=http://ollama:11434")
    assert r.status_code == 200
    data = r.json()
    assert data["models"] == [{"name": "llama3.2", "details": {}}]


@patch("app.httpx.AsyncClient")
def test_list_ollama_models_connect_error(mock_client_class, client):
    import httpx
    mock_instance = AsyncMock()
    mock_instance.get = AsyncMock(side_effect=httpx.ConnectError("connection refused"))
    mock_instance.__aenter__ = AsyncMock(return_value=mock_instance)
    mock_instance.__aexit__ = AsyncMock(return_value=None)
    mock_client_class.return_value = mock_instance

    r = client.get("/api/ollama/models?base_url=http://bad:11434")
    assert r.status_code == 502
    assert "Cannot connect" in (r.json().get("detail") or "")


def test_chat_requires_config(client):
    r = client.post("/api/chat", json={"messages": [{"role": "user", "content": "Hi"}]})
    assert r.status_code == 400
    assert "Configure" in (r.json().get("detail") or "")


def test_chat_requires_messages(client):
    app_module._config["ollama_base_url"] = "http://ollama:11434"
    app_module._config["ollama_model"] = "llama3.2"
    r = client.post("/api/chat", json={"messages": []})
    assert r.status_code == 400


@patch("app.httpx.AsyncClient")
def test_chat_success_no_guard(mock_client_class, client):
    app_module._config["ollama_base_url"] = "http://ollama:11434"
    app_module._config["ollama_model"] = "llama3.2"
    app_module._config["v1_api_key"] = ""  # no guard

    mock_resp = MagicMock()
    mock_resp.json.return_value = {"message": {"role": "assistant", "content": "Hello!"}}
    mock_resp.raise_for_status = MagicMock()

    mock_instance = AsyncMock()
    mock_instance.post = AsyncMock(return_value=mock_resp)
    mock_instance.__aenter__ = AsyncMock(return_value=mock_instance)
    mock_instance.__aexit__ = AsyncMock(return_value=None)
    mock_client_class.return_value = mock_instance

    r = client.post(
        "/api/chat",
        json={"messages": [{"role": "user", "content": "Hi"}]},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["message"]["content"] == "Hello!"
    assert data["guard"] is None


@patch("app.httpx.AsyncClient")
def test_chat_guard_blocks_prompt(mock_client_class, client):
    app_module._config["ollama_base_url"] = "http://ollama:11434"
    app_module._config["ollama_model"] = "llama3.2"
    app_module._config["v1_api_key"] = "key"
    app_module._config["enforce_side"] = "both"

    # First call: guard (user prompt) returns not allowed
    guard_resp = MagicMock()
    guard_resp.json.return_value = {"allowed": False, "reason": "Unsafe"}
    guard_resp.raise_for_status = MagicMock()

    mock_instance = AsyncMock()
    call_count = 0
    async def post(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return guard_resp
        raise RuntimeError("Ollama should not be called when guard blocks")
    mock_instance.post = AsyncMock(side_effect=post)
    mock_instance.get = AsyncMock()
    mock_instance.__aenter__ = AsyncMock(return_value=mock_instance)
    mock_instance.__aexit__ = AsyncMock(return_value=None)
    mock_client_class.return_value = mock_instance

    r = client.post(
        "/api/chat",
        json={"messages": [{"role": "user", "content": "bad prompt"}]},
    )
    assert r.status_code == 200
    data = r.json()
    assert "Blocked by AI Guard" in data["message"]["content"]
    assert data["guard"]["allowed"] is False


def test_index_returns_html(client):
    r = client.get("/")
    assert r.status_code == 200
    assert "text/html" in r.headers.get("content-type", "")
    assert "AI Guard Chat" in r.text
