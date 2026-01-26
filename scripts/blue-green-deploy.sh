#!/bin/bash

# Blue-Green Deployment Script for OpportuneX
# Implements zero-downtime deployment strategy with automatic rollback

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="opportunex"
KUBECTL_TIMEOUT="300s"
HEALTH_CHECK_RETRIES=10
HEALTH_CHECK_INTERVAL=30

# Deployment configuration
APP_NAME="opportunex-app"
API_NAME="opportunex-api"
NGINX_NAME="nginx"

# Image tags
NEW_APP_IMAGE="${APP_IMAGE_TAG:-latest}"
NEW_API_IMAGE="${API_IMAGE_TAG:-latest}"

# Logging
LOG_FILE="/var/log/opportunex/deployment.log"

# Function to log messages
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Function to show usage
show_usage() {
    echo -e "${BLUE}Usage: $0 [OPTIONS]${NC}"
    echo -e "${YELLOW}Options:${NC}"
    echo -e "  --app-image TAG        Docker image tag for the app (default: latest)"
    echo -e "  --api-image TAG        Docker image tag for the API (default: latest)"
    echo -e "  --dry-run              Show what would be deployed without executing"
    echo -e "  --skip-tests           Skip health checks and smoke tests"
    echo -e "  --force                Force deployment even if health checks fail"
    echo -e "  --rollback             Rollback to previous deployment"
    echo -e "  -h, --help             Show this help message"
    echo -e ""
    echo -e "${YELLOW}Examples:${NC}"
    echo -e "  $0 --app-image v1.2.3 --api-image v1.2.3"
    echo -e "  $0 --dry-run"
    echo -e "  $0 --rollback"
}

# Function to check dependencies
check_dependencies() {
    log "INFO" "Checking deployment dependencies..."
    
    if ! command -v kubectl &> /dev/null; then
        log "ERROR" "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    if ! kubectl cluster-info &> /dev/null; then
        log "ERROR" "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        log "ERROR" "jq is required but not installed"
        exit 1
    fi
    
    log "INFO" "All dependencies are available"
}

# Function to get current deployment state
get_current_state() {
    log "INFO" "Getting current deployment state..."
    
    # Get current active color (blue or green)
    CURRENT_COLOR=$(kubectl get service "$APP_NAME-service" -n "$NAMESPACE" \
        -o jsonpath='{.spec.selector.color}' 2>/dev/null || echo "blue")
    
    # Determine new color
    if [ "$CURRENT_COLOR" = "blue" ]; then
        NEW_COLOR="green"
    else
        NEW_COLOR="blue"
    fi
    
    log "INFO" "Current active color: $CURRENT_COLOR"
    log "INFO" "New deployment color: $NEW_COLOR"
    
    # Store current deployment info for rollback
    kubectl get deployment "$APP_NAME-deployment" -n "$NAMESPACE" \
        -o yaml > "/tmp/${APP_NAME}-${CURRENT_COLOR}-backup.yaml" 2>/dev/null || true
    kubectl get deployment "$API_NAME-deployment" -n "$NAMESPACE" \
        -o yaml > "/tmp/${API_NAME}-${CURRENT_COLOR}-backup.yaml" 2>/dev/null || true
}

# Function to create blue-green deployment manifests
create_deployment_manifests() {
    log "INFO" "Creating blue-green deployment manifests..."
    
    # Create temporary directory for manifests
    MANIFEST_DIR="/tmp/opportunex-deploy-$NEW_COLOR"
    mkdir -p "$MANIFEST_DIR"
    
    # App deployment manifest
    cat > "$MANIFEST_DIR/app-deployment.yaml" << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: $APP_NAME-deployment-$NEW_COLOR
  namespace: $NAMESPACE
  labels:
    app: $APP_NAME
    color: $NEW_COLOR
spec:
  replicas: 3
  selector:
    matchLabels:
      app: $APP_NAME
      color: $NEW_COLOR
  template:
    metadata:
      labels:
        app: $APP_NAME
        color: $NEW_COLOR
    spec:
      containers:
      - name: $APP_NAME
        image: opportunex/app:$NEW_APP_IMAGE
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          value: "postgresql://postgres:\$(DATABASE_PASSWORD)@postgres-service:5432/opportunex"
        - name: DATABASE_PASSWORD
          valueFrom:
            secretKeyRef:
              name: opportunex-secrets
              key: DATABASE_PASSWORD
        - name: REDIS_URL
          value: "redis://redis-service:6379"
        - name: ELASTICSEARCH_URL
          value: "http://elasticsearch-service:9200"
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: opportunex-secrets
              key: JWT_SECRET
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: opportunex-secrets
              key: OPENAI_API_KEY
        - name: DEPLOYMENT_COLOR
          value: "$NEW_COLOR"
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        securityContext:
          runAsNonRoot: true
          runAsUser: 1001
          allowPrivilegeEscalation: false
EOF

    # API deployment manifest
    cat > "$MANIFEST_DIR/api-deployment.yaml" << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: $API_NAME-deployment-$NEW_COLOR
  namespace: $NAMESPACE
  labels:
    app: $API_NAME
    color: $NEW_COLOR
spec:
  replicas: 2
  selector:
    matchLabels:
      app: $API_NAME
      color: $NEW_COLOR
  template:
    metadata:
      labels:
        app: $API_NAME
        color: $NEW_COLOR
    spec:
      containers:
      - name: $API_NAME
        image: opportunex/api-gateway:$NEW_API_IMAGE
        ports:
        - containerPort: 8080
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          value: "postgresql://postgres:\$(DATABASE_PASSWORD)@postgres-service:5432/opportunex"
        - name: DATABASE_PASSWORD
          valueFrom:
            secretKeyRef:
              name: opportunex-secrets
              key: DATABASE_PASSWORD
        - name: REDIS_URL
          value: "redis://redis-service:6379"
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: opportunex-secrets
              key: JWT_SECRET
        - name: DEPLOYMENT_COLOR
          value: "$NEW_COLOR"
        resources:
          requests:
            memory: "256Mi"
            cpu: "125m"
          limits:
            memory: "512Mi"
            cpu: "250m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        securityContext:
          runAsNonRoot: true
          runAsUser: 1001
          allowPrivilegeEscalation: false
EOF

    log "INFO" "Deployment manifests created in $MANIFEST_DIR"
}

# Function to deploy new version
deploy_new_version() {
    if [ "$DRY_RUN" = "true" ]; then
        log "INFO" "DRY RUN: Would deploy new version with color $NEW_COLOR"
        log "INFO" "DRY RUN: App image: opportunex/app:$NEW_APP_IMAGE"
        log "INFO" "DRY RUN: API image: opportunex/api-gateway:$NEW_API_IMAGE"
        return 0
    fi
    
    log "INFO" "Deploying new version with color $NEW_COLOR..."
    
    # Deploy new app version
    kubectl apply -f "$MANIFEST_DIR/app-deployment.yaml"
    log "INFO" "App deployment applied"
    
    # Deploy new API version
    kubectl apply -f "$MANIFEST_DIR/api-deployment.yaml"
    log "INFO" "API deployment applied"
    
    # Wait for deployments to be ready
    log "INFO" "Waiting for new deployments to be ready..."
    
    kubectl wait --for=condition=available deployment/"$APP_NAME-deployment-$NEW_COLOR" \
        -n "$NAMESPACE" --timeout="$KUBECTL_TIMEOUT"
    log "INFO" "App deployment is ready"
    
    kubectl wait --for=condition=available deployment/"$API_NAME-deployment-$NEW_COLOR" \
        -n "$NAMESPACE" --timeout="$KUBECTL_TIMEOUT"
    log "INFO" "API deployment is ready"
}

# Function to run health checks
run_health_checks() {
    if [ "$SKIP_TESTS" = "true" ]; then
        log "INFO" "Skipping health checks as requested"
        return 0
    fi
    
    log "INFO" "Running health checks on new deployment..."
    
    # Get pod IPs for direct health checks
    local app_pods=$(kubectl get pods -n "$NAMESPACE" -l "app=$APP_NAME,color=$NEW_COLOR" \
        -o jsonpath='{.items[*].status.podIP}')
    local api_pods=$(kubectl get pods -n "$NAMESPACE" -l "app=$API_NAME,color=$NEW_COLOR" \
        -o jsonpath='{.items[*].status.podIP}')
    
    # Health check for app pods
    for pod_ip in $app_pods; do
        local retries=0
        while [ $retries -lt $HEALTH_CHECK_RETRIES ]; do
            if curl -f -s "http://$pod_ip:3000/api/health" > /dev/null; then
                log "INFO" "App pod $pod_ip health check passed"
                break
            else
                retries=$((retries + 1))
                if [ $retries -eq $HEALTH_CHECK_RETRIES ]; then
                    log "ERROR" "App pod $pod_ip health check failed after $HEALTH_CHECK_RETRIES attempts"
                    return 1
                fi
                sleep $HEALTH_CHECK_INTERVAL
            fi
        done
    done
    
    # Health check for API pods
    for pod_ip in $api_pods; do
        local retries=0
        while [ $retries -lt $HEALTH_CHECK_RETRIES ]; do
            if curl -f -s "http://$pod_ip:8080/health" > /dev/null; then
                log "INFO" "API pod $pod_ip health check passed"
                break
            else
                retries=$((retries + 1))
                if [ $retries -eq $HEALTH_CHECK_RETRIES ]; then
                    log "ERROR" "API pod $pod_ip health check failed after $HEALTH_CHECK_RETRIES attempts"
                    return 1
                fi
                sleep $HEALTH_CHECK_INTERVAL
            fi
        done
    done
    
    log "INFO" "All health checks passed"
}

# Function to run smoke tests
run_smoke_tests() {
    if [ "$SKIP_TESTS" = "true" ]; then
        log "INFO" "Skipping smoke tests as requested"
        return 0
    fi
    
    log "INFO" "Running smoke tests..."
    
    # Create a temporary service for testing
    kubectl expose deployment "$APP_NAME-deployment-$NEW_COLOR" \
        --name="$APP_NAME-test-service" \
        --port=3000 --target-port=3000 \
        --type=ClusterIP -n "$NAMESPACE" || true
    
    # Wait for service to be ready
    sleep 10
    
    # Get service cluster IP
    local service_ip=$(kubectl get service "$APP_NAME-test-service" -n "$NAMESPACE" \
        -o jsonpath='{.spec.clusterIP}')
    
    # Run basic smoke tests
    local test_pod="smoke-test-$(date +%s)"
    
    kubectl run "$test_pod" --image=curlimages/curl:latest -n "$NAMESPACE" \
        --rm -i --restart=Never -- sh -c "
        echo 'Testing health endpoint...'
        curl -f http://$service_ip:3000/api/health || exit 1
        
        echo 'Testing search endpoint...'
        curl -f -X POST http://$service_ip:3000/api/search \
            -H 'Content-Type: application/json' \
            -d '{\"query\":\"test\"}' || exit 1
        
        echo 'All smoke tests passed'
    "
    
    local smoke_test_result=$?
    
    # Clean up test service
    kubectl delete service "$APP_NAME-test-service" -n "$NAMESPACE" || true
    
    if [ $smoke_test_result -eq 0 ]; then
        log "INFO" "Smoke tests passed"
        return 0
    else
        log "ERROR" "Smoke tests failed"
        return 1
    fi
}

# Function to switch traffic
switch_traffic() {
    if [ "$DRY_RUN" = "true" ]; then
        log "INFO" "DRY RUN: Would switch traffic to $NEW_COLOR deployment"
        return 0
    fi
    
    log "INFO" "Switching traffic to new deployment..."
    
    # Update app service selector
    kubectl patch service "$APP_NAME-service" -n "$NAMESPACE" \
        -p '{"spec":{"selector":{"color":"'$NEW_COLOR'"}}}'
    log "INFO" "App service updated to point to $NEW_COLOR deployment"
    
    # Update API service selector
    kubectl patch service "$API_NAME-service" -n "$NAMESPACE" \
        -p '{"spec":{"selector":{"color":"'$NEW_COLOR'"}}}'
    log "INFO" "API service updated to point to $NEW_COLOR deployment"
    
    # Wait for service endpoints to update
    sleep 30
    
    # Verify traffic switch
    local app_endpoints=$(kubectl get endpoints "$APP_NAME-service" -n "$NAMESPACE" \
        -o jsonpath='{.subsets[0].addresses[*].ip}')
    local api_endpoints=$(kubectl get endpoints "$API_NAME-service" -n "$NAMESPACE" \
        -o jsonpath='{.subsets[0].addresses[*].ip}')
    
    log "INFO" "App service endpoints: $app_endpoints"
    log "INFO" "API service endpoints: $api_endpoints"
}

# Function to cleanup old deployment
cleanup_old_deployment() {
    if [ "$DRY_RUN" = "true" ]; then
        log "INFO" "DRY RUN: Would cleanup old $CURRENT_COLOR deployment"
        return 0
    fi
    
    log "INFO" "Cleaning up old deployment..."
    
    # Wait before cleanup to ensure new deployment is stable
    sleep 60
    
    # Delete old deployments
    kubectl delete deployment "$APP_NAME-deployment-$CURRENT_COLOR" -n "$NAMESPACE" || true
    kubectl delete deployment "$API_NAME-deployment-$CURRENT_COLOR" -n "$NAMESPACE" || true
    
    log "INFO" "Old $CURRENT_COLOR deployment cleaned up"
}

# Function to rollback deployment
rollback_deployment() {
    log "INFO" "Rolling back to previous deployment..."
    
    # Restore previous deployments
    if [ -f "/tmp/${APP_NAME}-${CURRENT_COLOR}-backup.yaml" ]; then
        kubectl apply -f "/tmp/${APP_NAME}-${CURRENT_COLOR}-backup.yaml"
        log "INFO" "App deployment rolled back"
    fi
    
    if [ -f "/tmp/${API_NAME}-${CURRENT_COLOR}-backup.yaml" ]; then
        kubectl apply -f "/tmp/${API_NAME}-${CURRENT_COLOR}-backup.yaml"
        log "INFO" "API deployment rolled back"
    fi
    
    # Switch traffic back
    kubectl patch service "$APP_NAME-service" -n "$NAMESPACE" \
        -p '{"spec":{"selector":{"color":"'$CURRENT_COLOR'"}}}'
    kubectl patch service "$API_NAME-service" -n "$NAMESPACE" \
        -p '{"spec":{"selector":{"color":"'$CURRENT_COLOR'"}}}'
    
    # Delete failed deployment
    kubectl delete deployment "$APP_NAME-deployment-$NEW_COLOR" -n "$NAMESPACE" || true
    kubectl delete deployment "$API_NAME-deployment-$NEW_COLOR" -n "$NAMESPACE" || true
    
    log "INFO" "Rollback completed"
}

# Function to send deployment notification
send_notification() {
    local status=$1
    local message=$2
    
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"OpportuneX Deployment $status: $message\"}" \
            "$SLACK_WEBHOOK_URL" > /dev/null 2>&1 || true
    fi
    
    if [ -n "$DISCORD_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"content\":\"OpportuneX Deployment $status: $message\"}" \
            "$DISCORD_WEBHOOK_URL" > /dev/null 2>&1 || true
    fi
}

# Main deployment function
main() {
    local start_time=$(date +%s)
    
    # Parse command line arguments
    DRY_RUN=false
    SKIP_TESTS=false
    FORCE_DEPLOY=false
    ROLLBACK_ONLY=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --app-image)
                NEW_APP_IMAGE="$2"
                shift 2
                ;;
            --api-image)
                NEW_API_IMAGE="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --force)
                FORCE_DEPLOY=true
                shift
                ;;
            --rollback)
                ROLLBACK_ONLY=true
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                log "ERROR" "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    log "INFO" "Starting OpportuneX blue-green deployment..."
    
    # Check dependencies
    check_dependencies
    
    # Handle rollback-only request
    if [ "$ROLLBACK_ONLY" = "true" ]; then
        get_current_state
        rollback_deployment
        send_notification "ROLLBACK" "Deployment rolled back successfully"
        exit 0
    fi
    
    # Get current state and create manifests
    get_current_state
    create_deployment_manifests
    
    # Deploy new version
    local deployment_success=true
    
    if ! deploy_new_version; then
        deployment_success=false
    fi
    
    # Run health checks and smoke tests
    if [ "$deployment_success" = "true" ]; then
        if ! run_health_checks; then
            if [ "$FORCE_DEPLOY" != "true" ]; then
                deployment_success=false
            else
                log "WARN" "Health checks failed but continuing due to --force flag"
            fi
        fi
    fi
    
    if [ "$deployment_success" = "true" ]; then
        if ! run_smoke_tests; then
            if [ "$FORCE_DEPLOY" != "true" ]; then
                deployment_success=false
            else
                log "WARN" "Smoke tests failed but continuing due to --force flag"
            fi
        fi
    fi
    
    # Switch traffic or rollback
    if [ "$deployment_success" = "true" ]; then
        switch_traffic
        cleanup_old_deployment
        
        # Calculate deployment duration
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        log "INFO" "Blue-green deployment completed successfully in ${duration}s"
        log "INFO" "Active deployment color: $NEW_COLOR"
        send_notification "SUCCESS" "Deployment completed in ${duration}s (color: $NEW_COLOR)"
    else
        log "ERROR" "Deployment failed, rolling back..."
        rollback_deployment
        
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        log "ERROR" "Deployment failed and rolled back in ${duration}s"
        send_notification "FAILED" "Deployment failed and rolled back in ${duration}s"
        exit 1
    fi
    
    # Cleanup temporary files
    rm -rf "$MANIFEST_DIR" || true
    rm -f "/tmp/${APP_NAME}-${CURRENT_COLOR}-backup.yaml" || true
    rm -f "/tmp/${API_NAME}-${CURRENT_COLOR}-backup.yaml" || true
}

# Run main function
main "$@"