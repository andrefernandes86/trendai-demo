# Health AI Assistant - Production Deployment

This document describes how to deploy the Health AI Assistant using pre-built Docker images from Docker Hub.

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Ollama with LLM models (for AI features)
- Trend Micro Vision One API key (for security scanning)

### 1. Clone the Repository
```bash
git clone https://github.com/andrefernandes86/demo-v1-ai-security.git
cd demo-v1-ai-security
```

### 2. Environment Setup
```bash
# Copy environment template
cp env.example .env

# Edit environment variables
nano .env
```

### 3. Deploy with Docker Hub Images
```bash
# Use production Docker Compose file
docker compose -f docker-compose.prod.yml up -d
```

## 📋 Available Docker Images

All images are available on Docker Hub under the `andrefernandes86` organization:

- **Frontend**: `andrefernandes86/health-frontend:latest`
- **API Gateway**: `andrefernandes86/health-api-gateway:latest`
- **Auth Service**: `andrefernandes86/health-auth-service:latest`
- **Nutrition Service**: `andrefernandes86/health-nutrition-service:latest`
- **Fitness Service**: `andrefernandes86/health-fitness-service:latest`
- **AI Service**: `andrefernandes86/health-ai-service:latest`
- **Report Service**: `andrefernandes86/health-report-service:latest`
- **Notification Service**: `andrefernandes86/health-notification-service:latest`
- **Security Scanner**: `andrefernandes86/health-security-scanner:latest`

## 🔧 Configuration

### Environment Variables
Update the following in your `.env` file:

```bash
# Database
POSTGRES_DB=health_agent
POSTGRES_USER=health_user
POSTGRES_PASSWORD=your_secure_password

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Frontend URL
FRONTEND_URL=http://your-domain:3003

# Ollama Configuration
OLLAMA_HOST=http://your-ollama-host:11434

# Trend Micro Vision One API Key
TMAS_API_KEY=your-trend-micro-api-key
```

### Port Configuration
Default ports used:
- **Frontend**: 3003
- **API Gateway**: 8080
- **Database**: 5432
- **Redis**: 6379
- **MinIO**: 9000 (API), 9001 (Console)

## 🎯 Access Points

After deployment, access the application at:
- **Frontend**: http://localhost:3003
- **API Gateway**: http://localhost:8080
- **MinIO Console**: http://localhost:9001 (admin/admin123)

## 🔐 Default Login
- **Username**: admin
- **Password**: admin

## 🛠️ Management Commands

### Start Services
```bash
docker compose -f docker-compose.prod.yml up -d
```

### Stop Services
```bash
docker compose -f docker-compose.prod.yml down
```

### View Logs
```bash
docker compose -f docker-compose.prod.yml logs -f
```

### Restart Specific Service
```bash
docker compose -f docker-compose.prod.yml restart auth-service
```

### Update Images
```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

## 🔄 Development vs Production

| Feature | Development | Production |
|---------|-------------|------------|
| Images | Built locally | From Docker Hub |
| Compose File | `docker-compose.yml` | `docker-compose.prod.yml` |
| Build Time | Slow (builds images) | Fast (pulls images) |
| Storage | Large (source code) | Small (images only) |

## 🚨 Security Notes

1. **Change Default Passwords**: Update all default passwords in production
2. **JWT Secret**: Use a strong, unique JWT secret
3. **Database Password**: Use a secure database password
4. **Network Security**: Configure firewall rules appropriately
5. **SSL/TLS**: Use HTTPS in production with proper certificates

## 📊 Monitoring

### Health Checks
```bash
# Check all services
docker compose -f docker-compose.prod.yml ps

# Check specific service logs
docker compose -f docker-compose.prod.yml logs auth-service
```

### Database Backup
```bash
# Backup database
docker exec health-agent-database pg_dump -U health_user health_agent > backup.sql

# Restore database
docker exec -i health-agent-database psql -U health_user health_agent < backup.sql
```

## 🆘 Troubleshooting

### Common Issues

1. **Port Conflicts**: Ensure ports are not used by other services
2. **Database Connection**: Check database credentials and network connectivity
3. **Image Pull Errors**: Verify Docker Hub access and image names
4. **Memory Issues**: Ensure sufficient RAM for all services

### Support
For issues and support, please check:
- GitHub Issues: https://github.com/andrefernandes86/demo-v1-ai-security/issues
- Documentation: See main README.md for detailed setup instructions

---

**Health AI Assistant** - Production-ready deployment with Docker Hub images.
