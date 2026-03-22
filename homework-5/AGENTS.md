# Repository Guidelines

## Project Structure & Module Organization

This repository is a homework submission for MCP server configuration. `TASKS.md` is the current source of truth for required deliverables. Expected top-level additions are:

- `README.md`: submission overview and author name.
- `HOWTORUN.md`: install, run, MCP connection, and usage steps.
- `mcp.json` or `.mcp.json`: MCP client/server configuration.
- `custom-mcp-server/`: implementation for the custom MCP server.
- `docs/screenshots/`: evidence of successful GitHub, Filesystem, Jira, and custom MCP interactions.
- `tests/`: optional automated tests if introduced.

Keep docs, config, and implementation aligned. If the custom server language changes, update `TASKS.md`, `HOWTORUN.md`, and examples in the same change.

## Build, Test, and Development Commands

This repo has no build tooling yet. Add commands that match the checked-in implementation.

- `python3 -m venv .venv`: create a virtual environment if following the current `server.py` task spec.
- `source .venv/bin/activate`: activate the environment on macOS/Linux.
- `pip install -r custom-mcp-server/requirements.txt`: install server dependencies.
- `python -m py_compile custom-mcp-server/server.py`: quick syntax validation.
- `python custom-mcp-server/server.py`: run the custom server locally.

If the project moves to TypeScript, replace these with the equivalent `npm install`, `npm run build`, and `npm run dev` commands and document them in `HOWTORUN.md`.

## Coding Style & Naming Conventions

Use the conventions of the chosen implementation language consistently. For the current Python-based task spec, use 4-space indentation, `snake_case` names, and small readable functions. Name screenshots descriptively, for example `docs/screenshots/github-mcp-result.png`. Prefer ASCII text and short comments only where behavior is not obvious.

## Testing Guidelines

There is no automated test suite yet. Minimum validation is:

- the server starts without errors
- MCP resources/tools return expected output
- screenshots capture successful MCP calls

If tests are added, place them under `tests/` and use clear names such as `test_server.py` or `server.test.ts`, depending on language.

## Commit & Pull Request Guidelines

Recent history uses short, imperative subjects such as `Add Homework 5...` and `Update Homework 5...`. Follow that style: `Add custom MCP server` or `Update run instructions`.

Pull requests should include a brief summary, relevant setup notes, and updated screenshots when MCP behavior or configuration changes.

## Security & Configuration Tips

Do not commit API tokens, Jira credentials, or private local paths. Use environment variables for secrets, and keep screenshots free of sensitive ticket details beyond allowed identifiers.
