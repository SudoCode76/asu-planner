import Link from "next/link"
import { EyeIcon, PlusIcon, SearchIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusBadge } from "@/components/status-badge"
import type { LinkStatus } from "@/lib/fibermap/calculations"
import { listDesigns, requireUser } from "@/lib/fibermap/data"

type Props = {
  searchParams: Promise<{ q?: string; status?: string }>
}

export default async function LinksPage({ searchParams }: Props) {
  const params = await searchParams
  const user = await requireUser()
  const status = ["viable", "critical", "non_viable"].includes(params.status ?? "")
    ? (params.status as LinkStatus)
    : "all"
  const designs = await listDesigns(user.id, { query: params.q, status })

  return (
    <>
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Historial de calculos</h1>
          <p className="text-muted-foreground">Consulta, filtra y abre disenos guardados.</p>
        </div>
        <Button asChild>
          <Link href="/links/new">
            <PlusIcon data-icon="inline-start" />
            Nuevo
          </Link>
        </Button>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Disenos guardados</CardTitle>
          <CardDescription>Cada fila pertenece a tu usuario y esta protegida por RLS.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
            <Input name="q" defaultValue={params.q} placeholder="Buscar por nombre" />
            <Select name="status" defaultValue={status}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="viable">Viable</SelectItem>
                  <SelectItem value="critical">Critico</SelectItem>
                  <SelectItem value="non_viable">No viable</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <SearchIcon data-icon="inline-start" />
              Filtrar
            </Button>
          </form>

          {designs.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Distancia</TableHead>
                  <TableHead>Margen</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {designs.map((design) => (
                  <TableRow key={design.id}>
                    <TableCell className="font-medium">{design.name}</TableCell>
                    <TableCell>{design.real_distance_km.toFixed(4)} km</TableCell>
                    <TableCell>{design.final_margin_db.toFixed(4)} dB</TableCell>
                    <TableCell>
                      <StatusBadge status={design.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/links/${design.id}`}>
                          <EyeIcon data-icon="inline-start" />
                          Ver
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchIcon />
                </EmptyMedia>
                <EmptyTitle>Sin calculos guardados</EmptyTitle>
                <EmptyDescription>Crea tu primer enlace para verlo aqui.</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button asChild>
                  <Link href="/links/new">Nuevo diseno</Link>
                </Button>
              </EmptyContent>
            </Empty>
          )}
        </CardContent>
      </Card>
    </>
  )
}
