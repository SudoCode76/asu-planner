type LatLon = [number, number]

type MapboxDirectionsResponse = {
  code?: string
  message?: string
  routes?: Array<{
    geometry?: {
      coordinates?: [number, number][]
    }
  }>
}

const MAPBOX_BASE_URL = "https://api.mapbox.com/directions/v5/mapbox/driving"

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

function buildMapboxUrl(points: LatLon[], accessToken: string) {
  const coordinates = points
    .map(([lat, lon]) => `${lon.toFixed(6)},${lat.toFixed(6)}`)
    .join(";")
  const params = new URLSearchParams({
    access_token: accessToken,
    alternatives: "false",
    geometries: "geojson",
    overview: "full",
    steps: "false",
  })

  return `${MAPBOX_BASE_URL}/${coordinates}?${params.toString()}`
}

function toLeafletPath(coordinates: [number, number][]): LatLon[] {
  return coordinates.map(([lon, lat]) => [lat, lon])
}

function getMapboxAccessToken() {
  return process.env.MAPBOX_ACCESS_TOKEN ?? process.env.NEXT_PUBLIC_MAPBOX_TOKEN
}

export async function GET() {
  return Response.json({
    configured: Boolean(getMapboxAccessToken()),
    provider: "mapbox",
  })
}

export async function POST(request: Request) {
  try {
    const accessToken = getMapboxAccessToken()

    if (!accessToken) {
      return Response.json(
        { error: "MAPBOX_ACCESS_TOKEN o NEXT_PUBLIC_MAPBOX_TOKEN no configurado; usando fallback local.", source: "fallback" },
        { status: 503 }
      )
    }

    const body = await request.json() as { points?: unknown }
    const points = body.points

    if (!Array.isArray(points) || points.length < 2 || points.length > 25 || !points.every(isLatLon)) {
      return Response.json(
        { error: "Solicitud invalida: se requieren entre 2 y 25 puntos [lat, lon].", source: "fallback" },
        { status: 400 }
      )
    }

    const response = await fetch(buildMapboxUrl(points, accessToken), {
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    })

    if (!response.ok) {
      return Response.json(
        { error: `Mapbox HTTP ${response.status}; usando fallback local.`, source: "fallback" },
        { status: 502 }
      )
    }

    const data = await response.json() as MapboxDirectionsResponse
    const coordinates = data.routes?.[0]?.geometry?.coordinates

    if (data.code !== "Ok" || !coordinates?.length) {
      return Response.json(
        { error: `Mapbox ${data.code ?? "NoRoute"}: ${data.message ?? "sin geometria disponible"}.`, source: "fallback" },
        { status: 502 }
      )
    }

    return Response.json({ path: toLeafletPath(coordinates), source: "mapbox" })
  } catch (error) {
    const message = error instanceof Error ? error.message : "fallo de red"

    return Response.json(
      { error: `Mapbox no disponible: ${message}.`, source: "fallback" },
      { status: 502 }
    )
  }
}
