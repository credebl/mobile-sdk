import type { MobileSDKModule } from '@credebl/ssi-mobile-core'
import {
  AnonCredsDidCommCredentialFormatService,
  AnonCredsDidCommProofFormatService,
  AnonCredsModule,
  type AnonCredsRegistry,
  DataIntegrityDidCommCredentialFormatService,
  LegacyIndyDidCommCredentialFormatService,
  LegacyIndyDidCommProofFormatService,
} from '@credo-ts/anoncreds'
import { Agent } from '@credo-ts/core'
import type { DidCommMediatorPickupStrategy } from '@credo-ts/didcomm'
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
import { IndyVdrAnonCredsRegistry, IndyVdrModule, type IndyVdrPoolConfig } from '@credo-ts/indy-vdr'
import { QuestionAnswerModule } from '@credo-ts/question-answer'
import { anoncreds } from '@hyperledger/anoncreds-react-native'
import { indyVdr } from '@hyperledger/indy-vdr-react-native'
import { PropsWithChildren } from 'react'
import { BasicMessagesApi } from './basicMessages'
import { ConnectionsApi } from './connections'
import { CredentialsApi } from './credentials'
import { MediationRecipientApi } from './mediationRecipient'
import { ProofsApi } from './proofs'
import {
  BasicMessageProvider,
  ConnectionProvider,
  CredentialFormatDataProvider,
  CredentialProvider,
  ProofFormatDataProvider,
  ProofProvider,
  QuestionAnswerProvider,
} from './providers'
import { QuestionAnswerApi } from './questionAnswer'

export interface DidCommConfiguration
  extends Pick<
      DidCommConnectionsModuleConfigOptions,
      'peerNumAlgoForDidExchangeRequests' | 'peerNumAlgoForDidRotation'
    >,
    Pick<DidCommModuleConfigOptions, 'processDidCommMessagesConcurrently'> {
  /**
   * Strategy to use for picking up messages from the mediator. If no strategy is provided, the agent will use the discover
   * features protocol to determine the best strategy.
   *
   *
   * - `DidCommMediatorPickupStrategy.PickUpV1`         - explicitly pick up messages from the mediator in periodic loops according to [RFC 0212 Pickup Protocol](https://github.com/hyperledger/aries-rfcs/blob/main/features/0212-pickup/README.md)
   * - `DidCommMediatorPickupStrategy.PickUpV2`         - pick up messages from the mediator in periodic loops according to [RFC 0685 Pickup V2 Protocol](https://github.com/hyperledger/aries-rfcs/tree/main/features/0685-pickup-v2/README.md).
   * - `DidCommMediatorPickupStrategy.PickUpV2LiveMode` - pick up messages from the mediator using Live Mode as specified in [RFC 0685 Pickup V2 Protocol](https://github.com/hyperledger/aries-rfcs/tree/main/features/0685-pickup-v2/README.md).
   * - `DidCommMediatorPickupStrategy.Implicit`         - Open a WebSocket with the mediator to implicitly receive messages. (currently used by Aries Cloud Agent Python)
   * - `DidCommMediatorPickupStrategy.None`             - Do not retrieve messages from the mediator automatically. You can launch manual pickup flows afterwards.
   *
   * @default undefined
   */
  mediatorPickupStrategy?: DidCommMediatorPickupStrategy
  anoncreds?: {
    registries: AnonCredsRegistry[]
  }
  indyVdr?: {
    networks: [IndyVdrPoolConfig, ...IndyVdrPoolConfig[]]
  }
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

  anoncreds: new AnonCredsModule({
    registries: [new IndyVdrAnonCredsRegistry(), ...(configuration.anoncreds?.registries ?? [])],
    anoncreds,
  }),

  ...(configuration.indyVdr && {
    indyVdr: new IndyVdrModule({
      indyVdr,
      networks: configuration.indyVdr.networks,
    }),
  }),
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

  public static DidCommProvider({ agent, children }: PropsWithChildren<{ agent: Agent }>) {
    return (
      <ConnectionProvider agent={agent}>
        <CredentialProvider agent={agent}>
          <ProofProvider agent={agent}>
            <CredentialFormatDataProvider agent={agent}>
              <ProofFormatDataProvider agent={agent}>
                <BasicMessageProvider agent={agent}>
                  <QuestionAnswerProvider agent={agent}>{children}</QuestionAnswerProvider>
                </BasicMessageProvider>
              </ProofFormatDataProvider>
            </CredentialFormatDataProvider>
          </ProofProvider>
        </CredentialProvider>
      </ConnectionProvider>
    )
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
