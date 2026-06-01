import Link from "next/link"
import {
  ActivityIcon,
  AlertTriangleIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  GaugeIcon,
  HistoryIcon,
  PlusIcon,
  XCircleIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { getDashboardStats, requireUser } from "@/lib/fibermap/data"

const statCards = [
  { key: "total", label: "Calculos guardados", detail: "Historial disponible", icon: ActivityIcon },
  { key: "viable", label: "Enlaces viables", detail: "Margen >= 3 dB", icon: CheckCircle2Icon },
  { key: "critical", label: "Enlaces criticos", detail: "Margen bajo", icon: AlertTriangleIcon },
  { key: "non_viable", label: "No viables", detail: "Requiere ajuste", icon: XCircleIcon },
] as const

export default async function DashboardPage() {
  const user = await requireUser()
  const stats = await getDashboardStats(user.id)

  return (
    <>
      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card className="overflow-hidden">
          <CardHeader className="gap-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Sistema publico</Badge>
              <Badge variant="outline">Leaflet + Supabase</Badge>
            </div>
            <div className="flex max-w-3xl flex-col gap-3">
              <CardTitle className="text-3xl font-semibold tracking-tight md:text-4xl">
                FiberMap ASU
              </CardTitle>
              <CardDescription className="text-base">
                Disena, evalua y guarda enlaces aereos de fibra optica entre dos puntos
                georreferenciados con presupuesto optico y trazabilidad por usuario.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/links/new">
                <PlusIcon data-icon="inline-start" />
                Nuevo diseno de enlace
              </Link>
            </Button>
            <Button variant="outline" asChild size="lg">
              <Link href="/links">
                <HistoryIcon data-icon="inline-start" />
                Ver historial
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estado operativo</CardTitle>
            <CardDescription>Resumen rapido de la cuenta actual.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-3">
              <div>
                <p className="text-sm font-medium">Disenos registrados</p>
                <p className="text-xs text-muted-foreground">Listos para reporte y comparacion</p>
              </div>
              <p className="text-2xl font-semibold">{stats.total}</p>
            </div>
            <Button variant="secondary" asChild>
              <Link href="/links">
                <HistoryIcon data-icon="inline-start" />
                Abrir historial
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((item) => (
          <Card key={item.key} className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
              <div>
                <CardTitle className="text-sm font-medium">{item.label}</CardTitle>
                <CardDescription>{item.detail}</CardDescription>
              </div>
              <div className="flex size-10 items-center justify-center rounded-lg border bg-muted">
                <item.icon />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{stats[item.key]}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GaugeIcon />
              Flujo de trabajo
            </CardTitle>
            <CardDescription>
              Selecciona puntos, ajusta parametros opticos, guarda el calculo y genera reportes tecnicos.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {["Mapa A/B", "Parametros opticos", "Evaluacion", "Historial y reporte"].map((item, index) => (
              <div key={item} className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <Badge variant="outline">{index + 1}</Badge>
                <span className="text-sm font-medium">{item}</span>
                <ArrowRightIcon className="ml-auto" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Criterio tecnico</CardTitle>
            <CardDescription>
              Viable si el margen final es mayor o igual a 3 dB; critico entre 0 y 2.99 dB; no viable si es menor a 0 dB.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">Viable</span>
              <Badge variant="secondary">&gt;= 3 dB</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">Critico</span>
              <Badge variant="outline">0 a 2.99 dB</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">No viable</span>
              <Badge variant="destructive">&lt; 0 dB</Badge>
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  )
}
