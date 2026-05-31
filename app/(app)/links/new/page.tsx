import { LinkDesigner } from "@/components/links/link-designer"

type Props = {
  searchParams: Promise<{ error?: string }>
}

export default async function NewLinkPage({ searchParams }: Props) {
  const { error } = await searchParams

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nuevo diseno de enlace</h1>
        <p className="text-muted-foreground">Selecciona dos puntos y calcula la viabilidad tecnica.</p>
      </div>
      <LinkDesigner error={error} />
    </>
  )
}
