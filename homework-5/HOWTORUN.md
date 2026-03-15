# How To Run

## Overview

This repository ships the MCP configuration in two mirrored locations:

- `mcp.json` at the repository root for assignment-facing deliverable coverage
- `.vscode/mcp.json` for VS Code workspace discovery

The two files are intended to stay in sync.

The documented primary workflow is:

1. create a local Python virtual environment for the custom server
2. install the custom server dependencies
3. open the repository in VS Code
4. allow VS Code to load the MCP servers from `.vscode/mcp.json`
5. authenticate the external servers as needed
6. run MCP interactions for GitHub, Filesystem, Jira, and the custom server

Important: the custom server entry in both `mcp.json` and `.vscode/mcp.json` uses `${workspaceFolder}/.venv/bin/python`. If `.venv` does not exist or does not contain `fastmcp`, the `customMcp` server will fail to start.

Codex can use the same server definitions, but its configuration must be mapped into `~/.codex/config.toml` because it does not consume `.vscode/mcp.json` directly.

## Prerequisites

- Python 3
- Node.js and `npx`
- VS Code with MCP server support enabled
- Access to this repository on GitHub
- Access to an Atlassian Cloud Jira project

## Custom Server Setup

From the repository root:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r custom-mcp-server/requirements.txt
```

Quick syntax validation:

```bash
python -m py_compile custom-mcp-server/server.py
```

Run the custom server manually:

```bash
python custom-mcp-server/server.py
```

Or use the helper script:

```bash
bash demo/run.sh
```

The script will:

- create `.venv` if it does not exist
- install or refresh `custom-mcp-server/requirements.txt` when the requirements file changes
- run a syntax check for `custom-mcp-server/server.py`
- start the `customMcp` server

If VS Code already attempted to start `customMcp` before the environment was ready, restart that MCP server after the commands above complete.

## VS Code MCP Setup

The committed MCP configuration is mirrored between `mcp.json` and `.vscode/mcp.json`.

Use `.vscode/mcp.json` for VS Code, and treat `mcp.json` as the assignment-facing root copy of the same configuration.

It defines four servers:

- `github`
- `filesystem`
- `jira`
- `customMcp`

Expected setup behavior:

- GitHub prompts for a Personal Access Token through the `github-pat` input.
- Filesystem uses the official filesystem MCP server, scopes access to this workspace, and enables workspace write access through the VS Code MCP sandbox settings in the checked-in config.
- Jira points at Atlassian Cloud MCP using the current `/v1/mcp` endpoint.
- The custom server runs from the local workspace virtual environment at `.venv/bin/python`.

Open this repository in VS Code and confirm that MCP server discovery recognizes `.vscode/mcp.json`.

If `customMcp` fails with `ModuleNotFoundError: No module named 'fastmcp'`, install the requirements into `.venv` and restart the MCP server from VS Code.

## Suggested Validation Flow

### GitHub MCP

Use a read-oriented interaction against this repository, for example:

- list open pull requests for this repository
- summarize recent commits in this repository
- list recent issues for this repository

### Filesystem MCP

Use a workspace-scoped interaction, for example:

- list allowed directories
- show the directory tree for the repository
- read `TASKS.md`

### Jira MCP

Use the homework-required bug query against an Atlassian Cloud project.

The repository already includes Jira evidence, but the documentation keeps project-specific values sanitized:

- project key: `<jira-project-key>`
- example wording: `Give me the Jira tickets of the last 5 bugs on project <jira-project-key>`

This is intentional. Keep the screenshots and docs limited to ticket identifiers or redacted project details rather than exposing sensitive bug content.

### Custom MCP Server

Validate both:

- the resource backed by `custom-mcp-server/lorem-ipsum.md`
- the `read` tool with optional `word_count`
- rejection of invalid `word_count` values, including values greater than `100`

## Codex Adaptation

Codex does not use `.vscode/mcp.json` directly. Recreate the same server definitions in `~/.codex/config.toml`.

At a minimum, the mapping should preserve:

- the GitHub MCP endpoint and token source
- the filesystem server command and allowed path
- the Jira MCP endpoint
- the local command for `custom-mcp-server/server.py`

## Resources vs Tools

Resources are MCP URIs that the client can read for context, such as file-backed content or API-backed content.

Tools are callable MCP actions that the client can invoke to perform an operation, such as reading filtered content or running a workflow step.

In this project:

- the custom resource provides word-limited content from `lorem-ipsum.md`
- the `read` tool returns the same content through a callable interface

## Screenshots

Store screenshot evidence in `docs/screenshots/`.

When capturing screenshots:

- do not expose GitHub or Jira secrets
- do not expose Jira bug descriptions or other sensitive content
- prefer screenshots that clearly show both the MCP request and the successful result

## Notes

- If implementation work changes the final setup details, update this file to match the actual working flow.
- The assignment requirements in `TASKS.md` remain the final source of truth.
