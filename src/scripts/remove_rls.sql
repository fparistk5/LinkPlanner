-- Disable RLS since we're handling access control in the application
ALTER TABLE network_profiles DISABLE ROW LEVEL SECURITY;
 
-- Drop the policies
DROP POLICY IF EXISTS "Users can view any profile" ON network_profiles;
DROP POLICY IF EXISTS "Users can update their own profiles if they own the NFT" ON network_profiles;
DROP POLICY IF EXISTS "Users can delete their own profiles if they own the NFT" ON network_profiles; 