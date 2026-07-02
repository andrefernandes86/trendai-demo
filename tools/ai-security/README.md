# Health AI Assistant

A comprehensive health management platform with AI-powered nutrition tracking, fitness monitoring, and security features.

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Ollama with LLM models (for AI features)
- Trend Micro Vision One API key (for security scanning)

### 1. Clone and Deploy
```bash
git clone https://github.com/andrefernandes86/demo-v1-ai-security.git
cd demo-v1-ai-security
docker compose -f docker-compose.prod.yml up -d
```

### 2. Access the Application
- **Frontend**: http://localhost:3003
- **Login**: admin / admin

## 🎯 How to Use

### 1. Configure AI Features
1. Go to **Settings** → **Ollama Configuration**
   - Enter Ollama Host: `http://your-ollama-host:11434`
   - Test connection and save

2. Go to **Settings** → **AI Security Configuration**
   - Enable "Trend Micro Vision One AI Guard"
   - Enter your API key and save

### 2. Add Meals
1. Go to **Nutrition** → **Add Meal**
2. Describe your meal (e.g., "I had a Big Mac last night")
3. Review AI analysis and save

### 3. Track Fitness
1. Go to **Fitness** → **Add Workout**
2. Select workout type and exercises
3. Save your workout

### 4. View Reports
- **Dashboard**: Overview of health metrics
- **Reports**: Detailed nutrition and fitness reports
- **Security Reports**: AI Guard protection status

## 🔧 Configuration

### Environment Variables
Create `.env` file:
```bash
# Database
POSTGRES_PASSWORD=your_secure_password
JWT_SECRET=your-super-secret-jwt-key

# AI Configuration
OLLAMA_HOST=http://your-ollama-host:11434
TMAS_API_KEY=your-trend-micro-api-key
```

### Ports Used
- **Frontend**: 3003
- **API Gateway**: 8080
- **Database**: 5432
- **Redis**: 6379
- **MinIO**: 9000/9001

## 🛠️ Management

### Start/Stop
```bash
# Start
docker compose -f docker-compose.prod.yml up -d

# Stop
docker compose -f docker-compose.prod.yml down

# Logs
docker compose -f docker-compose.prod.yml logs -f
```

### Update
```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

## 📋 Features

- ✅ **AI-Powered Nutrition Analysis**
- ✅ **Fitness Tracking**
- ✅ **Security Scanning with AI Guard**
- ✅ **Real-time Notifications**
- ✅ **Comprehensive Reporting**
- ✅ **User Authentication**
- ✅ **Modern Web Interface**

## 🚨 Security

- Change default passwords in production
- Use strong JWT secrets
- Configure firewall rules
- Enable HTTPS in production

---

**Health AI Assistant** - Your AI-powered health companion.
