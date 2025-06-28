import { createConfig, http } from 'wagmi'
import { mainnet, polygon, arbitrum } from 'wagmi/chains'
import { injected, coinbaseWallet, metaMask } from 'wagmi/connectors'

// Simple wagmi configuration
export const wagmiConfig = createConfig({
  chains: [mainnet, polygon, arbitrum],
  connectors: [
    metaMask(),
    injected({ target: 'phantom' }),
    coinbaseWallet({ appName: 'LinkPlanner' }),
    injected(), // For Magic Eden and other wallets (must be last)
  ],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
  },
})

// Available connectors for the wallet modal
export const availableConnectors = [
  { 
    name: 'MetaMask', 
    key: 'metaMask',
    icon: '🦊'
  },
  { 
    name: 'Phantom', 
    key: 'phantom',
    icon: '👻'
  },
  { 
    name: 'Magic Eden', 
    key: 'magicEden',
    icon: '🪄'
  },
  { 
    name: 'Coinbase Wallet', 
    key: 'coinbaseWallet',
    icon: '🔵'
  },
]

// NFT Contract Configuration
export const NFT_CONTRACT = {
  address: '0xBc5d78bB900B16f68B512fEf44Cf18c2d73FdaC7' as `0x${string}`, // Complete contract address
  abi: [
    // ERC-721 ownerOf function
    {
      inputs: [{ name: 'tokenId', type: 'uint256' }],
      name: 'ownerOf',
      outputs: [{ name: '', type: 'address' }],
      stateMutability: 'view',
      type: 'function',
    },
    // ERC-721 balanceOf function
    {
      inputs: [{ name: 'owner', type: 'address' }],
      name: 'balanceOf',
      outputs: [{ name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function',
    },
  ] as const,
}

// Known token IDs to check for ownership
// Add more token IDs here as needed
export const KNOWN_TOKEN_IDS = [
  { id: '430', name: 'TechKeyz Profile' },
  { id: '1', name: 'Genesis NFT' },
  { id: '2', name: 'Premium NFT' },
  { id: '100', name: 'Special Edition' },
  // Add more known tokens here
] 