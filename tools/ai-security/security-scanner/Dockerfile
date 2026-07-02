FROM ubuntu:22.04

# Install required dependencies and update packages
RUN apt-get update && apt-get upgrade -y && apt-get install -y \
    curl \
    wget \
    unzip \
    python3 \
    python3-pip \
    nodejs \
    npm \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create app directory
WORKDIR /app

# Download Trend Micro Vision One AI Scanner (TMAS CLI) - Always get latest version
# Use ARG to force rebuild and always download latest
ARG TMAS_VERSION=latest
RUN wget --no-cache -O tmas-cli.tar.gz "https://cli.artifactscan.cloudone.trendmicro.com/tmas-cli/${TMAS_VERSION}/tmas-cli_Linux_x86_64.tar.gz" \
    && tar -xzf tmas-cli.tar.gz \
    && chmod +x tmas \
    && rm tmas-cli.tar.gz \
    && ln -s tmas tmscanner \
    && ./tmscanner --version \
    && echo "TMAS CLI installed successfully"

# Copy application files
COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# Make update script executable
RUN chmod +x update-tmas.sh

# Expose port
EXPOSE 3008

# Start the application
CMD ["node", "server.js"]
