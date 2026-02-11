import type { Agent } from '@credo-ts/core'
import type { PropsWithChildren } from 'react'
import { MdocRecordProvider } from './MdocProvider'
import { SdJwtVcRecordProvider } from './SdJwtVcsProvider'
import { W3cCredentialRecordProvider } from './W3cCredentialsProvider'

interface Props {
  agent: Agent
}

export const CredentialsProvider: React.FC<PropsWithChildren<Props>> = ({ agent, children }) => {
  return (
    <W3cCredentialRecordProvider agent={agent}>
      <SdJwtVcRecordProvider agent={agent}>
        <MdocRecordProvider agent={agent}>{children}</MdocRecordProvider>
      </SdJwtVcRecordProvider>
    </W3cCredentialRecordProvider>
  )
}
