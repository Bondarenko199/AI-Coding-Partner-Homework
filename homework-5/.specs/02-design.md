# Design

## Purpose

Describe the proposed solution, architecture, and major technical decisions.

## Status

Proposed

## Summary

The project will be delivered as a documentation-first MCP homework repository with one custom Python FastMCP server and one repo-local VS Code MCP configuration file as the committed source of truth. The configuration and docs will cover GitHub, Filesystem, Jira Cloud, and the custom server. Codex support will be documented as an adaptation path from the same server definitions rather than as a second committed config format.

## Proposed Approach

- Use `.vscode/mcp.json` as the committed MCP configuration entry point for the repository.
- Implement the custom server in `custom-mcp-server/server.py` with standalone `fastmcp`.
- Store reusable custom server logic in small helper functions so the resource and tool share the same text-loading and word-limiting behavior.
- Keep secrets out of committed files by using environment-variable references or client-managed secret inputs in MCP configuration.
- Document VS Code as the primary runnable workflow and Codex as a documented secondary workflow that maps the same servers into Codex-compatible configuration.
- Capture screenshots only after all integrations are verified and redact Jira-sensitive content as needed.

## Components

- `README.md`
  - High-level overview of the homework submission, included integrations, and repository contents.
- `HOWTORUN.md`
  - Step-by-step setup for dependencies, server startup, MCP configuration, validation, and screenshot guidance.
- `.vscode/mcp.json`
  - Repo-local MCP server definitions for GitHub, Filesystem, Jira, and the custom server.
- `custom-mcp-server/server.py`
  - FastMCP server entry point with one parameterized resource and one tool.
- `custom-mcp-server/lorem-ipsum.md`
  - Source content for the custom resource and tool output.
- `custom-mcp-server/requirements.txt`
  - Python dependencies including `fastmcp`.
- `docs/screenshots/`
  - Final evidence artifacts for all required integrations.

## Data Flow

- Custom server flow:
  1. MCP client starts `custom-mcp-server/server.py` over stdio.
  2. The resource or tool receives an optional `word_count` input.
  3. Shared logic loads `lorem-ipsum.md`, tokenizes by whitespace, validates the requested count, and returns the exact number of words.
- GitHub MCP flow:
  1. VS Code launches the official GitHub MCP server using repo-local config.
  2. Authentication is supplied through environment variables or secure client input.
  3. The MCP client performs a read-oriented interaction against this repository for screenshot evidence.
- Filesystem MCP flow:
  1. VS Code launches the official filesystem MCP server with the repository path as an allowed directory.
  2. The MCP client queries directory or file content within that boundary.
- Jira MCP flow:
  1. VS Code connects to Atlassian Cloud MCP using the documented endpoint.
  2. The MCP client executes the required bug-ticket query.
  3. The resulting response is captured with sensitive text hidden if needed.

## Interfaces

- Custom MCP resource:
  - URI template will be parameterized to accept `word_count` with a default of `30`.
  - The resource returns plain text derived from `lorem-ipsum.md`.
- Custom MCP tool:
  - Name: `read`
  - Input: optional integer `word_count`
  - Output: plain text matching the same word-limited logic as the resource
- Validation behavior:
  - Reject non-positive `word_count` values with a clear error.
  - Reject `word_count` values greater than `100` with a clear error instead of silently clamping, so behavior remains explicit and predictable.
  - If `word_count` exceeds the available word count in `lorem-ipsum.md`, return a clear error rather than partial output so the contract stays exact.
- Repo-local configuration:
  - `.vscode/mcp.json` is the source of truth for committed MCP setup.
  - Codex instructions in `HOWTORUN.md` will explain how to map the same server definitions into Codex configuration rather than introducing a second committed config file.

## Tradeoffs

- Using `.vscode/mcp.json` as the committed config simplifies the repository and matches the primary target workflow, but Codex users must follow documented translation steps instead of using the same file directly.
- Using the standalone `fastmcp` package aligns with the assignment wording and current FastMCP docs, but it means the implementation should avoid depending on SDK-specific examples from the separate `mcp` Python package.
- Rejecting invalid or oversized `word_count` values is stricter than silently normalizing them, but it keeps the server behavior easier to explain and test.
- A single shared logic path for the resource and tool reduces drift, but it slightly couples their behavior by design.

## Risks

- Client configuration formats differ between VS Code and Codex, so documentation must be precise about which file is committed and how Codex users adapt it.
- External GitHub and Jira authentication may fail for reasons outside the repository, including token scope, OAuth support, or organization restrictions.
- Jira responses may contain sensitive project information, so screenshots need a deliberate redaction approach.
- Official MCP server docs and endpoints are still evolving, especially for remote servers and client support, which may require small adjustments during implementation.
- The exact word-count requirement is easy to violate if tokenization rules are inconsistent, so implementation and QA must use one clearly defined counting rule.

## Open Questions

- Jira docs should continue using sanitized project identifiers and wording even though screenshot evidence has already been captured.
