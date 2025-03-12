import type { InitConfig, MediatorPickupStrategy } from '@credo-ts/core'
import type { AgentModulesInput } from '@credo-ts/core/build/agent/AgentModules'
import type { IndyVdrPoolConfig } from '@credo-ts/indy-vdr'

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
import {
  Agent,
  AutoAcceptCredential,
  AutoAcceptProof,
  ConnectionsModule,
  CredentialsModule,
  DidsModule,
  DifPresentationExchangeProofFormatService,
  HttpOutboundTransport,
  JsonLdCredentialFormatService,
  MediationRecipientModule,
  ProofsModule,
  V2CredentialProtocol,
  V2ProofProtocol,
  WebDidResolver,
  WsOutboundTransport,
} from '@credo-ts/core'
import {
  IndyVdrAnonCredsRegistry,
  IndyVdrIndyDidResolver,
  IndyVdrModule,
  IndyVdrSovDidResolver,
} from '@credo-ts/indy-vdr'
import { PushNotificationsFcmModule } from '@credo-ts/push-notifications'
import { QuestionAnswerModule } from '@credo-ts/question-answer'
import { agentDependencies } from '@credo-ts/react-native'
import { anoncreds } from '@hyperledger/anoncreds-react-native'
import { ariesAskar } from '@hyperledger/aries-askar-react-native'
import { indyVdr } from '@hyperledger/indy-vdr-react-native'

export type AdeyaAgentModuleOptions = {
  mediatorInvitationUrl: string
  mediatorPickupStrategy: MediatorPickupStrategy
  indyNetworks: [IndyVdrPoolConfig, ...IndyVdrPoolConfig[]]
  maximumMessagePickup?: number
}

export const getAgentModules = ({
  mediatorInvitationUrl,
  mediatorPickupStrategy,
  indyNetworks,
  maximumMessagePickup = 5,
}: AdeyaAgentModuleOptions) => {
  return {
    askar: new AskarModule({
      ariesAskar,
    }),
    anoncreds: new AnonCredsModule({
      registries: [new IndyVdrAnonCredsRegistry()],
      anoncreds,
    }),
    mediationRecipient: new MediationRecipientModule({
      mediatorInvitationUrl,
      mediatorPickupStrategy,
      maximumMessagePickup,
    }),
    dids: new DidsModule({
      registrars: [],
      resolvers: [new WebDidResolver(), new IndyVdrSovDidResolver(), new IndyVdrIndyDidResolver()],
    }),
    indyVdr: new IndyVdrModule({
      indyVdr,
      networks: indyNetworks,
    }),
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
    }),
    pushNotificationsFcm: new PushNotificationsFcmModule(),
    questionAnswer: new QuestionAnswerModule(),
  }
}

export const initializeAgent = async ({
  agentConfig,
  modules,
}: {
  agentConfig: InitConfig
  modules: AgentModulesInput
}) => {
  const agent = new Agent({
    dependencies: agentDependencies,
    config: {
      autoUpdateStorageOnStartup: true,
      ...agentConfig,
    },
    modules,
  })

  agent.registerOutboundTransport(new HttpOutboundTransport())
  agent.registerOutboundTransport(new WsOutboundTransport())

  await agent.initialize()

  return agent
}
