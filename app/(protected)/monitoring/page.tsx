import { ActivityIcon } from "lucide-react"

import { EntelMonitoringMapLoader } from "@/components/map/entel-monitoring-map-loader"
import { Badge } from "@/components/ui/badge"

export default function MonitoringPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Simulacion academica</Badge>
            <Badge variant="outline">Entel Bolivia</Badge>
            <Badge variant="outline">SDH 2.5 Gbps</Badge>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Monitoreo de red troncal</h1>
          <p className="max-w-3xl text-muted-foreground">
            Mapa operativo para escoger enlaces de fibra, simular fallas reales y visualizar como el sistema detecta cortes,
            degradaciones opticas, conmutacion APS y latencia anomala en gateways internacionales.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm text-muted-foreground">
          <ActivityIcon className="size-4 text-emerald-600" />
          Monitor en tiempo real simulado
        </div>
      </div>

      <EntelMonitoringMapLoader />
    </div>
  )
}
