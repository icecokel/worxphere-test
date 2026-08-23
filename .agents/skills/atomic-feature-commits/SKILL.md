---
name: atomic-feature-commits
description: Apply when implementing a feature or preparing a commit in this repository. Keep one feature per commit, record the matching AI prompt and verification in PROMPTS.md, and preserve the commit history without squash or force-push.
---

# Atomic Feature Commits

For each feature:

1. Choose one kebab-case feature key before implementation, such as `stage-move`.
2. Keep the implementation and its directly related tests or documentation in one commit. Separate unrelated behavior.
3. Add or update the matching `## [feature-key]` section in `PROMPTS.md` with:
   - the actual prompt,
   - a summary of the AI output,
   - the actual review and verification performed.
4. Use the same key in behavioral commit subjects, for example `feat(stage-move): 카드 단계 이동 추가`.
5. Do not squash the history or use force-push. Preserve correction commits when they show the verification process.

Git hooks verify the feature key and prompt-log structure. They cannot determine whether a commit contains exactly one semantic feature or whether a review is truthful; check those points before committing.
