#!/bin/bash

# Automated Backup Setup Script for OpportuneX
# Sets up scheduled backups, monitoring, and maintenance procedures

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_USER="opportunex-backup"
BACKUP_DIR="/var/backups/opportunex"
LOG_DIR="/var/log/opportunex"
CRON_FILE="/etc/cron.d/opportunex-backup"
SYSTEMD_SERVICE_DIR="/etc/systemd/system"

# Logging
LOG_FILE="$LOG_DIR/backup-setup.log"

# Function to log messages
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Function to check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log "ERROR" "This script must be run as root"
        exit 1
    fi
}

# Function to create backup user
create_backup_user() {
    log "INFO" "Creating backup user..."
    
    if id "$BACKUP_USER" &>/dev/null; then
        log "INFO" "Backup user already exists"
    else
        useradd -r -s /bin/bash -d "$BACKUP_DIR" -c "OpportuneX Backup User" "$BACKUP_USER"
        log "INFO" "Created backup user: $BACKUP_USER"
    fi
    
    # Create backup directory
    mkdir -p "$BACKUP_DIR"
    chown "$BACKUP_USER:$BACKUP_USER" "$BACKUP_DIR"
    chmod 750 "$BACKUP_DIR"
    
    # Create log directory
    mkdir -p "$LOG_DIR"
    chown "$BACKUP_USER:$BACKUP_USER" "$LOG_DIR"
    chmod 755 "$LOG_DIR"
}

# Function to setup backup encryption
setup_encryption() {
    log "INFO" "Setting up backup encryption..."
    
    local key_file="/etc/opportunex/backup.key"
    local key_dir=$(dirname "$key_file")
    
    # Create key directory
    mkdir -p "$key_dir"
    chmod 700 "$key_dir"
    
    # Generate encryption key if it doesn't exist
    if [ ! -f "$key_file" ]; then
        openssl rand -base64 32 > "$key_file"
        chmod 600 "$key_file"
        chown root:root "$key_file"
        log "INFO" "Generated backup encryption key"
    else
        log "INFO" "Backup encryption key already exists"
    fi
}

# Function to setup AWS CLI for S3 backups
setup_aws_cli() {
    log "INFO" "Setting up AWS CLI for S3 backups..."
    
    # Install AWS CLI if not present
    if ! command -v aws &> /dev/null; then
        log "INFO" "Installing AWS CLI..."
        curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
        unzip awscliv2.zip
        ./aws/install
        rm -rf aws awscliv2.zip
        log "INFO" "AWS CLI installed successfully"
    else
        log "INFO" "AWS CLI already installed"
    fi
    
    # Create AWS config directory for backup user
    local aws_dir="/home/$BACKUP_USER/.aws"
    mkdir -p "$aws_dir"
    chown "$BACKUP_USER:$BACKUP_USER" "$aws_dir"
    chmod 700 "$aws_dir"
    
    # Create AWS config template
    cat > "$aws_dir/config" << EOF
[default]
region = ${AWS_REGION:-us-east-1}
output = json

[profile backup]
region = ${AWS_REGION:-us-east-1}
output = json
EOF
    
    # Create credentials template (to be filled manually)
    if [ ! -f "$aws_dir/credentials" ]; then
        cat > "$aws_dir/credentials" << EOF
[default]
aws_access_key_id = YOUR_ACCESS_KEY_ID
aws_secret_access_key = YOUR_SECRET_ACCESS_KEY

[backup]
aws_access_key_id = YOUR_BACKUP_ACCESS_KEY_ID
aws_secret_access_key = YOUR_BACKUP_SECRET_ACCESS_KEY
EOF
        chmod 600 "$aws_dir/credentials"
        log "WARN" "AWS credentials template created. Please update with actual credentials."
    fi
    
    chown -R "$BACKUP_USER:$BACKUP_USER" "$aws_dir"
}

# Function to create systemd service for backups
create_systemd_service() {
    log "INFO" "Creating systemd service for backups..."
    
    # Create backup service
    cat > "$SYSTEMD_SERVICE_DIR/opportunex-backup.service" << EOF
[Unit]
Description=OpportuneX Database Backup Service
After=network.target

[Service]
Type=oneshot
User=$BACKUP_USER
Group=$BACKUP_USER
Environment=BACKUP_TO_S3=true
Environment=BACKUP_DIR=$BACKUP_DIR
Environment=LOG_FILE=$LOG_DIR/backup.log
ExecStart=/usr/local/bin/opportunex-backup.sh
StandardOutput=journal
StandardError=journal
EOF

    # Create backup timer
    cat > "$SYSTEMD_SERVICE_DIR/opportunex-backup.timer" << EOF
[Unit]
Description=OpportuneX Backup Timer
Requires=opportunex-backup.service

[Timer]
OnCalendar=daily
Persistent=true
RandomizedDelaySec=1800

[Install]
WantedBy=timers.target
EOF

    # Create cleanup service
    cat > "$SYSTEMD_SERVICE_DIR/opportunex-backup-cleanup.service" << EOF
[Unit]
Description=OpportuneX Backup Cleanup Service
After=network.target

[Service]
Type=oneshot
User=$BACKUP_USER
Group=$BACKUP_USER
Environment=BACKUP_DIR=$BACKUP_DIR
Environment=RETENTION_DAYS=30
ExecStart=/usr/local/bin/opportunex-backup-cleanup.sh
StandardOutput=journal
StandardError=journal
EOF

    # Create cleanup timer (weekly)
    cat > "$SYSTEMD_SERVICE_DIR/opportunex-backup-cleanup.timer" << EOF
[Unit]
Description=OpportuneX Backup Cleanup Timer
Requires=opportunex-backup-cleanup.service

[Timer]
OnCalendar=weekly
Persistent=true

[Install]
WantedBy=timers.target
EOF

    # Reload systemd and enable timers
    systemctl daemon-reload
    systemctl enable opportunex-backup.timer
    systemctl enable opportunex-backup-cleanup.timer
    systemctl start opportunex-backup.timer
    systemctl start opportunex-backup-cleanup.timer
    
    log "INFO" "Systemd services and timers created and enabled"
}

# Function to create backup cleanup script
create_cleanup_script() {
    log "INFO" "Creating backup cleanup script..."
    
    cat > "/usr/local/bin/opportunex-backup-cleanup.sh" << 'EOF'
#!/bin/bash

# OpportuneX Backup Cleanup Script
# Removes old backups based on retention policy

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/opportunex}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
LOG_FILE="${LOG_FILE:-/var/log/opportunex/backup-cleanup.log}"
AWS_S3_BUCKET="${BACKUP_S3_BUCKET:-opportunex-backups}"
AWS_REGION="${AWS_REGION:-us-east-1}"

# Function to log messages
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Function to cleanup local backups
cleanup_local_backups() {
    log "INFO" "Cleaning up local backups older than $RETENTION_DAYS days..."
    
    local deleted_count=0
    
    # Find and delete old backup directories
    find "$BACKUP_DIR" -type d -name "20*" -mtime +$RETENTION_DAYS -print0 | \
    while IFS= read -r -d '' backup_dir; do
        log "INFO" "Removing old backup: $(basename "$backup_dir")"
        rm -rf "$backup_dir"
        deleted_count=$((deleted_count + 1))
    done
    
    log "INFO" "Cleaned up $deleted_count local backup directories"
}

# Function to cleanup S3 backups
cleanup_s3_backups() {
    if [ "$BACKUP_TO_S3" != "true" ]; then
        log "INFO" "S3 backup cleanup disabled"
        return 0
    fi
    
    log "INFO" "Cleaning up S3 backups older than $RETENTION_DAYS days..."
    
    local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y%m%d)
    local deleted_count=0
    
    # List and delete old S3 backups
    aws s3 ls "s3://$AWS_S3_BUCKET/opportunex-backups/" --region "$AWS_REGION" | \
    awk '{print $2}' | grep -E '^[0-9]{8}_[0-9]{6}/$' | \
    while read backup_dir; do
        local backup_date=$(echo "$backup_dir" | cut -d'_' -f1)
        if [ "$backup_date" -lt "$cutoff_date" ]; then
            log "INFO" "Removing old S3 backup: $backup_dir"
            aws s3 rm "s3://$AWS_S3_BUCKET/opportunex-backups/$backup_dir" --recursive --region "$AWS_REGION"
            deleted_count=$((deleted_count + 1))
        fi
    done
    
    log "INFO" "Cleaned up $deleted_count S3 backup directories"
}

# Function to generate cleanup report
generate_report() {
    log "INFO" "Generating cleanup report..."
    
    local report_file="$BACKUP_DIR/cleanup-report-$(date +%Y%m%d).txt"
    
    cat > "$report_file" << EOF
OpportuneX Backup Cleanup Report
Generated: $(date)
Retention Policy: $RETENTION_DAYS days

Local Backup Directory: $BACKUP_DIR
$(du -sh "$BACKUP_DIR" 2>/dev/null || echo "Directory not accessible")

Local Backup Count: $(find "$BACKUP_DIR" -type d -name "20*" | wc -l)

Oldest Backup: $(find "$BACKUP_DIR" -type d -name "20*" | sort | head -1 | xargs basename 2>/dev/null || echo "None")
Newest Backup: $(find "$BACKUP_DIR" -type d -name "20*" | sort | tail -1 | xargs basename 2>/dev/null || echo "None")

S3 Backup Status: $([ "$BACKUP_TO_S3" = "true" ] && echo "Enabled" || echo "Disabled")
EOF

    if [ "$BACKUP_TO_S3" = "true" ]; then
        cat >> "$report_file" << EOF

S3 Bucket: s3://$AWS_S3_BUCKET/opportunex-backups/
S3 Backup Count: $(aws s3 ls "s3://$AWS_S3_BUCKET/opportunex-backups/" --region "$AWS_REGION" | grep -c "PRE" || echo "0")
EOF
    fi
    
    log "INFO" "Cleanup report generated: $report_file"
}

# Main cleanup function
main() {
    log "INFO" "Starting OpportuneX backup cleanup..."
    
    cleanup_local_backups
    cleanup_s3_backups
    generate_report
    
    log "INFO" "Backup cleanup completed successfully"
}

# Run main function
main "$@"
EOF

    chmod +x "/usr/local/bin/opportunex-backup-cleanup.sh"
    chown "$BACKUP_USER:$BACKUP_USER" "/usr/local/bin/opportunex-backup-cleanup.sh"
    
    log "INFO" "Backup cleanup script created"
}

# Function to create backup wrapper script
create_backup_wrapper() {
    log "INFO" "Creating backup wrapper script..."
    
    # Copy the main backup script to system location
    cp "$(dirname "$0")/backup-database.sh" "/usr/local/bin/opportunex-backup.sh"
    chmod +x "/usr/local/bin/opportunex-backup.sh"
    chown "$BACKUP_USER:$BACKUP_USER" "/usr/local/bin/opportunex-backup.sh"
    
    log "INFO" "Backup wrapper script created"
}

# Function to setup monitoring
setup_monitoring() {
    log "INFO" "Setting up backup monitoring..."
    
    # Create monitoring script
    cat > "/usr/local/bin/opportunex-backup-monitor.sh" << 'EOF'
#!/bin/bash

# OpportuneX Backup Monitoring Script
# Checks backup status and sends alerts if needed

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/opportunex}"
LOG_FILE="${LOG_FILE:-/var/log/opportunex/backup-monitor.log}"
MAX_BACKUP_AGE_HOURS=26  # Alert if no backup in 26 hours
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
DISCORD_WEBHOOK_URL="${DISCORD_WEBHOOK_URL:-}"

# Function to log messages
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Function to send alert
send_alert() {
    local message="$1"
    local level="${2:-WARNING}"
    
    log "$level" "$message"
    
    # Send Slack notification
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"OpportuneX Backup Alert [$level]: $message\"}" \
            "$SLACK_WEBHOOK_URL" > /dev/null 2>&1 || true
    fi
    
    # Send Discord notification
    if [ -n "$DISCORD_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"content\":\"OpportuneX Backup Alert [$level]: $message\"}" \
            "$DISCORD_WEBHOOK_URL" > /dev/null 2>&1 || true
    fi
}

# Function to check backup freshness
check_backup_freshness() {
    log "INFO" "Checking backup freshness..."
    
    # Find the most recent backup
    local latest_backup=$(find "$BACKUP_DIR" -type d -name "20*" | sort | tail -1)
    
    if [ -z "$latest_backup" ]; then
        send_alert "No backups found in $BACKUP_DIR" "CRITICAL"
        return 1
    fi
    
    # Check backup age
    local backup_timestamp=$(basename "$latest_backup")
    local backup_date=$(echo "$backup_timestamp" | cut -d'_' -f1)
    local backup_time=$(echo "$backup_timestamp" | cut -d'_' -f2)
    
    # Convert to epoch time
    local backup_epoch=$(date -d "${backup_date:0:4}-${backup_date:4:2}-${backup_date:6:2} ${backup_time:0:2}:${backup_time:2:2}:${backup_time:4:2}" +%s)
    local current_epoch=$(date +%s)
    local age_hours=$(( (current_epoch - backup_epoch) / 3600 ))
    
    if [ $age_hours -gt $MAX_BACKUP_AGE_HOURS ]; then
        send_alert "Latest backup is $age_hours hours old (threshold: $MAX_BACKUP_AGE_HOURS hours)" "CRITICAL"
        return 1
    else
        log "INFO" "Latest backup is $age_hours hours old - OK"
    fi
}

# Function to check backup integrity
check_backup_integrity() {
    log "INFO" "Checking backup integrity..."
    
    local latest_backup=$(find "$BACKUP_DIR" -type d -name "20*" | sort | tail -1)
    
    if [ -z "$latest_backup" ]; then
        return 1
    fi
    
    # Check if manifest exists
    local manifest_file="$latest_backup/backup_manifest.json"
    if [ ! -f "$manifest_file" ]; then
        send_alert "Backup manifest missing for $(basename "$latest_backup")" "WARNING"
        return 1
    fi
    
    # Check if backup files exist
    local postgres_file=$(jq -r '.files.postgres' "$manifest_file" 2>/dev/null || echo "null")
    local elasticsearch_file=$(jq -r '.files.elasticsearch' "$manifest_file" 2>/dev/null || echo "null")
    local redis_file=$(jq -r '.files.redis' "$manifest_file" 2>/dev/null || echo "null")
    
    local missing_files=()
    
    if [ "$postgres_file" != "null" ] && [ ! -f "$latest_backup/$postgres_file" ]; then
        missing_files+=("PostgreSQL")
    fi
    
    if [ "$elasticsearch_file" != "null" ] && [ ! -f "$latest_backup/$elasticsearch_file" ]; then
        missing_files+=("Elasticsearch")
    fi
    
    if [ "$redis_file" != "null" ] && [ ! -f "$latest_backup/$redis_file" ]; then
        missing_files+=("Redis")
    fi
    
    if [ ${#missing_files[@]} -gt 0 ]; then
        send_alert "Missing backup files: ${missing_files[*]}" "CRITICAL"
        return 1
    else
        log "INFO" "Backup integrity check passed"
    fi
}

# Function to check disk space
check_disk_space() {
    log "INFO" "Checking backup disk space..."
    
    local usage=$(df "$BACKUP_DIR" | awk 'NR==2 {print $5}' | sed 's/%//')
    local threshold=85
    
    if [ "$usage" -gt "$threshold" ]; then
        send_alert "Backup disk usage is ${usage}% (threshold: ${threshold}%)" "WARNING"
    else
        log "INFO" "Backup disk usage is ${usage}% - OK"
    fi
}

# Main monitoring function
main() {
    log "INFO" "Starting backup monitoring check..."
    
    local check_failed=false
    
    if ! check_backup_freshness; then
        check_failed=true
    fi
    
    if ! check_backup_integrity; then
        check_failed=true
    fi
    
    check_disk_space
    
    if [ "$check_failed" = "true" ]; then
        log "ERROR" "Backup monitoring check failed"
        exit 1
    else
        log "INFO" "Backup monitoring check completed successfully"
    fi
}

# Run main function
main "$@"
EOF

    chmod +x "/usr/local/bin/opportunex-backup-monitor.sh"
    chown "$BACKUP_USER:$BACKUP_USER" "/usr/local/bin/opportunex-backup-monitor.sh"
    
    # Create monitoring timer
    cat > "$SYSTEMD_SERVICE_DIR/opportunex-backup-monitor.service" << EOF
[Unit]
Description=OpportuneX Backup Monitoring Service
After=network.target

[Service]
Type=oneshot
User=$BACKUP_USER
Group=$BACKUP_USER
Environment=BACKUP_DIR=$BACKUP_DIR
Environment=LOG_FILE=$LOG_DIR/backup-monitor.log
ExecStart=/usr/local/bin/opportunex-backup-monitor.sh
StandardOutput=journal
StandardError=journal
EOF

    cat > "$SYSTEMD_SERVICE_DIR/opportunex-backup-monitor.timer" << EOF
[Unit]
Description=OpportuneX Backup Monitoring Timer
Requires=opportunex-backup-monitor.service

[Timer]
OnCalendar=hourly
Persistent=true

[Install]
WantedBy=timers.target
EOF

    systemctl daemon-reload
    systemctl enable opportunex-backup-monitor.timer
    systemctl start opportunex-backup-monitor.timer
    
    log "INFO" "Backup monitoring setup completed"
}

# Function to create logrotate configuration
setup_logrotate() {
    log "INFO" "Setting up log rotation..."
    
    cat > "/etc/logrotate.d/opportunex-backup" << EOF
$LOG_DIR/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $BACKUP_USER $BACKUP_USER
    postrotate
        systemctl reload rsyslog > /dev/null 2>&1 || true
    endscript
}
EOF

    log "INFO" "Log rotation configured"
}

# Function to test backup system
test_backup_system() {
    log "INFO" "Testing backup system..."
    
    # Test backup script execution
    if sudo -u "$BACKUP_USER" /usr/local/bin/opportunex-backup.sh > /dev/null 2>&1; then
        log "INFO" "Backup script test passed"
    else
        log "ERROR" "Backup script test failed"
        return 1
    fi
    
    # Test monitoring script
    if sudo -u "$BACKUP_USER" /usr/local/bin/opportunex-backup-monitor.sh > /dev/null 2>&1; then
        log "INFO" "Monitoring script test passed"
    else
        log "ERROR" "Monitoring script test failed"
        return 1
    fi
    
    # Test cleanup script
    if sudo -u "$BACKUP_USER" /usr/local/bin/opportunex-backup-cleanup.sh > /dev/null 2>&1; then
        log "INFO" "Cleanup script test passed"
    else
        log "ERROR" "Cleanup script test failed"
        return 1
    fi
    
    log "INFO" "All backup system tests passed"
}

# Function to display setup summary
display_summary() {
    echo -e "${GREEN}OpportuneX Automated Backup Setup Complete!${NC}"
    echo -e "${GREEN}=========================================${NC}"
    echo ""
    echo -e "${YELLOW}Configuration Summary:${NC}"
    echo -e "Backup User: $BACKUP_USER"
    echo -e "Backup Directory: $BACKUP_DIR"
    echo -e "Log Directory: $LOG_DIR"
    echo -e "Encryption: Enabled"
    echo ""
    echo -e "${YELLOW}Scheduled Tasks:${NC}"
    echo -e "Daily Backup: 02:00 AM (with random delay up to 30 minutes)"
    echo -e "Weekly Cleanup: Sunday 03:00 AM"
    echo -e "Hourly Monitoring: Every hour"
    echo ""
    echo -e "${YELLOW}Manual Commands:${NC}"
    echo -e "Run Backup: sudo systemctl start opportunex-backup.service"
    echo -e "Check Status: sudo systemctl status opportunex-backup.timer"
    echo -e "View Logs: sudo journalctl -u opportunex-backup.service"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo -e "1. Update AWS credentials in /home/$BACKUP_USER/.aws/credentials"
    echo -e "2. Configure notification webhooks in environment variables"
    echo -e "3. Test the backup system: sudo systemctl start opportunex-backup.service"
    echo -e "4. Monitor logs: tail -f $LOG_DIR/backup.log"
    echo ""
    echo -e "${BLUE}For more information, see the deployment documentation.${NC}"
}

# Main setup function
main() {
    log "INFO" "Starting OpportuneX automated backup setup..."
    
    # Check prerequisites
    check_root
    
    # Setup components
    create_backup_user
    setup_encryption
    setup_aws_cli
    create_backup_wrapper
    create_cleanup_script
    create_systemd_service
    setup_monitoring
    setup_logrotate
    
    # Test the system
    test_backup_system
    
    # Display summary
    display_summary
    
    log "INFO" "Automated backup setup completed successfully"
}

# Run main function
main "$@"