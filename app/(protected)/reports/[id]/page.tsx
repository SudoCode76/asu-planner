import Link from "next/link"
import { DownloadIcon, FileTextIcon } from "lucide-react"

import { DesignDetail } from "@/components/links/design-detail"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getDesign, requireUser } from "@/lib/fibermap/data"

type Props = {
  params: Promise<{ id: string }>
}

export default async function ReportPage({ params }: Props) {
  const user = await requireUser()
  const { id } = await params
  const design = await getDesign(user.id, id)

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div className="flex items-start gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg border bg-muted">
                <FileTextIcon />
              </div>
              <div>
                <div className="mb-2 flex flex-wrap gap-2">
                  <Badge variant="secondary">Reporte tecnico</Badge>
                  <Badge variant="outline">PDF disponible</Badge>
                </div>
                <CardTitle>Revision y exportacion</CardTitle>
                <CardDescription>
                  Resumen listo para revisar en pantalla y descargar como documento tecnico.
                </CardDescription>
              </div>
            </div>
            <Button asChild>
              <Link href={`/reports/${design.id}/pdf`} target="_blank">
                <DownloadIcon data-icon="inline-start" />
                Exportar PDF
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            El PDF incluye datos generales, coordenadas, parametros opticos, resultados y recomendaciones.
          </p>
        </CardContent>
      </Card>
      <DesignDetail design={design} />
    </>
  )
}
