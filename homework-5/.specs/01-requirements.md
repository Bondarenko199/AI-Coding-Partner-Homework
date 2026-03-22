# Requirements

## Purpose

Document the problem, goals, constraints, and acceptance criteria for the work.

## Status

Proposed

## Problem Statement

This homework requires a complete MCP integration submission, not just a custom server. The project must demonstrate working integration with GitHub MCP, Filesystem MCP, and Jira MCP, and it must also include a custom FastMCP server that exposes both a parameterized resource and a tool. The repository currently does not contain the required implementation, configuration, documentation, or screenshot evidence, so the full submission package needs to be produced from scratch.

## Goals

- Deliver a repository that satisfies all tasks defined in `TASKS.md`.
- Provide a working custom MCP server implemented with Python and `fastmcp`.
- Configure GitHub, Filesystem, and Jira MCP integrations using current official documentation.
- Document installation, configuration, execution, and validation steps clearly enough for a reviewer to reproduce them.
- Include screenshot evidence of successful MCP interactions for each required server.

## Non-Goals

- Building a production-grade MCP platform beyond the homework requirements.
- Implementing additional custom MCP features outside the required resource and `read` tool.
- Automating external credential provisioning for GitHub or Jira.
- Committing secrets, tokens, or private account details into the repository.

## Constraints

- The deliverables must align with the structure and success criteria defined in `TASKS.md`.
- The primary documented workflow must support both VS Code and Codex.
- The custom server must live in a separate folder, for example `custom-mcp-server/`.
- The custom server dependency set must explicitly include `fastmcp`.
- The custom resource must read from `lorem-ipsum.md`, accept `word_count`, default to `30`, and return exactly that many words.
- The custom server must reject `word_count` values greater than `100`.
- A tool named `read` must expose the same word-limited content with an optional `word_count` parameter.
- The submission must include `README.md`, `HOWTORUN.md`, MCP configuration, and screenshot artifacts.
- The repository must contain an actual repo-local MCP configuration file suitable for the documented workflow.
- Jira screenshots must avoid exposing sensitive ticket descriptions or secrets.
- Secrets must be provided via environment variables, client secret storage, or local untracked configuration rather than committed values.

## Dependencies

- Python 3 for the custom MCP server.
- `fastmcp` for the custom server implementation.
- VS Code and Codex-compatible MCP configuration support for validation and documentation.
- Access to this repository through a GitHub account for the GitHub MCP task.
- Access to an Atlassian Cloud Jira project for the Jira MCP task.
- Node.js and `npx` for common Filesystem MCP and some Jira proxy-based client setups, depending on the chosen client.

## Assumptions

- The submission will target currently documented MCP server setup patterns as of March 15, 2026.
- A local development environment is available for running Python and MCP clients.
- The user will provide or already has the required GitHub and Jira credentials outside the repository.
- The documented workflow will cover both VS Code and Codex, with a repo-local configuration that can be adapted to each where needed.
- The GitHub MCP demo will use this repository.
- The Jira environment is Atlassian Cloud.
- Screenshot capture will be performed after the integrations are functioning.

## Acceptance Criteria

- A reviewer can clone the repository and understand the submission from `README.md`.
- A reviewer can install dependencies and run the custom server using the documented steps in `HOWTORUN.md`.
- `custom-mcp-server/server.py` starts successfully and exposes:
  - a resource backed by `lorem-ipsum.md`
  - a `word_count` parameter with default `30`
  - a `read` tool that returns the expected limited text
- The custom server dependency file explicitly contains `fastmcp`.
- The repository includes a usable repo-local MCP configuration file for the documented workflow.
- GitHub MCP is documented, configured, and demonstrated with at least one successful interaction screenshot.
- The GitHub MCP demo targets this repository.
- Filesystem MCP is documented, configured, and demonstrated with at least one successful interaction screenshot.
- Jira MCP is documented, configured, and demonstrated with the required "last 5 bugs" request and screenshot evidence that does not reveal sensitive issue content.
- The repository contains a `docs/screenshots/` directory with evidence for all required integrations.
- The specs may be corrected in later stages when better understanding reveals an earlier mistake, and those corrections must be reflected in the affected prior-stage spec files.

## Open Questions

- Jira documentation should keep the project key and exact query wording sanitized even though screenshot evidence has already been captured.
