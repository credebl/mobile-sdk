import { AskarModule } from '@credo-ts/askar'
import {
  Agent,
  CacheModule,
  type DidCreateOptions,
  DidRepository,
  DidsModule,
  type InitConfig,
  JwkDidRegistrar,
  JwkDidResolver,
  KeyDidRegistrar,
  KeyDidResolver,
  SingleContextStorageLruCache,
  type TagValue,
} from '@credo-ts/core'
import type { AgentModulesInput } from '@credo-ts/core/build/agent/AgentModules'
import { agentDependencies } from '@credo-ts/react-native'
import { askar } from '@openwallet-foundation/askar-react-native'
import type { PropsWithChildren } from 'react'
import { useMobileSDK } from './contexts'
import AgentProvider from './providers/AgentProvider'

const getCoreModules = () => {
  return {
    askar: new AskarModule({
      askar,
    }),
    dids: new DidsModule({
      registrars: [new JwkDidRegistrar(), new KeyDidRegistrar()],
      resolvers: [new JwkDidResolver(), new KeyDidResolver()],
    }),
    cache: new CacheModule({
      cache: new SingleContextStorageLruCache({
        limit: 50,
      }),
    }),
  }
}

export interface MobileSDKModule {
  initialize(agent: Agent): void
  getAgentModules(): AgentModulesInput
}

export type MobileSDKOptions<T extends Record<string, MobileSDKModule> = Record<string, MobileSDKModule>> = {
  agentConfig: InitConfig
  modules: T
  defaultModules?: AgentModulesInput
}

export class MobileSDK<T extends Record<string, MobileSDKModule> = Record<string, MobileSDKModule>> {
  private localAgent: Agent | null = null
  public readonly configuration: MobileSDKOptions<T>
  public readonly modules: T

  public constructor(options: MobileSDKOptions<T>) {
    this.configuration = options
    this.modules = options.modules
  }

  public async initialize() {
    const defaultModules = this.configuration.defaultModules ?? {}
    const coreModules = getCoreModules()
    Object.assign(defaultModules, coreModules)

    const modules = Object.entries(this.configuration.modules).reduce((acc, [, module]) => {
      const moduleModules = module.getAgentModules()
      Object.assign(acc, moduleModules)
      return acc
    }, defaultModules)

    const agent = new Agent({
      config: this.configuration.agentConfig,
      dependencies: agentDependencies,
      modules,
    })
    await agent.initialize()

    // Initialize modules after agent is initialized to ensure all dependencies are available
    for await (const [, module] of Object.entries(this.configuration.modules)) {
      module.initialize(agent)
    }

    this.localAgent = agent
    return agent
  }

  public get agent() {
    return this.localAgent
  }

  public assertAndGetAgent() {
    if (!this.agent) {
      throw new Error('Agent not initialized')
    }

    return this.agent
  }

  public static AppProvider({ children }: PropsWithChildren) {
    const { sdk } = useMobileSDK()

    if (!sdk?.agent) {
      throw new Error('Mobile SDK not initialized')
    }

    return <AgentProvider agent={sdk.agent}>{children}</AgentProvider>
  }

  public async createDid<T extends DidCreateOptions>(options: T) {
    const agent = this.assertAndGetAgent()

    const did = await agent.dids.create<T>(options)

    return did
  }

  public async getDids({
    method,
    did,
    tag,
    tagValue,
  }: { method?: string; did?: string; tag?: string; tagValue?: TagValue }) {
    const agent = this.assertAndGetAgent()

    if (tag) {
      const didRepository = await agent.dependencyManager.resolve(DidRepository)

      const didRecord = await didRepository.findSingleByQuery(agent.context, tagValue ? { [tag]: tagValue } : { tag })
      return didRecord ? [didRecord] : []
    }

    const dids = await agent.dids.getCreatedDids({
      method,
      did,
    })
    return dids
  }

  public async addTagToDid({ did, tag, tagValue }: { did: string; tag: string; tagValue: TagValue }) {
    const agent = this.assertAndGetAgent()
    const didRecords = await this.getDids({ did })

    if (didRecords.length === 0) {
      throw new Error('Did not found')
    }

    const didRecord = didRecords[0]
    await didRecord.setTag(tag, tagValue)

    const didRepository = await agent.dependencyManager.resolve(DidRepository)

    await didRepository.update(agent.context, didRecord)

    return didRecord
  }

  public async resolveDid({ did }: { did: string }) {
    const agent = this.assertAndGetAgent()
    const didResolutionResult = await agent.dids.resolve(did)
    return didResolutionResult
  }

  public async deleteCredential({
    id,
    format,
  }: {
    id: string
    format: 'sd-jwt' | 'mdoc' | 'w3c'
  }) {
    const agent = this.assertAndGetAgent()

    if (format === 'sd-jwt') {
      await agent.sdJwtVc.deleteById(id)
    } else if (format === 'mdoc') {
      await agent.mdoc.deleteById(id)
    } else if (format === 'w3c') {
      await agent.w3cCredentials.removeCredentialRecord(id)
      return
    } else {
      throw new Error('Credential format not supported')
    }
  }
}
