import { request } from 'undici'
import { getApiEndpoint, getCurrentProfile } from './config.js'
import { getAuthHeader } from './keychain.js'

export interface ApiResponse<T = unknown> {
  ok: boolean
  status: number
  data?: T
  error?: string
}

export async function apiRequest<T = unknown>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
  authRequired = true
): Promise<ApiResponse<T>> {
  const endpoint = getApiEndpoint()
  const url = `${endpoint}${path}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'ChainVue-CLI/0.1.0',
  }

  if (authRequired) {
    const profile = getCurrentProfile()
    if (!profile) {
      return {
        ok: false,
        status: 401,
        error: 'Not logged in. Run: chainvue login',
      }
    }

    const auth = await getAuthHeader('default')
    if (!auth) {
      return {
        ok: false,
        status: 401,
        error: 'No credentials found. Run: chainvue login',
      }
    }

    headers['Authorization'] = auth
  }

  try {
    const response = await request(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    const text = await response.body.text()
    let data: T | undefined

    try {
      data = JSON.parse(text) as T
    } catch {
      // Not JSON response
    }

    if (response.statusCode >= 400) {
      return {
        ok: false,
        status: response.statusCode,
        error: (data as any)?.error || `HTTP ${response.statusCode}`,
        data,
      }
    }

    return {
      ok: true,
      status: response.statusCode,
      data,
    }
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      error: err.message || 'Network error',
    }
  }
}

// GraphQL query
export async function graphqlQuery<T = unknown>(
  query: string,
  variables?: Record<string, unknown>
): Promise<ApiResponse<T>> {
  // GraphQL goes to the NestJS API, not the Next.js app
  const endpoint = 'https://api.chainvue.io/graphql'

  const profile = getCurrentProfile()
  if (!profile) {
    return {
      ok: false,
      status: 401,
      error: 'Not logged in. Run: chainvue login',
    }
  }

  const auth = await getAuthHeader('default')
  if (!auth) {
    return {
      ok: false,
      status: 401,
      error: 'No credentials found. Run: chainvue login',
    }
  }

  try {
    const response = await request(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': auth,
        'User-Agent': 'ChainVue-CLI/0.1.0',
      },
      body: JSON.stringify({ query, variables }),
    })

    const data = await response.body.json() as any

    if (data.errors) {
      return {
        ok: false,
        status: response.statusCode,
        error: data.errors[0]?.message || 'GraphQL error',
        data,
      }
    }

    return {
      ok: true,
      status: response.statusCode,
      data: data.data as T,
    }
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      error: err.message || 'Network error',
    }
  }
}

// Device auth flow
export async function requestDeviceCode(): Promise<ApiResponse<{
  deviceCode: string
  userCode: string
  verificationUri: string
  expiresIn: number
  interval: number
}>> {
  return apiRequest('POST', '/api/v1/auth/device', undefined, false)
}

export async function pollDeviceToken(deviceCode: string): Promise<ApiResponse<{
  accessToken: string
  refreshToken: string
  user: { id: string; email: string }
  organizations: Array<{ id: string; name: string; role: string }>
} | { error: string }>> {
  return apiRequest('POST', '/api/v1/auth/device/token', { deviceCode }, false)
}
