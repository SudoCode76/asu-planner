import { z } from "zod"

export const linkDesignSchema = z.object({
  name: z.string().trim().min(2, "Ingresa un nombre de enlace."),
  description: z.string().trim().optional().nullable(),
  origin_name: z.string().trim().optional().nullable(),
  destination_name: z.string().trim().optional().nullable(),
  point_a_lat: z.coerce.number().min(-90).max(90),
  point_a_lng: z.coerce.number().min(-180).max(180),
  point_b_lat: z.coerce.number().min(-90).max(90),
  point_b_lng: z.coerce.number().min(-180).max(180),
  map_distance_km: z.coerce.number().nonnegative(),
  real_distance_km: z.coerce.number().positive(),
  cable_type: z.enum(["asu", "adss", "other"]),
  fiber_strands: z.coerce.number().int().positive(),
  wavelength_nm: z.coerce.number().refine((value) => value === 1310 || value === 1550),
  fiber_type: z.enum(["single_mode", "multi_mode"]),
  transmitter_power_dbm: z.coerce.number(),
  receiver_sensitivity_dbm: z.coerce.number(),
  attenuation_db_per_km: z.coerce.number().nonnegative(),
  splice_count: z.coerce.number().int().nonnegative(),
  splice_loss_db: z.coerce.number().nonnegative(),
  connector_count: z.coerce.number().int().nonnegative(),
  connector_loss_db: z.coerce.number().nonnegative(),
  safety_margin_db: z.coerce.number().nonnegative(),
})

export type LinkDesignInput = z.infer<typeof linkDesignSchema>

export function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries())
}
