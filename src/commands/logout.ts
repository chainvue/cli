import { Command } from 'commander'
import { deleteCredentials } from '../lib/keychain.js'
import { deleteProfile, getCurrentProfile } from '../lib/config.js'
import * as output from '../lib/output.js'

export const logoutCommand = new Command('logout')
  .description('Log out of ChainVue')
  .action(async () => {
    const profile = getCurrentProfile()

    if (!profile) {
      output.warn('Not currently logged in')
      return
    }

    // Delete credentials from keychain
    await deleteCredentials('default')

    // Delete profile from config
    deleteProfile('default')

    output.success(`Logged out from ${profile.email}`)
  })
