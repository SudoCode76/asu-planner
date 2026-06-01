import Link from "next/link"
import { DownloadIcon, EditIcon, Trash2Icon } from "lucide-react"

import { deleteDesign } from "@/app/actions/links"
import { StatusBadge } from "@/components/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { LinkDesign } from "@/lib/database.types"
import { parseRecommendations } from "@/lib/fibermap/calculations"
import { CABLE_TYPES, FIBER_TYPES } from "@/lib/fibermap/constants"
import { analyzeRoute, buildRoutePoints, parseMechanicalProfile, parseRoutePoints, type RouteAnalysis } from "@/lib/fibermap/gis"

export function DesignDetail({ design }: { design: LinkDesign }) {
  const cableType = CABLE_TYPES.find((item) => item.value === design.cable_type)?.label
  const fiberType = FIBER_TYPES.find((item) => item.value === design.fiber_type)?.label
  const routeAnalysis = readRouteAnalysis(design)

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-6">
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <CardTitle>{design.name}</CardTitle>
                <CardDescription>{design.description || "Sin descripcion"}</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{design.real_distance_km.toFixed(4)} km</Badge>
                <StatusBadge status={design.status} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <Info label="Origen" value={design.origin_name || "No especificado"} />
            <Info label="Destino" value={design.destination_name || "No especificado"} />
            <Info label="Punto A" value={`${design.point_a_lat}, ${design.point_a_lng}`} />
            <Info label="Punto B" value={`${design.point_b_lat}, ${design.point_b_lng}`} />
            <Info label="Distancia mapa" value={`${design.map_distance_km.toFixed(4)} km`} />
            <Info label="Distancia real" value={`${design.real_distance_km.toFixed(4)} km`} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Parametros tecnicos</CardTitle>
            <CardDescription>Entradas guardadas para reproducir el calculo del enlace.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <Info label="Cable" value={cableType ?? design.cable_type} />
            <Info label="Hilos" value={String(design.fiber_strands)} />
            <Info label="Longitud de onda" value={`${design.wavelength_nm} nm`} />
            <Info label="Fibra" value={fiberType ?? design.fiber_type} />
            <Info label="Potencia TX" value={`${design.transmitter_power_dbm} dBm`} />
            <Info label="Sensibilidad RX" value={`${design.receiver_sensitivity_dbm} dBm`} />
            <Info label="Atenuacion" value={`${design.attenuation_db_per_km} dB/km`} />
            <Info label="Empalmes" value={`${design.splice_count} x ${design.splice_loss_db} dB`} />
            <Info label="Conectores" value={`${design.connector_count} x ${design.connector_loss_db} dB`} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recomendaciones</CardTitle>
            <CardDescription>Sugerencias automaticas segun el margen final.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-muted-foreground">
              {parseRecommendations(design).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ruta GIS y vanos</CardTitle>
            <CardDescription>Postes, distancia por tramos, reserva y advertencias mecanicas guardadas.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-3 md:grid-cols-4">
              <Info label="Puntos" value={String(routeAnalysis.points.length)} />
              <Info label="Tramos" value={String(routeAnalysis.spans.length)} />
              <Info label="Cable total" value={`${routeAnalysis.total_cable_length_km.toFixed(4)} km`} />
              <Info label="Vano maximo" value={`${routeAnalysis.max_span_m.toFixed(2)} m`} />
            </div>
            <div className="grid gap-2">
              {routeAnalysis.spans.map((span) => (
                <div key={span.index} className="rounded-lg border bg-muted/30 p-3 text-sm">
                  <div className="flex flex-col justify-between gap-1 md:flex-row md:items-center">
                    <p className="font-medium">{span.from_label} - {span.to_label}</p>
                    <Badge variant={span.warnings.length ? "outline" : "secondary"}>
                      {span.span_m.toFixed(2)} m
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">
                    Flecha estimada {span.estimated_sag_m.toFixed(2)} m ({span.sag_percent.toFixed(2)}%)
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <aside className="flex flex-col gap-6">
        <Card className="overflow-hidden shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Resultado optico</CardTitle>
              <StatusBadge status={design.status} />
            </div>
            <CardDescription>Valores recalculados al guardar.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Info label="Perdida distancia" value={`${design.fiber_loss_db.toFixed(4)} dB`} />
            <Info label="Perdida empalmes" value={`${design.total_splice_loss_db.toFixed(4)} dB`} />
            <Info label="Perdida conectores" value={`${design.total_connector_loss_db.toFixed(4)} dB`} />
            <Info label="Perdida total" value={`${design.total_loss_db.toFixed(4)} dB`} />
            <Info label="Presupuesto optico" value={`${design.optical_budget_db.toFixed(4)} dB`} />
            <Info label="Margen final" value={`${design.final_margin_db.toFixed(4)} dB`} />
            <Separator />
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Advertencias GIS</p>
              <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
                {routeAnalysis.warnings.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <Separator />
            <div className="flex flex-col gap-2">
              <Button asChild>
                <Link href={`/links/${design.id}/edit`}>
                  <EditIcon data-icon="inline-start" />
                  Editar
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/reports/${design.id}`}>
                  <DownloadIcon data-icon="inline-start" />
                  Reporte
                </Link>
              </Button>
              <form action={deleteDesign}>
                <input type="hidden" name="id" value={design.id} />
                <Button variant="destructive" className="w-full">
                  <Trash2Icon data-icon="inline-start" />
                  Eliminar
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="break-words text-sm font-medium">{value}</p>
    </div>
  )
}

function readRouteAnalysis(design: LinkDesign): RouteAnalysis {
  const saved = design.route_analysis

  if (saved && typeof saved === "object" && "spans" in saved) {
    return saved as unknown as RouteAnalysis
  }

  return analyzeRoute(
    buildRoutePoints(
      { lat: design.point_a_lat, lng: design.point_a_lng },
      parseRoutePoints(design.route_points),
      { lat: design.point_b_lat, lng: design.point_b_lng }
    ),
    parseMechanicalProfile(design.mechanical_profile)
  )
}
