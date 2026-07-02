FROM python:3.12-slim AS base
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py index.html ./

# Run tests inside the container (do not run on host).
# Example: docker compose --profile test run --rm test
FROM base AS test
COPY tests/ tests/
COPY pytest.ini ./
CMD ["python", "-m", "pytest", "tests/", "-v"]

FROM base AS app
ENV EXT_PORT=8000
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
