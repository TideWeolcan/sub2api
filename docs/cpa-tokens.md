# CPA Design Tokens

Source: `CPA-Manager-Plus/apps/web/src/styles/{variables,themes}.scss` → `frontend/src/styles/cpa-tokens.css`

## Principle

- No SCSS build chain. Tokens ship as plain CSS variables (`--cpa-*`) imported by `src/style.css` before Tailwind layers.
- The existing Teal `primary: #14b8a6` palette is preserved. CPA tokens are **additive** under the `cpa` / `cpa-*` namespace.

## Files

- `frontend/src/styles/cpa-tokens.css` — light defaults on `:root`, dark overrides on `.dark, [data-theme='dark']`. Includes palettes, app shell, sidebar, glass, badge, spacing/radius/shadow/transition/z-index.
- `frontend/tailwind.config.js` — `theme.extend` additions:
  - `colors.cpa`, `colors.cpa-{blue,green,amber,red,violet,cyan,teal,slate}` (var-backed),
  - `borderRadius.cpa-*`, `boxShadow.cpa-*`, `spacing.cpa-*` — all var-backed so dark remaps automatically.

## Usage

```html
<!-- Tailwind token colors -->
<div class="bg-cpa-surface text-cpa-text-primary border-cpa-border" />
<div class="bg-cpa-blue text-cpa-green-900" />
<div class="rounded-cpa-lg shadow-cpa-md p-cpa-card" />

<!-- Raw CSS vars (when Tailwind class is awkward) -->
<div :style="{ background: 'var(--cpa-app-bg-gradient)' }" />
```

## Notes

- Dark mode listens to `.dark` (sub2api convention) and `[data-theme='dark']` for CPA compat.
- `variables.scss` scalar tokens (spacing/radius/shadow/transition/breakpoints) are lowercased into `--cpa-*` vars and mirrored in Tailwind `spacing`/`borderRadius`/`boxShadow`.
- `themes.scss` app-surface / badge / data-palette tokens are ported 1:1 with the `--cpa-` prefix. Light tints become translucent tints in dark via the dark override block.
