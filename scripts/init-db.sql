-- Initialize OpportuneX Database
-- This script sets up the basic database structure

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create enum types
CREATE TYPE opportunity_type AS ENUM ('hackathon', 'internship', 'workshop');
CREATE TYPE organizer_type AS ENUM ('corporate', 'startup', 'government', 'academic');
CREATE TYPE opportunity_mode AS ENUM ('online', 'offline', 'hybrid');
CREATE TYPE proficiency_level AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE notification_frequency AS ENUM ('immediate', 'daily', 'weekly');
CREATE TYPE notification_type AS ENUM ('new_opportunities', 'deadlines', 'recommendations');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(15),
    password_hash VARCHAR(255) NOT NULL,
    city VARCHAR(100),
    state VARCHAR(100),
    tier INTEGER CHECK (tier IN (2, 3)),
    institution VARCHAR(200),
    degree VARCHAR(100),
    year INTEGER,
    cgpa DECIMAL(3,2),
    technical_skills TEXT[],
    domains TEXT[],
    proficiency_level proficiency_level DEFAULT 'beginner',
    preferred_opportunity_types opportunity_type[],
    preferred_mode opportunity_mode DEFAULT 'any',
    max_distance INTEGER,
    email_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    in_app_notifications BOOLEAN DEFAULT true,
    notification_frequency notification_frequency DEFAULT 'daily',
    notification_types notification_type[] DEFAULT ARRAY['new_opportunities', 'deadlines'],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Opportunities table
CREATE TABLE opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    type opportunity_type NOT NULL,
    organizer_name VARCHAR(200) NOT NULL,
    organizer_type organizer_type NOT NULL,
    organizer_logo VARCHAR(500),
    required_skills TEXT[],
    experience_required VARCHAR(200),
    education_required VARCHAR(200),
    eligibility_criteria TEXT[],
    mode opportunity_mode NOT NULL,
    location VARCHAR(200),
    duration VARCHAR(100),
    stipend VARCHAR(100),
    prizes TEXT[],
    application_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    external_url VARCHAR(1000) NOT NULL,
    source_id VARCHAR(100) NOT NULL,
    tags TEXT[],
    is_active BOOLEAN DEFAULT true,
    quality_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data sources table
CREATE TABLE sources (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    url VARCHAR(500) NOT NULL,
    type VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_scraped_at TIMESTAMP WITH TIME ZONE,
    scrape_frequency_hours INTEGER DEFAULT 24,
    quality_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User searches table
CREATE TABLE user_searches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    filters JSONB,
    result_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User favorites table
CREATE TABLE user_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, opportunity_id)
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
    is_read BOOLEAN DEFAULT false,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Roadmaps table
CREATE TABLE roadmaps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    phases JSONB NOT NULL,
    estimated_duration INTEGER, -- in days
    target_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_location ON users(city, state);
CREATE INDEX idx_opportunities_type ON opportunities(type);
CREATE INDEX idx_opportunities_deadline ON opportunities(application_deadline);
CREATE INDEX idx_opportunities_location ON opportunities(location);
CREATE INDEX idx_opportunities_active ON opportunities(is_active);
CREATE INDEX idx_opportunities_skills ON opportunities USING GIN(required_skills);
CREATE INDEX idx_opportunities_tags ON opportunities USING GIN(tags);
CREATE INDEX idx_user_searches_user_id ON user_searches(user_id);
CREATE INDEX idx_user_searches_created_at ON user_searches(created_at);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);

-- Create full-text search indexes
CREATE INDEX idx_opportunities_search ON opportunities USING GIN(
    to_tsvector('english', title || ' ' || description || ' ' || organizer_name)
);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON opportunities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sources_updated_at BEFORE UPDATE ON sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roadmaps_updated_at BEFORE UPDATE ON roadmaps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data sources
INSERT INTO sources (id, name, url, type) VALUES
('internshala', 'Internshala', 'https://internshala.com', 'job_portal'),
('unstop', 'Unstop', 'https://unstop.com', 'competition_platform'),
('devfolio', 'Devfolio', 'https://devfolio.co', 'hackathon_platform'),
('hackerearth', 'HackerEarth', 'https://hackerearth.com', 'competition_platform'),
('github_jobs', 'GitHub Jobs', 'https://jobs.github.com', 'job_portal');

COMMIT;