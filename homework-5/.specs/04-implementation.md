# Implementation

## Purpose

Record what was built, how it was built, and any deviations from the plan.

## Status

Implemented, Minor Cleanup Applied

## Summary

Implementation is established for the repository scaffold, mirrored MCP configuration files, staged documentation, screenshot evidence, and the custom FastMCP server code. The remaining work is limited to minor reviewer-facing cleanup rather than core feature delivery.

## Changes Made

- Created the repo-local MCP configuration at `.vscode/mcp.json` as the committed source of truth for VS Code.
- Added the first draft of `README.md`.
- Added the first draft of `HOWTORUN.md`.
- Added `demo/run.sh` to automate local environment preparation and startup for `customMcp`.
- Added a root-level `mcp.json` so the repository matches the expected deliverable shape while preserving the VS Code workspace copy in `.vscode/mcp.json`.
- Created the screenshot artifact placeholder at `docs/screenshots/.gitkeep`.
- Added the custom server dependency file at `custom-mcp-server/requirements.txt` with `fastmcp`.
- Added the custom server source text at `custom-mcp-server/lorem-ipsum.md`.
- Implemented `custom-mcp-server/server.py` with:
  - shared file-loading and word-slicing logic
  - a parameterized resource
  - a `read` tool
  - validation for non-positive, oversized, and impossible word-count requests
- Completed a syntax-level verification pass for `custom-mcp-server/server.py`.
- Verified that `custom-mcp-server/lorem-ipsum.md` contains enough words to support the chosen maximum `word_count`.

## Files Affected

- `.vscode/mcp.json`
- `mcp.json`
- `.vscode/.gitkeep`
- `README.md`
- `HOWTORUN.md`
- `demo/run.sh`
- `docs/screenshots/.gitkeep`
- `custom-mcp-server/requirements.txt`
- `custom-mcp-server/lorem-ipsum.md`
- `custom-mcp-server/server.py`

## Decisions During Implementation

- `mcp.json` and `.vscode/mcp.json` are mirrored so the repo satisfies both the assignment structure and VS Code workspace discovery.
- The custom server dependency file currently contains the minimum required dependency set to satisfy the homework and keep the environment simple.
- A small helper script is acceptable for this project when it reduces setup friction without changing the actual MCP server behavior.
- The custom server will enforce a maximum `word_count` of `100`.
- Jira-specific documentation values remain sanitized in the repository even after evidence capture to avoid exposing sensitive project details.
- The early implementation pass is intentionally focusing on unblocked work first while waiting for the remaining user-provided decisions that affect validation and Jira evidence capture.

## Deviations From Design

- No intentional design deviation has been introduced yet.
- Some parallel worker tasks were partially successful, so a portion of the implementation was resumed locally to keep momentum and avoid leaving the repository in an inconsistent state.

## Follow-Up Work

- Keep `mcp.json` and `.vscode/mcp.json` synchronized if the MCP configuration changes.
- Consider adding a more explicit CLI-level end-to-end verification path if stricter reproducibility evidence is needed.
