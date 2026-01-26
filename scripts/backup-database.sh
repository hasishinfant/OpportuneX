#!/bin/bash

# Database Backup Script for OpportuneX
# Supports both PostgreSQL and Elasticsearch backups with encryption and cloud storage

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="/var/backups/opportunex"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30
ENCRYPTION_KEY_FILE="/etc/opportunex/backup.key"

# Database Configuration
DB_HOST="${DATABASE_HOST:-postgres-service}"
DB_PORT="${DATABASE_PORT:-5432}"
DB_NAME="${DATABASE_NAME:-opportunex}"
DB_USER="${DATABASE_USER:-postgres}"

# Elasticsearch Configuration
ES_HOST="${ELASTICSEARCH_HOST:-elasticsearch-service}"
ES_PORT="${ELASTICSEARCH_PORT:-9200}"
ES_INDEX_PREFIX="${ELASTICSEARCH_INDEX_PREFIX:-opportunex_prod}"

# AWS S3 Configuration for remote backup
AWS_S3_BUCKET="${BACKUP_S3_BUCKET:-opportunex-backups}"
AWS_REGION="${AWS_REGION:-us-east-1}"

# Logging
LOG_FILE="/var/log/opportunex/backup.log"

# Function to log messages
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Function to check dependencies
check_dependencies() {
    log "INFO" "Checking backup dependencies..."
    
    local missing_deps=()
    
    # Check required tools
    if ! command -v pg_dump &> /dev/null; then
        missing_deps+=("postgresql-client")
    fi
    
    if ! command -v curl &> /dev/null; then
        missing_deps+=("curl")
    fi
    
    if ! command -v gpg &> /dev/null; then
        missing_deps+=("gnupg")
    fi
    
    if ! command -v aws &> /dev/null && [ "$BACKUP_TO_S3" = "true" ]; then
        missing_deps+=("awscli")
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log "ERROR" "Missing dependencies: ${missing_deps[*]}"
        exit 1
    fi
    
    log "INFO" "All dependencies are available"
}

# Function to create backup directory
create_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
        log "INFO" "Created backup directory: $BACKUP_DIR"
    fi
    
    # Create timestamped backup directory
    CURRENT_BACKUP_DIR="$BACKUP_DIR/$TIMESTAMP"
    mkdir -p "$CURRENT_BACKUP_DIR"
    log "INFO" "Created backup directory: $CURRENT_BACKUP_DIR"
}

# Function to backup PostgreSQL database
backup_postgres() {
    log "INFO" "Starting PostgreSQL backup..."
    
    local backup_file="$CURRENT_BACKUP_DIR/postgres_${DB_NAME}_${TIMESTAMP}.sql"
    local compressed_file="${backup_file}.gz"
    local encrypted_file="${compressed_file}.gpg"
    
    # Set password for pg_dump
    export PGPASSWORD="$DATABASE_PASSWORD"
    
    # Create database dump
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --verbose --clean --if-exists --create > "$backup_file"; then
        log "INFO" "PostgreSQL dump created successfully"
    else
        log "ERROR" "Failed to create PostgreSQL dump"
        return 1
    fi
    
    # Compress the backup
    if gzip "$backup_file"; then
        log "INFO" "PostgreSQL backup compressed"
    else
        log "ERROR" "Failed to compress PostgreSQL backup"
        return 1
    fi
    
    # Encrypt the backup if encryption key exists
    if [ -f "$ENCRYPTION_KEY_FILE" ]; then
        if gpg --batch --yes --cipher-algo AES256 --compress-algo 1 \
            --symmetric --passphrase-file "$ENCRYPTION_KEY_FILE" \
            --output "$encrypted_file" "$compressed_file"; then
            log "INFO" "PostgreSQL backup encrypted"
            rm "$compressed_file"  # Remove unencrypted file
            POSTGRES_BACKUP_FILE="$encrypted_file"
        else
            log "ERROR" "Failed to encrypt PostgreSQL backup"
            return 1
        fi
    else
        log "WARN" "No encryption key found, backup stored unencrypted"
        POSTGRES_BACKUP_FILE="$compressed_file"
    fi
    
    # Calculate and log backup size
    local backup_size=$(du -h "$POSTGRES_BACKUP_FILE" | cut -f1)
    log "INFO" "PostgreSQL backup completed: $POSTGRES_BACKUP_FILE ($backup_size)"
    
    unset PGPASSWORD
}

# Function to backup Elasticsearch indices
backup_elasticsearch() {
    log "INFO" "Starting Elasticsearch backup..."
    
    local backup_file="$CURRENT_BACKUP_DIR/elasticsearch_${TIMESTAMP}.json"
    local compressed_file="${backup_file}.gz"
    local encrypted_file="${compressed_file}.gpg"
    
    # Get all indices with the prefix
    local indices=$(curl -s "http://$ES_HOST:$ES_PORT/_cat/indices/${ES_INDEX_PREFIX}*?h=index" | tr '\n' ',' | sed 's/,$//')
    
    if [ -z "$indices" ]; then
        log "WARN" "No Elasticsearch indices found with prefix: $ES_INDEX_PREFIX"
        return 0
    fi
    
    log "INFO" "Backing up Elasticsearch indices: $indices"
    
    # Create snapshot repository if it doesn't exist
    curl -X PUT "http://$ES_HOST:$ES_PORT/_snapshot/backup_repo" \
        -H 'Content-Type: application/json' \
        -d "{\"type\": \"fs\", \"settings\": {\"location\": \"$CURRENT_BACKUP_DIR/es_snapshots\"}}" \
        > /dev/null 2>&1
    
    # Create snapshot
    local snapshot_name="snapshot_$TIMESTAMP"
    if curl -X PUT "http://$ES_HOST:$ES_PORT/_snapshot/backup_repo/$snapshot_name?wait_for_completion=true" \
        -H 'Content-Type: application/json' \
        -d "{\"indices\": \"$indices\", \"ignore_unavailable\": true, \"include_global_state\": false}" \
        -o "$backup_file"; then
        log "INFO" "Elasticsearch snapshot created successfully"
    else
        log "ERROR" "Failed to create Elasticsearch snapshot"
        return 1
    fi
    
    # Compress the backup
    if gzip "$backup_file"; then
        log "INFO" "Elasticsearch backup compressed"
    else
        log "ERROR" "Failed to compress Elasticsearch backup"
        return 1
    fi
    
    # Encrypt the backup if encryption key exists
    if [ -f "$ENCRYPTION_KEY_FILE" ]; then
        if gpg --batch --yes --cipher-algo AES256 --compress-algo 1 \
            --symmetric --passphrase-file "$ENCRYPTION_KEY_FILE" \
            --output "$encrypted_file" "$compressed_file"; then
            log "INFO" "Elasticsearch backup encrypted"
            rm "$compressed_file"  # Remove unencrypted file
            ELASTICSEARCH_BACKUP_FILE="$encrypted_file"
        else
            log "ERROR" "Failed to encrypt Elasticsearch backup"
            return 1
        fi
    else
        log "WARN" "No encryption key found, backup stored unencrypted"
        ELASTICSEARCH_BACKUP_FILE="$compressed_file"
    fi
    
    # Calculate and log backup size
    local backup_size=$(du -h "$ELASTICSEARCH_BACKUP_FILE" | cut -f1)
    log "INFO" "Elasticsearch backup completed: $ELASTICSEARCH_BACKUP_FILE ($backup_size)"
}

# Function to backup Redis data
backup_redis() {
    log "INFO" "Starting Redis backup..."
    
    local backup_file="$CURRENT_BACKUP_DIR/redis_${TIMESTAMP}.rdb"
    local compressed_file="${backup_file}.gz"
    local encrypted_file="${compressed_file}.gpg"
    
    # Create Redis backup using BGSAVE
    if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" BGSAVE; then
        log "INFO" "Redis BGSAVE initiated"
        
        # Wait for backup to complete
        while [ "$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" LASTSAVE)" = "$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" LASTSAVE)" ]; do
            sleep 1
        done
        
        # Copy the RDB file
        if kubectl cp "redis-pod:/data/dump.rdb" "$backup_file" 2>/dev/null; then
            log "INFO" "Redis RDB file copied successfully"
        else
            log "ERROR" "Failed to copy Redis RDB file"
            return 1
        fi
    else
        log "ERROR" "Failed to initiate Redis backup"
        return 1
    fi
    
    # Compress the backup
    if gzip "$backup_file"; then
        log "INFO" "Redis backup compressed"
    else
        log "ERROR" "Failed to compress Redis backup"
        return 1
    fi
    
    # Encrypt the backup if encryption key exists
    if [ -f "$ENCRYPTION_KEY_FILE" ]; then
        if gpg --batch --yes --cipher-algo AES256 --compress-algo 1 \
            --symmetric --passphrase-file "$ENCRYPTION_KEY_FILE" \
            --output "$encrypted_file" "$compressed_file"; then
            log "INFO" "Redis backup encrypted"
            rm "$compressed_file"  # Remove unencrypted file
            REDIS_BACKUP_FILE="$encrypted_file"
        else
            log "ERROR" "Failed to encrypt Redis backup"
            return 1
        fi
    else
        log "WARN" "No encryption key found, backup stored unencrypted"
        REDIS_BACKUP_FILE="$compressed_file"
    fi
    
    # Calculate and log backup size
    local backup_size=$(du -h "$REDIS_BACKUP_FILE" | cut -f1)
    log "INFO" "Redis backup completed: $REDIS_BACKUP_FILE ($backup_size)"
}

# Function to upload backups to S3
upload_to_s3() {
    if [ "$BACKUP_TO_S3" != "true" ]; then
        log "INFO" "S3 upload disabled, skipping..."
        return 0
    fi
    
    log "INFO" "Uploading backups to S3..."
    
    local s3_prefix="opportunex-backups/$TIMESTAMP"
    
    # Upload PostgreSQL backup
    if [ -n "$POSTGRES_BACKUP_FILE" ] && [ -f "$POSTGRES_BACKUP_FILE" ]; then
        if aws s3 cp "$POSTGRES_BACKUP_FILE" "s3://$AWS_S3_BUCKET/$s3_prefix/$(basename "$POSTGRES_BACKUP_FILE")" \
            --region "$AWS_REGION" --storage-class STANDARD_IA; then
            log "INFO" "PostgreSQL backup uploaded to S3"
        else
            log "ERROR" "Failed to upload PostgreSQL backup to S3"
        fi
    fi
    
    # Upload Elasticsearch backup
    if [ -n "$ELASTICSEARCH_BACKUP_FILE" ] && [ -f "$ELASTICSEARCH_BACKUP_FILE" ]; then
        if aws s3 cp "$ELASTICSEARCH_BACKUP_FILE" "s3://$AWS_S3_BUCKET/$s3_prefix/$(basename "$ELASTICSEARCH_BACKUP_FILE")" \
            --region "$AWS_REGION" --storage-class STANDARD_IA; then
            log "INFO" "Elasticsearch backup uploaded to S3"
        else
            log "ERROR" "Failed to upload Elasticsearch backup to S3"
        fi
    fi
    
    # Upload Redis backup
    if [ -n "$REDIS_BACKUP_FILE" ] && [ -f "$REDIS_BACKUP_FILE" ]; then
        if aws s3 cp "$REDIS_BACKUP_FILE" "s3://$AWS_S3_BUCKET/$s3_prefix/$(basename "$REDIS_BACKUP_FILE")" \
            --region "$AWS_REGION" --storage-class STANDARD_IA; then
            log "INFO" "Redis backup uploaded to S3"
        else
            log "ERROR" "Failed to upload Redis backup to S3"
        fi
    fi
}

# Function to clean up old backups
cleanup_old_backups() {
    log "INFO" "Cleaning up backups older than $RETENTION_DAYS days..."
    
    # Clean up local backups
    find "$BACKUP_DIR" -type d -name "20*" -mtime +$RETENTION_DAYS -exec rm -rf {} \; 2>/dev/null || true
    
    # Clean up S3 backups if enabled
    if [ "$BACKUP_TO_S3" = "true" ]; then
        local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y%m%d)
        aws s3 ls "s3://$AWS_S3_BUCKET/opportunex-backups/" --region "$AWS_REGION" | \
        awk '{print $2}' | grep -E '^[0-9]{8}_[0-9]{6}/$' | \
        while read backup_dir; do
            local backup_date=$(echo "$backup_dir" | cut -d'_' -f1)
            if [ "$backup_date" -lt "$cutoff_date" ]; then
                aws s3 rm "s3://$AWS_S3_BUCKET/opportunex-backups/$backup_dir" --recursive --region "$AWS_REGION"
                log "INFO" "Removed old S3 backup: $backup_dir"
            fi
        done
    fi
    
    log "INFO" "Cleanup completed"
}

# Function to create backup manifest
create_manifest() {
    local manifest_file="$CURRENT_BACKUP_DIR/backup_manifest.json"
    
    cat > "$manifest_file" << EOF
{
  "backup_timestamp": "$TIMESTAMP",
  "backup_date": "$(date -Iseconds)",
  "database_host": "$DB_HOST",
  "database_name": "$DB_NAME",
  "elasticsearch_host": "$ES_HOST",
  "elasticsearch_indices": "$ES_INDEX_PREFIX*",
  "redis_host": "$REDIS_HOST",
  "files": {
    "postgres": "$(basename "$POSTGRES_BACKUP_FILE" 2>/dev/null || echo "null")",
    "elasticsearch": "$(basename "$ELASTICSEARCH_BACKUP_FILE" 2>/dev/null || echo "null")",
    "redis": "$(basename "$REDIS_BACKUP_FILE" 2>/dev/null || echo "null")"
  },
  "encryption_enabled": $([ -f "$ENCRYPTION_KEY_FILE" ] && echo "true" || echo "false"),
  "s3_upload": $([ "$BACKUP_TO_S3" = "true" ] && echo "true" || echo "false"),
  "backup_size": "$(du -sh "$CURRENT_BACKUP_DIR" | cut -f1)"
}
EOF
    
    log "INFO" "Backup manifest created: $manifest_file"
}

# Function to send backup notification
send_notification() {
    local status=$1
    local message=$2
    
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"OpportuneX Backup $status: $message\"}" \
            "$SLACK_WEBHOOK_URL" > /dev/null 2>&1 || true
    fi
    
    if [ -n "$DISCORD_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"content\":\"OpportuneX Backup $status: $message\"}" \
            "$DISCORD_WEBHOOK_URL" > /dev/null 2>&1 || true
    fi
}

# Main backup function
main() {
    local start_time=$(date +%s)
    
    log "INFO" "Starting OpportuneX backup process..."
    
    # Check dependencies and create directories
    check_dependencies
    create_backup_dir
    
    # Perform backups
    local backup_success=true
    
    if ! backup_postgres; then
        backup_success=false
    fi
    
    if ! backup_elasticsearch; then
        backup_success=false
    fi
    
    if ! backup_redis; then
        backup_success=false
    fi
    
    # Upload to S3 if configured
    upload_to_s3
    
    # Create backup manifest
    create_manifest
    
    # Clean up old backups
    cleanup_old_backups
    
    # Calculate backup duration
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    if [ "$backup_success" = true ]; then
        log "INFO" "Backup completed successfully in ${duration}s"
        send_notification "SUCCESS" "Backup completed in ${duration}s"
    else
        log "ERROR" "Backup completed with errors in ${duration}s"
        send_notification "FAILED" "Backup completed with errors in ${duration}s"
        exit 1
    fi
}

# Run main function
main "$@"