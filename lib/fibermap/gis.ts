import { calculateDistanceKm, type Coordinate } from "@/lib/fibermap/calculations"
import type { Json } from "@/lib/database.types"

export type RoutePointKind = "endpoint_a" | "pole" | "splice" | "reserve" | "endpoint_b"

export type RoutePoint = Coordinate & {
  id: string
  label: string
  kind: RoutePointKind
}

export type GisLayer = {
  id: string
  name: string
  type: "geojson" | "kml" | "drawn"
  featureCount: number
  data: Json
}

export type MechanicalProfile = {
  name: string
  max_span_m: number
  reserve_percent: number
  cable_weight_n_per_m: number
  installation_tension_n: number
  max_tension_n: number
  max_sag_percent: number
}

export type RouteSpan = {
  index: number
  from_label: string
  to_label: string
  distance_km: number
  span_m: number
  estimated_sag_m: number
  sag_percent: number
  tension_utilization_percent: number
  warnings: string[]
}

export type RouteAnalysis = {
  points: RoutePoint[]
  spans: RouteSpan[]
  total_distance_km: number
  reserve_length_km: number
  total_cable_length_km: number
  max_span_m: number
  warnings: string[]
  mechanical_profile: MechanicalProfile
}

export const DEFAULT_MECHANICAL_PROFILE: MechanicalProfile = {
  name: "ASU urbano configurable",
  max_span_m: 80,
  reserve_percent: 5,
  cable_weight_n_per_m: 0.25,
  installation_tension_n: 1200,
  max_tension_n: 2500,
  max_sag_percent: 3,
}

export function createRoutePoint(
  coordinate: Coordinate,
  kind: RoutePointKind,
  index: number
): RoutePoint {
  return {
    ...coordinate,
    id: `${kind}-${Date.now()}-${index}`,
    kind,
    label: labelForKind(kind, index),
  }
}

export function buildRoutePoints(
  pointA: Coordinate | null,
  intermediatePoints: RoutePoint[],
  pointB: Coordinate | null
) {
  const points: RoutePoint[] = []

  if (pointA) {
    points.push({ ...pointA, id: "endpoint-a", kind: "endpoint_a", label: "Punto A" })
  }

  intermediatePoints.forEach((point, index) => {
    points.push({
      ...point,
      kind: point.kind === "endpoint_a" || point.kind === "endpoint_b" ? "pole" : point.kind,
      label: point.label || labelForKind(point.kind, index + 1),
    })
  })

  if (pointB) {
    points.push({ ...pointB, id: "endpoint-b", kind: "endpoint_b", label: "Punto B" })
  }

  return points
}

export function analyzeRoute(
  points: RoutePoint[],
  profile: MechanicalProfile = DEFAULT_MECHANICAL_PROFILE
): RouteAnalysis {
  const spans: RouteSpan[] = []
  const warnings = new Set<string>()

  for (let index = 0; index < points.length - 1; index += 1) {
    const from = points[index]
    const to = points[index + 1]
    const distance_km = round(calculateDistanceKm(from, to), 4)
    const span_m = round(distance_km * 1000, 2)
    const estimated_sag_m = round(
      (profile.cable_weight_n_per_m * span_m ** 2) /
        Math.max(8 * profile.installation_tension_n, 1),
      2
    )
    const sag_percent = span_m > 0 ? round((estimated_sag_m / span_m) * 100, 2) : 0
    const tension_utilization_percent = round(
      (profile.installation_tension_n / Math.max(profile.max_tension_n, 1)) * 100,
      2
    )
    const spanWarnings: string[] = []

    if (span_m > profile.max_span_m) {
      spanWarnings.push(`Vano superior al maximo configurado (${profile.max_span_m} m).`)
    }

    if (sag_percent > profile.max_sag_percent) {
      spanWarnings.push(`Flecha estimada superior al ${profile.max_sag_percent}%.`)
    }

    if (tension_utilization_percent > 85) {
      spanWarnings.push("Tension de instalacion cercana al limite configurado.")
    }

    spanWarnings.forEach((warning) => warnings.add(warning))

    spans.push({
      index: index + 1,
      from_label: from.label,
      to_label: to.label,
      distance_km,
      span_m,
      estimated_sag_m,
      sag_percent,
      tension_utilization_percent,
      warnings: spanWarnings,
    })
  }

  const total_distance_km = round(
    spans.reduce((total, span) => total + span.distance_km, 0),
    4
  )
  const reserve_length_km = round(total_distance_km * (profile.reserve_percent / 100), 4)
  const total_cable_length_km = round(total_distance_km + reserve_length_km, 4)
  const max_span_m = spans.length
    ? Math.max(...spans.map((span) => span.span_m))
    : 0

  if (points.length < 2) {
    warnings.add("Ruta incompleta: define al menos Punto A y Punto B.")
  }

  if (spans.length === 1) {
    warnings.add("Ruta sin postes intermedios; validar recorrido real en campo.")
  }

  warnings.add("Analisis mecanico estimado; requiere validacion de campo y parametros certificados.")

  return {
    points,
    spans,
    total_distance_km,
    reserve_length_km,
    total_cable_length_km,
    max_span_m,
    warnings: Array.from(warnings),
    mechanical_profile: profile,
  }
}

export function parseRoutePoints(value: unknown): RoutePoint[] {
  return parseJsonArray<RoutePoint>(value)
}

export function parseGisLayers(value: unknown): GisLayer[] {
  return parseJsonArray<GisLayer>(value)
}

export function parseMechanicalProfile(value: unknown): MechanicalProfile {
  if (!value) return DEFAULT_MECHANICAL_PROFILE

  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value
    return {
      ...DEFAULT_MECHANICAL_PROFILE,
      ...(parsed && typeof parsed === "object" ? parsed : {}),
    }
  } catch {
    return DEFAULT_MECHANICAL_PROFILE
  }
}

function parseJsonArray<T>(value: unknown): T[] {
  if (!value) return []

  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

function labelForKind(kind: RoutePointKind, index: number) {
  const labels: Record<RoutePointKind, string> = {
    endpoint_a: "Punto A",
    pole: `Poste ${index}`,
    splice: `Empalme ${index}`,
    reserve: `Reserva ${index}`,
    endpoint_b: "Punto B",
  }

  return labels[kind]
}

function round(value: number, decimals: number) {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}
