import Link from "next/link"
import { ActivityIcon, AlertTriangleIcon, CheckCircle2Icon, PlusIcon, XCircleIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getDashboardStats, requireUser } from "@/lib/fibermap/data"

const statCards = [
  { key: "total", label: "Calculos guardados", icon: ActivityIcon },
  { key: "viable", label: "Enlaces viables", icon: CheckCircle2Icon },
  { key: "critical", label: "Enlaces criticos", icon: AlertTriangleIcon },
  { key: "non_viable", label: "No viables", icon: XCircleIcon },
] as const

export default async function DashboardPage() {
  const user = await requireUser()
  const stats = await getDashboardStats(user.id)

  return (
    <>
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">FiberMap ASU</h1>
          <p className="text-muted-foreground">
            Disena, evalua y guarda enlaces aereos de fibra optica entre dos puntos georreferenciados.
          </p>
        </div>
        <Button asChild>
          <Link href="/links/new">
            <PlusIcon data-icon="inline-start" />
            Nuevo diseno de enlace
          </Link>
        </Button>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((item) => (
          <Card key={item.key}>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle className="text-sm font-medium">{item.label}</CardTitle>
              <item.icon />
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
            <CardTitle>Flujo de trabajo</CardTitle>
            <CardDescription>
              Selecciona puntos, ajusta parametros opticos, guarda el calculo y genera reportes tecnicos.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button asChild>
              <Link href="/links/new">Crear calculo</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/links">Ver historial</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Criterio tecnico</CardTitle>
            <CardDescription>
              Viable si el margen final es mayor o igual a 3 dB; critico entre 0 y 2.99 dB; no viable si es menor a 0 dB.
            </CardDescription>
          </CardHeader>
        </Card>
      </section>
    </>
  )
}
