import keytar from 'keytar'

const SERVICE_NAME = 'chainvue-cli'

export interface StoredCredentials {
  accessToken: string
  refreshToken?: string
  apiKey?: string
}

export async function saveCredentials(
  profile: string,
  credentials: StoredCredentials
): Promise<void> {
  await keytar.setPassword(
    SERVICE_NAME,
    profile,
    JSON.stringify(credentials)
  )
}

export async function getCredentials(
  profile: string
): Promise<StoredCredentials | null> {
  const data = await keytar.getPassword(SERVICE_NAME, profile)
  if (!data) return null

  try {
    return JSON.parse(data) as StoredCredentials
  } catch {
    return null
  }
}

export async function deleteCredentials(profile: string): Promise<boolean> {
  return keytar.deletePassword(SERVICE_NAME, profile)
}

export async function hasCredentials(profile: string): Promise<boolean> {
  const creds = await getCredentials(profile)
  return creds !== null
}

// Get the authorization header value
export async function getAuthHeader(profile: string): Promise<string | null> {
  const creds = await getCredentials(profile)
  if (!creds) return null

  // Prefer API key if set (for CI/CD use)
  if (creds.apiKey) {
    return `Bearer ${creds.apiKey}`
  }

  // Otherwise use session token
  if (creds.accessToken) {
    return `Bearer ${creds.accessToken}`
  }

  return null
}
