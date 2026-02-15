-- Add blockchain credential verification tables

-- User blockchain addresses
CREATE TABLE IF NOT EXISTS user_blockchain (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  address VARCHAR(42) NOT NULL UNIQUE,
  encrypted_private_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT user_blockchain_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Credentials table
CREATE TABLE IF NOT EXISTS credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  credential_type VARCHAR(50) NOT NULL,
  blockchain_id VARCHAR(66) NOT NULL UNIQUE,
  metadata_uri TEXT NOT NULL,
  transaction_hash VARCHAR(66) NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT credentials_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE SET NULL,
  CONSTRAINT credentials_status_check CHECK (status IN ('active', 'revoked', 'expired'))
);

-- Credential shares table
CREATE TABLE IF NOT EXISTS credential_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id UUID NOT NULL REFERENCES credentials(id) ON DELETE CASCADE,
  share_token VARCHAR(64) NOT NULL UNIQUE,
  view_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT credential_shares_credential_id_fkey FOREIGN KEY (credential_id) REFERENCES credentials(id) ON DELETE CASCADE
);

-- Blockchain transactions table (for tracking)
CREATE TABLE IF NOT EXISTS blockchain_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_hash VARCHAR(66) NOT NULL UNIQUE,
  transaction_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  block_number BIGINT,
  gas_used BIGINT,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT blockchain_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT blockchain_transactions_status_check CHECK (status IN ('pending', 'confirmed', 'failed'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_blockchain_user_id ON user_blockchain(user_id);
CREATE INDEX IF NOT EXISTS idx_user_blockchain_address ON user_blockchain(address);

CREATE INDEX IF NOT EXISTS idx_credentials_user_id ON credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_credentials_opportunity_id ON credentials(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_credentials_blockchain_id ON credentials(blockchain_id);
CREATE INDEX IF NOT EXISTS idx_credentials_status ON credentials(status);
CREATE INDEX IF NOT EXISTS idx_credentials_issued_at ON credentials(issued_at DESC);

CREATE INDEX IF NOT EXISTS idx_credential_shares_credential_id ON credential_shares(credential_id);
CREATE INDEX IF NOT EXISTS idx_credential_shares_share_token ON credential_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_credential_shares_expires_at ON credential_shares(expires_at);

CREATE INDEX IF NOT EXISTS idx_blockchain_transactions_user_id ON blockchain_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_transactions_hash ON blockchain_transactions(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_blockchain_transactions_status ON blockchain_transactions(status);

-- Add comments
COMMENT ON TABLE user_blockchain IS 'Stores user blockchain wallet addresses';
COMMENT ON TABLE credentials IS 'Stores issued credentials with blockchain references';
COMMENT ON TABLE credential_shares IS 'Stores shareable credential links';
COMMENT ON TABLE blockchain_transactions IS 'Tracks blockchain transaction status';
