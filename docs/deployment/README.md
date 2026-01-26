# OpportuneX Deployment and Operations Guide

This comprehensive guide covers the deployment, configuration, and operational procedures for the OpportuneX platform.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Docker Deployment](#docker-deployment)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [Blue-Green Deployment](#blue-green-deployment)
6. [Database Management](#database-management)
7. [Monitoring and Alerting](#monitoring-and-alerting)
8. [Backup and Recovery](#backup-and-recovery)
9. [Security Configuration](#security-configuration)
10. [Troubleshooting](#troubleshooting)
11. [Maintenance Procedures](#maintenance-procedures)

## Prerequisites

### System Requirements

#### Minimum Requirements (Development)
- **CPU**: 4 cores
- **RAM**: 8 GB
- **Storage**: 50 GB SSD
- **Network**: 10 Mbps

#### Recommended Requirements (Production)
- **CPU**: 16 cores
- **RAM**: 32 GB
- **Storage**: 200 GB SSD
- **Network**: 100 Mbps

### Software Dependencies

#### Required Software
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Kubernetes**: 1.24+ (for K8s deployment)
- **kubectl**: 1.24+
- **Node.js**: 18+
- **npm**: 8+

#### Optional Software
- **Helm**: 3.8+ (for Kubernetes package management)
- **Terraform**: 1.0+ (for infrastructure as code)
- **AWS CLI**: 2.0+ (for cloud deployment)

### External Services

#### Required Services
- **PostgreSQL**: 15+ (managed or self-hosted)
- **Redis**: 7+ (managed or self-hosted)
- **Elasticsearch**: 8.11+ (managed or self-hosted)

#### Optional Services
- **AWS S3**: For file storage and backups
- **SendGrid**: For email notifications
- **Twilio**: For SMS notifications
- **Sentry**: For error tracking
- **DataDog/New Relic**: For APM

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/opportunex/opportunex.git
cd opportunex
```

### 2. Configure Environment Variables

```bash
# Copy and configure production environment
cp .env.production.example .env.production

# Run the environment setup script
bash scripts/setup-production-env.sh setup

# Edit the environment file with your actual values
nano .env.production
```

### 3. Generate Secrets

```bash
# Generate secure secrets and update Kubernetes secrets
bash scripts/setup-production-env.sh update-secrets

# Validate configuration
bash scripts/setup-production-env.sh validate
```

## Docker Deployment

### Development Environment

```bash
# Start development services
npm run docker:dev

# Check service status
docker-compose -f docker-compose.dev.yml ps

# View logs
docker-compose -f docker-compose.dev.yml logs -f
```

### Production Environment

```bash
# Build production images
docker build -f docker/Dockerfile.app -t opportunex/app:latest .
docker build -f docker/Dockerfile.api-gateway -t opportunex/api-gateway:latest .

# Start production services
docker-compose -f docker-compose.prod.yml up -d

# Check service health
docker-compose -f docker-compose.prod.yml ps
```

### Docker Image Management

```bash
# Tag images for registry
docker tag opportunex/app:latest registry.opportunex.com/app:v1.0.0
docker tag opportunex/api-gateway:latest registry.opportunex.com/api-gateway:v1.0.0

# Push to registry
docker push registry.opportunex.com/app:v1.0.0
docker push registry.opportunex.com/api-gateway:v1.0.0

# Clean up old images
docker image prune -f
```

## Kubernetes Deployment

### 1. Cluster Setup

```bash
# Verify cluster connection
kubectl cluster-info

# Create namespace
kubectl apply -f k8s/namespace.yaml

# Verify namespace
kubectl get namespaces
```

### 2. Deploy Infrastructure Services

```bash
# Deploy PostgreSQL
kubectl apply -f k8s/postgres-deployment.yaml

# Deploy Redis
kubectl apply -f k8s/redis-deployment.yaml

# Deploy Elasticsearch
kubectl apply -f k8s/elasticsearch-deployment.yaml

# Wait for services to be ready
kubectl wait --for=condition=ready pod -l app=postgres -n opportunex --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n opportunex --timeout=300s
kubectl wait --for=condition=ready pod -l app=elasticsearch -n opportunex --timeout=300s
```

### 3. Deploy Application Services

```bash
# Deploy API Gateway
kubectl apply -f k8s/api-gateway-deployment.yaml

# Deploy Next.js App
kubectl apply -f k8s/app-deployment.yaml

# Deploy Nginx Load Balancer
kubectl apply -f k8s/nginx-deployment.yaml

# Wait for applications to be ready
kubectl wait --for=condition=ready pod -l app=opportunex-api -n opportunex --timeout=300s
kubectl wait --for=condition=ready pod -l app=opportunex-app -n opportunex --timeout=300s
```

### 4. Complete Deployment

```bash
# Run the complete deployment script
bash scripts/deploy-k8s.sh

# Check deployment status
kubectl get all -n opportunex

# Check ingress
kubectl get ingress -n opportunex
```

### 5. Post-Deployment Setup

```bash
# Run database migrations
kubectl exec -n opportunex deployment/opportunex-app-deployment -- npm run db:migrate

# Seed initial data
kubectl exec -n opportunex deployment/opportunex-app-deployment -- npm run db:seed

# Initialize Elasticsearch indices
kubectl exec -n opportunex deployment/opportunex-app-deployment -- npm run es:init
```

## Blue-Green Deployment

### Overview

Blue-green deployment provides zero-downtime deployments by maintaining two identical production environments (blue and green) and switching traffic between them.

### Deployment Process

```bash
# Deploy new version to inactive environment
bash scripts/blue-green-deploy.sh --app-image v1.2.0 --api-image v1.2.0

# Dry run to see what would be deployed
bash scripts/blue-green-deploy.sh --app-image v1.2.0 --api-image v1.2.0 --dry-run

# Force deployment (skip health checks)
bash scripts/blue-green-deploy.sh --app-image v1.2.0 --api-image v1.2.0 --force

# Rollback to previous version
bash scripts/blue-green-deploy.sh --rollback
```

### Deployment Verification

```bash
# Check current active environment
kubectl get service opportunex-app-service -n opportunex -o jsonpath='{.spec.selector.color}'

# Monitor deployment progress
kubectl get pods -n opportunex -l color=green --watch

# Check application health
curl -f https://opportunex.com/api/health
```

### Rollback Procedures

```bash
# Automatic rollback (if health checks fail)
# The script automatically rolls back on failure

# Manual rollback
bash scripts/blue-green-deploy.sh --rollback

# Emergency rollback (direct service update)
kubectl patch service opportunex-app-service -n opportunex \
  -p '{"spec":{"selector":{"color":"blue"}}}'
```

## Database Management

### PostgreSQL Operations

```bash
# Connect to database
kubectl exec -it deployment/postgres-deployment -n opportunex -- psql -U postgres -d opportunex

# Run migrations
kubectl exec -n opportunex deployment/opportunex-app-deployment -- npm run db:migrate

# Rollback migration
kubectl exec -n opportunex deployment/opportunex-app-deployment -- npm run db:migrate:rollback

# Generate Prisma client
kubectl exec -n opportunex deployment/opportunex-app-deployment -- npm run db:generate

# View database schema
kubectl exec -n opportunex deployment/opportunex-app-deployment -- npm run db:studio
```

### Redis Operations

```bash
# Connect to Redis
kubectl exec -it deployment/redis-deployment -n opportunex -- redis-cli

# Monitor Redis
kubectl exec -it deployment/redis-deployment -n opportunex -- redis-cli monitor

# Check Redis info
kubectl exec -it deployment/redis-deployment -n opportunex -- redis-cli info

# Flush Redis cache (use with caution)
kubectl exec -it deployment/redis-deployment -n opportunex -- redis-cli flushall
```

### Elasticsearch Operations

```bash
# Check cluster health
curl -X GET "elasticsearch-service.opportunex.svc.cluster.local:9200/_cluster/health?pretty"

# List indices
curl -X GET "elasticsearch-service.opportunex.svc.cluster.local:9200/_cat/indices?v"

# Initialize indices
kubectl exec -n opportunex deployment/opportunex-app-deployment -- npm run es:init

# Reindex data
kubectl exec -n opportunex deployment/opportunex-app-deployment -- npm run es:reindex
```

## Monitoring and Alerting

### Prometheus Setup

```bash
# Deploy monitoring stack
kubectl apply -f k8s/monitoring-deployment.yaml

# Access Prometheus UI
kubectl port-forward service/prometheus-service 9090:9090 -n opportunex

# Access Grafana UI
kubectl port-forward service/grafana-service 3000:3000 -n opportunex
```

### Key Metrics to Monitor

#### Application Metrics
- **Response Time**: 95th percentile < 2 seconds
- **Error Rate**: < 1% of requests
- **Throughput**: Requests per second
- **Active Users**: Concurrent user sessions

#### Infrastructure Metrics
- **CPU Usage**: < 70% average
- **Memory Usage**: < 80% average
- **Disk Usage**: < 85% capacity
- **Network I/O**: Bandwidth utilization

#### Database Metrics
- **Connection Pool**: Active/idle connections
- **Query Performance**: Slow query log
- **Replication Lag**: For read replicas
- **Lock Waits**: Database lock contention

### Alert Configuration

```yaml
# Example alert rules (already included in monitoring-deployment.yaml)
groups:
- name: opportunex_alerts
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"
```

### Log Management

```bash
# View application logs
kubectl logs -f deployment/opportunex-app-deployment -n opportunex

# View API gateway logs
kubectl logs -f deployment/opportunex-api-deployment -n opportunex

# View logs from all pods
kubectl logs -f -l app=opportunex-app -n opportunex --all-containers=true

# Export logs for analysis
kubectl logs deployment/opportunex-app-deployment -n opportunex --since=1h > app-logs.txt
```

## Backup and Recovery

### Automated Backup

```bash
# Run full backup
bash scripts/backup-database.sh

# Schedule automated backups (add to crontab)
0 2 * * * /path/to/opportunex/scripts/backup-database.sh

# Check backup status
ls -la /var/backups/opportunex/
```

### Manual Backup

```bash
# PostgreSQL backup
kubectl exec deployment/postgres-deployment -n opportunex -- \
  pg_dump -U postgres opportunex > backup_$(date +%Y%m%d).sql

# Redis backup
kubectl exec deployment/redis-deployment -n opportunex -- \
  redis-cli --rdb /tmp/dump.rdb

# Elasticsearch backup
curl -X PUT "elasticsearch-service.opportunex.svc.cluster.local:9200/_snapshot/backup_repo/snapshot_$(date +%Y%m%d)"
```

### Restore Procedures

```bash
# Restore from backup
bash scripts/restore-database.sh 20231201_143000

# Restore only PostgreSQL
bash scripts/restore-database.sh --postgres-only 20231201_143000

# Restore from S3
bash scripts/restore-database.sh --from-s3 20231201_143000

# Force restore (skip confirmations)
bash scripts/restore-database.sh --force 20231201_143000
```

### Disaster Recovery

#### RTO/RPO Targets
- **Recovery Time Objective (RTO)**: 4 hours
- **Recovery Point Objective (RPO)**: 1 hour

#### Recovery Procedures

1. **Assess the situation**
   ```bash
   # Check service status
   kubectl get pods -n opportunex
   
   # Check recent logs
   kubectl logs --tail=100 -l app=opportunex-app -n opportunex
   ```

2. **Restore from backup**
   ```bash
   # Find latest backup
   ls -la /var/backups/opportunex/ | tail -5
   
   # Restore database
   bash scripts/restore-database.sh LATEST_BACKUP_TIMESTAMP
   ```

3. **Verify restoration**
   ```bash
   # Check application health
   curl -f https://opportunex.com/api/health
   
   # Run smoke tests
   npm run test:smoke
   ```

## Security Configuration

### SSL/TLS Setup

```bash
# Generate SSL certificates (using Let's Encrypt)
certbot certonly --dns-cloudflare \
  --dns-cloudflare-credentials ~/.secrets/certbot/cloudflare.ini \
  -d opportunex.com -d www.opportunex.com

# Update Kubernetes secrets
kubectl create secret tls opportunex-tls \
  --cert=/etc/letsencrypt/live/opportunex.com/fullchain.pem \
  --key=/etc/letsencrypt/live/opportunex.com/privkey.pem \
  -n opportunex
```

### Security Headers

Security headers are configured in the Nginx configuration:

- **HSTS**: Strict-Transport-Security
- **CSP**: Content-Security-Policy
- **X-Frame-Options**: DENY
- **X-Content-Type-Options**: nosniff
- **X-XSS-Protection**: 1; mode=block

### Network Security

```bash
# Configure network policies
kubectl apply -f k8s/network-policies.yaml

# Check network policies
kubectl get networkpolicies -n opportunex

# Test network connectivity
kubectl exec -it deployment/opportunex-app-deployment -n opportunex -- \
  nc -zv postgres-service 5432
```

### Secret Management

```bash
# Create secrets
kubectl create secret generic opportunex-secrets \
  --from-env-file=.env.production \
  -n opportunex

# Update secrets
kubectl patch secret opportunex-secrets -n opportunex \
  -p '{"data":{"JWT_SECRET":"'$(echo -n "new-secret" | base64)'"}}'

# Rotate secrets
bash scripts/setup-production-env.sh update-secrets
```

## Troubleshooting

### Common Issues

#### 1. Pod Startup Issues

```bash
# Check pod status
kubectl get pods -n opportunex

# Describe problematic pod
kubectl describe pod POD_NAME -n opportunex

# Check pod logs
kubectl logs POD_NAME -n opportunex

# Check events
kubectl get events -n opportunex --sort-by='.lastTimestamp'
```

#### 2. Database Connection Issues

```bash
# Test database connectivity
kubectl exec -it deployment/opportunex-app-deployment -n opportunex -- \
  nc -zv postgres-service 5432

# Check database logs
kubectl logs deployment/postgres-deployment -n opportunex

# Verify database credentials
kubectl get secret opportunex-secrets -n opportunex -o yaml
```

#### 3. Service Discovery Issues

```bash
# Check service endpoints
kubectl get endpoints -n opportunex

# Test service connectivity
kubectl exec -it deployment/opportunex-app-deployment -n opportunex -- \
  curl -f http://postgres-service:5432

# Check DNS resolution
kubectl exec -it deployment/opportunex-app-deployment -n opportunex -- \
  nslookup postgres-service
```

#### 4. Performance Issues

```bash
# Check resource usage
kubectl top pods -n opportunex

# Check node resources
kubectl top nodes

# Analyze slow queries
kubectl exec -it deployment/postgres-deployment -n opportunex -- \
  psql -U postgres -d opportunex -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"
```

### Debug Commands

```bash
# Get cluster info
kubectl cluster-info dump

# Check resource quotas
kubectl describe resourcequota -n opportunex

# Check persistent volumes
kubectl get pv,pvc -n opportunex

# Check ingress
kubectl describe ingress opportunex-ingress -n opportunex

# Port forward for debugging
kubectl port-forward service/opportunex-app-service 3000:3000 -n opportunex
```

## Maintenance Procedures

### Regular Maintenance Tasks

#### Daily
- [ ] Check application health endpoints
- [ ] Review error logs and alerts
- [ ] Monitor resource usage
- [ ] Verify backup completion

#### Weekly
- [ ] Review performance metrics
- [ ] Check security alerts
- [ ] Update dependencies (if needed)
- [ ] Test disaster recovery procedures

#### Monthly
- [ ] Security patches and updates
- [ ] Capacity planning review
- [ ] Backup retention cleanup
- [ ] Performance optimization review

### Update Procedures

#### Application Updates

```bash
# Update application code
git pull origin main

# Build new images
docker build -f docker/Dockerfile.app -t opportunex/app:v1.2.0 .
docker build -f docker/Dockerfile.api-gateway -t opportunex/api-gateway:v1.2.0 .

# Deploy using blue-green strategy
bash scripts/blue-green-deploy.sh --app-image v1.2.0 --api-image v1.2.0
```

#### Infrastructure Updates

```bash
# Update Kubernetes manifests
kubectl apply -f k8s/

# Rolling update deployment
kubectl rollout restart deployment/opportunex-app-deployment -n opportunex

# Check rollout status
kubectl rollout status deployment/opportunex-app-deployment -n opportunex
```

#### Database Updates

```bash
# Run database migrations
kubectl exec -n opportunex deployment/opportunex-app-deployment -- npm run db:migrate

# Update database configuration
kubectl patch configmap opportunex-config -n opportunex \
  -p '{"data":{"DATABASE_POOL_SIZE":"20"}}'
```

### Scaling Procedures

#### Horizontal Scaling

```bash
# Scale application pods
kubectl scale deployment opportunex-app-deployment --replicas=5 -n opportunex

# Scale API gateway pods
kubectl scale deployment opportunex-api-deployment --replicas=3 -n opportunex

# Check HPA status
kubectl get hpa -n opportunex
```

#### Vertical Scaling

```bash
# Update resource limits
kubectl patch deployment opportunex-app-deployment -n opportunex \
  -p '{"spec":{"template":{"spec":{"containers":[{"name":"opportunex-app","resources":{"limits":{"memory":"2Gi","cpu":"1000m"}}}]}}}}'

# Restart deployment to apply changes
kubectl rollout restart deployment/opportunex-app-deployment -n opportunex
```

### Health Checks

```bash
# Application health
curl -f https://opportunex.com/api/health

# Database health
kubectl exec -n opportunex deployment/postgres-deployment -- \
  pg_isready -U postgres -d opportunex

# Redis health
kubectl exec -n opportunex deployment/redis-deployment -- \
  redis-cli ping

# Elasticsearch health
curl -f http://elasticsearch-service.opportunex.svc.cluster.local:9200/_cluster/health
```

## Support and Documentation

### Getting Help

- **Documentation**: https://docs.opportunex.com
- **API Reference**: https://api.opportunex.com/docs
- **Support Email**: support@opportunex.com
- **Emergency Contact**: +1-XXX-XXX-XXXX

### Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)
- [Elasticsearch Documentation](https://www.elastic.co/guide/)

---

**Last Updated**: December 2023  
**Version**: 1.0.0  
**Maintained By**: OpportuneX DevOps Team