-- Add API Keys and Webhooks tables for third-party integrations

-- API Key model
CREATE TABLE IF NOT EXISTS "api_keys" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" VARCHAR(100) NOT NULL,
  "key_hash" VARCHAR(255) NOT NULL UNIQUE,
  "key_prefix" VARCHAR(20) NOT NULL,
  "scopes" TEXT[] NOT NULL DEFAULT '{}',
  "rate_limit" INTEGER NOT NULL DEFAULT 1000,
  "rate_limit_window" INTEGER NOT NULL DEFAULT 3600,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "last_used_at" TIMESTAMPTZ,
  "expires_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Webhook model
CREATE TABLE IF NOT EXISTS "webhooks" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "api_key_id" UUID NOT NULL REFERENCES "api_keys"("id") ON DELETE CASCADE,
  "url" VARCHAR(500) NOT NULL,
  "events" TEXT[] NOT NULL,
  "secret" VARCHAR(255) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "retry_count" INTEGER NOT NULL DEFAULT 3,
  "timeout_ms" INTEGER NOT NULL DEFAULT 5000,
  "last_triggered_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Webhook Delivery Log model
CREATE TABLE IF NOT EXISTS "webhook_deliveries" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "webhook_id" UUID NOT NULL REFERENCES "webhooks"("id") ON DELETE CASCADE,
  "event_type" VARCHAR(100) NOT NULL,
  "payload" JSONB NOT NULL,
  "response_status" INTEGER,
  "response_body" TEXT,
  "error_message" TEXT,
  "attempt_count" INTEGER NOT NULL DEFAULT 1,
  "delivered_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- API Usage Log model
CREATE TABLE IF NOT EXISTS "api_usage_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "api_key_id" UUID NOT NULL REFERENCES "api_keys"("id") ON DELETE CASCADE,
  "endpoint" VARCHAR(200) NOT NULL,
  "method" VARCHAR(10) NOT NULL,
  "status_code" INTEGER NOT NULL,
  "response_time_ms" INTEGER NOT NULL,
  "ip_address" VARCHAR(45),
  "user_agent" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- OAuth Client model
CREATE TABLE IF NOT EXISTS "oauth_clients" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "client_id" VARCHAR(100) NOT NULL UNIQUE,
  "client_secret_hash" VARCHAR(255) NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "description" TEXT,
  "redirect_uris" TEXT[] NOT NULL,
  "scopes" TEXT[] NOT NULL DEFAULT '{}',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- OAuth Authorization Code model
CREATE TABLE IF NOT EXISTS "oauth_authorization_codes" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" VARCHAR(255) NOT NULL UNIQUE,
  "client_id" VARCHAR(100) NOT NULL REFERENCES "oauth_clients"("client_id") ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "redirect_uri" VARCHAR(500) NOT NULL,
  "scopes" TEXT[] NOT NULL,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "used" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- OAuth Access Token model
CREATE TABLE IF NOT EXISTS "oauth_access_tokens" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "token_hash" VARCHAR(255) NOT NULL UNIQUE,
  "client_id" VARCHAR(100) NOT NULL REFERENCES "oauth_clients"("client_id") ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "scopes" TEXT[] NOT NULL,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "revoked" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- OAuth Refresh Token model
CREATE TABLE IF NOT EXISTS "oauth_refresh_tokens" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "token_hash" VARCHAR(255) NOT NULL UNIQUE,
  "access_token_id" UUID NOT NULL REFERENCES "oauth_access_tokens"("id") ON DELETE CASCADE,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "revoked" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "idx_api_keys_user_id" ON "api_keys"("user_id");
CREATE INDEX IF NOT EXISTS "idx_api_keys_key_hash" ON "api_keys"("key_hash");
CREATE INDEX IF NOT EXISTS "idx_webhooks_user_id" ON "webhooks"("user_id");
CREATE INDEX IF NOT EXISTS "idx_webhooks_api_key_id" ON "webhooks"("api_key_id");
CREATE INDEX IF NOT EXISTS "idx_webhook_deliveries_webhook_id" ON "webhook_deliveries"("webhook_id");
CREATE INDEX IF NOT EXISTS "idx_api_usage_logs_api_key_id" ON "api_usage_logs"("api_key_id");
CREATE INDEX IF NOT EXISTS "idx_api_usage_logs_created_at" ON "api_usage_logs"("created_at");
CREATE INDEX IF NOT EXISTS "idx_oauth_clients_user_id" ON "oauth_clients"("user_id");
CREATE INDEX IF NOT EXISTS "idx_oauth_authorization_codes_code" ON "oauth_authorization_codes"("code");
CREATE INDEX IF NOT EXISTS "idx_oauth_access_tokens_token_hash" ON "oauth_access_tokens"("token_hash");
CREATE INDEX IF NOT EXISTS "idx_oauth_refresh_tokens_token_hash" ON "oauth_refresh_tokens"("token_hash");
