import Link from "next/link"
import { DownloadIcon, EditIcon, Trash2Icon } from "lucide-react"

import { deleteDesign } from "@/app/actions/links"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { LinkDesign } from "@/lib/database.types"
import { parseRecommendations } from "@/lib/fibermap/calculations"
import { CABLE_TYPES, FIBER_TYPES } from "@/lib/fibermap/constants"

export function DesignDetail({ design }: { design: LinkDesign }) {
  const cableType = CABLE_TYPES.find((item) => item.value === design.cable_type)?.label
  const fiberType = FIBER_TYPES.find((item) => item.value === design.fiber_type)?.label

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <CardTitle>{design.name}</CardTitle>
                <CardDescription>{design.description || "Sin descripcion"}</CardDescription>
              </div>
              <StatusBadge status={design.status} />
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
          </CardHeader>
          <CardContent>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-muted-foreground">
              {parseRecommendations(design).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <aside className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Resultado optico</CardTitle>
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
    <div className="rounded-lg border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="break-words text-sm font-medium">{value}</p>
    </div>
  )
}
