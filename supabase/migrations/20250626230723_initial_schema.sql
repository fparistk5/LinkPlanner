-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create groups table with hierarchical support
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    note_group_id UUID,
    parent_group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create links table
CREATE TABLE links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
    note_group_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create network_connections table
CREATE TABLE network_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_link_id UUID REFERENCES links(id) ON DELETE CASCADE,
    target_link_id UUID REFERENCES links(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notes table
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    note_group_id UUID,
    group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
    link_id UUID REFERENCES links(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create network_profiles table
CREATE TABLE network_profiles (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    positions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_groups_parent_group_id ON groups(parent_group_id);
CREATE INDEX idx_groups_display_order ON groups(display_order);
CREATE INDEX idx_links_group_id ON links(group_id);
CREATE INDEX idx_notes_group_id ON notes(group_id);
CREATE INDEX idx_notes_link_id ON notes(link_id);
CREATE INDEX idx_network_connections_source ON network_connections(source_link_id);
CREATE INDEX idx_network_connections_target ON network_connections(target_link_id);

-- Add constraint to prevent circular references in groups
ALTER TABLE groups ADD CONSTRAINT check_no_self_reference CHECK (id != parent_group_id);

-- Insert default network profiles
INSERT INTO network_profiles (id, name, positions) VALUES 
(1, 'Profile 1', '{}'),
(2, 'Profile 2', '{}'),
(3, 'Profile 3', '{}');

-- Update the sequence to start from 4
SELECT setval('network_profiles_id_seq', 3, true);
