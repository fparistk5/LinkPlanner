-- Add profile_id column to groups table
ALTER TABLE groups ADD COLUMN profile_id INTEGER REFERENCES network_profiles(id) ON DELETE CASCADE;

-- Add profile_id column to links table
ALTER TABLE links ADD COLUMN profile_id INTEGER REFERENCES network_profiles(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX idx_groups_profile_id ON groups(profile_id);
CREATE INDEX idx_links_profile_id ON links(profile_id);

-- Update existing groups to be associated with TechKeyz profile (assuming ID 1)
UPDATE groups SET profile_id = 1 WHERE profile_id IS NULL;

-- Update existing links to be associated with TechKeyz profile (assuming ID 1)
UPDATE links SET profile_id = 1 WHERE profile_id IS NULL;

-- Make profile_id required for future inserts
ALTER TABLE groups ALTER COLUMN profile_id SET NOT NULL;
ALTER TABLE links ALTER COLUMN profile_id SET NOT NULL;

-- Create a function to copy groups and links when creating a new profile
CREATE OR REPLACE FUNCTION copy_profile_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Do not copy data for new profiles
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop any existing trigger
DROP TRIGGER IF EXISTS copy_profile_data_trigger ON network_profiles;

-- Create trigger to handle new profile creation
CREATE TRIGGER copy_profile_data_trigger
    AFTER INSERT ON network_profiles
    FOR EACH ROW
    EXECUTE FUNCTION copy_profile_data();

-- Add RLS policies to ensure profile-specific access
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE links ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS groups_profile_isolation ON groups;
DROP POLICY IF EXISTS links_profile_isolation ON links;

-- Create updated RLS policies that handle null profile_id context
CREATE POLICY groups_profile_isolation ON groups
    FOR ALL
    USING (
        CASE 
            WHEN current_setting('app.profile_id', true) = '' OR current_setting('app.profile_id', true) IS NULL THEN true
            ELSE profile_id = nullif(current_setting('app.profile_id', true), '')::INTEGER
        END
    );

CREATE POLICY links_profile_isolation ON links
    FOR ALL
    USING (
        CASE 
            WHEN current_setting('app.profile_id', true) = '' OR current_setting('app.profile_id', true) IS NULL THEN true
            ELSE profile_id = nullif(current_setting('app.profile_id', true), '')::INTEGER
        END
    ); 