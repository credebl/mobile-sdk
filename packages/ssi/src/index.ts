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
  AgentMessage,
  AutoAcceptCredential,
  AutoAcceptProof,
  BasicMessageEventTypes,
  BasicMessageRecord,
  BasicMessageRepository,
  BasicMessageRole,
  BasicMessageStateChangedEvent,
  Buffer,
  CacheModule,
  ClaimFormat,
  ConnectionEventTypes,
  ConnectionRecord,
  ConnectionStateChangedEvent,
  ConnectionType,
  ConnectionsModule,
  ConsoleLogger,
  CredentialEventTypes,
  CredentialExchangeRecord,
  CredentialPreviewAttribute,
  CredentialState,
  CredentialStateChangedEvent,
  CredentialsModule,
  CredoError,
  DidDocument,
  DidExchangeState,
  DidRecord,
  DidRepository,
  DidsModule,
  DifPexCredentialsForRequest,
  DifPresentationExchangeProofFormatService,
  GetCredentialFormatDataReturn,
  JsonLdCredentialFormatService,
  JsonLdFormatDataCredentialDetail,
  JsonTransformer,
  JwkDidCreateOptions,
  JwkDidRegistrar,
  JwkDidResolver,
  KeyDidCreateOptions,
  KeyType,
  LogLevel,
  MediationRecipientModule,
  MediatorPickupStrategy,
  OutOfBandRecord,
  PeerDidCreateOptions,
  ProofEventTypes,
  ProofExchangeRecord,
  ProofFormatPayload,
  ProofState,
  ProofStateChangedEvent,
  ProofsModule,
  Query,
  SdJwtVcRecord,
  SingleContextStorageLruCache,
  TypedArrayEncoder,
  V2CredentialProtocol,
  V2ProofProtocol,
  W3cCredentialRecord,
  W3cJsonLdVerifiableCredential,
  WebDidResolver,
  utils,
} from '@credo-ts/core'
import {
  GetCredentialsForRequestReturn,
  ProofFormatDataMessagePayload,
} from '@credo-ts/core/build/modules/proofs/protocol/ProofProtocolOptions'
// Indy VDR
import {
  IndyVdrAnonCredsRegistry,
  IndyVdrIndyDidResolver,
  IndyVdrModule,
  IndyVdrPoolConfig,
  IndyVdrSovDidResolver,
} from '@credo-ts/indy-vdr'
import { OpenId4VcHolderModule } from '@credo-ts/openid4vc'
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
  GetCredentialsForRequestReturn,
  ProofFormatDataMessagePayload,
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
export { OpenId4VcHolderModule, recordsAddedByType, recordsRemovedByType }
