import type { InitConfig } from '@credo-ts/core'
import type {
  GenericRecord,
  SaveGenericRecordOption,
} from '@credo-ts/core/build/modules/generic-records/repository/GenericRecord'

// Anoncreds
import {
  AnonCredsCredentialFormatService,
  AnonCredsCredentialInfo,
  AnonCredsCredentialOffer,
  AnonCredsCredentialsForProofRequest,
  AnonCredsModule,
  AnonCredsNonRevokedInterval,
  AnonCredsPredicateType,
  AnonCredsProof,
  AnonCredsProofFormat,
  AnonCredsProofFormatService,
  AnonCredsProofRequest,
  AnonCredsProofRequestRestriction,
  AnonCredsRequestedAttribute,
  AnonCredsRequestedAttributeMatch,
  AnonCredsRequestedPredicate,
  AnonCredsRequestedPredicateMatch,
  LegacyIndyCredentialFormatService,
  LegacyIndyProofFormat,
  LegacyIndyProofFormatService,
  LegacyIndyProofRequest,
  V1CredentialProtocol,
  V1ProofProtocol,
  V1RequestPresentationMessage,
} from '@credo-ts/anoncreds'
import { AnonCredsCredentialMetadataKey } from '@credo-ts/anoncreds/build/utils/metadata'
// Core
import { AskarModule } from '@credo-ts/askar'
import {
  Agent,
  Buffer,
  CacheModule,
  ClaimFormat,
  ConsoleLogger,
  CredoError,
  DidDocument,
  DidRecord,
  DidRepository,
  DidsModule,
  DifPexCredentialsForRequest,
  JsonTransformer,
  JwkDidCreateOptions,
  JwkDidRegistrar,
  JwkDidResolver,
  KeyDidCreateOptions,
  KeyType,
  LogLevel,
  PeerDidCreateOptions,
  Query,
  SdJwtVcRecord,
  SingleContextStorageLruCache,
  TypedArrayEncoder,
  W3cCredentialRecord,
  W3cJsonLdVerifiableCredential,
  WebDidResolver,
  utils,
} from '@credo-ts/core'
// DIDComm
import {
  AgentMessage,
  AutoAcceptCredential,
  AutoAcceptProof,
  BasicMessageEventTypes,
  BasicMessageRecord,
  BasicMessageRepository,
  BasicMessageRole,
  BasicMessageStateChangedEvent,
  ConnectionEventTypes,
  ConnectionRecord,
  ConnectionStateChangedEvent,
  ConnectionType,
  ConnectionsModule,
  CredentialEventTypes,
  CredentialExchangeRecord,
  CredentialPreviewAttribute,
  CredentialState,
  CredentialStateChangedEvent,
  CredentialsModule,
  DidExchangeState,
  DifPresentationExchangeProofFormatService,
  GetCredentialFormatDataReturn,
  GetCredentialsForProofRequestReturn, // TODO: Need to confim
  JsonLdCredentialFormatService,
  JsonLdFormatDataCredentialDetail,
  MediationRecipientModule,
  MediatorPickupStrategy,
  OutOfBandRecord,
  ProofEventTypes,
  ProofExchangeRecord,
  ProofFormatCredentialForRequestPayload, // TODO: Need to confim
  ProofFormatPayload,
  ProofState,
  ProofStateChangedEvent,
  ProofsModule,
  V2CredentialProtocol,
  V2ProofProtocol,
} from '@credo-ts/didcomm'
// Indy VDR
import {
  IndyVdrAnonCredsRegistry,
  IndyVdrIndyDidResolver,
  IndyVdrModule,
  IndyVdrPoolConfig,
  IndyVdrSovDidResolver,
} from '@credo-ts/indy-vdr'
// OpenIDVc
import {
  OpenId4VcHolderModule,
  OpenId4VciAuthorizationFlow,
  OpenId4VciRequestTokenResponse,
  OpenId4VciResolvedAuthorizationRequest,
  OpenId4VciResolvedCredentialOffer,
  OpenId4VciTxCode,
} from '@credo-ts/openid4vc'
import { PushNotificationsFcmModule } from '@credo-ts/push-notifications'
// Q&A
import {
  QuestionAnswerEventTypes,
  QuestionAnswerRecord,
  QuestionAnswerState,
  QuestionAnswerStateChangedEvent,
} from '@credo-ts/question-answer'
import { recordsAddedByType, recordsRemovedByType } from '@credo-ts/react-hooks/build/recordUtils'

export * from './agent'
export * from './providers'
export * from './hooks'
export * from './openid'
export * from './wallet'
export * from './connections'
export * from './credentials'
export * from './proofs'
export * from './basicMessages'
export * from './pushNotifications'
export * from './genericRecords'
export * from './questionAnswer'
export * from './w3cCredentials'
export * from './dids'
// Core
export {
  LogLevel,
  ConsoleLogger,
  type InitConfig,
  ConnectionRecord,
  OutOfBandRecord,
  CredentialExchangeRecord,
  W3cCredentialRecord,
  ProofExchangeRecord,
  ProofState,
  DidExchangeState,
  CredentialState,
  CredentialPreviewAttribute,
  JsonLdFormatDataCredentialDetail,
  Buffer,
  BasicMessageRole,
  GetCredentialFormatDataReturn,
  ProofFormatPayload,
  AgentMessage,
  AutoAcceptProof,
  ConnectionType,
  GetCredentialsForProofRequestReturn,
  ProofFormatCredentialForRequestPayload,
  MediationRecipientModule,
  MediatorPickupStrategy,
  DidsModule,
  JwkDidRegistrar,
  WebDidResolver,
  JwkDidResolver,
  CredentialsModule,
  AutoAcceptCredential,
  V2CredentialProtocol,
  JsonLdCredentialFormatService,
  ProofsModule,
  V2ProofProtocol,
  ConnectionsModule,
  Agent,
  BasicMessageRepository,
  CredoError,
  ConnectionStateChangedEvent,
  CredentialStateChangedEvent,
  ProofStateChangedEvent,
  ConnectionEventTypes,
  CredentialEventTypes,
  ProofEventTypes,
  type GenericRecord,
  type SaveGenericRecordOption,
  Query,
  utils,
  TypedArrayEncoder,
  DifPresentationExchangeProofFormatService,
  JsonTransformer,
  ClaimFormat,
  CacheModule,
  SingleContextStorageLruCache,
  DidRepository,
  KeyType,
  DidRecord,
  W3cJsonLdVerifiableCredential,
  DifPexCredentialsForRequest,
  DidDocument,
  KeyDidCreateOptions,
  PeerDidCreateOptions,
  JwkDidCreateOptions,
  SdJwtVcRecord,
}
// Anoncreds
export {
  V1RequestPresentationMessage,
  AnonCredsCredentialOffer,
  AnonCredsCredentialsForProofRequest,
  AnonCredsRequestedAttributeMatch,
  AnonCredsRequestedPredicateMatch,
  AnonCredsNonRevokedInterval,
  AnonCredsProofRequestRestriction,
  AnonCredsProofFormat,
  AnonCredsProofFormatService,
  LegacyIndyProofFormat,
  LegacyIndyProofFormatService,
  AnonCredsPredicateType,
  AnonCredsProof,
  AnonCredsRequestedAttribute,
  AnonCredsRequestedPredicate,
  LegacyIndyProofRequest,
  AnonCredsProofRequest,
  AnonCredsCredentialMetadataKey,
  AnonCredsModule,
  V1CredentialProtocol,
  LegacyIndyCredentialFormatService,
  AnonCredsCredentialFormatService,
  V1ProofProtocol,
  AnonCredsCredentialInfo,
}
// Indy Vdr
export { IndyVdrAnonCredsRegistry, IndyVdrPoolConfig, IndyVdrIndyDidResolver, IndyVdrModule, IndyVdrSovDidResolver }
// Askar
export { AskarModule }
// Push Notifications
export { PushNotificationsFcmModule }
// Q&A
export { QuestionAnswerRecord, QuestionAnswerEventTypes, QuestionAnswerStateChangedEvent, QuestionAnswerState }
//Basic message
export { BasicMessageEventTypes, BasicMessageStateChangedEvent, BasicMessageRecord }
//openIDC4VCI
export {
  OpenId4VcHolderModule,
  OpenId4VciRequestTokenResponse,
  OpenId4VciAuthorizationFlow,
  OpenId4VciResolvedCredentialOffer,
  OpenId4VciResolvedAuthorizationRequest,
  OpenId4VciTxCode,
  recordsAddedByType,
  recordsRemovedByType,
}
