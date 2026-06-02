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

export type TechnicalDiagnosis = {
  missing_margin_db: number
  required_optical_budget_db: number
  max_total_loss_for_viable_db: number
  excess_loss_db: number
  breakdown: {
    distance_loss_db: number
    splice_loss_db: number
    connector_loss_db: number
    safety_margin_db: number
  }
  details: string[]
}

export const MIN_VIABLE_MARGIN_DB = 3

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
  if (finalMarginDb >= MIN_VIABLE_MARGIN_DB) return "viable"
  if (finalMarginDb >= 0) return "critical"
  return "non_viable"
}

export function buildRecommendations(status: LinkStatus, diagnosis?: TechnicalDiagnosis) {
  if (status === "viable") {
    return [
      "Mantener el diseño actual.",
      "Conservar el margen de seguridad definido.",
      "Documentar empalmes y conectores durante la instalación.",
    ]
  }

  if (status === "critical") {
    return [
      diagnosis ? `Agregar al menos ${diagnosis.missing_margin_db.toFixed(4)} dB de margen para quedar viable.` : "Aumentar el margen óptico disponible.",
      "Reducir la cantidad de conectores si es posible.",
      "Mejorar la calidad de empalmes.",
      "Usar cable o fibra con menor atenuación.",
      "Revisar la distancia real del recorrido.",
    ]
  }

  return [
    diagnosis ? `Aumentar potencia TX o mejorar sensibilidad RX en al menos ${diagnosis.missing_margin_db.toFixed(4)} dB.` : "Usar un transmisor con mayor potencia.",
    diagnosis ? `Reducir perdida total en ${diagnosis.excess_loss_db.toFixed(4)} dB o mas.` : "Usar un receptor con mejor sensibilidad.",
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
  const partialResult = {
    fiber_loss_db,
    total_splice_loss_db,
    total_connector_loss_db,
    total_loss_db,
    optical_budget_db,
    final_margin_db,
    status,
    recommendations: [],
  }
  const diagnosis = buildTechnicalDiagnosis(partialResult, input)

  return {
    fiber_loss_db,
    total_splice_loss_db,
    total_connector_loss_db,
    total_loss_db,
    optical_budget_db,
    final_margin_db,
    status,
    recommendations: buildRecommendations(status, diagnosis),
  }
}

export function buildTechnicalDiagnosis(
  result: Omit<CalculationResult, "recommendations">,
  input: CalculationInput
): TechnicalDiagnosis {
  const missing_margin_db = round(Math.max(0, MIN_VIABLE_MARGIN_DB - result.final_margin_db))
  const required_optical_budget_db = round(result.total_loss_db + MIN_VIABLE_MARGIN_DB)
  const max_total_loss_for_viable_db = round(result.optical_budget_db - MIN_VIABLE_MARGIN_DB)
  const excess_loss_db = round(Math.max(0, result.total_loss_db - max_total_loss_for_viable_db))

  return {
    missing_margin_db,
    required_optical_budget_db,
    max_total_loss_for_viable_db,
    excess_loss_db,
    breakdown: {
      distance_loss_db: result.fiber_loss_db,
      splice_loss_db: result.total_splice_loss_db,
      connector_loss_db: result.total_connector_loss_db,
      safety_margin_db: input.safety_margin_db,
    },
    details: [
      missing_margin_db > 0
        ? `Faltan ${missing_margin_db.toFixed(4)} dB para ser viable.`
        : `El margen cumple el minimo viable de ${MIN_VIABLE_MARGIN_DB.toFixed(1)} dB.`,
      `El presupuesto optico deberia ser al menos ${required_optical_budget_db.toFixed(4)} dB.`,
      `La perdida total deberia bajar a ${max_total_loss_for_viable_db.toFixed(4)} dB o menos.`,
      `La distancia aporta ${result.fiber_loss_db.toFixed(4)} dB, empalmes ${result.total_splice_loss_db.toFixed(4)} dB, conectores ${result.total_connector_loss_db.toFixed(4)} dB y margen de seguridad ${input.safety_margin_db.toFixed(4)} dB.`,
    ],
  }
}

export function parseRecommendations(design: LinkDesign) {
  return Array.isArray(design.recommendations)
    ? design.recommendations.filter(
        (item): item is string => typeof item === "string"
      )
    : []
}
