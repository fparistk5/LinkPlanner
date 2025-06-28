import React, { useState, useEffect } from 'react'
import { useSupabaseData, useNotes, useNoteGroups } from './hooks/useSupabaseData'
import { GraphView } from './components/GraphView'
import { EmailStatus } from './components/EmailStatus'
import { EmailSetupInstructions } from './components/EmailSetupInstructions'
import { EmailTestButton } from './utils/emailTestButton'
import { WalletAuth } from './components/WalletAuth'
import { fetchNetworkProfiles, updateNetworkProfile, updateGroupOrder } from './config/supabase'
import type { Database } from './config/supabase'
import { supabase } from './config/supabase'

type Link = Database['public']['Tables']['links']['Row'] & { color?: string }

// Update the Group type to include display_order and parent_group_id
type Group = Database['public']['Tables']['groups']['Row'] & {
  display_order: number;
  parent_group_id: string | null;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function App() {
  const {
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
    setGroups
  } = useSupabaseData()

  const { notes, loading: notesLoading, error: notesError, createNote, editNote, removeNote, reload: reloadNotes } = useNotes()
  const { noteGroups, loading: noteGroupsLoading, createNoteGroup, editNoteGroup, removeNoteGroup } = useNoteGroups()

  const [newLink, setNewLink] = useState<{ title: string; url: string; group_id?: string; note_group_id?: string; color?: string }>({ 
    title: '', 
    url: '', 
    group_id: '', 
    note_group_id: '', 
    color: '#3b82f6' 
  })
  const [draggedLink, setDraggedLink] = useState<Link | null>(null)
  const [editingLink, setEditingLink] = useState<{ id: string; field: 'title' | 'url' } | null>(null)
  const [editingGroup, setEditingGroup] = useState<string | null>(null)
  const [editingLinkGroup, setEditingLinkGroup] = useState<string | null>(null)
  const [tempEditValue, setTempEditValue] = useState('')
  const [isAddingLink, setIsAddingLink] = useState(false)
  const [isAddingGroup, setIsAddingGroup] = useState(false)
  const [isAddingSubgroup, setIsAddingSubgroup] = useState(false)
  const [newGroup, setNewGroup] = useState({ name: '', color: '#3b82f6', parent_group_id: '' })
  const [noteSearch, setNoteSearch] = useState('')
  const [isAddingNote, setIsAddingNote] = useState(false)
  const [newNote, setNewNote] = useState({ title: '', description: '', note_group_id: '', group_id: '', link_id: '' })
  const [editingNote, setEditingNote] = useState<any | null>(null)
  const [editNoteValue, setEditNoteValue] = useState({ title: '', description: '', note_group_id: '', group_id: '', link_id: '' })
  const [editingNoteGroup, setEditingNoteGroup] = useState<string | null>(null)
  const [editNoteGroupValue, setEditNoteGroupValue] = useState({ name: '', color: '' })
  const [noteGroupsExpanded, setNoteGroupsExpanded] = useState(false)
  const [noteGroupFilter, setNoteGroupFilter] = useState<string | null>(null)
  const [isAddingNoteGroup, setIsAddingNoteGroup] = useState(false)
  const [newNoteGroup, setNewNoteGroup] = useState({ name: '', color: '#3b82f6' })
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [selectedLink, setSelectedLink] = useState<Link | null>(null)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [titleFontSize, setTitleFontSize] = useState(12)
  const [activeProfile, setActiveProfile] = useState<1 | 2 | 3>(1)
  const [networkProfiles, setNetworkProfiles] = useState<any[]>([])
  const [editingProfile, setEditingProfile] = useState<number | null>(null)
  const [profileNameEdits, setProfileNameEdits] = useState<{ [key: number]: string }>({})
  const [profileSaveLoading, setProfileSaveLoading] = useState<{ [key: number]: boolean }>({})
  const [emailAlerts, setEmailAlerts] = useState<any[]>([])
  const [newAlert, setNewAlert] = useState('')
  const [newAlertGroup, setNewAlertGroup] = useState('')
  const [newAlertLink, setNewAlertLink] = useState('')
  const [newAlertNote, setNewAlertNote] = useState('')
  const [newAlertTime, setNewAlertTime] = useState('')
  const [newAlertEmail, setNewAlertEmail] = useState('')
  const [newAlertNoteGroup, setNewAlertNoteGroup] = useState('')
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [draggedGroup, setDraggedGroup] = useState<Group | null>(null)
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [activeGroupView, setActiveGroupView] = useState<'groups' | 'subs' | 'subs2' | 'links'>('groups')
  const [showLinksModal, setShowLinksModal] = useState(false)
  const [collapsedNoteGroups, setCollapsedNoteGroups] = useState<Set<string>>(new Set())
  
  // Wallet authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [connectedWalletAddress, setConnectedWalletAddress] = useState<string | null>(null)
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null)

  const year = calendarDate.getFullYear()
  const month = calendarDate.getMonth()
  const daysInMonth = getDaysInMonth(year, month)
  const firstDayOfWeek = getFirstDayOfWeek(year, month)
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const analytics = {
    totalLinks: links.length,
    groups: groups.length,
    ungroupedLinks: links.filter(link => !link.group_id).length
  }

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newLink.title && newLink.url) {
      try {
        await addLink(newLink.title, newLink.url, newLink.group_id || null, newLink.note_group_id || null, newLink.color || '#3b82f6')
        setNewLink({ title: '', url: '', group_id: '', note_group_id: '', color: '#3b82f6' })
        setIsAddingLink(false)
      } catch (err) {
        console.error('Error adding link:', err)
        // You might want to show an error message to the user here
      }
    }
  }

  const handleDeleteLink = async (id: string) => {
    try {
      await deleteLink(id)
    } catch (err) {
      console.error('Error deleting link:', err)
      // You might want to show an error message to the user here
    }
  }

  const handleDragStart = (e: React.DragEvent, link: Link) => {
    e.dataTransfer.setData('text/plain', link.id)
    e.dataTransfer.effectAllowed = 'move'
    setDraggedLink(link)
    // Add dragging class to the dragged element
    const element = e.currentTarget as HTMLElement
    element.classList.add('dragging')
  }

  const handleDragEnd = (e: React.DragEvent) => {
    // Remove dragging class from all elements
    document.querySelectorAll('.dragging').forEach(el => {
      el.classList.remove('dragging')
    })
    setDraggedLink(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    const element = e.currentTarget as HTMLElement
    element.classList.add('drag-over')
  }

  const handleDragLeave = (e: React.DragEvent) => {
    const element = e.currentTarget as HTMLElement
    element.classList.remove('drag-over')
  }

  const handleDrop = async (e: React.DragEvent, targetGroupId: string | null) => {
    e.preventDefault()
    const element = e.currentTarget as HTMLElement
    element.classList.remove('drag-over')

    if (!draggedLink) return

    try {
      // Update the link's group in the database
      await updateLink(draggedLink.id, { group_id: targetGroupId })
      // Only update the UI after the save is successful
      const updatedLink = { ...draggedLink, group_id: targetGroupId }
      setLinks((prev: Link[]) => prev.map((link: Link) => 
        link.id === draggedLink.id ? updatedLink : link
      ))
    } catch (error) {
      console.error('Error updating link group:', error)
      // Optionally show an error message to the user
    }
  }

  const getLinksForGroup = (groupId: string | null) => {
    return links.filter(link => 
      groupId === 'ungrouped' 
        ? !link.group_id 
        : link.group_id === groupId
    )
  }

  // Helper functions for hierarchical group structure
  const getTopLevelGroups = () => {
    return groups.filter(group => !group.parent_group_id)
  }

  const getSubgroups = (parentGroupId: string) => {
    return groups.filter(group => group.parent_group_id === parentGroupId)
  }

  const getGroupHierarchy = (groupId: string | null): string => {
    if (!groupId) return ''
    const group = groups.find(g => g.id === groupId)
    if (!group) return ''
    
    if (group.parent_group_id) {
      const parentHierarchy = getGroupHierarchy(group.parent_group_id)
      return parentHierarchy ? `${parentHierarchy} > ${group.name}` : group.name
    }
    
    return group.name
  }

  // Helper function to check if a group would create a circular reference
  const wouldCreateCircularReference = (groupId: string, potentialParentId: string): boolean => {
    if (groupId === potentialParentId) return true
    
    const checkParentChain = (currentParentId: string | null): boolean => {
      if (!currentParentId) return false
      if (currentParentId === groupId) return true
      
      const parentGroup = groups.find(g => g.id === currentParentId)
      if (!parentGroup) return false
      
      return checkParentChain(parentGroup.parent_group_id)
    }
    
    return checkParentChain(potentialParentId)
  }

  // Helper functions for group collapsing
  const toggleGroupCollapse = (groupId: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(groupId)) {
        newSet.delete(groupId)
      } else {
        newSet.add(groupId)
      }
      return newSet
    })
  }

  const isGroupCollapsed = (groupId: string) => {
    return collapsedGroups.has(groupId)
  }

  // Helper functions for note group collapsing
  const toggleNoteGroupCollapse = (noteGroupId: string) => {
    setCollapsedNoteGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(noteGroupId)) {
        newSet.delete(noteGroupId)
      } else {
        newSet.add(noteGroupId)
      }
      return newSet
    })
  }

  const isNoteGroupCollapsed = (noteGroupId: string) => {
    return collapsedNoteGroups.has(noteGroupId)
  }

  // Helper function to render notes grouped by note groups
  const renderNotesGrouped = (filteredNotes: any[]) => {
    const notesByGroup: { [key: string]: any[] } = {}
    const ungroupedNotes: any[] = []

    // Group notes by note group
    filteredNotes.forEach(note => {
      if (note.note_group_id) {
        if (!notesByGroup[note.note_group_id]) {
          notesByGroup[note.note_group_id] = []
        }
        notesByGroup[note.note_group_id].push(note)
      } else {
        ungroupedNotes.push(note)
      }
    })

    return (
      <>
        {/* Render grouped notes */}
        {Object.entries(notesByGroup).map(([noteGroupId, groupNotes]) => {
          const noteGroup = noteGroups.find(ng => ng.id === noteGroupId)
          const isCollapsed = isNoteGroupCollapsed(noteGroupId)
          
          return (
            <div key={noteGroupId} style={{ marginBottom: '16px' }}>
              <div 
                onClick={() => toggleNoteGroupCollapse(noteGroupId)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  padding: '8px 12px',
                  background: '#334155',
                  border: '1px solid #475569',
                  borderRadius: '6px',
                  marginBottom: isCollapsed ? 0 : '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    className="group-collapse-button"
                    title={isCollapsed ? 'Expand notes' : 'Collapse notes'}
                  >
                    {isCollapsed ? '▶' : '▼'}
                  </button>
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: noteGroup?.color || '#3b82f6',
                      border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}
                  ></div>
                  <h4 style={{ margin: 0, color: '#ffffff', fontSize: '14px' }}>
                    📝 {noteGroup?.name || 'Unknown Group'} ({groupNotes.length})
                  </h4>
                </div>
              </div>
              
              {!isCollapsed && (
                <div style={{ marginLeft: '16px' }}>
                  {groupNotes.map(note => renderNoteCard(note))}
                </div>
              )}
            </div>
          )
        })}

        {/* Render ungrouped notes */}
        {ungroupedNotes.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              background: '#334155',
              border: '1px solid #475569',
              borderRadius: '6px',
              marginBottom: '8px'
            }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#6b7280',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}
              ></div>
              <h4 style={{ margin: 0, color: '#ffffff', fontSize: '14px' }}>
                📝 Ungrouped Notes ({ungroupedNotes.length})
              </h4>
            </div>
            <div style={{ marginLeft: '16px' }}>
              {ungroupedNotes.map(note => renderNoteCard(note))}
            </div>
          </div>
        )}
      </>
    )
  }

  // Helper function to render individual note card
  const renderNoteCard = (note: any) => (
    <div key={note.id} className="card" style={{ marginBottom: 12 }}>
      {editingNote?.id === note.id ? (
        <form
          onSubmit={async e => {
            e.preventDefault()
            await editNote(note.id, {
              ...editNoteValue,
              note_group_id: editNoteValue.note_group_id === '' ? null : editNoteValue.note_group_id,
              group_id: editNoteValue.group_id === '' ? null : editNoteValue.group_id,
              link_id: editNoteValue.link_id === '' ? null : editNoteValue.link_id
            })
            await reloadNotes()
            setEditingNote(null)
          }}
        >
          <input
            type="text"
            value={editNoteValue.title}
            onChange={e => setEditNoteValue({ ...editNoteValue, title: e.target.value })}
            className="edit-input"
            required
          />
          <textarea
            value={editNoteValue.description}
            onChange={e => setEditNoteValue({ ...editNoteValue, description: e.target.value })}
            className="edit-input"
            required
          />
          <select
            value={editNoteValue.note_group_id || ''}
            onChange={e => setEditNoteValue({ ...editNoteValue, note_group_id: e.target.value })}
            className="edit-input"
            style={{ width: '100%' }}
          >
            <option value="">No Note Group</option>
            {noteGroups.map(ng => (
              <option key={ng.id} value={ng.id}>{ng.name}</option>
            ))}
          </select>
          <select
            value={editNoteValue.group_id || ''}
            onChange={e => setEditNoteValue({ ...editNoteValue, group_id: e.target.value })}
            className="edit-input"
            style={{ width: '100%' }}
          >
            <option value="">No Group</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <select
            value={editNoteValue.link_id || ''}
            onChange={e => setEditNoteValue({ ...editNoteValue, link_id: e.target.value })}
            className="edit-input"
            style={{ width: '100%' }}
          >
            <option value="">No Link</option>
            {links.map(l => (
              <option key={l.id} value={l.id}>{l.title}</option>
            ))}
          </select>
          <div className="button-group">
            <button type="submit" className="save-button">Save</button>
            <button type="button" className="cancel-button" onClick={() => setEditingNote(null)}>Cancel</button>
          </div>
        </form>
      ) : (
        <>
          <h3 style={{ marginBottom: 4 }}>{note.title}</h3>
          <div style={{ marginBottom: 8, color: '#888' }}>{note.description}</div>
          {note.note_group_id && (
            <div style={{ marginBottom: 8, color: '#3b82f6', fontWeight: 500 }}>
              Note Group: {noteGroups.find(g => g.id === note.note_group_id)?.name || 'Unknown'}
            </div>
          )}
          {note.group_id && (
            <div style={{ marginBottom: 8, color: '#10b981', fontWeight: 500 }}>
              Group: {groups.find(g => g.id === note.group_id)?.name || 'Unknown'}
            </div>
          )}
          {note.link_id && (
            <div style={{ marginBottom: 8, color: '#6366f1', fontWeight: 500 }}>
              Link: {links.find(l => l.id === note.link_id)?.title || 'Unknown'}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="button" style={{ fontSize: 12 }} onClick={() => {
              setEditingNote(note)
              setEditNoteValue({ title: note.title, description: note.description, note_group_id: note.note_group_id || '', group_id: note.group_id || '', link_id: note.link_id || '' })
            }}>Edit</button>
            <button className="button cancel-button" style={{ fontSize: 12 }} onClick={() => removeNote(note.id)}>Delete</button>
          </div>
        </>
      )}
    </div>
  )

  // Helper functions for structured group levels
  const getGroupLevel = (group: Group): number => {
    if (!group.parent_group_id) return 0 // Top-level group
    const parent = groups.find(g => g.id === group.parent_group_id)
    if (!parent) return 0
    return getGroupLevel(parent) + 1
  }

  const getGroupsByLevel = (level: number) => {
    return groups.filter(group => getGroupLevel(group) === level)
  }

  const getValidParentsForLevel = (targetLevel: number, excludeGroupId?: string) => {
    if (targetLevel === 0) return [] // Top-level groups have no parents
    if (targetLevel === 1) return getGroupsByLevel(0).filter(g => g.id !== excludeGroupId) // Subs can only have top-level parents
    if (targetLevel === 2) return getGroupsByLevel(1).filter(g => g.id !== excludeGroupId) // Subs2 can only have Subs parents
    return groups.filter(g => {
      if (g.id === excludeGroupId) return false
      if (!excludeGroupId) return true
      return !wouldCreateCircularReference(excludeGroupId, g.id)
    })
  }

  // Render a group and its subgroups recursively (supports unlimited nesting)
  const renderGroupWithSubgroups = (group: Group, level: number = 0): React.ReactElement => {
    const subgroups = getSubgroups(group.id)
    const hasSubgroups = subgroups.length > 0
    const isCollapsed = isGroupCollapsed(group.id)
    const marginLeft = level * 20 // Indent subgroups based on nesting level
    
    return (
      <div key={group.id} style={{ marginLeft }}>
        <div 
          className={`group-container ${dragOverGroupId === group.id ? 'drag-over' : ''} ${draggedGroup?.id === group.id ? 'dragging' : ''}`}
          draggable
          onDragStart={(e) => handleGroupDragStart(e, group)}
          onDragOver={(e) => handleGroupDragOver(e, group.id)}
          onDragLeave={handleGroupDragLeave}
          onDragEnd={handleGroupDragEnd}
          onDrop={(e) => handleGroupDrop(e, group.id)}
        >
          <div className="group-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              {/* Collapse/Expand button for groups with subgroups */}
              {hasSubgroups && (
                <button
                  onClick={() => toggleGroupCollapse(group.id)}
                  className="group-collapse-button"
                  title={isCollapsed ? 'Expand subgroups' : 'Collapse subgroups'}
                >
                  {isCollapsed ? '▶' : '▼'}
                </button>
              )}
              
              {editingGroup === group.id ? (
                <div className="edit-field-container">
                  <input
                    type="text"
                    value={tempEditValue}
                    onChange={(e) => setTempEditValue(e.target.value)}
                    className="edit-input"
                    autoFocus
                  />
                  <select
                    value={group.note_group_id || ''}
                    onChange={async (e) => {
                      await updateGroup(group.id, { note_group_id: e.target.value === '' ? null : e.target.value })
                    }}
                    className="edit-input"
                    style={{ width: '100%' }}
                  >
                    <option value="">No Note Group</option>
                    {noteGroups.map(ng => (
                      <option key={ng.id} value={ng.id}>{ng.name}</option>
                    ))}
                  </select>
                                      <select
                      value={group.parent_group_id || ''}
                      onChange={async (e) => {
                        await updateGroup(group.id, { parent_group_id: e.target.value === '' ? null : e.target.value })
                      }}
                      className="edit-input"
                      style={{ width: '100%' }}
                    >
                      <option value="">📂 No Parent Group (Top Level)</option>
                      {(() => {
                        const currentLevel = getGroupLevel(group)
                        const validParents = getValidParentsForLevel(currentLevel, group.id)
                        
                        if (currentLevel === 0) {
                          return null // Top-level groups can't have parents
                        } else if (currentLevel === 1) {
                          return validParents.map(g => (
                            <option key={g.id} value={g.id}>📁 {g.name} (Top-Level)</option>
                          ))
                        } else if (currentLevel === 2) {
                          return validParents.map(g => (
                            <option key={g.id} value={g.id}>📂 {g.name} (Sub)</option>
                          ))
                        } else {
                          return validParents.map(g => (
                            <option key={g.id} value={g.id}>{getGroupHierarchy(g.id)}</option>
                          ))
                        }
                      })()}
                    </select>
                  <div className="edit-actions">
                    <button onClick={handleSaveEdit} className="save-button">Save</button>
                    <button onClick={handleCancelEdit} className="cancel-button">Cancel</button>
                    <button 
                      onClick={async () => {
                        await deleteGroup(group.id)
                        setEditingGroup(null)
                        setTempEditValue('')
                      }} 
                      className="delete-button"
                      style={{ marginLeft: '8px' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 onClick={() => startEditingGroup(group.id, group.name)} style={{ margin: 0, cursor: 'pointer' }}>
                    {level > 0 && '↳'.repeat(level) + ' '}{group.name}
                  </h3>
                  <input
                    type="color"
                    value={group.color}
                    onChange={(e) => {
                      const newColor = e.target.value
                      updateGroup(group.id, { ...group, color: newColor })
                    }}
                    style={{
                      width: '24px',
                      height: '24px',
                      padding: 0,
                      border: '1px solid #ffffff',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                    title="Change group color"
                  />
                  {group.note_group_id && (
                    <div style={{ color: '#3b82f6', fontWeight: 500 }}>
                      Note Group: {noteGroups.find(ng => ng.id === group.note_group_id)?.name || 'Unknown'}
                    </div>
                  )}
                  {group.parent_group_id && (
                    <div style={{ color: '#94a3b8', fontSize: '12px' }}>
                      Parent: {groups.find(g => g.id === group.parent_group_id)?.name || 'Unknown'}
                    </div>
                  )}

                </div>
              )}
            </div>
          </div>
          
          {/* Group Links */}
          <div className="group-links">
            {getLinksForGroup(group.id).map((link: Link) => (
              <div
                key={link.id}
                className="link-card"
                draggable
                onDragStart={(e) => handleDragStart(e, link)}
                onDragEnd={handleDragEnd}
              >
                {editingLink?.id === link.id && editingLink.field === 'title' ? (
                  <div className="edit-field-container">
                    <input
                      type="text"
                      value={tempEditValue}
                      onChange={(e) => setTempEditValue(e.target.value)}
                      className="edit-input"
                      autoFocus
                    />
                    <select
                      value={link.group_id || ''}
                      onChange={async (e) => {
                        await updateLink(link.id, { group_id: e.target.value === '' ? null : e.target.value })
                      }}
                      className="edit-input"
                      style={{ width: '100%' }}
                    >
                      <option value="">No Group</option>
                      <optgroup label="📁 Groups (Level 0)">
                        {getGroupsByLevel(0).map(g => (
                          <option key={g.id} value={g.id}>📁 {g.name}</option>
                        ))}
                      </optgroup>
                      <optgroup label="📂 Subs (Level 1)">
                        {getGroupsByLevel(1).map(g => (
                          <option key={g.id} value={g.id}>📂 {g.name}</option>
                        ))}
                      </optgroup>
                      <optgroup label="📂 Subs2 (Level 2)">
                        {getGroupsByLevel(2).map(g => (
                          <option key={g.id} value={g.id}>📂 {g.name}</option>
                        ))}
                      </optgroup>
                      {getGroupsByLevel(3).length > 0 && (
                        <optgroup label="📂 Level 3+">
                          {groups.filter(g => getGroupLevel(g) >= 3).map(g => (
                            <option key={g.id} value={g.id}>{getGroupHierarchy(g.id)}</option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                    <input
                      type="color"
                      value={link.color || '#3b82f6'}
                      onChange={async (e) => {
                        try {
                          await updateLink(link.id, { color: e.target.value })
                        } catch (error) {
                          console.error('Error updating link color:', error)
                        }
                      }}
                      style={{
                        width: '24px',
                        height: '24px',
                        padding: 0,
                        border: '1px solid #ffffff',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                      title="Change link color"
                    />
                    <div className="edit-actions">
                      <button onClick={handleSaveEdit} className="save-button">Save</button>
                      <button onClick={handleCancelEdit} className="cancel-button">Cancel</button>
                      <button 
                        onClick={async () => {
                          await handleDeleteLink(link.id)
                          setEditingLink(null)
                          setTempEditValue('')
                        }} 
                        className="delete-button"
                        style={{ marginLeft: '8px' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <h3 onClick={() => startEditing(link.id, 'title', link.title)} style={{ margin: 0, cursor: 'pointer', flex: 1 }}>
                        {link.title}
                      </h3>
                      <button
                        onClick={() => setEditingLinkGroup(editingLinkGroup === link.id ? null : link.id)}
                        className="edit-group-button"
                        style={{ marginRight: '8px' }}
                        title="Edit group assignment"
                      >
                        📝
                      </button>
                      <input
                        type="color"
                        value={link.color || '#3b82f6'}
                        onChange={async (e) => {
                          try {
                            await updateLink(link.id, { color: e.target.value })
                          } catch (error) {
                            console.error('Error updating link color:', error)
                          }
                        }}
                        style={{
                          width: '24px',
                          height: '24px',
                          padding: 0,
                          border: '1px solid #ffffff',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                        title="Change link color"
                      />
                    </div>
                    {editingLinkGroup === link.id && (
                      <div style={{ marginBottom: '8px' }}>
                        <select
                          value={link.group_id || ''}
                          onChange={(e) => handleLinkGroupEdit(link.id, e.target.value === '' ? null : e.target.value)}
                          className="edit-input"
                          style={{ width: '100%' }}
                        >
                          <option value="">📂 No Group</option>
                          <optgroup label="📁 Groups (Level 0)">
                            {getGroupsByLevel(0).map(g => (
                              <option key={g.id} value={g.id}>📁 {g.name}</option>
                            ))}
                          </optgroup>
                          <optgroup label="📂 Subs (Level 1)">
                            {getGroupsByLevel(1).map(g => (
                              <option key={g.id} value={g.id}>📂 {g.name}</option>
                            ))}
                          </optgroup>
                          <optgroup label="📂 Subs2 (Level 2)">
                            {getGroupsByLevel(2).map(g => (
                              <option key={g.id} value={g.id}>📂 {g.name}</option>
                            ))}
                          </optgroup>
                          {getGroupsByLevel(3).length > 0 && (
                            <optgroup label="📂 Level 3+">
                              {groups.filter(g => getGroupLevel(g) >= 3).map(g => (
                                <option key={g.id} value={g.id}>{getGroupHierarchy(g.id)}</option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                      </div>
                    )}
                  </>
                )}
                {editingLink?.id === link.id && editingLink.field === 'url' ? (
                  <div className="edit-field-container">
                    <input
                      type="text"
                      value={tempEditValue}
                      onChange={(e) => setTempEditValue(e.target.value)}
                      className="edit-input"
                      autoFocus
                    />
                    <div className="edit-actions">
                      <button onClick={handleSaveEdit} className="save-button">Save</button>
                      <button onClick={handleCancelEdit} className="cancel-button">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <a 
                    href={link.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.preventDefault()
                      startEditing(link.id, 'url', link.url)
                    }}
                  >
                    {link.url}
                  </a>
                )}
                <button 
                  className="delete-button"
                  onClick={() => handleDeleteLink(link.id)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          
          <button 
            className="delete-button"
            onClick={() => deleteGroup(group.id)}
            style={{ alignSelf: 'flex-end', marginTop: '8px' }}
          >
            Delete Group
          </button>
        </div>
        
        {/* Render subgroups recursively - only if not collapsed */}
        {!isCollapsed && subgroups.sort((a, b) => a.display_order - b.display_order).map(subgroup => 
          renderGroupWithSubgroups(subgroup, level + 1)
        )}
      </div>
    )
  }

  const startEditing = (id: string, field: 'title' | 'url', value: string) => {
    setEditingLink({ id, field })
    setTempEditValue(value)
  }

  const startEditingGroup = (id: string, name: string) => {
    setEditingGroup(id)
    setTempEditValue(name)
  }

  const handleSaveEdit = async () => {
    if (!tempEditValue.trim()) return

    try {
      if (editingLink && editingLink.field) {
        await updateLink(editingLink.id, { [editingLink.field]: tempEditValue })
        setEditingLink(null)
      } else if (editingGroup) {
        await updateGroup(editingGroup, { name: tempEditValue })
        setEditingGroup(null)
      }
      setTempEditValue('')
    } catch (err) {
      console.error('Error saving edit:', err)
    }
  }

  const handleCancelEdit = () => {
    setEditingLink(null)
    setEditingGroup(null)
    setTempEditValue('')
  }

  const handleLinkGroupEdit = async (linkId: string, newGroupId: string | null) => {
    try {
      await updateLink(linkId, { group_id: newGroupId })
      setEditingLinkGroup(null)
    } catch (error) {
      console.error('Error updating link group:', error)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  const handleNoteNodeClick = (noteId: string) => {
    setSelectedNoteId(noteId)
  }

  const handleLinkNodeClick = (linkId: string) => {
    const link = links.find(l => l.id === linkId)
    setSelectedLink(link || null)
  }

  const handleGroupNodeClick = (groupId: string) => {
    setSelectedGroupId(groupId)
    setSelectedLink(null) // Clear selected link when selecting a group
  }

  const handleSavePositions = async (positions: { [key: string]: { x: number; y: number } }) => {
    const profile = getProfile(activeProfile)
    if (!profile) return
    setProfileSaveLoading(prev => ({ ...prev, [profile.id]: true }))
    try {
      const updated = await updateNetworkProfile(profile.id, { positions })
      setNetworkProfiles(prev => prev.map(p => p.id === profile.id ? { ...p, positions: updated.positions } : p))
    } catch (err) {
      alert('Failed to save network layout')
    } finally {
      setProfileSaveLoading(prev => ({ ...prev, [profile.id]: false }))
    }
  }

  const handleLoadProfile = (profileNumber: 1 | 2 | 3) => {
    setActiveProfile(profileNumber)
    // The GraphView component will handle loading the positions on profile change
  }

  // Wallet authentication handlers
  const handleAuthChange = (authenticated: boolean, address: string | null) => {
    setIsAuthenticated(authenticated)
    setConnectedWalletAddress(address)
  }

  const handleWalletProfileLoad = (profileId: number) => {
    setActiveProfile(profileId as 1 | 2 | 3)
    const profile = networkProfiles.find(p => p.id === profileId)
    setCurrentUserProfile(profile)
  }

  const canEditProfile = () => {
    if (!isAuthenticated || !connectedWalletAddress) return false
    const currentProfile = getProfile(activeProfile)
    return currentProfile?.wallet_address === connectedWalletAddress
  }

  useEffect(() => {
    if (!noteGroupsLoading && noteGroups.length === 0) {
      createNoteGroup('General', '#3b82f6')
    }
  }, [noteGroupsLoading, noteGroups, createNoteGroup])

  // Auto-populate email alert form when a note is selected
  useEffect(() => {
    if (selectedNoteId) {
      const selectedNote = notes.find(n => n.id === selectedNoteId)
      if (selectedNote) {
        setNewAlertNote(selectedNoteId)
        // Also populate related fields if they exist
        if (selectedNote.note_group_id) {
          setNewAlertNoteGroup(selectedNote.note_group_id)
        }
        if (selectedNote.group_id) {
          setNewAlertGroup(selectedNote.group_id)
        }
        if (selectedNote.link_id) {
          setNewAlertLink(selectedNote.link_id)
        }
        // Pre-populate alert message with note title
        if (!newAlert.trim()) {
          setNewAlert(`Reminder about: ${selectedNote.title}`)
        }
      }
    }
  }, [selectedNoteId, notes, newAlert])

  // Fetch network profiles from Supabase on mount
  useEffect(() => {
    fetchNetworkProfiles().then(profiles => {
      setNetworkProfiles(profiles)
      setProfileNameEdits(profiles.reduce((acc: any, p: any) => ({ ...acc, [p.id]: p.name }), {}))
    })
  }, [])

  // Load email alerts from Supabase on mount
  useEffect(() => {
    const loadEmailAlerts = async () => {
      try {
        const { data: alerts, error } = await supabase
          .from('email_alerts')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error loading email alerts:', error)
          return
        }

        if (alerts && alerts.length > 0) {
          // Transform Supabase data to match the local state format
          const transformedAlerts = alerts.map(alert => ({
            id: alert.id, // Include database ID for deletion
            email: alert.email,
            group: alert.group_id,
            link: alert.link_id,
            note: alert.note_id,
            noteGroup: alert.note_group_id,
            time: alert.scheduled_time ? new Date(alert.scheduled_time).toLocaleString() : new Date().toLocaleString(),
            recipient: alert.recipient,
            scheduled_time: alert.scheduled_time,
            sent: alert.sent
          }))
          
          setEmailAlerts(transformedAlerts)
          console.log(`✅ Loaded ${alerts.length} email alerts from database`)
        }
      } catch (error) {
        console.error('Error loading email alerts:', error)
      }
    }

    loadEmailAlerts()
  }, [])

  // Check for scheduled emails every minute
  useEffect(() => {
    const checkScheduledEmails = async () => {
      try {
        const { data: pendingAlerts, error } = await supabase
          .from('email_alerts')
          .select('*')
          .eq('sent', false)
          .lte('scheduled_time', new Date().toISOString())

        if (error) {
          console.error('Error checking scheduled emails:', error)
          return
        }

        if (pendingAlerts && pendingAlerts.length > 0) {
          console.log(`📧 Found ${pendingAlerts.length} emails ready to send`)
          
          for (const alert of pendingAlerts) {
            try {
              // Find related items for email context
              const relatedGroup = groups.find(g => g.id === alert.group_id);
              const relatedLink = links.find(l => l.id === alert.link_id);
              const relatedNote = notes.find(n => n.id === alert.note_id);
              const relatedNoteGroup = noteGroups.find(ng => ng.id === alert.note_group_id);

              const { sendEmail } = await import('./services/emailService');
              const emailResult = await sendEmail({
                to: alert.recipient,
                subject: `Web Organizer Alert: ${alert.email}`,
                message: alert.email,
                alertDetails: {
                  scheduledTime: new Date(alert.scheduled_time).toLocaleString(),
                  groupName: relatedGroup?.name,
                  linkTitle: relatedLink?.title,
                  noteName: relatedNote?.title || relatedNoteGroup?.name,
                  noteContent: relatedNote?.description
                }
              });

              if (emailResult.success) {
                // Mark as sent in database
                await supabase
                  .from('email_alerts')
                  .update({ sent: true })
                  .eq('id', alert.id)

                // Update local state
                setEmailAlerts(prev => prev.map(localAlert => 
                  localAlert.id === alert.id 
                    ? { ...localAlert, sent: true }
                    : localAlert
                ))

                console.log(`✅ Scheduled email sent: ${alert.email}`)
              } else {
                console.error(`❌ Failed to send scheduled email: ${alert.email}`, emailResult.error)
              }
            } catch (error) {
              console.error(`❌ Error sending scheduled email: ${alert.email}`, error)
            }
          }
        }
      } catch (error) {
        console.error('Error in scheduled email check:', error)
      }
    }

    // Check immediately on mount
    checkScheduledEmails()

    // Then check every minute
    const interval = setInterval(checkScheduledEmails, 60000)

    return () => clearInterval(interval)
  }, [groups, links, notes, noteGroups]) // Dependencies for finding related items

  // Get profile by id (1, 2, 3)
  const getProfile = (id: number) => networkProfiles.find(p => p.id === id)

  // Handle profile name edit
  const handleProfileNameChange = (id: number, value: string) => {
    setProfileNameEdits(prev => ({ ...prev, [id]: value }))
  }

  // Save profile name to Supabase
  const handleProfileNameSave = async (id: number) => {
    setProfileSaveLoading(prev => ({ ...prev, [id]: true }))
    try {
      const updated = await updateNetworkProfile(id, { name: profileNameEdits[id] })
      setNetworkProfiles(prev => prev.map(p => p.id === id ? { ...p, name: updated.name } : p))
      setEditingProfile(null)
    } catch (err) {
      alert('Failed to save profile name')
    } finally {
      setProfileSaveLoading(prev => ({ ...prev, [id]: false }))
    }
  }

  // Compute a map from date string (YYYY-MM-DD) to links
  const linksByDate: { [date: string]: typeof links } = {};
  links.forEach(link => {
    if (!link.created_at) return;
    const linkDate = new Date(link.created_at);
    if (isNaN(linkDate.getTime())) return;
    const linkLocal = linkDate.getFullYear() + '-' + String(linkDate.getMonth() + 1).padStart(2, '0') + '-' + String(linkDate.getDate()).padStart(2, '0');
    if (!linksByDate[linkLocal]) linksByDate[linkLocal] = [];
    linksByDate[linkLocal].push(link);
  });

  // Compute a map from date string (YYYY-MM-DD) to email alerts
  const alertsByDate: { [date: string]: typeof emailAlerts } = {};
  emailAlerts.forEach(alert => {
    if (!alert.scheduled_time) return;
    const alertDate = new Date(alert.scheduled_time);
    if (isNaN(alertDate.getTime())) return;
    const alertLocal = alertDate.getFullYear() + '-' + String(alertDate.getMonth() + 1).padStart(2, '0') + '-' + String(alertDate.getDate()).padStart(2, '0');
    if (!alertsByDate[alertLocal]) alertsByDate[alertLocal] = [];
    alertsByDate[alertLocal].push(alert);
  });

  // Add these functions for group drag and drop
  const handleGroupDragStart = (e: React.DragEvent, group: Group) => {
    setDraggedGroup(group);
    e.dataTransfer.effectAllowed = 'move';
    // Add some transparency to dragged element
    const target = e.target as HTMLElement;
    setTimeout(() => {
      target.style.opacity = '0.5';
    }, 0);
  };

  const handleGroupDragOver = (e: React.DragEvent, groupId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedGroup || draggedGroup.id === groupId) return;
    
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    
    // Determine if we're in the top or bottom half
    if (e.clientY < midY) {
      target.style.borderTop = '2px solid #3b82f6';
      target.style.borderBottom = '2px solid #e2e8f0';
    } else {
      target.style.borderBottom = '2px solid #3b82f6';
      target.style.borderTop = '2px solid #e2e8f0';
    }
  };

  const handleGroupDragLeave = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.style.borderTop = '2px solid #e2e8f0';
    target.style.borderBottom = '2px solid #e2e8f0';
  };

  const handleGroupDragEnd = (e: React.DragEvent) => {
    const target = e.target as HTMLElement;
    target.style.opacity = '1';
    setDraggedGroup(null);
    setDragOverGroupId(null);
    
    // Reset all group borders
    document.querySelectorAll('.group-container').forEach(group => {
      (group as HTMLElement).style.borderTop = '2px solid #e2e8f0';
      (group as HTMLElement).style.borderBottom = '2px solid #e2e8f0';
    });
  };

  const handleGroupDrop = async (e: React.DragEvent, targetGroupId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedGroup || draggedGroup.id === targetGroupId) return;

    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const isAbove = e.clientY < midY;

    // Get all groups sorted by display_order
    const sortedGroups = [...groups].sort((a, b) => a.display_order - b.display_order);

    const targetIndex = sortedGroups.findIndex(g => g.id === targetGroupId);
    if (targetIndex === -1) return;

    let newOrder: number;
    
    if (isAbove) {
      // Moving above target
      const prevGroup = targetIndex > 0 ? sortedGroups[targetIndex - 1] : null;
      const targetOrder = sortedGroups[targetIndex].display_order;
      const prevOrder = prevGroup ? prevGroup.display_order : targetOrder - 2000;
      newOrder = (prevOrder + targetOrder) / 2;
    } else {
      // Moving below target
      const nextGroup = targetIndex < sortedGroups.length - 1 ? sortedGroups[targetIndex + 1] : null;
      const targetOrder = sortedGroups[targetIndex].display_order;
      const nextOrder = nextGroup ? nextGroup.display_order : targetOrder + 2000;
      newOrder = (targetOrder + nextOrder) / 2;
    }

    try {
      await updateGroupOrder(draggedGroup.id, newOrder);
      // Update local state to reflect the change immediately
      setGroups(prevGroups => {
        return prevGroups.map(group => 
          group.id === draggedGroup.id 
            ? { ...group, display_order: newOrder } 
            : group
        );
      });
    } catch (error) {
      console.error('Error updating group order:', error);
    }

    // Reset styles
    target.style.borderTop = '2px solid #e2e8f0';
    target.style.borderBottom = '2px solid #e2e8f0';
    setDraggedGroup(null);
    setDragOverGroupId(null);
  };

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  if (error) {
    return <div className="error">Error: {error}</div>
  }

  return (
    <div className="min-h-screen bg-gray-100">
    <div className="app">
      <header className="app-header">
        <h1>Web Organization Planner</h1>
      </header>
      
      {/* Wallet Authentication */}
      <div style={{ padding: '16px', maxWidth: '1200px', margin: '0 auto' }}>
        <WalletAuth 
          onProfileLoad={handleWalletProfileLoad}
          currentProfile={getProfile(activeProfile)}
          onAuthChange={handleAuthChange}
        />
      </div>
      
      <main className="app-main">
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <section className="notes-section" style={{
            border: '1px solid #ffffff',
            borderRadius: 8,
            padding: '16px',
            background: '#23272f',
            flex: '1 1 350px',
            minWidth: 320,
            maxWidth: 600
          }}>
            <h2 style={{ color: '#ffffff' }}>Notes</h2>
            <div style={{ marginBottom: 16 }}>
              <input
                type="text"
                placeholder="Search notes..."
                value={noteSearch}
                onChange={e => setNoteSearch(e.target.value)}
                className="edit-input"
                style={{ width: '100%', marginBottom: 8 }}
              />
              <select
                value={noteGroupFilter || ''}
                onChange={e => setNoteGroupFilter(e.target.value || null)}
                className="edit-input"
                style={{ width: '100%', marginBottom: 8 }}
              >
                <option value="">All Note Groups</option>
                {noteGroups.map(group => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                gap: '8px',
                marginBottom: '8px'
              }}>
              <button 
                className="add-link-button" 
                onClick={() => setIsAddingNote(true)}
                disabled={!canEditProfile()}
                style={{
                  opacity: canEditProfile() ? 1 : 0.5,
                  cursor: canEditProfile() ? 'pointer' : 'not-allowed',
                  pointerEvents: canEditProfile() ? 'auto' : 'none'
                }}
                title={!canEditProfile() ? "Connect your wallet to edit" : ""}
              >
                + Add Note
              </button>
                <button 
                  className="add-link-button"
                  onClick={() => setIsAddingNoteGroup(true)}
                  disabled={!canEditProfile()}
                  style={{
                    opacity: canEditProfile() ? 1 : 0.5,
                    cursor: canEditProfile() ? 'pointer' : 'not-allowed',
                    pointerEvents: canEditProfile() ? 'auto' : 'none'
                  }}
                  title={!canEditProfile() ? "Connect your wallet to edit" : ""}
                >
                  + Add Note Group
                </button>
              </div>
            </div>

            {/* Note Groups Management */}
            <div style={{ marginBottom: 16 }}>
              <div 
                onClick={() => setNoteGroupsExpanded(!noteGroupsExpanded)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  padding: '8px 0',
                  borderBottom: noteGroupsExpanded ? '1px solid #475569' : 'none',
                  marginBottom: noteGroupsExpanded ? 8 : 0
                }}
              >
                <h3 style={{ color: '#ffffff', fontSize: 16, margin: 0 }}>
                  Note Groups ({noteGroups.length})
                </h3>
                <span style={{ color: '#94a3b8', fontSize: 14 }}>
                  {noteGroupsExpanded ? '▼' : '▶'}
                </span>
              </div>
              
              {noteGroupsExpanded && (
                <div style={{ background: '#334155', border: '1px solid #475569', borderRadius: 4, overflow: 'hidden' }}>
                  {noteGroups.length === 0 ? (
                    <div style={{ padding: '12px', color: '#94a3b8', fontSize: 13 }}>No note groups yet.</div>
                  ) : (
                    noteGroups.map(noteGroup => (
                    <div key={noteGroup.id} style={{
                      padding: '8px 12px',
                      borderBottom: '1px solid #475569',
                      fontSize: 14
                    }}>
                      {editingNoteGroup === noteGroup.id ? (
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault()
                            await editNoteGroup(noteGroup.id, editNoteGroupValue)
                            setEditingNoteGroup(null)
                            setEditNoteGroupValue({ name: '', color: '' })
                          }}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                            <input
                              type="color"
                              value={editNoteGroupValue.color}
                              onChange={(e) => setEditNoteGroupValue({ ...editNoteGroupValue, color: e.target.value })}
                              style={{
                                width: 24,
                                height: 24,
                                padding: 0,
                                border: 'none',
                                borderRadius: '50%',
                                cursor: 'pointer'
                              }}
                            />
                            <input
                              type="text"
                              value={editNoteGroupValue.name}
                              onChange={(e) => setEditNoteGroupValue({ ...editNoteGroupValue, name: e.target.value })}
                              className="edit-input"
                              style={{ flex: 1, fontSize: 14 }}
                              required
                              autoFocus
                            />
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              type="submit"
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#10b981',
                                cursor: 'pointer',
                                fontSize: 12,
                                padding: '2px 6px'
                              }}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingNoteGroup(null)
                                setEditNoteGroupValue({ name: '', color: '' })
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#94a3b8',
                                cursor: 'pointer',
                                fontSize: 12,
                                padding: '2px 6px'
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div
                              style={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                background: noteGroup.color || '#3b82f6'
                              }}
                            />
                            <span style={{ color: '#f8fafc' }}>{noteGroup.name}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => {
                                setEditingNoteGroup(noteGroup.id)
                                setEditNoteGroupValue({ name: noteGroup.name, color: noteGroup.color || '#3b82f6' })
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#3b82f6',
                                cursor: 'pointer',
                                fontSize: 12,
                                padding: '2px 6px'
                              }}
                              title="Edit note group"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => removeNoteGroup(noteGroup.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#ef4444',
                                cursor: 'pointer',
                                fontSize: 12,
                                padding: '2px 6px'
                              }}
                              title="Delete note group"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    ))
                  )}
                </div>
              )}
            </div>
            {isAddingNoteGroup && (
              <form
                onSubmit={async e => {
                  e.preventDefault()
                  await createNoteGroup(newNoteGroup.name, newNoteGroup.color)
                  setNewNoteGroup({ name: '', color: '#3b82f6' })
                  setIsAddingNoteGroup(false)
                }}
                className="add-link-form"
                style={{ marginBottom: 16 }}
              >
                <input
                  type="text"
                  placeholder="Note Group Name"
                  value={newNoteGroup.name}
                  onChange={e => setNewNoteGroup({ ...newNoteGroup, name: e.target.value })}
                  className="edit-input"
                  required
                />
                <input
                  type="color"
                  value={newNoteGroup.color}
                  onChange={e => setNewNoteGroup({ ...newNoteGroup, color: e.target.value })}
                  className="edit-input"
                  style={{ width: 40, height: 40, padding: 0, border: 'none', background: 'none' }}
                />
                <div className="button-group">
                  <button type="submit" className="save-button">Save</button>
                  <button type="button" className="cancel-button" onClick={() => setIsAddingNoteGroup(false)}>Cancel</button>
                </div>
              </form>
            )}
            {isAddingNote && (
              <form
                onSubmit={async e => {
                  e.preventDefault()
                  await createNote(
                    newNote.title,
                    newNote.description,
                    newNote.note_group_id === '' ? null : newNote.note_group_id,
                    newNote.group_id === '' ? null : newNote.group_id,
                    newNote.link_id === '' ? null : newNote.link_id
                  )
                  setNewNote({ title: '', description: '', note_group_id: '', group_id: '', link_id: '' })
                  setIsAddingNote(false)
                }}
                className="add-link-form"
                style={{ marginBottom: 16 }}
              >
                <input
                  type="text"
                  placeholder="Note Title"
                  value={newNote.title}
                  onChange={e => setNewNote({ ...newNote, title: e.target.value })}
                  className="edit-input"
                  required
                />
                <textarea
                  placeholder="Description"
                  value={newNote.description}
                  onChange={e => setNewNote({ ...newNote, description: e.target.value })}
                  className="edit-input"
                  required
                />
                <select
                  value={newNote.note_group_id || ''}
                  onChange={e => setNewNote({ ...newNote, note_group_id: e.target.value })}
                  className="edit-input"
                  style={{ width: '100%' }}
                >
                  <option value="">No Note Group</option>
                  {noteGroups.map(ng => (
                    <option key={ng.id} value={ng.id}>{ng.name}</option>
                  ))}
                </select>
                <select
                  value={newNote.group_id || ''}
                  onChange={e => setNewNote({ ...newNote, group_id: e.target.value })}
                  className="edit-input"
                  style={{ width: '100%' }}
                >
                  <option value="">No Group</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                <select
                  value={newNote.link_id || ''}
                  onChange={e => setNewNote({ ...newNote, link_id: e.target.value })}
                  className="edit-input"
                  style={{ width: '100%' }}
                >
                  <option value="">No Link</option>
                  {links.map(l => (
                    <option key={l.id} value={l.id}>{l.title}</option>
                  ))}
                </select>
                <div className="button-group">
                  <button type="submit" className="save-button">Save</button>
                  <button type="button" className="cancel-button" onClick={() => setIsAddingNote(false)}>Cancel</button>
                </div>
              </form>
            )}
            {notesLoading ? (
              <div>Loading notes...</div>
            ) : notesError ? (
              <div className="error">{notesError}</div>
            ) : (
                            <div className="notes-list">
                {renderNotesGrouped(notes.filter(note =>
                  (note.title.toLowerCase().includes(noteSearch.toLowerCase()) ||
                  note.description.toLowerCase().includes(noteSearch.toLowerCase())) &&
                  (!noteGroupFilter || note.note_group_id === noteGroupFilter)
                ))}
                {notes.length === 0 && <div>No notes yet.</div>}
              </div>
            )}
        </section>

          {/* Email Alerts Container - side by side with Notes */}
          <section style={{
            background: '#23272f',
            border: '1px solid #64748b',
            borderRadius: 8,
            padding: 16,
            color: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            flex: '1 1 300px',
            minWidth: 260,
            maxWidth: 400
          }}>
            <EmailStatus />
            <EmailSetupInstructions />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0, color: '#fff' }}>Email Alerts</h3>
              <EmailTestButton />
            </div>
            <form
              onSubmit={async e => {
                e.preventDefault()
                if (newAlert.trim() && newAlertEmail.trim()) {
                  const newAlertData = {
                    email: newAlert.trim(),
                    group_id: newAlertGroup || null,
                    link_id: newAlertLink || null,
                    note_id: newAlertNote || null,
                    note_group_id: newAlertNoteGroup || null,
                    recipient: newAlertEmail,
                    scheduled_time: newAlertTime ? new Date(newAlertTime).toISOString() : new Date().toISOString(),
                    sent: false
                  };

                  // Find related items for email context
                  const relatedGroup = groups.find(g => g.id === newAlertGroup);
                  const relatedLink = links.find(l => l.id === newAlertLink);
                  const relatedNote = notes.find(n => n.id === newAlertNote);
                  const relatedNoteGroup = noteGroups.find(ng => ng.id === newAlertNoteGroup);

                  // Determine if we should send immediately or schedule
                  const scheduledDate = newAlertTime ? new Date(newAlertTime) : new Date();
                  const now = new Date();
                  const shouldSendNow = !newAlertTime || scheduledDate <= now;

                  let emailSent = false;
                  if (shouldSendNow) {
                    // Send email immediately
                    try {
                      const { sendEmail } = await import('./services/emailService');
                      const emailResult = await sendEmail({
                        to: newAlertEmail,
                        subject: `Web Organizer Alert: ${newAlert.trim()}`,
                        message: newAlert.trim(),
                        alertDetails: {
                          scheduledTime: newAlertTime || new Date().toLocaleString(),
                          groupName: relatedGroup?.name,
                          linkTitle: relatedLink?.title,
                          noteName: relatedNote?.title || relatedNoteGroup?.name,
                          noteContent: relatedNote?.description
                        }
                      });

                      if (emailResult.success) {
                        console.log('✅ Email sent successfully via:', emailResult.method);
                        emailSent = true;
                      } else {
                        console.error('❌ Email failed:', emailResult.error);
                        alert(`❌ Email sending failed: ${emailResult.error}`);
                      }
                    } catch (error) {
                      console.error('❌ Email service error:', error);
                      alert('❌ Email service error. Check console for details.');
                    }
                  } else {
                    console.log(`📅 Email scheduled for: ${scheduledDate.toLocaleString()}`);
                  }

                  // Save to Supabase (cloud database) first to get the ID
                  let savedAlert = null;
                  try {
                    const { data, error } = await supabase
                      .from('email_alerts')
                      .insert([{ ...newAlertData, sent: emailSent }])
                      .select()
                      .single();
                    if (error) throw error;
                    savedAlert = data;
                    console.log('✅ Email alert saved to Supabase:', data);
                  } catch (error) {
                    console.error('⚠️ Warning: Could not save to Supabase database:', error);
                    // Continue anyway
                  }

                  // Add to local state (with database ID if available)
                  const alertToAdd = {
                    id: savedAlert?.id || null, // Include database ID for future deletion
                    ...newAlertData,
                    group: newAlertGroup || null,
                    link: newAlertLink || null,
                    note: newAlertNote || null,
                    noteGroup: newAlertNoteGroup || null,
                    time: newAlertTime || new Date().toLocaleString(),
                    recipient: newAlertEmail,
                    sent: emailSent
                  };
                  setEmailAlerts(prev => [...prev, alertToAdd]);

                  setNewAlert('');
                  setNewAlertGroup('');
                  setNewAlertLink('');
                  setNewAlertNote('');
                  setNewAlertNoteGroup('');
                  setNewAlertTime('');
                  setNewAlertEmail('');
                } else {
                  alert('Please provide both an alert message and recipient email.');
                }
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}
            >
              <input
                type="text"
                placeholder="Alert Message"
                value={newAlert}
                onChange={e => setNewAlert(e.target.value)}
                className="edit-input"
                style={{ width: '100%', marginBottom: 8 }}
              />
              <input
                type="email"
                placeholder="Recipient Email"
                value={newAlertEmail}
                onChange={e => setNewAlertEmail(e.target.value)}
                className="edit-input"
                style={{ width: '100%', marginBottom: 8 }}
              />
              <input
                type="datetime-local"
                placeholder="Send Date and Time (optional)"
                value={newAlertTime}
                onChange={e => setNewAlertTime(e.target.value)}
                className="edit-input"
                style={{ width: '100%', marginBottom: 8 }}
              />
              <select
                value={newAlertGroup}
                onChange={e => setNewAlertGroup(e.target.value)}
                className="edit-input"
                style={{ width: '100%', marginBottom: 8 }}
              >
                <option value="">Select Group (optional)</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              <select
                value={newAlertLink}
                onChange={e => setNewAlertLink(e.target.value)}
                className="edit-input"
                style={{ width: '100%', marginBottom: 8 }}
              >
                <option value="">Select Link (optional)</option>
                {links.map(l => (
                  <option key={l.id} value={l.id}>{l.title}</option>
                ))}
              </select>
              <select
                value={newAlertNoteGroup}
                onChange={e => setNewAlertNoteGroup(e.target.value)}
                className="edit-input"
                style={{ width: '100%', marginBottom: 8 }}
              >
                <option value="">Select Note Group (optional)</option>
                {noteGroups.map(ng => (
                  <option key={ng.id} value={ng.id}>{ng.name}</option>
                ))}
              </select>
              <select
                value={newAlertNote}
                onChange={e => setNewAlertNote(e.target.value)}
                className="edit-input"
                style={{ 
                  width: '100%', 
                  marginBottom: 8,
                  background: newAlertNote && selectedNoteId === newAlertNote ? '#1e40af' : '',
                  color: newAlertNote && selectedNoteId === newAlertNote ? '#fff' : ''
                }}
              >
                <option value="">Select Note (optional)</option>
                {notes.filter(n => !newAlertNoteGroup || n.note_group_id === newAlertNoteGroup).map(n => (
                  <option key={n.id} value={n.id}>
                    {n.title} {selectedNoteId === n.id ? '(Selected)' : ''}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 4, padding: '8px 16px', cursor: 'pointer' }}
              >
                Add Alert
              </button>
            </form>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {emailAlerts.length === 0 && (
                <li style={{ color: '#94a3b8', fontSize: 14 }}>No alerts yet.</li>
              )}
              {emailAlerts.map((alert, idx) => (
                <li key={idx} style={{
                  background: '#334155',
                  border: '1px solid #475569',
                  borderRadius: 4,
                  padding: '8px 12px',
                  marginBottom: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  color: '#f8fafc',
                  fontSize: 15
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{alert.email}</span>
                      <span style={{ 
                        fontSize: 12, 
                        padding: '2px 6px', 
                        borderRadius: 12, 
                        background: alert.sent ? '#10b981' : '#f59e0b',
                        color: '#fff',
                        fontWeight: 'bold'
                      }}>
                        {alert.sent ? '✅ Sent' : '⏰ Scheduled'}
                      </span>
                    </div>
                    <button
                      onDoubleClick={async () => {
                        // Remove from database if it has an ID
                        if (alert.id) {
                          try {
                            const { error } = await supabase
                              .from('email_alerts')
                              .delete()
                              .eq('id', alert.id)
                            
                            if (error) {
                              console.error('Error deleting email alert from database:', error)
                              alert('Failed to delete alert from database')
                              return
                            }
                            console.log('✅ Email alert deleted from database')
                          } catch (error) {
                            console.error('Error deleting email alert:', error)
                            alert('Failed to delete alert')
                            return
                          }
                        }
                        
                        // Remove from local state
                        setEmailAlerts(prev => prev.filter((_, i) => i !== idx))
                      }}
                      style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontSize: 13 }}
                      title="Double-click to remove this alert"
                    >
                      Remove
                    </button>
                  </div>
                  <div style={{ fontSize: 13, color: '#94a3b8' }}>
                    {alert.group && <span>Group: {groups.find(g => g.id === alert.group)?.name} </span>}
                    {alert.link && <span>Link: {links.find(l => l.id === alert.link)?.title} </span>}
                    {alert.note && (() => {
                      const foundNote = notes.find(n => n.id === alert.note);
                      return foundNote ? <span>Note: {foundNote.title} </span> : null;
                    })()}
                    {alert.noteGroup && <span>Note Group: {noteGroups.find(ng => ng.id === alert.noteGroup)?.name} </span>}
                    {alert.time && <span>Time: {alert.time} </span>}
                    {alert.recipient && <span>Recipient: {alert.recipient}</span>}
                    {!(alert.group || alert.link || alert.note || alert.noteGroup || alert.time || alert.recipient) && <span>No details</span>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="groups-links-section" style={{
          border: '1px solid #ffffff',
          borderRadius: 8,
          padding: '16px',
          background: '#23272f'
        }}>
          <h2 style={{ color: '#ffffff' }}>Groups & Links</h2>
          <div className="groups-container" style={{ maxHeight: 'calc(180vh - 100px)', overflowY: 'auto' }}>
              {/* Add Group Form */}
              <div className="add-link-container">
                {!isAddingGroup ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button 
                      className="add-link-button"
                      onClick={() => {
                        setNewGroup({ name: '', color: '#3b82f6', parent_group_id: '' })
                        setIsAddingGroup(true)
                      }}
                      disabled={!canEditProfile()}
                      style={{
                        opacity: canEditProfile() ? 1 : 0.5,
                        cursor: canEditProfile() ? 'pointer' : 'not-allowed',
                        pointerEvents: canEditProfile() ? 'auto' : 'none'
                      }}
                      title={!canEditProfile() ? "Connect your wallet to edit" : ""}
                    >
                      + Add New Group
                    </button>
                    <button 
                      className="add-link-button"
                      onClick={() => {
                        setNewGroup({ name: '', color: '#3b82f6', parent_group_id: '' })
                        setIsAddingGroup(true)
                        setIsAddingSubgroup(true)
                      }}
                      disabled={!canEditProfile() || groups.filter(g => !g.parent_group_id).length === 0}
                      style={{
                        opacity: (canEditProfile() && groups.filter(g => !g.parent_group_id).length > 0) ? 1 : 0.5,
                        cursor: (canEditProfile() && groups.filter(g => !g.parent_group_id).length > 0) ? 'pointer' : 'not-allowed',
                        pointerEvents: (canEditProfile() && groups.filter(g => !g.parent_group_id).length > 0) ? 'auto' : 'none'
                      }}
                      title={!canEditProfile() ? "Connect your wallet to edit" : groups.filter(g => !g.parent_group_id).length === 0 ? "Create a top-level group first" : "Add subgroup to existing group"}
                    >
                      + Sub
                    </button>
                    <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                      <button 
                        className="add-link-button"
                        onClick={() => {
                          // Find a Sub (level 1) group to set as parent
                          const subGroups = getGroupsByLevel(1)
                          if (subGroups.length > 0) {
                            setNewGroup({ name: '', color: '#3b82f6', parent_group_id: subGroups[0].id })
                          } else {
                            setNewGroup({ name: '', color: '#3b82f6', parent_group_id: '' })
                          }
                          setIsAddingGroup(true)
                          setIsAddingSubgroup(true)
                        }}
                        disabled={!canEditProfile() || getGroupsByLevel(1).length === 0}
                        style={{
                          opacity: (canEditProfile() && getGroupsByLevel(1).length > 0) ? 1 : 0.5,
                          cursor: (canEditProfile() && getGroupsByLevel(1).length > 0) ? 'pointer' : 'not-allowed',
                          pointerEvents: (canEditProfile() && getGroupsByLevel(1).length > 0) ? 'auto' : 'none'
                        }}
                        title={!canEditProfile() ? "Connect your wallet to edit" : getGroupsByLevel(1).length === 0 ? "Create a Sub group first" : "Add Sub2 under existing Sub group"}
                      >
                        + Sub2
                      </button>
                    </div>
                  </div>
                ) : (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault()
                      if (newGroup.name.trim()) {
                        await addGroup(newGroup.name, newGroup.color, null, newGroup.parent_group_id || null)
                        setNewGroup({ name: '', color: '#3b82f6', parent_group_id: '' })
                        setIsAddingGroup(false)
                        setIsAddingSubgroup(false)
                      }
                    }}
                    className="add-link-form"
                  >
                    <input
                      type="text"
                      placeholder={isAddingSubgroup ? "Subgroup Name" : "Group Name"}
                      value={newGroup.name}
                      onChange={e => setNewGroup({ ...newGroup, name: e.target.value })}
                      className="edit-input"
                      required
                    />
                    <input
                      type="color"
                      value={newGroup.color}
                      onChange={e => setNewGroup({ ...newGroup, color: e.target.value })}
                      className="edit-input"
                      style={{ width: 40, height: 40, padding: 0, border: 'none', background: 'none' }}
                    />
                    <select
                      value={newGroup.parent_group_id || ''}
                      onChange={e => setNewGroup({ ...newGroup, parent_group_id: e.target.value })}
                      className="edit-input"
                      style={{ width: '100%' }}
                      required={isAddingSubgroup}
                    >
                      <option value="">{isAddingSubgroup ? "Select Parent Group" : "📂 No Parent Group (Top Level)"}</option>
                      {(() => {
                        if (isAddingSubgroup) {
                          // For subgroups, determine what level we're creating based on selected parent
                          const selectedParent = groups.find(g => g.id === newGroup.parent_group_id)
                          const targetLevel = selectedParent ? getGroupLevel(selectedParent) + 1 : 1
                          
                          if (targetLevel === 1) {
                            // Creating Subs - can only select Groups as parents
                            return (
                              <optgroup label="📁 Groups (Level 0)">
                                {getGroupsByLevel(0).map(g => (
                                  <option key={g.id} value={g.id}>📁 {g.name}</option>
                                ))}
                              </optgroup>
                            )
                          } else if (targetLevel === 2) {
                            // Creating Subs2 - can only select Subs as parents
                            return (
                              <optgroup label="📂 Subs (Level 1)">
                                {getGroupsByLevel(1).map(g => (
                                  <option key={g.id} value={g.id}>📂 {g.name}</option>
                                ))}
                              </optgroup>
                            )
                          } else {
                            // Creating deeper levels - show all possible parents
                            return (
                              <>
                                <optgroup label="📁 Groups (Level 0)">
                                  {getGroupsByLevel(0).map(g => (
                                    <option key={g.id} value={g.id}>📁 {g.name}</option>
                                  ))}
                                </optgroup>
                                <optgroup label="📂 Subs (Level 1)">
                                  {getGroupsByLevel(1).map(g => (
                                    <option key={g.id} value={g.id}>📂 {g.name}</option>
                                  ))}
                                </optgroup>
                                <optgroup label="📂 Subs2 (Level 2)">
                                  {getGroupsByLevel(2).map(g => (
                                    <option key={g.id} value={g.id}>📂 {g.name}</option>
                                  ))}
                                </optgroup>
                              </>
                            )
                          }
                        } else {
                          // For top-level groups, optionally allow them to have parents too
                          return (
                            <>
                              <optgroup label="📁 Groups (Level 0)">
                                {getGroupsByLevel(0).map(g => (
                                  <option key={g.id} value={g.id}>📁 {g.name}</option>
                                ))}
                              </optgroup>
                              <optgroup label="📂 Subs (Level 1)">
                                {getGroupsByLevel(1).map(g => (
                                  <option key={g.id} value={g.id}>📂 {g.name}</option>
                                ))}
                              </optgroup>
                              <optgroup label="📂 Subs2 (Level 2)">
                                {getGroupsByLevel(2).map(g => (
                                  <option key={g.id} value={g.id}>📂 {g.name}</option>
                                ))}
                              </optgroup>
                            </>
                          )
                        }
                      })()}
                    </select>
                    <div className="button-group">
                      <button type="submit" className="save-button">Save</button>
                      <button 
                        type="button" 
                        className="cancel-button"
                        onClick={() => {
                          setIsAddingGroup(false)
                          setIsAddingSubgroup(false)
                          setNewGroup({ name: '', color: '#3b82f6', parent_group_id: '' })
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>

            {/* Add Link Form */}
            <div className="add-link-container">
              {!isAddingLink ? (
                <button 
                  className="add-link-button"
                  onClick={() => setIsAddingLink(true)}
                  disabled={!canEditProfile()}
                  style={{
                    opacity: canEditProfile() ? 1 : 0.5,
                    cursor: canEditProfile() ? 'pointer' : 'not-allowed',
                    pointerEvents: canEditProfile() ? 'auto' : 'none'
                  }}
                  title={!canEditProfile() ? "Connect your wallet to edit" : ""}
                >
                  + Add New Link
                </button>
              ) : (
                <form onSubmit={handleAddLink} className="add-link-form">
                  <input
                    type="text"
                    placeholder="Link Title"
                    value={newLink.title}
                    onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
                    className="edit-input"
                    required
                  />
                  <input
                    type="url"
                    placeholder="URL"
                    value={newLink.url}
                    onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                    className="edit-input"
                    required
                  />
                  <input
                    type="color"
                    value={newLink.color || '#3b82f6'}
                    onChange={(e) => setNewLink({ ...newLink, color: e.target.value })}
                    className="edit-input"
                    style={{ width: 40, height: 40, padding: 0, border: 'none', background: 'none' }}
                  />
                    <select
                      value={newLink.group_id || ''}
                      onChange={e => setNewLink({ ...newLink, group_id: e.target.value })}
                      className="edit-input"
                      style={{ width: '100%' }}
                    >
                      <option value="">No Group</option>
                      <optgroup label="📁 Groups (Level 0)">
                        {getGroupsByLevel(0).map(g => (
                          <option key={g.id} value={g.id}>📁 {g.name}</option>
                        ))}
                      </optgroup>
                      <optgroup label="📂 Subs (Level 1)">
                        {getGroupsByLevel(1).map(g => (
                          <option key={g.id} value={g.id}>📂 {g.name}</option>
                        ))}
                      </optgroup>
                      <optgroup label="📂 Subs2 (Level 2)">
                        {getGroupsByLevel(2).map(g => (
                          <option key={g.id} value={g.id}>📂 {g.name}</option>
                        ))}
                      </optgroup>
                      {getGroupsByLevel(3).length > 0 && (
                        <optgroup label="📂 Level 3+">
                          {groups.filter(g => getGroupLevel(g) >= 3).map(g => (
                            <option key={g.id} value={g.id}>{getGroupHierarchy(g.id)}</option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                    <div className="button-group">
                      <button type="submit" className="save-button">Save</button>
                    <button 
                      type="button" 
                      className="cancel-button"
                      onClick={() => {
                        setIsAddingLink(false)
                        setNewLink({ title: '', url: '', group_id: '', note_group_id: '', color: '#3b82f6' })
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Ungrouped Links */}
            <div 
              className="group-container"
              onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, null)}
            >
                <h3>Ungrouped Links</h3>
                <div className="links-container">
                  {links
                    .filter(link => !link.group_id)
                    .map(link => (
                  <div
                    key={link.id}
                    className="link-card"
                    draggable
                        onDragStart={(e) => handleDragStart(e, link)}
                        onDragEnd={handleDragEnd}
                  >
                    {editingLink?.id === link.id && editingLink.field === 'title' ? (
                      <div className="edit-field-container">
                        <input
                          type="text"
                          value={tempEditValue}
                          onChange={(e) => setTempEditValue(e.target.value)}
                          className="edit-input"
                          autoFocus
                        />
                            <select
                              value={link.group_id || ''}
                              onChange={async (e) => {
                                await updateLink(link.id, { group_id: e.target.value === '' ? null : e.target.value })
                              }}
                              className="edit-input"
                              style={{ width: '100%' }}
                            >
                              <option value="">No Group</option>
                              {groups.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                              ))}
                            </select>
                        <input
                          type="color"
                          value={link.color || '#3b82f6'}
                          onChange={async (e) => {
                            try {
                              await updateLink(link.id, { color: e.target.value })
                            } catch (error) {
                              console.error('Error updating link color:', error)
                              // Optionally show an error message to the user
                            }
                          }}
                          className="edit-input"
                          style={{ width: 40, height: 40, padding: 0, border: 'none', background: 'none' }}
                        />
                        <div className="edit-actions">
                              <button onClick={handleSaveEdit} className="save-button">Save</button>
                              <button onClick={handleCancelEdit} className="cancel-button">Cancel</button>
                              <button 
                                onClick={async () => {
                                  await handleDeleteLink(link.id)
                                  setEditingLink(null)
                                  setTempEditValue('')
                                }} 
                                className="delete-button"
                                style={{ marginLeft: '8px' }}
                              >
                                Delete
                              </button>
                        </div>
                      </div>
                                            ) : (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <h3 onClick={() => startEditing(link.id, 'title', link.title)} style={{ margin: 0, cursor: 'pointer', flex: 1 }}>
                                {link.title}
                              </h3>
                                                                   <button
                                       onClick={() => setEditingLinkGroup(editingLinkGroup === link.id ? null : link.id)}
                                       className="edit-group-button"
                                       title="Edit group assignment"
                                     >
                                       📝
                                     </button>
                            </div>
                            {editingLinkGroup === link.id && (
                              <div style={{ marginBottom: '8px' }}>
                                <select
                                  value={link.group_id || ''}
                                  onChange={(e) => handleLinkGroupEdit(link.id, e.target.value === '' ? null : e.target.value)}
                                  className="edit-input"
                                  style={{ width: '100%' }}
                                >
                                  <option value="">📂 No Group</option>
                                  <optgroup label="📁 Top-Level Groups">
                                    {groups.filter(g => !g.parent_group_id).map(g => (
                                      <option key={g.id} value={g.id}>📁 {g.name}</option>
                                    ))}
                                  </optgroup>
                                  <optgroup label="📂 Subgroups">
                                    {groups.filter(g => g.parent_group_id).map(g => (
                                      <option key={g.id} value={g.id}>📂 {g.name} (under {groups.find(parent => parent.id === g.parent_group_id)?.name || 'Unknown'})</option>
                                    ))}
                                  </optgroup>
                                </select>
                              </div>
                            )}
                            {link.group_id && (
                              <div style={{ color: '#3b82f6', fontWeight: 500 }}>
                                Group: {groups.find(g => g.id === link.group_id)?.name || 'Unknown'}
                              </div>
                            )}
                          </>
                    )}
                    {editingLink?.id === link.id && editingLink.field === 'url' ? (
                      <div className="edit-field-container">
                        <input
                          type="text"
                          value={tempEditValue}
                          onChange={(e) => setTempEditValue(e.target.value)}
                          className="edit-input"
                          autoFocus
                        />
                        <div className="edit-actions">
                              <button onClick={handleSaveEdit} className="save-button">Save</button>
                              <button onClick={handleCancelEdit} className="cancel-button">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <a 
                        href={link.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          e.preventDefault()
                          startEditing(link.id, 'url', link.url)
                        }}
                      >
                        {link.url}
                      </a>
                    )}
                    <button 
                      className="delete-button"
                      onClick={() => handleDeleteLink(link.id)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Ungrouped Subgroups */}
            {groups.filter(group => group.parent_group_id && !groups.find(g => g.id === group.parent_group_id)).length > 0 && (
              <div className="group-container">
                <h3>Ungrouped Subgroups</h3>
                <div className="groups-container">
                  {groups
                    .filter(group => group.parent_group_id && !groups.find(g => g.id === group.parent_group_id))
                    .sort((a, b) => a.display_order - b.display_order)
                    .map(group => (
                      <div key={group.id} className="group-container" style={{ marginLeft: '20px' }}>
                        <div className="group-header">
                          <div 
                            className="group-color" 
                            style={{ backgroundColor: group.color || '#3b82f6' }}
                          ></div>
                          {editingGroup === group.id ? (
                            <div className="edit-field-container">
                              <input
                                type="text"
                                value={tempEditValue}
                                onChange={(e) => setTempEditValue(e.target.value)}
                                className="edit-input"
                                autoFocus
                              />
                              <input
                                type="color"
                                value={group.color || '#3b82f6'}
                                onChange={async (e) => {
                                  try {
                                    await updateGroup(group.id, { color: e.target.value })
                                  } catch (error) {
                                    console.error('Error updating group color:', error)
                                  }
                                }}
                                className="edit-input"
                                style={{ width: 40, height: 40, padding: 0, border: 'none', background: 'none' }}
                              />
                              <select
                                value={group.parent_group_id || ''}
                                onChange={async (e) => {
                                  try {
                                    await updateGroup(group.id, { parent_group_id: e.target.value === '' ? null : e.target.value })
                                  } catch (error) {
                                    console.error('Error updating group parent:', error)
                                  }
                                }}
                                className="edit-input"
                                style={{ width: '100%' }}
                              >
                                <option value="">📂 No Parent Group</option>
                                <optgroup label="📁 Top-Level Groups">
                                  {groups.filter(g => g.id !== group.id && !g.parent_group_id).map(g => (
                                    <option key={g.id} value={g.id}>📁 {g.name}</option>
                                  ))}
                                </optgroup>
                                <optgroup label="📂 Subgroups">
                                  {groups.filter(g => g.id !== group.id && g.parent_group_id && !wouldCreateCircularReference(group.id, g.id)).map(g => (
                                    <option key={g.id} value={g.id}>📂 {g.name} (under {getGroupHierarchy(g.parent_group_id) || 'Unknown'})</option>
                                  ))}
                                </optgroup>
                              </select>
                              <div className="edit-actions">
                                <button onClick={handleSaveEdit} className="save-button">Save</button>
                                <button onClick={handleCancelEdit} className="cancel-button">Cancel</button>
                                <button 
                                  onClick={async () => {
                                    await deleteGroup(group.id)
                                    setEditingGroup(null)
                                    setTempEditValue('')
                                  }} 
                                  className="delete-button"
                                  style={{ marginLeft: '8px' }}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ) : (
                            <h3 onClick={() => startEditingGroup(group.id, group.name)}>
                              {group.name} (orphaned subgroup)
                            </h3>
                          )}
                        </div>
                        <div className="group-links">
                          {getLinksForGroup(group.id).map(link => (
                            <div
                              key={link.id}
                              className="link-card"
                              draggable
                              onDragStart={(e) => handleDragStart(e, link)}
                              onDragEnd={handleDragEnd}
                            >
                              {editingLink?.id === link.id && editingLink.field === 'title' ? (
                                <div className="edit-field-container">
                                  <input
                                    type="text"
                                    value={tempEditValue}
                                    onChange={(e) => setTempEditValue(e.target.value)}
                                    className="edit-input"
                                    autoFocus
                                  />
                                  <select
                                    value={link.group_id || ''}
                                    onChange={async (e) => {
                                      await updateLink(link.id, { group_id: e.target.value === '' ? null : e.target.value })
                                    }}
                                    className="edit-input"
                                    style={{ width: '100%' }}
                                  >
                                    <option value="">📂 No Group</option>
                                    <optgroup label="📁 Top-Level Groups">
                                      {groups.filter(g => !g.parent_group_id).map(g => (
                                        <option key={g.id} value={g.id}>📁 {g.name}</option>
                                      ))}
                                    </optgroup>
                                    <optgroup label="📂 Subgroups">
                                      {groups.filter(g => g.parent_group_id).map(g => (
                                        <option key={g.id} value={g.id}>📂 {g.name} (under {groups.find(parent => parent.id === g.parent_group_id)?.name || 'Unknown'})</option>
                                      ))}
                                    </optgroup>
                                  </select>
                                  <input
                                    type="color"
                                    value={link.color || '#3b82f6'}
                                    onChange={async (e) => {
                                      try {
                                        await updateLink(link.id, { color: e.target.value })
                                      } catch (error) {
                                        console.error('Error updating link color:', error)
                                      }
                                    }}
                                    className="edit-input"
                                    style={{ width: 40, height: 40, padding: 0, border: 'none', background: 'none' }}
                                  />
                                  <div className="edit-actions">
                                    <button onClick={handleSaveEdit} className="save-button">Save</button>
                                    <button onClick={handleCancelEdit} className="cancel-button">Cancel</button>
                                    <button 
                                      onClick={async () => {
                                        await handleDeleteLink(link.id)
                                        setEditingLink(null)
                                        setTempEditValue('')
                                      }} 
                                      className="delete-button"
                                      style={{ marginLeft: '8px' }}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <h3 onClick={() => startEditing(link.id, 'title', link.title)} style={{ margin: 0, cursor: 'pointer', flex: 1 }}>
                                      {link.title}
                                    </h3>
                                                                  <button
                                onClick={() => setEditingLinkGroup(editingLinkGroup === link.id ? null : link.id)}
                                className="edit-group-button"
                                title="Edit group assignment"
                              >
                                📝
                              </button>
                                  </div>
                                  {editingLinkGroup === link.id && (
                                    <div style={{ marginBottom: '8px' }}>
                                      <select
                                        value={link.group_id || ''}
                                        onChange={(e) => handleLinkGroupEdit(link.id, e.target.value === '' ? null : e.target.value)}
                                        className="edit-input"
                                        style={{ width: '100%' }}
                                      >
                                        <option value="">📂 No Group</option>
                                        <optgroup label="📁 Top-Level Groups">
                                          {groups.filter(g => !g.parent_group_id).map(g => (
                                            <option key={g.id} value={g.id}>📁 {g.name}</option>
                                          ))}
                                        </optgroup>
                                        <optgroup label="📂 Subgroups">
                                          {groups.filter(g => g.parent_group_id).map(g => (
                                            <option key={g.id} value={g.id}>📂 {g.name} (under {groups.find(parent => parent.id === g.parent_group_id)?.name || 'Unknown'})</option>
                                          ))}
                                        </optgroup>
                                      </select>
                                    </div>
                                  )}
                                </>
                              )}
                              {editingLink?.id === link.id && editingLink.field === 'url' ? (
                                <div className="edit-field-container">
                                  <input
                                    type="text"
                                    value={tempEditValue}
                                    onChange={(e) => setTempEditValue(e.target.value)}
                                    className="edit-input"
                                    autoFocus
                                  />
                                  <div className="edit-actions">
                                    <button onClick={handleSaveEdit} className="save-button">Save</button>
                                    <button onClick={handleCancelEdit} className="cancel-button">Cancel</button>
                                  </div>
                                </div>
                              ) : (
                                <a 
                                  href={link.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  onClick={(e) => {
                                    e.preventDefault()
                                    startEditing(link.id, 'url', link.url)
                                  }}
                                >
                                  {link.url}
                                </a>
                              )}
                              <button 
                                className="delete-button"
                                onClick={() => handleDeleteLink(link.id)}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Group Navigation Buttons */}
            <div style={{ 
              display: 'flex', 
              gap: '8px', 
              marginBottom: '16px',
              borderBottom: '1px solid #475569',
              paddingBottom: '12px'
            }}>
              <button
                onClick={() => setActiveGroupView('groups')}
                style={{
                  background: activeGroupView === 'groups' ? '#3b82f6' : '#475569',
                  color: '#ffffff',
                  border: '1px solid #64748b',
                  borderRadius: '4px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                📁 Groups
              </button>
              <button
                onClick={() => setActiveGroupView('subs')}
                style={{
                  background: activeGroupView === 'subs' ? '#3b82f6' : '#475569',
                  color: '#ffffff',
                  border: '1px solid #64748b',
                  borderRadius: '4px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                📂 Subs
              </button>
              <button
                onClick={() => setActiveGroupView('subs2')}
                style={{
                  background: activeGroupView === 'subs2' ? '#3b82f6' : '#475569',
                  color: '#ffffff',
                  border: '1px solid #64748b',
                  borderRadius: '4px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                📂 Subs2
              </button>
              <button
                onClick={() => setShowLinksModal(true)}
                style={{
                  background: '#475569',
                  color: '#ffffff',
                  border: '1px solid #64748b',
                  borderRadius: '4px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                🔗 Links
              </button>
            </div>

            {/* Structured Group Display */}
            {(() => {
              switch (activeGroupView) {
                case 'groups':
                  return getGroupsByLevel(0).sort((a, b) => a.display_order - b.display_order).map(group => 
                    renderGroupWithSubgroups(group, 0)
                  )
                case 'subs':
                  return getGroupsByLevel(1).sort((a, b) => a.display_order - b.display_order).map(group => 
                    renderGroupWithSubgroups(group, 0)
                  )
                case 'subs2':
                  return getGroupsByLevel(2).sort((a, b) => a.display_order - b.display_order).map(group => 
                    renderGroupWithSubgroups(group, 0)
                  )
                default:
                  return null
              }
            })()}
          </div>
        </section>

        <section className="graph-section" style={{
          border: '1px solid #ffffff',
          borderRadius: 8,
          padding: '16px',
          background: '#23272f'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ color: '#ffffff', margin: 0 }}>Network Graph</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '8px', marginRight: '16px' }}>
                {[1, 2, 3].map((profileNum) => {
                  const profile = getProfile(profileNum)
                  return (
                    <div key={profileNum} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        onClick={() => setActiveProfile(profileNum as 1 | 2 | 3)}
                        style={{
                          background: activeProfile === profileNum ? '#3b82f6' : '#475569',
                          color: '#ffffff',
                          border: '1px solid #64748b',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        {editingProfile === profileNum ? (
                          <input
                            type="text"
                            value={profileNameEdits[profileNum] || ''}
                            onChange={e => handleProfileNameChange(profileNum, e.target.value)}
                            style={{
                              width: '80px',
                              background: '#334155',
                              color: '#ffffff',
                              border: '1px solid #64748b',
                              borderRadius: '4px',
                              padding: '2px 4px',
                              fontSize: '12px'
                            }}
                          />
                        ) : (
                          profile?.name || `Profile ${profileNum}`
                        )}
                      </button>
                      {editingProfile === profileNum ? (
                        <button
                          onClick={() => handleProfileNameSave(profileNum)}
                          disabled={profileSaveLoading[profileNum]}
                          style={{
                            background: '#10b981',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '2px 8px',
                            fontSize: '12px',
                            marginLeft: '2px',
                            cursor: profileSaveLoading[profileNum] ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {profileSaveLoading[profileNum] ? 'Saving...' : 'Save'}
                        </button>
                      ) : (
                        <button
                          onClick={() => setEditingProfile(profileNum)}
                          style={{
                            background: '#64748b',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '2px 8px',
                            fontSize: '12px',
                            marginLeft: '2px',
                            cursor: 'pointer'
                          }}
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
              <label style={{ color: '#ffffff', fontSize: '14px' }}>
                Title Size:
                <input
                  type="range"
                  min="8"
                  max="24"
                  value={titleFontSize}
                  onChange={(e) => setTitleFontSize(Number(e.target.value))}
                  style={{ marginLeft: '8px', width: '100px' }}
                />
                <span style={{ marginLeft: '8px', fontSize: '12px' }}>{titleFontSize}px</span>
              </label>
            </div>
          </div>
          <div className="graph-container" style={{
            background: '#475569',
            borderRadius: 6,
            padding: '12px',
            border: '1px solid #64748b'
          }}>
              <GraphView 
                links={links} 
                networkConnections={networkConnections}
                groups={groups}
                notes={notes}
                onAddConnection={async (sourceId, targetId) => { await addNetworkConnection(sourceId, targetId); }}
                onDeleteConnection={async (id) => { await deleteNetworkConnection(id); }}
                onNoteNodeClick={handleNoteNodeClick}
                onLinkNodeClick={handleLinkNodeClick}
                onGroupNodeClick={handleGroupNodeClick}
                onSavePositions={handleSavePositions}
                titleFontSize={titleFontSize}
                activeProfile={activeProfile}
                profilePositions={getProfile(activeProfile)?.positions || {}}
                emailAlerts={emailAlerts}
              />
            </div>
          {/* Preview window - always visible */}
            <div style={{
              width: '100%',
              maxWidth: 1000,
              margin: '24px auto 0',
              padding: '12px 0',
            background: '#23272f',
              borderRadius: 8,
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              display: 'flex',
            flexDirection: 'column',
              alignItems: 'stretch',
            minHeight: 80,
            border: '1px solid #ffffff'
          }}>
            <div style={{
              padding: '0 12px 8px',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 500
            }}>
              Preview
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'stretch', flex: 1 }}>
              {selectedLink ? (
                <div style={{
                  width: 'calc(100% - 24px)',
                  maxWidth: 'calc(1000px - 24px)',
                  background: '#334155',
                  border: '1px solid #475569',
                  borderRadius: 6,
                  padding: '10px 14px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'flex-start',
                  overflow: 'hidden',
                }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: '#f8fafc', marginBottom: 4, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', width: '100%' }}>{selectedLink.title}</div>
                  <a href={selectedLink.url} target="_blank" rel="noopener noreferrer" style={{ color: '#94a3b8', fontSize: 13, textDecoration: 'underline', wordBreak: 'break-all' }}>{selectedLink.url}</a>
                  <button 
                    onClick={() => setSelectedLink(null)}
                    style={{ 
                      marginTop: 8, 
                      fontSize: '12px', 
                      padding: '4px 12px',
                      background: '#475569',
                      border: '1px solid #64748b',
                      borderRadius: 4,
                      cursor: 'pointer',
                      color: '#f8fafc'
                    }}
                  >
                    Close Preview
                  </button>
                </div>
              ) : selectedGroupId ? (
                <div style={{
                  width: 'calc(100% - 24px)',
                  maxWidth: 'calc(1000px - 24px)',
                  background: '#334155',
                  border: '1px solid #475569',
                  borderRadius: 6,
                  padding: '16px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '16px', fontWeight: 600 }}>
                      {groups.find(g => g.id === selectedGroupId)?.name || 'Group'} Links
                    </h3>
                    <button 
                      onClick={() => setSelectedGroupId(null)}
                      style={{ 
                        fontSize: '12px', 
                        padding: '4px 12px',
                        background: '#475569',
                        border: '1px solid #64748b',
                        borderRadius: 4,
                        cursor: 'pointer',
                        color: '#f8fafc'
                      }}
                    >
                      Close Preview
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {links
                      .filter(link => link.group_id === selectedGroupId)
                      .map(link => (
                        <div key={link.id} style={{
                          padding: '12px',
                          background: '#475569',
                          border: '1px solid #64748b',
                          borderRadius: 4,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px'
                        }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: '#f8fafc' }}>{link.title}</div>
                          <a 
                            href={link.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            style={{ 
                              color: '#94a3b8', 
                              fontSize: 13, 
                              textDecoration: 'underline',
                              wordBreak: 'break-all'
                            }}
                          >
                            {link.url}
                          </a>
                </div>
              ))}
                    {links.filter(link => link.group_id === selectedGroupId).length === 0 && (
                      <div style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', padding: '12px' }}>
                        No links in this group
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{
                  width: 'calc(100% - 24px)',
                  maxWidth: 'calc(1000px - 24px)',
                  color: '#94a3b8',
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#334155',
                  border: '1px solid #475569',
                  borderRadius: 6,
                  padding: '16px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                }}>
                  Click on a link or group in the network to preview it here
                </div>
              )}
            </div>
          </div>
          {/* Note Display preview window */}
          <div style={{
            width: '100%',
            maxWidth: 1000,
            margin: '24px auto 0',
            padding: '12px 0',
            background: '#23272f',
            borderRadius: 8,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            minHeight: 80,
            border: '1px solid #ffffff'
          }}>
            <div style={{
              padding: '0 12px 8px',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 500
            }}>
              Note Display
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'stretch', flex: 1 }}>
              {selectedLink || selectedGroupId || selectedNoteId ? (
                <div style={{
                  width: 'calc(100% - 24px)',
                  maxWidth: 'calc(1000px - 24px)',
                  background: '#334155',
                  border: '1px solid #475569',
                  borderRadius: 6,
                  padding: '16px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '16px', fontWeight: 600 }}>
                      {selectedNoteId ? 'Selected Note' : selectedLink ? 'Notes for Link' : 'Notes for Group'}: {selectedNoteId ? notes.find(n => n.id === selectedNoteId)?.title : selectedLink ? selectedLink.title : groups.find(g => g.id === selectedGroupId)?.name}
                    </h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {notes
                      .filter(note => 
                        (selectedNoteId && note.id === selectedNoteId) ||
                        (selectedLink && note.link_id === selectedLink.id) || 
                        (selectedGroupId && note.group_id === selectedGroupId)
                      )
                      .map(note => (
                        <div key={note.id} style={{
                          padding: '12px',
                          background: '#475569',
                          border: '1px solid #64748b',
                          borderRadius: 4,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px'
                        }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: '#f8fafc' }}>{note.title}</div>
                          <div style={{ color: '#94a3b8', fontSize: 13 }}>{note.description}</div>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                            {note.note_group_id && (
                              <div style={{ 
                                background: '#64748b', 
                                padding: '2px 8px', 
                                borderRadius: 4, 
                                fontSize: 12,
                                color: '#f8fafc',
                                display: 'inline-flex',
                                alignItems: 'center'
                              }}>
                                Note Group: {noteGroups.find(ng => ng.id === note.note_group_id)?.name}
                              </div>
                            )}
                            {note.group_id && !selectedGroupId && (
                              <div style={{ 
                                background: '#64748b', 
                                padding: '2px 8px', 
                                borderRadius: 4, 
                                fontSize: 12,
                                color: '#f8fafc',
                                display: 'inline-flex',
                                alignItems: 'center'
                              }}>
                                Group: {groups.find(g => g.id === note.group_id)?.name}
                              </div>
                            )}
                            {note.link_id && !selectedLink && (
                              <div style={{ 
                                background: '#64748b', 
                                padding: '2px 8px', 
                                borderRadius: 4, 
                                fontSize: 12,
                                color: '#f8fafc',
                                display: 'inline-flex',
                                alignItems: 'center'
                              }}>
                                Link: {links.find(l => l.id === note.link_id)?.title}
                              </div>
                            )}
                          </div>
                        </div>
                    ))}
                    {notes.filter(note => 
                      (selectedNoteId && note.id === selectedNoteId) ||
                      (selectedLink && note.link_id === selectedLink.id) || 
                      (selectedGroupId && note.group_id === selectedGroupId)
                    ).length === 0 && (
                      <div style={{ 
                        color: '#94a3b8', 
                        fontSize: 14, 
                        textAlign: 'center', 
                        padding: '12px',
                        background: '#475569',
                        border: '1px solid #64748b',
                        borderRadius: 4
                      }}>
                        {selectedNoteId ? 'Note not found' : `No notes attached to this ${selectedLink ? 'link' : 'group'}`}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{
                  width: 'calc(100% - 24px)',
                  maxWidth: 'calc(1000px - 24px)',
                  color: '#94a3b8',
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#334155',
                  border: '1px solid #475569',
                  borderRadius: 6,
                  padding: '16px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                }}>
                  Click on a note, link, or group in the network to view details
                </div>
              )}
            </div>
          </div>
          {/* Calendar Container - directly under graph section content */}
          <section style={{
            margin: '24px auto',
            background: '#23272f',
            border: '1px solid #ffffff',
            borderRadius: 8,
            padding: 16,
            color: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            width: '100%',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: 0, marginBottom: 16, color: '#fff' }}>Calendar</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <button
                onClick={() => setCalendarDate(new Date(year, month - 1, 1))}
                style={{ background: '#475569', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 12px', cursor: 'pointer' }}
              >
                &lt;
              </button>
              <span style={{ fontWeight: 600, fontSize: 18 }}>{calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
              <button
                onClick={() => setCalendarDate(new Date(year, month + 1, 1))}
                style={{ background: '#475569', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 12px', cursor: 'pointer' }}
              >
                &gt;
              </button>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 6,
              background: '#23272f',
              borderRadius: 8
            }}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                <div key={d} style={{ textAlign: 'center', color: '#94a3b8', fontWeight: 500, padding: 4 }}>{d}</div>
              ))}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={"empty-" + i}></div>
              ))}
              {daysArray.map(day => {
                const dayDate = new Date(year, month, day);
                const dayLocal = dayDate.getFullYear() + '-' + String(dayDate.getMonth() + 1).padStart(2, '0') + '-' + String(dayDate.getDate()).padStart(2, '0');
                const linksForDay = (linksByDate[dayLocal] || []).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                const alertsForDay = (alertsByDate[dayLocal] || []).sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());
                return (
                  <div key={day} style={{
                    background: '#334155',
                    border: '1px solid #475569',
                    borderRadius: 4,
                    padding: '12px 0',
                    minHeight: 64,
                    height: 'auto',
                    textAlign: 'center',
                    color: '#f8fafc',
                    fontWeight: 500,
                    fontSize: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                    alignItems: 'center',
                    overflow: 'visible'
                  }}>
                    <div>{day}</div>
                    <div style={{ marginTop: 4, width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {/* Display links for this day */}
                      {linksForDay.map(link => (
                        <a
                          key={link.id}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: '#3b82f6',
                            fontSize: 11,
                            background: 'rgba(59, 130, 246, 0.1)',
                            border: '1px solid #3b82f6',
                            borderRadius: 3,
                            padding: '2px 4px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            textDecoration: 'none'
                          }}
                          title={`Link: ${link.title} (Created: ${new Date(link.created_at).toLocaleString()})`}
                        >
                          <span style={{ fontSize: 8 }}>🔗</span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {link.title.length > 15 ? link.title.substring(0, 15) + '...' : link.title}
                          </span>
                        </a>
                      ))}
                      {/* Display email alerts for this day */}
                      {alertsForDay.map(alert => (
                        <div
                          key={alert.id || `alert-${alert.email}-${alert.time}`}
                          style={{
                            color: alert.sent ? '#10b981' : '#f59e0b',
                            fontSize: 11,
                            background: alert.sent ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                            border: `1px solid ${alert.sent ? '#10b981' : '#f59e0b'}`,
                            borderRadius: 3,
                            padding: '2px 4px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2
                          }}
                          title={`${alert.sent ? '✅ Sent' : '⏰ Scheduled'}: ${alert.email} (${new Date(alert.scheduled_time).toLocaleTimeString()})`}
                        >
                          <span style={{ fontSize: 8 }}>{alert.sent ? '✅' : '⏰'}</span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {alert.email.length > 15 ? alert.email.substring(0, 15) + '...' : alert.email}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
          </section>
        </main>
      </div>
      {/* Links Modal */}
      {showLinksModal && (
        <div className="modal-overlay" onClick={() => setShowLinksModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ 
            maxWidth: '90vw', 
            maxHeight: '90vh', 
            width: '1200px', 
            overflow: 'auto' 
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ margin: 0, color: '#ffffff' }}>All Links ({links.length})</h2>
                <div style={{ fontSize: '14px', color: '#94a3b8', marginTop: '4px' }}>
                  📁 {getGroupsByLevel(0).length} Groups • 
                  📂 {getGroupsByLevel(1).length} Subs • 
                  📂 {getGroupsByLevel(2).length} Subs2 • 
                  🔗 {links.filter(l => !l.group_id).length} Ungrouped
                </div>
              </div>
              <button 
                onClick={() => setShowLinksModal(false)}
                style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                ✕ Close
              </button>
            </div>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
              gap: '16px',
              maxHeight: '70vh',
              overflowY: 'auto',
              padding: '8px'
            }}>
              {links.map((link: Link) => (
                <div 
                  key={link.id} 
                  style={{
                    background: '#334155',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    padding: '16px',
                    color: '#ffffff',
                    transition: 'all 0.2s ease',
                    cursor: 'default',
                    pointerEvents: 'auto'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div 
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: (() => {
                          if (!link.group_id) return '#6b7280' // Gray for ungrouped
                          const group = groups.find(g => g.id === link.group_id)
                          return group?.color || '#3b82f6'
                        })(),
                        border: '1px solid rgba(255, 255, 255, 0.2)'
                      }}
                    ></div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                      {link.title}
                    </h3>
                  </div>
                  
                  <a 
                    href={link.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{
                      color: '#60a5fa',
                      textDecoration: 'underline',
                      fontSize: '14px',
                      display: 'block',
                      marginBottom: '8px',
                      wordBreak: 'break-all',
                      cursor: 'pointer',
                      padding: '8px 4px',
                      borderRadius: '4px',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      zIndex: 1000,
                      pointerEvents: 'auto'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(96, 165, 250, 0.1)'
                      e.currentTarget.style.textDecoration = 'underline'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.textDecoration = 'underline'
                    }}
                    onClick={(e) => {
                      console.log('Link clicked:', link.url);
                      e.stopPropagation();
                      // Force open the link
                      window.open(link.url, '_blank', 'noopener,noreferrer');
                    }}
                  >
                    🔗 {link.url}
                  </a>
                  
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#94a3b8',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>
                        Group: {link.group_id ? (() => {
                          const group = groups.find(g => g.id === link.group_id)
                          if (!group) return 'Unknown'
                          const level = getGroupLevel(group)
                          const levelIcon = level === 0 ? '📁' : level === 1 ? '📂' : level === 2 ? '📂' : '📁'
                          const levelText = level === 0 ? 'Group' : level === 1 ? 'Sub' : level === 2 ? 'Sub2' : `Level ${level}`
                          return `${levelIcon} ${group.name} (${levelText})`
                        })() : '🔗 Ungrouped'}
                      </span>
                      {link.group_id && (() => {
                        const group = groups.find(g => g.id === link.group_id)
                        if (!group) return null
                        return (
                          <div 
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: group.color,
                              border: '1px solid rgba(255, 255, 255, 0.3)'
                            }}
                          ></div>
                        )
                      })()}
                    </div>
                    <span>
                      {new Date(link.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            {links.length === 0 && (
              <div style={{
                textAlign: 'center',
                color: '#94a3b8',
                fontSize: '16px',
                padding: '40px',
                background: '#334155',
                borderRadius: '8px',
                border: '1px solid #475569'
              }}>
                No links found. Add some links to get started!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Note details modal */}
      {selectedNoteId && (
        <div className="modal-overlay" onClick={() => setSelectedNoteId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            {(() => {
              const note = notes.find(n => n.id === selectedNoteId)
              if (!note) return null
              return (
                <>
                  <h2>{note.title}</h2>
                  <p>{note.description}</p>
                  {note.group_id && <div>Group: {groups.find(g => g.id === note.group_id)?.name || note.group_id}</div>}
                  {note.link_id && <div>Link: {links.find(l => l.id === note.link_id)?.title || note.link_id}</div>}
                  <button onClick={() => setSelectedNoteId(null)}>Close</button>
                </>
              )
            })()}
          </div>
          </div>
      )}
    </div>
  )
}

export default App
