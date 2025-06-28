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
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          positions: any
          wallet_address?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          positions?: any
          wallet_address?: string | null
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

export async function updateNetworkProfile(id: number, updates: { name?: string; positions?: any }) {
  const { data, error } = await supabase
    .from('network_profiles')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function addNetworkProfile(name: string, positions: any) {
  const { data, error } = await supabase
    .from('network_profiles')
    .insert([{ name, positions }])
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