# Stage 1: build the REAL Trend Vision One MCP server binary straight from its
# GitHub source. Cloning at build time (rather than vendoring a copy) means a
# rebuild always picks up the latest tools/fixes upstream — same philosophy as
# the AI Scanner's dynamic tmas-CLI install.
FROM golang:1.26.0-alpine AS build
ARG V1_MCP_REPO=https://github.com/andrefernandes86/trendai-vision-one-mcp-server.git
ARG V1_MCP_REF=main
ARG V1_MCP_REFRESH=0
WORKDIR /build
RUN apk add --no-cache git \
    && git clone --depth 1 --branch "${V1_MCP_REF}" "${V1_MCP_REPO}" . \
    && CGO_ENABLED=0 go build -o /bin/v1-mcp-server cmd/v1-mcp-server/main.go \
    && /bin/v1-mcp-server -version || true

# Stage 2: the FastAPI chatbot backend that drives the binary over MCP/stdio.
FROM python:3.12-slim
WORKDIR /app
COPY --from=build /bin/v1-mcp-server /usr/local/bin/v1-mcp-server
RUN chmod +x /usr/local/bin/v1-mcp-server

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py index.html ./

EXPOSE 8000
CMD ["python", "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
