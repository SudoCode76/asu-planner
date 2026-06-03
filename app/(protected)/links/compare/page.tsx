import Link from "next/link"
import { PlusIcon } from "lucide-react"

import { CompareClient } from "@/components/links/compare-client"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { listDesigns, requireUser } from "@/lib/fibermap/data"

export default async function ComparePage() {
  const user = await requireUser()
  const designs = await listDesigns(user.id)

  return (
    <>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
        <h1 className="text-2xl font-semibold tracking-tight">Comparar calculos</h1>
        <p className="text-muted-foreground">Evalua lado a lado tus disenos guardados.</p>
        </div>
        <Button asChild>
          <Link href="/links/new">
            <PlusIcon data-icon="inline-start" />
            Nuevo diseno
          </Link>
        </Button>
      </div>
      {designs.length ? (
        <CompareClient designs={designs} />
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No hay calculos para comparar</EmptyTitle>
            <EmptyDescription>Guarda al menos un diseno para usar esta vista.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/links/new">Nuevo diseno</Link>
            </Button>
          </EmptyContent>
        </Empty>
      )}
    </>
  )
}
