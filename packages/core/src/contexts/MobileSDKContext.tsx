import type React from 'react'
import { type ReactNode, createContext, useContext, useState } from 'react'
import type { MobileSDK, MobileSDKModule } from '../MobileSDK'

interface MobileSDKContextType {
  sdk: MobileSDK | null
  isInitialized: boolean
  initialize: (sdk: MobileSDK) => void
}

const MobileSDKContext = createContext<MobileSDKContextType | undefined>(undefined)

export const useMobileSDK = <T extends Record<string, MobileSDKModule> = Record<string, MobileSDKModule>>() => {
  const context = useContext(MobileSDKContext)
  if (context === undefined) {
    throw new Error('useMobileSDK must be used within an MobileSDKProvider')
  }
  return {
    sdk: context.sdk as MobileSDK<T>,
    isInitialized: context.isInitialized,
    initialize: context.initialize,
  }
}

interface SDKProviderProps {
  children: ReactNode
}

export const MobileSDKProvider: React.FC<SDKProviderProps> = ({ children }) => {
  const [sdk, setSDK] = useState<MobileSDK | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  const initialize = (newSDK: MobileSDK) => {
    setSDK(newSDK)
    setIsInitialized(true)
  }

  const shutdown = () => {
    setSDK(null)
    setIsInitialized(false)
  }

  return (
    <MobileSDKContext.Provider value={{ sdk, isInitialized, initialize, shutdown }}>
      {children}
    </MobileSDKContext.Provider>
  )
}
