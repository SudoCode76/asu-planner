import type { LinkDesign } from "@/lib/database.types"

export type LinkStatus = "viable" | "critical" | "non_viable"

export type Coordinate = {
  lat: number
  lng: number
}

export type CalculationInput = {
  real_distance_km: number
  attenuation_db_per_km: number
  splice_count: number
  splice_loss_db: number
  connector_count: number
  connector_loss_db: number
  safety_margin_db: number
  transmitter_power_dbm: number
  receiver_sensitivity_dbm: number
}

export type CalculationResult = {
  fiber_loss_db: number
  total_splice_loss_db: number
  total_connector_loss_db: number
  total_loss_db: number
  optical_budget_db: number
  final_margin_db: number
  status: LinkStatus
  recommendations: string[]
}

function round(value: number, digits = 4) {
  const factor = 10 ** digits
  return Math.round((value + Number.EPSILON) * factor) / factor
}

export function calculateDistanceKm(pointA: Coordinate, pointB: Coordinate) {
  const earthRadiusKm = 6371
  const dLat = ((pointB.lat - pointA.lat) * Math.PI) / 180
  const dLng = ((pointB.lng - pointA.lng) * Math.PI) / 180
  const lat1 = (pointA.lat * Math.PI) / 180
  const lat2 = (pointB.lat * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2

  return round(earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

export function evaluateStatus(finalMarginDb: number): LinkStatus {
  if (finalMarginDb >= 3) return "viable"
  if (finalMarginDb >= 0) return "critical"
  return "non_viable"
}

export function buildRecommendations(status: LinkStatus) {
  if (status === "viable") {
    return [
      "Mantener el diseño actual.",
      "Conservar el margen de seguridad definido.",
      "Documentar empalmes y conectores durante la instalación.",
    ]
  }

  if (status === "critical") {
    return [
      "Reducir la cantidad de conectores si es posible.",
      "Mejorar la calidad de empalmes.",
      "Usar cable o fibra con menor atenuación.",
      "Revisar la distancia real del recorrido.",
      "Aumentar el margen óptico disponible.",
    ]
  }

  return [
    "Usar un transmisor con mayor potencia.",
    "Usar un receptor con mejor sensibilidad.",
    "Reducir distancia o considerar un punto intermedio.",
    "Evaluar cambio de longitud de onda.",
    "Usar equipos ópticos de mayor alcance.",
  ]
}

export function calculateOpticalBudget(
  input: CalculationInput
): CalculationResult {
  const fiber_loss_db = round(
    input.real_distance_km * input.attenuation_db_per_km
  )
  const total_splice_loss_db = round(
    input.splice_count * input.splice_loss_db
  )
  const total_connector_loss_db = round(
    input.connector_count * input.connector_loss_db
  )
  const total_loss_db = round(
    fiber_loss_db +
      total_splice_loss_db +
      total_connector_loss_db +
      input.safety_margin_db
  )
  const optical_budget_db = round(
    input.transmitter_power_dbm - input.receiver_sensitivity_dbm
  )
  const final_margin_db = round(optical_budget_db - total_loss_db)
  const status = evaluateStatus(final_margin_db)

  return {
    fiber_loss_db,
    total_splice_loss_db,
    total_connector_loss_db,
    total_loss_db,
    optical_budget_db,
    final_margin_db,
    status,
    recommendations: buildRecommendations(status),
  }
}

export function parseRecommendations(design: LinkDesign) {
  return Array.isArray(design.recommendations)
    ? design.recommendations.filter(
        (item): item is string => typeof item === "string"
      )
    : []
}
