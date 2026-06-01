import Link from "next/link"

import { DesignDetail } from "@/components/links/design-detail"
import { Button } from "@/components/ui/button"
import { getDesign, requireUser } from "@/lib/fibermap/data"

type Props = {
  params: Promise<{ id: string }>
}

export default async function LinkDetailPage({ params }: Props) {
  const user = await requireUser()
  const { id } = await params
  const design = await getDesign(user.id, id)

  return (
    <>
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Detalle del calculo</h1>
          <p className="text-muted-foreground">Consulta los datos guardados y sus resultados.</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/links">Historial</Link>
        </Button>
      </div>
      <DesignDetail design={design} />
    </>
  )
}
