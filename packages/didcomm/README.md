# @credebl/ssi-mobile-didcomm

DIDComm protocol support for the CREDEBL Mobile SDK — establish connections between wallets, exchange verifiable credentials, respond to proof requests, send messages, and connect to a mediator for offline delivery.

> **What is DIDComm?** A secure, peer-to-peer messaging protocol for SSI wallets. Your wallet connects directly to an issuer or verifier (via a QR code or deep link), and they exchange signed messages — no central server involved.

See the [root README](../../README.md) for prerequisites and installation.

---

## Installation

```bash
npm install @credebl/ssi-mobile-didcomm @hyperledger/anoncreds-react-native @hyperledger/indy-vdr-react-native
# or
yarn add @credebl/ssi-mobile-didcomm @hyperledger/anoncreds-react-native @hyperledger/indy-vdr-react-native
```

**iOS:**
```bash
cd ios && pod install
```

**Android** — ensure `minSdkVersion` >= 24 in `android/app/build.gradle`.

---

## Setup

### 1. Create a `DidCommSDK` instance

```tsx
import { DidCommSDK, DidCommMediatorPickupStrategy } from '@credebl/ssi-mobile-didcomm'

const didcommModule = new DidCommSDK({
  peerNumAlgoForDidExchangeRequests: 1,
  peerNumAlgoForDidRotation: 4,
  processDidCommMessagesConcurrently: false,
  mediatorPickupStrategy: DidCommMediatorPickupStrategy.PickUpV2LiveMode,

  // Optional: configure Indy VDR ledger networks for AnonCreds credentials
  indyVdr: {
    networks: [
      {
        id: 'bcovrin:test',
        isProduction: false,
        indyNamespace: 'bcovrin:test',
        genesisTransactions: '...genesis transactions string...',
      },
    ],
  },
})
```

### 2. Pass it to `MobileSDKOptions`

```tsx
import { MobileSDKOptions, ConsoleLogger, LogLevel } from '@credebl/ssi-mobile-core'
import { DidCommSDK } from '@credebl/ssi-mobile-didcomm'

type AppModules = { didcomm: DidCommSDK }

export function createConfig(walletId: string, walletKey: string): MobileSDKOptions<AppModules> {
  return {
    agentConfig: {
      label: 'My Wallet',
      logger: new ConsoleLogger(LogLevel.debug),
    },
    askarConfig: {
      id: walletId,
      key: walletKey,
    },
    modules: { didcomm: didcommModule },
  }
}
```

### 3. Add the provider to your app

The `DidCommProvider` wires up all DIDComm React hooks. It must be rendered after the SDK is initialized.

```tsx
import { MobileSDKProvider, MobileSDK, useMobileSDK } from '@credebl/ssi-mobile-core'
import { DidCommSDK } from '@credebl/ssi-mobile-didcomm'

type AppModules = { didcomm: DidCommSDK }

function SDKProviders({ children }: { children: React.ReactNode }) {
  const { sdk } = useMobileSDK<AppModules>()
  if (!sdk?.agent) return null
  return (
    <DidCommSDK.DidCommProvider agent={sdk.agent}>
      {children}
    </DidCommSDK.DidCommProvider>
  )
}

export default function App() {
  return (
    <MobileSDKProvider>
      <MobileSDK.AppProvider>
        <SDKProviders>
          {/* your app */}
        </SDKProviders>
      </MobileSDK.AppProvider>
    </MobileSDKProvider>
  )
}
```

### 4. Access the DIDComm module

```tsx
import { useMobileSDK } from '@credebl/ssi-mobile-core'
import { DidCommSDK } from '@credebl/ssi-mobile-didcomm'

type AppModules = { didcomm: DidCommSDK }

function MyScreen() {
  const { sdk } = useMobileSDK<AppModules>()
  const didcomm = sdk.modules.didcomm

  // Access: didcomm.connections, didcomm.credentials, didcomm.proofs
  //         didcomm.basicMessages, didcomm.questionAnswer, didcomm.mediatorRecipient
}
```

---

## API Reference

### Connections

A **connection** is a secure, persistent channel between two wallets (or between a wallet and an issuer/verifier). Connections are usually established by scanning a QR code or following a deep link.

#### `didcomm.connections.acceptInvitationFromUrl(url, config)`

Accept a DIDComm invitation from a scanned QR code URL or a deep link. This is the most common way to establish a connection.

```tsx
const oobRecord = await didcomm.connections.acceptInvitationFromUrl(
  'https://example.com?oob=eyJ...',
  { label: 'My Wallet' }
)
```

---

#### `didcomm.connections.createInvitation(domain, config?)`

Create an invitation URL that another wallet can scan to connect with yours.

```tsx
const { invitationUrl, record, invitation } = await didcomm.connections.createInvitation(
  'https://myapp.example.com'
)
// Share invitationUrl as a QR code
```

---

#### `didcomm.connections.parseInvitationFromUrl(url)`

Parse an invitation URL without accepting it — useful to inspect the invitation before accepting.

```tsx
const invitation = await didcomm.connections.parseInvitationFromUrl('https://example.com?oob=...')
```

---

#### `didcomm.connections.acceptInvitation(invitation, config)`

Accept a pre-parsed invitation object.

```tsx
const oobRecord = await didcomm.connections.acceptInvitation(invitation, { label: 'My Wallet' })
```

---

#### `didcomm.connections.waitForConnectionToComplete(connectionId, timeoutMs?)`

Wait until a connection reaches the `Completed` state. Call this after accepting an invitation if you need to confirm the handshake finished.

```tsx
const connection = await didcomm.connections.waitForConnectionToComplete(
  oobRecord.connectionRecord?.id,
  30000 // 30 second timeout (optional)
)
```

---

#### `didcomm.connections.getAll()`

Get all connection records.

```tsx
const connections = await didcomm.connections.getAll()
```

---

#### `didcomm.connections.getById(connectionId)`

Get a single connection by ID. Throws if not found.

```tsx
const connection = await didcomm.connections.getById('connection-id')
```

---

#### `didcomm.connections.findById(connectionId)`

Find a connection by ID — returns `undefined` instead of throwing if not found.

```tsx
const connection = await didcomm.connections.findById('connection-id')
if (!connection) {
  console.log('Connection not found')
}
```

---

#### `didcomm.connections.deleteById(connectionId)`

Delete a connection record from the wallet.

```tsx
await didcomm.connections.deleteById('connection-id')
```

---

#### `didcomm.connections.hangup(connectionId, deleteAfterHangup?)`

Terminate an active connection and optionally delete the record.

```tsx
await didcomm.connections.hangup('connection-id', true)
```

---

#### `didcomm.connections.rotate(options)`

Rotate to a new DID on an existing connection (for key rotation / privacy).

```tsx
await didcomm.connections.rotate({ connectionId: 'connection-id' })
```

---

### Credentials

A **credential exchange** is the process of an issuer offering a verifiable credential and the wallet holder accepting or declining it.

#### `didcomm.credentials.getAllCredentialExchangeRecords()`

Get all credential exchange records (pending offers, accepted, declined, etc.).

```tsx
const records = await didcomm.credentials.getAllCredentialExchangeRecords()
```

---

#### `didcomm.credentials.getFormattedCredentialData(credentialRecordId)`

Get the decoded credential attributes and metadata for a given exchange record. Useful for displaying the credential offer to the user.

```tsx
const data = await didcomm.credentials.getFormattedCredentialData('exchange-record-id')
console.log(data.offer) // the credential offer data
```

---

#### `didcomm.credentials.acceptCredentialOffer({ credentialExchangeRecordId })`

Accept a pending credential offer. The credential will be stored in the wallet.

```tsx
await didcomm.credentials.acceptCredentialOffer({
  credentialExchangeRecordId: 'exchange-record-id',
})
```

---

#### `didcomm.credentials.declineCredentialOffer({ credentialExchangeRecordId })`

Decline a pending credential offer.

```tsx
await didcomm.credentials.declineCredentialOffer({
  credentialExchangeRecordId: 'exchange-record-id',
})
```

---

#### `didcomm.credentials.updateCredentialExchangeRecord(record)`

Update an existing credential exchange record (e.g. to store custom metadata).

```tsx
await didcomm.credentials.updateCredentialExchangeRecord(credentialRecord)
```

---

#### `didcomm.credentials.deleteCredentialExchangeRecordById(id, options?)`

Delete a credential exchange record.

```tsx
await didcomm.credentials.deleteCredentialExchangeRecordById('exchange-record-id', {
  deleteAssociatedCredentials: true,
})
```

---

#### `didcomm.credentials.sendCredentialProblemReport(options)`

Report a problem with a credential exchange back to the issuer.

```tsx
await didcomm.credentials.sendCredentialProblemReport({
  credentialRecordId: 'exchange-record-id',
  description: 'The credential data is incorrect',
})
```

---

#### `didcomm.credentials.proposeCredential(options)`

Initiate a credential exchange by proposing a credential to a connected issuer.

```tsx
await didcomm.credentials.proposeCredential({
  connectionId: 'connection-id',
  credentialFormats: {
    anoncreds: {
      credentialDefinitionId: 'cred-def-id',
      attributes: [{ name: 'name', value: 'Alice' }],
    },
  },
})
```

---

### Proofs

A **proof request** is when a verifier asks your wallet to prove something (e.g. "prove you are over 18"). Your wallet selects matching credentials and sends a presentation.

#### `didcomm.proofs.getCredentialsForProofRequest(options)`

Get all credentials in the wallet that can satisfy a given proof request.

```tsx
const credentials = await didcomm.proofs.getCredentialsForProofRequest({
  proofRecordId: 'proof-record-id',
})
```

---

#### `didcomm.proofs.selectCredentialsForProofRequest(options)`

Automatically select the best matching credentials for a proof request.

```tsx
const selected = await didcomm.proofs.selectCredentialsForProofRequest({
  proofRecordId: 'proof-record-id',
})
```

---

#### `didcomm.proofs.acceptProofRequest(options)`

Accept and respond to a proof request using the selected credentials.

```tsx
await didcomm.proofs.acceptProofRequest({
  proofRecordId: 'proof-record-id',
  proofFormats: selected,
})
```

---

#### `didcomm.proofs.declineProofRequest(options)`

Decline a proof request.

```tsx
await didcomm.proofs.declineProofRequest({
  proofRecordId: 'proof-record-id',
})
```

---

#### `didcomm.proofs.getProofFormatData(proofRecordId)`

Get the raw proof request data — useful for displaying what is being asked for.

```tsx
const data = await didcomm.proofs.getProofFormatData('proof-record-id')
console.log(data.request) // the proof request
```

---

#### `didcomm.proofs.getProofRequestAgentMessage(proofRecordId)`

Get the raw DIDComm message for a proof request.

```tsx
const message = await didcomm.proofs.getProofRequestAgentMessage('proof-record-id')
```

---

#### `didcomm.proofs.sendProofProblemReport(options)`

Report a problem with a proof exchange.

```tsx
await didcomm.proofs.sendProofProblemReport({
  proofRecordId: 'proof-record-id',
  description: 'Unable to satisfy the proof request',
})
```

---

### Basic Messages

Send and receive plain text messages over an existing connection.

#### `didcomm.basicMessages.sendBasicMessage(connectionId, message)`

```tsx
await didcomm.basicMessages.sendBasicMessage('connection-id', 'Hello!')
```

---

### Question & Answer

Send structured questions with multiple-choice responses over a connection.

#### `didcomm.questionAnswer.sendQuestion(connectionId, config)`

Send a question to a connected peer.

```tsx
const record = await didcomm.questionAnswer.sendQuestion('connection-id', {
  question: 'Do you consent to share your credentials?',
  validResponses: [{ text: 'Yes' }, { text: 'No' }],
  detail: 'Your answer will be recorded on the ledger.',
})
```

---

#### `didcomm.questionAnswer.sendAnswer(questionRecordId, response)`

Answer a question received from a connected peer.

```tsx
await didcomm.questionAnswer.sendAnswer('question-record-id', 'Yes')
```

---

#### `didcomm.questionAnswer.getAllQuestionAnswerRecords(query)`

Retrieve all Q&A records.

```tsx
const records = await didcomm.questionAnswer.getAllQuestionAnswerRecords({})
```

---

#### `didcomm.questionAnswer.getQuestionAnswerRecordById(id)`

Get a single Q&A record by ID.

```tsx
const record = await didcomm.questionAnswer.getQuestionAnswerRecordById('qa-record-id')
```

---

### Mediation

A **mediator** is a server that holds messages for your wallet when your app is offline and delivers them when you reconnect. This is required for receiving credential offers and proof requests in the background.

#### `didcomm.mediatorRecipient.startMediation(mediatorInvitationUrl, label)`

Connect to a mediator using its invitation URL.

```tsx
const mediationRecord = await didcomm.mediatorRecipient.startMediation(
  'https://mediator.example.com?oob=eyJ...',
  'My Wallet'
)
```

---

#### `didcomm.mediatorRecipient.initiateMessagePickup(mediator?, pickupStrategy?)`

Start picking up queued messages from the mediator. Call this after the SDK initializes.

```tsx
await didcomm.mediatorRecipient.initiateMessagePickup(mediationRecord)
```

---

#### `didcomm.mediatorRecipient.stopMessagePickup()`

Stop the message pickup process (e.g. when the app goes to background).

```tsx
await didcomm.mediatorRecipient.stopMessagePickup()
```

---

## React Hooks

All hooks below must be used inside `DidCommSDK.DidCommProvider`. They update in real time as records change.

### Connection Hooks

```tsx
import {
  useConnections,
  useConnectionById,
} from '@credebl/ssi-mobile-didcomm'

// All connections
const { records: connections, loading } = useConnections()

// Single connection
const connection = useConnectionById('connection-id')
```

---

### Credential Hooks

```tsx
import {
  useCredentials,
  useCredentialById,
  useCredentialsByConnectionId,
  useCredentialByState,
  useCredentialNotInState,
  DidCommCredentialState,
} from '@credebl/ssi-mobile-didcomm'

// All credential exchange records
const { records: credentials } = useCredentials()

// Single record by ID
const credential = useCredentialById('record-id')

// All records for a specific connection
const connectionCredentials = useCredentialsByConnectionId('connection-id')

// Records in a specific state (e.g. pending offers)
const pendingOffers = useCredentialByState(DidCommCredentialState.OfferReceived)

// Records NOT in a specific state
const nonPending = useCredentialNotInState(DidCommCredentialState.OfferReceived)
```

---

### Proof Hooks

```tsx
import {
  useProofs,
  useProofById,
  useProofsByConnectionId,
  useProofByState,
  useProofNotInState,
  DidCommProofState,
} from '@credebl/ssi-mobile-didcomm'

// All proof exchange records
const { records: proofs } = useProofs()

// Single record by ID
const proof = useProofById('record-id')

// Pending proof requests
const pendingRequests = useProofByState(DidCommProofState.RequestReceived)
```

---

### Basic Message Hooks

```tsx
import {
  useBasicMessages,
  useBasicMessagesByConnectionId,
} from '@credebl/ssi-mobile-didcomm'

// All messages
const { records: messages } = useBasicMessages()

// Messages for a specific connection
const connectionMessages = useBasicMessagesByConnectionId('connection-id')
```

---

### Question & Answer Hooks

```tsx
import {
  useQuestionAnswer,
  useQuestionAnswerByConnectionId,
  useQuestionAnswerById,
} from '@credebl/ssi-mobile-didcomm'

// All Q&A records
const { questionAnswerMessages } = useQuestionAnswer()

// Q&A for a specific connection
const byConnection = useQuestionAnswerByConnectionId('connection-id')

// Single record by ID
const record = useQuestionAnswerById('qa-record-id')
```
