export enum InvitationQrTypesSupported {
  OPENID = 'openid://',
  OPENID_INITIATE_ISSUANCE = 'openid-initiate-issuance://',
  OPENID_CREDENTIAL_OFFER = 'openid-credential-offer://',
  OPENID4VP = 'openid4vp://',
  OPENID_VC = 'openid-vc://',
}
export type ParseInvitationResult =
  | {
      success: true
      result: ParsedInvitation
    }
  | {
      success: false
      error: string
    }

export type ParsedInvitation = {
  type: 'openid-credential-offer' | 'openid-authorization-request'
  format: 'url' | 'parsed'
  data: string | Record<string, unknown>
}

export const isOpenIdCredentialOffer = (url: string) => {
  if (
    url.startsWith(InvitationQrTypesSupported.OPENID_INITIATE_ISSUANCE) ||
    url.startsWith(InvitationQrTypesSupported.OPENID_CREDENTIAL_OFFER)
  ) {
    return true
  }

  if (url.includes('credential_offer_uri=') || url.includes('credential_offer=')) {
    return true
  }

  return false
}

export const isOpenIdPresentationRequest = (url: string) => {
  if (
    url.startsWith(InvitationQrTypesSupported.OPENID) ||
    url.startsWith(InvitationQrTypesSupported.OPENID_VC) ||
    url.startsWith(InvitationQrTypesSupported.OPENID4VP)
  ) {
    return true
  }

  if (url.includes('request_uri=') || url.includes('request=')) {
    return true
  }
  return false
}

export function parseInvitationUrl(invitationUrl: string): ParseInvitationResult {
  if (isOpenIdCredentialOffer(invitationUrl)) {
    return {
      success: true,
      result: {
        format: 'url',
        type: 'openid-credential-offer',
        data: invitationUrl,
      },
    }
  }

  if (isOpenIdPresentationRequest(invitationUrl)) {
    return {
      success: true,
      result: {
        format: 'url',
        type: 'openid-authorization-request',
        data: invitationUrl,
      },
    }
  }
  return {
    success: false,
    error: 'Invitation not recognized.',
  }
}
