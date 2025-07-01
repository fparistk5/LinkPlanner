-- Migration: Transition to Dynamic NFT-Based Profiles
-- This script cleans up the old hardcoded profiles and prepares for the new system

-- First, let's preserve any existing TechKeyz profile with token 1
UPDATE network_profiles 
SET wallet_address = NULL, 
    positions = positions::jsonb || '{"x": 0, "y": 0}'::jsonb 
WHERE nft_token_id = '1';

-- Delete any other profiles for this token to avoid duplicates
DELETE FROM network_profiles 
WHERE nft_token_id = '1';

-- Insert sample profiles if needed
INSERT INTO network_profiles (name, wallet_address, nft_token_id, positions) 
VALUES 
  ('TechKeyz Profile', NULL, '1', '{}');
-- Add more sample profiles as needed

-- Update the TechKeyz profile name for consistency
UPDATE network_profiles 
SET name = 'TechKeyz Profile'
WHERE nft_token_id = '1';

-- Remove the generic Profile 2 and Profile 3 entries since they'll be created dynamically
DELETE FROM network_profiles 
WHERE name IN ('Profile 2', 'Profile 3') 
  AND wallet_address IS NULL 
  AND nft_token_id IS NULL;

-- Optional: Create some example profiles for the NFT collection
-- (These would normally be created by users when they connect their wallets)

-- Example profiles for testing (remove these comments if you want to add test data)
-- INSERT INTO network_profiles (name, wallet_address, nft_token_id, positions) VALUES 
-- ('TechKeyz Profile', '0x1234567890123456789012345678901234567890', '430', '{}'),
-- ('Genesis NFT Profile', '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', '1', '{}'),
-- ('Premium NFT Profile', '0x9876543210987654321098765432109876543210', '2', '{}');

-- Reset the sequence to continue from the highest ID
SELECT setval('network_profiles_id_seq', COALESCE((SELECT MAX(id) FROM network_profiles), 0) + 1, false);

-- Verify the changes
SELECT * FROM network_profiles ORDER BY id; 