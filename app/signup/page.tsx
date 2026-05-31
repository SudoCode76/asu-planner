import Link from "next/link"
import { UserPlusIcon } from "lucide-react"

import { signup } from "@/app/actions/auth"
import { AuthCard } from "@/components/auth/auth-card"
import { AuthFeedback } from "@/components/auth/auth-feedback"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

type Props = {
  searchParams: Promise<{ error?: string }>
}

function displayError(message?: string) {
  if (!message) return null
  if (message.toLowerCase().includes("email rate limit")) {
    return "Supabase limito temporalmente el envio de correos de confirmacion. Espera unos minutos antes de volver a registrarte."
  }
  return message
}

export default async function SignupPage({ searchParams }: Props) {
  const params = await searchParams
  const error = displayError(params.error)

  return (
    <AuthCard
      title="Crear cuenta"
      description="Registrate y entra directo para guardar tus calculos."
    >
      <form action={signup}>
        <FieldGroup>
          <AuthFeedback error={error} />
          <Field>
            <FieldLabel htmlFor="full_name">Nombre</FieldLabel>
            <Input id="full_name" name="full_name" required />
          </Field>
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
            <Input id="password" name="password" type="password" minLength={8} required />
          </Field>
          <Button className="w-full">
            <UserPlusIcon data-icon="inline-start" />
            Registrarme
          </Button>
          <FieldDescription>
            Ya tienes cuenta?{" "}
            <Link href="/login" className="font-medium text-foreground underline">
              Iniciar sesion
            </Link>
          </FieldDescription>
        </FieldGroup>
      </form>
    </AuthCard>
  )
}
