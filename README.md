# ChainVue CLI

The official command-line interface for [ChainVue](https://chainvue.io) - manage your blockchain infrastructure from the terminal.

## Installation

```bash
npm install -g @chainvue/cli
```

## Quick Start

```bash
# Login to your ChainVue account
chainvue login

# Check your current session
chainvue whoami

# Query blockchain data
chainvue query '{ blocks(limit: 5) { height hash } }'
```

## Commands

### Authentication

```bash
chainvue login              # Login via browser (OAuth Device Flow)
chainvue login --api-key    # Login with an API key (for CI/CD)
chainvue logout             # Log out and clear credentials
chainvue whoami             # Show current user and organization
```

### API Keys

```bash
chainvue keys list                        # List all API keys
chainvue keys create --name "My Key"      # Create a new API key
chainvue keys create --name "Test" --env test --type agent
chainvue keys revoke <id>                 # Revoke an API key
```

### Webhooks

```bash
chainvue webhooks list                    # List all webhooks
chainvue webhooks create \
  --url https://example.com/hook \
  --events address.received,address.sent \
  --chain VRSC
chainvue webhooks test <id>               # Send a test event
chainvue webhooks delete <id>             # Delete a webhook
```

### Organizations

```bash
chainvue org list                         # List your organizations
chainvue org switch <id>                  # Switch to a different org
```

### GraphQL Queries

```bash
# Inline query
chainvue query '{ blocks(limit: 1) { height } }'

# From file
chainvue query -f query.graphql

# Output as JSON
chainvue query '{ blocks(limit: 5) { height hash } }' --json
```

## Configuration

Credentials are stored securely in your system keychain:
- **macOS**: Keychain Access
- **Windows**: Credential Manager
- **Linux**: libsecret

Config file location: `~/.config/chainvue/config.json`

## Environment Variables

For CI/CD pipelines, you can use environment variables:

```bash
export CHAINVUE_API_KEY=cv_api_live_xxxxx
chainvue query '{ blocks(limit: 1) { height } }'
```

## Requirements

- Node.js 18.0.0 or higher

## Links

- [Documentation](https://chainvue.io/docs)
- [GraphQL API Reference](https://chainvue.io/docs/graphql)
- [Dashboard](https://chainvue.io/dashboard)

## License

MIT
