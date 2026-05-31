import { LinkDesigner } from "@/components/links/link-designer"
import { getDesign, requireUser } from "@/lib/fibermap/data"

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}

export default async function EditLinkPage({ params, searchParams }: Props) {
  const user = await requireUser()
  const [{ id }, { error }] = await Promise.all([params, searchParams])
  const design = await getDesign(user.id, id)

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Editar calculo</h1>
        <p className="text-muted-foreground">Actualiza datos, parametros o coordenadas del enlace.</p>
      </div>
      <LinkDesigner design={design} error={error} />
    </>
  )
}
