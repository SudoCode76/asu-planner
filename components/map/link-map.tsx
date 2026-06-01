"use client"

import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react"
import { DomEvent, LatLngBounds } from "leaflet"
import { LocateFixedIcon, RouteIcon, SearchIcon } from "lucide-react"
import { CircleMarker, GeoJSON } from "react-leaflet"
import { MapContainer, Polyline, Popup, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Coordinate } from "@/lib/fibermap/calculations"
import type { GisLayer, RoutePoint } from "@/lib/fibermap/gis"

const DEFAULT_CENTER: [number, number] = [-17.7833, -63.1821]

type SearchResult = {
  place_id: number
  display_name: string
  lat: string
  lon: string
  address?: {
    road?: string
    neighbourhood?: string
    suburb?: string
    city?: string
    town?: string
    village?: string
    municipality?: string
    state?: string
    country?: string
  }
}

type MapMode = "select" | "pole" | "measure" | "inspect"

type MapboxFeature = {
  id: string
  full_address?: string
  place_formatted?: string
  name?: string
  properties?: {
    name?: string
    full_address?: string
    place_formatted?: string
  }
  geometry: {
    coordinates: [number, number]
  }
}

function MapClickHandler({
  pointA,
  pointB,
  mode,
  routePoints,
  onChange,
  onRoutePointsChange,
}: {
  pointA: Coordinate | null
  pointB: Coordinate | null
  mode: MapMode
  routePoints: RoutePoint[]
  onChange: (pointA: Coordinate | null, pointB: Coordinate | null) => void
  onRoutePointsChange: (points: RoutePoint[]) => void
}) {
  useMapEvents({
    click(event) {
      const nextPoint = {
        lat: Number(event.latlng.lat.toFixed(6)),
        lng: Number(event.latlng.lng.toFixed(6)),
      }

      if (mode === "pole") {
        onRoutePointsChange([
          ...routePoints,
          {
            ...nextPoint,
            id: `pole-${Date.now()}`,
            kind: "pole",
            label: `Poste ${routePoints.length + 1}`,
          },
        ])
        return
      }

      if (mode !== "select") {
        return
      }

      if (!pointA || (pointA && pointB)) {
        onChange(nextPoint, null)
        return
      }

      onChange(pointA, nextPoint)
    },
  })

  return null
}

function MapViewport({
  pointA,
  pointB,
}: {
  pointA: Coordinate | null
  pointB: Coordinate | null
}) {
  const map = useMap()

  useEffect(() => {
    map.invalidateSize()

    const timeouts = [100, 350, 700].map((delay) =>
      window.setTimeout(() => {
        map.invalidateSize()
      }, delay)
    )

    return () => {
      timeouts.forEach((timeout) => window.clearTimeout(timeout))
    }
  }, [map])

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      map.invalidateSize()
    })

    observer.observe(map.getContainer())

    return () => observer.disconnect()
  }, [map])

  useEffect(() => {
    if (pointA && pointB) {
      const bounds = new LatLngBounds(
        [pointA.lat, pointA.lng],
        [pointB.lat, pointB.lng]
      )

      map.fitBounds(bounds, {
        animate: true,
        maxZoom: 16,
        padding: [48, 48],
      })
      return
    }

    if (pointA) {
      map.flyTo([pointA.lat, pointA.lng], Math.max(map.getZoom(), 14), {
        animate: true,
        duration: 0.5,
      })
    }
  }, [map, pointA, pointB])

  return null
}

function MapTools({
  pointA,
  pointB,
  onFocusedLocationChange,
  onSuggestedRoute,
}: {
  pointA: Coordinate | null
  pointB: Coordinate | null
  onFocusedLocationChange: (location: Coordinate | null) => void
  onSuggestedRoute: (points: RoutePoint[]) => void
}) {
  const map = useMap()
  const containerRef = useRef<HTMLDivElement>(null)
  const activeActionRef = useRef<"locate" | "search" | "result" | null>(null)
  const locateRequestRef = useRef(0)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLocating, setIsLocating] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isRouting, setIsRouting] = useState(false)
  const [searchMessage, setSearchMessage] = useState<string | null>(null)
  const [locationMessage, setLocationMessage] = useState<string | null>(null)

  useEffect(() => {
    const container = containerRef.current

    if (!container) {
      return
    }

    DomEvent.disableClickPropagation(container)
    DomEvent.disableScrollPropagation(container)
  }, [])

  function focusLocation(location: Coordinate, zoom = 16) {
    onFocusedLocationChange(location)
    map.flyTo([location.lat, location.lng], zoom, {
      animate: true,
      duration: 0.7,
    })
  }

  function locateUser() {
    if (!navigator.geolocation) {
      activeActionRef.current = "locate"
      setLocationMessage("Tu navegador no permite geolocalizacion.")
      return
    }

    activeActionRef.current = "locate"
    const locateRequest = locateRequestRef.current + 1
    locateRequestRef.current = locateRequest
    setIsLocating(true)
    setLocationMessage(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (activeActionRef.current !== "locate" || locateRequestRef.current !== locateRequest) {
          return
        }

        setIsLocating(false)
        setSearchMessage(null)
        setLocationMessage(null)
        focusLocation(
          {
            lat: Number(position.coords.latitude.toFixed(6)),
            lng: Number(position.coords.longitude.toFixed(6)),
          },
          17
        )
      },
      () => {
        if (activeActionRef.current !== "locate" || locateRequestRef.current !== locateRequest) {
          return
        }

        setIsLocating(false)
        setLocationMessage("No se pudo obtener tu ubicacion.")
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60000,
        timeout: 10000,
      }
    )
  }

  async function searchLocation() {
    const trimmedQuery = query.trim()

    activeActionRef.current = "search"
    locateRequestRef.current += 1
    setIsLocating(false)
    setLocationMessage(null)

    if (trimmedQuery.length < 3) {
      setSearchMessage("Escribe al menos 3 caracteres para buscar.")
      return
    }

    setIsSearching(true)
    setSearchMessage(null)

    try {
      const nextResults = await searchNearby(trimmedQuery)
      setResults(nextResults)
      setSearchMessage(nextResults.length ? null : "No se encontraron resultados.")
    } catch {
      setSearchMessage("No se pudo buscar la ubicacion.")
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }

  async function fetchSearch(params: URLSearchParams) {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: {
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      throw new Error("Search failed")
    }

    return (await response.json()) as SearchResult[]
  }

  async function searchNearby(trimmedQuery: string) {
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    const bounds = map.getBounds()
    const center = map.getCenter()

    if (mapboxToken) {
      const bbox = [
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth(),
      ].join(",")
      const params = new URLSearchParams({
        q: trimmedQuery,
        access_token: mapboxToken,
        limit: "8",
        language: "es",
        country: "bo",
        proximity: `${center.lng},${center.lat}`,
        bbox,
      })
      const response = await fetch(`https://api.mapbox.com/search/geocode/v6/forward?${params.toString()}`)

      if (!response.ok) {
        throw new Error("Mapbox search failed")
      }

      const payload = (await response.json()) as { features?: MapboxFeature[] }
      return (payload.features ?? []).map((feature) => ({
        place_id: Number(feature.id.replace(/\D/g, "").slice(0, 12)) || Date.now(),
        display_name: feature.full_address ?? feature.place_formatted ?? feature.name ?? "Resultado",
        lat: String(feature.geometry.coordinates[1]),
        lon: String(feature.geometry.coordinates[0]),
        address: {
          road: feature.properties?.name ?? feature.name,
          city: feature.properties?.place_formatted,
          country: "Bolivia",
        },
      }))
    }

    const viewbox = [
      bounds.getWest(),
      bounds.getNorth(),
      bounds.getEast(),
      bounds.getSouth(),
    ].join(",")

    const localResults = await fetchSearch(
      new URLSearchParams({
        q: trimmedQuery,
        format: "jsonv2",
        limit: "8",
        addressdetails: "1",
        dedupe: "1",
        viewbox,
        bounded: "1",
      })
    )

    if (localResults.length) {
      return localResults
    }

    const countryResults = await fetchSearch(
      new URLSearchParams({
        q: trimmedQuery,
        format: "jsonv2",
        limit: "8",
        addressdetails: "1",
        dedupe: "1",
        countrycodes: "bo",
        viewbox,
        bounded: "0",
      })
    )

    if (countryResults.length) {
      return countryResults
    }

    return fetchSearch(
      new URLSearchParams({
        q: trimmedQuery,
        format: "jsonv2",
        limit: "8",
        addressdetails: "1",
        dedupe: "1",
      })
    )
  }

  async function suggestRoute() {
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

    if (!pointA || !pointB) {
      setSearchMessage("Define Punto A y Punto B para sugerir una ruta.")
      return
    }

    if (!mapboxToken) {
      setSearchMessage("Configura NEXT_PUBLIC_MAPBOX_TOKEN para rutas sugeridas con Mapbox.")
      return
    }

    setIsRouting(true)
    setSearchMessage(null)

    try {
      const coords = `${pointA.lng},${pointA.lat};${pointB.lng},${pointB.lat}`
      const params = new URLSearchParams({
        access_token: mapboxToken,
        geometries: "geojson",
        overview: "full",
        alternatives: "false",
      })
      const response = await fetch(`https://api.mapbox.com/directions/v5/mapbox/walking/${coords}?${params.toString()}`)

      if (!response.ok) {
        throw new Error("Mapbox directions failed")
      }

      const payload = (await response.json()) as {
        routes?: { geometry?: { coordinates?: [number, number][] } }[]
      }
      const coordinates = payload.routes?.[0]?.geometry?.coordinates ?? []
      const sampled = sampleCoordinates(coordinates, 10)

      onSuggestedRoute(
        sampled.map(([lng, lat], index) => ({
          id: `suggested-pole-${Date.now()}-${index}`,
          label: `Poste sugerido ${index + 1}`,
          kind: "pole",
          lat: Number(lat.toFixed(6)),
          lng: Number(lng.toFixed(6)),
        }))
      )
      setSearchMessage("Ruta sugerida cargada como postes intermedios de referencia.")
    } catch {
      setSearchMessage("No se pudo obtener ruta sugerida de Mapbox.")
    } finally {
      setIsRouting(false)
    }
  }

  function searchOnEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault()
      void searchLocation()
    }
  }

  function selectResult(result: SearchResult) {
    activeActionRef.current = "result"
    locateRequestRef.current += 1

    const location = {
      lat: Number(Number(result.lat).toFixed(6)),
      lng: Number(Number(result.lon).toFixed(6)),
    }

    focusLocation(location)
    setQuery(result.display_name)
    setResults([])
    setSearchMessage(null)
    setLocationMessage(null)
  }

  return (
    <div ref={containerRef} className="absolute left-3 right-3 top-3 z-[1000] flex flex-col gap-2 md:right-auto md:w-[420px]">
      <div className="flex gap-2 rounded-lg border bg-background/95 p-2 shadow-sm">
        <Input
          value={query}
          onChange={(event) => {
            const nextQuery = event.target.value

            activeActionRef.current = "search"
            locateRequestRef.current += 1
            setLocationMessage(null)
            setQuery(nextQuery)

            if (!nextQuery.trim()) {
              setResults([])
              setSearchMessage(null)
              onFocusedLocationChange(null)
            }
          }}
          onKeyDown={searchOnEnter}
          placeholder="Buscar direccion o lugar"
          aria-label="Buscar direccion o lugar"
          className="min-w-0"
        />
        <Button
          type="button"
          size="icon"
          variant="secondary"
          disabled={isSearching}
          aria-label="Buscar ubicacion"
          onClick={() => void searchLocation()}
        >
          <SearchIcon />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={locateUser}
          disabled={isLocating}
          aria-label="Ir a mi ubicacion actual"
        >
          <LocateFixedIcon />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={() => void suggestRoute()}
          disabled={isRouting || !pointA || !pointB}
          aria-label="Sugerir ruta con Mapbox"
        >
          <RouteIcon />
        </Button>
      </div>

      {searchMessage || locationMessage ? (
        <div className="rounded-lg border bg-background/95 px-3 py-2 text-xs text-muted-foreground shadow-sm">
          {searchMessage ?? locationMessage}
        </div>
      ) : null}

      {results.length ? (
        <div className="max-h-56 overflow-auto rounded-lg border bg-background/95 p-1 shadow-sm">
          {results.map((result) => (
            <button
              key={result.place_id}
              type="button"
              onClick={() => selectResult(result)}
              className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
            >
              <span className="block font-medium">{formatPrimaryResult(result)}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {formatSecondaryResult(result)}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function sampleCoordinates(coordinates: [number, number][], maxPoints: number) {
  if (coordinates.length <= 2) return []

  const middle = coordinates.slice(1, -1)
  if (middle.length <= maxPoints) return middle

  const step = middle.length / maxPoints
  return Array.from({ length: maxPoints }, (_, index) => middle[Math.floor(index * step)])
}

function formatPrimaryResult(result: SearchResult) {
  return result.address?.road ?? result.display_name.split(",")[0] ?? "Resultado"
}

function formatSecondaryResult(result: SearchResult) {
  const address = result.address

  if (!address) {
    return result.display_name
  }

  return [
    address.neighbourhood,
    address.suburb,
    address.city ?? address.town ?? address.village ?? address.municipality,
    address.state,
    address.country,
  ]
    .filter(Boolean)
    .join(", ") || result.display_name
}

export function LinkMap({
  pointA,
  pointB,
  mode = "select",
  routePoints = [],
  gisLayers = [],
  onChange,
  onRoutePointsChange,
}: {
  pointA: Coordinate | null
  pointB: Coordinate | null
  mode?: MapMode
  routePoints?: RoutePoint[]
  gisLayers?: GisLayer[]
  onChange: (pointA: Coordinate | null, pointB: Coordinate | null) => void
  onRoutePointsChange?: (points: RoutePoint[]) => void
}) {
  const [focusedLocation, setFocusedLocation] = useState<Coordinate | null>(null)
  const center = useMemo<[number, number]>(
    () => (pointA ? [pointA.lat, pointA.lng] : DEFAULT_CENTER),
    [pointA]
  )
  const status = pointA && pointB
    ? "Enlace definido"
    : pointA
      ? "Selecciona Punto B"
      : "Selecciona Punto A"
  const routeLine = [
    ...(pointA ? [[pointA.lat, pointA.lng] as [number, number]] : []),
    ...routePoints.map((point) => [point.lat, point.lng] as [number, number]),
    ...(pointB ? [[pointB.lat, pointB.lng] as [number, number]] : []),
  ]
  const safeOnRoutePointsChange = onRoutePointsChange ?? (() => {})

  return (
    <div className="relative h-[420px] w-full min-w-0">
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom
        className="h-full w-full rounded-lg bg-background"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapViewport pointA={pointA} pointB={pointB} />
        <MapClickHandler
          pointA={pointA}
          pointB={pointB}
          mode={mode}
          routePoints={routePoints}
          onChange={onChange}
          onRoutePointsChange={safeOnRoutePointsChange}
        />
        <MapTools
          pointA={pointA}
          pointB={pointB}
          onFocusedLocationChange={setFocusedLocation}
          onSuggestedRoute={safeOnRoutePointsChange}
        />
        {gisLayers.map((layer) => (
          <GeoJSON key={layer.id} data={layer.data as never} />
        ))}
        {focusedLocation ? (
          <CircleMarker
            center={[focusedLocation.lat, focusedLocation.lng]}
            radius={7}
            pathOptions={{ color: "#2563eb", fillOpacity: 0.75 }}
          >
            <Popup>Ubicacion enfocada</Popup>
          </CircleMarker>
        ) : null}
        {pointA ? (
          <CircleMarker
            center={[pointA.lat, pointA.lng]}
            radius={9}
            pathOptions={{ color: "#111827", fillOpacity: 0.85 }}
          >
            <Popup>Punto A</Popup>
          </CircleMarker>
        ) : null}
        {routePoints.map((point, index) => (
          <CircleMarker
            key={point.id}
            center={[point.lat, point.lng]}
            radius={7}
            pathOptions={{ color: "#ca8a04", fillOpacity: 0.85 }}
          >
            <Tooltip>{point.label || `Poste ${index + 1}`}</Tooltip>
            <Popup>{point.label || `Poste ${index + 1}`}</Popup>
          </CircleMarker>
        ))}
        {pointB ? (
          <CircleMarker
            center={[pointB.lat, pointB.lng]}
            radius={9}
            pathOptions={{ color: "#dc2626", fillOpacity: 0.85 }}
          >
            <Popup>Punto B</Popup>
          </CircleMarker>
        ) : null}
        {routeLine.length >= 2 ? (
          <Polyline
            positions={routeLine}
            pathOptions={{ color: "#111827", weight: 4 }}
          />
        ) : null}
      </MapContainer>
      <div className="pointer-events-none absolute bottom-3 left-3 z-[1000] rounded-md border bg-background/95 px-3 py-2 text-sm font-medium shadow-sm">
        {status}
      </div>
    </div>
  )
}
