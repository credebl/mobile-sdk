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

export type DidCommDynamicModules = Record<string, Module>

export interface DidCommConfiguration
  extends Pick<DidCommMediationRecipientModuleConfigOptions, 'mediatorInvitationUrl' | 'mediatorPickupStrategy'>,
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
      mediatorInvitationUrl: configuration.mediatorInvitationUrl,
      mediatorPickupStrategy: configuration.mediatorPickupStrategy,
    },
    processDidCommMessagesConcurrently: configuration.processDidCommMessagesConcurrently,
    transports: {
      outbound: [new DidCommHttpOutboundTransport(), new DidCommWsOutboundTransport()],
    },
    questionAnswer: new QuestionAnswerModule(),

    ...(configuration.modules ?? {}),
  }),
})

export type DidCommAgent = Agent<ReturnType<typeof getDidCommModules>>

export class DidCommSDK implements MobileSDKModule {
  private agent?: DidCommAgent
  private configuration: DidCommConfiguration

  public constructor(configuration: DidCommConfiguration) {
    this.configuration = configuration
  }

  private assertAndGetAgent(): DidCommAgent {
    if (!this.agent) {
      throw new Error('Agent not initialized')
    }

    return this.agent
  }

  public initialize(agent: DidCommAgent): void {
    this.agent = agent
  }

  public getAgentModules() {
    return getDidCommModules(this.configuration)
  }
}
