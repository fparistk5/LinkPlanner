import React, { useEffect, useState } from 'react'
import { useAccount, useDisconnect, useConnect } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { supabase } from '../config/supabase'

interface WalletAuthProps {
  onProfileLoad: (profileId: number) => void
  currentProfile: any
  onAuthChange: (isAuthenticated: boolean, address: string | null) => void
}

export function WalletAuth({ onProfileLoad, currentProfile, onAuthChange }: WalletAuthProps) {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { connect } = useConnect()
  const [loading, setLoading] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)

  useEffect(() => {
    if (isConnected && address) {
      handleWalletConnected(address)
      onAuthChange(true, address)
    } else {
      onAuthChange(false, null)
      setUserProfile(null)
    }
  }, [isConnected, address])

  const handleWalletConnected = async (walletAddress: string) => {
    setLoading(true)
    try {
      // Check if profile exists for this wallet address
      const { data: existingProfile, error: fetchError } = await supabase
        .from('network_profiles')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching profile:', fetchError)
        return
      }

      if (existingProfile) {
        // Profile exists, load it
        setUserProfile(existingProfile)
        onProfileLoad(existingProfile.id)
      } else {
        // Create new profile for this wallet
        const { data: newProfile, error: createError } = await supabase
          .from('network_profiles')
          .insert([{
            name: `Profile - ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
            wallet_address: walletAddress,
            positions: {}
          }])
          .select()
          .single()

        if (createError) {
          console.error('Error creating profile:', createError)
          return
        }

        setUserProfile(newProfile)
        onProfileLoad(newProfile.id)
      }
    } catch (error) {
      console.error('Error handling wallet connection:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = () => {
    connect({ connector: injected() })
  }

  const handleDisconnect = () => {
    disconnect()
    setUserProfile(null)
  }

  const canEdit = () => {
    if (!isConnected || !address || !currentProfile) return false
    return currentProfile.wallet_address === address
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
            Connect your wallet to access and edit your LinkPlanner profile
          </p>
          <button
            onClick={handleConnect}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Connect Wallet
          </button>
        </div>
      ) : (
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
            {canEdit() && (
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
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
      )}
      
      {isConnected && !canEdit() && currentProfile && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 text-sm">
            ⚠️ You're viewing someone else's profile. Connect with the owner's wallet to edit.
          </p>
        </div>
      )}
    </div>
  )
} 