import React, { useState, useEffect, useRef } from 'react'
import type { Database } from '../config/supabase'
import { 
  canCreateNewProfileForNFT, 
  createEmptyProfileForNFT, 
  getNextProfileNumberForNFT,
  fetchProfilesByNFT,
  fetchAllUserProfilesForWallet,
  canCreateNewGeneralProfile,
  createEmptyGeneralProfile,
  getNextGeneralProfileNumber,
  fetchGeneralProfilesByWallet,
  updateNetworkProfile,
  supabase
} from '../config/supabase'

type NetworkProfile = Database['public']['Tables']['network_profiles']['Row']

interface ProfileSelectorProps {
  connectedWallet: string | null
  ownedNFTs: { id: string; name: string }[]
  onProfileSelect: (profileId: number) => void
  currentProfile: NetworkProfile | null
  hasNFTs: boolean
  allProfiles: NetworkProfile[] // All available profiles
  onProfileCreated?: () => void // Callback to reload profiles
}

// NFT Holder Profiles Component
export function NFTProfileSelector({ 
  connectedWallet, 
  ownedNFTs, 
  onProfileSelect, 
  currentProfile,
  hasNFTs,
  allProfiles,
  onProfileCreated
}: ProfileSelectorProps) {
  
  // Debug logging for profile state
  React.useEffect(() => {
    console.log('🔄 NFTProfileSelector state update:', {
      currentProfileId: currentProfile?.id,
      currentProfileName: currentProfile?.name,
      allProfileIds: allProfiles.map(p => ({ id: p.id, name: p.name })),
      techKeyzProfile: allProfiles.find(p => 
        (!p.wallet_address && p.name === 'TechKeyz Profile') ||
        (p.nft_token_id === '430') ||
        (p.name?.toLowerCase().includes('techkeyz'))
      ),
      nftProfiles: allProfiles.filter(p => p.wallet_address === connectedWallet && p.nft_token_id)
    })
  }, [currentProfile, allProfiles, connectedWallet])
  const [isExpanded, setIsExpanded] = useState(false)
  const [isCreatingProfile, setIsCreatingProfile] = useState(false)
  const [newProfileName, setNewProfileName] = useState('')
  const [selectedNFTForCreation, setSelectedNFTForCreation] = useState<string>('')
  const [createLoading, setCreateLoading] = useState(false)
  const [editingProfile, setEditingProfile] = useState<number | null>(null)
  const [editProfileName, setEditProfileName] = useState('')
  const [nftProfileCounts, setNftProfileCounts] = useState<{ [nftId: string]: number }>({})
  const [nftCanCreate, setNftCanCreate] = useState<{ [nftId: string]: boolean }>({})

  // Check profile creation ability for each owned NFT
  useEffect(() => {
    const checkNFTProfileAbilities = async () => {
      if (connectedWallet && hasNFTs && ownedNFTs.length > 0) {
        try {
          const counts: { [nftId: string]: number } = {}
          const canCreate: { [nftId: string]: boolean } = {}
          
          for (const nft of ownedNFTs) {
            const userNFTProfiles = allProfiles.filter(p => 
              p.wallet_address === connectedWallet && p.nft_token_id === nft.id
            )
            
            counts[nft.id] = userNFTProfiles.length
            canCreate[nft.id] = userNFTProfiles.length < 3 // Allow 3 total profiles per NFT
          }
          
          setNftProfileCounts(counts)
          setNftCanCreate(canCreate)
        } catch (error) {
          console.error('❌ Error checking NFT profile abilities:', error)
        }
      } else {
        setNftProfileCounts({})
        setNftCanCreate({})
      }
    }

    checkNFTProfileAbilities()
  }, [connectedWallet, hasNFTs, ownedNFTs, allProfiles])

  // Handle profile creation for specific NFT
  const handleCreateProfile = async () => {
    if (!newProfileName.trim() || !connectedWallet || !hasNFTs || !selectedNFTForCreation) return

    setCreateLoading(true)
    try {
      const createdProfile = await createEmptyProfileForNFT(
        connectedWallet, 
        selectedNFTForCreation, 
        newProfileName.trim()
      )
      
      // Reset form
      setNewProfileName('')
      setIsCreatingProfile(false)
      setSelectedNFTForCreation('')
      
      // Notify parent component to reload profiles
      if (onProfileCreated) {
        onProfileCreated()
      }
      
      // Auto-select the new profile
      onProfileSelect(createdProfile.id)
      
      console.log('✅ New NFT profile created successfully:', {
        profileName: createdProfile.name,
        nftTokenId: selectedNFTForCreation
      })
    } catch (error) {
      console.error('❌ Error creating NFT profile:', error)
      alert(`Failed to create profile: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setCreateLoading(false)
      }
    }

  // Handle profile editing
  const handleEditProfile = async (profileId: number) => {
    if (!editProfileName.trim()) return

    try {
      const { error } = await supabase
        .from('network_profiles')
        .update({ name: editProfileName.trim() })
        .eq('id', profileId)

      if (error) throw error

      setEditingProfile(null)
      setEditProfileName('')
      
      // Notify parent to reload profiles
      if (onProfileCreated) {
        onProfileCreated()
      }
      
      console.log('✅ Profile updated successfully')
    } catch (error) {
      console.error('❌ Error updating profile:', error)
      alert(`Failed to update profile: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Handle profile deletion
  const handleDeleteProfile = async (profileId: number, profileName: string) => {
    try {
      const { error } = await supabase
        .from('network_profiles')
        .delete()
        .eq('id', profileId)

      if (error) throw error

      // Reset editing state
      setEditingProfile(null)
      setEditProfileName('')
      
      // Notify parent to reload profiles
      if (onProfileCreated) {
        onProfileCreated()
      }

      console.log(`✅ Profile "${profileName}" deleted successfully`)
    } catch (error) {
      console.error('❌ Error deleting profile:', error)
      alert(`Failed to delete profile: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Handle creating TechKeyz profile if it doesn't exist
  const handleCreateTechKeyzProfile = async () => {
    try {
      console.log('🎨 Creating TechKeyz Profile...')
      
      const { data: newProfile, error } = await supabase
        .from('network_profiles')
        .insert([{
          name: 'TechKeyz Profile',
          wallet_address: null,
          nft_token_id: '430',
          positions: {}
        }])
        .select()
        .single()
      
      if (error) throw error
      
      console.log('✅ TechKeyz Profile created successfully:', newProfile)
      
      // Notify parent to reload profiles
      if (onProfileCreated) {
        onProfileCreated()
      }
      
      // Auto-select the new TechKeyz profile
      onProfileSelect(newProfile.id)
      
    } catch (error) {
      console.error('❌ Error creating TechKeyz Profile:', error)
      alert(`Failed to create TechKeyz Profile: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Handle starting profile creation for specific NFT
  const handleStartCreation = async (nftId: string) => {
    if (!connectedWallet || !hasNFTs) return
    
    try {
      const userNFTProfiles = allProfiles.filter(p => 
        p.wallet_address === connectedWallet && p.nft_token_id === nftId
      )
      const nextNumber = userNFTProfiles.length + 1
      const nftName = ownedNFTs.find(nft => nft.id === nftId)?.name || `NFT ${nftId}`
      setNewProfileName(`${nftName} Profile ${nextNumber}`)
      setSelectedNFTForCreation(nftId)
      setIsCreatingProfile(true)
    } catch (error) {
      console.error('Error setting up profile creation:', error)
      setNewProfileName('New Profile')
      setSelectedNFTForCreation(nftId)
      setIsCreatingProfile(true)
    }
  }

  // Get TechKeyz profile - must be the actual TechKeyz profile, not user profiles
  const techKeyzProfile = allProfiles.find(p => 
    (!p.wallet_address && (
      p.name === 'TechKeyz Profile' || 
      p.name?.toLowerCase().includes('techkeyz')
    ))
  )

  // Get user profiles grouped by NFT
  const userProfiles = allProfiles.filter(p => p.wallet_address === connectedWallet)
  const profilesByNFT: { [nftId: string]: NetworkProfile[] } = {}
  userProfiles.forEach(profile => {
    if (profile.nft_token_id) {
      if (!profilesByNFT[profile.nft_token_id]) {
        profilesByNFT[profile.nft_token_id] = []
      }
      profilesByNFT[profile.nft_token_id].push(profile)
    }
  })

  const totalUserProfiles = userProfiles.filter(p => p.nft_token_id).length

  // Don't render if no wallet connected or no NFTs
  if (!connectedWallet || !hasNFTs || ownedNFTs.length === 0) {
    return null
  }

  return (
    <div style={{ marginBottom: '16px' }}>
      {/* Header */}
        <div 
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          padding: '8px 12px',
          background: '#334155',
          border: '1px solid #475569',
          borderRadius: '6px',
          marginBottom: isExpanded ? '8px' : 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            style={{
              background: 'none',
              border: 'none',
              color: '#10b981',
              fontSize: '14px',
              cursor: 'pointer'
            }}
            title={isExpanded ? 'Collapse NFT profiles' : 'Expand NFT profiles'}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
          ></div>
          <h4 style={{ margin: 0, color: '#ffffff', fontSize: '14px' }}>
            🎫 Your NFT Profiles ({totalUserProfiles + (techKeyzProfile ? 1 : 0)})
          </h4>
        </div>
      </div>

      {isExpanded && (
        <div style={{ marginLeft: '16px' }}>
          {/* Profile Creation Form */}
          {isCreatingProfile && (
            <div style={{
              padding: '12px',
              borderBottom: '1px solid #475569',
              backgroundColor: '#475569',
              borderRadius: '6px',
              marginBottom: '8px'
            }}>
              <div style={{ marginBottom: '8px', fontSize: '12px', color: '#94a3b8' }}>
                Creating profile for {ownedNFTs.find(nft => nft.id === selectedNFTForCreation)?.name || `NFT ${selectedNFTForCreation}`}
              </div>
              <input
                type="text"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder="Enter profile name..."
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  border: '1px solid #64748b',
                  borderRadius: '4px',
                  backgroundColor: '#1e293b',
                  color: '#ffffff',
                  fontSize: '14px',
                  marginBottom: '8px'
                }}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateProfile()
                  } else if (e.key === 'Escape') {
                    setIsCreatingProfile(false)
                    setNewProfileName('')
                    setSelectedNFTForCreation('')
                  }
                }}
              />
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={handleCreateProfile}
                  disabled={!newProfileName.trim() || createLoading}
                  style={{
                    padding: '4px 12px',
                    border: 'none',
                    borderRadius: '4px',
                    backgroundColor: newProfileName.trim() ? '#10b981' : '#6b7280',
                    color: '#ffffff',
                    fontSize: '12px',
                    cursor: newProfileName.trim() ? 'pointer' : 'not-allowed',
                    opacity: createLoading ? 0.7 : 1
                  }}
                >
                  {createLoading ? 'Creating...' : 'Create'}
                </button>
                <button
                  onClick={() => {
                    setIsCreatingProfile(false)
                    setNewProfileName('')
                    setSelectedNFTForCreation('')
                  }}
                  style={{
                    padding: '4px 12px',
                    border: '1px solid #64748b',
                    borderRadius: '4px',
                    backgroundColor: 'transparent',
                    color: '#94a3b8',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* TechKeyz Shared Profile */}
          {techKeyzProfile ? (
            <div style={{ 
              marginBottom: '12px',
              border: '1px solid #475569',
              borderRadius: '6px',
              backgroundColor: '#334155'
            }}>
              {/* TechKeyz Profile Content */}
              <div
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  cursor: editingProfile === techKeyzProfile.id ? 'default' : 'pointer',
                  transition: 'background-color 0.15s',
                  backgroundColor: currentProfile?.id === techKeyzProfile.id ? '#1e40af' : 'transparent',
                  color: currentProfile?.id === techKeyzProfile.id ? '#ffffff' : '#f8fafc',
                  borderRadius: '6px'
                }}
                onMouseEnter={(e) => {
                  if (currentProfile?.id !== techKeyzProfile.id && editingProfile !== techKeyzProfile.id) {
                    e.currentTarget.style.backgroundColor = '#475569'
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentProfile?.id !== techKeyzProfile.id && editingProfile !== techKeyzProfile.id) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }
                }}
                onClick={() => {
                  if (editingProfile !== techKeyzProfile.id) {
                    console.log('🖱️ TechKeyz Profile clicked:', { 
                      profileId: techKeyzProfile.id, 
                      profileName: techKeyzProfile.name, 
                      currentProfileId: currentProfile?.id,
                      isCurrentlyActive: currentProfile?.id === techKeyzProfile.id,
                      willCallOnProfileSelect: true
                    })
                    onProfileSelect(techKeyzProfile.id)
                    setIsCreatingProfile(false)
                    setNewProfileName('')
                    setSelectedNFTForCreation('')
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: currentProfile?.id === techKeyzProfile.id ? '#60a5fa' : '#10b981',
                        border: '1px solid rgba(255, 255, 255, 0.2)'
                      }}
                    ></div>
                    {editingProfile === techKeyzProfile.id ? (
                      <input
                        type="text"
                        value={editProfileName}
                        onChange={(e) => setEditProfileName(e.target.value)}
                        style={{
                          background: '#1e293b',
                          border: '1px solid #64748b',
                          borderRadius: '4px',
                          padding: '4px 8px',
                          color: '#ffffff',
                          fontSize: '14px',
                          width: '200px'
                        }}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleEditProfile(techKeyzProfile.id)
                          } else if (e.key === 'Escape') {
                            setEditingProfile(null)
                            setEditProfileName('')
                          }
                        }}
                      />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: '500', fontSize: '14px' }}>TECHKEYZ</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (editingProfile === techKeyzProfile.id) {
                              setEditingProfile(null)
                              setEditProfileName('')
                            } else {
                              setEditingProfile(techKeyzProfile.id)
                              setEditProfileName(techKeyzProfile.name)
                            }
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#10b981',
                            fontSize: '18px',
                            cursor: 'pointer',
                            padding: '4px',
                            fontWeight: 'bold'
                          }}
                          title={editingProfile === techKeyzProfile.id ? 'Collapse edit' : 'Expand edit'}
                        >
                          {editingProfile === techKeyzProfile.id ? '−' : '+'}
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Active Indicator */}
                  {currentProfile?.id === techKeyzProfile.id && editingProfile !== techKeyzProfile.id && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ color: '#60a5fa', fontSize: '12px', fontWeight: '500' }}>Active</div>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Expandable Edit/Save/Delete section */}
              {editingProfile === techKeyzProfile.id && (
                <div style={{
                  padding: '12px 16px',
                  borderTop: '1px solid #475569',
                  backgroundColor: '#374151',
                  borderRadius: '0 0 6px 6px'
                }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditProfile(techKeyzProfile.id)
                        }}
                        disabled={!editProfileName.trim()}
                        style={{
                          padding: '8px 16px',
                          fontSize: '13px',
                          border: 'none',
                          borderRadius: '4px',
                          backgroundColor: editProfileName.trim() ? '#10b981' : '#6b7280',
                          color: '#ffffff',
                          cursor: editProfileName.trim() ? 'pointer' : 'not-allowed',
                          fontWeight: '500'
                        }}
                      >
                        Save
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingProfile(null)
                          setEditProfileName('')
                        }}
                        style={{
                          padding: '8px 16px',
                          fontSize: '13px',
                          border: '1px solid #64748b',
                          borderRadius: '4px',
                          backgroundColor: 'transparent',
                          color: '#94a3b8',
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                    
                    {/* Delete button for TechKeyz profile */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm(`Delete profile "${techKeyzProfile.name}"? This action cannot be undone.`)) {
                          handleDeleteProfile(techKeyzProfile.id, techKeyzProfile.name)
                        }
                      }}
                      style={{
                        padding: '8px 16px',
                        fontSize: '13px',
                        border: 'none',
                        borderRadius: '4px',
                        backgroundColor: '#dc2626',
                        color: '#ffffff',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Show Create TechKeyz Profile option if it doesn't exist */
            <div style={{ 
              marginBottom: '12px',
              border: '1px solid #475569',
              borderRadius: '6px',
              backgroundColor: '#334155'
            }}>
              <div style={{
                padding: '8px 12px',
                backgroundColor: '#374151',
                fontSize: '13px',
                fontWeight: '500',
                color: '#f3f4f6',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderRadius: '6px 6px 0 0'
              }}>
                <span style={{ fontSize: '11px', color: '#9ca3af' }}>Not Found</span>
              </div>
              
              <div
                style={{
                  padding: '12px 16px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s',
                  backgroundColor: '#059669',
                  color: '#ffffff',
                  textAlign: 'center',
                  borderRadius: '0 0 6px 6px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#047857'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#059669'
                }}
                onClick={handleCreateTechKeyzProfile}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold' }}>+</div>
                  <span style={{ fontWeight: '500' }}>Create TechKeyz Profile</span>
                </div>
              </div>
            </div>
          )}

          {/* List each owned NFT and its existing profiles */}
          {ownedNFTs.map(nft => {
            const nftProfiles = profilesByNFT[nft.id] || []
            const profileCount = nftProfileCounts[nft.id] || 0

            // Only show NFT section if it has profiles
            if (nftProfiles.length === 0) return null

            return (
              <div key={nft.id} style={{ 
                marginBottom: '12px',
                border: '1px solid #475569',
                borderRadius: '6px',
                backgroundColor: '#334155'
              }}>


                {/* Profiles for this NFT with edit/save buttons */}
                {nftProfiles.map((profile, index) => (
                  <React.Fragment key={profile.id}>
                    <div
                      style={{
                        padding: '8px 16px',
                        fontSize: '14px',
                        cursor: editingProfile === profile.id ? 'default' : 'pointer',
                        transition: 'background-color 0.15s',
                        backgroundColor: currentProfile?.id === profile.id ? '#1e40af' : 'transparent',
                        color: currentProfile?.id === profile.id ? '#ffffff' : '#f8fafc',
                        borderTop: index === 0 ? 'none' : '1px solid #475569'
                      }}
                      onMouseEnter={(e) => {
                        if (currentProfile?.id !== profile.id && editingProfile !== profile.id) {
                          e.currentTarget.style.backgroundColor = '#475569'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (currentProfile?.id !== profile.id && editingProfile !== profile.id) {
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }
                      }}
                      onClick={() => {
                        if (editingProfile !== profile.id) {
                          console.log('🖱️ NFT Profile clicked:', { 
                            profileId: profile.id, 
                            profileName: profile.name, 
                            currentProfileId: currentProfile?.id,
                            isCurrentlyActive: currentProfile?.id === profile.id,
                            willCallOnProfileSelect: true
                          })
                          onProfileSelect(profile.id)
                          setIsCreatingProfile(false)
                          setNewProfileName('')
                          setSelectedNFTForCreation('')
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              backgroundColor: currentProfile?.id === profile.id ? '#60a5fa' : '#10b981',
                              border: '1px solid rgba(255, 255, 255, 0.2)'
                            }}
                          ></div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: '500' }}>{profile.name}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (editingProfile === profile.id) {
                                  setEditingProfile(null)
                                  setEditProfileName('')
                                } else {
                                  setEditingProfile(profile.id)
                                  setEditProfileName(profile.name)
                                }
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#10b981',
                                fontSize: '18px',
                                cursor: 'pointer',
                                padding: '4px',
                                fontWeight: 'bold'
                              }}
                              title={editingProfile === profile.id ? 'Collapse edit' : 'Expand edit'}
                            >
                              {editingProfile === profile.id ? '−' : '+'}
                            </button>
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {/* Active Indicator */}
                          {currentProfile?.id === profile.id && editingProfile !== profile.id && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <div style={{ color: '#60a5fa', fontSize: '11px', fontWeight: '500' }}>Active</div>
                              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expandable Edit/Save/Delete section */}
                    {editingProfile === profile.id && (
                       <div style={{
                         padding: '12px 16px',
                         borderTop: '1px solid #475569',
                         backgroundColor: '#374151',
                         borderRadius: '0 0 6px 6px'
                       }}>
                         <div style={{ marginBottom: '8px' }}>
                           <input
                             type="text"
                             value={editProfileName}
                             onChange={(e) => setEditProfileName(e.target.value)}
                             style={{
                               width: '100%',
                               background: '#1e293b',
                               border: '1px solid #64748b',
                               borderRadius: '4px',
                               padding: '8px 12px',
                               color: '#ffffff',
                               fontSize: '14px'
                             }}
                             placeholder="Profile name..."
                             autoFocus
                             onKeyDown={(e) => {
                               if (e.key === 'Enter') {
                                 handleEditProfile(profile.id)
                               } else if (e.key === 'Escape') {
                                 setEditingProfile(null)
                                 setEditProfileName('')
                               }
                             }}
                           />
                         </div>
                         <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
                           <div style={{ display: 'flex', gap: '8px' }}>
                             <button
                               onClick={(e) => {
                                 e.stopPropagation()
                                 handleEditProfile(profile.id)
                               }}
                               disabled={!editProfileName.trim()}
                               style={{
                                 padding: '8px 16px',
                                 fontSize: '13px',
                                 border: 'none',
                                 borderRadius: '4px',
                                 backgroundColor: editProfileName.trim() ? '#10b981' : '#6b7280',
                                 color: '#ffffff',
                                 cursor: editProfileName.trim() ? 'pointer' : 'not-allowed',
                                 fontWeight: '500'
                               }}
                             >
                               Save
                             </button>
                             <button
                               onClick={(e) => {
                                 e.stopPropagation()
                                 setEditingProfile(null)
                                 setEditProfileName('')
                               }}
                               style={{
                                 padding: '8px 16px',
                                 fontSize: '13px',
                                 border: '1px solid #64748b',
                                 borderRadius: '4px',
                                 backgroundColor: 'transparent',
                                 color: '#94a3b8',
                                 cursor: 'pointer'
                               }}
                             >
                               Cancel
                             </button>
                           </div>
                           
                           {/* Delete button for all profiles */}
                           <button
                             onClick={(e) => {
                               e.stopPropagation()
                               if (confirm(`Delete profile "${profile.name}"? This action cannot be undone.`)) {
                                 handleDeleteProfile(profile.id, profile.name)
                               }
                             }}
                             style={{
                               padding: '8px 16px',
                               fontSize: '13px',
                               border: 'none',
                               borderRadius: '4px',
                               backgroundColor: '#dc2626',
                               color: '#ffffff',
                               cursor: 'pointer',
                               fontWeight: '500'
                             }}
                           >
                             Delete
                           </button>
                         </div>
                       </div>
                     )}
                  </React.Fragment>
                ))}
              </div>
            )
          })}

          {/* Create New Profile Button - AFTER existing profiles */}
          {hasNFTs && ownedNFTs.length > 0 && !isCreatingProfile && (
            <div
              style={{
                padding: '8px 12px',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'background-color 0.15s',
                backgroundColor: '#059669',
                color: '#ffffff',
                margin: '8px 0',
                borderRadius: '6px',
                border: '1px solid #047857'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#047857'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#059669'
              }}
              onClick={() => {
                // Show NFT selection or use first NFT by default
                if (ownedNFTs.length === 1) {
                  handleStartCreation(ownedNFTs[0].id)
                } else {
                  // For multiple NFTs, start with first one
                  handleStartCreation(ownedNFTs[0].id)
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>+</div>
                <span style={{ fontWeight: '500' }}>new profile</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// General User Profiles Component (2 per wallet, editable)
export function GeneralProfileSelector({ 
  connectedWallet, 
  ownedNFTs, 
  onProfileSelect, 
  currentProfile,
  hasNFTs,
  allProfiles,
  onProfileCreated
}: ProfileSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isCreatingProfile, setIsCreatingProfile] = useState(false)
  const [newProfileName, setNewProfileName] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [editingProfile, setEditingProfile] = useState<number | null>(null)
  const [editProfileName, setEditProfileName] = useState('')
  const [canCreate, setCanCreate] = useState(false)

  // Check if user can create general profiles
  useEffect(() => {
    const checkCanCreate = async () => {
      if (connectedWallet) {
        try {
          const canCreateGeneral = await canCreateNewGeneralProfile(connectedWallet)
          setCanCreate(canCreateGeneral)
        } catch (error) {
          console.error('❌ Error checking general profile creation ability:', error)
          setCanCreate(false)
        }
      } else {
        setCanCreate(false)
      }
    }

    checkCanCreate()
  }, [connectedWallet, allProfiles])

  // Handle profile creation
  const handleCreateProfile = async () => {
    if (!newProfileName.trim() || !connectedWallet) return

    setCreateLoading(true)
    try {
      const createdProfile = await createEmptyGeneralProfile(connectedWallet, newProfileName.trim())
      
      // Reset form
      setNewProfileName('')
      setIsCreatingProfile(false)
      
      // Notify parent component to reload profiles
      if (onProfileCreated) {
        onProfileCreated()
      }
      
      // Auto-select the new profile
      onProfileSelect(createdProfile.id)
      
      console.log('✅ New general profile created successfully:', {
        profileName: createdProfile.name
      })
    } catch (error) {
      console.error('❌ Error creating general profile:', error)
      alert(`Failed to create profile: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setCreateLoading(false)
    }
  }

  // Handle profile editing
  const handleEditProfile = async (profileId: number) => {
    if (!editProfileName.trim()) return

    try {
      const { error } = await supabase
        .from('network_profiles')
        .update({ name: editProfileName.trim() })
        .eq('id', profileId)

      if (error) throw error

      setEditingProfile(null)
      setEditProfileName('')
      
      // Notify parent to reload profiles
      if (onProfileCreated) {
        onProfileCreated()
      }
      
      console.log('✅ General profile updated successfully')
    } catch (error) {
      console.error('❌ Error updating general profile:', error)
      alert(`Failed to update profile: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Handle profile deletion
  const handleDeleteProfile = async (profileId: number, profileName: string) => {
    if (!confirm(`Are you sure you want to delete "${profileName}"? This action cannot be undone.`)) {
      return
    }

    try {
      // Call delete function (we'll need to add this to supabase config)
      const { error } = await supabase.from('network_profiles').delete().eq('id', profileId)
      if (error) throw error
      
      // Notify parent to reload profiles
      if (onProfileCreated) {
        onProfileCreated()
      }
      
      console.log('✅ General profile deleted successfully')
    } catch (error) {
      console.error('❌ Error deleting general profile:', error)
      alert(`Failed to delete profile: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Handle starting profile creation
  const handleStartCreation = async () => {
    if (!connectedWallet) return
    
    try {
      const nextNumber = await getNextGeneralProfileNumber(connectedWallet)
      setNewProfileName(`My Profile ${nextNumber}`)
      setIsCreatingProfile(true)
    } catch (error) {
      console.error('Error getting next general profile number:', error)
      setNewProfileName('My Profile')
      setIsCreatingProfile(true)
    }
  }

  // Get user's general profiles (wallet-owned, no NFT token ID)
  const generalProfiles = allProfiles.filter(p => 
    p.wallet_address === connectedWallet && !p.nft_token_id
  )

  // Don't render if no wallet connected
  if (!connectedWallet) {
    return null
  }

  return (
    <div style={{ marginBottom: '16px' }}>
      {/* Header */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          padding: '8px 12px',
          background: '#334155',
          border: '1px solid #475569',
          borderRadius: '6px',
          marginBottom: isExpanded ? '8px' : 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            style={{
              background: 'none',
              border: 'none',
              color: '#a78bfa',
              fontSize: '14px',
              cursor: 'pointer'
            }}
            title={isExpanded ? 'Collapse general profiles' : 'Expand general profiles'}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#a78bfa',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
          ></div>
          <h4 style={{ margin: 0, color: '#ffffff', fontSize: '14px' }}>
            👤 My Profiles ({generalProfiles.length}/2)
          </h4>
        </div>
      </div>
      
      {isExpanded && (
        <div style={{ marginLeft: '16px' }}>
          {/* Profile Creation Form */}
          {isCreatingProfile && (
            <div style={{
              padding: '12px',
              borderBottom: '1px solid #475569',
              backgroundColor: '#475569',
              borderRadius: '6px',
              marginBottom: '8px'
            }}>
              <div style={{ marginBottom: '8px', fontSize: '12px', color: '#94a3b8' }}>
                Creating new general profile
              </div>
              <input
                type="text"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder="Enter profile name..."
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  border: '1px solid #64748b',
                  borderRadius: '4px',
                  backgroundColor: '#1e293b',
                  color: '#ffffff',
                  fontSize: '14px',
                  marginBottom: '8px'
                }}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateProfile()
                  } else if (e.key === 'Escape') {
                    setIsCreatingProfile(false)
                    setNewProfileName('')
                  }
                }}
              />
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={handleCreateProfile}
                  disabled={!newProfileName.trim() || createLoading}
                  style={{
                    padding: '4px 12px',
                    border: 'none',
                    borderRadius: '4px',
                    backgroundColor: newProfileName.trim() ? '#a78bfa' : '#6b7280',
                    color: '#ffffff',
                    fontSize: '12px',
                    cursor: newProfileName.trim() ? 'pointer' : 'not-allowed',
                    opacity: createLoading ? 0.7 : 1
                  }}
                >
                  {createLoading ? 'Creating...' : 'Create'}
                </button>
                <button
                  onClick={() => {
                    setIsCreatingProfile(false)
                    setNewProfileName('')
                  }}
                  style={{
                    padding: '4px 12px',
                    border: '1px solid #64748b',
                    borderRadius: '4px',
                    backgroundColor: 'transparent',
                    color: '#94a3b8',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
                  </div>
                )}

          {/* Create New General Profile Button */}
          {canCreate && !isCreatingProfile && (
            <div
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'background-color 0.15s',
                backgroundColor: '#7c3aed',
                color: '#ffffff',
                margin: '8px',
                borderRadius: '4px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#6d28d9'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#7c3aed'
              }}
              onClick={handleStartCreation}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ fontSize: '14px' }}>+</div>
                <span>Create General Profile</span>
              </div>
            </div>
          )}

          {/* General Profiles List with edit/save/delete buttons */}
          {generalProfiles.map((profile, index) => (
            <div
              key={profile.id}
              style={{
                padding: '8px 12px',
                marginBottom: '4px',
                fontSize: '14px',
                cursor: editingProfile === profile.id ? 'default' : 'pointer',
                transition: 'background-color 0.15s',
                backgroundColor: currentProfile?.id === profile.id ? '#1e40af' : '#334155',
                color: currentProfile?.id === profile.id ? '#ffffff' : '#f8fafc',
                border: '1px solid #475569',
                borderRadius: '6px'
              }}
              onMouseEnter={(e) => {
                if (currentProfile?.id !== profile.id && editingProfile !== profile.id) {
                  e.currentTarget.style.backgroundColor = '#475569'
                }
              }}
              onMouseLeave={(e) => {
                if (currentProfile?.id !== profile.id && editingProfile !== profile.id) {
                  e.currentTarget.style.backgroundColor = '#334155'
                }
              }}
              onClick={() => {
                if (editingProfile !== profile.id) {
                  console.log('🖱️ General Profile clicked:', { 
                    profileId: profile.id, 
                    profileName: profile.name, 
                    currentProfileId: currentProfile?.id,
                    isCurrentlyActive: currentProfile?.id === profile.id 
                  })
                  onProfileSelect(profile.id)
                  setIsCreatingProfile(false)
                  setNewProfileName('')
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: currentProfile?.id === profile.id ? '#60a5fa' : '#a78bfa',
                      border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}
                  ></div>
                  {editingProfile === profile.id ? (
                    <input
                      type="text"
                      value={editProfileName}
                      onChange={(e) => setEditProfileName(e.target.value)}
                      style={{
                        background: '#1e293b',
                        border: '1px solid #64748b',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        color: '#ffffff',
                        fontSize: '14px',
                        width: '200px'
                      }}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleEditProfile(profile.id)
                        } else if (e.key === 'Escape') {
                          setEditingProfile(null)
                          setEditProfileName('')
                        }
                      }}
                    />
                  ) : (
                    <span style={{ fontWeight: '500' }}>{profile.name}</span>
                  )}
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Active Indicator */}
                  {currentProfile?.id === profile.id && editingProfile !== profile.id && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ color: '#60a5fa', fontSize: '12px', fontWeight: '500' }}>Active</div>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
                    </div>
                  )}
                  
                  {/* Edit/Save/Delete buttons */}
                  {editingProfile === profile.id ? (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditProfile(profile.id)
                        }}
                        style={{
                          padding: '2px 8px',
                          fontSize: '10px',
                          border: 'none',
                          borderRadius: '3px',
                          backgroundColor: '#a78bfa',
                          color: '#ffffff',
                          cursor: 'pointer'
                        }}
                      >
                        Save
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingProfile(null)
                          setEditProfileName('')
                        }}
                        style={{
                          padding: '2px 8px',
                          fontSize: '10px',
                          border: '1px solid #64748b',
                          borderRadius: '3px',
                          backgroundColor: 'transparent',
                          color: '#94a3b8',
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingProfile(profile.id)
                          setEditProfileName(profile.name)
                        }}
                        style={{
                          padding: '2px 8px',
                          fontSize: '10px',
                          border: '1px solid #64748b',
                          borderRadius: '3px',
                          backgroundColor: '#475569',
                          color: '#ffffff',
                          cursor: 'pointer'
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteProfile(profile.id, profile.name)
                        }}
                        style={{
                          padding: '2px 8px',
                          fontSize: '10px',
                          border: '1px solid #dc2626',
                          borderRadius: '3px',
                          backgroundColor: '#dc2626',
                          color: '#ffffff',
                          cursor: 'pointer'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Max profiles reached */}
          {!canCreate && generalProfiles.length >= 2 && (
            <div style={{
              padding: '6px 12px',
              fontSize: '11px',
              color: '#9ca3af',
              textAlign: 'center',
              backgroundColor: '#374151',
              margin: '8px',
              borderRadius: '4px'
            }}>
              ⚠️ Max 2 general profiles per wallet
            </div>
          )}
              </div>
            )}
    </div>
  )
}

// Saved Profiles Component (profiles that have been edited and saved)
export function SavedProfileSelector({ 
  connectedWallet, 
  ownedNFTs, 
  onProfileSelect, 
  currentProfile,
  hasNFTs,
  allProfiles,
  onProfileCreated
}: ProfileSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Get profiles that have been edited/saved (custom names, not default auto-generated names)
  const savedProfiles = allProfiles.filter(p => {
    // Include TechKeyz profile (read-only default) - more flexible matching
    if (!p.wallet_address && (p.name === 'TechKeyz Profile' || p.name?.toLowerCase().includes('techkeyz'))) {
      return true
    }
    
    // Include user profiles that have been customized (not auto-generated names)
    // Check if it's not an auto-generated name pattern regardless of wallet connection
    const isAutoGenerated = (
      p.name.match(/^.+\s+Profile\s+\d+$/) || // "NFT Name Profile 1" pattern
      p.name.match(/^My Profile \d+$/) // "My Profile 1" pattern
    )
    
    // Show customized profiles even when logged out
    if (!isAutoGenerated && p.wallet_address) {
      return true
    }
    
    return false
  })

  return (
    <div style={{ marginBottom: '16px' }}>
      {/* Header */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          padding: '8px 12px',
          background: '#334155',
          border: '1px solid #475569',
          borderRadius: '6px',
          marginBottom: isExpanded ? '8px' : 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            style={{
              background: 'none',
              border: 'none',
              color: '#60a5fa',
              fontSize: '14px',
              cursor: 'pointer'
            }}
            title={isExpanded ? 'Collapse saved profiles' : 'Expand saved profiles'}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#60a5fa',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
          ></div>
          <h4 style={{ margin: 0, color: '#ffffff', fontSize: '14px' }}>
            💾 Saved Profiles ({savedProfiles.length})
          </h4>
        </div>
          </div>
          
      {isExpanded && (
        <div style={{ marginLeft: '16px' }}>
          {savedProfiles.length === 0 ? (
            <div style={{
              padding: '12px',
              fontSize: '13px',
              color: '#94a3b8',
              textAlign: 'center',
              backgroundColor: '#374151',
              borderRadius: '6px',
              margin: '8px'
            }}>
              📝 Profiles with custom names will appear here
              <div style={{ fontSize: '11px', marginTop: '4px', color: '#6b7280' }}>
                Edit and save any profile to add it to this section
              </div>
            </div>
          ) : (
            savedProfiles.map((profile, index) => {
              const isTechKeyz = !profile.wallet_address && profile.name === 'TechKeyz Profile'
              const isReadOnly = isTechKeyz
              
              return (
                <div
                  key={profile.id}
                  style={{
                    padding: '8px 12px',
                    marginBottom: '4px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s',
                    backgroundColor: currentProfile?.id === profile.id ? '#1e40af' : '#334155',
                    color: currentProfile?.id === profile.id ? '#ffffff' : '#f8fafc',
                    border: '1px solid #475569',
                    borderRadius: '6px'
                  }}
                  onMouseEnter={(e) => {
                    if (currentProfile?.id !== profile.id) {
                      e.currentTarget.style.backgroundColor = '#475569'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentProfile?.id !== profile.id) {
                      e.currentTarget.style.backgroundColor = '#334155'
                    }
                  }}
                  onClick={() => {
                    onProfileSelect(profile.id)
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: currentProfile?.id === profile.id ? '#60a5fa' : '#6b7280',
                          border: '1px solid rgba(255, 255, 255, 0.2)'
                        }}
                      ></div>
                      <span style={{ fontWeight: '500' }}>
                        {isTechKeyz ? 'TECHKEYZ' : profile.name}
                      </span>
                      {isReadOnly && (
                        <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '400' }}>
                          (Read-only)
                        </span>
                      )}
                    </div>
                    
                    {/* Active Indicator */}
                    {currentProfile?.id === profile.id && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ color: '#60a5fa', fontSize: '12px', fontWeight: '500' }}>Active</div>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
                      </div>
                    )}
            </div>
          </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

// Main Profile Selector (legacy - for backward compatibility)
export function ProfileSelector(props: ProfileSelectorProps) {
  return (
    <div>
      <NFTProfileSelector {...props} />
      <GeneralProfileSelector {...props} />
      <SavedProfileSelector {...props} />
    </div>
  )
} 