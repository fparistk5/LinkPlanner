-- Add wallet_address column to network_profiles table
ALTER TABLE network_profiles 
ADD COLUMN wallet_address TEXT UNIQUE;

-- Create index on wallet_address for better performance
CREATE INDEX idx_network_profiles_wallet_address ON network_profiles(wallet_address);

-- Update existing profiles to have null wallet addresses (they'll need to be connected later)
-- This is safe since existing profiles will be migrated when users connect their wallets 