-- Gamification System Migration
-- Add gamification features including points, badges, leaderboards, and challenges

-- User Points and Level
ALTER TABLE users ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_date DATE;

-- Badge Types Enum
CREATE TYPE badge_category AS ENUM (
  'milestone',
  'streak',
  'achievement',
  'special',
  'seasonal'
);

-- Badges Table
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category badge_category NOT NULL,
  icon_url VARCHAR(500),
  points_required INTEGER DEFAULT 0,
  criteria JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Badges (earned badges)
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  progress JSONB,
  UNIQUE(user_id, badge_id)
);

-- Points History
CREATE TABLE IF NOT EXISTS points_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  action VARCHAR(100) NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leaderboard Periods Enum
CREATE TYPE leaderboard_period AS ENUM (
  'daily',
  'weekly',
  'monthly',
  'all_time'
);

-- Leaderboard Entries
CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period leaderboard_period NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  rank INTEGER,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, period, period_start)
);

-- Daily Challenges
CREATE TABLE IF NOT EXISTS daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  challenge_type VARCHAR(50) NOT NULL,
  target_value INTEGER NOT NULL,
  points_reward INTEGER NOT NULL,
  badge_reward_id UUID REFERENCES badges(id) ON DELETE SET NULL,
  active_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Challenge Progress
CREATE TABLE IF NOT EXISTS user_challenge_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES daily_challenges(id) ON DELETE CASCADE,
  current_value INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, challenge_id)
);

-- Achievements (special accomplishments)
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_type VARCHAR(100) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  points_earned INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rewards (virtual items, unlockables)
CREATE TABLE IF NOT EXISTS rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  reward_type VARCHAR(50) NOT NULL,
  points_cost INTEGER NOT NULL,
  icon_url VARCHAR(500),
  is_available BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Rewards (claimed rewards)
CREATE TABLE IF NOT EXISTS user_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_points_history_user_id ON points_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_period ON leaderboard_entries(period, period_start, rank);
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_user ON leaderboard_entries(user_id, period);
CREATE INDEX IF NOT EXISTS idx_daily_challenges_active ON daily_challenges(active_date, is_active);
CREATE INDEX IF NOT EXISTS idx_user_challenge_progress_user ON user_challenge_progress(user_id, challenge_id);
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_rewards_user_id ON user_rewards(user_id);

-- Insert default badges
INSERT INTO badges (name, description, category, points_required, criteria) VALUES
  ('First Steps', 'Complete your profile', 'milestone', 0, '{"action": "complete_profile"}'),
  ('Explorer', 'Search for 10 opportunities', 'milestone', 50, '{"action": "search_count", "target": 10}'),
  ('Bookworm', 'Save 5 opportunities', 'milestone', 30, '{"action": "save_count", "target": 5}'),
  ('Dedicated', '7-day streak', 'streak', 100, '{"action": "streak", "target": 7}'),
  ('Committed', '30-day streak', 'streak', 500, '{"action": "streak", "target": 30}'),
  ('Roadmap Creator', 'Create your first roadmap', 'achievement', 50, '{"action": "create_roadmap"}'),
  ('Social Butterfly', 'Follow 10 users', 'achievement', 75, '{"action": "follow_count", "target": 10}'),
  ('Team Player', 'Join a team', 'achievement', 40, '{"action": "join_team"}'),
  ('Early Bird', 'Login before 6 AM', 'special', 20, '{"action": "early_login"}'),
  ('Night Owl', 'Login after 10 PM', 'special', 20, '{"action": "late_login"}');

-- Insert default rewards
INSERT INTO rewards (name, description, reward_type, points_cost, metadata) VALUES
  ('Profile Theme: Dark Blue', 'Unlock dark blue profile theme', 'theme', 100, '{"theme_id": "dark_blue"}'),
  ('Profile Theme: Sunset', 'Unlock sunset profile theme', 'theme', 150, '{"theme_id": "sunset"}'),
  ('Badge Showcase', 'Display up to 5 badges on profile', 'feature', 200, '{"feature": "badge_showcase"}'),
  ('Priority Notifications', 'Get notifications 1 hour earlier', 'feature', 300, '{"feature": "priority_notifications"}'),
  ('Custom Avatar Border', 'Unlock custom avatar borders', 'cosmetic', 250, '{"feature": "avatar_border"}');

-- Function to update user level based on points
CREATE OR REPLACE FUNCTION update_user_level()
RETURNS TRIGGER AS $$
BEGIN
  -- Simple level calculation: level = floor(points / 100) + 1
  NEW.level = FLOOR(NEW.points / 100.0) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update level when points change
DROP TRIGGER IF EXISTS trigger_update_user_level ON users;
CREATE TRIGGER trigger_update_user_level
  BEFORE UPDATE OF points ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_user_level();
