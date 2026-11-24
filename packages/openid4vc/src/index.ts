import { GenericRecord, MdocRecord, SdJwtVcRecord, W3cCredentialRecord } from '@credo-ts/core'
import {
  OpenId4VciAuthorizationFlow,
  OpenId4VciRequestTokenResponse,
  OpenId4VciResolvedAuthorizationRequest,
  OpenId4VciResolvedCredentialOffer,
  OpenId4VciTxCode,
} from '@credo-ts/openid4vc'

export {
  assertOfferAcceptsHolderDid,
  assertW3cCredentialsBoundToHolderDid,
  type CredentialBindingPolicy,
  type CredentialBindingResolverOptions,
  getCredentialBindingResolver,
  HolderBindingMismatchError,
  HolderBindingNotSupportedError,
} from './credentialBindingResolver'
export * from './dcapi'
export * from './decode'
export * from './display'
export * from './holderErrors'
export * from './metadata'
export {
  type CredentialNotificationEvent,
  type CredentialNotificationResult,
  DEFAULT_NOTIFICATION_TIMEOUT_MS,
  type OpenId4VciNotificationContext,
  type StoreAndNotifyResult,
} from './notifications'
export * from './OpenIDSdk'
export * from './providers'
export * from './status'
export * from './utils'
export * from './utils/error'
export {
  GenericRecord,
  MdocRecord,
  OpenId4VciAuthorizationFlow,
  OpenId4VciRequestTokenResponse,
  OpenId4VciResolvedAuthorizationRequest,
  OpenId4VciResolvedCredentialOffer,
  OpenId4VciTxCode,
  SdJwtVcRecord,
  W3cCredentialRecord,
}
