/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Database {
  public: {
    Tables: {
      network_profiles: {
        Row: {
          id: number
          name: string
          positions: any
          wallet_address: string | null
          nft_token_id: string | null
          token_id: string | null
          token_address: string | null
          contract_address: string | null
          created_at: string
          updated_at: string
        }
        // ... rest of the type definition
      }
      // ... other table definitions
    }
  }
} 