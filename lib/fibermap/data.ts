import { notFound, redirect } from "next/navigation"

import type { LinkDesign, LinkDesignInsert } from "@/lib/database.types"
import { calculateOpticalBudget } from "@/lib/fibermap/calculations"
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
  const result = calculateOpticalBudget(input)

  return {
    ...input,
    description: input.description || null,
    origin_name: input.origin_name || null,
    destination_name: input.destination_name || null,
    ...result,
    recommendations: result.recommendations,
    calculation_version: 1,
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
