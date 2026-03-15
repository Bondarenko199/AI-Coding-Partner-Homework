# Homework 5: MCP Server Configuration

Author: H. Bondarenko

## Overview

This repository contains the submission work for Homework 5 on Model Context Protocol (MCP) server configuration.

The scope of the assignment is:
- configure GitHub MCP
- configure Filesystem MCP
- configure Jira MCP
- build a custom FastMCP server with a resource and a `read` tool
- document setup and usage
- collect screenshots that prove each integration works

## Deliverables

The repository is intended to contain these deliverables:
- `TASKS.md` with the assignment requirements
- `README.md` with the submission overview
- `HOWTORUN.md` with installation, configuration, and usage instructions
- `demo/run.sh` with a helper flow for preparing and starting `customMcp`
- `mcp.json` at repo root for assignment-facing MCP configuration delivery
- `.vscode/mcp.json` as the VS Code workspace copy of the same MCP configuration
- `custom-mcp-server/` with the FastMCP implementation and dependencies
- `docs/screenshots/` with evidence of successful MCP interactions
- `.specs/` with staged requirements, design, tasks, implementation, and QA specs

## External Access

GitHub and Jira integrations require external credentials and access that are not stored in this repository.

- GitHub MCP requires a GitHub account and token or another supported authentication method.
- Jira MCP requires access to an Atlassian Cloud Jira project and the corresponding authentication flow.
- Secrets must be provided through local environment variables or client-managed secret storage, not committed files.

## Status

The repository now contains the custom FastMCP server implementation, mirrored MCP configuration files, staged specs, and screenshot evidence for the required integrations. Remaining work is limited to final reviewer-facing polish and minor repository hygiene.

For the custom server, the repository also includes `demo/run.sh`, which prepares `.venv`, installs dependencies when needed, validates `server.py`, and starts `customMcp`.
