export const CABLE_TYPES = [
  { value: "asu", label: "ASU" },
  { value: "adss", label: "ADSS" },
  { value: "other", label: "Otro equivalente" },
] as const

export const FIBER_TYPES = [
  { value: "single_mode", label: "Monomodo" },
  { value: "multi_mode", label: "Multimodo" },
] as const

export const WAVELENGTHS = [
  { value: 1310, label: "1310 nm" },
  { value: 1550, label: "1550 nm" },
] as const

export const STATUS_LABELS = {
  viable: "Viable",
  critical: "Crítico",
  non_viable: "No viable",
} as const

export const STATUS_BADGE_VARIANT = {
  viable: "default",
  critical: "secondary",
  non_viable: "destructive",
} as const

export const DEFAULT_LINK_VALUES = {
  cable_type: "asu",
  fiber_strands: 12,
  wavelength_nm: 1550,
  fiber_type: "single_mode",
  transmitter_power_dbm: 0,
  receiver_sensitivity_dbm: -24,
  attenuation_db_per_km: 0.25,
  splice_count: 2,
  splice_loss_db: 0.1,
  connector_count: 2,
  connector_loss_db: 0.3,
  safety_margin_db: 3,
} as const
