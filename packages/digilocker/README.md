# @credebl/digilocker-mobile

[![npm](https://img.shields.io/npm/v/@credebl/digilocker-mobile.svg)](https://www.npmjs.com/package/@credebl/digilocker-mobile)

Helpers for the DigiLocker OAuth flow: build an authorization URL with PKCE, exchange the authorization code for a
token, fetch DigiLocker XML or file data, and parse Aadhaar, PAN and driving-license XML into plain objects.

This package does **not** verify signatures, store credentials, or decide whether a document is trusted. Those
responsibilities belong to your app and its trust policy.

See the [root README](../../README.md) for prerequisites and project-level setup.

## Installing

```sh
npm install @credebl/digilocker-mobile
# or
yarn add @credebl/digilocker-mobile
# or
pnpm add @credebl/digilocker-mobile
```

## Dependencies

This package declares no `peerDependencies`. Your package manager installs its runtime dependencies: `axios`,
`xml2js`, `crypto-js` and `uuid`. `crypto-js` and `uuid` are currently declared but not imported by the source.

## React Native notes

- `generateCodeChallenge` uses Node's `node:crypto.createHash`, and `base64UrlEncodeWithoutPadding` expects a global
  `Buffer`. Metro does not provide either by default, so these helpers need a React Native-compatible polyfill or a
  replacement before you use them in a mobile app.
- `xml2js` uses Node-style `events`/`timers` internals. Test the parsers with your bundler before release.
- The authorization URL helper hardcodes `state=adeya2024`. It therefore does not provide per-request CSRF state
  protection; generate and validate your own state if your flow requires it.
- Do not embed a `client_secret` in a mobile app. Perform the token exchange on a server you control.

## Quick start

```ts
import {
  fetchDigiLockerToken,
  initiateDigiLockerOAuth,
} from '@credebl/digilocker-mobile'

// Create and store a PKCE code verifier yourself.
const codeVerifier = '<your PKCE code verifier>'

// Returns a URL, or an Error object on failure. It does not throw.
const authorizationUrl = await initiateDigiLockerOAuth({
  client_id: '<client id>',
  redirect_url: '<redirect uri>',
  codeVerifier,
})

// After the browser redirects back with an authorization code:
const token = await fetchDigiLockerToken({
  authCode: '<authorization code>',
  client_id: '<client id>',
  client_secret: '<client secret>', // keep this on a server in production
  redirect_url: '<redirect uri>',
  codeVerifier,
})
```

`initiateDigiLockerOAuth` and `fetchDigiLockerToken` take `AdeyaDigiLockerModuleOptions`. Every field is optional and
defaults to an empty string.

## Document retrieval

```ts
import {
  fetchAadhaarData,
  fetchDocument,
  fetchDocumentData,
  fetchIssuedDocuments,
} from '@credebl/digilocker-mobile'

const aadhaarXml = await fetchAadhaarData(accessToken)
const issuedDocuments = await fetchIssuedDocuments(accessToken)
const documentXml = await fetchDocumentData(uri, accessToken)
const documentFile = await fetchDocument(uri, accessToken)
```

Each helper returns the raw axios `response.data` on success. On failure it returns
`{ message: 'Error fetching ...: <reason>' }` instead of throwing. The current TypeScript signatures declare
`Promise<{ message: string }>` for all four helpers, so inspect or narrow the result in your app rather than assuming
the declared success type is accurate.

## XML parsing

```ts
import {
  parseAadhaarData,
  parseDrivingLicenseData,
  parsePANData,
} from '@credebl/digilocker-mobile'

const aadhaar = await parseAadhaarData(aadhaarXml)
const pan = await parsePANData(panXml)
const license = await parseDrivingLicenseData(licenseXml)

// Each result is either parsed fields or { error: string }.
if ('error' in aadhaar) {
  console.warn(aadhaar.error)
}
```

Missing fields default to an empty string. The parsers return `{ error }` when the XML cannot be parsed; they do not
throw. `parseDrivingLicenseData` joins the category abbreviations with `, ` in `licenseTypes`.

## API

| Export | Description |
| --- | --- |
| `AdeyaDigiLockerModuleOptions` | Options type for the OAuth helpers: `client_id`, `client_secret`, `redirect_url`, `authCode`, `codeVerifier`. |
| `base64UrlEncodeWithoutPadding(input: Buffer)` | Base64url-encode a Buffer without `=` padding. Requires a global `Buffer`. |
| `generateCodeChallenge(codeVerifier: string)` | Build the S256 PKCE challenge. Requires `node:crypto` and `Buffer`. |
| `initiateDigiLockerOAuth(options)` | Build the DigiLocker authorization URL. Returns `string \| Error`. |
| `fetchDigiLockerToken(options)` | Exchange an authorization code for a token using the supplied options. |
| `fetchAadhaarData(accessToken)` | Fetch the Aadhaar XML for the token holder. |
| `fetchIssuedDocuments(accessToken)` | Fetch the list of issued documents. |
| `fetchDocumentData(uri, accessToken)` | Fetch one document as XML. |
| `fetchDocument(uri, accessToken)` | Fetch one document as a file. |
| `parseAadhaarData(xml)` | Parse Aadhaar XML into `AadhaarData`. |
| `parsePANData(xml)` | Parse PAN XML into `PANData`. |
| `parseDrivingLicenseData(xml)` | Parse driving-license XML into `DrivingLicenseData`. |

The parsed data interfaces (`AadhaarData`, `PANData`, `DrivingLicenseData`) are exported from the package root.
The DigiLocker endpoint constants are internal and are not part of the public API.
