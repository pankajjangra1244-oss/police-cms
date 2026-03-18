-- Police Case Management System Database Schema
-- Run this script to initialize the database

-- Create database (run as postgres superuser)
-- CREATE DATABASE police_cms;

-- Connect to the database then run below:

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  badge_number VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'officer' CHECK (role IN ('admin', 'officer')),
  department VARCHAR(255),
  phone VARCHAR(20),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Complaints table
CREATE TABLE IF NOT EXISTS complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_number VARCHAR(50) UNIQUE NOT NULL,
  complainant_name VARCHAR(255) NOT NULL,
  mobile VARCHAR(20),
  incident_type VARCHAR(100) NOT NULL,
  date_time TIMESTAMP WITH TIME ZONE,
  location VARCHAR(500),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'under_investigation', 'resolved', 'closed', 'rejected')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  officer_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Evidence / Files table
CREATE TABLE IF NOT EXISTS evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID REFERENCES complaints(id) ON DELETE CASCADE,
  file_name VARCHAR(500) NOT NULL,
  file_path TEXT NOT NULL,
  file_type VARCHAR(50),
  file_size INTEGER,
  mime_type VARCHAR(100),
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity log table
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  complaint_id UUID REFERENCES complaints(id),
  action VARCHAR(100) NOT NULL,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_incident_type ON complaints(incident_type);
CREATE INDEX IF NOT EXISTS idx_complaints_officer_id ON complaints(officer_id);
CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON complaints(created_at);
CREATE INDEX IF NOT EXISTS idx_evidence_complaint_id ON evidence(complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaints_location ON complaints(location);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_complaints_updated_at BEFORE UPDATE ON complaints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed default admin user (password: Admin@123)
INSERT INTO users (name, badge_number, email, password_hash, role, department)
VALUES (
  'Admin Officer',
  'ADMIN001',
  'admin@policecms.gov',
  '$2a$10$rOzJqn4Q0k/DHpBe5lP7S.IYwJ3U4VJ7kCmP4YHqA5T1p7xK1lc3a',
  'admin',
  'Headquarters'
) ON CONFLICT (badge_number) DO NOTHING;

-- Seed default officer (password: Officer@123)
INSERT INTO users (name, badge_number, email, password_hash, role, department)
VALUES (
  'John Kumar',
  'OFF001',
  'john.kumar@policecms.gov',
  '$2a$10$rOzJqn4Q0k/DHpBe5lP7S.IYwJ3U4VJ7kCmP4YHqA5T1p7xK1lc3a',
  'officer',
  'Crime Branch'
) ON CONFLICT (badge_number) DO NOTHING;
