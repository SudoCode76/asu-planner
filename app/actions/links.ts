"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { buildDesignInsert, requireUser, syncDesignRouteTables } from "@/lib/fibermap/data"
import type { RouteAnalysis } from "@/lib/fibermap/gis"
import { formDataToObject, linkDesignSchema } from "@/lib/fibermap/schemas"
import { createClient } from "@/lib/supabase/server"

export type DesignActionState = {
  status: "idle" | "error"
  message?: string
  fieldErrors?: Record<string, string[]>
}

const FIELD_LABELS: Record<string, string> = {
  name: "Nombre del enlace",
  point_a: "Punto A",
  point_a_lat: "Punto A",
  point_a_lng: "Punto A",
  point_b: "Punto B",
  point_b_lat: "Punto B",
  point_b_lng: "Punto B",
  map_distance_km: "Distancia del mapa",
  real_distance_km: "Distancia manual",
  cable_type: "Tipo de cable",
  fiber_strands: "Hilos",
  wavelength_nm: "Longitud de onda",
  fiber_type: "Tipo de fibra",
  transmitter_power_dbm: "Potencia TX",
  receiver_sensitivity_dbm: "Sensibilidad RX",
  attenuation_db_per_km: "Atenuacion",
  splice_count: "Empalmes",
  splice_loss_db: "Perdida por empalme",
  connector_count: "Conectores",
  connector_loss_db: "Perdida por conector",
  safety_margin_db: "Margen de seguridad",
}

const FIELD_ERROR_KEYS: Record<string, string> = {
  point_a_lat: "point_a",
  point_a_lng: "point_a",
  point_b_lat: "point_b",
  point_b_lng: "point_b",
}

function buildActionError(message: string, fieldErrors?: Record<string, string[]>): DesignActionState {
  return { status: "error", message, fieldErrors }
}

function formatValidationErrors(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const fieldErrors: Record<string, string[]> = {}

  error.issues.forEach((issue) => {
    const rawField = String(issue.path[0] ?? "form")
    const field = FIELD_ERROR_KEYS[rawField] ?? rawField
    const label = FIELD_LABELS[field] ?? "Campo"
    const genericMessage = issue.message.toLowerCase().startsWith("invalid")
      ? `${label} tiene un valor invalido o esta incompleto.`
      : issue.message

    fieldErrors[field] = Array.from(new Set([...(fieldErrors[field] ?? []), genericMessage]))
  })

  return fieldErrors
}

async function syncRouteTablesSafely(
  userId: string,
  designId: string,
  designName: string,
  routeAnalysis: RouteAnalysis
) {
  try {
    await syncDesignRouteTables(userId, designId, designName, routeAnalysis)
  } catch (error) {
    console.error("No se pudieron sincronizar las tablas GIS derivadas.", error)
  }
}

export async function saveDesign(
  _state: DesignActionState,
  formData: FormData
): Promise<DesignActionState> {
  const user = await requireUser()
  const parsed = linkDesignSchema.safeParse(formDataToObject(formData))

  if (!parsed.success) {
    return buildActionError(
      "Revisa los datos del enlace antes de guardar.",
      formatValidationErrors(parsed.error)
    )
  }

  const supabase = await createClient()
  const payload = buildDesignInsert(parsed.data, user.id)
  const { data, error } = await supabase
    .from("fiber_link_designs")
    .insert(payload)
    .select("id")
    .single()

  if (error || !data) {
    return buildActionError(error?.message ?? "No se pudo guardar el calculo.")
  }

  await syncRouteTablesSafely(user.id, data.id, payload.name, payload.route_analysis as RouteAnalysis)

  revalidatePath("/dashboard")
  revalidatePath("/links")
  redirect(`/links/${data.id}`)
}

export async function updateDesign(
  _state: DesignActionState,
  formData: FormData
): Promise<DesignActionState> {
  const user = await requireUser()
  const id = formData.get("id")

  if (typeof id !== "string") {
    redirect("/links")
  }

  const parsed = linkDesignSchema.safeParse(formDataToObject(formData))

  if (!parsed.success) {
    return buildActionError(
      "Revisa los datos del enlace antes de guardar.",
      formatValidationErrors(parsed.error)
    )
  }

  const supabase = await createClient()
  const payload = buildDesignInsert(parsed.data, user.id)
  const { error } = await supabase
    .from("fiber_link_designs")
    .update(payload)
    .eq("user_id", user.id)
    .eq("id", id)

  if (error) {
    return buildActionError(error.message)
  }

  await syncRouteTablesSafely(user.id, id, payload.name, payload.route_analysis as RouteAnalysis)

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
