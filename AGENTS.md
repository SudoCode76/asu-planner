<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# FiberMap ASU project rules

FiberMap ASU is a production web system for designing, evaluating, saving, comparing, and reporting aerial ASU fiber optic links between two map points.

## Current stack

- Framework: Next.js 16.2.6 App Router with React 19.2.4 and TypeScript strict mode.
- Styling: Tailwind CSS v4 through `app/globals.css`.
- UI system: shadcn/ui v4, `radix-nova` style, Radix primitives, Lucide icons.
- Backend: Supabase for Postgres, Auth, Row Level Security, and optionally Storage for report/map artifacts.
- Map: Leaflet + OpenStreetMap tiles unless a concrete requirement makes another provider necessary.
- Package manager: pnpm, because `pnpm-lock.yaml` and `pnpm-workspace.yaml` are present.

## Mandatory local research before code

- Before changing Next.js behavior, read the relevant file in `node_modules/next/dist/docs/`.
- For auth/session work, read Next.js `proxy` and authentication docs first. In Next.js 16, use `proxy.ts`, not legacy `middleware.ts`.
- For Supabase work, use the Supabase MCP tools first. Check docs with `search_docs`, inspect schema with MCP, and run advisors after schema/security changes.
- For shadcn work, use existing installed components first. If a needed component is missing, add it with the shadcn CLI and then inspect the generated file.

## Product scope

Implement the complete system, not placeholder demos:

- Dashboard with totals for designed, viable, critical, and non-viable links.
- Interactive map for selecting Point A and Point B, drawing the route, calculating geodesic distance, clearing/replacing points, and showing coordinates.
- Link data form: name, description, origin/destination labels, calculated distance, manual real cable distance override, cable type, fiber strand count, wavelength.
- Technical parameters form: transmitter power, receiver sensitivity, attenuation, splices, splice loss, connectors, connector loss, safety margin, fiber type.
- Optical budget calculation: distance loss, splice loss, connector loss, total loss, optical budget, final margin.
- Link evaluation: viable, critical, non-viable using final margin thresholds.
- Automatic recommendations per status.
- History: save, list, search, filter, detail, edit, delete, compare.
- Technical report: screen report and PDF export with general data, coordinates, map reference, parameters, calculations, status, and recommendations.
- User management: public email/password login plus Google login through Supabase Auth; each user owns their designs.

## Engineering rules

- Prefer Server Components for data reads and Server Actions or Route Handlers for mutations.
- Keep browser-only libraries such as Leaflet inside Client Components with dynamic boundaries as needed.
- Never trust client-side calculations for saved results. Recalculate optical results on the server before persisting.
- Persist both raw user inputs and calculated outputs so historical reports remain reproducible.
- Every public Supabase table must have RLS enabled with ownership policies based on `(select auth.uid()) = user_id`.
- Do not expose service-role keys in application code. Use publishable keys in `NEXT_PUBLIC_*` variables and server-only secrets only when strictly required.
- Keep UI composed from shadcn components. Custom components must follow shadcn style, tokens, variants, and accessibility patterns.
- Use semantic tokens (`bg-background`, `text-muted-foreground`, `border-border`) instead of hardcoded palette utilities unless there is a domain-specific reason.
- Use Lucide icons in action buttons where an icon exists.

## Useful project docs

- Product and architecture: `docs/FIBERMAP_ASU_CONTEXT.md`
- Supabase data model plan: `docs/SUPABASE_DATA_MODEL.md`
- Implementation roadmap: `docs/ROADMAP.md`
