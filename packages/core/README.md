# @credebl/ssi-mobile-core

Core package for the CREDEBL Mobile SDK. Handles wallet initialization, DID operations, credential storage, key management, and React context integration.

See the [root README](../../README.md) for prerequisites and project-level setup.

---

## Installation

```bash
npm install @credebl/ssi-mobile-core @openwallet-foundation/askar-react-native
# or
yarn add @credebl/ssi-mobile-core @openwallet-foundation/askar-react-native
```

**iOS:**
```bash
cd ios && pod install
```

**Android** — ensure `minSdkVersion` >= 24 in `android/app/build.gradle`.

---

## API Reference

### Setup

#### `MobileSDKProvider`

Wrap your entire app with this provider. Every hook in this package must be used inside it.

```tsx
import { MobileSDKProvider } from '@credebl/ssi-mobile-core'

export default function App() {
  return (
    <MobileSDKProvider>
      {/* your app */}
    </MobileSDKProvider>
  )
}
```

---

#### `useMobileSDKInitializer()`

Initializes the SDK. Call this once on app startup, inside `MobileSDKProvider`.

```tsx
import { useEffect } from 'react'
import { useMobileSDKInitializer, ConsoleLogger, LogLevel } from '@credebl/ssi-mobile-core'

function AppInitializer() {
  const { initializeSDK, isInitialized } = useMobileSDKInitializer()

  useEffect(() => {
    if (!isInitialized) {
      initializeSDK({
        agentConfig: {
          label: 'My Wallet',
          logger: new ConsoleLogger(LogLevel.debug),
        },
        askarConfig: {
          id: 'my-wallet-id',
          key: 'my-wallet-key',
        },
        modules: {},
      })
    }
  }, [isInitialized])

  return null
}
```

| Return value | Type | Description |
|---|---|---|
| `initializeSDK` | `(options) => Promise<MobileSDK>` | Call with your config to start the SDK |
| `isInitialized` | `boolean` | `true` once the SDK is ready |
| `sdk` | `MobileSDK \| null` | The SDK instance after initialization |

---

#### `useMobileSDK()`

Access the SDK instance from any component inside `MobileSDKProvider`.

```tsx
import { useMobileSDK } from '@credebl/ssi-mobile-core'

function MyComponent() {
  const { sdk, isInitialized } = useMobileSDK()

  if (!isInitialized || !sdk) return <Text>Loading...</Text>

  return <Button title="Ready" onPress={() => console.log(sdk)} />
}
```

When using extra modules (like DIDComm), pass the module type:

```tsx
import { DidCommSDK } from '@credebl/ssi-mobile-didcomm'

type AppModules = { didcomm: DidCommSDK }

const { sdk } = useMobileSDK<AppModules>()
// sdk.modules.didcomm is now typed correctly
```

| Return value | Type | Description |
|---|---|---|
| `sdk` | `MobileSDK<T>` | The initialized SDK instance |
| `isInitialized` | `boolean` | `true` once the SDK is ready |
| `initialize` | `(sdk) => void` | Manually set the SDK (advanced use) |
| `shutdown` | `() => void` | Shut down the SDK |

---

#### `MobileSDK.AppProvider`

Provides the underlying `Agent` to credential and record hooks. Wrap the parts of your app that use credential hooks with this.

```tsx
import { MobileSDK } from '@credebl/ssi-mobile-core'

function App() {
  return (
    <MobileSDKProvider>
      <MobileSDK.AppProvider>
        {/* hooks like useW3cCredentialRecords() work here */}
      </MobileSDK.AppProvider>
    </MobileSDKProvider>
  )
}
```

---

### DID Operations

All methods below are called on the `sdk` instance returned by `useMobileSDK()`.

#### `sdk.createDid(options)`

Create a new DID and store it in the wallet.

```tsx
// Create a did:key
const didRecord = await sdk.createDid({ method: 'key' })

// Create a did:jwk with a specific key type
const didRecord = await sdk.createDid({
  method: 'jwk',
  options: { keyType: 'Ed25519' },
})
```

---

#### `sdk.getDids(options?)`

Retrieve DIDs that were created by this wallet.

```tsx
// Get all DIDs
const dids = await sdk.getDids({})

// Filter by method
const keyDids = await sdk.getDids({ method: 'key' })

// Look up a specific DID
const dids = await sdk.getDids({ did: 'did:key:z6Mk...' })
```

---

#### `sdk.resolveDid({ did })`

Resolve a DID document — works for any DID, not just ones in the wallet.

```tsx
const result = await sdk.resolveDid({ did: 'did:key:z6Mk...' })
console.log(result.didDocument)
```

---

#### `sdk.addTagToDid({ did, tag, tagValue })`

Attach a custom tag to a DID record so you can look it up later.

```tsx
await sdk.addTagToDid({
  did: 'did:key:z6Mk...',
  tag: 'purpose',
  tagValue: 'authentication',
})

// Later, find it by tag
const dids = await sdk.getDids({ tag: 'purpose', tagValue: 'authentication' })
```

---

### Credential Storage

#### `sdk.deleteCredential({ id, format })`

Delete a stored credential by ID and format.

```tsx
import { CredentialRecord } from '@credebl/ssi-mobile-core'

await sdk.deleteCredential({
  id: 'credential-id',
  format: CredentialRecord.SdJwt, // or CredentialRecord.Mdoc / CredentialRecord.W3c
})
```

---

#### `sdk.storeOpenIdCredential(credential)`

Manually store a credential record received via OpenID4VC.

```tsx
// credential is a W3cCredentialRecord, SdJwtVcRecord, or MdocRecord
await sdk.storeOpenIdCredential(credentialRecord)
```

---

#### `sdk.setTagsToCredential({ credId, tags, format? })`

Attach custom tags to a credential for later filtering.

```tsx
await sdk.setTagsToCredential({
  credId: 'credential-id',
  tags: { status: 'active', issuer: 'university' },
})
```

---

#### `sdk.getCredentialsByTag({ tags, format? })`

Query credentials by their custom tags.

```tsx
const creds = await sdk.getCredentialsByTag({
  tags: { status: 'active' },
})

// Filter by format
const sdJwtCreds = await sdk.getCredentialsByTag({
  tags: { issuer: 'university' },
  format: CredentialRecord.SdJwt,
})
```

---

### Generic Records

Use generic records to store arbitrary structured data in the wallet (e.g. app settings, user preferences, custom metadata).

#### `sdk.addGenericRecord({ content, tags?, id? })`

```tsx
const record = await sdk.addGenericRecord({
  content: { theme: 'dark', notifications: true },
  tags: { type: 'settings' },
})
console.log(record.id)
```

---

#### `sdk.getGenericRecord(id)`

```tsx
const record = await sdk.getGenericRecord(record.id)
```

---

#### `sdk.findGenericRecordsByQuery(query)`

```tsx
const records = await sdk.findGenericRecordsByQuery({ type: 'settings' })
```

---

#### `sdk.updateGenericRecord(record)`

```tsx
record.content.theme = 'light'
await sdk.updateGenericRecord(record)
```

---

#### `sdk.deleteGenericRecord(id)`

```tsx
await sdk.deleteGenericRecord(record.id)
```

---

### Wallet Management

#### `sdk.exportWallet(exportToStore)`

Export the wallet to a different storage location (useful for backup).

```tsx
await sdk.exportWallet({
  id: 'backup-wallet-id',
  key: 'backup-wallet-key',
  path: '/path/to/backup/file',
})
```

---

### Key Management

#### `sdk.createKey(options)`

Create a cryptographic key pair stored in the wallet.

```tsx
const keyPair = await sdk.createKey({ keyType: 'Ed25519' })
console.log(keyPair.keyId)
```

---

#### `sdk.signData(options)`

Sign data with a key from the wallet.

```tsx
const signature = await sdk.signData({
  keyId: keyPair.keyId,
  data: new Uint8Array([1, 2, 3]),
})
```

---

#### `sdk.verifyData(options)`

Verify that a signature was produced by a given key.

```tsx
const isValid = await sdk.verifyData({
  keyId: keyPair.keyId,
  data: new Uint8Array([1, 2, 3]),
  signature,
})
```

---

#### `sdk.createJwsCompact({ header, payload, keyId })`

Create a compact JWS (JSON Web Signature) token.

```tsx
const jws = await sdk.createJwsCompact({
  header: { alg: 'EdDSA' },
  payload: { sub: 'user-123', iat: Math.floor(Date.now() / 1000) },
  keyId: keyPair.keyId,
})
```

---

### React Hooks — Credential Records

These hooks give real-time reactive access to credentials stored in the wallet. They update automatically when credentials are added, updated, or deleted.

> Must be used inside `MobileSDK.AppProvider`.

#### `useW3cCredentialRecords()`

Subscribe to all W3C credential records.

```tsx
import { useW3cCredentialRecords } from '@credebl/ssi-mobile-core'

const { w3cCredentialRecords, isLoading } = useW3cCredentialRecords()
```

#### `useW3cCredentialRecordById(id)`

```tsx
const record = useW3cCredentialRecordById('record-id')
```

---

#### `useSdJwtVcRecords()`

Subscribe to all SD-JWT credential records.

```tsx
import { useSdJwtVcRecords } from '@credebl/ssi-mobile-core'

const { sdJwtVcRecords, isLoading } = useSdJwtVcRecords()
```

#### `useSdJwtVcRecordById(id)`

```tsx
const record = useSdJwtVcRecordById('record-id')
```

---

#### `useMdocRecords()`

Subscribe to all mDoc credential records.

```tsx
import { useMdocRecords } from '@credebl/ssi-mobile-core'

const { mdocRecords, isLoading } = useMdocRecords()
```

#### `useMdocRecordById(id)`

```tsx
const record = useMdocRecordById('record-id')
```

---

#### `useGenericRecords(options?)`

Subscribe to generic records, with optional tag filtering.

```tsx
import { useGenericRecords } from '@credebl/ssi-mobile-core'

const { genericRecords, isLoading } = useGenericRecords({
  filterByTagKey: 'type',
  filterByTags: { type: 'settings' },
})
```

#### `useGenericRecordById(id)`

```tsx
const record = useGenericRecordById('record-id')
```

---

### Wallet Utilities

These are standalone functions — no hook or SDK instance needed.

#### `isWalletPinCorrect(storeConfig)`

Check if a wallet key is correct before opening. Useful for PIN verification screens.

```tsx
import { isWalletPinCorrect } from '@credebl/ssi-mobile-core'

const isCorrect = await isWalletPinCorrect({
  id: 'wallet-id',
  key: 'entered-pin',
})
```

---

#### `isWalletImportable(storeConfig, importFromStore)`

Check whether a wallet backup file can be imported before attempting the import.

```tsx
import { isWalletImportable } from '@credebl/ssi-mobile-core'

const canImport = await isWalletImportable(
  { id: 'new-wallet', key: 'new-wallet-key' },
  { id: 'backup-wallet', key: 'backup-key', path: '/path/to/backup' }
)
```

---

#### `importWalletToStore(storeConfig, importFromStore)`

Import a wallet from a backup file.

```tsx
import { importWalletToStore } from '@credebl/ssi-mobile-core'

await importWalletToStore(
  { id: 'new-wallet', key: 'new-wallet-key' },
  { id: 'backup-wallet', key: 'backup-key', path: '/path/to/backup' }
)
```
