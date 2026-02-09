import { Command } from 'commander'
import { getCurrentProfile, getApiEndpoint } from '../lib/config.js'
import { getCredentials } from '../lib/keychain.js'
import * as output from '../lib/output.js'

export const whoamiCommand = new Command('whoami')
  .description('Show current user and organization')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const profile = getCurrentProfile()

    if (!profile) {
      output.error('Not logged in')
      output.dim('Run: chainvue login')
      process.exit(1)
    }

    const creds = await getCredentials('default')
    const authMethod = creds?.apiKey ? 'API Key' : 'Session'

    if (options.json) {
      output.json({
        email: profile.email,
        organization: {
          id: profile.orgId,
          name: profile.orgName,
        },
        environment: profile.environment,
        authMethod,
        apiEndpoint: getApiEndpoint(),
      })
      return
    }

    console.log()
    output.keyValue({
      'Email': profile.email,
      'Organization': profile.orgName,
      'Org ID': profile.orgId,
      'Environment': profile.environment,
      'Auth Method': authMethod,
      'API Endpoint': getApiEndpoint(),
    })
    console.log()
  })
