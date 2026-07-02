# 🔒 Advanced Security Intelligence Platform

A comprehensive Flask web application designed for **educational security research and learning purposes**. This platform demonstrates advanced data collection techniques, device fingerprinting, and network intelligence gathering in a controlled environment.

## ⚠️ **IMPORTANT DISCLAIMER**

**🎓 FOR EDUCATIONAL AND LEARNING PURPOSES ONLY**

This platform is designed exclusively for:
- **Educational demonstrations** of data collection techniques
- **Security awareness training** in controlled environments
- **Learning about device fingerprinting** and privacy implications
- **Understanding web security** and data collection methods

**❌ NOT FOR:**
- **Public data collection** or deployment on public networks
- **Malicious activities** or unauthorized data harvesting
- **Production use** or real-world data collection
- **Any illegal or unethical purposes**

Users must ensure compliance with applicable laws, regulations, and ethical guidelines. Only use in controlled, authorized environments with proper consent.

## 🎯 **Educational Use Cases**

- **Security Research:** Demonstrate data collection and device fingerprinting techniques
- **Privacy Education:** Show users what information can be collected from web visits
- **Network Intelligence:** Understand comprehensive visitor and device information gathering
- **Cross-Platform Learning:** Explore how data collection works on desktop and mobile devices

---

## 🚀 **Advanced Features**

### **📊 Comprehensive Data Collection**
- 🌐 **Network Intelligence:** Public IP, Local IP, Internal IP, Hostname, ISP information
- 📱 **Device Fingerprinting:** Screen resolution, device type, browser, operating system
- 🗺️ **Geographic Tracking:** GPS coordinates, country, region, city via IP geolocation
- 📸 **Behavioral Capture:** Automatic webcam photos, user interaction tracking
- 📋 **Clipboard Access:** Capture clipboard data and sensitive information
- 🕒 **Temporal Analysis:** Precise timestamps, timezone, language preferences
- 🔍 **User Agent Analysis:** Complete browser and system profiling

### **📈 Real-time Analytics Dashboard**
- 📊 **Interactive Charts:** Countries, device types, browsers, operating systems
- 📋 **Statistics Cards:** Total visitors, photos captured, unique IPs, unique hosts
- 🗂️ **Detailed Visitor Profiles:** Complete network and device information
- 🖼️ **Photo Gallery:** Modal viewer for captured images
- 🗺️ **Google Maps Integration:** Geographic visualization of visitor locations
- 🔄 **Auto-refresh:** Real-time data updates every 30 seconds

### **🔐 Security & Access Control**
- 🔒 **Protected Reports:** Password-protected analytics dashboard
- 🛡️ **Session Management:** Secure login/logout functionality
- 📱 **Cross-Platform Support:** Works on iOS, Android, Windows, macOS, Linux
- 🎨 **Responsive Design:** Modern UI with Bootstrap 5 and Font Awesome icons

---

## 📦 **Installation**

### **Interactive Setup**
```bash
git clone <repository-url>
cd tool-sms-dl
chmod +x setup.sh
./setup.sh
```

The interactive setup will guide you through:
- Platform configuration
- Credential setup
- Network configuration
- Application deployment

---

## 🌐 **Access URLs**

### **Local Access:**
- **Main Page:** `https://localhost:443`
- **Reports Dashboard:** `https://localhost:443/report`
- **Network Access:** `https://[your-ip]:443`

### **Mobile Access:**
- **iOS Safari:** Accept certificate warning, allow camera/location
- **Android Chrome:** Proceed through security warning
- **Mobile browsers:** Use network IP for cross-device access

---

## 📊 **Data Collection Capabilities**

### **Network Information**
| Data Point | Description | Method |
|------------|-------------|---------|
| Public IP | External/WAN IP address | Multiple IP detection services |
| Local IP | Internal network IP | WebRTC STUN server detection |
| Server IP | Request source IP | Flask request headers |
| Hostname | Domain/hostname used | JavaScript location.hostname |
| ISP | Internet service provider | IP geolocation API |

### **Device & Browser Data**
| Data Point | Description | Method |
|------------|-------------|---------|
| Device Type | Mobile/Tablet/Desktop | User-agent parsing |
| Screen Resolution | Width x Height pixels | JavaScript screen object |
| Browser | Chrome/Firefox/Safari/etc | User-agent analysis |
| Operating System | Windows/macOS/iOS/Android | User-agent parsing |
| Language | Browser language preference | Navigator.language |
| Timezone | User's local timezone | Intl.DateTimeFormat |

### **Geographic & Behavioral**
| Data Point | Description | Method |
|------------|-------------|---------|
| GPS Coordinates | Precise latitude/longitude | Geolocation API |
| Country/Region/City | Geographic location | IP geolocation service |
| Webcam Photo | Automatic capture | MediaDevices API |
| Clipboard Data | Text content from clipboard | Clipboard API / Paste events |
| Timestamp | Precise visit time | Server-side logging |
| User Agent | Complete browser string | HTTP headers |

---

## 🎯 **Use Cases**

### **Data Collection**
- Comprehensive device and network information gathering
- Real-time analytics and reporting
- Cross-platform compatibility testing

### **Device Fingerprinting**
- Advanced device identification techniques
- Browser and system profiling
- Network topology mapping

### **Intelligence Gathering**
- IP address correlation and geolocation
- ISP and network infrastructure analysis
- Multi-source data aggregation

---

## 🛠️ **Configuration**

### **Environment Variables**
```bash
REPORT_PASSWORD=sms              # Dashboard access password
SECRET_KEY=your-secret-key       # Flask session encryption
DOMAIN=yourdomain.com           # For Let's Encrypt setup
EMAIL=admin@yourdomain.com      # For certificate notifications
```

### **Database Schema**
The SQLite database automatically captures:
- Basic info: ID, filename, timestamp, photo
- Network data: IPs (public/local/server), hostname, ISP
- Device data: type, screen resolution, browser, OS
- Geographic: coordinates, country, region, city
- Preferences: language, timezone, user agent

---

## 📈 **Analytics Dashboard**

### **Statistics Overview**
- **Total Visitors:** Complete visit count
- **Photos Captured:** Successful webcam captures
- **Locations Tracked:** GPS coordinate captures
- **Unique IPs:** Distinct public IP addresses
- **Unique Hosts:** Different hostnames used
- **Today's Activity:** Current day statistics

### **Interactive Charts**
- **Countries Distribution:** Visitor geographic spread
- **Device Types:** Mobile vs Desktop vs Tablet usage
- **Browser Analysis:** Chrome, Firefox, Safari, etc.
- **Operating Systems:** Windows, macOS, iOS, Android distribution

### **Detailed Visitor Table**
Each entry shows complete visitor profile including network topology, device characteristics, and geographic location with Google Maps integration.

---

## ⚠️ **Important Notes**

### **Legal & Ethical Use**
- **Educational Purpose Only:** Designed exclusively for learning and educational demonstrations
- **Controlled Environment:** Use only in authorized, isolated lab environments
- **Informed Consent:** Ensure all participants understand the educational nature and data collection scope
- **No Public Deployment:** Never deploy on public networks or for actual data collection
- **Legal Compliance:** Users must ensure compliance with all applicable laws and regulations
- **Ethical Guidelines:** Follow responsible disclosure and ethical security research practices

### **Security Considerations**
- Change default passwords in production environments
- Use environment variables for sensitive configuration
- Implement proper access controls for deployment
- Regular security updates and monitoring

### **Technical Requirements**
- Docker and Docker Compose
- Modern web browser with camera/geolocation support
- Network connectivity for IP geolocation services
- HTTPS support for camera access (automatic self-signed SSL)

---

## 🔧 **Troubleshooting**

### **Common Issues**
- **Camera not working:** Ensure HTTPS is enabled and permissions granted
- **Geolocation failing:** Check browser permissions and HTTPS
- **Tunnel not accessible:** Verify firewall settings and tunnel status
- **Database errors:** Check file permissions and Docker volumes

### **Support**
For technical issues or training scenarios, refer to the cybersecurity education documentation or contact your system administrator.

---

## 📝 **License & Disclaimer**

This educational platform is designed exclusively for **learning, education, and authorized security research** in controlled laboratory environments. 

**⚠️ IMPORTANT:**
- **Educational Use Only** - Not for production or public deployment
- **No Malicious Use** - Strictly prohibited for unauthorized data collection
- **User Responsibility** - Users must ensure compliance with all applicable laws and regulations
- **No Liability** - Developers assume no responsibility for misuse of this educational platform
- **Ethical Use Required** - Must follow responsible security research practices

By using this platform, you acknowledge that it is for educational purposes only and agree to use it responsibly and ethically.
