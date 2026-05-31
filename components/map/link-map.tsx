"use client"

import { MapContainer, Polyline, Popup, TileLayer, useMapEvents } from "react-leaflet"
import { CircleMarker } from "react-leaflet"

import type { Coordinate } from "@/lib/fibermap/calculations"

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

export function LinkMap({
  pointA,
  pointB,
  onChange,
}: {
  pointA: Coordinate | null
  pointB: Coordinate | null
  onChange: (pointA: Coordinate | null, pointB: Coordinate | null) => void
}) {
  const center: [number, number] = pointA
    ? [pointA.lat, pointA.lng]
    : [-17.7833, -63.1821]

  return (
    <MapContainer center={center} zoom={13} className="h-full min-h-[420px] w-full rounded-lg">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapClickHandler pointA={pointA} pointB={pointB} onChange={onChange} />
      {pointA ? (
        <CircleMarker center={[pointA.lat, pointA.lng]} radius={8}>
          <Popup>Punto A</Popup>
        </CircleMarker>
      ) : null}
      {pointB ? (
        <CircleMarker center={[pointB.lat, pointB.lng]} radius={8} pathOptions={{ color: "red" }}>
          <Popup>Punto B</Popup>
        </CircleMarker>
      ) : null}
      {pointA && pointB ? (
        <Polyline positions={[[pointA.lat, pointA.lng], [pointB.lat, pointB.lng]]} />
      ) : null}
    </MapContainer>
  )
}
