import Link from "next/link"
import { BookOpenIcon, PlusIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { listCableCatalog, listMechanicalProfiles, requireUser } from "@/lib/fibermap/data"

export default async function CatalogPage() {
  const user = await requireUser()
  const [cables, profiles] = await Promise.all([
    listCableCatalog(user.id),
    listMechanicalProfiles(user.id),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Catalogo tecnico</h1>
          <p className="text-muted-foreground">
            Cables ASU/ADSS/equivalentes y perfiles mecanicos configurables para calculos reproducibles.
          </p>
        </div>
        <Button asChild>
          <Link href="/links/new">
            <PlusIcon data-icon="inline-start" />
            Aplicar perfil
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cables</CardTitle>
            <CardDescription>Parametros editables por usuario para catalogar tecnologias equivalentes.</CardDescription>
          </CardHeader>
          <CardContent>
            {cables.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Hilos</TableHead>
                    <TableHead>Atenuacion 1550</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cables.map((cable) => (
                    <TableRow key={cable.id}>
                      <TableCell className="font-medium">{cable.name}</TableCell>
                      <TableCell><Badge variant="outline">{cable.cable_type}</Badge></TableCell>
                      <TableCell>{cable.fiber_strands}</TableCell>
                      <TableCell>{cable.attenuation_1550_db_per_km} dB/km</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <CatalogEmpty title="Sin cables de catalogo" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Perfiles mecanicos</CardTitle>
            <CardDescription>Vano, reserva, tension y flecha maxima para estimaciones configurables.</CardDescription>
          </CardHeader>
          <CardContent>
            {profiles.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Vano max.</TableHead>
                    <TableHead>Reserva</TableHead>
                    <TableHead>Tension max.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell className="font-medium">{profile.name}</TableCell>
                      <TableCell>{profile.max_span_m} m</TableCell>
                      <TableCell>{profile.reserve_percent}%</TableCell>
                      <TableCell>{profile.max_tension_n} N</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <CatalogEmpty title="Sin perfiles guardados" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function CatalogEmpty({ title }: { title: string }) {
  return (
    <Empty>
      <EmptyHeader>
        <div className="flex justify-center">
          <BookOpenIcon />
        </div>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>
          El diseñador incluye un perfil configurable por defecto y persistira los parametros usados en cada enlace.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild variant="outline">
          <Link href="/links/new">Abrir diseñador</Link>
        </Button>
      </EmptyContent>
    </Empty>
  )
}
