import { AskarModule } from "@credo-ts/askar";
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
  MdocRecord,
  MdocRepository,
  SdJwtVcRecord,
  SdJwtVcRepository,
  SingleContextStorageLruCache,
  type TagValue,
  W3cCredentialRecord,
  W3cCredentialRepository,
} from "@credo-ts/core";
import type { AgentModulesInput } from "@credo-ts/core/build/agent/AgentModules";
import { agentDependencies } from "@credo-ts/react-native";
import { askar } from "@openwallet-foundation/askar-react-native";
import type { PropsWithChildren } from "react";
import { useMobileSDK } from "./contexts";
import AgentProvider from "./providers/AgentProvider";

export type CredentialFormat = "sd-jwt" | "mdoc" | "w3c";

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
  };
};

export interface MobileSDKModule {
  initialize(agent: Agent): void;
  getAgentModules(): AgentModulesInput;
}

export type MobileSDKOptions<
  T extends Record<string, MobileSDKModule> = Record<string, MobileSDKModule>
> = {
  agentConfig: InitConfig;
  modules: T;
  defaultModules?: AgentModulesInput;
};
export class MobileSDK<
  T extends Record<string, MobileSDKModule> = Record<string, MobileSDKModule>
> {
  private localAgent: Agent | null = null;
  public readonly configuration: MobileSDKOptions<T>;
  public readonly modules: T;

  public constructor(options: MobileSDKOptions<T>) {
    this.configuration = options;
    this.modules = options.modules;
  }

  public static async initializeSDK(
    options: MobileSDKOptions<any>
  ): Promise<{ sdk: MobileSDK; agent: Agent }> {
    const sdk = new MobileSDK(options);
    const agent = await sdk.initialize();
    return { sdk, agent };
  }

  async initialize() {
    const defaultModules = this.configuration.defaultModules ?? {};
    const coreModules = getCoreModules();
    Object.assign(defaultModules, coreModules);

    const modules = Object.entries(this.configuration.modules).reduce(
      (acc, [, module]) => {
        const moduleModules = module.getAgentModules();
        Object.assign(acc, moduleModules);
        return acc;
      },
      defaultModules
    );

    const agent = new Agent({
      config: this.configuration.agentConfig,
      dependencies: agentDependencies,
      modules,
    });
    await agent.initialize();

    // Initialize modules after agent is initialized to ensure all dependencies are available
    for await (const [, module] of Object.entries(this.configuration.modules)) {
      module.initialize(agent);
    }

    this.localAgent = agent;
    return agent;
  }

  public get agent() {
    return this.localAgent;
  }

  public assertAndGetAgent() {
    if (!this.agent) {
      throw new Error("Agent not initialized");
    }

    return this.agent;
  }

  public static AppProvider({ children }: PropsWithChildren) {
    const { sdk } = useMobileSDK();

    if (!sdk?.agent) {
      throw new Error("Mobile SDK not initialized");
    }

    return <AgentProvider agent={sdk.agent}>{children}</AgentProvider>;
  }

  public async createDid<T extends DidCreateOptions>(options: T) {
    const agent = this.assertAndGetAgent();

    const did = await agent.dids.create<T>(options);

    return did;
  }

  public async getDids({
    method,
    did,
    tag,
    tagValue,
  }: {
    method?: string;
    did?: string;
    tag?: string;
    tagValue?: TagValue;
  }) {
    const agent = this.assertAndGetAgent();

    if (tag) {
      const didRepository = await agent.dependencyManager.resolve(
        DidRepository
      );

      const didRecord = await didRepository.findSingleByQuery(
        agent.context,
        tagValue ? { [tag]: tagValue } : { tag }
      );
      return didRecord ? [didRecord] : [];
    }

    const dids = await agent.dids.getCreatedDids({
      method,
      did,
    });
    return dids;
  }

  public async addTagToDid({
    did,
    tag,
    tagValue,
  }: {
    did: string;
    tag: string;
    tagValue: TagValue;
  }) {
    const agent = this.assertAndGetAgent();
    const didRecords = await this.getDids({ did });

    if (didRecords.length === 0) {
      throw new Error("Did not found");
    }

    const didRecord = didRecords[0];
    await didRecord.setTag(tag, tagValue);

    const didRepository = await agent.dependencyManager.resolve(DidRepository);

    await didRepository.update(agent.context, didRecord);

    return didRecord;
  }

  public async resolveDid({ did }: { did: string }) {
    const agent = this.assertAndGetAgent();
    const didResolutionResult = await agent.dids.resolve(did);
    return didResolutionResult;
  }

  public async deleteCredential({
    id,
    format,
  }: {
    id: string;
    format: CredentialFormat;
  }) {
    const agent = this.assertAndGetAgent();

    if (format === "sd-jwt") {
      await agent.sdJwtVc.deleteById(id);
    } else if (format === "mdoc") {
      await agent.mdoc.deleteById(id);
    } else if (format === "w3c") {
      await agent.w3cCredentials.removeCredentialRecord(id);
      return;
    } else {
      throw new Error("Credential format not supported");
    }
  }

  public async storeOpenIdCredential(
    cred: W3cCredentialRecord | SdJwtVcRecord | MdocRecord
  ): Promise<void> {
    const agent = this.assertAndGetAgent();
    if (cred instanceof W3cCredentialRecord) {
      await agent.dependencyManager
        .resolve(W3cCredentialRepository)
        .save(agent.context, cred);
    } else if (cred instanceof SdJwtVcRecord) {
      await agent.dependencyManager
        .resolve(SdJwtVcRepository)
        .save(agent.context, cred);
    } else if (cred instanceof MdocRecord) {
      await agent.dependencyManager
        .resolve(MdocRepository)
        .save(agent.context, cred);
    } else {
      throw new Error("Credential type is not supported");
    }
  }

  private async getRepositories(agent: Agent, format?: CredentialFormat): Promise<
    (SdJwtVcRepository | MdocRepository | W3cCredentialRepository)[]
  > {
    const repos = {
      "sd-jwt": SdJwtVcRepository,
      mdoc: MdocRepository,
      w3c: W3cCredentialRepository,
    };

    if (format) {
      return [await agent.dependencyManager.resolve(repos[format])];
    }

    return Promise.all(
      Object.values(repos).map((repo) => agent.dependencyManager.resolve(repo))
    );
  }

  public async setTagsToCredential({
    credId,
    tags,
    format,
  }: {
    credId: string;
    tags: Record<string, TagValue>;
    format?: CredentialFormat;
  }) {
    if (!credId?.trim()) {
      throw new Error("credId is required and cannot be empty");
    }
    if (!tags || Object.keys(tags).length === 0) {
      throw new Error("At least one tag must be provided");
    }

    const agent = this.assertAndGetAgent();
    const repositories = await this.getRepositories(agent, format);

    let lastError: Error | null = null;

    for (const repository of repositories) {
      try {
        const credRecord = await repository.getById(agent.context, credId);
        for (const [tag, value] of Object.entries(tags)) {
          await credRecord.setTag(tag, value);
        }
        await repository.update(agent.context, credRecord);
        return credRecord;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        continue;
      }
    }

    throw new Error(
      `Credential with id '${credId}' not found in any supported repository${
        lastError ? `. Last error: ${lastError.message}` : ""
      }`
    );
  }

  public async getCredentialsByTag({
    format,
    tag,
  }: {
    tag: Record<string, any>;
    format?: CredentialFormat;
  }) {
    const agent = this.assertAndGetAgent();
    const repositories = await this.getRepositories(agent, format);

    const results: (SdJwtVcRecord | MdocRecord | W3cCredentialRecord)[] = [];

    for (const repository of repositories) {
      const records = await repository.findByQuery(agent.context, tag);
      results.push(...records);
    }

    return results;
  }
}
