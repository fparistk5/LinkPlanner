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
        const techKeyzNFT = owned.find(nft => nft.id === '430')
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
    <div className="wallet-auth-container bg-white border border-gray-200 rounded-lg p-4 mb-4">
      {!isConnected ? (
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Connect Your Wallet</h3>
          <p className="text-gray-600 mb-4">
            Connect your wallet and verify NFT ownership to access your LinkPlanner profile. Only NFT holders can create and edit profiles.
          </p>
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>Required:</strong> NFT Contract {NFT_CONTRACT.address}
            </p>
          </div>
          <button
            onClick={handleConnect}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Connect Wallet
          </button>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div>
                <p className="font-medium text-gray-800">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </p>
                <p className="text-sm text-gray-600">
                  {userProfile?.name || 'Loading...'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {ownedNFTs.length > 0 && (
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                  NFT Verified ({ownedNFTs.length})
                </span>
              )}
              {canEdit() && (
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                  Can Edit
                </span>
              )}
              <button
                onClick={handleDisconnect}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>
          
          {/* NFT Ownership Display */}
          <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-800">Your NFTs</h4>
              <span className="text-xs text-gray-600">
                Contract: {NFT_CONTRACT.address}
              </span>
            </div>
            
            {/* Debug Info */}
            {NFT_CONTRACT.address.length !== 42 && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded">
                <p className="text-xs text-red-800">
                  ⚠️ <strong>Invalid Contract Address!</strong> 
                  Current address is {NFT_CONTRACT.address.length} characters, needs 42.
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Please update the full contract address in src/config/wallet.ts
                </p>
              </div>
            )}
            
            {scanningNFTs ? (
              <div className="flex items-center text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                <span className="text-xs">Scanning for NFTs...</span>
              </div>
            ) : ownedNFTs.length > 0 ? (
              <div className="space-y-2">
                {ownedNFTs.map(nft => (
                  <div 
                    key={nft.id}
                    className={`p-2 rounded border text-xs ${
                      selectedTokenId === nft.id 
                        ? 'bg-green-100 border-green-300 text-green-800' 
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{nft.name}</span>
                      <div className="flex items-center">
                        <span className="text-gray-600 mr-2">Token #{nft.id}</span>
                        {selectedTokenId === nft.id && (
                          <span className="text-green-600">✅ Active</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {ownedNFTs.length > 1 && (
                  <p className="text-xs text-gray-600 mt-2">
                    Using {ownedNFTs.find(nft => nft.id === selectedTokenId)?.name} for profile access
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center text-red-600">
                  <span className="text-lg mr-1">❌</span>
                  <span className="text-xs">No qualifying NFTs found in your wallet</span>
                </div>
                
                {/* Debug info */}
                <div className="text-xs text-gray-600 bg-white p-2 rounded border">
                  <p><strong>Debug Info:</strong></p>
                  <p>• Contract: {NFT_CONTRACT.address}</p>
                  <p>• Your Wallet: {address}</p>
                  <p>• Checking Token IDs: {KNOWN_TOKEN_IDS.map(t => t.id).join(', ')}</p>
                  <p className="mt-1 text-blue-600">Check browser console for detailed logs</p>
                </div>
                
                {NFT_CONTRACT.address.length === 42 && (
                  <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded border border-blue-200">
                    <p className="text-blue-800">
                      <strong>Expected:</strong> Your wallet should own token ID 430 on contract {NFT_CONTRACT.address}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      
      {isConnected && !canEdit() && currentProfile && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 text-sm">
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