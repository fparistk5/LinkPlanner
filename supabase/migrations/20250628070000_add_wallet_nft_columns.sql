-- Add missing columns to network_profiles table
ALTER TABLE network_profiles 
ADD COLUMN IF NOT EXISTS wallet_address TEXT,
ADD COLUMN IF NOT EXISTS nft_token_id TEXT;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_network_profiles_wallet_address ON network_profiles(wallet_address);
CREATE INDEX IF NOT EXISTS idx_network_profiles_nft_token_id ON network_profiles(nft_token_id); 