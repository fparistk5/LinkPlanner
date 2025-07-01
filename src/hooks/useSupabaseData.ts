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

export function useSupabaseData(profileId?: number | null): UseSupabaseDataReturn {
  const [links, setLinks] = useState<Link[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [networkConnections, setNetworkConnections] = useState<NetworkConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // Fetch initial data
  useEffect(() => {
    let isMounted = true
    
    async function fetchData() {
      // Don't set loading state if this is not the initial load
      if (isInitialLoad) {
        setLoading(true)
      }
      setError(null)

      try {
        let linksQuery = supabase
          .from('links')
          .select('*')
          .order('created_at', { ascending: true })

        let groupsQuery = supabase
          .from('groups')
          .select('*')
          .order('created_at', { ascending: true })

        // Add profile_id filter if provided
        if (profileId) {
          linksQuery = linksQuery.eq('profile_id', profileId)
          groupsQuery = groupsQuery.eq('profile_id', profileId)
        }

        // Fetch data in parallel
        const [linksResult, groupsResult, connectionsResult] = await Promise.all([
          linksQuery,
          groupsQuery,
          supabase.from('network_connections').select('*')
        ])

        if (!isMounted) return

        // Handle errors
        if (linksResult.error) throw linksResult.error
        if (groupsResult.error) throw groupsResult.error
        if (connectionsResult.error) throw connectionsResult.error

        // Update state only if component is still mounted
        setLinks(linksResult.data || [])
        setGroups(groupsResult.data?.map(group => ({
          ...group,
          display_order: group.display_order || 0
        })) || [])
        setNetworkConnections(connectionsResult.data || [])
        
      } catch (err) {
        if (!isMounted) return
        console.error('Error fetching data:', err)
        setError(err instanceof Error ? err.message : 'An error occurred while fetching data')
      } finally {
        if (isMounted) {
          setLoading(false)
          setIsInitialLoad(false)
        }
      }
    }

    fetchData()

    // Set up real-time subscriptions with optimistic updates and profile filtering
    const linksSubscription = supabase
      .channel('links_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'links',
        filter: profileId ? `profile_id=eq.${profileId}` : undefined
      }, payload => {
        if (!isMounted) return
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
      .subscribe()

    const groupsSubscription = supabase
      .channel('groups_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'groups',
        filter: profileId ? `profile_id=eq.${profileId}` : undefined
      }, payload => {
        if (!isMounted) return
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
      .subscribe()

    // Cleanup subscriptions and prevent state updates after unmount
    return () => {
      isMounted = false
      linksSubscription.unsubscribe()
      groupsSubscription.unsubscribe()
    }
  }, [profileId, isInitialLoad]) // Add isInitialLoad to dependency array

  // Add a new link with profile_id
  const addLink = async (title: string, url: string, group_id?: string | null, note_group_id?: string | null, color?: string) => {
    if (!profileId) throw new Error('No active profile selected')

    const newLink = {
      id: crypto.randomUUID(), // Temporary ID
      title,
      url,
      group_id: group_id || null,
      note_group_id: note_group_id || null,
      color: color || '#3b82f6',
      profile_id: profileId,
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
          color: color || '#3b82f6',
          profile_id: profileId
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

  // Add a new group with profile_id
  const addGroup = async (name: string, color: string, note_group_id?: string | null, parent_group_id?: string | null): Promise<Group> => {
    if (!profileId) throw new Error('No active profile selected')

    const newGroup = {
      id: crypto.randomUUID(), // Temporary ID
      name,
      color,
      note_group_id: note_group_id || null,
      parent_group_id: parent_group_id || null,
      profile_id: profileId,
      display_order: Math.max(0, ...groups.map(g => g.display_order)) + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as Group

    // Optimistically update the UI
    setGroups(prev => [...prev, newGroup])

    try {
      const { data, error } = await supabase
        .from('groups')
        .insert([{
          name,
          color,
          note_group_id: note_group_id || null,
          parent_group_id: parent_group_id || null,
          profile_id: profileId,
          display_order: newGroup.display_order
        }])
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      // Revert optimistic update on error
      setGroups(prev => prev.filter(group => group.id !== newGroup.id))
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

export function useNotes(profileId: number) {
  const [notes, setNotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadNotes = async () => {
    setLoading(true)
    try {
      const data = await fetchNotes(profileId)
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
  }, [profileId])

  const createNote = async (title: string, description: string, note_group_id: string | null, group_id: string | null, link_id: string | null) => {
    const note = await addNote(title, description, note_group_id, group_id, link_id, profileId)
    setNotes(prev => [note, ...prev])
  }

  const editNote = async (id: string, updates: { title?: string; description?: string; note_group_id?: string | null; group_id?: string | null; link_id?: string | null }) => {
    const note = await updateNote(id, updates, profileId)
    setNotes(prev => prev.map(n => n.id === id ? note : n))
  }

  const removeNote = async (id: string) => {
    await deleteNote(id, profileId)
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  return { notes, loading, error, createNote, editNote, removeNote, reload: loadNotes }
}

export function useNoteGroups(profileId: number) {
  const [noteGroups, setNoteGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadNoteGroups = async () => {
    setLoading(true)
    try {
      const data = await fetchNoteGroups(profileId)
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
  }, [profileId])

  const createNoteGroup = async (name: string, color: string) => {
    const group = await addNoteGroup(name, color, profileId)
    setNoteGroups(prev => [...prev, group])
  }

  const editNoteGroup = async (id: string, updates: { name?: string; color?: string }) => {
    const group = await updateNoteGroup(id, updates, profileId)
    setNoteGroups(prev => prev.map(g => g.id === id ? group : g))
  }

  const removeNoteGroup = async (id: string) => {
    await deleteNoteGroup(id, profileId)
    setNoteGroups(prev => prev.filter(g => g.id !== id))
  }

  return { noteGroups, loading, error, createNoteGroup, editNoteGroup, removeNoteGroup, reload: loadNoteGroups }
} 