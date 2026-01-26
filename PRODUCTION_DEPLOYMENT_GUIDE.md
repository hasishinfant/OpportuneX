# OpportuneX Production Deployment Guide

## 🚀 Market-Ready Application Deployment

This guide will help you deploy OpportuneX to production for market launch.

## Prerequisites

- **Domain Name**: Register your domain (e.g., opportunex.com)
- **Cloud Provider**: AWS, Google Cloud, or Azure account
- **SSL Certificate**: For HTTPS (Let's Encrypt or commercial)
- **External Services**: API keys for OpenAI, SendGrid, Twilio

## Quick Production Deployment

### 1. Environment Setup

```bash
# Clone and setup
git clone <your-repo>
cd opportunex

# Setup production environment
bash scripts/setup-production-env.sh

# Edit the generated .env.production file with your API keys
nano .env.production
```

### 2. Configure External Services

#### Required API Keys:
- **OpenAI API Key**: For AI roadmap generation
- **SendGrid API Key**: For email notifications  
- **Twilio Credentials**: For SMS notifications
- **Google Cloud/Azure**: For voice search (optional)

#### Update .env.production:
```bash
OPENAI_API_KEY=sk-your-openai-key-here
SENDGRID_API_KEY=SG.your-sendgrid-key-here
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
```

### 3. Deploy to Cloud

#### Option A: Docker Deployment (Recommended)
```bash
# Build and deploy with Docker
npm run docker:prod

# The application will be available at http://localhost:3000
```

#### Option B: Kubernetes Deployment (Enterprise)
```bash
# Deploy to Kubernetes cluster
bash scripts/deploy-k8s.sh

# Check deployment status
kubectl get pods -n opportunex
```

#### Option C: Cloud Platform Deployment

**Vercel (Easiest)**:
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel --prod
```

**AWS/Google Cloud/Azure**:
- Use the provided Docker containers
- Configure load balancer and auto-scaling
- Set up managed database services

### 4. Domain and SSL Setup

```bash
# Configure your domain DNS to point to your deployment
# A Record: opportunex.com -> YOUR_SERVER_IP
# CNAME: www.opportunex.com -> opportunex.com

# SSL Certificate (Let's Encrypt)
certbot --nginx -d opportunex.com -d www.opportunex.com
```

### 5. Database Setup

```bash
# Run database migrations
npm run db:migrate:prod

# Initialize Elasticsearch indices
npm run es:init

# Seed initial data (optional)
npm run db:seed
```

### 6. Monitoring Setup

```bash
# Health check endpoints available at:
# GET /api/health - Application health
# GET /api/health/ready - Readiness probe
# GET /api/health/live - Liveness probe
# GET /api/metrics - Application metrics
```

## Production Features

### ✅ **Core Platform Features**
- **Smart Search**: Natural language + voice search
- **AI Instructor**: Personalized roadmaps
- **User Management**: Authentication & profiles
- **Opportunity Aggregation**: Multi-source data collection
- **Real-time Notifications**: Email, SMS, in-app
- **Progressive Web App**: Installable, offline-capable

### ✅ **Enterprise Features**
- **Auto-scaling**: Handles traffic spikes
- **Load Balancing**: Distributes requests efficiently
- **Caching**: Redis for high performance
- **Security**: Enterprise-grade protection
- **Monitoring**: Real-time health checks
- **Backup**: Automated data protection

### ✅ **Mobile-First Design**
- **Responsive**: Works on all devices
- **Voice Search**: Mobile-optimized
- **PWA**: App-like experience
- **Offline Mode**: Works without internet
- **Touch Optimized**: Mobile gestures

## Performance Optimization

### Automatic Optimizations:
- **CDN Integration**: Fast global content delivery
- **Image Optimization**: Automatic compression
- **Code Splitting**: Faster page loads
- **Caching Strategy**: Multi-layer caching
- **Database Optimization**: Query optimization

### Scaling Configuration:
```bash
# Auto-scaling settings in .env.production
MIN_REPLICAS=3
MAX_REPLICAS=10
CPU_THRESHOLD=70
MEMORY_THRESHOLD=80
```

## Security Features

### ✅ **Production Security**
- **HTTPS Enforcement**: SSL/TLS encryption
- **Data Encryption**: At rest and in transit
- **Rate Limiting**: DDoS protection
- **Input Validation**: XSS/SQL injection prevention
- **GDPR Compliance**: Data privacy protection
- **Audit Logging**: Security event tracking

## Monitoring & Analytics

### Built-in Monitoring:
- **Application Health**: Real-time status
- **Performance Metrics**: Response times, throughput
- **Error Tracking**: Automatic error reporting
- **User Analytics**: Usage patterns and insights
- **Search Analytics**: Query performance tracking

### External Integrations:
- **Sentry**: Error monitoring
- **Google Analytics**: User behavior
- **Mixpanel**: Event tracking

## Backup & Recovery

### Automated Backups:
- **Database**: Daily automated backups
- **File Storage**: Incremental backups
- **Configuration**: Version-controlled configs
- **Disaster Recovery**: Multi-region redundancy

## Support & Maintenance

### Health Monitoring:
```bash
# Check application health
curl https://opportunex.com/api/health

# Monitor system metrics
curl https://opportunex.com/api/metrics
```

### Log Monitoring:
```bash
# View application logs
kubectl logs -f deployment/opportunex-app -n opportunex

# View API gateway logs  
kubectl logs -f deployment/opportunex-api-gateway -n opportunex
```

## Go-Live Checklist

### Pre-Launch:
- [ ] Domain configured and SSL enabled
- [ ] All API keys configured
- [ ] Database migrations completed
- [ ] Search indices initialized
- [ ] Monitoring and alerting configured
- [ ] Backup systems tested
- [ ] Load testing completed
- [ ] Security audit passed

### Launch Day:
- [ ] DNS propagation verified
- [ ] SSL certificate valid
- [ ] All services healthy
- [ ] Monitoring dashboards active
- [ ] Support team notified
- [ ] Marketing team ready

### Post-Launch:
- [ ] Monitor application performance
- [ ] Track user registrations
- [ ] Monitor error rates
- [ ] Review security logs
- [ ] Collect user feedback
- [ ] Plan feature updates

## Troubleshooting

### Common Issues:

**Database Connection Issues**:
```bash
# Check database connectivity
npm run db:generate
npm run db:push
```

**Search Not Working**:
```bash
# Reinitialize Elasticsearch
npm run es:init
```

**High Memory Usage**:
```bash
# Check Redis cache usage
npm run redis:health
```

## Support

For technical support:
- Check logs: `kubectl logs -f deployment/opportunex-app`
- Health checks: `curl /api/health`
- Documentation: See `/docs` directory
- Issues: Create GitHub issue

---

## 🎉 Your OpportuneX Platform is Ready for Market!

The application includes all enterprise features needed for a successful market launch:
- Scalable architecture
- Production security
- Mobile-first design
- AI-powered features
- Real-time notifications
- Comprehensive monitoring

Deploy with confidence! 🚀