FROM python:3.10-slim

# Install OpenSSL for certificate generation
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . /app
RUN pip install flask requests user-agents

# Create ssl directory
RUN mkdir -p /app/ssl

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 5000
ENTRYPOINT ["/docker-entrypoint.sh"]
