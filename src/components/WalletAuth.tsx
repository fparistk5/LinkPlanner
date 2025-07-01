import React, { useEffect, useState } from 'react'
import { useAccount, useDisconnect, useConnect, useReadContract } from 'wagmi'
import { injected, coinbaseWallet, metaMask } from 'wagmi/connectors'
import { availableConnectors, NFT_CONTRACT, KNOWN_TOKEN_IDS } from '../config/wallet'
import { supabase } from '../config/supabase'

interface WalletAuthProps {
  onProfileLoad: (profileId: number) => void
  currentProfile: any
  onAuthChange: (isAuthenticated: boolean, address: string | null, hasNFTs: boolean, ownedNFTs: { id: string; name: string }[]) => void
}

export function WalletAuth({ onProfileLoad, currentProfile, onAuthChange }: WalletAuthProps) {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { connect } = useConnect()
  const [loading, setLoading] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [ownedNFTs, setOwnedNFTs] = useState<Array<{id: string, name: string}>>([])
  const [selectedTokenId, setSelectedTokenId] = useState<string>('')
  const [scanningNFTs, setScanningNFTs] = useState(false)

  // Create multiple ownership checks for all known token IDs
  const nftChecks = KNOWN_TOKEN_IDS.map(token => {
    const { data: owner, error } = useReadContract({
      address: NFT_CONTRACT.address,
      abi: NFT_CONTRACT.abi,
      functionName: 'ownerOf',
      args: [BigInt(token.id)],
      query: {
        enabled: isConnected && !!address,
      },
    })
    
    // Debug logging
    if (isConnected && address) {
      console.log(`🔍 Checking Token ${token.id} (${token.name}):`, {
        contract: NFT_CONTRACT.address,
        tokenId: token.id,
        owner,
        error,
        userAddress: String(address)
      })
    }
    
    return { tokenId: token.id, tokenName: token.name, owner, error }
  })

  // Scan for owned NFTs when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      setScanningNFTs(true)
      const owned = nftChecks
        .filter(check => check.owner && String(check.owner).toLowerCase() === String(address).toLowerCase())
        .map(check => ({ id: check.tokenId, name: check.tokenName }))
      
      setOwnedNFTs(owned)
      setScanningNFTs(false)
      
      console.log('🔍 NFT Scan Results:', {
        walletAddress: String(address),
        nftChecks: nftChecks.map(check => ({
          tokenId: check.tokenId,
          owner: check.owner,
          error: check.error,
          isOwned: check.owner && String(check.owner).toLowerCase() === String(address).toLowerCase()
        })),
        ownedNFTs: owned
      })
      
      if (owned.length > 0) {
        // Automatically select first owned NFT (preferring TechKeyz if available)
        const techKeyzNFT = owned.find(nft => nft.id === '1')
        const selectedNFT = techKeyzNFT || owned[0]
        setSelectedTokenId(selectedNFT.id)
        
        handleWalletConnected(String(address), selectedNFT.id)
        onAuthChange(true, String(address), true, owned)
        
        console.log('✅ Wallet authenticated with NFTs:', {
          authenticated: true,
          address: String(address),
          hasNFTs: true,
          selectedNFT: selectedNFT.name,
          selectedTokenId: selectedNFT.id,
          totalNFTs: owned.length,
          allOwnedNFTs: owned.map(nft => ({ id: nft.id, name: nft.name }))
        })
      } else {
        setSelectedTokenId('')
        setUserProfile(null)
        onAuthChange(false, null, false, [])
        
        console.log('❌ No NFTs found:', {
          authenticated: false,
          address: String(address),
          hasNFTs: false,
          checkedTokens: KNOWN_TOKEN_IDS.map(t => t.id)
        })
      }
    } else {
      setOwnedNFTs([])
      setSelectedTokenId('')
      setUserProfile(null)
      onAuthChange(false, null, false, [])
      
      console.log('🔌 Wallet disconnected:', {
        isConnected,
        address: address ? String(address) : null
      })
    }
  }, [isConnected, address, ...nftChecks.map(check => check.owner)])

  useEffect(() => {
    if (!isConnected) {
      setOwnedNFTs([])
      setSelectedTokenId('')
      setUserProfile(null)
    }
  }, [isConnected])

  const handleWalletConnected = async (walletAddress: string, nftTokenId?: string) => {
    setLoading(true)
    // Profile creation and loading is now handled by ProfileSelector component
    // This just sets the user profile state for the wallet auth component
    setUserProfile({
      wallet_address: walletAddress,
      nft_token_id: nftTokenId
    })
    setLoading(false)
  }

  const handleConnect = () => {
    setShowWalletModal(true)
  }

  const handleWalletSelect = async (walletKey: string) => {
    let connector
    
    switch (walletKey) {
      case 'metaMask':
        connector = metaMask()
        break
      case 'phantom':
        connector = injected({ target: 'phantom' })
        break
      case 'magicEden':
        // Specifically check for Magic Eden wallet
        if (typeof window !== 'undefined') {
          const magicEden = (window as any).magicEden
          
          if (!magicEden || !magicEden.ethereum) {
            alert('🪄 Magic Eden wallet not detected!\n\nPlease:\n1. Install Magic Eden browser extension\n2. Refresh this page\n3. Try connecting again')
            setShowWalletModal(false)
            return
          }
          
          try {
            // Request account access specifically from Magic Eden
            await magicEden.ethereum.request({ 
              method: 'eth_requestAccounts' 
            })
            
            // Use a custom injected connector that will pick up the activated Magic Eden
            connector = injected()
          } catch (error) {
            console.error('Magic Eden connection failed:', error)
            alert('❌ Failed to connect to Magic Eden wallet.\n\nPlease ensure Magic Eden is unlocked and try again.')
            setShowWalletModal(false)
            return
          }
        } else {
          alert('❌ Browser environment not detected')
          setShowWalletModal(false)
          return
        }
        break
      case 'coinbaseWallet':
        connector = coinbaseWallet({ appName: 'LinkPlanner' })
        break
      default:
        connector = injected()
    }
    
    connect({ connector })
    setShowWalletModal(false)
  }

  const handleDisconnect = () => {
    disconnect()
    setUserProfile(null)
  }

  const canEdit = () => {
    if (!isConnected || !address || !currentProfile || ownedNFTs.length === 0) return false
    return currentProfile.wallet_address === String(address)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">Loading profile...</span>
      </div>
    )
  }

  return (
    <div className="wallet-auth-container" style={{
      backgroundColor: '#334155',
      border: '1px solid #475569',
      borderRadius: '8px',
      padding: '24px',
      marginBottom: '16px'
    }}>
      {!isConnected ? (
        <div style={{ textAlign: 'center' }}>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#f8fafc',
            marginBottom: '12px'
          }}>Connect Your Wallet</h3>
          <p style={{
            color: '#94a3b8',
            marginBottom: '20px',
            lineHeight: '1.5'
          }}>
            Connect your wallet and verify NFT ownership to access your LinkPlanner profile. Only NFT holders can create and edit profiles.
          </p>
          <div style={{
            marginBottom: '20px',
            padding: '16px',
            backgroundColor: '#1e40af',
            border: '1px solid #3b82f6',
            borderRadius: '8px'
          }}>
            <p style={{
              fontSize: '14px',
              color: '#dbeafe',
              margin: 0
            }}>
              <strong>Required:</strong> NFT Contract {NFT_CONTRACT.address}
            </p>
          </div>
          <button
            onClick={handleConnect}
            style={{
              backgroundColor: '#10b981',
              color: '#ffffff',
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
          >
            Connect Wallet
          </button>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '12px',
                height: '12px',
                backgroundColor: '#10b981',
                borderRadius: '50%'
              }}></div>
              <div>
                <p style={{
                  fontWeight: '500',
                  color: '#f8fafc',
                  margin: 0,
                  fontSize: '15px'
                }}>
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </p>
                <p style={{
                  fontSize: '13px',
                  color: '#94a3b8',
                  margin: 0,
                  marginTop: '2px'
                }}>
                  {userProfile?.name || 'Loading...'}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {ownedNFTs.length > 0 && (
                <span style={{
                  backgroundColor: '#065f46',
                  color: '#6ee7b7',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  NFT Verified ({ownedNFTs.length})
                </span>
              )}
              {canEdit() && (
                <span style={{
                  backgroundColor: '#1e40af',
                  color: '#93c5fd',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  Can Edit
                </span>
              )}
              <button
                onClick={handleDisconnect}
                style={{
                  backgroundColor: '#6b7280',
                  color: '#ffffff',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4b5563'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6b7280'}
              >
                Disconnect
              </button>
            </div>
          </div>
          
          {/* NFT Ownership Display */}
          <div style={{
            marginTop: '16px',
            padding: '16px',
            backgroundColor: '#1e293b',
            border: '1px solid #475569',
            borderRadius: '8px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px'
            }}>
              <h4 style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#f8fafc',
                margin: 0
              }}>Your NFTs</h4>
              <span style={{
                fontSize: '12px',
                color: '#94a3b8'
              }}>
                Contract: {NFT_CONTRACT.address}
              </span>
            </div>
            
            {/* Debug Info */}
            {NFT_CONTRACT.address.length !== 42 && (
              <div style={{
                marginBottom: '16px',
                padding: '12px',
                backgroundColor: '#991b1b',
                border: '1px solid #dc2626',
                borderRadius: '6px'
              }}>
                <p style={{
                  fontSize: '12px',
                  color: '#fecaca',
                  margin: 0
                }}>
                  ⚠️ <strong>Invalid Contract Address!</strong> 
                  Current address is {NFT_CONTRACT.address.length} characters, needs 42.
                </p>
                <p style={{
                  fontSize: '12px',
                  color: '#fca5a5',
                  marginTop: '6px',
                  margin: 0
                }}>
                  Please update the full contract address in src/config/wallet.ts
                </p>
              </div>
            )}
            
            {scanningNFTs ? (
              <div style={{ display: 'flex', alignItems: 'center', color: '#60a5fa' }}>
                <div style={{
                  animation: 'spin 1s linear infinite',
                  borderRadius: '50%',
                  width: '16px',
                  height: '16px',
                  border: '2px solid transparent',
                  borderBottom: '2px solid #60a5fa',
                  marginRight: '8px'
                }}></div>
                <span style={{ fontSize: '12px' }}>Scanning for NFTs...</span>
              </div>
            ) : ownedNFTs.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {ownedNFTs.map(nft => (
                  <div 
                    key={nft.id}
                    style={{
                      padding: '12px',
                      borderRadius: '6px',
                      border: '1px solid #475569',
                      fontSize: '12px',
                      backgroundColor: selectedTokenId === nft.id ? '#065f46' : '#374151',
                      color: selectedTokenId === nft.id ? '#6ee7b7' : '#f8fafc'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: '500' }}>{nft.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ 
                          color: selectedTokenId === nft.id ? '#a7f3d0' : '#94a3b8',
                          marginRight: '8px'
                        }}>Token #{nft.id}</span>
                        {selectedTokenId === nft.id && (
                          <span style={{ color: '#10b981' }}>✅ Active</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {ownedNFTs.length > 1 && (
                  <p style={{
                    fontSize: '12px',
                    color: '#94a3b8',
                    marginTop: '8px',
                    margin: 0
                  }}>
                    Using {ownedNFTs.find(nft => nft.id === selectedTokenId)?.name} for profile access
                  </p>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', color: '#ef4444' }}>
                  <span style={{ fontSize: '16px', marginRight: '6px' }}>❌</span>
                  <span style={{ fontSize: '12px' }}>No qualifying NFTs found in your wallet</span>
                </div>
                
                {/* Debug info */}
                <div style={{
                  fontSize: '12px',
                  color: '#94a3b8',
                  backgroundColor: '#374151',
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px solid #475569'
                }}>
                  <p style={{ margin: 0, marginBottom: '8px' }}><strong>Debug Info:</strong></p>
                  <p style={{ margin: 0 }}>• Contract: {NFT_CONTRACT.address}</p>
                  <p style={{ margin: 0 }}>• Your Wallet: {address}</p>
                  <p style={{ margin: 0 }}>• Checking Token IDs: {KNOWN_TOKEN_IDS.map(t => t.id).join(', ')}</p>
                  <p style={{ margin: '8px 0 0 0', color: '#60a5fa' }}>Check browser console for detailed logs</p>
                </div>
                
                {NFT_CONTRACT.address.length === 42 && (
                  <div style={{
                    fontSize: '12px',
                    color: '#dbeafe',
                    backgroundColor: '#1e40af',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid #3b82f6'
                  }}>
                    <p style={{ margin: 0, color: '#93c5fd' }}>
                      <strong>Expected:</strong> Your wallet should own token ID 1 on contract {NFT_CONTRACT.address}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      
      {isConnected && !canEdit() && currentProfile && (
        <div style={{
          marginTop: '16px',
          padding: '16px',
          backgroundColor: '#92400e',
          border: '1px solid #d97706',
          borderRadius: '8px'
        }}>
          <p style={{
            color: '#fcd34d',
            fontSize: '14px',
            margin: 0
          }}>
            ⚠️ {ownedNFTs.length === 0
              ? 'NFT ownership required to edit this profile. You must own a qualifying NFT.'
              : "You're viewing someone else's profile. Connect with the owner's wallet to edit."
            }
          </p>
        </div>
      )}

    {/* Wallet Selection Modal */}
    {showWalletModal && (
      <div 
        className="modal-overlay"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}
        onClick={() => setShowWalletModal(false)}
      >
        <div 
          className="wallet-modal"
          style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            minWidth: '400px',
            maxWidth: '500px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
              Connect Wallet
            </h3>
            <button
              onClick={() => setShowWalletModal(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#6b7280',
                padding: '4px'
              }}
            >
              ×
            </button>
          </div>
          
          <p style={{ margin: '0 0 20px 0', color: '#6b7280', fontSize: '14px' }}>
            Choose your preferred wallet to connect to LinkPlanner
          </p>
          
          <div style={{ display: 'grid', gap: '12px' }}>
            {availableConnectors.map((wallet) => (
              <button
                key={wallet.key}
                onClick={() => handleWalletSelect(wallet.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: '16px',
                  fontWeight: '500',
                  color: '#1f2937'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6'
                  e.currentTarget.style.backgroundColor = '#f8fafc'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e5e7eb'
                  e.currentTarget.style.backgroundColor = 'white'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '24px' }}>{wallet.icon}</span>
                  <span>{wallet.name}</span>
                </div>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>→</span>
              </button>
            ))}
          </div>
          
          <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
            <p style={{ margin: 0, fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
              Make sure you have the wallet extension installed in your browser
            </p>
          </div>
        </div>
      </div>
    )}
  </div>
)
}

export function CompactWalletAuth({ 
  onProfileLoad, 
  currentProfile, 
  onAuthChange 
}: WalletAuthProps) {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { connect } = useConnect()
  const [showWalletModal, setShowWalletModal] = useState(false)
  const [ownedNFTs, setOwnedNFTs] = useState<Array<{id: string, name: string}>>([])
  const [selectedTokenId, setSelectedTokenId] = useState<string>('')
  const [scanningNFTs, setScanningNFTs] = useState(false)

  // Create multiple ownership checks for all known token IDs
  const nftChecks = KNOWN_TOKEN_IDS.map(token => {
    const { data: owner } = useReadContract({
      address: NFT_CONTRACT.address,
      abi: NFT_CONTRACT.abi,
      functionName: 'ownerOf',
      args: [BigInt(token.id)],
      query: {
        enabled: isConnected && !!address,
      },
    })
    
    return { tokenId: token.id, tokenName: token.name, owner }
  })

  // Scan for owned NFTs when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      setScanningNFTs(true)
      const owned = nftChecks
        .filter(check => check.owner && String(check.owner).toLowerCase() === String(address).toLowerCase())
        .map(check => ({ id: check.tokenId, name: check.tokenName }))
      
      setOwnedNFTs(owned)
      setScanningNFTs(false)
      
      if (owned.length > 0) {
        const techKeyzNFT = owned.find(nft => nft.id === '1')
        const selectedNFT = techKeyzNFT || owned[0]
        setSelectedTokenId(selectedNFT.id)
        onAuthChange(true, String(address), true, owned)
      } else {
        setSelectedTokenId('')
        onAuthChange(false, null, false, [])
      }
    } else {
      setOwnedNFTs([])
      setSelectedTokenId('')
      onAuthChange(false, null, false, [])
    }
  }, [isConnected, address, ...nftChecks.map(check => check.owner)])

  const handleConnect = () => {
    setShowWalletModal(true)
  }

  const handleWalletSelect = async (walletKey: string) => {
    let connector
    
    switch (walletKey) {
      case 'metaMask':
        connector = metaMask()
        break
      case 'coinbaseWallet':
        connector = coinbaseWallet({ appName: 'LinkPlanner' })
        break
      default:
        connector = injected()
    }
    
    connect({ connector })
    setShowWalletModal(false)
  }

  const handleDisconnect = () => {
    disconnect()
  }

  return (
    <>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '12px',
        padding: '8px 16px',
        backgroundColor: '#334155',
        borderRadius: '8px',
        border: '1px solid #475569',
        fontSize: '14px'
      }}>
        {!isConnected ? (
          <>
            <span style={{ color: '#94a3b8', fontSize: '13px' }}>NFT Required</span>
            <button
              onClick={handleConnect}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: '#10b981',
                color: '#ffffff',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Connect Wallet
            </button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                backgroundColor: ownedNFTs.length > 0 ? '#10b981' : '#ef4444' 
              }}></div>
              <span style={{ 
                color: '#f8fafc', 
                fontSize: '13px',
                fontWeight: '500'
              }}>
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
            </div>
            {ownedNFTs.length > 0 && (
              <span style={{
                backgroundColor: '#10b981',
                color: '#ffffff',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '500'
              }}>
                ✓ NFT ({ownedNFTs.length})
              </span>
            )}
            <button
              onClick={handleDisconnect}
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                border: '1px solid #64748b',
                borderRadius: '4px',
                backgroundColor: 'transparent',
                color: '#94a3b8',
                cursor: 'pointer'
              }}
            >
              Disconnect
            </button>
          </>
        )}
        {scanningNFTs && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            color: '#60a5fa',
            fontSize: '12px'
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              border: '2px solid #60a5fa',
              borderTop: '2px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <span>Scanning...</span>
          </div>
        )}
      </div>

      {/* Wallet Selection Modal */}
      {showWalletModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#334155',
            borderRadius: '12px',
            padding: '24px',
            width: '90%',
            maxWidth: '400px',
            border: '1px solid #475569'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{
                color: '#f8fafc',
                margin: 0,
                fontSize: '18px',
                fontWeight: '600'
              }}>
                Connect Wallet
              </h3>
              <button
                onClick={() => setShowWalletModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '18px',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
               {availableConnectors.map((connector) => (
                 <button
                   key={connector.key}
                   onClick={() => handleWalletSelect(connector.key)}
                   style={{
                     display: 'flex',
                     alignItems: 'center',
                     gap: '12px',
                     padding: '12px 16px',
                     backgroundColor: '#475569',
                     border: '1px solid #64748b',
                     borderRadius: '8px',
                     color: '#f8fafc',
                     cursor: 'pointer',
                     fontSize: '14px',
                     fontWeight: '500'
                   }}
                 >
                   <span>{connector.icon}</span>
                   <span>{connector.name}</span>
                 </button>
               ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
} 