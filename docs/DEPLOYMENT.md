# ZeaWatch Deployment Guide

## Environment Variables

### Backend (.env)

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_service_role_key  # Use service role key for backend

# JWT Authentication
JWT_SECRET_KEY=your-super-secret-jwt-key-change-in-production

# Email Service
EMAIL_PROVIDER=sendgrid  # or 'mailgun'
EMAIL_API_KEY=your_sendgrid_or_mailgun_api_key
EMAIL_FROM=noreply@zeawatch.com
MAILGUN_DOMAIN=your_mailgun_domain  # Only if using Mailgun

# Payment Integration
PAYMENT_PROVIDER=stripe  # or 'mpesa'
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_PREMIUM1=price_...
STRIPE_PRICE_ID_PREMIUM2=price_...

# Application
APP_URL=http://localhost:3000
PORT=5000
MODEL_VERSION=1.0.0
MODEL_PATH=./models/hybrid_model.pth
UPLOAD_FOLDER=./static/uploads

# AI Services
GEMINI_API_KEY=your_gemini_api_key
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Database Setup (Supabase)

### 1. Create Supabase Project

1. Go to https://supabase.com and sign up/login
2. Click "New Project"
3. Fill in project details:
   - Name: ZeaWatch
   - Database Password: (choose a strong password)
   - Region: (choose closest to your users)
4. Wait for project to be created

### 2. Get API Keys

1. Go to Project Settings → API
2. Copy:
   - Project URL (SUPABASE_URL)
   - Service Role Key (SUPABASE_KEY) - **Keep this secret!**

### 3. Run Schema Migration

1. Go to SQL Editor in Supabase dashboard
2. Copy contents of `database/schema_supabase.sql`
3. Paste and run the SQL script
4. Verify all tables are created

## Backend Setup

### 1. Install Dependencies

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in values.

### 3. Run Backend

```bash
python app.py
```

Backend runs on `http://localhost:5000`

## Frontend Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Environment

Create `.env.local` with frontend variables.

### 3. Run Frontend

```bash
npm run dev
```

Frontend runs on `http://localhost:3000`

## Production Deployment

### Backend (Docker)

```dockerfile
# Use existing Dockerfile or create one
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000
CMD ["python", "app.py"]
```

### Frontend (Vercel/Netlify)

1. Connect repository to Vercel/Netlify
2. Set environment variables in dashboard
3. Deploy

### Database (Production)

- Use managed PostgreSQL (AWS RDS, Google Cloud SQL, Azure Database)
- Enable SSL connections
- Set up automated backups
- Configure connection pooling

## Security Checklist

- [ ] Change all default passwords
- [ ] Use strong JWT secret key (32+ characters)
- [ ] Enable HTTPS everywhere
- [ ] Set secure cookie flags (HttpOnly, Secure, SameSite)
- [ ] Enable rate limiting on auth endpoints
- [ ] Use environment variables for all secrets
- [ ] Enable database SSL connections
- [ ] Set up firewall rules
- [ ] Regular security updates
- [ ] Enable audit logging
- [ ] Encrypt sensitive database fields if required

## Email Service Setup

### SendGrid

1. Sign up at https://sendgrid.com
2. Create API key
3. Verify sender email
4. Set `EMAIL_PROVIDER=sendgrid` and `EMAIL_API_KEY`

### Mailgun

1. Sign up at https://mailgun.com
2. Verify domain
3. Get API key
4. Set `EMAIL_PROVIDER=mailgun`, `EMAIL_API_KEY`, and `MAILGUN_DOMAIN`

## Payment Integration

### Stripe

1. Sign up at https://stripe.com
2. Get API keys from dashboard
3. Create products and prices for each tier
4. Set up webhook endpoint: `https://your-domain.com/api/payments/webhook`
5. Configure webhook secret

### M-Pesa (Safaricom Daraja)

1. Register at https://developer.safaricom.co.ke
2. Get consumer key and secret
3. Implement Daraja API integration
4. Set up webhook for payment notifications

## Monitoring & Logging

### Recommended Tools

- **Application Monitoring**: Sentry, Datadog, New Relic
- **Logging**: ELK Stack, CloudWatch, Loggly
- **Metrics**: Prometheus + Grafana
- **Uptime**: UptimeRobot, Pingdom

### Key Metrics to Monitor

- Prediction count
- Average confidence
- Failed predictions
- Active subscriptions
- Monthly recurring revenue (MRR)
- API response times
- Error rates

## Backup Strategy

### Database Backups

```bash
# Daily backup script
pg_dump -U zeawatch_user zeawatch > backup_$(date +%Y%m%d).sql

# Restore
psql -U zeawatch_user zeawatch < backup_20240101.sql
```

### Automated Backups

- Use managed database backup features
- Set up daily automated backups
- Test restore procedures regularly
- Store backups in separate location

## Scaling Considerations

### Horizontal Scaling

- Use load balancer (Nginx, AWS ALB)
- Multiple backend instances
- Database connection pooling
- Redis for session storage (if needed)

### Vertical Scaling

- Increase database resources
- Optimize database queries
- Add indexes as needed
- Cache frequently accessed data

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check database is running
   - Verify credentials
   - Check firewall rules

2. **JWT Token Errors**
   - Verify JWT_SECRET_KEY is set
   - Check token expiration
   - Ensure HTTPS in production

3. **Email Not Sending**
   - Verify API keys
   - Check email provider status
   - Review email service logs

4. **Payment Webhook Failures**
   - Verify webhook secret
   - Check endpoint is accessible
   - Review webhook logs

## Support

For issues or questions, contact the development team or check the project repository.


