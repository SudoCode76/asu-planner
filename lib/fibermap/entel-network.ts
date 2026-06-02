export type NetworkLayer = "backbone" | "distribution"

export type NetworkStatus = "ok" | "warning" | "critical" | "unknown"

export type NetworkNodeType = "core" | "gateway" | "distribution"

export type NetworkLinkType = "backbone" | "regional" | "international" | "distribution"

export type AlarmSeverity = "info" | "minor" | "major" | "critical"

export type AlarmType =
  | "fiber_cut"
  | "optical_degradation"
  | "edfa_failure"
  | "aps_switch"
  | "latency_anomaly"
  | "capacity_saturation"
  | "unknown"

export type LinkMetrics = {
  txPowerDbm: number
  rxPowerDbm: number
  attenuationDb: number
  latencyMs: number
  jitterMs: number
  packetLossPercent: number
  trafficLoadPercent: number
  availabilityPercent: number
}

export type LinkEquipment = {
  vendor: string
  model: string
  localPort: string
  remotePort: string
  transceiver: string
  edfa: "none" | "inline" | "booster" | "preamp"
}

export type TraceEvent = {
  km: number
  type: "connector" | "splice" | "edfa" | "reflection" | "high_loss" | "cut"
  lossDb: number
  status: NetworkStatus
  description: string
}

export type LinkProtection = {
  type: "SDH APS" | "MPLS reroute" | "No protection"
  primaryPath: string[]
  backupPath: string[]
}

export type TrafficProfile = {
  normalGbps: number
  switchedGbps: number
  lostGbps: number
  remainingCapacityGbps: number
}

export type NodeMetrics = {
  latencyMs: number
  packetLossPercent: number
  trafficLoadPercent: number
  availabilityPercent: number
}

export type MetricThresholds = {
  warningRxPowerDbm: number
  criticalRxPowerDbm: number
  warningLatencyMs: number
  criticalLatencyMs: number
  warningPacketLossPercent: number
  criticalPacketLossPercent: number
  warningTrafficLoadPercent: number
  criticalTrafficLoadPercent: number
}

export type EntelNode = {
  id: string
  name: string
  lat: number
  lon: number
  layer: NetworkLayer
  type: NetworkNodeType
  region: string
  parent?: string | null
  datacenter?: boolean
  gateway?: boolean
  metrics: NodeMetrics
  thresholds: Pick<
    MetricThresholds,
    | "warningLatencyMs"
    | "criticalLatencyMs"
    | "warningPacketLossPercent"
    | "criticalPacketLossPercent"
    | "warningTrafficLoadPercent"
    | "criticalTrafficLoadPercent"
  >
}

export type EntelLink = {
  id: string
  from: string
  to: string
  km: number
  gbps: number
  layer: NetworkLayer
  type: NetworkLinkType
  waypoints: [number, number][]
  path?: [number, number][]
  latency_ms?: number
  note?: string
  metrics: LinkMetrics
  thresholds: MetricThresholds
  equipment: LinkEquipment
  traceEvents: TraceEvent[]
  protection: LinkProtection
  traffic: TrafficProfile
}

const DEFAULT_LINK_THRESHOLDS: MetricThresholds = {
  warningRxPowerDbm: -18,
  criticalRxPowerDbm: -24,
  warningLatencyMs: 70,
  criticalLatencyMs: 95,
  warningPacketLossPercent: 1,
  criticalPacketLossPercent: 4,
  warningTrafficLoadPercent: 78,
  criticalTrafficLoadPercent: 92,
}

const DEFAULT_NODE_THRESHOLDS: EntelNode["thresholds"] = {
  warningLatencyMs: 35,
  criticalLatencyMs: 75,
  warningPacketLossPercent: 1,
  criticalPacketLossPercent: 4,
  warningTrafficLoadPercent: 80,
  criticalTrafficLoadPercent: 94,
}

type RawNode = Omit<EntelNode, "metrics" | "thresholds" | "type" | "region" | "layer"> & {
  layer?: NetworkLayer
  region?: string
  type?: NetworkNodeType
}

type RawLink = Omit<EntelLink, "equipment" | "metrics" | "protection" | "thresholds" | "traceEvents" | "traffic">

function nodeMetrics(type: NetworkNodeType, datacenter = false): NodeMetrics {
  return {
    latencyMs: datacenter ? 6 : type === "gateway" ? 18 : 10,
    packetLossPercent: 0.02,
    trafficLoadPercent: datacenter ? 68 : type === "gateway" ? 55 : 42,
    availabilityPercent: datacenter ? 99.995 : 99.98,
  }
}

function linkMetrics(link: RawLink): LinkMetrics {
  const baseLatency = link.latency_ms ?? Math.max(3, Math.round(link.km * 0.085 + (link.type === "international" ? 12 : link.type === "distribution" ? 2 : 3)))
  const attenuationDb = Number((link.km * (link.type === "distribution" ? 0.018 : 0.025) + (link.type === "backbone" ? 2.2 : 1.4)).toFixed(2))
  const txPowerDbm = link.type === "backbone" ? 1.5 : link.type === "international" ? 2 : link.type === "distribution" ? -1 : 0.5

  return {
    txPowerDbm,
    rxPowerDbm: Number((txPowerDbm - attenuationDb).toFixed(2)),
    attenuationDb,
    latencyMs: baseLatency,
    jitterMs: link.type === "international" ? 5 : link.type === "distribution" ? 1.2 : 2,
    packetLossPercent: 0.04,
    trafficLoadPercent: link.type === "backbone" ? 54 : link.type === "international" ? 48 : link.type === "distribution" ? 28 : 36,
    availabilityPercent: link.type === "backbone" ? 99.99 : link.type === "distribution" ? 99.7 : 99.95,
  }
}

function linkEquipment(link: RawLink): LinkEquipment {
  return {
    vendor: link.type === "backbone" ? "Huawei" : link.type === "international" ? "Nokia" : link.type === "distribution" ? "FiberHome" : "ZTE",
    model: link.type === "backbone" ? "OSN 8800" : link.type === "international" ? "1830 PSS" : link.type === "distribution" ? "OLT AN6000" : "ZXONE 9700",
    localPort: `${link.from.toUpperCase().slice(0, 4)}-${link.type === "distribution" ? "GPON" : "STM16"}-01`,
    remotePort: `${link.to.toUpperCase().slice(0, 4)}-${link.type === "distribution" ? "GPON" : "STM16"}-01`,
    transceiver: link.type === "distribution" ? "GPON Class B+ 1490/1310 nm" : link.gbps >= 2.5 ? "SFP 2.5G 1550 nm" : "SFP 1G 1310 nm",
    edfa: link.km >= 350 ? "inline" : link.type === "international" ? "booster" : "none",
  }
}

function traceEvents(link: RawLink): TraceEvent[] {
  const events: TraceEvent[] = [
    { km: 0, type: "connector", lossDb: 0.25, status: "ok", description: "Conector origen dentro de rango." },
  ]

  if (link.km > 20) {
    events.push({
      km: Number((link.km * 0.32).toFixed(1)),
      type: "splice",
      lossDb: 0.08,
      status: "ok",
      description: "Empalme de ruta sin perdida relevante.",
    })
  }

  if (link.km >= 350) {
    events.push({
      km: Number((link.km * 0.56).toFixed(1)),
      type: "edfa",
      lossDb: 0,
      status: "ok",
      description: "Repetidor/amplificacion EDFA operativo.",
    })
  }

  events.push({
    km: Math.max(0, link.km),
    type: "connector",
    lossDb: link.type === "distribution" ? 0.18 : 0.28,
    status: "ok",
    description: "Conector destino dentro de rango.",
  })

  return events
}

function protection(link: RawLink): LinkProtection {
  if (link.id === "lp_cb") {
    return {
      type: "SDH APS",
      primaryPath: ["lp_cb"],
      backupPath: ["lp_de", "aps_virtual_de_cb"],
    }
  }

  if (link.type === "backbone") {
    return {
      type: "SDH APS",
      primaryPath: [link.id],
      backupPath: ["lp_or", "or_cb", "cb_sc"].filter((id) => id !== link.id),
    }
  }

  if (link.type === "international") {
    return {
      type: "MPLS reroute",
      primaryPath: [link.id],
      backupPath: ["lp_de", "ro_pq", "pq_br"].filter((id) => id !== link.id),
    }
  }

  return {
    type: "No protection",
    primaryPath: [link.id],
    backupPath: [],
  }
}

function traffic(link: RawLink): TrafficProfile {
  const normalGbps = Number((link.gbps * (link.type === "backbone" ? 0.54 : link.type === "international" ? 0.48 : link.type === "distribution" ? 0.28 : 0.36)).toFixed(2))

  return {
    normalGbps,
    switchedGbps: 0,
    lostGbps: 0,
    remainingCapacityGbps: Number((link.gbps - normalGbps).toFixed(2)),
  }
}

function createNode(node: RawNode): EntelNode {
  const type = node.type ?? (node.gateway ? "gateway" : node.layer === "distribution" ? "distribution" : "core")

  return {
    ...node,
    layer: node.layer ?? "backbone",
    region: node.region ?? (node.layer === "distribution" ? "Cochabamba Metropolitana" : "Backbone nacional"),
    type,
    metrics: nodeMetrics(type, node.datacenter),
    thresholds: DEFAULT_NODE_THRESHOLDS,
  }
}

function createLink(link: RawLink): EntelLink {
  return {
    ...link,
    equipment: linkEquipment(link),
    metrics: linkMetrics(link),
    protection: protection(link),
    thresholds: DEFAULT_LINK_THRESHOLDS,
    traceEvents: traceEvents(link),
    traffic: traffic(link),
  }
}

export const BACKBONE_NODES: EntelNode[] = [
  createNode({ id: "la_paz", name: "La Paz", lat: -16.4897, lon: -68.1193 }),
  createNode({ id: "cochabamba", name: "Cochabamba", lat: -17.3895, lon: -66.1568, datacenter: true }),
  createNode({ id: "santa_cruz", name: "Santa Cruz", lat: -17.7863, lon: -63.1812 }),
  createNode({ id: "oruro", name: "Oruro", lat: -17.9834, lon: -67.1066 }),
  createNode({ id: "potosi", name: "Potosi", lat: -19.5836, lon: -65.7531 }),
  createNode({ id: "sucre", name: "Sucre", lat: -19.0434, lon: -65.2592 }),
  createNode({ id: "tarija", name: "Tarija", lat: -21.5355, lon: -64.7296 }),
  createNode({ id: "trinidad", name: "Trinidad", lat: -14.8333, lon: -64.9 }),
  createNode({ id: "robore", name: "Robore", lat: -18.3333, lon: -59.75 }),
  createNode({ id: "desaguadero", name: "Desaguadero", lat: -16.5656, lon: -69.0348, gateway: true }),
  createNode({ id: "tambo_quemado", name: "Tambo Quemado", lat: -18.2847, lon: -69.0714, gateway: true }),
  createNode({ id: "yacuiba", name: "Yacuiba", lat: -22.0526, lon: -63.6833, gateway: true }),
  createNode({ id: "puerto_quijarro", name: "Puerto Quijarro", lat: -17.78, lon: -57.72, gateway: true }),
]

const BACKBONE_ROUTE_PATHS: Record<string, [number, number][]> = {
  or_cb: [
    [-17.9834, -67.1066],
    [-17.955, -67.092],
    [-17.925, -67.074],
    [-17.889, -67.046],
    [-17.84, -67.012],
    [-17.786, -66.988],
    [-17.72, -66.968],
    [-17.65, -66.95],
    [-17.602, -66.885],
    [-17.558, -66.812],
    [-17.518, -66.724],
    [-17.476, -66.622],
    [-17.436, -66.522],
    [-17.404, -66.438],
    [-17.395, -66.372],
    [-17.399, -66.335],
    [-17.395, -66.298],
    [-17.3944, -66.2833],
    [-17.387, -66.25],
    [-17.3895, -66.1568],
  ],
  lp_cb: [
    [-16.4897, -68.1193],
    [-16.5, -68.15],
    [-16.61, -68.17],
    [-16.78, -68.12],
    [-16.96, -68.02],
    [-17.2333, -67.9167],
    [-17.42, -67.75],
    [-17.62, -67.52],
    [-17.81, -67.27],
    [-17.9834, -67.1066],
    [-17.955, -67.092],
    [-17.889, -67.046],
    [-17.786, -66.988],
    [-17.65, -66.95],
    [-17.558, -66.812],
    [-17.476, -66.622],
    [-17.404, -66.438],
    [-17.399, -66.335],
    [-17.3944, -66.2833],
    [-17.387, -66.25],
    [-17.3895, -66.1568],
  ],
  cb_sc: [
    [-17.3895, -66.1568],
    [-17.389, -66.132],
    [-17.386, -66.108],
    [-17.3833, -66.0333],
    [-17.376, -65.998],
    [-17.356, -65.935],
    [-17.338, -65.862],
    [-17.3167, -65.7667],
    [-17.295, -65.706],
    [-17.25, -65.65],
    [-17.195, -65.56],
    [-17.13, -65.505],
    [-17.08, -65.47],
    [-16.9833, -65.4167],
    [-16.972, -65.31],
    [-16.97, -65.15],
    [-16.985, -64.98],
    [-17.01, -64.8],
    [-17.06, -64.55],
    [-17.1, -64.2],
    [-17.18, -64.08],
    [-17.28, -63.95],
    [-17.5, -63.7],
    [-17.62, -63.52],
    [-17.67, -63.42],
    [-17.72, -63.31],
    [-17.7863, -63.1812],
  ],
  cb_po: [
    [-17.3895, -66.1568],
    [-17.401, -66.132],
    [-17.417, -66.101],
    [-17.438, -66.058],
    [-17.466, -66.014],
    [-17.496, -65.963],
    [-17.525, -65.902],
    [-17.55, -65.8333],
    [-17.566, -65.86],
    [-17.586, -65.885],
    [-17.6, -65.9333],
    [-17.6167, -66.0167],
    [-17.82, -65.94],
    [-18.06, -65.78],
    [-18.32, -65.56],
    [-18.7, -65.2],
    [-19.0434, -65.2592],
    [-19.18, -65.35],
    [-19.26, -65.43],
    [-19.42, -65.61],
    [-19.5836, -65.7531],
  ],
}

export const BACKBONE_LINKS: EntelLink[] = [
  createLink({ id: "lp_or", from: "la_paz", to: "oruro", km: 230, gbps: 2.5, layer: "backbone", type: "backbone", waypoints: [[-16.4897, -68.1193], [-16.5, -68.15], [-17.2333, -67.9167], [-17.9834, -67.1066]] }),
  createLink({ id: "lp_de", from: "la_paz", to: "desaguadero", km: 100, gbps: 2.5, layer: "backbone", type: "international", latency_ms: 55, waypoints: [[-16.4897, -68.1193], [-16.56, -68.69], [-16.5656, -69.0348]] }),
  createLink({ id: "or_tq", from: "oruro", to: "tambo_quemado", km: 220, gbps: 1, layer: "backbone", type: "international", waypoints: [[-17.9834, -67.1066], [-18.1, -68], [-18.2847, -69.0714]] }),
  createLink({ id: "or_cb", from: "oruro", to: "cochabamba", km: 210, gbps: 2.5, layer: "backbone", type: "backbone", waypoints: [[-17.9834, -67.1066], [-17.65, -66.95], [-17.4, -66.45], [-17.3944, -66.2833], [-17.3895, -66.1568]], path: BACKBONE_ROUTE_PATHS.or_cb }),
  createLink({ id: "lp_cb", from: "la_paz", to: "cochabamba", km: 395, gbps: 2.5, layer: "backbone", type: "backbone", waypoints: [[-16.4897, -68.1193], [-17.2333, -67.9167], [-17.9834, -67.1066], [-17.65, -66.95], [-17.3944, -66.2833], [-17.3895, -66.1568]], path: BACKBONE_ROUTE_PATHS.lp_cb }),
  createLink({ id: "cb_sc", from: "cochabamba", to: "santa_cruz", km: 500, gbps: 2.5, layer: "backbone", type: "backbone", waypoints: [[-17.3895, -66.1568], [-17.3833, -66.0333], [-17.3167, -65.7667], [-16.9833, -65.4167], [-16.97, -65.15], [-17.1, -64.2], [-17.5, -63.7], [-17.7863, -63.1812]], path: BACKBONE_ROUTE_PATHS.cb_sc }),
  createLink({ id: "cb_po", from: "cochabamba", to: "potosi", km: 320, gbps: 1, layer: "backbone", type: "regional", waypoints: [[-17.3895, -66.1568], [-17.55, -65.8333], [-17.6167, -66.0167], [-19.0434, -65.2592], [-19.5836, -65.7531]], path: BACKBONE_ROUTE_PATHS.cb_po }),
  createLink({ id: "su_ta", from: "sucre", to: "tarija", km: 395, gbps: 1, layer: "backbone", type: "regional", waypoints: [[-19.0434, -65.2592], [-20, -65.2], [-21.5355, -64.7296]] }),
  createLink({ id: "ta_ya", from: "tarija", to: "yacuiba", km: 165, gbps: 1, layer: "backbone", type: "international", waypoints: [[-21.5355, -64.7296], [-22.0526, -63.6833]] }),
  createLink({ id: "sc_ro", from: "santa_cruz", to: "robore", km: 430, gbps: 1, layer: "backbone", type: "regional", waypoints: [[-17.7863, -63.1812], [-17.6, -62], [-18.3333, -59.75]] }),
  createLink({ id: "ro_pq", from: "robore", to: "puerto_quijarro", km: 180, gbps: 1, layer: "backbone", type: "international", waypoints: [[-18.3333, -59.75], [-18.9667, -57.7833], [-17.78, -57.72]] }),
  createLink({ id: "sc_tr", from: "santa_cruz", to: "trinidad", km: 600, gbps: 1, layer: "backbone", type: "regional", waypoints: [[-17.7863, -63.1812], [-15.8, -64.7], [-14.8333, -64.9]] }),
]

export const DISTRIBUTION_NODES_CBBA: EntelNode[] = [
  createNode({ id: "cbba_central", name: "Cochabamba Centro", lat: -17.3895, lon: -66.1568, layer: "distribution", parent: null }),
  createNode({ id: "sacaba", name: "Sacaba", lat: -17.3833, lon: -66.0333, layer: "distribution", parent: "cbba_central" }),
  createNode({ id: "colcapirhua", name: "Colcapirhua", lat: -17.3833, lon: -66.25, layer: "distribution", parent: "cbba_central" }),
  createNode({ id: "quillacollo", name: "Quillacollo", lat: -17.3944, lon: -66.2833, layer: "distribution", parent: "colcapirhua" }),
  createNode({ id: "vinto", name: "Vinto", lat: -17.4, lon: -66.35, layer: "distribution", parent: "quillacollo" }),
  createNode({ id: "sipe_sipe", name: "Sipe Sipe", lat: -17.4667, lon: -66.4167, layer: "distribution", parent: "vinto" }),
  createNode({ id: "tiquipaya", name: "Tiquipaya", lat: -17.3333, lon: -66.2167, layer: "distribution", parent: "cbba_central" }),
  createNode({ id: "colomi", name: "Colomi", lat: -17.3167, lon: -65.7667, layer: "distribution", parent: "sacaba" }),
  createNode({ id: "punata", name: "Punata", lat: -17.55, lon: -65.8333, layer: "distribution", parent: "cbba_central" }),
  createNode({ id: "cliza", name: "Cliza", lat: -17.6, lon: -65.9333, layer: "distribution", parent: "punata" }),
  createNode({ id: "tarata", name: "Tarata", lat: -17.6167, lon: -66.0167, layer: "distribution", parent: "punata" }),
  createNode({ id: "santivanez", name: "Santivanez (DC)", lat: -17.5492, lon: -66.2502, layer: "distribution", parent: "cbba_central", datacenter: true }),
]

const DISTRIBUTION_ROUTE_HINTS: Record<string, [number, number][]> = {
  sacaba: [
    [-17.389, -66.145],
    [-17.386, -66.13],
    [-17.382, -66.112],
    [-17.379, -66.088],
    [-17.381, -66.055],
  ],
  colcapirhua: [
    [-17.389, -66.173],
    [-17.388, -66.19],
    [-17.386, -66.212],
    [-17.384, -66.234],
  ],
  quillacollo: [
    [-17.384, -66.257],
    [-17.386, -66.267],
    [-17.39, -66.276],
  ],
  vinto: [
    [-17.395, -66.298],
    [-17.397, -66.315],
    [-17.399, -66.334],
  ],
  sipe_sipe: [
    [-17.405, -66.362],
    [-17.414, -66.374],
    [-17.427, -66.388],
    [-17.444, -66.402],
    [-17.459, -66.412],
  ],
  tiquipaya: [
    [-17.379, -66.164],
    [-17.368, -66.176],
    [-17.357, -66.19],
    [-17.344, -66.204],
  ],
  colomi: [
    [-17.379, -66.01],
    [-17.365, -65.978],
    [-17.352, -65.94],
    [-17.344, -65.902],
    [-17.336, -65.862],
    [-17.326, -65.815],
  ],
  punata: [
    [-17.401, -66.132],
    [-17.417, -66.101],
    [-17.438, -66.058],
    [-17.466, -66.014],
    [-17.496, -65.963],
    [-17.525, -65.902],
    [-17.544, -65.86],
  ],
  cliza: [
    [-17.559, -65.852],
    [-17.572, -65.865],
    [-17.586, -65.885],
    [-17.596, -65.912],
  ],
  tarata: [
    [-17.562, -65.858],
    [-17.574, -65.884],
    [-17.588, -65.923],
    [-17.603, -65.972],
    [-17.611, -65.998],
  ],
  santivanez: [
    [-17.404, -66.166],
    [-17.422, -66.177],
    [-17.447, -66.193],
    [-17.473, -66.211],
    [-17.504, -66.232],
    [-17.532, -66.245],
  ],
}

const DISTRIBUTION_ROUTE_PATHS: Record<string, [number, number][]> = {
  sacaba: [
    [-17.3895, -66.1568],
    [-17.389, -66.149],
    [-17.389, -66.141],
    [-17.386, -66.13],
    [-17.384, -66.121],
    [-17.382, -66.112],
    [-17.38, -66.101],
    [-17.379, -66.088],
    [-17.38, -66.074],
    [-17.381, -66.055],
    [-17.3833, -66.0333],
  ],
  colcapirhua: [
    [-17.3895, -66.1568],
    [-17.389, -66.166],
    [-17.389, -66.173],
    [-17.388, -66.183],
    [-17.388, -66.19],
    [-17.387, -66.202],
    [-17.386, -66.212],
    [-17.385, -66.224],
    [-17.384, -66.234],
    [-17.3833, -66.25],
  ],
  quillacollo: [
    [-17.3833, -66.25],
    [-17.384, -66.257],
    [-17.386, -66.267],
    [-17.389, -66.274],
    [-17.391, -66.279],
    [-17.3944, -66.2833],
  ],
  vinto: [
    [-17.3944, -66.2833],
    [-17.395, -66.298],
    [-17.396, -66.306],
    [-17.397, -66.315],
    [-17.398, -66.324],
    [-17.399, -66.334],
    [-17.4, -66.35],
  ],
  sipe_sipe: [
    [-17.4, -66.35],
    [-17.405, -66.362],
    [-17.414, -66.374],
    [-17.421, -66.382],
    [-17.427, -66.388],
    [-17.436, -66.396],
    [-17.444, -66.402],
    [-17.452, -66.408],
    [-17.459, -66.412],
    [-17.4667, -66.4167],
  ],
  tiquipaya: [
    [-17.3895, -66.1568],
    [-17.384, -66.159],
    [-17.379, -66.164],
    [-17.373, -66.17],
    [-17.368, -66.176],
    [-17.362, -66.184],
    [-17.357, -66.19],
    [-17.351, -66.198],
    [-17.344, -66.204],
    [-17.338, -66.211],
    [-17.3333, -66.2167],
  ],
  colomi: [
    [-17.3833, -66.0333],
    [-17.382, -66.02],
    [-17.379, -66.01],
    [-17.373, -65.994],
    [-17.365, -65.978],
    [-17.358, -65.958],
    [-17.352, -65.94],
    [-17.347, -65.92],
    [-17.344, -65.902],
    [-17.34, -65.882],
    [-17.336, -65.862],
    [-17.331, -65.84],
    [-17.326, -65.815],
    [-17.3167, -65.7667],
  ],
  punata: [
    [-17.3895, -66.1568],
    [-17.395, -66.146],
    [-17.401, -66.132],
    [-17.408, -66.118],
    [-17.417, -66.101],
    [-17.428, -66.08],
    [-17.438, -66.058],
    [-17.452, -66.034],
    [-17.466, -66.014],
    [-17.482, -65.991],
    [-17.496, -65.963],
    [-17.511, -65.932],
    [-17.525, -65.902],
    [-17.538, -65.876],
    [-17.544, -65.86],
    [-17.55, -65.8333],
  ],
  cliza: [
    [-17.55, -65.8333],
    [-17.559, -65.852],
    [-17.566, -65.858],
    [-17.572, -65.865],
    [-17.579, -65.876],
    [-17.586, -65.885],
    [-17.592, -65.899],
    [-17.596, -65.912],
    [-17.6, -65.9333],
  ],
  tarata: [
    [-17.55, -65.8333],
    [-17.562, -65.858],
    [-17.568, -65.872],
    [-17.574, -65.884],
    [-17.581, -65.904],
    [-17.588, -65.923],
    [-17.596, -65.949],
    [-17.603, -65.972],
    [-17.611, -65.998],
    [-17.6167, -66.0167],
  ],
  santivanez: [
    [-17.3895, -66.1568],
    [-17.396, -66.16],
    [-17.404, -66.166],
    [-17.412, -66.171],
    [-17.422, -66.177],
    [-17.434, -66.185],
    [-17.447, -66.193],
    [-17.46, -66.202],
    [-17.473, -66.211],
    [-17.489, -66.222],
    [-17.504, -66.232],
    [-17.518, -66.239],
    [-17.532, -66.245],
    [-17.5492, -66.2502],
  ],
}

function distributionLinkFor(node: EntelNode): EntelLink | null {
  if (!node.parent) return null

  const parent = DISTRIBUTION_NODES_CBBA.find((item) => item.id === node.parent)

  if (!parent) return null

  const hints = DISTRIBUTION_ROUTE_HINTS[node.id] ?? []
  const path = DISTRIBUTION_ROUTE_PATHS[node.id]
  const km = Math.max(6, Math.round((Math.abs(node.lat - parent.lat) + Math.abs(node.lon - parent.lon)) * 90))

  return createLink({
    id: `dist_${parent.id}_${node.id}`,
    from: parent.id,
    to: node.id,
    km,
    gbps: node.datacenter ? 2.5 : 0.5,
    layer: "distribution",
    type: "distribution",
    path,
    waypoints: [[parent.lat, parent.lon], ...hints, [node.lat, node.lon]],
  })
}

export const DISTRIBUTION_LINKS_CBBA: EntelLink[] = DISTRIBUTION_NODES_CBBA
  .map(distributionLinkFor)
  .filter((link): link is EntelLink => Boolean(link))

export const ENTEL_NODES: EntelNode[] = [...BACKBONE_NODES, ...DISTRIBUTION_NODES_CBBA]

export const ENTEL_LINKS: EntelLink[] = [...BACKBONE_LINKS, ...DISTRIBUTION_LINKS_CBBA]
