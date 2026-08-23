---
name: shared-ui-first
description: Apply when creating or modifying UI in this repository. Reuse an existing shared component first, then prefer an applicable shadcn/ui component, and create a new component only when neither fits.
---

# Shared UI First

When implementing UI, choose components in this order:

1. Search for and reuse an existing shared component that satisfies the requirement.
2. If none fits, check shadcn/ui and use or add an applicable component.
3. Create a new component only when neither option satisfies the requirement.

Do not force an existing component to serve behavior it was not designed to support.
