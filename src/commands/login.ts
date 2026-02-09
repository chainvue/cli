import { Command } from 'commander'
import ora from 'ora'
import chalk from 'chalk'
import { requestDeviceCode, pollDeviceToken } from '../lib/api.js'
import { saveCredentials, getCredentials } from '../lib/keychain.js'
import { setCurrentProfile, getCurrentProfile } from '../lib/config.js'
import * as output from '../lib/output.js'

export const loginCommand = new Command('login')
  .description('Log in to ChainVue')
  .option('--api-key <key>', 'Login with an API key (for CI/CD)')
  .action(async (options) => {
    // Check if already logged in
    const existing = getCurrentProfile()
    if (existing) {
      output.warn(`Already logged in as ${existing.email}`)
      output.dim('Run "chainvue logout" first to switch accounts')
      return
    }

    // API key login (for CI/CD)
    if (options.apiKey) {
      await loginWithApiKey(options.apiKey)
      return
    }

    // OAuth Device Flow
    await loginWithDeviceFlow()
  })

async function loginWithApiKey(apiKey: string): Promise<void> {
  const spinner = ora('Validating API key...').start()

  // Validate key format
  if (!apiKey.startsWith('cv_api_') && !apiKey.startsWith('cv_agent_')) {
    spinner.fail('Invalid API key format')
    output.dim('API keys should start with cv_api_ or cv_agent_')
    return
  }

  // TODO: Validate key by calling /api/v1/auth/me
  // For now, just store it

  await saveCredentials('default', { apiKey, accessToken: '' })

  // We don't have user info with just API key, so create minimal profile
  setCurrentProfile('default', {
    orgId: 'unknown',
    orgName: 'API Key Auth',
    email: 'api-key',
    clerkUserId: '',
    environment: apiKey.includes('_live_') ? 'live' : 'test',
  })

  spinner.succeed('Logged in with API key')
  output.dim('Note: Some commands may have limited functionality with API key auth')
}

async function loginWithDeviceFlow(): Promise<void> {
  const spinner = ora('Requesting device code...').start()

  // Step 1: Request device code
  const deviceResponse = await requestDeviceCode()

  if (!deviceResponse.ok || !deviceResponse.data) {
    spinner.fail('Failed to start login')
    output.error(deviceResponse.error || 'Unknown error')
    return
  }

  const { deviceCode, userCode, verificationUri, expiresIn, interval } = deviceResponse.data

  spinner.stop()

  // Step 2: Display code to user
  console.log()
  console.log(chalk.bold('  To complete login, visit:'))
  console.log()
  console.log(chalk.cyan(`    ${verificationUri}`))
  console.log()
  console.log(chalk.bold('  And enter this code:'))
  console.log()
  console.log(chalk.yellow.bold(`    ${userCode}`))
  console.log()

  // Step 3: Poll for token
  const pollSpinner = ora('Waiting for authorization...').start()

  const expiresAt = Date.now() + expiresIn * 1000
  const pollInterval = Math.max(interval, 5) * 1000

  while (Date.now() < expiresAt) {
    await sleep(pollInterval)

    const tokenResponse = await pollDeviceToken(deviceCode)

    if (tokenResponse.ok && tokenResponse.data) {
      const data = tokenResponse.data as any

      if (data.error === 'authorization_pending') {
        // Still waiting
        continue
      }

      if (data.accessToken) {
        // Success!
        pollSpinner.succeed('Authorized')

        // Save credentials
        await saveCredentials('default', {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        })

        // Save profile
        const org = data.organizations[0]
        setCurrentProfile('default', {
          orgId: org.id,
          orgName: org.name,
          email: data.user.email,
          clerkUserId: data.user.id,
          environment: 'live',
        })

        console.log()
        output.success(`Logged in as ${data.user.email}`)
        output.success(`Organization: ${org.name}`)

        if (data.organizations.length > 1) {
          output.dim(`You have access to ${data.organizations.length} organizations`)
          output.dim('Use "chainvue org switch" to change')
        }

        return
      }
    }

    if (!tokenResponse.ok && tokenResponse.error !== 'authorization_pending') {
      pollSpinner.fail('Authorization failed')
      output.error(tokenResponse.error || 'Unknown error')
      return
    }
  }

  pollSpinner.fail('Authorization timed out')
  output.error('Please try again')
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
