import { AskarModule, type AskarModuleConfigStoreOptions } from '@credo-ts/askar'
import {
  Agent,
  CacheModule,
  type DidCreateOptions,
  DidRepository,
  DidsModule,
  GenericRecord,
  GenericRecordTags,
  type InitConfig,
  JwkDidRegistrar,
  JwkDidResolver,
  KeyDidRegistrar,
  KeyDidResolver,
  MdocRecord,
  MdocRepository,
  type ModulesMap,
  type Query,
  type QueryOptions,
  SdJwtVcRecord,
  SdJwtVcRepository,
  SingleContextStorageLruCache,
  type TagValue,
  W3cCredentialRecord,
  W3cCredentialRepository,
} from '@credo-ts/core'
import { KmsCreateKeyOptions, KmsCreateKeyType, KmsSignOptions, KmsVerifyOptions } from '@credo-ts/core/kms'
import { agentDependencies } from '@credo-ts/react-native'
import { askar } from '@openwallet-foundation/askar-react-native'
import type { PropsWithChildren } from 'react'
import { useMobileSDK } from './contexts'
import AgentProvider from './providers/AgentProvider'

export type WithBackend<T> = T & {
  /**
   * The backend to use for creating the key. If not provided the
   * default backend for key operations will be used.
   */
  backend?: string
}

export enum CredentialRecord {
  SdJwt = 'sd-jwt',
  Mdoc = 'mdoc',
  W3c = 'w3c',
}
const getCoreModules = (askarConfig: AskarModuleConfigStoreOptions) => {
  return {
    askar: new AskarModule({
      askar,
      store: {
        id: askarConfig.id,
        key: askarConfig.key,
        keyDerivationMethod: askarConfig.keyDerivationMethod === 'raw' ? 'raw' : 'kdf:argon2i:mod',
      },
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
  getAgentModules(): ModulesMap
}

export type MobileSDKOptions<T extends Record<string, MobileSDKModule> = Record<string, MobileSDKModule>> = {
  agentConfig: InitConfig
  askarConfig: AskarModuleConfigStoreOptions
  modules: T
  defaultModules?: ModulesMap
}
export class MobileSDK<T extends Record<string, MobileSDKModule> = Record<string, MobileSDKModule>> {
  private localAgent: Agent<ReturnType<typeof getCoreModules>> | null = null
  public readonly configuration: MobileSDKOptions<T>
  public readonly modules: T

  public constructor(options: MobileSDKOptions<T>) {
    this.configuration = options
    this.modules = options.modules
  }

  public static async initializeSDK(options: MobileSDKOptions<any>): Promise<{ sdk: MobileSDK; agent: Agent }> {
    const sdk = new MobileSDK(options)
    const agent = await sdk.initialize()
    return { sdk, agent }
  }

  async initialize() {
    const defaultModules = this.configuration.defaultModules ?? {}
    const coreModules = getCoreModules(this.configuration.askarConfig)
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

    this.localAgent = agent as Agent<ReturnType<typeof getCoreModules>>
    return this.localAgent
  }

  public get agent() {
    return this.localAgent
  }

  public assertAndGetAgent(): Agent<ReturnType<typeof getCoreModules>> {
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
  }: {
    method?: string
    did?: string
    tag?: string
    tagValue?: TagValue
  }) {
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

  public async deleteCredential({ id, format }: { id: string; format: CredentialRecord }) {
    const agent = this.assertAndGetAgent()

    if (format === CredentialRecord.SdJwt) {
      await agent.sdJwtVc.deleteById(id)
    } else if (format === CredentialRecord.Mdoc) {
      await agent.mdoc.deleteById(id)
    } else if (format === CredentialRecord.W3c) {
      await agent.w3cCredentials.deleteById(id)
      return
    } else {
      throw new Error('Credential format not supported')
    }
  }

  public async storeOpenIdCredential(cred: W3cCredentialRecord | SdJwtVcRecord | MdocRecord): Promise<void> {
    const agent = this.assertAndGetAgent()
    if (cred instanceof W3cCredentialRecord) {
      await agent.dependencyManager.resolve(W3cCredentialRepository).save(agent.context, cred)
    } else if (cred instanceof SdJwtVcRecord) {
      await agent.dependencyManager.resolve(SdJwtVcRepository).save(agent.context, cred)
    } else if (cred instanceof MdocRecord) {
      await agent.dependencyManager.resolve(MdocRepository).save(agent.context, cred)
    } else {
      throw new Error('Credential type is not supported')
    }
  }

  private getRepositories(
    agent: Agent,
    format?: CredentialRecord
  ): (SdJwtVcRepository | MdocRepository | W3cCredentialRepository)[] {
    if (format === CredentialRecord.SdJwt) {
      return [agent.dependencyManager.resolve(SdJwtVcRepository)]
    } else if (format === CredentialRecord.Mdoc) {
      return [agent.dependencyManager.resolve(MdocRepository)]
    } else if (format === CredentialRecord.W3c) {
      return [agent.dependencyManager.resolve(W3cCredentialRepository)]
    }

    return [
      agent.dependencyManager.resolve(SdJwtVcRepository),
      agent.dependencyManager.resolve(MdocRepository),
      agent.dependencyManager.resolve(W3cCredentialRepository),
    ]
  }

  public async setTagsToCredential({
    credId,
    tags,
    format,
  }: {
    credId: string
    tags: Record<string, TagValue>
    format?: CredentialRecord
  }) {
    if (!credId?.trim()) {
      throw new Error('credId is required and cannot be empty')
    }
    if (!tags || Object.keys(tags).length === 0) {
      throw new Error('At least one tag must be provided')
    }

    const agent = this.assertAndGetAgent()
    const repositories = this.getRepositories(agent, format)

    let lastError: Error | null = null

    for (const repository of repositories) {
      try {
        const credRecord = await repository.getById(agent.context, credId)

        credRecord.setTags(tags)

        if (repository instanceof W3cCredentialRepository) {
          await repository.update(agent.context, credRecord as W3cCredentialRecord)
        } else if (repository instanceof SdJwtVcRepository) {
          await repository.update(agent.context, credRecord as SdJwtVcRecord)
        } else if (repository instanceof MdocRepository) {
          await repository.update(agent.context, credRecord as MdocRecord)
        }
        return credRecord
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
      }
    }

    throw new Error(
      `Credential with id '${credId}' not found in any supported repository${
        lastError ? `. Last error: ${lastError.message}` : ''
      }`
    )
  }

  public async getCredentialsByTag({ tags, format }: { tags: Record<string, any>; format?: CredentialRecord }) {
    const agent = this.assertAndGetAgent()
    const repositories = this.getRepositories(agent, format)

    const results = []

    for (const repository of repositories) {
      const records = await repository.findByQuery(agent.context, tags)
      results.push(...records)
    }

    return results
  }

  public async exportWallet(exportToStore: AskarModuleConfigStoreOptions) {
    const agent = this.assertAndGetAgent()
    await agent.modules.askar.exportStore({ exportToStore })
  }

  public async addGenericRecord({
    content,
    tags,
    id,
  }: {
    content: Record<string, unknown>
    tags?: GenericRecordTags
    id?: string
  }): Promise<GenericRecord> {
    const agent = this.assertAndGetAgent()
    return agent.genericRecords.save({ content, tags, id })
  }

  public async updateGenericRecord(record: GenericRecord): Promise<void> {
    const agent = this.assertAndGetAgent()
    return agent.genericRecords.update(record)
  }

  public async getGenericRecord(id: string): Promise<GenericRecord | null> {
    const agent = this.assertAndGetAgent()
    return agent.genericRecords.findById(id)
  }

  public async findGenericRecordsByQuery(
    query: Query<GenericRecord>,
    queryOptions?: QueryOptions
  ): Promise<GenericRecord[]> {
    const agent = this.assertAndGetAgent()
    return agent.genericRecords.findAllByQuery(query, queryOptions)
  }

  public async deleteGenericRecord(id: string): Promise<void> {
    const agent = this.assertAndGetAgent()
    return agent.genericRecords.deleteById(id)
  }

  public async createKey<Type extends KmsCreateKeyType>(options: WithBackend<KmsCreateKeyOptions<Type>>) {
    const agent = this.assertAndGetAgent()
    return agent.kms.createKey(options)
  }

  public async signData(options: WithBackend<KmsSignOptions>) {
    const agent = this.assertAndGetAgent()
    return agent.kms.sign(options)
  }

  public async verifyData(options: WithBackend<KmsVerifyOptions>) {
    const agent = this.assertAndGetAgent()
    return agent.kms.verify(options)
  }
}
