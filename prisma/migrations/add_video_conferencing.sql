-- Video Conferencing Migration
-- Adds tables for video conferencing, call management, and recording

-- Video Call Room
CREATE TABLE video_call_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  room_type VARCHAR(50) NOT NULL, -- one_on_one, group, presentation, interview
  host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  max_participants INT NOT NULL DEFAULT 10,
  is_recording_enabled BOOLEAN DEFAULT false,
  is_waiting_room_enabled BOOLEAN DEFAULT true,
  is_locked BOOLEAN DEFAULT false,
  password_hash VARCHAR(255),
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, active, ended, cancelled
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_video_call_rooms_room_code ON video_call_rooms(room_code);
CREATE INDEX idx_video_call_rooms_host_id ON video_call_rooms(host_id);
CREATE INDEX idx_video_call_rooms_status ON video_call_rooms(status);
CREATE INDEX idx_video_call_rooms_scheduled_at ON video_call_rooms(scheduled_at);

-- Video Call Participant
CREATE TABLE video_call_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES video_call_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  peer_id VARCHAR(100) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  role VARCHAR(20) DEFAULT 'participant', -- host, co_host, participant, observer
  is_audio_enabled BOOLEAN DEFAULT true,
  is_video_enabled BOOLEAN DEFAULT true,
  is_screen_sharing BOOLEAN DEFAULT false,
  is_hand_raised BOOLEAN DEFAULT false,
  connection_quality VARCHAR(20), -- excellent, good, fair, poor
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  duration_seconds INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_video_call_participants_room_id ON video_call_participants(room_id);
CREATE INDEX idx_video_call_participants_user_id ON video_call_participants(user_id);
CREATE INDEX idx_video_call_participants_peer_id ON video_call_participants(peer_id);

-- Video Call Recording
CREATE TABLE video_call_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES video_call_rooms(id) ON DELETE CASCADE,
  recording_url VARCHAR(500),
  storage_key VARCHAR(500),
  file_size_bytes BIGINT,
  duration_seconds INT,
  format VARCHAR(20) DEFAULT 'webm',
  status VARCHAR(20) DEFAULT 'processing', -- processing, ready, failed, deleted
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  is_public BOOLEAN DEFAULT false,
  access_token VARCHAR(100),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_video_call_recordings_room_id ON video_call_recordings(room_id);
CREATE INDEX idx_video_call_recordings_status ON video_call_recordings(status);
CREATE INDEX idx_video_call_recordings_access_token ON video_call_recordings(access_token);

-- Video Call Message (Chat)
CREATE TABLE video_call_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES video_call_rooms(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES video_call_participants(id) ON DELETE CASCADE,
  message_type VARCHAR(20) DEFAULT 'text', -- text, file, poll, reaction
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_video_call_messages_room_id ON video_call_messages(room_id);
CREATE INDEX idx_video_call_messages_created_at ON video_call_messages(created_at);

-- Breakout Room
CREATE TABLE breakout_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_room_id UUID NOT NULL REFERENCES video_call_rooms(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  max_participants INT DEFAULT 5,
  auto_assign BOOLEAN DEFAULT false,
  duration_minutes INT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_breakout_rooms_parent_room_id ON breakout_rooms(parent_room_id);
CREATE INDEX idx_breakout_rooms_is_active ON breakout_rooms(is_active);

-- Breakout Room Assignment
CREATE TABLE breakout_room_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  breakout_room_id UUID NOT NULL REFERENCES breakout_rooms(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES video_call_participants(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ
);

CREATE INDEX idx_breakout_room_assignments_breakout_room_id ON breakout_room_assignments(breakout_room_id);
CREATE INDEX idx_breakout_room_assignments_participant_id ON breakout_room_assignments(participant_id);

-- Video Call Poll
CREATE TABLE video_call_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES video_call_rooms(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES video_call_participants(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  allow_multiple BOOLEAN DEFAULT false,
  is_anonymous BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_video_call_polls_room_id ON video_call_polls(room_id);
CREATE INDEX idx_video_call_polls_is_active ON video_call_polls(is_active);

-- Video Call Poll Response
CREATE TABLE video_call_poll_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES video_call_polls(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES video_call_participants(id) ON DELETE CASCADE,
  selected_options JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_video_call_poll_responses_poll_id ON video_call_poll_responses(poll_id);
CREATE INDEX idx_video_call_poll_responses_participant_id ON video_call_poll_responses(participant_id);

-- Video Call Analytics
CREATE TABLE video_call_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES video_call_rooms(id) ON DELETE CASCADE,
  total_participants INT DEFAULT 0,
  peak_participants INT DEFAULT 0,
  total_duration_seconds INT DEFAULT 0,
  average_connection_quality VARCHAR(20),
  total_messages INT DEFAULT 0,
  screen_share_duration_seconds INT DEFAULT 0,
  recording_duration_seconds INT DEFAULT 0,
  bandwidth_stats JSONB,
  quality_stats JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_video_call_analytics_room_id ON video_call_analytics(room_id);

-- Signaling Server Connection
CREATE TABLE signaling_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES video_call_rooms(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES video_call_participants(id) ON DELETE CASCADE,
  socket_id VARCHAR(100) NOT NULL,
  peer_connection_state VARCHAR(20), -- new, connecting, connected, disconnected, failed, closed
  ice_connection_state VARCHAR(20),
  signaling_state VARCHAR(20),
  last_heartbeat TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_signaling_connections_room_id ON signaling_connections(room_id);
CREATE INDEX idx_signaling_connections_socket_id ON signaling_connections(socket_id);
CREATE INDEX idx_signaling_connections_participant_id ON signaling_connections(participant_id);

-- Bandwidth Measurement
CREATE TABLE bandwidth_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES video_call_participants(id) ON DELETE CASCADE,
  download_mbps DECIMAL(10, 2),
  upload_mbps DECIMAL(10, 2),
  latency_ms INT,
  packet_loss_percent DECIMAL(5, 2),
  jitter_ms INT,
  recommended_quality VARCHAR(20), -- low, medium, high, hd
  measured_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bandwidth_measurements_participant_id ON bandwidth_measurements(participant_id);
CREATE INDEX idx_bandwidth_measurements_measured_at ON bandwidth_measurements(measured_at);

-- Virtual Background
CREATE TABLE virtual_backgrounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  background_type VARCHAR(20) NOT NULL, -- image, blur, none
  image_url VARCHAR(500),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_virtual_backgrounds_user_id ON virtual_backgrounds(user_id);

-- Comments
COMMENT ON TABLE video_call_rooms IS 'Video conference rooms with settings and scheduling';
COMMENT ON TABLE video_call_participants IS 'Participants in video calls with their states';
COMMENT ON TABLE video_call_recordings IS 'Recorded video call sessions';
COMMENT ON TABLE video_call_messages IS 'Chat messages during video calls';
COMMENT ON TABLE breakout_rooms IS 'Breakout rooms for group discussions';
COMMENT ON TABLE video_call_polls IS 'Polls conducted during video calls';
COMMENT ON TABLE video_call_analytics IS 'Analytics and metrics for video calls';
COMMENT ON TABLE bandwidth_measurements IS 'Network quality measurements for adaptive streaming';
COMMENT ON TABLE virtual_backgrounds IS 'User-uploaded virtual backgrounds';
