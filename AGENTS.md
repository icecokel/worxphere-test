<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project Workflow Rules

- Choose one kebab-case `feature-key` before implementing a feature.
- Keep one feature and its directly related tests or documentation in one commit. Separate unrelated behavior.
- Add or update the matching `## [feature-key]` section in `PROMPTS.md` in the same commit. Record the actual prompt, AI output summary, and actual review or verification.
- Use the same key in behavioral commit subjects: `type(feature-key): Korean summary`.
- Do not squash commits or use force-push. Preserve correction commits that show the verification process.
- Keep `.githooks` enabled. Hooks enforce the prompt-log structure and block non-fast-forward pushes; the agent remains responsible for semantic feature boundaries and truthful review notes.
