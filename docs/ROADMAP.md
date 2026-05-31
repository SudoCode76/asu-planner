# FiberMap ASU roadmap

## Phase 0 - foundation

- Keep project rules in `AGENTS.md`.
- Add `.env.local` using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Install runtime dependencies:
  - `@supabase/supabase-js`
  - `@supabase/ssr`
  - `leaflet`
  - `react-leaflet`
  - validation library, likely `zod`
  - report/PDF library after compatibility check
- Add shadcn components as needed, starting with layout, forms, data display, feedback, and dialogs.

## Phase 1 - Supabase auth and schema

- Create Supabase client helpers in `lib/supabase`.
- Add Next.js 16 `proxy.ts` for session refresh.
- Implement login/signup with email and Google OAuth.
- Create route handlers for email confirmation and OAuth callback.
- Create database schema with RLS:
  - `profiles`
  - `fiber_link_designs`
  - optional report exports later
- Verify with Supabase advisors.

## Phase 2 - domain engine

- Implement pure TypeScript calculation functions.
- Implement validation schemas for link data and technical parameters.
- Add unit-level checks for distance/status/calculation edge cases.
- Keep calculation versioning for saved designs.

## Phase 3 - application shell and dashboard

- Build authenticated app shell with sidebar/nav.
- Dashboard stats:
  - total designs
  - viable
  - critical
  - non-viable
- Quick actions:
  - new link design
  - history

## Phase 4 - link designer

- Build map client component with Leaflet + OpenStreetMap.
- Select Point A and Point B.
- Draw markers and polyline.
- Calculate approximate map distance.
- Allow clear/change points.
- Build link data and technical parameter forms.
- Show live calculation, evaluation, and recommendations.
- Save design through server-side recalculation.

## Phase 5 - history and detail

- List saved designs.
- Search by name.
- Filter by status.
- View details.
- Edit design.
- Delete design with confirmation.
- Compare selected designs.

## Phase 6 - reports

- Build screen report page.
- Include:
  - general data
  - Point A/B coordinates
  - map reference
  - distance
  - technical parameters
  - losses
  - optical budget
  - final margin
  - status
  - recommendations
- Export PDF.

## Phase 7 - polish and release hardening

- Accessibility pass.
- Responsive layout pass.
- Empty/loading/error states.
- Auth edge cases.
- Supabase RLS verification.
- Build/lint/test.
- Production environment checklist.
