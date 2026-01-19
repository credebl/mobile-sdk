import {
  AnonCredsCredentialFormatService,
  AnonCredsModule,
  AnonCredsProofFormatService,
  DataIntegrityCredentialFormatService,
  LegacyIndyCredentialFormatService,
  LegacyIndyProofFormatService,
  V1CredentialProtocol,
  V1ProofProtocol,
} from '@credo-ts/anoncreds'
import { AskarModule } from '@credo-ts/askar'
import { Agent, DidsModule, PeerDidNumAlgo, WebDidResolver, X509Module } from '@credo-ts/core'
import type { InitConfig } from '@credo-ts/core'
import {
  AutoAcceptCredential,
  AutoAcceptProof,
  BasicMessagesModule,
  ConnectionsModule,
  CredentialsModule,
  DidCommModule,
  DifPresentationExchangeProofFormatService,
  DiscoverFeaturesModule,
  HttpOutboundTransport,
  JsonLdCredentialFormatService,
  MediationRecipientModule,
  type MediatorPickupStrategy,
  MessagePickupModule,
  OutOfBandModule,
  ProofsModule,
  V2CredentialProtocol,
  V2ProofProtocol,
  WsOutboundTransport,
} from '@credo-ts/didcomm'
import { IndyVdrAnonCredsRegistry } from '@credo-ts/indy-vdr'
import { OpenId4VcHolderModule } from '@credo-ts/openid4vc'
import { QuestionAnswerModule } from '@credo-ts/question-answer'
import { agentDependencies } from '@credo-ts/react-native'
import { anoncreds } from '@hyperledger/anoncreds-react-native'
import { askar } from '@openwallet-foundation/askar-react-native'

export type AdeyaAgentModuleOptions = {
  mediatorInvitationUrl: string
  mediatorPickupStrategy: MediatorPickupStrategy
  maximumMessagePickup?: number
  trustedCertificates?: [string, ...string[]]
}

export type AdeyaAgentModules = ReturnType<typeof getAgentModules>

export type AdeyaAgent = Agent<AdeyaAgentModules>

export const getAgentModules = (options: AdeyaAgentModuleOptions) => {
  const modules = {
    askar: new AskarModule({
      askar,
    }),
    dids: new DidsModule({
      registrars: [],
      resolvers: [new WebDidResolver()],
    }),
    didcomm: new DidCommModule(),
    credentials: new CredentialsModule({
      autoAcceptCredentials: AutoAcceptCredential.ContentApproved,
      credentialProtocols: [
        new V1CredentialProtocol({
          indyCredentialFormat: new LegacyIndyCredentialFormatService(),
        }),
        new V2CredentialProtocol({
          credentialFormats: [
            new LegacyIndyCredentialFormatService(),
            new AnonCredsCredentialFormatService(),
            new DataIntegrityCredentialFormatService(),
            new JsonLdCredentialFormatService(),
          ],
        }),
      ],
    }),
    proofs: new ProofsModule({
      autoAcceptProofs: AutoAcceptProof.ContentApproved,
      proofProtocols: [
        new V1ProofProtocol({
          indyProofFormat: new LegacyIndyProofFormatService(),
        }),
        new V2ProofProtocol({
          proofFormats: [
            new LegacyIndyProofFormatService(),
            new AnonCredsProofFormatService(),
            new DifPresentationExchangeProofFormatService(),
          ],
        }),
      ],
    }),
    connections: new ConnectionsModule({
      autoAcceptConnections: true,
      peerNumAlgoForDidExchangeRequests: PeerDidNumAlgo.GenesisDoc,
      peerNumAlgoForDidRotation: PeerDidNumAlgo.ShortFormAndLongForm,
    }),
    basicMessages: new BasicMessagesModule(),
    oob: new OutOfBandModule(),
    messagePickup: new MessagePickupModule(),
    discovery: new DiscoverFeaturesModule(),
    questionAnswer: new QuestionAnswerModule(),
    openId4VcHolder: new OpenId4VcHolderModule(),
    x509: new X509Module({
      trustedCertificates: options?.trustedCertificates
    }),
    anoncreds: new AnonCredsModule({
      registries: [new IndyVdrAnonCredsRegistry()],
      anoncreds,
    }),
    mediationRecipient: new MediationRecipientModule({
      mediatorInvitationUrl: options.mediatorInvitationUrl,
      mediatorPickupStrategy: options.mediatorPickupStrategy,
      maximumMessagePickup: options.maximumMessagePickup ?? 5,
    }),
  }

  // Only add mediation if options are provided
  // if (options?.mediatorInvitationUrl && options?.mediatorPickupStrategy) {
  //   return {
  //     ...modules,
  //     mediationRecipient: new MediationRecipientModule({
  //       mediatorInvitationUrl: options.mediatorInvitationUrl,
  //       mediatorPickupStrategy: options.mediatorPickupStrategy,
  //       maximumMessagePickup: options.maximumMessagePickup ?? 5,
  //     }),
  //   }
  // }

  return modules
}

export const initializeAgent = async ({
  agentConfig,
  modules,
}: {
  agentConfig: InitConfig
  modules: AdeyaAgentModules
}) => {
  const agent = new Agent({
    dependencies: agentDependencies,
    config: {
      autoUpdateStorageOnStartup: true,
      ...agentConfig,
    },
    modules,
  })

  agent.modules.didcomm.registerOutboundTransport(new HttpOutboundTransport())
  agent.modules.didcomm.registerOutboundTransport(new WsOutboundTransport())

  await agent.initialize()
  await agent.modules.mediationRecipient.initialize()

  return agent
}
