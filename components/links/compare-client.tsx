"use client"

import { useMemo, useState } from "react"

import { StatusBadge } from "@/components/status-badge"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { LinkDesign } from "@/lib/database.types"

export function CompareClient({ designs }: { designs: LinkDesign[] }) {
  const [selected, setSelected] = useState<string[]>(designs.slice(0, 3).map((item) => item.id))
  const selectedDesigns = useMemo(
    () => designs.filter((design) => selected.includes(design.id)),
    [designs, selected]
  )

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : current.length < 4
          ? [...current, id]
          : current
    )
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Seleccionar</CardTitle>
            <Badge variant="secondary">{selectedDesigns.length}/4</Badge>
          </div>
          <CardDescription>Compara hasta cuatro calculos guardados.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {designs.map((design) => (
            <label key={design.id} className="flex cursor-pointer items-center gap-3 rounded-lg border bg-background p-3 text-sm hover:bg-muted/50">
              <input
                type="checkbox"
                checked={selected.includes(design.id)}
                onChange={() => toggle(design.id)}
              />
              <span className="min-w-0 flex-1 truncate">{design.name}</span>
              <StatusBadge status={design.status} />
            </label>
          ))}
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Comparacion tecnica</CardTitle>
          <CardDescription>Distancia, perdida y margen de los disenos seleccionados.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Diseno</TableHead>
                <TableHead>Distancia</TableHead>
                <TableHead>Perdida total</TableHead>
                <TableHead>Presupuesto</TableHead>
                <TableHead>Margen</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedDesigns.map((design) => (
                <TableRow key={design.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{design.name}</TableCell>
                  <TableCell>{design.real_distance_km.toFixed(4)} km</TableCell>
                  <TableCell>{design.total_loss_db.toFixed(4)} dB</TableCell>
                  <TableCell>{design.optical_budget_db.toFixed(4)} dB</TableCell>
                  <TableCell>{design.final_margin_db.toFixed(4)} dB</TableCell>
                  <TableCell>
                    <StatusBadge status={design.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
