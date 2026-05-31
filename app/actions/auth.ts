"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === "string" ? value.trim() : ""
}

function authError(path: "/login" | "/signup", message: string) {
  redirect(`${path}?error=${encodeURIComponent(message)}`)
}

function friendlyAuthMessage(message: string) {
  const normalized = message.toLowerCase()

  if (normalized.includes("email rate limit")) {
    return "Supabase limito temporalmente el envio de correos de confirmacion. Espera unos minutos antes de volver a registrarte."
  }

  if (normalized.includes("invalid login credentials")) {
    return "Correo o contrasena incorrectos."
  }

  if (normalized.includes("user already registered")) {
    return "Ese correo ya esta registrado. Inicia sesion o usa otro correo."
  }

  return message
}

function validateEmail(email: string, path: "/login" | "/signup") {
  if (!emailPattern.test(email)) {
    authError(path, "Ingresa un correo valido, por ejemplo nombre@dominio.com.")
  }
}

function validatePassword(password: string, path: "/login" | "/signup") {
  if (password.length < 8) {
    authError(path, "La contrasena debe tener al menos 8 caracteres.")
  }
}

export async function login(formData: FormData) {
  const email = getString(formData, "email")
  const password = getString(formData, "password")
  const next = getString(formData, "next") || "/dashboard"
  let errorMessage: string | null = null

  validateEmail(email, "/login")
  validatePassword(password, "/login")

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      errorMessage = friendlyAuthMessage(error.message)
    }
  } catch {
    errorMessage =
      "No se pudo conectar con Supabase. Verifica tu conexion e intenta nuevamente."
  }

  if (errorMessage) {
    authError("/login", errorMessage)
  }

  revalidatePath("/", "layout")
  redirect(next)
}

export async function signup(formData: FormData) {
  const email = getString(formData, "email")
  const password = getString(formData, "password")
  const fullName = getString(formData, "full_name")
  let errorMessage: string | null = null

  if (fullName.length < 2) {
    authError("/signup", "Ingresa tu nombre.")
  }

  validateEmail(email, "/signup")
  validatePassword(password, "/signup")

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    })

    if (error) {
      errorMessage = friendlyAuthMessage(error.message)
    }

    if (!error && !data.session) {
      errorMessage =
        "La cuenta se creo, pero Supabase aun exige confirmar correo. Desactiva Confirm email en Auth > Providers para entrar directo."
    }
  } catch {
    errorMessage =
      "No se pudo conectar con Supabase. Verifica tu conexion e intenta nuevamente."
  }

  if (errorMessage) {
    authError("/signup", errorMessage)
  }

  revalidatePath("/", "layout")
  redirect("/dashboard")
}

export async function signInWithGoogle() {
  let url: string | null = null
  let errorMessage: string | null = null

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/auth/callback`,
      },
    })

    url = data.url
    errorMessage = error?.message ?? null
  } catch {
    errorMessage =
      "No se pudo conectar con Supabase. Verifica tu conexion e intenta nuevamente."
  }

  if (errorMessage || !url) {
    redirect(
      `/login?error=${encodeURIComponent(errorMessage ?? "No se pudo iniciar con Google.")}`
    )
  }

  redirect(url)
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath("/", "layout")
  redirect("/login")
}
