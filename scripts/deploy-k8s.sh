#!/bin/bash

# Kubernetes Deployment Script for OpportuneX
# This script deploys the entire OpportuneX application to Kubernetes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="opportunex"
KUBECTL_TIMEOUT="300s"

echo -e "${GREEN}Starting OpportuneX Kubernetes Deployment${NC}"

# Function to check if kubectl is available
check_kubectl() {
    if ! command -v kubectl &> /dev/null; then
        echo -e "${RED}kubectl is not installed or not in PATH${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ kubectl is available${NC}"
}

# Function to check cluster connectivity
check_cluster() {
    if ! kubectl cluster-info &> /dev/null; then
        echo -e "${RED}Cannot connect to Kubernetes cluster${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Connected to Kubernetes cluster${NC}"
}

# Function to create namespace
create_namespace() {
    echo -e "${YELLOW}Creating namespace...${NC}"
    kubectl apply -f k8s/namespace.yaml
    echo -e "${GREEN}✓ Namespace created${NC}"
}

# Function to apply secrets
apply_secrets() {
    echo -e "${YELLOW}Applying secrets...${NC}"
    kubectl apply -f k8s/secrets.yaml
    echo -e "${GREEN}✓ Secrets applied${NC}"
}

# Function to apply configmaps
apply_configmaps() {
    echo -e "${YELLOW}Applying configmaps...${NC}"
    kubectl apply -f k8s/configmap.yaml
    echo -e "${GREEN}✓ ConfigMaps applied${NC}"
}

# Function to deploy databases
deploy_databases() {
    echo -e "${YELLOW}Deploying databases...${NC}"
    
    # Deploy PostgreSQL
    kubectl apply -f k8s/postgres-deployment.yaml
    echo -e "${GREEN}✓ PostgreSQL deployment applied${NC}"
    
    # Deploy Redis
    kubectl apply -f k8s/redis-deployment.yaml
    echo -e "${GREEN}✓ Redis deployment applied${NC}"
    
    # Deploy Elasticsearch
    kubectl apply -f k8s/elasticsearch-deployment.yaml
    echo -e "${GREEN}✓ Elasticsearch deployment applied${NC}"
    
    # Wait for databases to be ready
    echo -e "${YELLOW}Waiting for databases to be ready...${NC}"
    kubectl wait --for=condition=ready pod -l app=postgres -n $NAMESPACE --timeout=$KUBECTL_TIMEOUT
    kubectl wait --for=condition=ready pod -l app=redis -n $NAMESPACE --timeout=$KUBECTL_TIMEOUT
    kubectl wait --for=condition=ready pod -l app=elasticsearch -n $NAMESPACE --timeout=$KUBECTL_TIMEOUT
    echo -e "${GREEN}✓ All databases are ready${NC}"
}

# Function to deploy applications
deploy_applications() {
    echo -e "${YELLOW}Deploying applications...${NC}"
    
    # Deploy API Gateway
    kubectl apply -f k8s/api-gateway-deployment.yaml
    echo -e "${GREEN}✓ API Gateway deployment applied${NC}"
    
    # Deploy Next.js App
    kubectl apply -f k8s/app-deployment.yaml
    echo -e "${GREEN}✓ Next.js App deployment applied${NC}"
    
    # Deploy Nginx Load Balancer
    kubectl apply -f k8s/nginx-deployment.yaml
    echo -e "${GREEN}✓ Nginx deployment applied${NC}"
    
    # Wait for applications to be ready
    echo -e "${YELLOW}Waiting for applications to be ready...${NC}"
    kubectl wait --for=condition=ready pod -l app=opportunex-api -n $NAMESPACE --timeout=$KUBECTL_TIMEOUT
    kubectl wait --for=condition=ready pod -l app=opportunex-app -n $NAMESPACE --timeout=$KUBECTL_TIMEOUT
    kubectl wait --for=condition=ready pod -l app=nginx -n $NAMESPACE --timeout=$KUBECTL_TIMEOUT
    echo -e "${GREEN}✓ All applications are ready${NC}"
}

# Function to deploy monitoring
deploy_monitoring() {
    echo -e "${YELLOW}Deploying monitoring stack...${NC}"
    kubectl apply -f k8s/monitoring-deployment.yaml
    echo -e "${GREEN}✓ Monitoring stack deployed${NC}"
}

# Function to check deployment status
check_deployment_status() {
    echo -e "${YELLOW}Checking deployment status...${NC}"
    
    echo -e "${YELLOW}Pods status:${NC}"
    kubectl get pods -n $NAMESPACE
    
    echo -e "${YELLOW}Services status:${NC}"
    kubectl get services -n $NAMESPACE
    
    echo -e "${YELLOW}Ingress status:${NC}"
    kubectl get ingress -n $NAMESPACE
}

# Function to run database migrations
run_migrations() {
    echo -e "${YELLOW}Running database migrations...${NC}"
    
    # Get the first app pod
    APP_POD=$(kubectl get pods -n $NAMESPACE -l app=opportunex-app -o jsonpath='{.items[0].metadata.name}')
    
    if [ -n "$APP_POD" ]; then
        kubectl exec -n $NAMESPACE $APP_POD -- npm run db:migrate
        kubectl exec -n $NAMESPACE $APP_POD -- npm run db:seed
        echo -e "${GREEN}✓ Database migrations completed${NC}"
    else
        echo -e "${RED}No app pods found for running migrations${NC}"
        exit 1
    fi
}

# Function to initialize Elasticsearch indices
init_elasticsearch() {
    echo -e "${YELLOW}Initializing Elasticsearch indices...${NC}"
    
    # Get the first app pod
    APP_POD=$(kubectl get pods -n $NAMESPACE -l app=opportunex-app -o jsonpath='{.items[0].metadata.name}')
    
    if [ -n "$APP_POD" ]; then
        kubectl exec -n $NAMESPACE $APP_POD -- npm run es:init
        echo -e "${GREEN}✓ Elasticsearch indices initialized${NC}"
    else
        echo -e "${RED}No app pods found for initializing Elasticsearch${NC}"
        exit 1
    fi
}

# Main deployment function
main() {
    echo -e "${GREEN}OpportuneX Kubernetes Deployment Script${NC}"
    echo -e "${GREEN}=====================================${NC}"
    
    # Pre-deployment checks
    check_kubectl
    check_cluster
    
    # Deploy infrastructure
    create_namespace
    apply_secrets
    apply_configmaps
    
    # Deploy services
    deploy_databases
    deploy_applications
    deploy_monitoring
    
    # Post-deployment setup
    run_migrations
    init_elasticsearch
    
    # Final status check
    check_deployment_status
    
    echo -e "${GREEN}=====================================${NC}"
    echo -e "${GREEN}OpportuneX deployment completed successfully!${NC}"
    echo -e "${GREEN}=====================================${NC}"
    
    # Display access information
    echo -e "${YELLOW}Access Information:${NC}"
    echo -e "Application: http://$(kubectl get service nginx-service -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}')"
    echo -e "Grafana: http://$(kubectl get service grafana-service -n $NAMESPACE -o jsonpath='{.spec.clusterIP}'):3000"
    echo -e "Prometheus: http://$(kubectl get service prometheus-service -n $NAMESPACE -o jsonpath='{.spec.clusterIP}'):9090"
}

# Run main function
main "$@"