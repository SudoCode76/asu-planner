import Link from "next/link"
import { CircleUserRoundIcon, LogInIcon } from "lucide-react"

import { login, signInWithGoogle } from "@/app/actions/auth"
import { AuthCard } from "@/components/auth/auth-card"
import { AuthFeedback } from "@/components/auth/auth-feedback"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

type Props = {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>
}

function displayError(message?: string) {
  if (!message) return null
  if (message.toLowerCase().includes("email rate limit")) {
    return "Supabase limito temporalmente el envio de correos. Espera unos minutos antes de volver a intentar."
  }
  return message
}

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams
  const error = displayError(params.error)

  return (
    <AuthCard
      title="Iniciar sesion"
      description="Accede para guardar y consultar tus calculos de enlaces."
    >
      <div className="flex flex-col gap-5">
        <AuthFeedback error={error} message={params.message} />
        <form action={login}>
          <input type="hidden" name="next" value={params.next ?? "/dashboard"} />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">Correo</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Contrasena</FieldLabel>
              <Input id="password" name="password" type="password" required />
            </Field>
            <Button className="w-full">
              <LogInIcon data-icon="inline-start" />
              Entrar
            </Button>
          </FieldGroup>
        </form>
        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">o</span>
          <Separator className="flex-1" />
        </div>
        <form action={signInWithGoogle}>
          <Button variant="outline" className="w-full">
            <CircleUserRoundIcon data-icon="inline-start" />
            Continuar con Google
          </Button>
        </form>
        <FieldDescription>
          No tienes cuenta?{" "}
          <Link href="/signup" className="font-medium text-foreground underline">
            Crear cuenta
          </Link>
        </FieldDescription>
      </div>
    </AuthCard>
  )
}
