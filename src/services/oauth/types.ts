export type SubscriptionType =
  | 'free'
  | 'pro'
  | 'max'
  | 'team'
  | 'enterprise'
  | 'unknown'

export type OAuthProfileResponse = {
  account: {
    uuid: string
    email: string
    display_name?: string | null
    created_at?: string
  }
  organization: {
    uuid: string
    has_extra_usage_enabled?: boolean | null
    billing_type?: string | null
    subscription_created_at?: string | null
  }
  subscriptionType?: SubscriptionType | null
}

export type OAuthTokenAccount = {
  uuid: string
  emailAddress: string
  organizationUuid: string
}

export type OAuthTokens = {
  accessToken: string
  refreshToken?: string
  expiresAt?: number
  scopes?: string[]
  subscriptionType?: SubscriptionType | null
  profile?: OAuthProfileResponse
  tokenAccount?: OAuthTokenAccount
}

export type ReferralRedemptionsResponse = {
  redemptions?: Array<Record<string, unknown>>
  total?: number
}

export type ReferrerRewardInfo = {
  amount?: number
  currency?: string
  type?: string
}

