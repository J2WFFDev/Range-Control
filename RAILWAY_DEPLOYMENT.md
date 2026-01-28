# Railway Deployment Guide

## Quick Start for Railway Deployment

This guide will help you deploy the Range-Control booking system to Railway.

---

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **GitHub Repository**: Ensure this repository is pushed to GitHub
3. **Railway CLI** (optional): `npm i -g @railway/cli`

---

## Step 1: Create Railway Project

### Via Railway Dashboard

1. Go to [railway.app](https://railway.app) and log in
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose this repository (`J2WFFDev/Range-Control`)
5. Railway will auto-detect the Python application

### Via Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Link to your Railway project
railway link
```

---

## Step 2: Add PostgreSQL Database

1. In your Railway project, click **"New"**
2. Select **"Database"** → **"PostgreSQL"**
3. Railway will provision a PostgreSQL instance
4. Database connection string will be automatically available as `DATABASE_URL`

---

## Step 3: Configure Environment Variables

Set the following environment variables in Railway:

### Required Variables

```bash
# Database
DATABASE_URL=postgresql://... (auto-provided by Railway)

# Application
SECRET_KEY=your-secret-key-here-generate-with-openssl-rand
ENVIRONMENT=production

# CORS (update with your frontend domain)
CORS_ORIGINS=https://your-frontend-domain.com

# JWT Settings
JWT_SECRET_KEY=another-secret-key-for-jwt
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=60
```

### Optional Variables

```bash
# Email notifications (if implementing)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Monitoring
SENTRY_DSN=https://...  # If using Sentry for error tracking

# Feature Flags
ENABLE_REGISTRATION=true
ENABLE_EMAIL_NOTIFICATIONS=false
```

### Generate Secret Keys

```bash
# Generate SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Or using OpenSSL
openssl rand -base64 32
```

---

## Step 4: Create Required Files for Railway

### 4.1 Create `Procfile` (if not auto-detected)

```bash
web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### 4.2 Create `runtime.txt` (optional, to specify Python version)

```
python-3.11
```

### 4.3 Update `requirements.txt`

Ensure all production dependencies are listed:

```txt
# Core
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
pydantic>=2.0.0
pydantic-settings>=2.0.0

# Database
sqlalchemy>=2.0.0
psycopg2-binary>=2.9.9
alembic>=1.12.0

# Authentication
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4
python-multipart>=0.0.6

# Testing (dev)
pytest>=7.0.0
pytest-asyncio>=0.21.0
httpx>=0.25.0

# Utilities
python-dotenv>=1.0.0
```

---

## Step 5: Deployment Settings

### Build Command

Railway auto-detects Python and will:
1. Install dependencies from `requirements.txt`
2. Run database migrations (if configured)

### Start Command

If not using Procfile:
```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### Health Check Endpoint

Railway will ping: `https://your-app.railway.app/health`

Ensure you have a health endpoint:
```python
@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```

---

## Step 6: Domain Configuration

### Default Railway Domain

Your app will be available at: `https://your-project.up.railway.app`

### Custom Domain

1. Go to **Settings** → **Networking**
2. Click **"Generate Domain"** or **"Add Custom Domain"**
3. For custom domains:
   - Add your domain (e.g., `range.yourdomain.com`)
   - Update DNS with provided CNAME record
   - Wait for SSL certificate provisioning (automatic)

---

## Step 7: Database Migrations

### Setup Alembic (first time)

```bash
# Install Alembic
pip install alembic

# Initialize Alembic
alembic init alembic

# Create initial migration
alembic revision --autogenerate -m "Initial schema"

# Apply migration
alembic upgrade head
```

### Auto-run Migrations on Deploy

Add to your app startup or Procfile:

```bash
# Procfile
release: alembic upgrade head
web: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

---

## Step 8: Monitoring and Logs

### View Logs

**Via Dashboard:**
1. Go to your Railway project
2. Click on the service
3. Go to **"Deployments"** tab
4. Click on latest deployment to view logs

**Via CLI:**
```bash
railway logs
```

### Set up Alerts

1. Go to project **Settings**
2. Configure webhook notifications
3. Integrate with Slack, Discord, or email

---

## Step 9: Staging vs Production

### Create Multiple Environments

1. **Development**: Branch `develop` → Railway staging environment
2. **Production**: Branch `main` → Railway production environment

### Configure Branch Deployments

1. Go to **Settings** → **Deployments**
2. Enable **"Auto Deploy"**
3. Set branch filters:
   - Production: `main` branch only
   - Staging: `develop` branch

---

## Step 10: Scaling

### Vertical Scaling (More Resources)

1. Go to **Settings** → **Resources**
2. Increase memory/CPU allocation
3. Note: Pricing scales with usage

### Horizontal Scaling (Multiple Instances)

Railway Pro plan required:
1. Go to **Settings** → **Replicas**
2. Increase replica count
3. Use Railway's load balancer

---

## Troubleshooting

### Common Issues

#### 1. Build Fails

**Problem**: Requirements installation fails

**Solution**:
```bash
# Ensure requirements.txt is complete
# Check Python version compatibility
# Remove version pins if conflicts
```

#### 2. Database Connection Fails

**Problem**: Can't connect to PostgreSQL

**Solution**:
- Verify `DATABASE_URL` is set
- Check database is running in Railway
- Ensure SQLAlchemy connection string is correct

#### 3. Port Binding Error

**Problem**: App doesn't start

**Solution**:
```python
# Use Railway's PORT environment variable
import os
port = int(os.getenv("PORT", 8000))
```

#### 4. CORS Errors

**Problem**: Frontend can't access API

**Solution**:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Cost Optimization

### Free Tier Limits

- $5 free credit per month
- Usage-based pricing after
- Hibernate inactive services

### Optimization Tips

1. **Use connection pooling** for database
2. **Optimize queries** with indexes
3. **Cache static content** with CDN
4. **Monitor usage** in Railway dashboard
5. **Set resource limits** to prevent overages

---

## Security Best Practices

### 1. Environment Variables

- ✅ Never commit secrets to Git
- ✅ Use Railway's environment variables
- ✅ Rotate secrets regularly

### 2. HTTPS

- ✅ Railway provides free SSL
- ✅ Enforce HTTPS in production
- ✅ Set secure cookie flags

### 3. Database

- ✅ Use Railway's managed PostgreSQL
- ✅ Enable automatic backups
- ✅ Limit connection pool size

### 4. API Security

- ✅ Implement rate limiting
- ✅ Validate all inputs
- ✅ Use JWT for authentication
- ✅ Enable CORS restrictions

---

## Backup and Recovery

### Database Backups

Railway automatically backs up PostgreSQL daily:
1. Go to database service
2. Click **"Backups"** tab
3. View/restore backups

### Manual Backup

```bash
# Export database
railway connect postgres
pg_dump > backup.sql

# Restore
railway connect postgres
psql < backup.sql
```

---

## Next Steps

After deployment:

1. ✅ Test all API endpoints
2. ✅ Verify database migrations
3. ✅ Check authentication flow
4. ✅ Monitor logs for errors
5. ✅ Set up domain and SSL
6. ✅ Configure monitoring alerts
7. ✅ Run load tests
8. ✅ Document API with Swagger

---

## Support Resources

- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **Railway Status**: https://status.railway.app
- **Railway Blog**: https://blog.railway.app

---

## Example Railway Configuration

### `railway.json` (optional)

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "uvicorn app.main:app --host 0.0.0.0 --port $PORT",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

---

## Checklist for Production

- [ ] Environment variables configured
- [ ] Database created and migrated
- [ ] Health check endpoint working
- [ ] HTTPS enabled with custom domain
- [ ] CORS configured properly
- [ ] Authentication working
- [ ] Logging configured
- [ ] Error monitoring set up (Sentry)
- [ ] Backups verified
- [ ] Load testing completed
- [ ] Documentation updated
- [ ] Team trained on deployment process

---

**Happy Deploying! 🚀**
