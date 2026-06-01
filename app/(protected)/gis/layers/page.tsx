import Link from "next/link"
import { LayersIcon, PlusIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { listGisLayers, requireUser } from "@/lib/fibermap/data"

export default async function GisLayersPage() {
  const user = await requireUser()
  const layers = await listGisLayers(user.id)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Capas GIS</h1>
          <p className="text-muted-foreground">
            Administra capas de referencia, restricciones, zonas y geometrías importadas.
          </p>
        </div>
        <Button asChild>
          <Link href="/links/new">
            <PlusIcon data-icon="inline-start" />
            Importar en diseñador
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Capas persistentes</CardTitle>
          <CardDescription>Las capas importadas en el diseñador se guardan con el diseño; esta vista queda lista para el inventario GIS global.</CardDescription>
        </CardHeader>
        <CardContent>
          {layers.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Geometrias</TableHead>
                  <TableHead>Actualizada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {layers.map((layer) => (
                  <TableRow key={layer.id}>
                    <TableCell className="font-medium">{layer.name}</TableCell>
                    <TableCell><Badge variant="outline">{layer.layer_type}</Badge></TableCell>
                    <TableCell>{layer.feature_count}</TableCell>
                    <TableCell>{new Date(layer.updated_at).toLocaleDateString("es-BO")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Empty>
              <EmptyHeader>
                <div className="flex justify-center">
                  <LayersIcon />
                </div>
                <EmptyTitle>No hay capas GIS globales</EmptyTitle>
                <EmptyDescription>
                  Importa GeoJSON o KML desde el diseñador para asociarlo al enlace actual.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button asChild variant="outline">
                  <Link href="/links/new">Crear enlace GIS</Link>
                </Button>
              </EmptyContent>
            </Empty>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
