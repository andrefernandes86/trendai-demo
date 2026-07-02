# 🔒 Smish Detector - Docker Image

[![Docker Pulls](https://img.shields.io/docker/pulls/andrefernandes86/tools-sms-dl)](https://hub.docker.com/r/andrefernandes86/tools-sms-dl)
[![Docker Image Size](https://img.shields.io/docker/image-size/andrefernandes86/tools-sms-dl/latest)](https://hub.docker.com/r/andrefernandes86/tools-sms-dl)
[![Docker Image Version](https://img.shields.io/docker/v/andrefernandes86/tools-sms-dl?sort=semver)](https://hub.docker.com/r/andrefernandes86/tools-sms-dl)

Advanced Security Intelligence Platform for **educational cybersecurity research and privacy awareness training**.

## ⚠️ **EDUCATIONAL USE ONLY**

This Docker image is designed exclusively for:
- **Educational demonstrations** of data collection techniques
- **Security awareness training** in controlled environments
- **Learning about device fingerprinting** and privacy implications
- **Understanding web security** and data collection methods

**NOT FOR:** Public deployment, malicious activities, or unauthorized data collection.

## 🚀 **Quick Start**

### **Simple Deployment**
```bash
docker run -d \
  --name smish-detector \
  -p 443:5000 \
  -e REPORT_PASSWORD=sms \
  -v smish_data:/app/static \
  andrefernandes86/tools-sms-dl:latest
```

### **Docker Compose (Recommended)**
```yaml
version: '3.8'
services:
  smishdetector:
    image: andrefernandes86/tools-sms-dl:latest
    container_name: smish-detector
    ports:
      - "443:5000"
    environment:
      - REPORT_PASSWORD=sms
      - SECRET_KEY=your-secret-key-here
    volumes:
      - smish_data:/app/static
      - smish_ssl:/app/ssl
    restart: unless-stopped

volumes:
  smish_data:
  smish_ssl:
```

## 🌐 **Access**

After deployment:
- **Main Page:** `https://localhost:443`
- **Analytics Dashboard:** `https://localhost:443/report`
- **Default Password:** `sms`

## 📊 **Features**

### **Data Collection**
- 🌐 Network intelligence (IPs, ISP, hostname)
- 📱 Device fingerprinting (browser, OS, screen resolution)
- 🗺️ Geographic tracking (GPS coordinates, IP geolocation)
- 📸 Automatic webcam capture
- 📋 Clipboard data access
- 🕒 Temporal analysis with timezone detection

### **Analytics Dashboard**
- 📊 Interactive charts (countries, devices, browsers, OS)
- 📈 Real-time statistics and visitor profiles
- 🖼️ Photo gallery with modal viewer
- 🗺️ Google Maps integration for location visualization
- 🔄 Auto-refresh every 30 seconds

### **Security**
- 🔒 Password-protected reports
- 🛡️ HTTPS with automatic self-signed SSL
- 📱 Cross-platform support (iOS, Android, desktop)
- 🎨 Modern cyberpunk-themed responsive UI

## 🔧 **Configuration**

### **Environment Variables**
| Variable | Default | Description |
|----------|---------|-------------|
| `REPORT_PASSWORD` | `sms` | Dashboard access password |
| `SECRET_KEY` | `dev-key-change-in-production` | Flask session encryption key |

### **Volumes**
| Path | Purpose |
|------|---------|
| `/app/static` | Captured photos and static files |
| `/app/ssl` | SSL certificates (auto-generated) |
| `/app/logs.db` | SQLite database (auto-created) |

### **Ports**
| Port | Protocol | Purpose |
|------|----------|---------|
| `5000` | HTTPS | Main application (map to 443) |

## 🛠️ **Advanced Usage**

### **Custom SSL Certificates**
```bash
docker run -d \
  --name smish-detector \
  -p 443:5000 \
  -v /path/to/certs:/app/ssl \
  andrefernandes86/tools-sms-dl:latest
```

### **Persistent Data**
```bash
docker run -d \
  --name smish-detector \
  -p 443:5000 \
  -v smish_database:/app \
  -v smish_photos:/app/static \
  andrefernandes86/tools-sms-dl:latest
```

### **Network Mode**
```bash
# For better IP detection
docker run -d \
  --name smish-detector \
  --network host \
  andrefernandes86/tools-sms-dl:latest
```

## 📱 **Mobile Support**

### **iOS Safari**
1. Navigate to `https://[your-ip]:443`
2. Accept certificate warning
3. Allow camera and location permissions

### **Android Chrome**
1. Navigate to `https://[your-ip]:443`
2. Click "Advanced" → "Proceed to site"
3. Grant camera and location permissions

## 🔍 **Troubleshooting**

### **Common Issues**
- **Camera not working:** Ensure HTTPS is enabled and permissions granted
- **Geolocation failing:** Check browser permissions and HTTPS
- **Certificate errors:** Use browser bypass methods or install certificate
- **Database errors:** Check volume permissions and Docker setup

### **Logs**
```bash
docker logs smish-detector
```

### **Container Shell Access**
```bash
docker exec -it smish-detector /bin/bash
```

## 📋 **Data Schema**

The platform captures comprehensive visitor data including:
- Network topology (public/local/internal IPs)
- Device characteristics (type, screen, browser, OS)
- Geographic information (coordinates, country, region, city)
- Behavioral data (photos, clipboard, timestamps)
- System preferences (language, timezone, user agent)

## ⚠️ **Legal & Ethical Guidelines**

### **Authorized Use Only**
- Use only in controlled, authorized laboratory environments
- Ensure all participants provide informed consent
- Follow responsible security research practices
- Comply with applicable laws and regulations

### **Prohibited Uses**
- Public deployment or production use
- Unauthorized data collection
- Malicious activities or privacy violations
- Any illegal or unethical purposes

## 🔗 **Links**

- **GitHub Repository:** https://github.com/andrefernandes86/tool-sms-dl
- **Docker Hub:** https://hub.docker.com/r/andrefernandes86/tools-sms-dl
- **Documentation:** See repository README for detailed setup

## 📄 **License**

Educational use only. Not for production or commercial deployment.

---

**By using this Docker image, you acknowledge it is for educational purposes only and agree to use it responsibly and ethically in authorized environments.**