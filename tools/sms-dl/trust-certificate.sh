#!/bin/bash

echo "🔒 SSL Certificate Trust Helper"
echo "=============================="

# Check if container is running
if ! docker ps | grep -q "smishdetector"; then
    echo "❌ Container not running. Please start the app first:"
    echo "   docker-compose up -d"
    exit 1
fi

# Extract certificate from container
echo "📜 Extracting certificate from container..."
docker cp $(docker ps -q --filter "name=smishdetector"):/app/ssl/server.crt ./server.crt

if [ ! -f "./server.crt" ]; then
    echo "❌ Failed to extract certificate"
    exit 1
fi

echo "✅ Certificate extracted successfully!"

# Detect OS and provide instructions
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    echo ""
    echo "🍎 macOS Instructions:"
    echo "1. Adding certificate to Keychain..."
    
    # Add to keychain
    sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ./server.crt
    
    if [ $? -eq 0 ]; then
        echo "✅ Certificate added to macOS Keychain!"
        echo "🌐 You can now access https://localhost:443 without warnings"
    else
        echo "⚠️  Manual installation required:"
        echo "   1. Double-click server.crt"
        echo "   2. Choose 'System' keychain"
        echo "   3. Set trust to 'Always Trust'"
    fi
    
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    echo ""
    echo "🐧 Linux Instructions:"
    
    # Try to install for different browsers
    if command -v update-ca-certificates &> /dev/null; then
        echo "1. Installing certificate system-wide..."
        sudo cp server.crt /usr/local/share/ca-certificates/smishdetector.crt
        sudo update-ca-certificates
        echo "✅ Certificate installed system-wide!"
    fi
    
    # Chrome/Chromium specific
    if command -v google-chrome &> /dev/null || command -v chromium-browser &> /dev/null; then
        echo "2. For Chrome/Chromium:"
        echo "   - Go to chrome://settings/certificates"
        echo "   - Click 'Authorities' tab"
        echo "   - Click 'Import' and select server.crt"
        echo "   - Check 'Trust this certificate for identifying websites'"
    fi
    
    # Firefox specific
    if command -v firefox &> /dev/null; then
        echo "3. For Firefox:"
        echo "   - Go to about:preferences#privacy"
        echo "   - Scroll to 'Certificates' and click 'View Certificates'"
        echo "   - Click 'Authorities' tab"
        echo "   - Click 'Import' and select server.crt"
        echo "   - Check 'Trust this CA to identify websites'"
    fi
    
else
    # Windows/Other
    echo ""
    echo "🪟 Windows/Other OS Instructions:"
    echo "1. Double-click server.crt"
    echo "2. Click 'Install Certificate'"
    echo "3. Choose 'Local Machine'"
    echo "4. Select 'Place all certificates in the following store'"
    echo "5. Click 'Browse' and select 'Trusted Root Certification Authorities'"
    echo "6. Click 'Next' and 'Finish'"
fi

echo ""
echo "🎯 Alternative Options:"
echo "1. 🔧 Browser-specific bypass:"
echo "   - Chrome: Type 'thisisunsafe' on the warning page"
echo "   - Firefox: Click 'Advanced' → 'Accept the Risk and Continue'"
echo "   - Safari: Click 'Show Details' → 'visit this website'"
echo ""
echo "2. 🚀 Use nip.io domain (works with self-signed):"
echo "   https://127.0.0.1.nip.io:443"
echo ""
echo "3. 📱 Mobile browsers:"
echo "   - Accept security warnings when prompted"
echo "   - Tap 'Advanced' → 'Proceed to site'"

# Cleanup
rm -f server.crt

echo ""
echo "✅ Setup complete! Try accessing your app now."