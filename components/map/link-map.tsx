"use client"

import { useEffect, useMemo } from "react"
import { LatLngBounds } from "leaflet"
import { CircleMarker } from "react-leaflet"
import { MapContainer, Polyline, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet"

import type { Coordinate } from "@/lib/fibermap/calculations"

const DEFAULT_CENTER: [number, number] = [-17.7833, -63.1821]

function MapClickHandler({
  pointA,
  pointB,
  onChange,
}: {
  pointA: Coordinate | null
  pointB: Coordinate | null
  onChange: (pointA: Coordinate | null, pointB: Coordinate | null) => void
}) {
  useMapEvents({
    click(event) {
      const nextPoint = {
        lat: Number(event.latlng.lat.toFixed(6)),
        lng: Number(event.latlng.lng.toFixed(6)),
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

export function LinkMap({
  pointA,
  pointB,
  onChange,
}: {
  pointA: Coordinate | null
  pointB: Coordinate | null
  onChange: (pointA: Coordinate | null, pointB: Coordinate | null) => void
}) {
  const center = useMemo<[number, number]>(
    () => (pointA ? [pointA.lat, pointA.lng] : DEFAULT_CENTER),
    [pointA]
  )
  const status = pointA && pointB
    ? "Enlace definido"
    : pointA
      ? "Selecciona Punto B"
      : "Selecciona Punto A"

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
        <MapClickHandler pointA={pointA} pointB={pointB} onChange={onChange} />
        {pointA ? (
          <CircleMarker
            center={[pointA.lat, pointA.lng]}
            radius={9}
            pathOptions={{ color: "#111827", fillOpacity: 0.85 }}
          >
            <Popup>Punto A</Popup>
          </CircleMarker>
        ) : null}
        {pointB ? (
          <CircleMarker
            center={[pointB.lat, pointB.lng]}
            radius={9}
            pathOptions={{ color: "#dc2626", fillOpacity: 0.85 }}
          >
            <Popup>Punto B</Popup>
          </CircleMarker>
        ) : null}
        {pointA && pointB ? (
          <Polyline
            positions={[[pointA.lat, pointA.lng], [pointB.lat, pointB.lng]]}
            pathOptions={{ color: "#111827", weight: 4 }}
          />
        ) : null}
      </MapContainer>
      <div className="pointer-events-none absolute left-3 top-3 z-[1000] rounded-md border bg-background/95 px-3 py-2 text-sm font-medium shadow-sm">
        {status}
      </div>
    </div>
  )
}
