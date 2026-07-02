FROM python:3.12-slim
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Fetch known-safe TippingPoint/AV test artifacts at BUILD time only — the
# running container never makes an outbound request for these at demo time.
COPY fetch_samples.py .
RUN python fetch_samples.py

COPY app.py index.html ./

EXPOSE 8000
CMD ["python", "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
