-- Add token fields to network_profiles table
ALTER TABLE network_profiles
ADD COLUMN IF NOT EXISTS token_id text,
ADD COLUMN IF NOT EXISTS token_address text,
ADD COLUMN IF NOT EXISTS contract_address text;

-- Add index for contract address lookups
CREATE INDEX IF NOT EXISTS idx_network_profiles_contract_address 
ON network_profiles(contract_address) 
WHERE contract_address IS NOT NULL;

-- Add index for token address lookups
CREATE INDEX IF NOT EXISTS idx_network_profiles_token_address 
ON network_profiles(token_address) 
WHERE token_address IS NOT NULL;

-- Add combined index for token lookup
CREATE INDEX IF NOT EXISTS idx_network_profiles_token_lookup
ON network_profiles(contract_address, token_id, token_address)
WHERE contract_address IS NOT NULL 
  AND token_id IS NOT NULL 
  AND token_address IS NOT NULL; 