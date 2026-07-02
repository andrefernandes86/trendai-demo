#!/bin/bash

echo "🔒 Starting Secure Flask Application..."

# Check if SSL certificates exist
if [ ! -f "/app/ssl/server.crt" ] || [ ! -f "/app/ssl/server.key" ]; then
    echo "📜 Generating SSL certificate..."
    
    # Create a comprehensive SSL certificate with multiple SANs
    openssl req -x509 -newkey rsa:4096 -sha256 -days 365 -nodes \
        -keyout /app/ssl/server.key -out /app/ssl/server.crt \
        -config <(cat <<EOF
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = US
ST = California
L = San Francisco
O = Security Training Lab
OU = Cybersecurity Education
CN = localhost

[v3_req]
keyUsage = keyEncipherment, dataEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
DNS.3 = 127.0.0.1.nip.io
DNS.4 = *.127.0.0.1.nip.io
DNS.5 = local.ssl
DNS.6 = *.local.ssl
DNS.7 = secure-app.local
DNS.8 = *.secure-app.local
IP.1 = 127.0.0.1
IP.2 = ::1
IP.3 = 0.0.0.0
IP.4 = 192.168.1.1
IP.5 = 10.0.0.1
IP.6 = 172.16.0.1
EOF
) 2>/dev/null

    echo "✅ SSL certificate generated successfully!"
    echo "📋 Certificate details:"
    echo "   - Valid for 365 days"
    echo "   - Supports localhost, 127.0.0.1, and common local IPs"
    echo "   - Includes wildcard domains for flexibility"
else
    echo "✅ SSL certificate already exists"
fi

# Set proper permissions
chmod 600 /app/ssl/server.key
chmod 644 /app/ssl/server.crt

echo "🚀 Starting Flask application..."
echo "📍 Access URLs:"
echo "   - https://localhost:443"
echo "   - https://127.0.0.1:443"
echo "   - https://[your-local-ip]:443"
echo ""
echo "⚠️  Note: You may need to accept the security warning in your browser"
echo "    This is normal for self-signed certificates"
echo ""

# Start the Flask application
exec python app.py