import { supabase } from '../config/supabase'

async function runNFTMigration() {
  console.log('🔄 Running NFT authentication migration...')
  
  try {
    // Test if the nft_token_id column exists by trying to select it
    const { data, error: testError } = await supabase
      .from('network_profiles')
      .select('nft_token_id')
      .limit(1)
    
    if (!testError) {
      console.log('✅ nft_token_id column already exists!')
      return
    }
    
    if (testError.code === '42703') {
      console.log('📝 NFT authentication columns need to be added manually')
      console.log('')
      console.log('🔧 Please run this SQL in your Supabase SQL Editor:')
      console.log('')
      console.log('-- Add NFT authentication columns')
      console.log('ALTER TABLE network_profiles ')
      console.log('ADD COLUMN IF NOT EXISTS wallet_address TEXT UNIQUE,')
      console.log('ADD COLUMN IF NOT EXISTS nft_token_id TEXT;')
      console.log('')
      console.log('-- Create indexes for better performance')
      console.log('CREATE INDEX IF NOT EXISTS idx_network_profiles_wallet_address ON network_profiles(wallet_address);')
      console.log('CREATE INDEX IF NOT EXISTS idx_network_profiles_nft_token_id ON network_profiles(nft_token_id);')
      console.log('')
      console.log('-- Update existing profiles (optional)')
      console.log('-- UPDATE network_profiles SET nft_token_id = \'430\' WHERE name = \'TechKeyz Profile\';')
      console.log('')
      console.log('📍 Go to: https://supabase.com/dashboard/project/[your-project]/sql')
      console.log('')
      console.log('⚠️  After running the SQL, restart your development server')
    } else {
      console.error('❌ Unexpected error:', testError)
    }
    
  } catch (error) {
    console.error('❌ Error running migration check:', error)
  }
}

// Run the migration
runNFTMigration() 