FROM python:3.12-slim
WORKDIR /app

# Install the real TrendAI Vision One Artifact Scanner (TMAS) CLI. The web tool
# shells out to this binary to run genuine `tmas aiscan llm` scans — no mock data.
# The version is resolved from TMAS's own metadata endpoint at build time so a
# rebuild always installs the latest release (override with --build-arg
# TMAS_VERSION=x.y.z to pin). Bust the cache to re-resolve: --build-arg TMAS_REFRESH=$(date +%s)
ARG TMAS_VERSION=latest
ARG TMAS_REFRESH=0
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
    && if [ "${TMAS_VERSION}" = "latest" ]; then \
         VER=$(curl -fsSL https://ast-cli.xdr.trendmicro.com/tmas-cli/metadata.json \
               | grep -o '"latestVersion"[^,]*' | grep -oE '[0-9]+\.[0-9]+\.[0-9]+'); \
       else VER="${TMAS_VERSION}"; fi \
    && echo "Installing TMAS v${VER}" \
    && curl -fsSL -o /tmp/tmas.tar.gz \
       "https://ast-cli.xdr.trendmicro.com/tmas-cli/${VER}/tmas-cli_Linux_x86_64.tar.gz" \
    && tar -xzf /tmp/tmas.tar.gz -C /usr/local/bin tmas \
    && chmod +x /usr/local/bin/tmas \
    && rm -f /tmp/tmas.tar.gz \
    && apt-get purge -y curl && apt-get autoremove -y && rm -rf /var/lib/apt/lists/* \
    && /usr/local/bin/tmas version

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py index.html ./

EXPOSE 8000
CMD ["python", "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
