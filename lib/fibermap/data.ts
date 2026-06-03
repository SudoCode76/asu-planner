import { notFound, redirect } from "next/navigation"

import type { LinkDesign, LinkDesignInsert } from "@/lib/database.types"
import { calculateOpticalBudget } from "@/lib/fibermap/calculations"
import { analyzeRoute, buildRoutePoints, parseGisLayers, parseMechanicalProfile, parseRoutePoints, type RouteAnalysis } from "@/lib/fibermap/gis"
import type { LinkDesignInput } from "@/lib/fibermap/schemas"
import { createClient } from "@/lib/supabase/server"

export async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return user
}

export function buildDesignInsert(
  input: LinkDesignInput,
  userId: string
): LinkDesignInsert {
  const routePoints = parseRoutePoints(input.route_points)
  const gisLayers = parseGisLayers(input.gis_layers)
  const mechanicalProfile = parseMechanicalProfile(input.mechanical_profile)
  const analysisPoints = buildRoutePoints(
    { lat: input.point_a_lat, lng: input.point_a_lng },
    routePoints,
    { lat: input.point_b_lat, lng: input.point_b_lng }
  )
  const routeAnalysis = analyzeRoute(analysisPoints, mechanicalProfile)
  const opticalInput = {
    ...input,
    real_distance_km: routeAnalysis.total_cable_length_km || input.real_distance_km,
  }
  const result = calculateOpticalBudget(opticalInput)

  return {
    ...opticalInput,
    description: input.description || null,
    origin_name: input.origin_name || null,
    destination_name: input.destination_name || null,
    route_points: routePoints,
    gis_layers: gisLayers,
    mechanical_profile: mechanicalProfile,
    route_analysis: routeAnalysis,
    ...result,
    recommendations: result.recommendations,
    calculation_version: 2,
    user_id: userId,
  }
}

export async function getDashboardStats(userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("fiber_link_designs")
    .select("status")
    .eq("user_id", userId)

  if (error) throw new Error(error.message)

  const rows = (data ?? []) as Pick<LinkDesign, "status">[]
  const stats = {
    total: rows.length,
    viable: 0,
    critical: 0,
    non_viable: 0,
  }

  rows.forEach((row) => {
    stats[row.status] += 1
  })

  return stats
}

export async function listDesigns(userId: string, filters?: {
  query?: string
  status?: LinkDesign["status"] | "all"
}) {
  const supabase = await createClient()
  let query = supabase
    .from("fiber_link_designs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status)
  }

  if (filters?.query) {
    query = query.ilike("name", `%${filters.query}%`)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  return (data ?? []) as LinkDesign[]
}

export async function getDesign(userId: string, id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("fiber_link_designs")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .single()

  if (error || !data) notFound()

  return data as LinkDesign
}

export async function listGisLayers(userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("gis_layers")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)

  return data ?? []
}

export async function listNetworkAssets(userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("network_assets")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)

  return data ?? []
}

export async function listCableCatalog(userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("cable_catalog")
    .select("*")
    .or(`user_id.eq.${userId},user_id.is.null`)
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)

  return data ?? []
}

export async function listMechanicalProfiles(userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("mechanical_profiles")
    .select("*")
    .or(`user_id.eq.${userId},user_id.is.null`)
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)

  return data ?? []
}

export async function syncDesignRouteTables(
  userId: string,
  designId: string,
  designName: string,
  routeAnalysis: RouteAnalysis
) {
  const supabase = await createClient()

  await supabase
    .from("fiber_routes")
    .delete()
    .eq("user_id", userId)
    .eq("design_id", designId)

  const { data: route, error: routeError } = await supabase
    .from("fiber_routes")
    .insert({
      user_id: userId,
      design_id: designId,
      name: designName,
      route_points: routeAnalysis.points,
      route_analysis: routeAnalysis,
      geom: null,
    })
    .select("id")
    .single()

  if (routeError || !route) {
    throw new Error(routeError?.message ?? "No se pudo sincronizar la ruta GIS.")
  }

  if (routeAnalysis.points.length) {
    const { error } = await supabase.from("fiber_route_points").insert(
      routeAnalysis.points.map((point, index) => ({
        user_id: userId,
        route_id: route.id,
        point_order: index,
        point_kind: point.kind,
        label: point.label,
        latitude: point.lat,
        longitude: point.lng,
        metadata: point,
      }))
    )

    if (error) throw new Error(error.message)
  }

  if (routeAnalysis.spans.length) {
    const { error } = await supabase.from("fiber_route_spans").insert(
      routeAnalysis.spans.map((span) => ({
        user_id: userId,
        route_id: route.id,
        span_order: span.index,
        from_label: span.from_label,
        to_label: span.to_label,
        distance_km: span.distance_km,
        span_m: span.span_m,
        estimated_sag_m: span.estimated_sag_m,
        sag_percent: span.sag_percent,
        warnings: span.warnings,
      }))
    )

    if (error) throw new Error(error.message)
  }
}
