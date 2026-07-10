"""
TrendAI Vision One — Chatbot (demo)

This tool is a chat interface in front of the REAL Trend Vision One MCP
server (github.com/andrefernandes86/trendai-vision-one-mcp-server). It is not
a simulation: every "tool call" the assistant makes is a genuine MCP
tools/call request sent over stdio to the actual compiled Go binary, which in
turn makes a real HTTPS call to the Trend Vision One API using the API key
you configure below. Nothing about the Vision One data is fabricated.

Architecture (mirrors the AI Scanner tool):
  - The user configures two independent things in the UI, both kept in
    memory only, never written to disk or returned to the client in
    plaintext:
      1. A Trend Vision One API key + region + read-only toggle.
      2. An LLM endpoint (the bundled local Ollama, or any external
         OpenAI-compatible endpoint) that must support tool/function calling.
  - On every chat turn, the backend spawns `v1-mcp-server` as a subprocess,
    speaks MCP over its stdio, asks it for its live tool list, converts that
    list into OpenAI-style function-calling `tools`, and runs a standard
    agentic loop: send the conversation + tools to the configured LLM -> if
    it requests a tool call, execute it against the real MCP server -> feed
    the result back -> repeat until the model gives a final answer (or a
    step cap is hit) -> close the subprocess.
  - By default the MCP server runs in `-readonly=true` mode (the upstream
    project's own default and explicit safety recommendation). Flipping to
    write mode enables genuinely destructive Vision One actions (deleting
    IAM accounts/API keys, deleting threat intel objects, inviting accounts,
    etc.) — the UI requires an explicit confirmation before that's allowed.
"""

import asyncio
import json
import os
import urllib.error
import urllib.request
from pathlib import Path

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

APP_DIR = Path(__file__).parent
OLLAMA_BASE = "http://ollama:11434"
V1_MCP_BIN = "/usr/local/bin/v1-mcp-server"
REGIONS = ["us", "eu", "au", "jp", "sg", "in", "mea"]
MAX_TOOL_ROUNDS = 6
CHAT_LOCK = asyncio.Lock()

app = FastAPI()

# --- Settings (in-memory only) ------------------------------------------

V1_SETTINGS: dict = {"api_key": "", "region": "us", "readonly": True}
LLM_SETTINGS: dict = {"targetType": "ollama", "endpointUrl": "", "apiKey": "", "model": ""}


def mask_key(key: str) -> str:
    # Fixed-width mask regardless of key length — real Vision One API keys
    # are long JWTs, so filling with one '•' per character (the old
    # behavior) produced a mask dozens of characters long that overflowed
    # and wrapped badly in the UI.
    if not key:
        return ""
    if len(key) <= 8:
        return "•" * len(key)
    return key[:4] + "••••••••" + key[-4:]


@app.get("/api/settings/v1")
def get_v1_settings():
    return {
        "hasApiKey": bool(V1_SETTINGS["api_key"]),
        "maskedKey": mask_key(V1_SETTINGS["api_key"]),
        "region": V1_SETTINGS["region"],
        "readonly": V1_SETTINGS["readonly"],
        "regions": REGIONS,
    }


@app.post("/api/settings/v1")
async def save_v1_settings(body: dict):
    api_key = str(body.get("apiKey", "")).strip()
    region = str(body.get("region", "")).strip() or "us"
    readonly = bool(body.get("readonly", True))
    if region not in REGIONS:
        raise HTTPException(400, f"Unknown region '{region}'. Must be one of: {', '.join(REGIONS)}")
    if api_key:
        V1_SETTINGS["api_key"] = api_key
    V1_SETTINGS["region"] = region
    V1_SETTINGS["readonly"] = readonly
    return {
        "ok": True,
        "hasApiKey": bool(V1_SETTINGS["api_key"]),
        "maskedKey": mask_key(V1_SETTINGS["api_key"]),
        "region": V1_SETTINGS["region"],
        "readonly": V1_SETTINGS["readonly"],
    }


@app.post("/api/settings/v1/clear-key")
def clear_v1_key():
    """Drop the Vision One API key from memory so the tool can be handed off
    to the next person without carrying over the previous operator's
    credential. (Python strings are immutable, so this can't overwrite the
    underlying memory bytes — but it does remove the only reference to the
    key, which is the strongest guarantee this process can make; the string
    becomes unreachable and eligible for garbage collection immediately.)"""
    V1_SETTINGS["api_key"] = ""
    return {"ok": True, "hasApiKey": False}


@app.get("/api/settings/llm")
def get_llm_settings():
    return {
        "targetType": LLM_SETTINGS["targetType"],
        "endpointUrl": LLM_SETTINGS["endpointUrl"],
        "hasApiKey": bool(LLM_SETTINGS["apiKey"]),
        "model": LLM_SETTINGS["model"],
    }


@app.post("/api/settings/llm")
async def save_llm_settings(body: dict):
    target_type = str(body.get("targetType", "ollama")).strip()
    if target_type not in ("ollama", "openai"):
        raise HTTPException(400, "targetType must be 'ollama' or 'openai'.")
    LLM_SETTINGS["targetType"] = target_type
    LLM_SETTINGS["endpointUrl"] = str(body.get("endpointUrl", "")).strip()
    api_key = str(body.get("apiKey", "")).strip()
    if api_key:
        LLM_SETTINGS["apiKey"] = api_key
    LLM_SETTINGS["model"] = str(body.get("model", "")).strip()
    return {"ok": True, **get_llm_settings()}


@app.post("/api/settings/llm/clear-key")
def clear_llm_key():
    """Drop the external LLM endpoint's API key from memory (same guarantee
    as clear_v1_key above — see that docstring)."""
    LLM_SETTINGS["apiKey"] = ""
    return {"ok": True, **get_llm_settings()}


# --- Model discovery (identical approach to the AI Scanner tool) --------

def normalize_openai_base(url: str) -> str:
    url = (url or "").strip().rstrip("/")
    if url.endswith("/models"):
        url = url[: -len("/models")]
    return url.rstrip("/")


def ollama_list_models() -> list[dict]:
    try:
        with urllib.request.urlopen(f"{OLLAMA_BASE}/api/tags", timeout=10) as resp:
            data = json.load(resp)
    except (urllib.error.URLError, OSError, json.JSONDecodeError) as e:
        raise HTTPException(502, f"Could not reach the local Ollama service: {e}")
    models = []
    for m in data.get("models", []):
        details = m.get("details", {})
        models.append({
            "name": m.get("name") or m.get("model"),
            "parameter_size": details.get("parameter_size", "unknown"),
            "family": details.get("family", "unknown"),
        })
    return models


@app.get("/api/llm/local-models")
def api_local_models():
    return {"models": ollama_list_models()}


@app.post("/api/llm/target-models")
async def api_target_models(body: dict):
    """List models from an external OpenAI-compatible endpoint (GET /models)."""
    url = normalize_openai_base(str(body.get("endpointUrl", "")))
    key = str(body.get("apiKey", "")).strip()
    if not url:
        raise HTTPException(400, "An endpoint URL is required to list models.")
    models_url = url + "/models"
    req = urllib.request.Request(models_url, headers={"Accept": "application/json"})
    if key:
        req.add_header("Authorization", "Bearer " + key)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.load(resp)
    except urllib.error.HTTPError as e:
        raise HTTPException(502, f"The endpoint returned HTTP {e.code} for {models_url}. Check the URL and API key.")
    except (urllib.error.URLError, OSError, json.JSONDecodeError) as e:
        raise HTTPException(502, f"Could not reach {models_url}: {e}")
    items = data.get("data") or data.get("models") or (data if isinstance(data, list) else [])
    ids = []
    for m in items:
        mid = (m.get("id") or m.get("name")) if isinstance(m, dict) else str(m)
        if mid:
            ids.append(mid)
    return {"models": sorted(set(ids))}


# --- MCP client: spawn the real v1-mcp-server binary over stdio ---------

def v1_mcp_params() -> StdioServerParameters:
    if not V1_SETTINGS["api_key"]:
        raise HTTPException(400, "Set a Trend Vision One API key first.")
    env = os.environ.copy()
    env["TREND_VISION_ONE_API_KEY"] = V1_SETTINGS["api_key"]
    readonly_flag = "true" if V1_SETTINGS["readonly"] else "false"
    return StdioServerParameters(
        command=V1_MCP_BIN,
        args=["-region", V1_SETTINGS["region"], f"-readonly={readonly_flag}"],
        env=env,
    )


async def mcp_list_tools() -> list[dict]:
    params = v1_mcp_params()
    try:
        async with stdio_client(params) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                tools = await session.list_tools()
                return [
                    {"name": t.name, "description": t.description or "", "inputSchema": t.inputSchema or {}}
                    for t in tools.tools
                ]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(502, f"Could not start the Vision One MCP server: {e}")


# Category label for each tool-name prefix, used purely for the Capabilities
# browser in the UI — matches the toolset groupings in the MCP server source.
TOOL_CATEGORIES = [
    ("cloud_posture_", "Cloud Posture"),
    ("iam_", "Identity & Access Management"),
    ("crem_", "Attack Surface Risk Management (CREM)"),
    ("cam_", "Cloud Account Management"),
    ("email_security_", "Email Security"),
    ("container_security_", "Container Security"),
    ("endpoint_security_", "Endpoint Security"),
    ("aisecurity_", "AI Security Guardrails"),
    ("cloud_risk_management_", "Cloud Risk Management"),
    ("workbench_", "Workbench"),
    ("threatintel_", "Threat Intelligence"),
]


def categorize_tool(name: str) -> str:
    for prefix, label in TOOL_CATEGORIES:
        if name.startswith(prefix):
            return label
    return "Other"


@app.get("/api/tools")
async def api_list_tools():
    tools = await mcp_list_tools()
    grouped: dict[str, list] = {}
    for t in tools:
        grouped.setdefault(categorize_tool(t["name"]), []).append(t)
    for cat in grouped:
        grouped[cat].sort(key=lambda t: t["name"])
    return {"total": len(tools), "readonly": V1_SETTINGS["readonly"], "categories": grouped}


# --- Chat -----------------------------------------------------------------

CHAT_HISTORY: list[dict] = []


def system_prompt() -> str:
    mode_note = (
        "You are running in READ-ONLY mode: write/destructive tools (deleting IAM accounts or API keys, "
        "deleting threat intel objects/reports, adding suspicious objects, inviting accounts, running cloud "
        "posture scans, etc.) are not registered on the server and are not available to you."
        if V1_SETTINGS["readonly"] else
        "You are running in WRITE mode: destructive tools ARE available (deleting IAM accounts/API keys, "
        "deleting threat intel objects, inviting/removing accounts, etc.). These make real, often irreversible "
        "changes to the connected Vision One tenant. Always state plainly what a write action will do before "
        "calling it, and only call it if the user's request clearly asks for that action."
    )
    return (
        "You are a security operations assistant with live tool access to a real Trend Vision One tenant "
        "via its MCP server (Cloud Posture, IAM, Attack Surface Risk Management [CREM], Cloud Account "
        "Management, Email Security, Container Security, Endpoint Security, AI Security Guardrails, Cloud "
        "Risk Management, Workbench alerts, and Threat Intelligence).\n\n"
        "HARD RULES — do not break these:\n"
        "1. NEVER answer a question about the tenant's actual data (scores, counts, names, IDs, statuses, "
        "findings, dates, anything specific) without first calling a tool that returns it. Do not invent "
        "example JSON, example numbers, or 'here's what it might look like' illustrations — if you show data, "
        "it must be a real tool result, not a template.\n"
        "2. If the user's request doesn't map cleanly onto any available tool, say so explicitly ('I don't "
        "have a tool that returns X directly, but here's the closest thing I can check...') rather than "
        "answering with generic security knowledge dressed up as tenant-specific fact.\n"
        "3. There is no single 'risk index' or 'overall risk score' tool. Vision One exposes risk as a "
        "per-entity `riskScore`/`latestRiskScore` field on individual devices, users, cloud assets, and local "
        "apps (the crem_attack_surface_* tools, sortable by orderBy=latestRiskScore), and as `score`/`severity` "
        "on Workbench alerts. When asked about 'risk index' or 'how risky is my tenant', call the relevant "
        "crem_attack_surface_*_list tool(s) ordered by risk score and summarize the highest-risk entities you "
        "actually found — do not describe the concept in the abstract.\n"
        "4. When a tool returns a list, summarize the meaningful findings rather than dumping raw JSON. If a "
        "tool call fails (bad API key, permissions, invalid parameter), tell the user plainly what went "
        "wrong instead of quietly falling back to a made-up answer.\n\n" + mode_note
    )


def mcp_tools_to_openai(tools: list[dict]) -> list[dict]:
    out = []
    for t in tools:
        schema = t["inputSchema"] or {"type": "object", "properties": {}}
        out.append({
            "type": "function",
            "function": {
                "name": t["name"],
                "description": (t["description"] or "")[:1024],
                "parameters": schema,
            },
        })
    return out


async def llm_chat_completion(messages: list[dict], tools: list[dict]) -> dict:
    cfg = LLM_SETTINGS
    if cfg["targetType"] == "ollama":
        base = OLLAMA_BASE + "/v1"
        model = cfg["model"] or "llama3.2:1b"
        headers = {"Authorization": "Bearer ollama-local-no-auth"}
    else:
        base = normalize_openai_base(cfg["endpointUrl"])
        if not base:
            raise HTTPException(400, "Configure the LLM endpoint first (Settings → Model Endpoint).")
        model = cfg["model"]
        if not model:
            raise HTTPException(400, "Pick a model for the configured LLM endpoint first.")
        headers = {}
        if cfg["apiKey"]:
            headers["Authorization"] = "Bearer " + cfg["apiKey"]
    try:
        async with httpx.AsyncClient(timeout=180) as client:
            resp = await client.post(
                base + "/chat/completions",
                json={"model": model, "messages": messages, "tools": tools, "tool_choice": "auto"},
                headers=headers,
            )
    except httpx.HTTPError as e:
        raise HTTPException(502, f"Could not reach the LLM endpoint: {e}")
    if resp.status_code >= 400:
        raise HTTPException(502, f"LLM endpoint returned HTTP {resp.status_code}: {resp.text[:500]}")
    try:
        return resp.json()
    except json.JSONDecodeError:
        raise HTTPException(502, "LLM endpoint did not return valid JSON.")


@app.post("/api/chat")
async def api_chat(body: dict):
    user_msg = str(body.get("message", "")).strip()
    if not user_msg:
        raise HTTPException(400, "Message is required.")
    if not V1_SETTINGS["api_key"]:
        raise HTTPException(400, "Set a Trend Vision One API key first (Settings → Vision One Connection).")
    if LLM_SETTINGS["targetType"] == "openai" and not LLM_SETTINGS["endpointUrl"]:
        raise HTTPException(400, "Configure the LLM endpoint first (Settings → Model Endpoint).")

    if CHAT_LOCK.locked():
        raise HTTPException(409, "Already processing a message — wait for it to finish.")

    async with CHAT_LOCK:
        CHAT_HISTORY.append({"role": "user", "content": user_msg})
        messages = [{"role": "system", "content": system_prompt()}] + [
            {"role": m["role"], "content": m["content"]} for m in CHAT_HISTORY
        ]
        tool_call_log: list[dict] = []

        params = v1_mcp_params()
        try:
            async with stdio_client(params) as (read, write):
                async with ClientSession(read, write) as session:
                    await session.initialize()
                    tools_resp = await session.list_tools()
                    mcp_tools = [
                        {"name": t.name, "description": t.description or "", "inputSchema": t.inputSchema or {}}
                        for t in tools_resp.tools
                    ]
                    openai_tools = mcp_tools_to_openai(mcp_tools)

                    for _ in range(MAX_TOOL_ROUNDS):
                        completion = await llm_chat_completion(messages, openai_tools)
                        choices = completion.get("choices") or []
                        if not choices:
                            raise HTTPException(502, "LLM endpoint returned no choices.")
                        choice = choices[0].get("message") or {}
                        tool_calls = choice.get("tool_calls") or []

                        if not tool_calls:
                            final_text = choice.get("content") or "(empty response)"
                            CHAT_HISTORY.append({"role": "assistant", "content": final_text})
                            # No Vision One tool was called anywhere in this turn, so nothing in this
                            # reply is verified tenant data — surface that plainly regardless of what
                            # the model's own text claims, since smaller/less-tuned models will
                            # sometimes fabricate a plausible-sounding answer instead of admitting no
                            # tool matched the question.
                            return {
                                "reply": final_text,
                                "toolCalls": tool_call_log,
                                "grounded": bool(tool_call_log),
                            }

                        messages.append(choice)
                        for tc in tool_calls:
                            fn = tc.get("function") or {}
                            name = fn.get("name", "")
                            try:
                                args = json.loads(fn.get("arguments") or "{}")
                            except json.JSONDecodeError:
                                args = {}
                            try:
                                result = await session.call_tool(name, args)
                                parts = [getattr(c, "text", "") for c in (result.content or [])]
                                result_text = "\n".join(p for p in parts if p) or "(no content returned)"
                                if getattr(result, "isError", False):
                                    result_text = f"ERROR: {result_text}"
                            except Exception as e:
                                result_text = f"ERROR calling {name}: {e}"
                            tool_call_log.append({"name": name, "arguments": args, "result": result_text[:4000]})
                            messages.append({
                                "role": "tool",
                                "tool_call_id": tc.get("id", ""),
                                "content": result_text[:8000],
                            })
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(502, f"Vision One MCP server error: {e}")

        fallback = (
            "I made several Vision One tool calls but didn't reach a final answer within the step limit. "
            "Here's what I found:\n\n" + "\n".join(f"- {t['name']}: {t['result'][:200]}" for t in tool_call_log)
        )
        CHAT_HISTORY.append({"role": "assistant", "content": fallback})
        return {"reply": fallback, "toolCalls": tool_call_log, "grounded": bool(tool_call_log)}


@app.get("/api/chat/history")
def api_chat_history():
    return {"history": CHAT_HISTORY}


@app.post("/api/chat/reset")
def api_chat_reset():
    CHAT_HISTORY.clear()
    return {"ok": True}


@app.get("/healthz")
def healthz():
    return {"status": "ok"}


@app.get("/")
def index():
    return FileResponse(APP_DIR / "index.html")
