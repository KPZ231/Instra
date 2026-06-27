# Instra MCP Server

Remote MCP endpoint that lets external CLI agents authenticate as an Instra user
account and operate on their data.

## Authentication  Personal Access Token (PAT)

1. Log into Instra → go to **Dashboard → Settings → CLI Access**.
2. Give the token a name (e.g. "CLI laptop"), choose an expiry, click **Generate**.
3. Copy the raw token **immediately**  it is shown only once.

Set the token as a `Bearer` header on every MCP request.

## MCP Client Config

```json
{
  "mcpServers": {
    "instra": {
      "url": "https://<your-domain>/api/mcp",
      "headers": {
        "Authorization": "Bearer instra_<your-token>"
      }
    }
  }
}
```

For Claude Code CLI:

```bash
claude mcp add --transport http instra \
  --url https://<your-domain>/api/mcp \
  --header "Authorization: Bearer instra_<your-token>"
```

## Available Tools

| Tool | Description |
|------|-------------|
| `list_posts` | List authenticated user's posts (newest first, max 100) |
| `create_post` | Create a text-only post on specified platforms |
| `list_campaigns` | List all campaigns |
| `get_campaign` | Get a single campaign by ID |
| `create_campaign` | Create a new recurring campaign |
| `delete_campaign` | Delete a campaign |
| `list_reports` | List all analytics reports |
| `get_report` | Get a single report by ID |
| `create_report` | Create a new analytics report |
| `get_analytics` | Get full engagement analytics overview |

All tools are scoped to the token owner  data from other users is never accessible.

## Rate Limits

120 requests per minute per token. Exceeding returns HTTP 429.

## Security

- Tokens are stored as SHA-256 hashes  the raw value is never persisted.
- Revoke a token at any time from the CLI Access settings page.
- Expired tokens are rejected automatically.
- Each tool enforces ownership  e.g. `get_campaign` returns 404 for other users' campaigns.
