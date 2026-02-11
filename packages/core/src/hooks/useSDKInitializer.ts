import { useCallback } from 'react'
import { useMobileSDK } from '../contexts'
import { MobileSDK, type MobileSDKOptions } from '../MobileSDK'

export const useMobileSDKInitializer = () => {
  const { initialize, isInitialized, sdk } = useMobileSDK()

  const initializeSDK = useCallback(
    async (options: MobileSDKOptions) => {
      if (isInitialized) {
        throw new Error('Mobile SDK is already initialized')
      }

      const sdk = new MobileSDK(options)

      await sdk.initialize()
      initialize(sdk)

      return sdk
    },
    [isInitialized, initialize]
  )

  return { initializeSDK, isInitialized, sdk }
}
