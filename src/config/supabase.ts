import { createClient } from '@supabase/supabase-js'

// Remote production configuration
const supabaseUrl = 'https://flvydpjkjcxaqhyevszi.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsdnlkcGpramN4YXFoeWV2c3ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1NDkzMDksImV4cCI6MjA2NDEyNTMwOX0.lYbXedS5q_tXtyaKBA6MRlQUvqefiRIFEddCGSLsEqQ'

// Create client with anon key
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  },
  global: {
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`
    }
  }
})

// Type definitions for our database
export type Database = {
  public: {
    Tables: {
      links: {
        Row: {
          id: string
          title: string
          url: string
          group_id: string | null
          note_group_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          url: string
          group_id?: string | null
          note_group_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          url?: string
          group_id?: string | null
          note_group_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      groups: {
        Row: {
          id: string
          name: string
          color: string
          note_group_id: string | null
          parent_group_id: string | null
          created_at: string
          updated_at: string
          display_order: number
        }
        Insert: {
          id?: string
          name: string
          color: string
          note_group_id?: string | null
          parent_group_id?: string | null
          created_at?: string
          updated_at?: string
          display_order?: number
        }
        Update: {
          id?: string
          name?: string
          color?: string
          note_group_id?: string | null
          parent_group_id?: string | null
          created_at?: string
          updated_at?: string
          display_order?: number
        }
      }
      network_connections: {
        Row: {
          id: string
          source_link_id: string
          target_link_id: string
          created_at: string
        }
        Insert: {
          id?: string
          source_link_id: string
          target_link_id: string
          created_at?: string
        }
        Update: {
          id?: string
          source_link_id?: string
          target_link_id?: string
          created_at?: string
        }
      }
      notes: {
        Row: {
          id: string
          title: string
          description: string
          note_group_id: string | null
          group_id: string | null
          link_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          note_group_id?: string | null
          group_id?: string | null
          link_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          note_group_id?: string | null
          group_id?: string | null
          link_id?: string | null
          created_at?: string
        }
      }
      network_profiles: {
        Row: {
          id: number
          name: string
          positions: any
          wallet_address: string | null
          nft_token_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          positions: any
          wallet_address?: string | null
          nft_token_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          positions?: any
          wallet_address?: string | null
          nft_token_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

// Notes CRUD
export async function fetchNotes() {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function addNote(title: string, description: string, note_group_id: string | null, group_id: string | null, link_id: string | null) {
  const { data, error } = await supabase
    .from('notes')
    .insert([{ title, description, note_group_id, group_id, link_id }])
    .select()
  if (error) throw error
  return data?.[0]
}

export async function updateNote(id: string, updates: { title?: string; description?: string; note_group_id?: string | null; group_id?: string | null; link_id?: string | null }) {
  const { data, error } = await supabase
    .from('notes')
    .update(updates)
    .eq('id', id)
    .select()
  if (error) throw error
  return data?.[0]
}

export async function deleteNote(id: string) {
  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// Note Groups CRUD
export async function fetchNoteGroups() {
  const { data, error } = await supabase
    .from('note_groups')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function addNoteGroup(name: string, color: string) {
  const { data, error } = await supabase
    .from('note_groups')
    .insert([{ name, color }])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateNoteGroup(id: string, updates: { name?: string; color?: string }) {
  const { data, error } = await supabase
    .from('note_groups')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteNoteGroup(id: string) {
  const { error } = await supabase
    .from('note_groups')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// Network Profiles CRUD
export async function fetchNetworkProfiles() {
  const { data, error } = await supabase
    .from('network_profiles')
    .select('*')
    .order('id', { ascending: true })
  if (error) throw error
  return data
}

export async function updateNetworkProfile(id: number, updates: { 
  name?: string; 
  positions?: any; 
  wallet_address?: string; 
  nft_token_id?: string;
}) {
  const { data, error } = await supabase
    .from('network_profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function addNetworkProfile(name: string, positions: any, walletAddress?: string, nftTokenId?: string) {
  const { data, error } = await supabase
    .from('network_profiles')
    .insert([{ name, positions, wallet_address: walletAddress, nft_token_id: nftTokenId }])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function fetchGroups() {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .order('display_order', { ascending: true })
  if (error) throw error
  return data
}

export async function updateGroupOrder(id: string, newDisplayOrder: number) {
  const { data, error } = await supabase
    .from('groups')
    .update({ display_order: newDisplayOrder })
    .eq('id', id)
    .select()
  if (error) throw error
  return data?.[0]
}

export async function executeRawSQL(sql: string) {
  const { data, error } = await supabase.rpc('exec_sql', { sql })
  if (error) throw error
  return data
}

// Profile-based data filtering functions
export async function fetchNetworkProfilesByWallet(walletAddress: string) {
  const { data, error } = await supabase
    .from('network_profiles')
    .select('*')
    .eq('wallet_address', walletAddress)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function fetchNetworkProfileByToken(walletAddress: string, tokenId: string) {
  const { data, error } = await supabase
    .from('network_profiles')
    .select('*')
    .eq('wallet_address', walletAddress)
    .eq('nft_token_id', tokenId)
    .single()
  if (error) throw error
  return data
}

// Update network profile with additional fields (legacy alias)
export async function updateNetworkProfileExtended(id: number, updates: { 
  name?: string; 
  positions?: any; 
  wallet_address?: string; 
  nft_token_id?: string;
}) {
  return updateNetworkProfile(id, updates)
}

// Enhanced profile management for multiple profiles per NFT (not per wallet)
export async function countProfilesByNFT(walletAddress: string, nftTokenId: string): Promise<number> {
  console.log('📊 Counting profiles for NFT:', { walletAddress, nftTokenId })
  
  // Fetch all profiles for wallet and filter in JavaScript for more reliability
  const { data, error } = await supabase
    .from('network_profiles')
    .select('*')
    .eq('wallet_address', walletAddress)
  
  if (error) {
    console.error('❌ Error counting NFT profiles:', error)
    throw error
  }
  
  // Filter for profiles with matching NFT token ID
  const nftProfiles = data?.filter(profile => profile.nft_token_id === nftTokenId) || []
  const count = nftProfiles.length
  
  console.log('📊 NFT profile count result:', count)
  return count
}

export async function canCreateNewProfileForNFT(walletAddress: string, nftTokenId: string): Promise<boolean> {
  const count = await countProfilesByNFT(walletAddress, nftTokenId)
  const canCreate = count < 3
  console.log('🔒 Can create new profile for NFT?', {
    walletAddress,
    nftTokenId,
    currentCount: count,
    maxAllowed: 3,
    canCreate
  })
  return canCreate // Allow up to 3 profiles per NFT
}

export async function createEmptyProfileForNFT(walletAddress: string, nftTokenId: string, profileName: string): Promise<any> {
  // Check if user can create a new profile for this specific NFT
  const canCreate = await canCreateNewProfileForNFT(walletAddress, nftTokenId)
  if (!canCreate) {
    throw new Error(`Maximum of 3 profiles allowed per NFT (Token ID: ${nftTokenId})`)
  }

  // Create the profile with empty data - no predefined links, notes, or groups
  const { data, error } = await supabase
    .from('network_profiles')
    .insert([{
      name: profileName,
      wallet_address: walletAddress,
      nft_token_id: nftTokenId,
      positions: {}
    }])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function getNextProfileNumberForNFT(walletAddress: string, nftTokenId: string): Promise<number> {
  const count = await countProfilesByNFT(walletAddress, nftTokenId)
  return count + 1
}

export async function fetchProfilesByNFT(walletAddress: string, nftTokenId: string) {
  // Fetch all profiles for wallet and filter in JavaScript for more reliability
  const { data, error } = await supabase
    .from('network_profiles')
    .select('*')
    .eq('wallet_address', walletAddress)
    .order('created_at', { ascending: true })
  
  if (error) throw error
  
  // Filter for profiles with matching NFT token ID
  const nftProfiles = data?.filter(profile => profile.nft_token_id === nftTokenId) || []
  return nftProfiles
}

export async function fetchAllUserProfilesForWallet(walletAddress: string) {
  // Get all profiles owned by this wallet across all their NFTs
  const { data, error } = await supabase
    .from('network_profiles')
    .select('*')
    .eq('wallet_address', walletAddress)
    .order('nft_token_id', { ascending: true })
    .order('created_at', { ascending: true })
  
  if (error) throw error
  return data
}

// Legacy functions for backward compatibility - now deprecated
export async function countProfilesByWallet(walletAddress: string): Promise<number> {
  console.log('⚠️ Using deprecated countProfilesByWallet - use countProfilesByNFT instead')
  const { count, error } = await supabase
    .from('network_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('wallet_address', walletAddress)
  
  if (error) {
    console.error('❌ Error counting profiles:', error)
    throw error
  }
  console.log('📊 Profile count result:', count)
  return count || 0
}

export async function canCreateNewProfile(walletAddress: string): Promise<boolean> {
  console.log('⚠️ Using deprecated canCreateNewProfile - use canCreateNewProfileForNFT instead')
  const count = await countProfilesByWallet(walletAddress)
  const canCreate = count < 3
  console.log('🔒 Can create new profile?', {
    walletAddress,
    currentCount: count,
    maxAllowed: 3,
    canCreate
  })
  return canCreate // Allow up to 3 profiles per NFT holder
}

export async function createEmptyProfile(walletAddress: string, profileName: string): Promise<any> {
  console.log('⚠️ Using deprecated createEmptyProfile - use createEmptyProfileForNFT instead')
  // Check if user can create a new profile
  const canCreate = await canCreateNewProfile(walletAddress)
  if (!canCreate) {
    throw new Error('Maximum of 3 profiles allowed per NFT holder')
  }

  // Create the profile with empty data - no predefined links, notes, or groups
  const { data, error } = await supabase
    .from('network_profiles')
    .insert([{
      name: profileName,
      wallet_address: walletAddress,
      nft_token_id: null, // No specific token ID - wallet-based ownership
      positions: {} // Empty positions object
    }])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function getNextProfileNumber(walletAddress: string): Promise<number> {
  console.log('⚠️ Using deprecated getNextProfileNumber - use getNextProfileNumberForNFT instead')
  const count = await countProfilesByWallet(walletAddress)
  return count + 1
}

// New General Profile Functions (2 per wallet, editable)
export async function countGeneralProfilesByWallet(walletAddress: string): Promise<number> {
  console.log('📊 Counting general profiles for wallet:', { walletAddress })
  
  // Fetch all profiles for wallet and filter in JavaScript to avoid NULL query issues
  const { data, error } = await supabase
    .from('network_profiles')
    .select('*')
    .eq('wallet_address', walletAddress)
  
  if (error) {
    console.error('❌ Error counting general profiles:', error)
    throw error
  }
  
  // Filter for profiles with no NFT token ID (general profiles)
  const generalProfiles = data?.filter(profile => !profile.nft_token_id) || []
  const count = generalProfiles.length
  
  console.log('📊 General profile count result:', count)
  return count
}

export async function canCreateNewGeneralProfile(walletAddress: string): Promise<boolean> {
  const count = await countGeneralProfilesByWallet(walletAddress)
  const canCreate = count < 2 // Allow up to 2 general profiles per wallet
  console.log('🔒 Can create new general profile?', {
    walletAddress,
    currentCount: count,
    maxAllowed: 2,
    canCreate
  })
  return canCreate
}

export async function createEmptyGeneralProfile(walletAddress: string, profileName: string): Promise<any> {
  // Check if user can create a new general profile
  const canCreate = await canCreateNewGeneralProfile(walletAddress)
  if (!canCreate) {
    throw new Error('Maximum of 2 general profiles allowed per wallet')
  }

  // Create the profile with empty data
  const { data, error } = await supabase
    .from('network_profiles')
    .insert([{
      name: profileName,
      wallet_address: walletAddress,
      nft_token_id: null, // No NFT token ID for general profiles
      positions: {} // Empty positions object
    }])
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function getNextGeneralProfileNumber(walletAddress: string): Promise<number> {
  const count = await countGeneralProfilesByWallet(walletAddress)
  return count + 1
}

export async function fetchGeneralProfilesByWallet(walletAddress: string) {
  // Fetch all profiles for wallet and filter in JavaScript to avoid NULL query issues
  const { data, error } = await supabase
    .from('network_profiles')
    .select('*')
    .eq('wallet_address', walletAddress)
    .order('created_at', { ascending: true })
  
  if (error) throw error
  
  // Filter for profiles with no NFT token ID (general profiles)
  const generalProfiles = data?.filter(profile => !profile.nft_token_id) || []
  return generalProfiles
} 