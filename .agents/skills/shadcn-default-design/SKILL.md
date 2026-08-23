---
name: shadcn-default-design
description: Apply when implementing or reviewing UI in this repository. Treat design as a supporting concern, actively use shadcn/ui's base-nova neutral defaults, and preserve the existing visual style instead of introducing custom art direction.
---

# Shadcn Default Design

Keep UI implementation consistent with the project's existing shadcn/ui setup. Functional requirements and screen structure take precedence over custom visual design.

## Project baseline

- Use the `base-nova` style, `neutral` base color, CSS variables, and Lucide icons configured in `components.json`.
- Reuse semantic tokens from `src/app/globals.css`.
- Treat external product references as information-architecture references unless the requirements explicitly demand visual parity.

## UI decisions

1. Reuse an existing shared component when it fits.
2. Otherwise add and use the applicable shadcn/ui component.
3. Keep its default variant, size, radius, border, shadow, focus, and motion unless a documented requirement needs a change.
4. Create domain markup only when shadcn/ui has no applicable primitive.

## Constraints

- Do not add a custom palette, gradient, font, shadow system, radius system, animation language, or decorative component.
- Do not restyle generated shadcn/ui primitives globally for a single screen.
- Prefer `background`, `card`, `muted`, `secondary`, `border`, `primary`, and `destructive` tokens over raw color values.
- Use one-off Tailwind layout utilities only for documented layout dimensions and responsive behavior.
- Keep stage or status colors secondary to text labels; color must not be the only status signal.
- Preserve default focus states, labels, contrast, disabled states, and reduced-motion behavior.
- Avoid wrapper components that only rename a shadcn/ui component or freeze one unused variant.

If a requirement cannot be met with the current defaults, make the smallest local adjustment and record a new shared token or global style only when more than one UI needs it.

## Review check

- Existing shared and shadcn/ui components were checked before new markup was created.
- Generated component defaults remain recognizable and consistent.
- New raw colors or global visual values are absent unless explicitly justified.
- Layout and interaction match the requirements without extra visual features.
