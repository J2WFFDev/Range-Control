# Deployment Guide - Range Booking Automation System

This guide covers deploying the Range Booking Automation System to Railway.

## Prerequisites

- GitHub account with access to the repository
- Railway account (free tier available)
- PostgreSQL credentials (provided by Railway)
- (Optional) Google Calendar API credentials

## Step-by-Step Deployment

### 1. Prepare Your Repository

Ensure all code is committed and pushed to your GitHub repository:

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 2. Set Up Railway Project

1. Go to [Railway.app](https://railway.app/)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your `Range-Control` repository
5. Railway will automatically detect it's a Node.js project

### 3. Add PostgreSQL Database

1. In your Railway project, click "New"
2. Select "Database" → "PostgreSQL"
3. Railway will provision a PostgreSQL database automatically
4. The `DATABASE_URL` environment variable will be automatically set

### 4. Configure Environment Variables

In Railway's project settings, add the following environment variables:

**Required:**
```
NODE_ENV=production
TIMEZONE=America/New_York
```

**Optional (for Google Calendar):**
```
GOOGLE_CALENDAR_ENABLED=true
GOOGLE_CALENDAR_CREDENTIALS_PATH=/app/google-credentials.json
```

Note: `DATABASE_URL` and `PORT` are automatically configured by Railway.

### 5. Add Google Calendar Credentials (Optional)

If enabling Google Calendar integration:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the Google Calendar API
4. Create service account credentials
5. Download the JSON credentials file
6. In Railway, use the "Files" feature to upload `google-credentials.json`

### 6. Run Database Migrations

Railway will automatically run `npm run build` on deployment. To run migrations:

**Option A: Using Railway CLI**
```bash
railway run npm run migrate
```

**Option B: Manual via Railway Dashboard**
1. Go to your project settings
2. Add a one-time command: `npm run migrate`
3. After migrations complete, remove the command

**Option C: SSH into the instance**
```bash
railway shell
npm run migrate
exit
```

### 7. Seed Initial Data (Optional)

Load sample resources:

```bash
# Using Railway CLI
railway run psql $DATABASE_URL -f src/db/seed.sql

# Or manually via SQL client
psql $DATABASE_URL < src/db/seed.sql
```

### 8. Deploy

Railway automatically deploys when you push to the connected branch.

For manual deployment:
```bash
railway up
```

### 9. Verify Deployment

1. Railway will provide a URL (e.g., `https://your-app.railway.app`)
2. Test the health endpoint:
   ```bash
   curl https://your-app.railway.app/health
   ```
3. You should see:
   ```json
   {
     "status": "healthy",
     "timestamp": "...",
     "database": "connected"
   }
   ```

## Post-Deployment Setup

### 1. Add Resources

Create your range resources:

```bash
curl -X POST https://your-app.railway.app/api/resources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bay 1",
    "type": "bay",
    "description": "100-yard rifle range",
    "capacity": 10
  }'
```

### 2. Configure Calendar Mappings (if using Google Calendar)

Map resources to Google Calendar IDs:

```bash
curl -X POST https://your-app.railway.app/api/calendar/mappings \
  -H "Content-Type: application/json" \
  -d '{
    "resource_id": 1,
    "calendar_id": "your-calendar-id@group.calendar.google.com",
    "calendar_name": "Bay 1 Schedule"
  }'
```

### 3. Test the System

Create a test booking:

```bash
curl -X POST https://your-app.railway.app/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "group_name": "Test Team",
    "contact_name": "Test User",
    "contact_email": "test@example.com",
    "ro_name": "Test RO",
    "ro_qualification": "Certified",
    "requested_date": "2024-04-01",
    "start_time": "09:00",
    "end_time": "12:00",
    "resource_ids": [1],
    "participant_count": 5,
    "attestations": {
      "safety": true,
      "waiver": true,
      "insurance": true
    }
  }'
```

## Monitoring and Maintenance

### View Logs

```bash
# Using Railway CLI
railway logs

# Or in Railway Dashboard
# Go to Deployments → Select deployment → View logs
```

### Database Access

```bash
# Connect to database
railway connect postgres

# Or use connection string
psql $DATABASE_URL
```

### Backup Database

```bash
# Export database
railway run pg_dump $DATABASE_URL > backup.sql

# Restore database
psql $DATABASE_URL < backup.sql
```

## Scaling

Railway automatically handles:
- Horizontal scaling based on traffic
- Database connection pooling
- SSL/TLS certificates
- CDN for static assets

To adjust resources:
1. Go to Project Settings
2. Select your service
3. Adjust CPU/Memory limits

## Troubleshooting

### Build Failures

Check build logs:
```bash
railway logs --deployment
```

Common issues:
- Missing dependencies: Run `npm install` locally to verify
- TypeScript errors: Run `npm run build` locally to check
- Missing environment variables: Verify all required vars are set

### Database Connection Issues

1. Verify `DATABASE_URL` is set correctly
2. Check database is running in Railway dashboard
3. Verify SSL settings (Railway requires SSL in production)

### Migration Failures

If migrations fail:
1. Check logs for specific error
2. Verify SQL syntax in `schema.sql`
3. Manually connect and run migrations step by step

### Calendar Integration Issues

1. Verify credentials file exists and is readable
2. Check service account has Calendar API access
3. Verify calendar IDs are correct
4. Check logs for specific errors

## Security Best Practices

1. **Environment Variables**: Never commit `.env` files to repository
2. **Database**: Use strong passwords, enable SSL
3. **API Access**: Implement authentication (see future enhancements)
4. **Audit Logs**: Regularly review for suspicious activity
5. **Backups**: Schedule regular database backups
6. **Updates**: Keep dependencies up to date

## Cost Management

Railway free tier includes:
- $5 of usage per month
- Should be sufficient for moderate use

Monitor usage:
1. Go to Project Settings
2. View "Usage" tab
3. Set up billing alerts

## Updating the Application

1. Make changes locally
2. Test thoroughly
3. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Update: description"
   git push origin main
   ```
4. Railway automatically deploys the update
5. Monitor logs during deployment

## Rolling Back

If deployment has issues:
1. Go to Railway Dashboard
2. Select "Deployments"
3. Find previous working deployment
4. Click "Redeploy"

Or use CLI:
```bash
railway rollback
```

## Support

- **Railway Documentation**: https://docs.railway.app/
- **PostgreSQL Documentation**: https://www.postgresql.org/docs/
- **Google Calendar API**: https://developers.google.com/calendar

For issues with the application:
- Check logs first
- Review audit trail for clues
- Open GitHub issue if bug found
