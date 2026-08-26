import { Kms } from '@credo-ts/core'

export interface MobileSDKKeyManagementOptions {
  /**
   * Additional Credo KMS backends to register after the built-in Askar backend.
   *
   * Askar remains the default backend unless callers explicitly select one of
   * these backends for an operation.
   */
  backends?: Kms.KeyManagementService[]
}

/**
 * Registers application-provided KMS backends without changing Askar's default
 * position in Credo's backend selection order.
 */
export const registerKeyManagementBackends = (
  keyManagementConfig: Kms.KeyManagementModuleConfig,
  backends: Kms.KeyManagementService[] = []
) => {
  const registeredBackendIdentifiers = new Set(keyManagementConfig.backends.map((backend) => backend.backend))
  const requestedBackendIdentifiers = new Set<string>()

  for (const backend of backends) {
    const identifier = backend.backend

    if (typeof identifier !== 'string' || identifier.trim().length === 0) {
      throw new Error('A key management backend must have a non-empty backend identifier')
    }

    if (registeredBackendIdentifiers.has(identifier) || requestedBackendIdentifiers.has(identifier)) {
      throw new Error(`A key management backend with identifier '${identifier}' is already registered`)
    }

    requestedBackendIdentifiers.add(identifier)
  }

  for (const backend of backends) {
    keyManagementConfig.registerBackend(backend)
  }
}
