-- Step 1: Add new columns to network_profiles if they don't exist
ALTER TABLE network_profiles
ADD COLUMN IF NOT EXISTS token_id text,
ADD COLUMN IF NOT EXISTS token_address text,
ADD COLUMN IF NOT EXISTS contract_address text;

-- Step 2: Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_network_profiles_contract_address 
ON network_profiles(contract_address) 
WHERE contract_address IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_network_profiles_token_address 
ON network_profiles(token_address) 
WHERE token_address IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_network_profiles_token_lookup
ON network_profiles(contract_address, token_id, token_address)
WHERE contract_address IS NOT NULL 
  AND token_id IS NOT NULL 
  AND token_address IS NOT NULL;

-- Step 3: Create function to check profile limit per NFT
CREATE OR REPLACE FUNCTION check_profile_limit_per_nft()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT COUNT(*)
    FROM network_profiles
    WHERE wallet_address = NEW.wallet_address
    AND nft_token_id = NEW.nft_token_id
  ) >= 3 
  AND TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'Maximum of 3 profiles per NFT allowed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger for profile limit enforcement
DROP TRIGGER IF EXISTS enforce_profile_limit_per_nft ON network_profiles;
CREATE TRIGGER enforce_profile_limit_per_nft
  BEFORE INSERT OR UPDATE ON network_profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_profile_limit_per_nft();

-- Step 5: Update existing profiles to link with their NFTs
UPDATE network_profiles
SET 
  token_id = nft_token_id,
  token_address = wallet_address,
  contract_address = '0x36069BC5d097eF1DF38952B291F50c1AefFECb70'
WHERE 
  nft_token_id IS NOT NULL 
  AND token_id IS NULL;

-- Step 6: Create function to validate token ownership
CREATE OR REPLACE FUNCTION validate_token_ownership(
  p_wallet_address text,
  p_token_id text,
  p_contract_address text
) RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM network_profiles
    WHERE wallet_address = p_wallet_address
    AND token_id = p_token_id
    AND contract_address = p_contract_address
  );
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create view for profile token information
CREATE OR REPLACE VIEW profile_token_info AS
SELECT 
  id,
  name,
  wallet_address,
  nft_token_id,
  token_id,
  token_address,
  contract_address,
  created_at,
  updated_at,
  CASE 
    WHEN contract_address = '0x36069BC5d097eF1DF38952B291F50c1AefFECb70' 
    AND token_id IS NOT NULL 
    THEN true 
    ELSE false 
  END as has_valid_token,
  (SELECT COUNT(*) 
   FROM network_profiles np2 
   WHERE np2.wallet_address = network_profiles.wallet_address 
   AND np2.nft_token_id = network_profiles.nft_token_id) as profile_count
FROM network_profiles;

-- Step 8: Create function to get profile count for NFT
CREATE OR REPLACE FUNCTION get_nft_profile_count(
  p_wallet_address text,
  p_nft_token_id text
) RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM network_profiles
    WHERE wallet_address = p_wallet_address
    AND nft_token_id = p_nft_token_id
  );
END;
$$ LANGUAGE plpgsql;

-- Step 9: Create function to check if can create new profile
CREATE OR REPLACE FUNCTION can_create_profile_for_nft(
  p_wallet_address text,
  p_nft_token_id text
) RETURNS boolean AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) < 3
    FROM network_profiles
    WHERE wallet_address = p_wallet_address
    AND nft_token_id = p_nft_token_id
  );
END;
$$ LANGUAGE plpgsql; 