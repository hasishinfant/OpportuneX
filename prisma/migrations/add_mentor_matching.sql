-- Mentor Matching System Migration
-- This migration adds tables for mentor matching, sessions, and reviews

-- Mentor Profile
CREATE TABLE mentor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT,
  expertise_areas TEXT[] NOT NULL DEFAULT '{}',
  domains TEXT[] NOT NULL DEFAULT '{}',
  years_of_experience INTEGER NOT NULL DEFAULT 0,
  current_role VARCHAR(200),
  current_company VARCHAR(200),
  languages TEXT[] NOT NULL DEFAULT '{}',
  timezone VARCHAR(50),
  hourly_rate DECIMAL(10, 2),
  is_available BOOLEAN NOT NULL DEFAULT true,
  max_mentees INTEGER NOT NULL DEFAULT 5,
  current_mentees INTEGER NOT NULL DEFAULT 0,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  average_rating DECIMAL(3, 2) DEFAULT 0.00,
  success_rate DECIMAL(5, 2) DEFAULT 0.00,
  response_time_hours INTEGER DEFAULT 24,
  linkedin_url VARCHAR(500),
  github_url VARCHAR(500),
  portfolio_url VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mentor Availability
CREATE TABLE mentor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES mentor_profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(mentor_id, day_of_week, start_time)
);

-- Mentorship Request
CREATE TABLE mentorship_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mentor_id UUID REFERENCES mentor_profiles(id) ON DELETE SET NULL,
  request_type VARCHAR(50) NOT NULL DEFAULT 'general',
  topic VARCHAR(200) NOT NULL,
  description TEXT,
  preferred_languages TEXT[] NOT NULL DEFAULT '{}',
  urgency VARCHAR(20) NOT NULL DEFAULT 'normal',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  match_score DECIMAL(5, 2),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mentorship Session
CREATE TABLE mentorship_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES mentor_profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_id UUID REFERENCES mentorship_requests(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  agenda TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  meeting_url VARCHAR(500),
  meeting_platform VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  actual_duration_minutes INTEGER,
  notes TEXT,
  action_items JSONB,
  follow_up_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Session Resources
CREATE TABLE session_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES mentorship_sessions(id) ON DELETE CASCADE,
  resource_type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  url VARCHAR(500),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mentor Review
CREATE TABLE mentor_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES mentorship_sessions(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES mentor_profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  knowledge_rating INTEGER CHECK (knowledge_rating >= 1 AND knowledge_rating <= 5),
  helpfulness_rating INTEGER CHECK (helpfulness_rating >= 1 AND helpfulness_rating <= 5),
  comment TEXT,
  would_recommend BOOLEAN NOT NULL DEFAULT true,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, student_id)
);

-- Student Progress Tracking
CREATE TABLE student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES mentor_profiles(id) ON DELETE CASCADE,
  goal TEXT NOT NULL,
  target_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
  progress_percentage INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  milestones JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mentor Specializations
CREATE TABLE mentor_specializations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES mentor_profiles(id) ON DELETE CASCADE,
  specialization VARCHAR(100) NOT NULL,
  proficiency_level VARCHAR(20) NOT NULL DEFAULT 'intermediate',
  years_experience INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(mentor_id, specialization)
);

-- Create indexes for performance
CREATE INDEX idx_mentor_profiles_user_id ON mentor_profiles(user_id);
CREATE INDEX idx_mentor_profiles_is_available ON mentor_profiles(is_available);
CREATE INDEX idx_mentor_profiles_expertise ON mentor_profiles USING GIN(expertise_areas);
CREATE INDEX idx_mentor_profiles_domains ON mentor_profiles USING GIN(domains);
CREATE INDEX idx_mentor_profiles_languages ON mentor_profiles USING GIN(languages);
CREATE INDEX idx_mentor_profiles_rating ON mentor_profiles(average_rating DESC);

CREATE INDEX idx_mentor_availability_mentor_id ON mentor_availability(mentor_id);
CREATE INDEX idx_mentor_availability_day ON mentor_availability(day_of_week);

CREATE INDEX idx_mentorship_requests_student_id ON mentorship_requests(student_id);
CREATE INDEX idx_mentorship_requests_mentor_id ON mentorship_requests(mentor_id);
CREATE INDEX idx_mentorship_requests_status ON mentorship_requests(status);
CREATE INDEX idx_mentorship_requests_requested_at ON mentorship_requests(requested_at DESC);

CREATE INDEX idx_mentorship_sessions_mentor_id ON mentorship_sessions(mentor_id);
CREATE INDEX idx_mentorship_sessions_student_id ON mentorship_sessions(student_id);
CREATE INDEX idx_mentorship_sessions_scheduled_at ON mentorship_sessions(scheduled_at);
CREATE INDEX idx_mentorship_sessions_status ON mentorship_sessions(status);

CREATE INDEX idx_session_resources_session_id ON session_resources(session_id);

CREATE INDEX idx_mentor_reviews_mentor_id ON mentor_reviews(mentor_id);
CREATE INDEX idx_mentor_reviews_student_id ON mentor_reviews(student_id);
CREATE INDEX idx_mentor_reviews_session_id ON mentor_reviews(session_id);
CREATE INDEX idx_mentor_reviews_rating ON mentor_reviews(rating DESC);
CREATE INDEX idx_mentor_reviews_created_at ON mentor_reviews(created_at DESC);

CREATE INDEX idx_student_progress_student_id ON student_progress(student_id);
CREATE INDEX idx_student_progress_mentor_id ON student_progress(mentor_id);
CREATE INDEX idx_student_progress_status ON student_progress(status);

CREATE INDEX idx_mentor_specializations_mentor_id ON mentor_specializations(mentor_id);

-- Add trigger to update mentor profile stats
CREATE OR REPLACE FUNCTION update_mentor_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update average rating
  UPDATE mentor_profiles
  SET average_rating = (
    SELECT COALESCE(AVG(rating), 0)
    FROM mentor_reviews
    WHERE mentor_id = NEW.mentor_id
  ),
  updated_at = NOW()
  WHERE id = NEW.mentor_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_mentor_stats
AFTER INSERT OR UPDATE ON mentor_reviews
FOR EACH ROW
EXECUTE FUNCTION update_mentor_stats();

-- Add trigger to update session count
CREATE OR REPLACE FUNCTION update_mentor_session_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE mentor_profiles
    SET total_sessions = total_sessions + 1,
        updated_at = NOW()
    WHERE id = NEW.mentor_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_mentor_session_count
AFTER INSERT OR UPDATE ON mentorship_sessions
FOR EACH ROW
EXECUTE FUNCTION update_mentor_session_count();
