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

// Note Groups CRUD
export async function fetchNoteGroups(profileId: number) {
  const { data, error } = await supabase
    .from('note_groups')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function addNoteGroup(name: string, color: string, profileId: number) {
  // Set the profile context first
  try {
    await supabase.rpc('set_profile_context', { profile_id: profileId });
  } catch (contextError) {
    console.warn('⚠️ Failed to set profile context, but continuing:', contextError);
  }

  const { data, error } = await supabase
    .from('note_groups')
    .insert([{ 
      name, 
      color,
      profile_id: profileId // Explicitly set profile_id as fallback
    }])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateNoteGroup(id: string, updates: { name?: string; color?: string }, profileId: number) {
  // Set the profile context first
  try {
    await supabase.rpc('set_profile_context', { profile_id: profileId });
  } catch (contextError) {
    console.warn('⚠️ Failed to set profile context, but continuing:', contextError);
  }

  const { data, error } = await supabase
    .from('note_groups')
    .update(updates)
    .eq('id', id)
    .eq('profile_id', profileId) // Ensure we only update notes from this profile
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteNoteGroup(id: string, profileId: number) {
  // Set the profile context first
  try {
    await supabase.rpc('set_profile_context', { profile_id: profileId });
  } catch (contextError) {
    console.warn('⚠️ Failed to set profile context, but continuing:', contextError);
  }

  const { error } = await supabase
    .from('note_groups')
    .delete()
    .eq('id', id)
    .eq('profile_id', profileId) // Ensure we only delete notes from this profile
  if (error) throw error
}

// Notes CRUD
export async function fetchNotes(profileId: number) {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function addNote(title: string, description: string, note_group_id: string | null, group_id: string | null, link_id: string | null, profileId: number) {
  // Set the profile context first
  try {
    await supabase.rpc('set_profile_context', { profile_id: profileId });
  } catch (contextError) {
    console.warn('⚠️ Failed to set profile context, but continuing:', contextError);
  }

  const { data, error } = await supabase
    .from('notes')
    .insert([{ 
      title, 
      description, 
      note_group_id, 
      group_id, 
      link_id,
      profile_id: profileId // Explicitly set profile_id as fallback
    }])
    .select()
  if (error) throw error
  return data?.[0]
}

export async function updateNote(id: string, updates: { title?: string; description?: string; note_group_id?: string | null; group_id?: string | null; link_id?: string | null }, profileId: number) {
  // Set the profile context first
  try {
    await supabase.rpc('set_profile_context', { profile_id: profileId });
  } catch (contextError) {
    console.warn('⚠️ Failed to set profile context, but continuing:', contextError);
  }

  const { data, error } = await supabase
    .from('notes')
    .update(updates)
    .eq('id', id)
    .eq('profile_id', profileId) // Ensure we only update notes from this profile
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteNote(id: string, profileId: number) {
  // Set the profile context first
  try {
    await supabase.rpc('set_profile_context', { profile_id: profileId });
  } catch (contextError) {
    console.warn('⚠️ Failed to set profile context, but continuing:', contextError);
  }

  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', id)
    .eq('profile_id', profileId) // Ensure we only delete notes from this profile
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

export async function fetchGroups(profileId: number) {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('profile_id', profileId)
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
  
  // For TechKeyz profile (token '1'), count all profiles regardless of wallet
  // For other NFTs, only count profiles for the specific wallet
  const { data, error } = await supabase
    .from('network_profiles')
    .select('*')
    .eq('nft_token_id', nftTokenId)
    .eq(nftTokenId !== '1' ? 'wallet_address' : 'nft_token_id', nftTokenId !== '1' ? walletAddress : nftTokenId)
  
  if (error) {
    console.error('❌ Error counting NFT profiles:', error)
    throw error
  }
  
  const count = data?.length || 0
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
  try {
    // Try to set the RLS context to null, but continue even if it fails
    try {
      await supabase.rpc('set_profile_context', { profile_id: null });
    } catch (contextError) {
      console.warn('⚠️ Failed to clear profile context, but continuing with profile creation:', contextError);
    }

    // Insert new profile with empty positions to ensure no inherited data
    const { data: newProfile, error: profileError } = await supabase
    .from('network_profiles')
    .insert([{
      name: profileName,
      wallet_address: walletAddress,
      nft_token_id: nftTokenId,
        positions: {} // Explicitly set to empty to prevent any inherited data
    }])
    .select()
      .single();
  
    if (profileError) {
      console.error('❌ Error creating new NFT profile:', profileError);
      throw new Error(`Failed to create profile: ${profileError.message}`);
    }

    if (!newProfile) {
      console.error('❌ No profile returned after creation');
      throw new Error('Failed to create profile: No profile data returned');
    }

    console.log('✅ New NFT profile created:', newProfile);

    // Try to set the RLS context to the new profile, but continue even if it fails
    try {
      await supabase.rpc('set_profile_context', { profile_id: newProfile.id });
    } catch (contextError) {
      console.warn('⚠️ Failed to set new profile context, but continuing with group creation:', contextError);
    }

    // Create a default group for the new profile
  try {
      await createDefaultGroupForProfile(newProfile.id);
  } catch (groupError) {
      console.warn('⚠️ Failed to create default group, but profile was created:', groupError);
  }

    // Return the new profile
    return newProfile;
  } catch (error) {
    console.error('❌ Unexpected error creating NFT profile:', error);
    throw error;
  }
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
  const { data: newProfile, error } = await supabase
    .from('network_profiles')
    .insert([{
      name: profileName,
      wallet_address: walletAddress,
      nft_token_id: null, // No NFT token ID for general profiles
      positions: {} // Explicitly set to empty to prevent any inherited data
    }])
    .select()
    .single()
  
  if (error) throw error

  // Create default group for the new profile
  try {
    await createDefaultGroupForProfile(newProfile.id)
  } catch (groupError) {
    console.warn('⚠️ Failed to create default group for profile, but profile was created:', groupError)
  }

  // Ensure no inherited data from TechKeyz or other profiles (check for database triggers)
  // NOTE: If links or data are still inherited, check Supabase dashboard for database triggers or policies
  // that might be copying data from TechKeyz profile (e.g., id 1 or name 'TechKeyz Profile')
  if (newProfile.positions && Object.keys(newProfile.positions).length > 0) {
    console.warn('⚠️ New profile has non-empty positions, resetting to empty');
    await updateNetworkProfile(newProfile.id, { positions: {} });
  }

  return newProfile
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

// Function to create default group for new profiles
export async function createDefaultGroupForProfile(profileId: number): Promise<void> {
  console.log('🎯 Creating default group for profile:', profileId)
  
  try {
    // Try to set the profile context, but continue even if it fails
    try {
      await supabase.rpc('set_profile_context', { profile_id: profileId });
    } catch (contextError) {
      console.warn('⚠️ Failed to set profile context, but continuing with group creation:', contextError);
    }

    // Create the default group with explicit profile_id
  const { error } = await supabase
    .from('groups')
    .insert([{
      name: 'new group',
      color: '#3b82f6',
      display_order: 1,
      note_group_id: null,
        parent_group_id: null,
        profile_id: profileId // Explicitly set the profile_id
    }])
  
  if (error) {
      // If insert fails, try without RLS
      console.warn('⚠️ Failed to create group with RLS, attempting without profile context:', error);
      
      // Clear the profile context
      try {
        await supabase.rpc('set_profile_context', { profile_id: null });
      } catch (clearError) {
        console.warn('⚠️ Failed to clear profile context:', clearError);
      }
      
      // Retry the insert
      const { error: retryError } = await supabase
        .from('groups')
        .insert([{
          name: 'new group',
          color: '#3b82f6',
          display_order: 1,
          note_group_id: null,
          parent_group_id: null,
          profile_id: profileId
        }])
      
      if (retryError) {
        console.error('❌ Error creating default group on retry:', retryError);
        throw retryError;
      }
    }
    
    console.log('✅ Default group "new group" created successfully for profile:', profileId)
  } catch (error) {
    console.error('❌ Error creating default group:', error)
    throw error
  }
}

// Email Alerts CRUD
export async function fetchEmailAlerts(profileId: number) {
  const { data, error } = await supabase
    .from('email_alerts')
    .select('*')
    .eq('profile_id', profileId)
    .order('scheduled_time', { ascending: true })
  if (error) throw error
  return data
}

export async function addEmailAlert(
  email: string,
  recipient: string,
  scheduled_time: string,
  group_id: string | null,
  link_id: string | null,
  note_id: string | null,
  note_group_id: string | null,
  profileId: number
) {
  // Set the profile context first
  try {
    await supabase.rpc('set_profile_context', { profile_id: profileId });
  } catch (contextError) {
    console.warn('⚠️ Failed to set profile context, but continuing:', contextError);
  }

  const { data, error } = await supabase
    .from('email_alerts')
    .insert([{
      email,
      recipient,
      scheduled_time,
      group_id,
      link_id,
      note_id,
      note_group_id,
      profile_id: profileId // Explicitly set profile_id as fallback
    }])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateEmailAlert(
  id: string,
  updates: {
    email?: string;
    recipient?: string;
    scheduled_time?: string;
    group_id?: string | null;
    link_id?: string | null;
    note_id?: string | null;
    note_group_id?: string | null;
    sent?: boolean;
  },
  profileId: number
) {
  // Set the profile context first
  try {
    await supabase.rpc('set_profile_context', { profile_id: profileId });
  } catch (contextError) {
    console.warn('⚠️ Failed to set profile context, but continuing:', contextError);
  }

  const { data, error } = await supabase
    .from('email_alerts')
    .update(updates)
    .eq('id', id)
    .eq('profile_id', profileId) // Ensure we only update alerts from this profile
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteEmailAlert(id: string, profileId: number) {
  // Set the profile context first
  try {
    await supabase.rpc('set_profile_context', { profile_id: profileId });
  } catch (contextError) {
    console.warn('⚠️ Failed to set profile context, but continuing:', contextError);
  }

  const { error } = await supabase
    .from('email_alerts')
    .delete()
    .eq('id', id)
    .eq('profile_id', profileId) // Ensure we only delete alerts from this profile
  if (error) throw error
} 