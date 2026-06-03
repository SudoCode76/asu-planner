import Link from "next/link"
import { BoxesIcon, PlusIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { listNetworkAssets, requireUser } from "@/lib/fibermap/data"

export default async function AssetsPage() {
  const user = await requireUser()
  const assets = await listNetworkAssets(user.id)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Activos de red</h1>
          <p className="text-muted-foreground">
            Inventario GIS de postes, cajas, empalmes, clientes, nodos y reservas reutilizables.
          </p>
        </div>
        <Button asChild>
          <Link href="/links/new">
            <PlusIcon data-icon="inline-start" />
            Usar en ruta
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventario</CardTitle>
          <CardDescription>Base preparada en Supabase para activos reutilizables por usuario.</CardDescription>
        </CardHeader>
        <CardContent>
          {assets.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Coordenadas</TableHead>
                  <TableHead>Actualizado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell className="font-medium">{asset.name}</TableCell>
                    <TableCell><Badge variant="outline">{asset.asset_type}</Badge></TableCell>
                    <TableCell>{asset.latitude.toFixed(6)}, {asset.longitude.toFixed(6)}</TableCell>
                    <TableCell>{new Date(asset.updated_at).toLocaleDateString("es-BO")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Empty>
              <EmptyHeader>
                <div className="flex justify-center">
                  <BoxesIcon />
                </div>
                <EmptyTitle>No hay activos registrados</EmptyTitle>
                <EmptyDescription>
                  La base ya soporta activos de red; en esta fase puedes modelarlos como puntos de ruta dentro del diseñador.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button asChild variant="outline">
                  <Link href="/links/new">Abrir diseñador</Link>
                </Button>
              </EmptyContent>
            </Empty>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
