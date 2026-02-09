import { Command } from 'commander'
import ora from 'ora'
import chalk from 'chalk'
import { apiRequest } from '../lib/api.js'
import { getCurrentProfile, setCurrentProfile } from '../lib/config.js'
import * as output from '../lib/output.js'

interface Organization {
  id: string
  name: string
  slug: string
  role: string
  plan: string
}

export const orgCommand = new Command('org')
  .description('Manage organizations')

orgCommand
  .command('list')
  .description('List your organizations')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const spinner = ora('Fetching organizations...').start()

    const response = await apiRequest<{ organizations: Organization[] }>('GET', '/api/v1/orgs')

    if (!response.ok) {
      spinner.fail('Failed to fetch organizations')
      output.error(response.error || 'Unknown error')
      return
    }

    spinner.stop()

    const orgs = response.data?.organizations || []
    const currentProfile = getCurrentProfile()

    if (options.json) {
      output.json(orgs)
      return
    }

    if (orgs.length === 0) {
      output.info('No organizations found')
      return
    }

    console.log()
    for (const org of orgs) {
      const isCurrent = org.id === currentProfile?.orgId
      const marker = isCurrent ? chalk.green('▶ ') : '  '
      const name = isCurrent ? chalk.bold(org.name) : org.name

      console.log(`${marker}${name}`)
      console.log(`    ID: ${org.id}`)
      console.log(`    Role: ${org.role}  Plan: ${org.plan}`)
      console.log()
    }
  })

orgCommand
  .command('switch <orgId>')
  .description('Switch to a different organization')
  .action(async (orgId) => {
    const spinner = ora('Switching organization...').start()

    // Fetch org details to verify access
    const response = await apiRequest<{
      id: string
      name: string
      slug: string
    }>('GET', `/api/v1/orgs/${orgId}`)

    if (!response.ok) {
      spinner.fail('Failed to switch organization')
      output.error(response.error || 'Organization not found or no access')
      return
    }

    const org = response.data!
    const currentProfile = getCurrentProfile()

    if (!currentProfile) {
      spinner.fail('Not logged in')
      return
    }

    // Update profile with new org
    setCurrentProfile('default', {
      ...currentProfile,
      orgId: org.id,
      orgName: org.name,
    })

    spinner.succeed(`Switched to ${org.name}`)
  })

orgCommand
  .command('current')
  .description('Show current organization')
  .action(async () => {
    const profile = getCurrentProfile()

    if (!profile) {
      output.error('Not logged in')
      process.exit(1)
    }

    console.log()
    output.keyValue({
      'Organization': profile.orgName,
      'ID': profile.orgId,
    })
    console.log()
  })
