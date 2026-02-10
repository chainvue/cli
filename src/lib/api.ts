import { request } from 'undici'
import { getApiEndpoint, getCurrentProfile } from './config.js'
import { getAuthHeader } from './keychain.js'
import chalk from 'chalk'

declare const __CLI_VERSION__: string

const CLI_VERSION = typeof __CLI_VERSION__ !== 'undefined' ? __CLI_VERSION__ : '0.0.0-dev'
const USER_AGENT = `ChainVue-CLI/${CLI_VERSION} (${process.platform}; node/${process.version.slice(1)})`

export { CLI_VERSION }

export interface ApiResponse<T = unknown> {
  ok: boolean
  status: number
  data?: T
  error?: string
}

let updateNoticeShown = false

/**
 * Check response headers for update notices from the server.
 */
function checkForUpdate(headers: Record<string, string | string[] | undefined>): void {
  if (updateNoticeShown) return

  const latestVersion = headers['x-chainvue-latest-cli'] as string | undefined
  if (!latestVersion || latestVersion === CLI_VERSION) return

  updateNoticeShown = true
  console.error()
  console.error(chalk.yellow(`  Update available: ${CLI_VERSION} → ${latestVersion}`))
  console.error(chalk.dim(`  Run: npm install -g @chainvue/cli`))
  console.error()
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
    'User-Agent': USER_AGENT,
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

    checkForUpdate(response.headers as any)

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
        'User-Agent': USER_AGENT,
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
