import { NextResponse, type NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/dashboard"
  const redirectTo = request.nextUrl.clone()

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      redirectTo.pathname = next
      redirectTo.search = ""
      return NextResponse.redirect(redirectTo)
    }
  }

  redirectTo.pathname = "/login"
  redirectTo.searchParams.set("error", "No se pudo completar el inicio con Google.")
  return NextResponse.redirect(redirectTo)
}
