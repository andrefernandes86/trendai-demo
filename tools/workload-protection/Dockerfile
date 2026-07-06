FROM python:3.12-slim
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# No test-malware/exploit sample files are fetched or bundled — every
# detection module operates on artifacts held in memory or generated at
# runtime (see app.py). This keeps the image build itself independent of any
# real-time anti-malware/IPS agent that might be watching the host
# filesystem during `docker build`.
COPY app.py index.html ./

EXPOSE 8000
CMD ["python", "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
