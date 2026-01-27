import type { MobileSDKModule } from '@credebl/ssi-mobile-core'
import {
  AnonCredsDidCommCredentialFormatService,
  AnonCredsDidCommProofFormatService,
  DataIntegrityDidCommCredentialFormatService,
  LegacyIndyDidCommCredentialFormatService,
  LegacyIndyDidCommProofFormatService,
} from '@credo-ts/anoncreds'
import { Agent, Module } from '@credo-ts/core'
import {
  DidCommAutoAcceptCredential,
  DidCommAutoAcceptProof,
  DidCommConnectionsModuleConfigOptions,
  DidCommCredentialV2Protocol,
  DidCommDifPresentationExchangeProofFormatService,
  DidCommHttpOutboundTransport,
  DidCommJsonLdCredentialFormatService,
  DidCommModule,
  DidCommModuleConfigOptions,
  DidCommProofV2Protocol,
  DidCommWsOutboundTransport,
} from '@credo-ts/didcomm'
import { DidCommMediationRecipientModuleConfigOptions } from '@credo-ts/didcomm/build/modules/routing/DidCommMediationRecipientModuleConfig.mjs'
import { QuestionAnswerModule } from '@credo-ts/question-answer'
import { BasicMessagesApi } from './basicMessages'
import { ConnectionsApi } from './connections/ConnectionsApi'
import { CredentialsApi } from './credentials'
import { MediationRecipientApi } from './mediationReciepient'
import { ProofsApi } from './proofs'
import { QuestionAnswerApi } from './questionAnswer'

export type DidCommDynamicModules = Record<string, Module>

export interface DidCommConfiguration
  extends Pick<DidCommMediationRecipientModuleConfigOptions, 'mediatorPickupStrategy'>,
    Pick<DidCommConnectionsModuleConfigOptions, 'peerNumAlgoForDidExchangeRequests' | 'peerNumAlgoForDidRotation'>,
    Pick<DidCommModuleConfigOptions, 'processDidCommMessagesConcurrently'> {
  modules?: DidCommDynamicModules
}

export const getDidCommModules = (configuration: DidCommConfiguration) => ({
  didcomm: new DidCommModule({
    connections: {
      autoAcceptConnections: true,
      peerNumAlgoForDidExchangeRequests: configuration.peerNumAlgoForDidExchangeRequests,
      peerNumAlgoForDidRotation: configuration.peerNumAlgoForDidRotation,
    },
    credentials: {
      autoAcceptCredentials: DidCommAutoAcceptCredential.ContentApproved,
      credentialProtocols: [
        new DidCommCredentialV2Protocol({
          credentialFormats: [
            new LegacyIndyDidCommCredentialFormatService(),
            new AnonCredsDidCommCredentialFormatService(),
            new DataIntegrityDidCommCredentialFormatService(),
            new DidCommJsonLdCredentialFormatService(),
          ],
        }),
      ],
    },
    proofs: {
      autoAcceptProofs: DidCommAutoAcceptProof.ContentApproved,
      proofProtocols: [
        new DidCommProofV2Protocol({
          proofFormats: [
            new LegacyIndyDidCommProofFormatService(),
            new AnonCredsDidCommProofFormatService(),
            new DidCommDifPresentationExchangeProofFormatService(),
          ],
        }),
      ],
    },
    mediationRecipient: {
      mediatorPickupStrategy: configuration.mediatorPickupStrategy,
    },
    processDidCommMessagesConcurrently: configuration.processDidCommMessagesConcurrently,
    transports: {
      outbound: [new DidCommHttpOutboundTransport(), new DidCommWsOutboundTransport()],
    },
  }),
  questionAnswer: new QuestionAnswerModule(),
  ...(configuration.modules ?? {}),
})

export type DidCommAgentModules = ReturnType<typeof getDidCommModules>

export type DidCommAgent = Agent<DidCommAgentModules>

export class DidCommSDK implements MobileSDKModule {
  private _agent?: DidCommAgent
  private configuration: DidCommConfiguration

  private _connections?: ConnectionsApi
  private _credentials?: CredentialsApi
  private _proofs?: ProofsApi
  private _basicMessages?: BasicMessagesApi
  private _questionAnswer?: QuestionAnswerApi
  private _mediatorRecipient?: MediationRecipientApi

  public constructor(configuration: DidCommConfiguration) {
    this.configuration = configuration
  }

  public initialize(agent: DidCommAgent): void {
    this._agent = agent
    this._connections = new ConnectionsApi(agent)
    this._credentials = new CredentialsApi(agent)
    this._proofs = new ProofsApi(agent)
    this._basicMessages = new BasicMessagesApi(agent)
    this._questionAnswer = new QuestionAnswerApi(agent)
    this._mediatorRecipient = new MediationRecipientApi(agent)
  }

  public get agent(): DidCommAgent {
    if (!this._agent) {
      throw new Error('Agent not initialized. Call initialize() first.')
    }
    return this._agent
  }

  public getAgentModules() {
    return getDidCommModules(this.configuration)
  }

  public get connections(): ConnectionsApi {
    if (!this._connections) {
      throw new Error('Agent not initialized. Call initialize() first.')
    }
    return this._connections
  }

  public get credentials(): CredentialsApi {
    if (!this._credentials) {
      throw new Error('Agent not initialized. Call initialize() first.')
    }
    return this._credentials
  }

  public get proofs(): ProofsApi {
    if (!this._proofs) {
      throw new Error('Agent not initialized. Call initialize() first.')
    }
    return this._proofs
  }

  public get basicMessages(): BasicMessagesApi {
    if (!this._basicMessages) {
      throw new Error('Agent not initialized. Call initialize() first.')
    }
    return this._basicMessages
  }

  public get questionAnswer(): QuestionAnswerApi {
    if (!this._questionAnswer) {
      throw new Error('Agent not initialized. Call initialize() first.')
    }
    return this._questionAnswer
  }

  public get mediatorRecipient(): MediationRecipientApi {
    if (!this._mediatorRecipient) {
      throw new Error('Agent not initialized. Call initialize() first.')
    }
    return this._mediatorRecipient
  }
}
