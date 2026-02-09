import chalk from 'chalk'
import Table from 'cli-table3'

export function success(message: string): void {
  console.log(chalk.green('✓') + ' ' + message)
}

export function error(message: string): void {
  console.log(chalk.red('✗') + ' ' + message)
}

export function warn(message: string): void {
  console.log(chalk.yellow('!') + ' ' + message)
}

export function info(message: string): void {
  console.log(chalk.blue('→') + ' ' + message)
}

export function dim(message: string): void {
  console.log(chalk.dim(message))
}

export function json(data: unknown): void {
  console.log(JSON.stringify(data, null, 2))
}

export function table(
  headers: string[],
  rows: string[][],
  options: { head?: boolean } = {}
): void {
  const t = new Table({
    head: headers.map(h => chalk.bold(h)),
    style: {
      head: [],
      border: ['dim'],
    },
  })

  for (const row of rows) {
    t.push(row)
  }

  console.log(t.toString())
}

export function keyValue(data: Record<string, string | number | null | undefined>): void {
  const maxKeyLength = Math.max(...Object.keys(data).map(k => k.length))

  for (const [key, value] of Object.entries(data)) {
    const paddedKey = key.padEnd(maxKeyLength)
    const displayValue = value === null || value === undefined
      ? chalk.dim('—')
      : String(value)
    console.log(`${chalk.bold(paddedKey)}  ${displayValue}`)
  }
}

export function formatTimeAgo(date: Date | string | null): string {
  if (!date) return 'Never'

  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000)

  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`

  return d.toLocaleDateString()
}
