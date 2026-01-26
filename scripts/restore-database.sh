#!/bin/bash

# Database Restore Script for OpportuneX
# Supports restoration from encrypted backups with verification

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="/var/backups/opportunex"
ENCRYPTION_KEY_FILE="/etc/opportunex/backup.key"
TEMP_DIR="/tmp/opportunex_restore"

# Database Configuration
DB_HOST="${DATABASE_HOST:-postgres-service}"
DB_PORT="${DATABASE_PORT:-5432}"
DB_NAME="${DATABASE_NAME:-opportunex}"
DB_USER="${DATABASE_USER:-postgres}"

# Elasticsearch Configuration
ES_HOST="${ELASTICSEARCH_HOST:-elasticsearch-service}"
ES_PORT="${ELASTICSEARCH_PORT:-9200}"

# Redis Configuration
REDIS_HOST="${REDIS_HOST:-redis-service}"
REDIS_PORT="${REDIS_PORT:-6379}"

# Logging
LOG_FILE="/var/log/opportunex/restore.log"

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
    echo -e "${BLUE}Usage: $0 [OPTIONS] BACKUP_TIMESTAMP${NC}"
    echo -e "${YELLOW}Options:${NC}"
    echo -e "  -p, --postgres-only    Restore only PostgreSQL database"
    echo -e "  -e, --elasticsearch-only Restore only Elasticsearch indices"
    echo -e "  -r, --redis-only       Restore only Redis data"
    echo -e "  -s, --from-s3          Download backup from S3 first"
    echo -e "  -f, --force            Skip confirmation prompts"
    echo -e "  -h, --help             Show this help message"
    echo -e ""
    echo -e "${YELLOW}Examples:${NC}"
    echo -e "  $0 20231201_143000                    # Restore all services"
    echo -e "  $0 -p 20231201_143000                 # Restore only PostgreSQL"
    echo -e "  $0 -s -f 20231201_143000              # Download from S3 and restore without prompts"
}

# Function to check dependencies
check_dependencies() {
    log "INFO" "Checking restore dependencies..."
    
    local missing_deps=()
    
    if ! command -v psql &> /dev/null; then
        missing_deps+=("postgresql-client")
    fi
    
    if ! command -v curl &> /dev/null; then
        missing_deps+=("curl")
    fi
    
    if ! command -v gpg &> /dev/null; then
        missing_deps+=("gnupg")
    fi
    
    if [ "$FROM_S3" = "true" ] && ! command -v aws &> /dev/null; then
        missing_deps+=("awscli")
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log "ERROR" "Missing dependencies: ${missing_deps[*]}"
        exit 1
    fi
    
    log "INFO" "All dependencies are available"
}

# Function to validate backup timestamp
validate_timestamp() {
    local timestamp=$1
    
    if [[ ! "$timestamp" =~ ^[0-9]{8}_[0-9]{6}$ ]]; then
        log "ERROR" "Invalid timestamp format. Expected: YYYYMMDD_HHMMSS"
        exit 1
    fi
    
    BACKUP_TIMESTAMP="$timestamp"
    BACKUP_PATH="$BACKUP_DIR/$timestamp"
    
    log "INFO" "Using backup timestamp: $timestamp"
}

# Function to download backup from S3
download_from_s3() {
    if [ "$FROM_S3" != "true" ]; then
        return 0
    fi
    
    log "INFO" "Downloading backup from S3..."
    
    local s3_prefix="opportunex-backups/$BACKUP_TIMESTAMP"
    
    # Create local backup directory
    mkdir -p "$BACKUP_PATH"
    
    # Download all backup files
    if aws s3 sync "s3://$AWS_S3_BUCKET/$s3_prefix/" "$BACKUP_PATH/" \
        --region "$AWS_REGION"; then
        log "INFO" "Backup downloaded from S3 successfully"
    else
        log "ERROR" "Failed to download backup from S3"
        exit 1
    fi
}

# Function to verify backup integrity
verify_backup() {
    log "INFO" "Verifying backup integrity..."
    
    if [ ! -d "$BACKUP_PATH" ]; then
        log "ERROR" "Backup directory not found: $BACKUP_PATH"
        exit 1
    fi
    
    # Check manifest file
    local manifest_file="$BACKUP_PATH/backup_manifest.json"
    if [ ! -f "$manifest_file" ]; then
        log "WARN" "Backup manifest not found, proceeding without verification"
        return 0
    fi
    
    # Verify backup files exist
    local postgres_file=$(jq -r '.files.postgres' "$manifest_file" 2>/dev/null || echo "null")
    local elasticsearch_file=$(jq -r '.files.elasticsearch' "$manifest_file" 2>/dev/null || echo "null")
    local redis_file=$(jq -r '.files.redis' "$manifest_file" 2>/dev/null || echo "null")
    
    if [ "$RESTORE_POSTGRES" = "true" ] && [ "$postgres_file" != "null" ]; then
        if [ ! -f "$BACKUP_PATH/$postgres_file" ]; then
            log "ERROR" "PostgreSQL backup file not found: $postgres_file"
            exit 1
        fi
    fi
    
    if [ "$RESTORE_ELASTICSEARCH" = "true" ] && [ "$elasticsearch_file" != "null" ]; then
        if [ ! -f "$BACKUP_PATH/$elasticsearch_file" ]; then
            log "ERROR" "Elasticsearch backup file not found: $elasticsearch_file"
            exit 1
        fi
    fi
    
    if [ "$RESTORE_REDIS" = "true" ] && [ "$redis_file" != "null" ]; then
        if [ ! -f "$BACKUP_PATH/$redis_file" ]; then
            log "ERROR" "Redis backup file not found: $redis_file"
            exit 1
        fi
    fi
    
    log "INFO" "Backup integrity verification passed"
}

# Function to decrypt and decompress file
decrypt_decompress() {
    local encrypted_file=$1
    local output_file=$2
    
    # Create temporary directory
    mkdir -p "$TEMP_DIR"
    
    local temp_compressed="$TEMP_DIR/$(basename "$encrypted_file" .gpg)"
    local temp_decompressed="$TEMP_DIR/$(basename "$temp_compressed" .gz)"
    
    # Decrypt if file is encrypted
    if [[ "$encrypted_file" == *.gpg ]]; then
        if [ ! -f "$ENCRYPTION_KEY_FILE" ]; then
            log "ERROR" "Encryption key file not found: $ENCRYPTION_KEY_FILE"
            return 1
        fi
        
        if gpg --batch --yes --decrypt --passphrase-file "$ENCRYPTION_KEY_FILE" \
            --output "$temp_compressed" "$encrypted_file"; then
            log "INFO" "File decrypted successfully"
        else
            log "ERROR" "Failed to decrypt file: $encrypted_file"
            return 1
        fi
    else
        cp "$encrypted_file" "$temp_compressed"
    fi
    
    # Decompress if file is compressed
    if [[ "$temp_compressed" == *.gz ]]; then
        if gunzip -c "$temp_compressed" > "$temp_decompressed"; then
            log "INFO" "File decompressed successfully"
            echo "$temp_decompressed"
        else
            log "ERROR" "Failed to decompress file: $temp_compressed"
            return 1
        fi
    else
        echo "$temp_compressed"
    fi
}

# Function to restore PostgreSQL database
restore_postgres() {
    if [ "$RESTORE_POSTGRES" != "true" ]; then
        return 0
    fi
    
    log "INFO" "Starting PostgreSQL restore..."
    
    # Find PostgreSQL backup file
    local postgres_backup=$(find "$BACKUP_PATH" -name "postgres_*.sql*" | head -1)
    
    if [ -z "$postgres_backup" ]; then
        log "ERROR" "PostgreSQL backup file not found"
        return 1
    fi
    
    log "INFO" "Found PostgreSQL backup: $(basename "$postgres_backup")"
    
    # Decrypt and decompress
    local sql_file=$(decrypt_decompress "$postgres_backup" "postgres_restore.sql")
    
    if [ -z "$sql_file" ]; then
        log "ERROR" "Failed to prepare PostgreSQL backup file"
        return 1
    fi
    
    # Set password for psql
    export PGPASSWORD="$DATABASE_PASSWORD"
    
    # Confirm database restoration
    if [ "$FORCE_RESTORE" != "true" ]; then
        echo -e "${YELLOW}WARNING: This will completely replace the current database!${NC}"
        echo -e "${YELLOW}Database: $DB_NAME on $DB_HOST:$DB_PORT${NC}"
        read -p "Are you sure you want to continue? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            log "INFO" "PostgreSQL restore cancelled by user"
            return 0
        fi
    fi
    
    # Restore database
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
        -f "$sql_file" > "$TEMP_DIR/postgres_restore.log" 2>&1; then
        log "INFO" "PostgreSQL restore completed successfully"
    else
        log "ERROR" "PostgreSQL restore failed. Check log: $TEMP_DIR/postgres_restore.log"
        return 1
    fi
    
    unset PGPASSWORD
    
    # Clean up temporary file
    rm -f "$sql_file"
}

# Function to restore Elasticsearch indices
restore_elasticsearch() {
    if [ "$RESTORE_ELASTICSEARCH" != "true" ]; then
        return 0
    fi
    
    log "INFO" "Starting Elasticsearch restore..."
    
    # Find Elasticsearch backup file
    local es_backup=$(find "$BACKUP_PATH" -name "elasticsearch_*.json*" | head -1)
    
    if [ -z "$es_backup" ]; then
        log "ERROR" "Elasticsearch backup file not found"
        return 1
    fi
    
    log "INFO" "Found Elasticsearch backup: $(basename "$es_backup")"
    
    # Decrypt and decompress
    local json_file=$(decrypt_decompress "$es_backup" "elasticsearch_restore.json")
    
    if [ -z "$json_file" ]; then
        log "ERROR" "Failed to prepare Elasticsearch backup file"
        return 1
    fi
    
    # Confirm Elasticsearch restoration
    if [ "$FORCE_RESTORE" != "true" ]; then
        echo -e "${YELLOW}WARNING: This will replace existing Elasticsearch indices!${NC}"
        echo -e "${YELLOW}Elasticsearch: $ES_HOST:$ES_PORT${NC}"
        read -p "Are you sure you want to continue? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            log "INFO" "Elasticsearch restore cancelled by user"
            return 0
        fi
    fi
    
    # Delete existing indices with the prefix
    local existing_indices=$(curl -s "http://$ES_HOST:$ES_PORT/_cat/indices/${ES_INDEX_PREFIX}*?h=index" | tr '\n' ' ')
    
    if [ -n "$existing_indices" ]; then
        log "INFO" "Deleting existing indices: $existing_indices"
        for index in $existing_indices; do
            curl -X DELETE "http://$ES_HOST:$ES_PORT/$index" > /dev/null 2>&1 || true
        done
    fi
    
    # Restore from snapshot
    local snapshot_name="restore_$(date +%Y%m%d_%H%M%S)"
    
    # Create restore repository
    curl -X PUT "http://$ES_HOST:$ES_PORT/_snapshot/restore_repo" \
        -H 'Content-Type: application/json' \
        -d "{\"type\": \"fs\", \"settings\": {\"location\": \"$TEMP_DIR/es_restore\"}}" \
        > /dev/null 2>&1
    
    # Copy snapshot data
    mkdir -p "$TEMP_DIR/es_restore"
    cp -r "$BACKUP_PATH/es_snapshots/"* "$TEMP_DIR/es_restore/" 2>/dev/null || true
    
    # Restore snapshot
    if curl -X POST "http://$ES_HOST:$ES_PORT/_snapshot/restore_repo/$snapshot_name/_restore?wait_for_completion=true" \
        -H 'Content-Type: application/json' \
        -d '{"ignore_unavailable": true, "include_global_state": false}' \
        > "$TEMP_DIR/elasticsearch_restore.log" 2>&1; then
        log "INFO" "Elasticsearch restore completed successfully"
    else
        log "ERROR" "Elasticsearch restore failed. Check log: $TEMP_DIR/elasticsearch_restore.log"
        return 1
    fi
    
    # Clean up temporary files
    rm -f "$json_file"
    rm -rf "$TEMP_DIR/es_restore"
}

# Function to restore Redis data
restore_redis() {
    if [ "$RESTORE_REDIS" != "true" ]; then
        return 0
    fi
    
    log "INFO" "Starting Redis restore..."
    
    # Find Redis backup file
    local redis_backup=$(find "$BACKUP_PATH" -name "redis_*.rdb*" | head -1)
    
    if [ -z "$redis_backup" ]; then
        log "ERROR" "Redis backup file not found"
        return 1
    fi
    
    log "INFO" "Found Redis backup: $(basename "$redis_backup")"
    
    # Decrypt and decompress
    local rdb_file=$(decrypt_decompress "$redis_backup" "redis_restore.rdb")
    
    if [ -z "$rdb_file" ]; then
        log "ERROR" "Failed to prepare Redis backup file"
        return 1
    fi
    
    # Confirm Redis restoration
    if [ "$FORCE_RESTORE" != "true" ]; then
        echo -e "${YELLOW}WARNING: This will replace all Redis data!${NC}"
        echo -e "${YELLOW}Redis: $REDIS_HOST:$REDIS_PORT${NC}"
        read -p "Are you sure you want to continue? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            log "INFO" "Redis restore cancelled by user"
            return 0
        fi
    fi
    
    # Stop Redis writes and flush current data
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" FLUSHALL > /dev/null 2>&1 || true
    
    # Copy RDB file to Redis data directory
    if kubectl cp "$rdb_file" "redis-pod:/data/dump.rdb" 2>/dev/null; then
        log "INFO" "Redis RDB file copied successfully"
        
        # Restart Redis to load the new data
        kubectl rollout restart deployment/redis-deployment -n opportunex
        kubectl rollout status deployment/redis-deployment -n opportunex --timeout=300s
        
        log "INFO" "Redis restore completed successfully"
    else
        log "ERROR" "Failed to copy Redis RDB file"
        return 1
    fi
    
    # Clean up temporary file
    rm -f "$rdb_file"
}

# Function to verify restore
verify_restore() {
    log "INFO" "Verifying restore..."
    
    local verification_failed=false
    
    # Verify PostgreSQL
    if [ "$RESTORE_POSTGRES" = "true" ]; then
        export PGPASSWORD="$DATABASE_PASSWORD"
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
            -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" > /dev/null 2>&1; then
            log "INFO" "PostgreSQL verification passed"
        else
            log "ERROR" "PostgreSQL verification failed"
            verification_failed=true
        fi
        unset PGPASSWORD
    fi
    
    # Verify Elasticsearch
    if [ "$RESTORE_ELASTICSEARCH" = "true" ]; then
        if curl -s "http://$ES_HOST:$ES_PORT/_cluster/health" | grep -q '"status":"green\|yellow"'; then
            log "INFO" "Elasticsearch verification passed"
        else
            log "ERROR" "Elasticsearch verification failed"
            verification_failed=true
        fi
    fi
    
    # Verify Redis
    if [ "$RESTORE_REDIS" = "true" ]; then
        if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" ping | grep -q "PONG"; then
            log "INFO" "Redis verification passed"
        else
            log "ERROR" "Redis verification failed"
            verification_failed=true
        fi
    fi
    
    if [ "$verification_failed" = "true" ]; then
        log "ERROR" "Restore verification failed"
        return 1
    else
        log "INFO" "All restore verifications passed"
        return 0
    fi
}

# Function to cleanup temporary files
cleanup() {
    if [ -d "$TEMP_DIR" ]; then
        rm -rf "$TEMP_DIR"
        log "INFO" "Temporary files cleaned up"
    fi
}

# Function to send restore notification
send_notification() {
    local status=$1
    local message=$2
    
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"OpportuneX Restore $status: $message\"}" \
            "$SLACK_WEBHOOK_URL" > /dev/null 2>&1 || true
    fi
    
    if [ -n "$DISCORD_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"content\":\"OpportuneX Restore $status: $message\"}" \
            "$DISCORD_WEBHOOK_URL" > /dev/null 2>&1 || true
    fi
}

# Main restore function
main() {
    local start_time=$(date +%s)
    
    # Parse command line arguments
    RESTORE_POSTGRES=true
    RESTORE_ELASTICSEARCH=true
    RESTORE_REDIS=true
    FROM_S3=false
    FORCE_RESTORE=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -p|--postgres-only)
                RESTORE_POSTGRES=true
                RESTORE_ELASTICSEARCH=false
                RESTORE_REDIS=false
                shift
                ;;
            -e|--elasticsearch-only)
                RESTORE_POSTGRES=false
                RESTORE_ELASTICSEARCH=true
                RESTORE_REDIS=false
                shift
                ;;
            -r|--redis-only)
                RESTORE_POSTGRES=false
                RESTORE_ELASTICSEARCH=false
                RESTORE_REDIS=true
                shift
                ;;
            -s|--from-s3)
                FROM_S3=true
                shift
                ;;
            -f|--force)
                FORCE_RESTORE=true
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            -*)
                log "ERROR" "Unknown option: $1"
                show_usage
                exit 1
                ;;
            *)
                if [ -z "$BACKUP_TIMESTAMP" ]; then
                    validate_timestamp "$1"
                else
                    log "ERROR" "Multiple timestamps provided"
                    show_usage
                    exit 1
                fi
                shift
                ;;
        esac
    done
    
    if [ -z "$BACKUP_TIMESTAMP" ]; then
        log "ERROR" "Backup timestamp is required"
        show_usage
        exit 1
    fi
    
    log "INFO" "Starting OpportuneX restore process..."
    log "INFO" "Restore options: PostgreSQL=$RESTORE_POSTGRES, Elasticsearch=$RESTORE_ELASTICSEARCH, Redis=$RESTORE_REDIS"
    
    # Set up cleanup trap
    trap cleanup EXIT
    
    # Check dependencies and download backup if needed
    check_dependencies
    download_from_s3
    verify_backup
    
    # Perform restore operations
    local restore_success=true
    
    if ! restore_postgres; then
        restore_success=false
    fi
    
    if ! restore_elasticsearch; then
        restore_success=false
    fi
    
    if ! restore_redis; then
        restore_success=false
    fi
    
    # Verify restore
    if ! verify_restore; then
        restore_success=false
    fi
    
    # Calculate restore duration
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    if [ "$restore_success" = true ]; then
        log "INFO" "Restore completed successfully in ${duration}s"
        send_notification "SUCCESS" "Restore completed in ${duration}s"
    else
        log "ERROR" "Restore completed with errors in ${duration}s"
        send_notification "FAILED" "Restore completed with errors in ${duration}s"
        exit 1
    fi
}

# Run main function
main "$@"