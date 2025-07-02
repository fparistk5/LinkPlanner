-- Fix profile positions handling while preserving TECHKEYZ's data

-- First, backup TECHKEYZ's positions
CREATE TEMP TABLE techkeyz_positions AS
SELECT positions FROM network_profiles WHERE id = 1;

-- Drop existing position-related functions and triggers
DROP TRIGGER IF EXISTS ensure_empty_positions_trigger ON network_profiles;
DROP FUNCTION IF EXISTS ensure_empty_positions();
DROP TRIGGER IF EXISTS initialize_new_profile_trigger ON network_profiles;
DROP FUNCTION IF EXISTS initialize_new_profile();

-- Create a new function to handle positions for new profiles
CREATE OR REPLACE FUNCTION handle_profile_positions()
RETURNS TRIGGER AS $$
BEGIN
    -- For new profiles (INSERT), always start with empty positions
    IF TG_OP = 'INSERT' THEN
        NEW.positions = '{}'::jsonb;
    -- For updates, only allow position changes if it's TECHKEYZ (id = 1)
    ELSIF TG_OP = 'UPDATE' AND OLD.id != 1 AND NEW.positions::text != '{}'::text THEN
        -- Keep positions empty for non-TECHKEYZ profiles
        NEW.positions = '{}'::jsonb;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the new trigger that only fires on INSERT or positions column update
CREATE TRIGGER handle_profile_positions_trigger
    BEFORE INSERT OR UPDATE OF positions ON network_profiles
    FOR EACH ROW
    EXECUTE FUNCTION handle_profile_positions();

-- Restore TECHKEYZ's positions and clear others
UPDATE network_profiles np
SET positions = CASE 
    WHEN np.id = 1 THEN (SELECT positions FROM techkeyz_positions)
    ELSE '{}'::jsonb
END;

-- Drop the temporary table
DROP TABLE techkeyz_positions;

-- Verify the changes
SELECT id, name, positions FROM network_profiles WHERE id IN (1, 58) ORDER BY id; 