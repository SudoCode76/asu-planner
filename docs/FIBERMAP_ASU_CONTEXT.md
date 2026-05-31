# FiberMap ASU context

## Purpose

FiberMap ASU is a georeferenced web system for designing and evaluating aerial fiber optic links, focused on ASU cable links. The user selects two points on a map, enters optical parameters, and the system calculates distance, optical losses, optical budget, final margin, technical viability, and recommendations.

This is intended as a complete public-use system, not a prototype.

## Technology decisions

- Next.js 16.2.6 App Router with React 19.2.4.
- TypeScript strict mode.
- Tailwind CSS v4, configured through `app/globals.css`.
- shadcn/ui v4 with `radix-nova` style, Radix primitives, and Lucide icons.
- Supabase for backend: Auth, Postgres, RLS, and possibly Storage.
- Leaflet + OpenStreetMap for maps because they are free, mature, and enough for point selection, polylines, and distance calculation.
- PDF reports should be generated from structured saved design data. Candidate libraries for a later pass: `@react-pdf/renderer`, server-side HTML-to-PDF, or a print-optimized report route. Choose after checking Next.js compatibility.

## Map choice

Leaflet + OpenStreetMap is a good default for this product:

- No paid API key for basic tiles.
- Strong ecosystem and stable API.
- Simple point selection, markers, lines, bounds, and distance workflows.
- Works well in a client-only island inside Next.js.

Possible alternatives only if requirements change:

- MapLibre GL JS with OpenStreetMap-compatible vector tiles: better for vector styling and large map UX, but tile hosting becomes the real question.
- OpenLayers: more powerful GIS features, heavier mental model.
- Google Maps/Mapbox: polished geocoding and routing options, but paid/API-key dependent and less aligned with the free requirement.

For now, keep Leaflet + OpenStreetMap.

## Core domain rules

Distance loss:

```text
fiber_loss_db = distance_km * attenuation_db_per_km
```

Splice loss:

```text
splice_loss_db = splice_count * splice_loss_db
```

Connector loss:

```text
connector_loss_db = connector_count * connector_loss_db
```

Total loss:

```text
total_loss_db = fiber_loss_db + splice_loss_db + connector_loss_db + safety_margin_db
```

Optical budget:

```text
optical_budget_db = transmitter_power_dbm - receiver_sensitivity_dbm
```

Final margin:

```text
final_margin_db = optical_budget_db - total_loss_db
```

Status:

```text
final_margin_db >= 3       => viable
0 <= final_margin_db < 3   => critical
final_margin_db < 0        => non_viable
```

## Suggested app structure

```text
app/
  (auth)/
    login/
    signup/
  (app)/
    dashboard/
    links/
      new/
      [id]/
      [id]/edit/
      compare/
    reports/
      [id]/
  auth/
    confirm/
    callback/
components/
  app-shell/
  auth/
  links/
  map/
  reports/
  ui/
lib/
  calculations/
  constants/
  supabase/
  validations/
```

## UI principles

- Use shadcn components first: Sidebar, Card, Table, Badge, Tabs, Field, Select, Input, Textarea, Dialog, AlertDialog, Sheet, Tooltip, Empty, Skeleton, Progress, Chart where needed.
- Build dense operational screens rather than marketing pages.
- The first screen after login should be the dashboard, with clear access to a new link design and history.
- The new design workflow should feel like a technical planning tool: map, parameters, results, recommendations, save/report actions.
- Status colors should be semantic and consistent: viable green, critical amber, non-viable red. Implement through design tokens or controlled variants, not scattered hardcoded colors.

## Auth direction

Use Supabase Auth with:

- Email/password.
- Google OAuth.
- Next.js 16 `proxy.ts` session refresh using `@supabase/ssr`.
- Server-side authorization with `supabase.auth.getUser()`.
- RLS on all user-owned data.

Required environment variables:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Google OAuth also requires dashboard configuration in Supabase and Google Cloud. Keep provider secrets out of the client.
