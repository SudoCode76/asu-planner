type LatLon = [number, number]

type OsrmRouteResponse = {
  code?: string
  message?: string
  routes?: Array<{
    geometry?: {
      coordinates?: [number, number][]
    }
  }>
}

const OSRM_BASE_URL = "https://router.project-osrm.org/route/v1/driving"

export const dynamic = "force-dynamic"

function isLatLon(value: unknown): value is LatLon {
  if (!Array.isArray(value) || value.length !== 2) return false

  const [lat, lon] = value

  return (
    typeof lat === "number" &&
    typeof lon === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  )
}

function buildOsrmUrl(points: LatLon[]) {
  const coordinates = points
    .map(([lat, lon]) => `${lon.toFixed(6)},${lat.toFixed(6)}`)
    .join(";")

  return `${OSRM_BASE_URL}/${coordinates}?geometries=geojson&overview=full&steps=false&generate_hints=false`
}

function toLeafletPath(coordinates: [number, number][]): LatLon[] {
  return coordinates.map(([lon, lat]) => [lat, lon])
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { points?: unknown }
    const points = body.points

    if (!Array.isArray(points) || points.length < 2 || points.length > 25 || !points.every(isLatLon)) {
      return Response.json(
        { error: "Solicitud invalida: se requieren entre 2 y 25 puntos [lat, lon].", source: "fallback" },
        { status: 400 }
      )
    }

    const response = await fetch(buildOsrmUrl(points), {
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    })

    if (!response.ok) {
      return Response.json(
        { error: `OSRM HTTP ${response.status}; usando trazado aproximado.`, source: "fallback" },
        { status: 502 }
      )
    }

    const data = await response.json() as OsrmRouteResponse
    const coordinates = data.routes?.[0]?.geometry?.coordinates

    if (data.code !== "Ok" || !coordinates?.length) {
      return Response.json(
        { error: `OSRM ${data.code ?? "NoRoute"}: ${data.message ?? "sin geometria disponible"}.`, source: "fallback" },
        { status: 502 }
      )
    }

    return Response.json({ path: toLeafletPath(coordinates), source: "osrm" })
  } catch (error) {
    const message = error instanceof Error ? error.message : "fallo de red"

    return Response.json(
      { error: `OSRM no disponible: ${message}.`, source: "fallback" },
      { status: 502 }
    )
  }
}
