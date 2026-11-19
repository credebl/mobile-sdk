import type { Agent, SdJwtVcRecord } from '@credo-ts/core'
import { getListFromStatusListJWT, StatusType } from '@owf/token-status-list'

/** The status resolved from an SD-JWT VC status list. */
export type CredentialStatus = 'valid' | 'revoked' | 'suspended' | 'unknown'

export interface CredentialStatusResult {
  /** Whether the credential carries a status list reference that was read. */
  checked: boolean
  /** The status value at the credential's index in the status list. */
  status: CredentialStatus
  /** Whether the status list was fetched and its bit read successfully. */
  verified: boolean
  statusListUri?: string
  statusListIndex?: number
  /** Failure reason when `verified` is false. */
  error?: string
}

export type StatusCheckCredential = string | SdJwtVcRecord

type StatusReference = { idx: number; uri: string }

function toCompactSdJwtVc(credential: StatusCheckCredential): string {
  return typeof credential === 'string' ? credential : credential.credentialInstances[0].compactSdJwtVc
}

function statusFromBit(bit: number): CredentialStatus {
  switch (bit) {
    case StatusType.Valid:
      return 'valid'
    case StatusType.Invalid:
      return 'revoked'
    case StatusType.Suspended:
      return 'suspended'
    default:
      return 'unknown'
  }
}

function failure(error: unknown, details?: Pick<CredentialStatusResult, 'statusListUri' | 'statusListIndex'>) {
  return {
    checked: true,
    status: 'unknown' as const,
    verified: false,
    ...details,
    error: error instanceof Error ? error.message : String(error),
  }
}

/**
 * Read the status of an SD-JWT VC from its status list.
 *
 * The credential can be passed as a compact SD-JWT VC or as a stored `SdJwtVcRecord`. The agent's configured fetch is
 * used to retrieve the status list token, so no platform-specific networking code is needed.
 *
 * The result is fail-closed: any fetch or parse problem returns `verified: false` with the reason in `error`.
 * Credentials without a status reference return `checked: false`.
 *
 * This helper reads the status bit only. It does not re-verify the credential signature, the status list token
 * signature, holder binding or validity dates — use the agent's credential verification APIs for those checks.
 */
export async function verifyCredentialStatus(
  agent: Agent,
  { credential }: { credential: StatusCheckCredential }
): Promise<CredentialStatusResult> {
  let statusRef: StatusReference | undefined
  try {
    statusRef = agent.sdJwtVc.fromCompact(toCompactSdJwtVc(credential)).payload.status?.status_list
  } catch (error) {
    return {
      checked: false,
      status: 'unknown',
      verified: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }

  if (!statusRef) return { checked: false, status: 'unknown', verified: true }

  const details = { statusListUri: statusRef.uri, statusListIndex: statusRef.idx }

  try {
    const statusList = await agent.tokenStatusList.fetchTokenStatusList({
      uri: statusRef.uri,
      acceptedFormats: ['jwt'],
    })
    if (statusList.format !== 'jwt') {
      return failure(`Unsupported status list format '${statusList.format}'`, details)
    }

    const status = statusFromBit(getListFromStatusListJWT(statusList.statusList).getStatus(statusRef.idx))
    if (status === 'unknown') {
      return failure(`Unrecognised status value at index ${statusRef.idx}`, details)
    }

    return { checked: true, status, verified: true, ...details }
  } catch (error) {
    return failure(error, details)
  }
}

/**
 * Read the status of several SD-JWT VCs, in order, returning one result per credential.
 *
 * Requests are sequential so a wallet does not fetch many status lists from the same issuer at once. Results keep
 * the input order, so they can be paired with the credentials passed in.
 */
export async function verifyCredentialStatuses(
  agent: Agent,
  { credentials }: { credentials: StatusCheckCredential[] }
): Promise<CredentialStatusResult[]> {
  const results: CredentialStatusResult[] = []
  for (const credential of credentials) {
    results.push(await verifyCredentialStatus(agent, { credential }))
  }
  return results
}
