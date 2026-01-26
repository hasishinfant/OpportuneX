#!/bin/bash

# Production Environment Setup Script for OpportuneX
# This script helps configure production environment variables securely

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENV_FILE=".env.production"
ENV_EXAMPLE=".env.production.example"
SECRETS_FILE="k8s/secrets.yaml"

echo -e "${GREEN}OpportuneX Production Environment Setup${NC}"
echo -e "${GREEN}=====================================${NC}"

# Function to generate secure random string
generate_secret() {
    local length=${1:-32}
    openssl rand -base64 $length | tr -d "=+/" | cut -c1-$length
}

# Function to encode base64 for Kubernetes secrets
encode_base64() {
    echo -n "$1" | base64 | tr -d '\n'
}

# Function to check if required tools are available
check_dependencies() {
    echo -e "${YELLOW}Checking dependencies...${NC}"
    
    if ! command -v openssl &> /dev/null; then
        echo -e "${RED}openssl is required but not installed${NC}"
        exit 1
    fi
    
    if ! command -v base64 &> /dev/null; then
        echo -e "${RED}base64 is required but not installed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ All dependencies are available${NC}"
}

# Function to create production environment file
create_env_file() {
    echo -e "${YELLOW}Creating production environment file...${NC}"
    
    if [ -f "$ENV_FILE" ]; then
        echo -e "${YELLOW}$ENV_FILE already exists. Creating backup...${NC}"
        cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    
    # Copy example file
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    
    # Generate secure secrets
    JWT_SECRET=$(generate_secret 64)
    SESSION_SECRET=$(generate_secret 32)
    CSRF_SECRET=$(generate_secret 32)
    NEXTAUTH_SECRET=$(generate_secret 32)
    DATABASE_PASSWORD=$(generate_secret 16)
    REDIS_PASSWORD=$(generate_secret 16)
    
    # Replace placeholders with generated secrets
    sed -i.bak "s/your-super-secure-jwt-secret-key-minimum-32-characters/$JWT_SECRET/g" "$ENV_FILE"
    sed -i.bak "s/your-session-secret-key/$SESSION_SECRET/g" "$ENV_FILE"
    sed -i.bak "s/your-csrf-secret-key/$CSRF_SECRET/g" "$ENV_FILE"
    sed -i.bak "s/your-nextauth-secret-key-here/$NEXTAUTH_SECRET/g" "$ENV_FILE"
    sed -i.bak "s/your-secure-database-password/$DATABASE_PASSWORD/g" "$ENV_FILE"
    sed -i.bak "s/your-secure-redis-password/$REDIS_PASSWORD/g" "$ENV_FILE"
    
    # Remove backup file
    rm "$ENV_FILE.bak"
    
    echo -e "${GREEN}✓ Production environment file created${NC}"
    echo -e "${YELLOW}Please edit $ENV_FILE and fill in the remaining API keys and configuration values${NC}"
}

# Function to update Kubernetes secrets
update_k8s_secrets() {
    echo -e "${YELLOW}Updating Kubernetes secrets...${NC}"
    
    if [ ! -f "$ENV_FILE" ]; then
        echo -e "${RED}$ENV_FILE not found. Please run the environment setup first.${NC}"
        exit 1
    fi
    
    # Source the environment file
    source "$ENV_FILE"
    
    # Create temporary secrets file
    cat > "$SECRETS_FILE.tmp" << EOF
apiVersion: v1
kind: Secret
metadata:
  name: opportunex-secrets
  namespace: opportunex
type: Opaque
data:
  DATABASE_PASSWORD: $(encode_base64 "$DATABASE_PASSWORD")
  JWT_SECRET: $(encode_base64 "$JWT_SECRET")
  OPENAI_API_KEY: $(encode_base64 "$OPENAI_API_KEY")
  SENDGRID_API_KEY: $(encode_base64 "$SENDGRID_API_KEY")
  TWILIO_ACCOUNT_SID: $(encode_base64 "$TWILIO_ACCOUNT_SID")
  TWILIO_AUTH_TOKEN: $(encode_base64 "$TWILIO_AUTH_TOKEN")
  REDIS_PASSWORD: $(encode_base64 "$REDIS_PASSWORD")
  NEXTAUTH_SECRET: $(encode_base64 "$NEXTAUTH_SECRET")
  SESSION_SECRET: $(encode_base64 "$SESSION_SECRET")
  CSRF_SECRET: $(encode_base64 "$CSRF_SECRET")
  SENTRY_DSN: $(encode_base64 "$SENTRY_DSN")
  AWS_ACCESS_KEY_ID: $(encode_base64 "$AWS_ACCESS_KEY_ID")
  AWS_SECRET_ACCESS_KEY: $(encode_base64 "$AWS_SECRET_ACCESS_KEY")
---
apiVersion: v1
kind: Secret
metadata:
  name: postgres-secret
  namespace: opportunex
type: Opaque
data:
  POSTGRES_PASSWORD: $(encode_base64 "$DATABASE_PASSWORD")
  POSTGRES_USER: $(encode_base64 "$DATABASE_USER")
  POSTGRES_DB: $(encode_base64 "$DATABASE_NAME")
EOF
    
    # Replace the original secrets file
    mv "$SECRETS_FILE.tmp" "$SECRETS_FILE"
    
    echo -e "${GREEN}✓ Kubernetes secrets updated${NC}"
}

# Function to validate environment configuration
validate_config() {
    echo -e "${YELLOW}Validating configuration...${NC}"
    
    if [ ! -f "$ENV_FILE" ]; then
        echo -e "${RED}$ENV_FILE not found${NC}"
        return 1
    fi
    
    # Source the environment file
    source "$ENV_FILE"
    
    # Check required variables
    local required_vars=(
        "DATABASE_PASSWORD"
        "JWT_SECRET"
        "REDIS_PASSWORD"
        "NEXTAUTH_SECRET"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ] || [[ "${!var}" == *"your-"* ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        echo -e "${RED}The following required variables are missing or not configured:${NC}"
        for var in "${missing_vars[@]}"; do
            echo -e "${RED}  - $var${NC}"
        done
        return 1
    fi
    
    echo -e "${GREEN}✓ Configuration validation passed${NC}"
    return 0
}

# Function to display security checklist
display_security_checklist() {
    echo -e "${BLUE}Security Checklist:${NC}"
    echo -e "${YELLOW}□ Change all default passwords and secrets${NC}"
    echo -e "${YELLOW}□ Configure SSL/TLS certificates${NC}"
    echo -e "${YELLOW}□ Set up proper firewall rules${NC}"
    echo -e "${YELLOW}□ Enable database encryption at rest${NC}"
    echo -e "${YELLOW}□ Configure backup encryption${NC}"
    echo -e "${YELLOW}□ Set up monitoring and alerting${NC}"
    echo -e "${YELLOW}□ Review and test disaster recovery procedures${NC}"
    echo -e "${YELLOW}□ Implement proper access controls${NC}"
    echo -e "${YELLOW}□ Enable audit logging${NC}"
    echo -e "${YELLOW}□ Configure rate limiting${NC}"
}

# Function to display next steps
display_next_steps() {
    echo -e "${BLUE}Next Steps:${NC}"
    echo -e "${YELLOW}1. Review and update $ENV_FILE with your actual API keys${NC}"
    echo -e "${YELLOW}2. Run 'bash scripts/setup-production-env.sh update-secrets' to update Kubernetes secrets${NC}"
    echo -e "${YELLOW}3. Deploy to Kubernetes using 'bash scripts/deploy-k8s.sh'${NC}"
    echo -e "${YELLOW}4. Set up SSL certificates and domain configuration${NC}"
    echo -e "${YELLOW}5. Configure monitoring and alerting${NC}"
    echo -e "${YELLOW}6. Test the deployment thoroughly${NC}"
}

# Main function
main() {
    case "${1:-setup}" in
        "setup")
            check_dependencies
            create_env_file
            display_security_checklist
            display_next_steps
            ;;
        "update-secrets")
            check_dependencies
            update_k8s_secrets
            echo -e "${GREEN}Kubernetes secrets updated successfully${NC}"
            ;;
        "validate")
            if validate_config; then
                echo -e "${GREEN}Configuration is valid${NC}"
            else
                echo -e "${RED}Configuration validation failed${NC}"
                exit 1
            fi
            ;;
        "help")
            echo -e "${BLUE}Usage: $0 [command]${NC}"
            echo -e "${YELLOW}Commands:${NC}"
            echo -e "  setup         Create production environment file (default)"
            echo -e "  update-secrets Update Kubernetes secrets from environment file"
            echo -e "  validate      Validate environment configuration"
            echo -e "  help          Show this help message"
            ;;
        *)
            echo -e "${RED}Unknown command: $1${NC}"
            echo -e "Run '$0 help' for usage information"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"