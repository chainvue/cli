#!/usr/bin/env node
import { Command } from 'commander'
import { loginCommand } from './commands/login.js'
import { logoutCommand } from './commands/logout.js'
import { whoamiCommand } from './commands/whoami.js'
import { keysCommand } from './commands/keys.js'
import { webhooksCommand } from './commands/webhooks.js'
import { queryCommand } from './commands/query.js'
import { orgCommand } from './commands/org.js'
import { CLI_VERSION } from './lib/api.js'

const program = new Command()

program
  .name('chainvue')
  .description('ChainVue CLI - Manage your blockchain infrastructure')
  .version(CLI_VERSION)

// Auth commands
program.addCommand(loginCommand)
program.addCommand(logoutCommand)
program.addCommand(whoamiCommand)

// Management commands
program.addCommand(keysCommand)
program.addCommand(webhooksCommand)
program.addCommand(orgCommand)

// Query command
program.addCommand(queryCommand)

// Parse arguments
program.parse()
