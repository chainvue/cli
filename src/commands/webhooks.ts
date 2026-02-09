import { Command } from 'commander'
import ora from 'ora'
import { apiRequest } from '../lib/api.js'
import * as output from '../lib/output.js'

interface Webhook {
  id: string
  url: string
  description?: string
  events: string[]
  chainId: string
  isActive: boolean
  deliveryCount: number
  failureCount: number
  lastTriggeredAt: string | null
  createdAt: string
}

const CHAIN_NAMES: Record<string, string> = {
  'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq': 'VRSCTEST',
  'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV': 'Verus',
}

export const webhooksCommand = new Command('webhooks')
  .description('Manage webhooks')

webhooksCommand
  .command('list')
  .description('List all webhooks')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const spinner = ora('Fetching webhooks...').start()

    const response = await apiRequest<{ webhooks: Webhook[] }>('GET', '/api/v1/webhooks')

    if (!response.ok) {
      spinner.fail('Failed to fetch webhooks')
      output.error(response.error || 'Unknown error')
      return
    }

    spinner.stop()

    const webhooks = response.data?.webhooks || []

    if (options.json) {
      output.json(webhooks)
      return
    }

    if (webhooks.length === 0) {
      output.info('No webhooks found')
      output.dim('Create one with: chainvue webhooks create --url https://...')
      return
    }

    output.table(
      ['URL', 'CHAIN', 'EVENTS', 'STATUS', 'SUCCESS', 'LAST'],
      webhooks.map(w => {
        const successRate = w.deliveryCount > 0
          ? `${(((w.deliveryCount - w.failureCount) / w.deliveryCount) * 100).toFixed(1)}%`
          : '—'

        return [
          w.url.length > 40 ? w.url.slice(0, 37) + '...' : w.url,
          CHAIN_NAMES[w.chainId] || w.chainId.slice(0, 8),
          w.events.length.toString(),
          w.isActive ? 'active' : 'disabled',
          successRate,
          output.formatTimeAgo(w.lastTriggeredAt),
        ]
      })
    )
  })

webhooksCommand
  .command('create')
  .description('Create a new webhook')
  .requiredOption('--url <url>', 'Webhook endpoint URL (HTTPS)')
  .option('--description <desc>', 'Description')
  .option('--events <events>', 'Comma-separated events', 'address.received')
  .option('--chain <chain>', 'Chain ID or name', 'VRSCTEST')
  .action(async (options) => {
    const spinner = ora('Creating webhook...').start()

    // Resolve chain name to ID
    let chainId = options.chain
    if (options.chain === 'VRSCTEST') {
      chainId = 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq'
    } else if (options.chain === 'Verus') {
      chainId = 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV'
    }

    const events = options.events.split(',').map((e: string) => e.trim())

    const response = await apiRequest<{
      id: string
      url: string
      secret: string
      events: string[]
    }>('POST', '/api/v1/webhooks', {
      url: options.url,
      description: options.description,
      chainId,
      events,
    })

    if (!response.ok) {
      spinner.fail('Failed to create webhook')
      output.error(response.error || 'Unknown error')
      return
    }

    spinner.succeed('Webhook created')
    console.log()

    const { url, secret, events: createdEvents } = response.data!

    output.keyValue({
      'URL': url,
      'Events': createdEvents.join(', '),
      'Secret': secret,
    })

    console.log()
    output.warn('Save this secret now! You won\'t be able to see it again.')
  })

webhooksCommand
  .command('delete <id>')
  .description('Delete a webhook')
  .action(async (id) => {
    const spinner = ora('Deleting webhook...').start()

    const response = await apiRequest('DELETE', `/api/v1/webhooks/${id}`)

    if (!response.ok) {
      spinner.fail('Failed to delete webhook')
      output.error(response.error || 'Unknown error')
      return
    }

    spinner.succeed('Webhook deleted')
  })

webhooksCommand
  .command('test <id>')
  .description('Send a test event to a webhook')
  .action(async (id) => {
    const spinner = ora('Sending test event...').start()

    const response = await apiRequest<{
      success: boolean
      responseCode: number | null
      responseTime: number | null
      errorMessage: string | null
    }>('POST', `/api/v1/webhooks/${id}/test`)

    if (!response.ok) {
      spinner.fail('Failed to send test')
      output.error(response.error || 'Unknown error')
      return
    }

    const result = response.data!

    if (result.success) {
      spinner.succeed(`Test delivered (${result.responseCode}, ${result.responseTime}ms)`)
    } else {
      spinner.fail(`Test failed: ${result.errorMessage}`)
    }
  })
