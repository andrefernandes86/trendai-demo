#!/bin/bash

# Update TMAS CLI to latest version
echo "Updating TMAS CLI to latest version..."

# Download latest version
wget --no-cache -O tmas-cli.tar.gz "https://cli.artifactscan.cloudone.trendmicro.com/tmas-cli/latest/tmas-cli_Linux_x86_64.tar.gz"

if [ $? -eq 0 ]; then
    # Extract and install
    tar -xzf tmas-cli.tar.gz
    chmod +x tmas
    rm tmas-cli.tar.gz
    ln -sf tmas tmscanner
    
    # Show version
    echo "TMAS CLI updated successfully:"
    ./tmscanner --version
else
    echo "Failed to download TMAS CLI"
    exit 1
fi
