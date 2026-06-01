import Link from "next/link"
import { DownloadIcon } from "lucide-react"

import { DesignDetail } from "@/components/links/design-detail"
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
      <Card>
        <CardHeader>
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <CardTitle>Reporte tecnico</CardTitle>
              <CardDescription>Resumen listo para revision y exportacion.</CardDescription>
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
