import { useState, useEffect } from 'react'
import { supabase } from '../config/supabase'
import type { Database } from '../config/supabase'
import { fetchNotes, addNote, updateNote, deleteNote } from '../config/supabase'
import { fetchNoteGroups, addNoteGroup, updateNoteGroup, deleteNoteGroup } from '../config/supabase'

export type Link = Database['public']['Tables']['links']['Row'] & {
  color?: string;
}

interface Group {
  id: string;
  name: string;
  color: string;
  note_group_id: string | null;
  parent_group_id: string | null;
  created_at: string;
  updated_at: string;
  display_order: number;
}

export type NetworkConnection = Database['public']['Tables']['network_connections']['Row']

interface UseSupabaseDataReturn {
  links: Link[]
  groups: Group[]
  networkConnections: NetworkConnection[]
  loading: boolean
  error: string | null
  addLink: (title: string, url: string, group_id?: string | null, note_group_id?: string | null, color?: string) => Promise<Link>
  updateLink: (id: string, updates: Partial<Link>) => Promise<Link>
  deleteLink: (id: string) => Promise<void>
  addGroup: (name: string, color: string, note_group_id?: string | null, parent_group_id?: string | null) => Promise<Group>
  updateGroup: (id: string, updates: Partial<Group>) => Promise<Group>
  deleteGroup: (id: string) => Promise<void>
  addNetworkConnection: (sourceLinkId: string, targetLinkId: string) => Promise<NetworkConnection>
  deleteNetworkConnection: (id: string) => Promise<void>
  setLinks: React.Dispatch<React.SetStateAction<Link[]>>
  setGroups: React.Dispatch<React.SetStateAction<Group[]>>
  refresh: () => Promise<void>
  reload: () => Promise<void>
}

export function useSupabaseData(): UseSupabaseDataReturn {
  const [links, setLinks] = useState<Link[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [networkConnections, setNetworkConnections] = useState<NetworkConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch initial data
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)

        // Fetch links
        const { data: linksData, error: linksError } = await supabase
          .from('links')
          .select('*')
          .order('created_at', { ascending: true })

        if (linksError) throw linksError
        setLinks(linksData || [])

        // Fetch groups
        const { data: groupsData, error: groupsError } = await supabase
          .from('groups')
          .select('*')
          .order('created_at', { ascending: true })

        if (groupsError) throw groupsError
        setGroups(groupsData.map(group => ({
          ...group,
          display_order: group.display_order || 0
        })))

        // Fetch network connections
        const { data: connectionsData, error: connectionsError } = await supabase
          .from('network_connections')
          .select('*')

        if (connectionsError) throw connectionsError
        setNetworkConnections(connectionsData || [])

      } catch (err) {
        console.error('Error fetching data:', err)
        setError(err instanceof Error ? err.message : 'An error occurred while fetching data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    // Set up real-time subscriptions with optimistic updates
    const linksSubscription = supabase
      .channel('links_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'links' }, payload => {
        console.log('Links change:', payload)
        if (payload.eventType === 'INSERT') {
          setLinks(prev => [...prev, payload.new as Link])
        } else if (payload.eventType === 'UPDATE') {
          setLinks(prev => prev.map(link => 
            link.id === payload.new.id ? { ...link, ...payload.new as Link } : link
          ))
        } else if (payload.eventType === 'DELETE') {
          setLinks(prev => prev.filter(link => link.id !== payload.old.id))
        }
      })
      .subscribe((status) => {
        console.log('Links subscription status:', status)
      })

    const groupsSubscription = supabase
      .channel('groups_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, payload => {
        console.log('Groups change:', payload)
        if (payload.eventType === 'INSERT') {
          setGroups(prev => [...prev, payload.new as Group])
        } else if (payload.eventType === 'UPDATE') {
          setGroups(prev => prev.map(group => 
            group.id === payload.new.id ? { ...group, ...payload.new as Group } : group
          ))
        } else if (payload.eventType === 'DELETE') {
          setGroups(prev => prev.filter(group => group.id !== payload.old.id))
        }
      })
      .subscribe((status) => {
        console.log('Groups subscription status:', status)
      })

    const connectionsSubscription = supabase
      .channel('network_connections_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'network_connections' }, payload => {
        console.log('Connections change:', payload)
        if (payload.eventType === 'INSERT') {
          setNetworkConnections(prev => [...prev, payload.new as NetworkConnection])
        } else if (payload.eventType === 'DELETE') {
          setNetworkConnections(prev => prev.filter(conn => conn.id !== payload.old.id))
        }
      })
      .subscribe((status) => {
        console.log('Connections subscription status:', status)
      })

    // Cleanup subscriptions
    return () => {
      linksSubscription.unsubscribe()
      groupsSubscription.unsubscribe()
      connectionsSubscription.unsubscribe()
    }
  }, [])

  // Add a new link with optimistic update
  const addLink = async (title: string, url: string, group_id?: string | null, note_group_id?: string | null, color?: string) => {
    const newLink = {
      id: crypto.randomUUID(), // Temporary ID
      title,
      url,
      group_id: group_id || null,
      note_group_id: note_group_id || null,
      color: color || '#3b82f6',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as Link

    // Optimistically update the UI
    setLinks(prev => [...prev, newLink])

    try {
      const { data, error } = await supabase
        .from('links')
        .insert([{ 
          title, 
          url, 
          group_id: group_id || null, 
          note_group_id: note_group_id || null,
          color: color || '#3b82f6'
        }])
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      // Revert optimistic update on error
      setLinks(prev => prev.filter(link => link.id !== newLink.id))
      throw error
    }
  }

  // Update a link with optimistic update
  const updateLink = async (id: string, updates: Partial<Link>) => {
    // Store the original link for potential rollback
    const originalLink = links.find(link => link.id === id)
    if (!originalLink) {
      throw new Error(`Link with id ${id} not found`)
    }

    // Optimistically update the UI
    setLinks(prev => prev.map(link => 
      link.id === id ? { ...link, ...updates, updated_at: new Date().toISOString() } : link
    ))

    try {
      const { data, error } = await supabase
        .from('links')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        // Revert optimistic update on error
        setLinks(prev => prev.map(link => 
          link.id === id ? originalLink : link
        ))
        throw error
      }
      return data
    } catch (error) {
      // Revert optimistic update on error
      setLinks(prev => prev.map(link => 
        link.id === id ? originalLink : link
      ))
      throw error
    }
  }

  // Delete a link with optimistic update
  const deleteLink = async (id: string) => {
    // Store the link for potential rollback
    const linkToDelete = links.find(link => link.id === id)
    
    // Optimistically update the UI
    setLinks(prev => prev.filter(link => link.id !== id))

    try {
      const { error } = await supabase
        .from('links')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      // Revert optimistic update on error
      if (linkToDelete) {
        setLinks(prev => [...prev, linkToDelete])
      }
      throw error
    }
  }

  // Add a new group with optimistic update
  const addGroup = async (name: string, color: string, note_group_id?: string | null, parent_group_id?: string | null): Promise<Group> => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .insert([{ 
          name, 
          color, 
          note_group_id: note_group_id || null,
          parent_group_id: parent_group_id || null
        }])
        .select('*')
        .single()

      if (error) throw error
      if (data) {
        setGroups(prev => [...prev, data])
        return data
      }
      throw new Error('No data returned from insert')
    } catch (error) {
      console.error('Error adding group:', error)
      throw error
    }
  }

  // Update a group with optimistic update
  const updateGroup = async (id: string, updates: Partial<Group>): Promise<Group> => {
    // Optimistically update the UI
    setGroups(prev => prev.map(group => 
      group.id === id ? { ...group, ...updates, updated_at: new Date().toISOString() } : group
    ))

    try {
      const { data, error } = await supabase
        .from('groups')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      // Revert optimistic update on error
      refresh()
      throw error
    }
  }

  // Delete a group with optimistic update
  const deleteGroup = async (id: string): Promise<void> => {
    // Store the group for potential rollback
    const groupToDelete = groups.find(group => group.id === id)
    
    // Optimistically update the UI
    setGroups(prev => prev.filter(group => group.id !== id))

    try {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (error) {
      // Revert optimistic update on error
      if (groupToDelete) {
        setGroups(prev => [...prev, groupToDelete])
      }
      throw error
    }
  }

  // Add a network connection
  const addNetworkConnection = async (sourceId: string, targetId: string) => {
    const { data, error } = await supabase
      .from('network_connections')
      .insert([{ source_link_id: sourceId, target_link_id: targetId }])
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Delete a network connection
  const deleteNetworkConnection = async (id: string) => {
    const { error } = await supabase
      .from('network_connections')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // Refresh all data
  const refresh = async () => {
    try {
      setLoading(true)
      setError(null)

      const [
        { data: linksData, error: linksError },
        { data: groupsData, error: groupsError },
        { data: connectionsData, error: connectionsError }
      ] = await Promise.all([
        supabase.from('links').select('*').order('created_at', { ascending: true }),
        supabase.from('groups').select('*').order('created_at', { ascending: true }),
        supabase.from('network_connections').select('*')
      ])

      if (linksError) throw linksError
      if (groupsError) throw groupsError
      if (connectionsError) throw connectionsError

      setLinks(linksData || [])
      setGroups(groupsData.map(group => ({
        ...group,
        display_order: group.display_order || 0
      })))
      setNetworkConnections(connectionsData || [])

    } catch (err) {
      console.error('Error refreshing data:', err)
      setError(err instanceof Error ? err.message : 'An error occurred while refreshing data')
    } finally {
      setLoading(false)
    }
  }

  return {
    links,
    groups,
    networkConnections,
    loading,
    error,
    addLink,
    updateLink,
    deleteLink,
    addGroup,
    updateGroup,
    deleteGroup,
    addNetworkConnection,
    deleteNetworkConnection,
    setLinks,
    setGroups,
    refresh,
    reload: refresh
  }
}

export function useNotes() {
  const [notes, setNotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadNotes = async () => {
    setLoading(true)
    try {
      const data = await fetchNotes()
      setNotes(data)
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotes()
  }, [])

  const createNote = async (title: string, description: string, note_group_id: string | null, group_id: string | null, link_id: string | null) => {
    const note = await addNote(title, description, note_group_id, group_id, link_id)
    setNotes(prev => [note, ...prev])
  }

  const editNote = async (id: string, updates: { title?: string; description?: string; note_group_id?: string | null; group_id?: string | null; link_id?: string | null }) => {
    const note = await updateNote(id, updates)
    setNotes(prev => prev.map(n => n.id === id ? note : n))
  }

  const removeNote = async (id: string) => {
    await deleteNote(id)
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  return { notes, loading, error, createNote, editNote, removeNote, reload: loadNotes }
}

export function useNoteGroups() {
  const [noteGroups, setNoteGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadNoteGroups = async () => {
    setLoading(true)
    try {
      const data = await fetchNoteGroups()
      setNoteGroups(data)
      setError(null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNoteGroups()
  }, [])

  const createNoteGroup = async (name: string, color: string) => {
    const group = await addNoteGroup(name, color)
    setNoteGroups(prev => [...prev, group])
  }

  const editNoteGroup = async (id: string, updates: { name?: string; color?: string }) => {
    const group = await updateNoteGroup(id, updates)
    setNoteGroups(prev => prev.map(g => g.id === id ? group : g))
  }

  const removeNoteGroup = async (id: string) => {
    await deleteNoteGroup(id)
    setNoteGroups(prev => prev.filter(g => g.id !== id))
  }

  return { noteGroups, loading, error, createNoteGroup, editNoteGroup, removeNoteGroup, reload: loadNoteGroups }
} 