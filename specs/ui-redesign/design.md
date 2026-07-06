# Design: daisyUI HTML Dashboard Style

## Reusable Design Profile

1. Aesthetic Direction: Industrial/utilitarian workspace。参考 `https://html-dashboard.daisyui.com/tools/export` 的 daisyUI 后台模板：左侧 drawer 导航、右侧白色主画布、顶部全局栏、页面面包屑工具栏、灰色功能卡片、高密度表格与表单。
2. Color Palette: page gray `#F6F7FB`, surface white `#FFFFFF`, border gray `#E5E7EB`, text black `#111827`, primary blue `#2563EB`, accent teal `#14B8A6`, warning orange `#F59E0B`, error red `#DC2626`.
3. Typography: `Outfit`-style sans for headings and controls, `Noto Sans SC` / `PingFang SC` / `Microsoft YaHei` for Chinese fallback, monospace only for dates, IDs, redirect URIs, counts, and technical values.
4. Layout Strategy: Admin pages use a daisyUI `drawer lg:drawer-open` shell. The drawer side owns persistent navigation; the drawer content is a white application canvas with a rounded top-left corner and a border like the reference page. Admin pages then use a daisyUI `navbar`, `breadcrumbs`, and compact content sections. The front mailbox workspace does not use breadcrumb navigation.
5. Reuse Boundary: This document describes reusable layout, component, and interaction rules only. Do not include one-off product mission statements or deployment goals in this design profile.

## Reference Page Summary

The daisyUI HTML Dashboard export page establishes these rules:

- Global shell: `drawer lg:drawer-open` places the sidebar outside the main page canvas.
- Main canvas: `drawer-content bg-base-100` contrasts with the sidebar/page gray and uses a strong desktop container shape.
- Header: first row is a `navbar`-style utility bar with drawer toggle, page title, search, theme/profile/notification actions.
- Page toolbar: second row uses `breadcrumbs` and a small right-side action button.
- Work panels: content sections use `card bg-base-200 shadow-sm`; the card itself is the work surface, not a nested decorative frame.
- Navigation: sidebar uses daisyUI `menu`, grouped entries, icons, and a sticky account/logout area.
- Data density: tables, checkboxes, selects, badges, and steps are compact and directly operational.
- Motion: no decorative hero motion; only small transitions and native component states.

## daisyUI Component Contract

Before creating or restyling UI, check whether daisyUI already provides the component. Do not build local equivalents of these primitives:

- App shell: use `drawer`, `drawer-toggle`, `drawer-content`, `drawer-side`, `drawer-overlay`, `drawer-button`.
- Top bar: use `navbar`, `btn`, `input`, `indicator`, `dropdown`, `menu`, `avatar`.
- Sidebar: use `menu`, `badge`, `btn`, `dropdown`.
- Page navigation: use `breadcrumbs` on admin pages only.
- Main work areas: use `card`, `card-body`, `card-title`.
- Metrics: use `stats`, `stat`, `stat-title`, `stat-value`, `stat-desc`.
- Data lists: use `table`, `table-zebra`, `table-pin-rows`, `overflow-x-auto`.
- Forms: use `fieldset`, `fieldset-legend`, `input`, `select`, `checkbox`, `toggle`, `label`.
- Status: use `alert`, `badge`, `status`, `loading`.
- Process indicators: use `steps`, `step`.
- Destructive/secondary actions: use daisyUI button variants such as `btn-error`, `btn-outline`, `btn-ghost`, `btn-square`, `btn-sm`.

Application-specific Vue components may remain only when they bind business data or emit domain actions, such as `InboxPanel`, `ProviderPanel`, or `AccountsPanel`. They must compose daisyUI primitives instead of recreating generic UI controls.

## Architecture

The redesign stays inside the frontend surface:

- `nuxt.config.ts` owns Tailwind v4's Vite plugin setup.
- `app/assets/css/main.css` owns Tailwind/daisyUI imports, the `matrixmail` daisyUI theme, and small global base rules only.
- `app/layouts/frontend.vue` owns the front mailbox workspace shell.
- `app/layouts/dashboard.vue` owns the authenticated admin drawer shell and sidebar.
- Pages select their shell with `definePageMeta({ layout: ... })` and must not duplicate layout wrappers.
- Component and page content use Tailwind v4 utilities plus daisyUI component classes directly in Vue templates.
- Existing pages keep their data-loading and mutation logic from `useMailboxManager`.
- Existing panel components keep props/emits so backend/API behavior remains unchanged.
- `app/components/bits/*` may remain as optional local animation primitives, but the primary layout must not depend on custom visual effects.

## Surface Boundaries

- Front workspace `/`: a mailbox work surface, not an admin page. It must not use the admin sidebar or breadcrumb navigation, and it should expose backend access only as a deliberate top-level action.
- Admin pages `/dashboard/*`: authenticated management surfaces. When the user is not signed in, these routes redirect to `/login` through the existing route middleware.
- Admin sidebar: contains only admin management routes. Do not include the front workspace or other non-admin entry points in the left menu.
- Login `/login`: a single-purpose login form with `layout: false`. Do not add secondary product explanation, access manifesto, or extra decorative panels.
- OAuth configuration `/dashboard/config`: creates and maintains provider OAuth settings only.
- Mail accounts `/dashboard/accounts`: connects Gmail/Outlook accounts after the corresponding OAuth provider configuration is complete.

## Theme Choices

- `base-100` is the main white application canvas.
- `base-200` is the sidebar/page gray and inner work card surface.
- `base-300` is the border and divider color.
- `primary` is used for selected states and primary actions.
- `accent` is reserved for secondary positive context.
- `warning/error/success/info` map to standard admin statuses.
- daisyUI radius variables stay at 6-8px to match the reference dashboard controls.

## Page And Component Plan

- Login: use a single compact daisyUI `card` login form. Preserve disabled login behavior and credential guidance; do not add secondary explanatory panels on the login screen.
- Mailbox workspace `/`: front workspace page. The main content prioritizes `InboxPanel` table and sticky `MessageDetailPanel`; admin-only wording and breadcrumb navigation are avoided.
- Dashboard overview `/dashboard`: use `stats` for counts, `card` for health/config summaries, and `EventsPanel` for recent events.
- Accounts `/dashboard/accounts`: manage connected accounts and expose provider connect actions. Show Gmail/Outlook connection options here, disabled until that provider's OAuth configuration is complete.
- Config `/dashboard/config`: use a create-first OAuth setup flow. Step 1 selects the mailbox type, Step 2 shows only fields required by that provider, and saved configurations are displayed as provider cards.
- Events `/dashboard/events`: use a dense daisyUI table/timeline-like event log inside a card.
- Rules: local mail rules are created per provider type. The rule form starts with a provider selector, and rule lists are grouped by provider.

## Data, API, And Security

- OAuth redirect logic, token encryption, and auth session semantics are not changed by the UI redesign.
- Admin route middleware remains responsible for redirecting unauthenticated `/dashboard/*` requests to `/login`.
- Provider redirect URI display remains visible on the config page.
- Automation rules include a provider type so Gmail and Outlook rules can be created, displayed, and applied independently.

## Accessibility And Responsiveness

- Preserve semantic buttons, links, labels, tables, forms, and headings.
- Use visible text labels next to important actions.
- Use icons from `lucide-vue-next`; do not use emoji icons.
- Keep long emails, subjects, redirect URIs, and event messages truncated or wrapped inside their containers.
- Mobile uses drawer overlay navigation and single-column content.
- Desktop uses persistent drawer navigation and dense content grids.
- Avoid nested cards. Cards can contain form groups, tables, stats, and lists, but not other decorative cards.
- Use daisyUI `loading` instead of custom spinner UI when a loading indicator is needed.

## Verification

- Static check: run the project build after implementation.
- Runtime check: run the Nuxt dev server and smoke-test `/login`, `/`, `/dashboard`, `/dashboard/accounts`, `/dashboard/config`, and `/dashboard/events` when local credentials/session allow.
- Visual check: inspect desktop and mobile widths for overlapping controls, broken tables, unread/selected states, and empty states.
