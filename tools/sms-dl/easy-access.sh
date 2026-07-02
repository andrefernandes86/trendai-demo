#!/bin/bash

echo "🌐 Easy Access URLs"
echo "=================="

# Get local IP address
LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)

echo "📍 Access your app using any of these URLs:"
echo ""

echo "🏠 Localhost (same machine):"
echo "   https://localhost:443"
echo "   https://127.0.0.1:443"
echo ""

if [ ! -z "$LOCAL_IP" ]; then
    echo "🌐 Network access (other devices on same network):"
    echo "   https://$LOCAL_IP:443"
    echo "   https://$LOCAL_IP.nip.io:443  (may work better with self-signed cert)"
    echo ""
fi

echo "🔧 Browser Bypass Methods:"
echo ""
echo "Chrome/Edge:"
echo "   1. Visit the URL"
echo "   2. Click 'Advanced'"
echo "   3. Click 'Proceed to [site] (unsafe)'"
echo "   4. OR type 'thisisunsafe' on the warning page"
echo ""

echo "Firefox:"
echo "   1. Visit the URL" 
echo "   2. Click 'Advanced'"
echo "   3. Click 'Accept the Risk and Continue'"
echo ""

echo "Safari:"
echo "   1. Visit the URL"
echo "   2. Click 'Show Details'"
echo "   3. Click 'visit this website'"
echo "   4. Click 'Visit Website' again"
echo ""

echo "📱 Mobile Devices:"
echo "   - Use the network IP: https://$LOCAL_IP:443"
echo "   - Accept the security warning when prompted"
echo "   - On iOS: Tap 'Advanced' → 'Proceed'"
echo "   - On Android: Tap 'Advanced' → 'Proceed to site'"
echo ""

echo "🎯 Pages to test:"
echo "   Main page: [URL above]"
echo "   Reports:   [URL above]/report (password: sms)"
echo ""

echo "💡 To reduce SSL warnings:"
echo "   Run: ./trust-certificate.sh (install self-signed cert in system)"
echo "   Or:  Use browser bypass methods shown above"

# Check if container is running
if docker ps | grep -q "smishdetector"; then
    echo ""
    echo "✅ App is currently running and ready for access!"
else
    echo ""
    echo "⚠️  App is not running. Start it with:"
    echo "   docker-compose up -d"
fi