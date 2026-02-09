import { Command } from 'commander'
import { readFileSync } from 'fs'
import ora from 'ora'
import { graphqlQuery } from '../lib/api.js'
import * as output from '../lib/output.js'

export const queryCommand = new Command('query')
  .description('Execute a GraphQL query')
  .argument('[query]', 'GraphQL query string')
  .option('-f, --file <file>', 'Read query from file')
  .option('--json', 'Output as JSON (default)')
  .option('--pretty', 'Pretty print JSON output')
  .action(async (queryArg, options) => {
    let query: string

    if (options.file) {
      try {
        query = readFileSync(options.file, 'utf-8')
      } catch (err: any) {
        output.error(`Failed to read file: ${err.message}`)
        process.exit(1)
      }
    } else if (queryArg) {
      query = queryArg
    } else {
      output.error('Provide a query string or use --file')
      output.dim('Example: chainvue query "{ blocks(limit: 5) { height hash } }"')
      process.exit(1)
    }

    const spinner = ora('Executing query...').start()

    const response = await graphqlQuery(query)

    if (!response.ok) {
      spinner.fail('Query failed')
      output.error(response.error || 'Unknown error')

      if (response.data) {
        console.log()
        output.json(response.data)
      }

      process.exit(1)
    }

    spinner.stop()

    if (options.pretty) {
      console.log(JSON.stringify(response.data, null, 2))
    } else {
      console.log(JSON.stringify(response.data))
    }
  })
