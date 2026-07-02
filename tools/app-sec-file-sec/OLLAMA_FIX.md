# Fix Ollama Port Exposure

Your Ollama container is running but not accessible from outside because port 11434 is not published.

## On the spark-bbfa machine (192.168.1.100):

### Option 1: Recreate with port mapping

```bash
# Stop and remove current container
docker stop ollama
docker rm ollama

# Run with port exposed
docker run -d \
  --name ollama \
  -p 11434:11434 \
  -v ollama:/root/.ollama \
  --restart unless-stopped \
  ollama/ollama:latest
```

### Option 2: If using docker-compose

Edit your docker-compose.yml on spark-bbfa to add port mapping:

```yaml
services:
  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"  # Add this line
    volumes:
      - ollama:/root/.ollama
    restart: unless-stopped
```

Then:
```bash
docker compose up -d --force-recreate ollama
```

## After fixing:

From any machine, test with:
```bash
curl http://192.168.1.100:11434/api/tags
```

Then in the AI Guard Chat UI, use: `http://192.168.1.100:11434`
