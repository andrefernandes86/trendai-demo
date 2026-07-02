# TrendAI - AI Security Demo

A comprehensive demonstration of AI security using **Ollama LLM**, **Trend Vision One AI Guard**, and **Trend Vision One File Security**.

![TrendAI Demo](https://img.shields.io/badge/TrendAI-AI%20Security%20Demo-blue)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)
![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python)

## Features

### 🤖 LLM Integration
- Connect to local or remote **Ollama** servers
- Dynamic model selection
- Real-time chat interface

### 🛡️ AI Guard Protection
- **Trend Vision One AI Guard** integration
- Prompt injection detection
- Response filtering
- Configurable enforcement (user/assistant/both)

### 🔍 File Security Scanning
- **Trend Vision One File Security** integration
- Upload and scan files for malware
- EICAR test file support
- Multi-region support (US, EU, AP, etc.)

### 🧪 Security Testing
- **EICAR Malware Test** - Test file security detection
- **Hello World Test** - Benign file baseline
- **Prompt Injection Test** - 7 real-world attack samples

### 📊 Request History
- Complete HTTP request/response logging
- View headers and payloads
- Debug and audit trail

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Ollama server (local or remote)
- Trend Vision One API keys (optional)

### 1. Clone the Repository
```bash
git clone https://github.com/andrefernandes86/demo-v1-app-sec-file-sec.git
cd demo-v1-app-sec-file-sec
```

### 2. Configure Environment (Optional)
```bash
cp .env.example .env
# Edit .env with your settings
```

### 3. Run with Docker Compose
```bash
docker compose up -d --build
```

### 4. Access the Application
Open your browser: **http://localhost:8000**

## Configuration

### Ollama Setup
- **URL Format**: `http://host:port` (without `/api`)
- **Local Ollama**: Use `http://host.docker.internal:11434`
- **Remote Ollama**: Use the IP address (e.g., `http://192.168.1.100:11434`)

### Trend Vision One AI Guard
- **API Key**: Your V1 API key
- **Endpoint**: `https://api.xdr.trendmicro.com/beta/aiSecurity/guard`
- **Enforcement**: Choose `user`, `assistant`, or `both`

### Trend Vision One File Security
- **API Key**: Your V1FS API key
- **Region**: Select from supported regions
- **Enable/Disable**: Toggle file scanning

## Docker Commands

### Build and Run
```bash
docker compose up -d --build
```

### View Logs
```bash
docker compose logs -f app
```

### Stop
```bash
docker compose down
```

### Run Tests
```bash
docker compose --profile test run --rm test
```

### Standalone Docker Run

#### Option 1: Build from Source
```bash
docker build -t trendai-app .
docker run -d -p 8000:8000 \
  -e OLLAMA_BASE_URL=http://host.docker.internal:11434 \
  -e OLLAMA_MODEL=llama3.2 \
  trendai-app
```

#### Option 2: Use Pre-built Image from Docker Hub
```bash
docker run -d -p 8000:8000 --name trendai andrefernandes86/tools-ai-sec-demo
```

Then configure via the UI at http://localhost:8000

## Architecture

```
┌─────────────────┐
│   Frontend UI   │
│  (HTML/CSS/JS)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   FastAPI App   │
│    (Python)     │
└────┬───┬───┬────┘
     │   │   │
     ▼   ▼   ▼
   Ollama │ V1FS
   Server │ API
          │
      V1 Guard
        API
```

## API Endpoints

### Configuration
- `GET /api/config` - Get current configuration
- `POST /api/config` - Update configuration

### Ollama
- `GET /api/ollama/models?base_url=...` - List available models
- `POST /api/chat` - Send chat message

### File Security
- `POST /api/scan/file` - Upload and scan file

### Testing
- `POST /api/test/eicar` - Test EICAR malware detection
- `POST /api/test/hello` - Test benign file
- `POST /api/test/injection` - Test prompt injection samples

### Health
- `GET /healthz` - Service health check

## Security Testing Samples

The **Prompt Injection Test** includes 7 real-world attack vectors:

1. **Instruction Override** - Direct command hijacking
2. **Role Manipulation** - XML/tag-based privilege escalation
3. **Jailbreak Attempt** - DAN-style ethical bypass
4. **Context Injection** - Fake system messages
5. **Multi-language Bypass** - Foreign language evasion
6. **Token Smuggling** - Special token injection
7. **Credential Theft** - Social engineering for secrets

## Project Structure

```
.
├── app.py              # FastAPI backend
├── index.html          # Frontend UI
├── requirements.txt    # Python dependencies
├── Dockerfile         # Container build
├── docker-compose.yml # Service orchestration
├── .env.example       # Environment template
├── tests/             # Test suite
│   ├── __init__.py
│   └── test_app.py
└── README.md          # This file
```

## Technologies

- **Backend**: FastAPI, Python 3.12
- **LLM**: Ollama (any model)
- **Security**: Trend Vision One AI Guard, File Security
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Container**: Docker, Docker Compose
- **Testing**: pytest, pytest-asyncio

## Development

### Run Tests
```bash
docker compose --profile test run --rm test
```

### Local Development
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OLLAMA_BASE_URL` | Ollama server URL | - |
| `OLLAMA_MODEL` | Model to use | - |
| `V1_GUARD_API_KEY` | AI Guard API key | - |
| `V1_GUARD_URL_BASE` | AI Guard endpoint | `https://api.xdr.trendmicro.com/beta/aiSecurity/guard` |
| `V1_GUARD_ENABLED` | Enable AI Guard | `true` |
| `V1_GUARD_DETAILED` | Detailed responses | `true` |
| `ENFORCE_SIDE` | Enforcement side | `both` |
| `V1FS_API_KEY` | File Security API key | - |
| `V1FS_REGION` | V1FS region | `us-east-1` |
| `V1FS_ENABLED` | Enable file scanning | `false` |
| `EXT_PORT` | External port | `8000` |

## Troubleshooting

### Cannot connect to Ollama
- Verify Ollama is running: `curl http://localhost:11434/api/tags`
- Use `host.docker.internal` for local Ollama from Docker
- Check firewall rules for remote Ollama

### AI Guard 400 Error
- Verify API key is correct
- Check endpoint URL is `https://api.xdr.trendmicro.com/beta/aiSecurity/guard`
- Ensure API key has proper permissions

### File Security Not Working
- Check V1FS API key and region
- Enable V1FS in Settings
- Verify region matches your API key

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is for demonstration purposes.

## Author

**Andre Fernandes** - [andrefernandes86](https://github.com/andrefernandes86)

## Acknowledgments

- Trend Micro Vision One team
- Ollama project
- FastAPI framework
