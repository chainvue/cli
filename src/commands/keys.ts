import { Command } from 'commander'
import ora from 'ora'
import { apiRequest } from '../lib/api.js'
import * as output from '../lib/output.js'

interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  environment: 'TEST' | 'LIVE'
  type: 'api' | 'agent'
  lastUsedAt: string | null
  createdAt: string
}

export const keysCommand = new Command('keys')
  .description('Manage API keys')

keysCommand
  .command('list')
  .description('List all API keys')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const spinner = ora('Fetching API keys...').start()

    const response = await apiRequest<{ keys: ApiKey[] }>('GET', '/api/v1/keys')

    if (!response.ok) {
      spinner.fail('Failed to fetch keys')
      output.error(response.error || 'Unknown error')
      return
    }

    spinner.stop()

    const keys = response.data?.keys || []

    if (options.json) {
      output.json(keys)
      return
    }

    if (keys.length === 0) {
      output.info('No API keys found')
      output.dim('Create one with: chainvue keys create --name "My Key"')
      return
    }

    output.table(
      ['NAME', 'TYPE', 'ENV', 'PREFIX', 'LAST USED', 'CREATED'],
      keys.map(k => [
        k.name,
        k.type,
        k.environment.toLowerCase(),
        k.keyPrefix,
        output.formatTimeAgo(k.lastUsedAt),
        output.formatTimeAgo(k.createdAt),
      ])
    )
  })

keysCommand
  .command('create')
  .description('Create a new API key')
  .requiredOption('--name <name>', 'Name for the key')
  .option('--type <type>', 'Key type: api or agent', 'api')
  .option('--env <env>', 'Environment: test or live', 'test')
  .action(async (options) => {
    const spinner = ora('Creating API key...').start()

    const response = await apiRequest<{
      id: string
      key: string
      keyPrefix: string
      name: string
      environment: string
    }>('POST', '/api/v1/keys', {
      name: options.name,
      type: options.type,
      environment: options.env.toUpperCase(),
    })

    if (!response.ok) {
      spinner.fail('Failed to create key')
      output.error(response.error || 'Unknown error')
      return
    }

    spinner.succeed('API key created')
    console.log()

    const { key, keyPrefix, name, environment } = response.data!

    output.keyValue({
      'Name': name,
      'Environment': environment.toLowerCase(),
      'Key': key,
    })

    console.log()
    output.warn('Save this key now! You won\'t be able to see it again.')
  })

keysCommand
  .command('revoke <id>')
  .description('Revoke an API key')
  .action(async (id) => {
    const spinner = ora('Revoking API key...').start()

    const response = await apiRequest('DELETE', `/api/v1/keys/${id}`)

    if (!response.ok) {
      spinner.fail('Failed to revoke key')
      output.error(response.error || 'Unknown error')
      return
    }

    spinner.succeed('API key revoked')
  })
