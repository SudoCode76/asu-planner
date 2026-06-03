import { z } from "zod"

const emptyToUndefined = (value: unknown) => value === "" ? undefined : value
const numberField = () => z.preprocess(emptyToUndefined, z.coerce.number())

export const linkDesignSchema = z.object({
  name: z.string().trim().min(2, "Ingresa un nombre de enlace."),
  description: z.string().trim().optional().nullable(),
  origin_name: z.string().trim().optional().nullable(),
  destination_name: z.string().trim().optional().nullable(),
  point_a_lat: numberField().pipe(z.number().min(-90).max(90)),
  point_a_lng: numberField().pipe(z.number().min(-180).max(180)),
  point_b_lat: numberField().pipe(z.number().min(-90).max(90)),
  point_b_lng: numberField().pipe(z.number().min(-180).max(180)),
  map_distance_km: numberField().pipe(z.number().nonnegative()),
  real_distance_km: numberField().pipe(z.number().positive()),
  cable_type: z.enum(["asu", "adss", "other"]),
  fiber_strands: numberField().pipe(z.number().int().positive()),
  wavelength_nm: numberField().pipe(z.number().refine((value) => value === 1310 || value === 1550)),
  fiber_type: z.enum(["single_mode", "multi_mode"]),
  transmitter_power_dbm: numberField().pipe(z.number()),
  receiver_sensitivity_dbm: numberField().pipe(z.number()),
  attenuation_db_per_km: numberField().pipe(z.number().nonnegative()),
  splice_count: numberField().pipe(z.number().int().nonnegative()),
  splice_loss_db: numberField().pipe(z.number().nonnegative()),
  connector_count: numberField().pipe(z.number().int().nonnegative()),
  connector_loss_db: numberField().pipe(z.number().nonnegative()),
  safety_margin_db: numberField().pipe(z.number().nonnegative()),
  route_points: z.string().optional().default("[]"),
  gis_layers: z.string().optional().default("[]"),
  mechanical_profile: z.string().optional().default("{}"),
})

export type LinkDesignInput = z.infer<typeof linkDesignSchema>

export function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries())
}
