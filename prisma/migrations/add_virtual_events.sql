-- Add Virtual Events and AR/VR Features
-- This migration adds support for virtual event spaces, avatars, and AR/VR features

-- Virtual Event Spaces
CREATE TABLE IF NOT EXISTS virtual_event_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  space_type VARCHAR(50) NOT NULL, -- 'conference', 'exhibition', 'networking', 'workshop'
  max_participants INTEGER DEFAULT 100,
  scene_config JSONB NOT NULL, -- 3D scene configuration
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_virtual_event_spaces_opportunity ON virtual_event_spaces(opportunity_id);
CREATE INDEX idx_virtual_event_spaces_active ON virtual_event_spaces(is_active);

-- User Avatars
CREATE TABLE IF NOT EXISTS user_avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  avatar_config JSONB NOT NULL, -- Avatar appearance configuration
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_avatars_user ON user_avatars(user_id);

-- Virtual Event Sessions
CREATE TABLE IF NOT EXISTS virtual_event_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES virtual_event_spaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  position JSONB, -- {x, y, z} coordinates
  rotation JSONB, -- {x, y, z} rotation
  is_active BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_virtual_event_sessions_space ON virtual_event_sessions(space_id);
CREATE INDEX idx_virtual_event_sessions_user ON virtual_event_sessions(user_id);
CREATE INDEX idx_virtual_event_sessions_active ON virtual_event_sessions(is_active);

-- Virtual Booths (for sponsors/companies)
CREATE TABLE IF NOT EXISTS virtual_booths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES virtual_event_spaces(id) ON DELETE CASCADE,
  company_name VARCHAR(200) NOT NULL,
  booth_config JSONB NOT NULL, -- Booth design and content
  position JSONB NOT NULL, -- {x, y, z} coordinates in space
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_virtual_booths_space ON virtual_booths(space_id);
CREATE INDEX idx_virtual_booths_active ON virtual_booths(is_active);

-- AR Business Cards
CREATE TABLE IF NOT EXISTS ar_business_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  card_data JSONB NOT NULL, -- Contact info, social links, etc.
  qr_code_url VARCHAR(500),
  ar_marker_id VARCHAR(100) UNIQUE,
  share_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ar_business_cards_user ON ar_business_cards(user_id);
CREATE INDEX idx_ar_business_cards_marker ON ar_business_cards(ar_marker_id);

-- AR Business Card Exchanges
CREATE TABLE IF NOT EXISTS ar_card_exchanges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  card_id UUID REFERENCES ar_business_cards(id) ON DELETE CASCADE,
  space_id UUID REFERENCES virtual_event_spaces(id) ON DELETE SET NULL,
  exchanged_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ar_card_exchanges_sender ON ar_card_exchanges(sender_id);
CREATE INDEX idx_ar_card_exchanges_receiver ON ar_card_exchanges(receiver_id);
CREATE INDEX idx_ar_card_exchanges_space ON ar_card_exchanges(space_id);

-- Virtual Presentations
CREATE TABLE IF NOT EXISTS virtual_presentations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES virtual_event_spaces(id) ON DELETE CASCADE,
  presenter_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  content_url VARCHAR(500), -- Slides, video, or 3D content
  content_type VARCHAR(50), -- 'slides', 'video', '3d_model', 'screen_share'
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_virtual_presentations_space ON virtual_presentations(space_id);
CREATE INDEX idx_virtual_presentations_presenter ON virtual_presentations(presenter_id);
CREATE INDEX idx_virtual_presentations_scheduled ON virtual_presentations(scheduled_at);

-- Spatial Audio Channels
CREATE TABLE IF NOT EXISTS spatial_audio_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES virtual_event_spaces(id) ON DELETE CASCADE,
  channel_name VARCHAR(100) NOT NULL,
  channel_type VARCHAR(50) NOT NULL, -- 'proximity', 'broadcast', 'private'
  max_distance DECIMAL(10, 2), -- Maximum hearing distance for proximity audio
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_spatial_audio_channels_space ON spatial_audio_channels(space_id);
CREATE INDEX idx_spatial_audio_channels_active ON spatial_audio_channels(is_active);

-- User Interactions in Virtual Space
CREATE TABLE IF NOT EXISTS virtual_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES virtual_event_spaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  interaction_type VARCHAR(50) NOT NULL, -- 'booth_visit', 'presentation_attend', 'chat', 'gesture'
  target_id UUID, -- ID of booth, presentation, or other user
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_virtual_interactions_space ON virtual_interactions(space_id);
CREATE INDEX idx_virtual_interactions_user ON virtual_interactions(user_id);
CREATE INDEX idx_virtual_interactions_type ON virtual_interactions(interaction_type);

-- Device Capabilities Tracking
CREATE TABLE IF NOT EXISTS user_device_capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  supports_webxr BOOLEAN DEFAULT false,
  supports_ar BOOLEAN DEFAULT false,
  supports_vr BOOLEAN DEFAULT false,
  device_type VARCHAR(50), -- 'mobile', 'desktop', 'vr_headset'
  performance_tier VARCHAR(20), -- 'low', 'medium', 'high'
  last_detected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_device_capabilities_user ON user_device_capabilities(user_id);

-- Comments
COMMENT ON TABLE virtual_event_spaces IS 'Virtual 3D spaces for events and conferences';
COMMENT ON TABLE user_avatars IS 'User avatar configurations for virtual events';
COMMENT ON TABLE virtual_event_sessions IS 'Active user sessions in virtual spaces';
COMMENT ON TABLE virtual_booths IS 'Virtual exhibition booths for sponsors and companies';
COMMENT ON TABLE ar_business_cards IS 'AR-enabled digital business cards';
COMMENT ON TABLE ar_card_exchanges IS 'Log of business card exchanges in virtual events';
COMMENT ON TABLE virtual_presentations IS 'Presentations and talks in virtual spaces';
COMMENT ON TABLE spatial_audio_channels IS 'Audio channels with spatial positioning';
COMMENT ON TABLE virtual_interactions IS 'User interactions within virtual spaces';
COMMENT ON TABLE user_device_capabilities IS 'Tracking of user device AR/VR capabilities';
