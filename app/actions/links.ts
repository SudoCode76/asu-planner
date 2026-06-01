"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { buildDesignInsert, requireUser, syncDesignRouteTables } from "@/lib/fibermap/data"
import type { RouteAnalysis } from "@/lib/fibermap/gis"
import { formDataToObject, linkDesignSchema } from "@/lib/fibermap/schemas"
import { createClient } from "@/lib/supabase/server"

export async function saveDesign(formData: FormData) {
  const user = await requireUser()
  const parsed = linkDesignSchema.safeParse(formDataToObject(formData))

  if (!parsed.success) {
    redirect(`/links/new?error=${encodeURIComponent("Revisa los datos del enlace antes de guardar.")}`)
  }

  const supabase = await createClient()
  const payload = buildDesignInsert(parsed.data, user.id)
  const { data, error } = await supabase
    .from("fiber_link_designs")
    .insert(payload)
    .select("id")
    .single()

  if (error || !data) {
    redirect(`/links/new?error=${encodeURIComponent(error?.message ?? "No se pudo guardar el cálculo.")}`)
  }

  await syncDesignRouteTables(user.id, data.id, payload.name, payload.route_analysis as RouteAnalysis)

  revalidatePath("/dashboard")
  revalidatePath("/links")
  redirect(`/links/${data.id}`)
}

export async function updateDesign(formData: FormData) {
  const user = await requireUser()
  const id = formData.get("id")

  if (typeof id !== "string") {
    redirect("/links")
  }

  const parsed = linkDesignSchema.safeParse(formDataToObject(formData))

  if (!parsed.success) {
    redirect(`/links/${id}/edit?error=${encodeURIComponent("Revisa los datos del enlace antes de guardar.")}`)
  }

  const supabase = await createClient()
  const payload = buildDesignInsert(parsed.data, user.id)
  const { error } = await supabase
    .from("fiber_link_designs")
    .update(payload)
    .eq("user_id", user.id)
    .eq("id", id)

  if (error) {
    redirect(`/links/${id}/edit?error=${encodeURIComponent(error.message)}`)
  }

  await syncDesignRouteTables(user.id, id, payload.name, payload.route_analysis as RouteAnalysis)

  revalidatePath("/dashboard")
  revalidatePath("/links")
  revalidatePath(`/links/${id}`)
  redirect(`/links/${id}`)
}

export async function deleteDesign(formData: FormData) {
  const user = await requireUser()
  const id = formData.get("id")

  if (typeof id !== "string") {
    redirect("/links")
  }

  const supabase = await createClient()
  await supabase
    .from("fiber_link_designs")
    .delete()
    .eq("user_id", user.id)
    .eq("id", id)

  revalidatePath("/dashboard")
  revalidatePath("/links")
  redirect("/links")
}
