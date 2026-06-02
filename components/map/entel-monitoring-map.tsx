"use client"

import type { ComponentType } from "react"
import { useEffect, useMemo, useState } from "react"
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  Clock3Icon,
  GaugeIcon,
  ListTreeIcon,
  NetworkIcon,
  ServerIcon,
  TerminalIcon,
  RadioTowerIcon,
  RotateCcwIcon,
  RouteIcon,
  ShieldAlertIcon,
  ZapIcon,
} from "lucide-react"
import { CircleMarker, MapContainer, Polygon, Polyline, Popup, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  ENTEL_LINKS,
  ENTEL_NODES,
  type AlarmSeverity,
  type AlarmType,
  type EntelLink,
  type LinkMetrics,
  type NetworkLayer,
  type NetworkStatus,
  type NodeMetrics,
  type TraceEvent,
} from "@/lib/fibermap/entel-network"
import { cn } from "@/lib/utils"

type AlarmRecord = {
  id: string
  scenarioId: string
  title: string
  description: string
  severity: AlarmSeverity
  alarmType: AlarmType
  elementId: string
  elementType: "link" | "node"
  startedAt: Date
  acknowledgedAt?: Date
  repairedAt?: Date
  resolvedAt?: Date
  affectedLinks: string[]
  affectedNodes: string[]
  rerouteLinks?: string[]
  probableCause: string
  evidence: string[]
  recommendation: string
  switchedTrafficGbps?: number
  remainingCapacityGbps?: number
  traceOverrides?: Record<string, TraceEvent[]>
}

type Scenario = {
  id: string
  title: string
  description: string
  severity: AlarmSeverity
  alarmType: AlarmType
  elementId: string
  elementType: "link" | "node"
  affectedLinks: string[]
  affectedNodes?: string[]
  linkMetricPatches?: Record<string, Partial<LinkMetrics>>
  nodeMetricPatches?: Record<string, Partial<NodeMetrics>>
  rerouteLinks?: string[]
  probableCause: string
  evidence: string[]
  recommendation: string
  switchedTrafficGbps?: number
  remainingCapacityGbps?: number
  traceOverrides?: Record<string, TraceEvent[]>
}

const NETWORK_CENTER: [number, number] = [-17.9, -64.4]

const STATUS_META: Record<NetworkStatus, { label: string; color: string; className: string }> = {
  ok: { label: "Operativo", color: "#16a34a", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  warning: { label: "Advertencia", color: "#eab308", className: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  critical: { label: "Critico", color: "#dc2626", className: "bg-red-500/10 text-red-700 dark:text-red-300" },
  unknown: { label: "Desconocido", color: "#6b7280", className: "bg-slate-500/10 text-slate-700 dark:text-slate-300" },
}

const SEVERITY_META: Record<AlarmSeverity, { label: string; className: string }> = {
  info: { label: "Info", className: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  minor: { label: "Menor", className: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  major: { label: "Mayor", className: "bg-orange-500/10 text-orange-700 dark:text-orange-300" },
  critical: { label: "Critica", className: "bg-red-500/10 text-red-700 dark:text-red-300" },
}

const SCENARIOS: Scenario[] = [
  {
    id: "cut-robore-pq",
    title: "Corte fisico Robore-Puerto Quijarro",
    description: "Corte fisico detectado en tramo km ~80, zona Chiquitania.",
    severity: "critical",
    alarmType: "fiber_cut",
    elementId: "ro_pq",
    elementType: "link",
    affectedLinks: ["ro_pq"],
    linkMetricPatches: {
      ro_pq: { rxPowerDbm: -42, attenuationDb: 45, latencyMs: 0, jitterMs: 0, packetLossPercent: 100, trafficLoadPercent: 0, availabilityPercent: 0 },
    },
    probableCause: "Corte fisico o perdida completa de continuidad optica.",
    evidence: ["Corte fisico detectado en tramo km ~80", "RX optico fuera de rango", "Perdida de paquetes 100%"],
    recommendation: "Escalar a cuadrilla de campo y aislar el tramo Robore-Puerto Quijarro.",
    traceOverrides: {
      ro_pq: [
        { km: 0, type: "connector", lossDb: 0.25, status: "ok", description: "Conector origen operativo." },
        { km: 80, type: "cut", lossDb: 45, status: "critical", description: "Reflectancia abrupta compatible con corte de fibra, zona Chiquitania." },
      ],
    },
  },
  {
    id: "loss-lp-desaguadero",
    title: "Degradacion senal La Paz-Desaguadero",
    description: "Perdida de potencia optica: -3 dBm por debajo del umbral.",
    severity: "major",
    alarmType: "optical_degradation",
    elementId: "lp_de",
    elementType: "link",
    affectedLinks: ["lp_de"],
    linkMetricPatches: {
      lp_de: { rxPowerDbm: -21.7, attenuationDb: 23.7, jitterMs: 9, packetLossPercent: 1.8, trafficLoadPercent: 64, availabilityPercent: 99.2 },
    },
    probableCause: "Empalme degradado, macrocurvatura o conector sucio en el tramo internacional.",
    evidence: ["Perdida de potencia optica: -3 dBm por debajo del umbral", "Atenuacion estimada +5.8 dB", "Jitter y perdida de paquetes elevados"],
    recommendation: "Medir con OTDR, limpiar conectores y revisar empalmes cercanos al gateway.",
    traceOverrides: {
      lp_de: [
        { km: 0, type: "connector", lossDb: 0.32, status: "ok", description: "Conector La Paz con perdida aceptable." },
        { km: 38.2, type: "high_loss", lossDb: 5.8, status: "warning", description: "Evento de alta perdida detectado; posible macrocurvatura o empalme degradado." },
        { km: 100, type: "connector", lossDb: 0.4, status: "ok", description: "Conector Desaguadero operativo." },
      ],
    },
  },
  {
    id: "edfa-cb-sc",
    title: "Fallo amplificador EDFA Cochabamba-Santa Cruz",
    description: "EDFA offline en repetidor Villa Tunari, km 280.",
    severity: "critical",
    alarmType: "edfa_failure",
    elementId: "cb_sc",
    elementType: "link",
    affectedLinks: ["cb_sc"],
    linkMetricPatches: {
      cb_sc: { rxPowerDbm: -30.5, attenuationDb: 31, latencyMs: 52, jitterMs: 18, packetLossPercent: 12, trafficLoadPercent: 22, availabilityPercent: 72 },
    },
    probableCause: "Fallo de amplificador EDFA o perdida de bombeo optico.",
    evidence: ["EDFA offline en repetidor Villa Tunari, km 280", "RX critico", "Perdida de paquetes mayor a 4%"],
    recommendation: "Verificar energia del EDFA, laser pump y nivel optico antes/despues del amplificador.",
    traceOverrides: {
      cb_sc: [
        { km: 0, type: "connector", lossDb: 0.24, status: "ok", description: "Conector Santa Cruz operativo." },
        { km: 280, type: "edfa", lossDb: 0, status: "critical", description: "EDFA offline en Villa Tunari; revisar fuente y pump laser." },
        { km: 500, type: "connector", lossDb: 0.31, status: "warning", description: "Nivel recibido degradado en Santa Cruz." },
      ],
    },
  },
  {
    id: "aps-backbone",
    title: "Conmutacion APS activa",
    description: "APS activado, trafico redirigido en <50 ms.",
    severity: "major",
    alarmType: "aps_switch",
    elementId: "lp_cb",
    elementType: "link",
    affectedLinks: ["lp_cb"],
    rerouteLinks: ["lp_de"],
    linkMetricPatches: {
      lp_cb: { rxPowerDbm: -36, latencyMs: 0, jitterMs: 0, packetLossPercent: 100, trafficLoadPercent: 0, availabilityPercent: 0 },
      lp_de: { latencyMs: 57, jitterMs: 6, packetLossPercent: 0.5, trafficLoadPercent: 82, availabilityPercent: 99.4 },
    },
    probableCause: "Falla de backbone con proteccion SDH APS ejecutada correctamente.",
    evidence: ["APS activado, trafico redirigido en <50 ms", "Tramo principal sin respuesta", "Ruta alternativa con carga superior a 80%"],
    recommendation: "Mantener APS activo, vigilar saturacion y restaurar La Paz-Cochabamba.",
    switchedTrafficGbps: 1.8,
    remainingCapacityGbps: 0.7,
    traceOverrides: {
      lp_cb: [
        { km: 0, type: "connector", lossDb: 0.23, status: "ok", description: "Conector La Paz operativo." },
        { km: 184.5, type: "cut", lossDb: 36, status: "critical", description: "Tramo principal sin continuidad; APS conmuta trafico." },
      ],
    },
  },
  {
    id: "latency-brasil",
    title: "Latencia anomala Gateway Brasil",
    description: "Gateway Brasil con latencia simulada de 180 ms vs normal 55 ms.",
    severity: "minor",
    alarmType: "latency_anomaly",
    elementId: "puerto_quijarro",
    elementType: "node",
    affectedLinks: ["ro_pq"],
    affectedNodes: ["puerto_quijarro"],
    linkMetricPatches: {
      ro_pq: { latencyMs: 180, jitterMs: 28, packetLossPercent: 1.2, trafficLoadPercent: 74, availabilityPercent: 98.9 },
    },
    nodeMetricPatches: {
      puerto_quijarro: { latencyMs: 180, packetLossPercent: 1.2, trafficLoadPercent: 74, availabilityPercent: 98.9 },
    },
    probableCause: "Congestion o degradacion en gateway internacional hacia Brasil.",
    evidence: ["Latencia simulada 180 ms vs normal 55 ms", "Jitter internacional elevado", "Perdida de paquetes sobre 1%"],
    recommendation: "Comparar con gateway Pacifico y revisar proveedor de transito hacia Sao Paulo.",
  },
  {
    id: "cbba-dc-santivanez",
    title: "Falla critica Data Center Santivanez",
    description: "Nodo DC Santivanez con perdida de disponibilidad; impacto metropolitano y nacional.",
    severity: "critical",
    alarmType: "capacity_saturation",
    elementId: "santivanez",
    elementType: "node",
    affectedLinks: ["dist_cbba_central_santivanez"],
    affectedNodes: ["santivanez"],
    linkMetricPatches: {
      dist_cbba_central_santivanez: { rxPowerDbm: -31, attenuationDb: 18, latencyMs: 42, jitterMs: 16, packetLossPercent: 8.5, trafficLoadPercent: 96, availabilityPercent: 81 },
    },
    nodeMetricPatches: {
      santivanez: { latencyMs: 78, packetLossPercent: 6.2, trafficLoadPercent: 98, availabilityPercent: 88 },
    },
    probableCause: "Falla de energia o conmutacion en sala tecnica del Data Center Santivanez.",
    evidence: ["Disponibilidad DC por debajo de 95%", "Carga critica 98%", "Perdida sobre 6% en enlace de distribucion"],
    recommendation: "Escalar prioridad maxima, validar UPS/generador y verificar uplink al nodo central Cbba.",
    traceOverrides: {
      dist_cbba_central_santivanez: [
        { km: 0, type: "connector", lossDb: 0.18, status: "ok", description: "Puerto OLT central operativo." },
        { km: 9.8, type: "high_loss", lossDb: 8.4, status: "critical", description: "Alta perdida hacia Santivanez, posible daño en feeder o patch panel DC." },
      ],
    },
  },
  {
    id: "cbba-sacaba-colomi",
    title: "Corte distribucion Sacaba-Colomi",
    description: "Corte en subida a Colomi; clientes GPON del valle alto quedan sin servicio.",
    severity: "major",
    alarmType: "fiber_cut",
    elementId: "dist_sacaba_colomi",
    elementType: "link",
    affectedLinks: ["dist_sacaba_colomi"],
    affectedNodes: ["colomi"],
    linkMetricPatches: {
      dist_sacaba_colomi: { rxPowerDbm: -39, attenuationDb: 32, latencyMs: 0, jitterMs: 0, packetLossPercent: 100, trafficLoadPercent: 0, availabilityPercent: 0 },
    },
    nodeMetricPatches: {
      colomi: { latencyMs: 0, packetLossPercent: 100, trafficLoadPercent: 0, availabilityPercent: 0 },
    },
    probableCause: "Corte de fibra en tramo de serrania entre Sacaba y Colomi.",
    evidence: ["OTDR muestra evento abrupto", "Perdida de paquetes 100%", "Nodo Colomi sin telemetria"],
    recommendation: "Enviar cuadrilla a ruta antigua a Santa Cruz y revisar camaras de empalme en serrania.",
    traceOverrides: {
      dist_sacaba_colomi: [
        { km: 0, type: "connector", lossDb: 0.2, status: "ok", description: "Conector Sacaba operativo." },
        { km: 17.4, type: "cut", lossDb: 32, status: "critical", description: "Corte probable en subida a Colomi." },
      ],
    },
  },
  {
    id: "cbba-quillacollo-vinto",
    title: "Degradacion Quillacollo-Vinto",
    description: "Atenuacion elevada en troncal oeste metropolitana.",
    severity: "major",
    alarmType: "optical_degradation",
    elementId: "dist_quillacollo_vinto",
    elementType: "link",
    affectedLinks: ["dist_quillacollo_vinto"],
    linkMetricPatches: {
      dist_quillacollo_vinto: { rxPowerDbm: -22.4, attenuationDb: 15.2, latencyMs: 12, jitterMs: 5, packetLossPercent: 1.7, trafficLoadPercent: 67, availabilityPercent: 98.6 },
    },
    probableCause: "Empalme humedo o conector degradado en ruta Quillacollo-Vinto.",
    evidence: ["RX bajo umbral warning", "Atenuacion elevada", "Jitter sobre valor normal GPON"],
    recommendation: "Medir potencia en ODF Quillacollo y revisar caja de empalme hacia Vinto.",
    traceOverrides: {
      dist_quillacollo_vinto: [
        { km: 0, type: "connector", lossDb: 0.16, status: "ok", description: "Puerto Quillacollo operativo." },
        { km: 4.2, type: "high_loss", lossDb: 4.9, status: "warning", description: "Evento de perdida no reflectiva, posible empalme humedo." },
        { km: 7, type: "connector", lossDb: 0.22, status: "ok", description: "Conector Vinto dentro de rango." },
      ],
    },
  },
  {
    id: "cbba-punata-cliza",
    title: "Saturacion OLT Punata-Cliza",
    description: "Carga elevada en rama de distribucion Punata-Cliza.",
    severity: "minor",
    alarmType: "capacity_saturation",
    elementId: "dist_punata_cliza",
    elementType: "link",
    affectedLinks: ["dist_punata_cliza"],
    linkMetricPatches: {
      dist_punata_cliza: { latencyMs: 28, jitterMs: 11, packetLossPercent: 0.9, trafficLoadPercent: 91, availabilityPercent: 99.1 },
    },
    probableCause: "Congestion en puerto GPON por alta demanda residencial.",
    evidence: ["Carga sobre 90%", "Jitter elevado", "Latencia superior al promedio metropolitano"],
    recommendation: "Balancear ONTs, migrar splitters saturados o ampliar puerto PON.",
  },
  {
    id: "cbba-tiquipaya",
    title: "Microcorte Tiquipaya",
    description: "Microcortes intermitentes hacia Tiquipaya con perdida baja pero recurrente.",
    severity: "minor",
    alarmType: "optical_degradation",
    elementId: "dist_cbba_central_tiquipaya",
    elementType: "link",
    affectedLinks: ["dist_cbba_central_tiquipaya"],
    affectedNodes: ["tiquipaya"],
    linkMetricPatches: {
      dist_cbba_central_tiquipaya: { rxPowerDbm: -18.9, attenuationDb: 9.5, latencyMs: 16, jitterMs: 7, packetLossPercent: 1.3, trafficLoadPercent: 58, availabilityPercent: 97.8 },
    },
    nodeMetricPatches: {
      tiquipaya: { latencyMs: 18, packetLossPercent: 1.4, trafficLoadPercent: 58, availabilityPercent: 97.8 },
    },
    probableCause: "Macrocurvatura o caja de distribucion inestable en salida norte.",
    evidence: ["Perdida intermitente superior a 1%", "RX cerca del umbral warning", "Jitter variable"],
    recommendation: "Inspeccionar caja terminal y reserva de fibra en la ruta norte a Tiquipaya.",
  },
]

function MonitoringViewport() {
  const map = useMap()

  useEffect(() => {
    map.invalidateSize()
    const timeout = window.setTimeout(() => map.invalidateSize(), 300)

    return () => window.clearTimeout(timeout)
  }, [map])

  return null
}

function MapZoomWatcher({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  const map = useMapEvents({
    zoomend() {
      onZoomChange(map.getZoom())
    },
  })

  useEffect(() => {
    onZoomChange(map.getZoom())
  }, [map, onZoomChange])

  return null
}

function getNode(id: string) {
  const node = ENTEL_NODES.find((item) => item.id === id)

  if (!node) throw new Error(`Nodo no encontrado: ${id}`)

  return node
}

function getLinkName(link: EntelLink) {
  if (link.id === "pq_br") return "Puerto Quijarro -> Sao Paulo"

  return `${getNode(link.from).name} -> ${getNode(link.to).name}`
}

function getLinkPositions(link: EntelLink): [number, number][] {
  return link.waypoints
}

function gatewayDiamond(lat: number, lon: number): [number, number][] {
  const size = 0.13

  return [
    [lat + size, lon],
    [lat, lon + size],
    [lat - size, lon],
    [lat, lon - size],
  ]
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits

  return Math.round((value + Number.EPSILON) * factor) / factor
}

function pseudoNoise(id: string, tick: number, spread: number) {
  const seed = id.split("").reduce((total, char) => total + char.charCodeAt(0), 0)

  return Math.sin((tick + seed) * 0.67) * spread
}

function formatUptime(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  return [hours, minutes, remainingSeconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":")
}

function formatDuration(startedAt: Date, resolvedAt?: Date) {
  const seconds = Math.max(0, Math.floor(((resolvedAt ?? new Date()).getTime() - startedAt.getTime()) / 1000))
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  return `${minutes}m ${remainingSeconds}s`
}

function applyLinkNoise(link: EntelLink, metrics: LinkMetrics, tick: number): LinkMetrics {
  if (metrics.availabilityPercent === 0) return metrics

  return {
    ...metrics,
    rxPowerDbm: round(metrics.rxPowerDbm + pseudoNoise(link.id, tick, 0.18)),
    attenuationDb: round(metrics.attenuationDb + pseudoNoise(`${link.id}-att`, tick, 0.12)),
    latencyMs: round(Math.max(0, metrics.latencyMs + pseudoNoise(`${link.id}-lat`, tick, 2)), 1),
    jitterMs: round(Math.max(0, metrics.jitterMs + pseudoNoise(`${link.id}-jit`, tick, 0.8)), 1),
    packetLossPercent: round(clamp(metrics.packetLossPercent + pseudoNoise(`${link.id}-loss`, tick, 0.08), 0, 100), 2),
    trafficLoadPercent: round(clamp(metrics.trafficLoadPercent + pseudoNoise(`${link.id}-traffic`, tick, 2.8), 0, 100), 1),
    availabilityPercent: round(clamp(metrics.availabilityPercent + pseudoNoise(`${link.id}-avail`, tick, 0.02), 0, 100), 3),
  }
}

function applyNodeNoise(nodeId: string, metrics: NodeMetrics, tick: number): NodeMetrics {
  return {
    ...metrics,
    latencyMs: round(Math.max(0, metrics.latencyMs + pseudoNoise(`${nodeId}-nlat`, tick, 1.5)), 1),
    packetLossPercent: round(clamp(metrics.packetLossPercent + pseudoNoise(`${nodeId}-nloss`, tick, 0.06), 0, 100), 2),
    trafficLoadPercent: round(clamp(metrics.trafficLoadPercent + pseudoNoise(`${nodeId}-ntraffic`, tick, 2), 0, 100), 1),
    availabilityPercent: round(clamp(metrics.availabilityPercent + pseudoNoise(`${nodeId}-navail`, tick, 0.015), 0, 100), 3),
  }
}

function evaluateLinkStatus(link: EntelLink, metrics: LinkMetrics): NetworkStatus {
  const t = link.thresholds

  if (
    metrics.availabilityPercent < 95 ||
    metrics.rxPowerDbm <= t.criticalRxPowerDbm ||
    metrics.latencyMs >= t.criticalLatencyMs ||
    metrics.packetLossPercent >= t.criticalPacketLossPercent ||
    metrics.trafficLoadPercent >= t.criticalTrafficLoadPercent
  ) return "critical"

  if (
    metrics.rxPowerDbm <= t.warningRxPowerDbm ||
    metrics.latencyMs >= t.warningLatencyMs ||
    metrics.packetLossPercent >= t.warningPacketLossPercent ||
    metrics.trafficLoadPercent >= t.warningTrafficLoadPercent
  ) return "warning"

  return "ok"
}

function evaluateNodeStatus(nodeId: string, metrics: NodeMetrics): NetworkStatus {
  const node = getNode(nodeId)
  const t = node.thresholds

  if (
    metrics.availabilityPercent < 95 ||
    metrics.latencyMs >= t.criticalLatencyMs ||
    metrics.packetLossPercent >= t.criticalPacketLossPercent ||
    metrics.trafficLoadPercent >= t.criticalTrafficLoadPercent
  ) return "critical"

  if (
    metrics.latencyMs >= t.warningLatencyMs ||
    metrics.packetLossPercent >= t.warningPacketLossPercent ||
    metrics.trafficLoadPercent >= t.warningTrafficLoadPercent
  ) return "warning"

  return "ok"
}

function getLinkColor(link: EntelLink, status: NetworkStatus, isReroute: boolean) {
  if (isReroute) return "#0ea5e9"
  if (status === "warning") return "#eab308"
  if (status === "critical") return "#dc2626"
  if (status === "unknown") return "#6b7280"
  if (link.type === "international") return "#f97316"
  if (link.layer === "distribution") return "#38bdf8"
  if (link.type === "regional") return "#2563eb"

  return "#1d4ed8"
}

function getLinkAnimationClass(status: NetworkStatus, isReroute: boolean, isHighlighted: boolean) {
  if (status === "critical") return "fiber-critical-link"
  if (isReroute) return "fiber-reroute-link"
  if (status === "warning" || isHighlighted) return "fiber-warning-link"

  return undefined
}

function getNodeAnimationClass(status: NetworkStatus) {
  if (status === "critical") return "fiber-node-critical"
  if (status === "warning") return "fiber-node-warning"

  return undefined
}

export function EntelMonitoringMap() {
  const [linkMetricPatches, setLinkMetricPatches] = useState<Record<string, Partial<LinkMetrics>>>({})
  const [nodeMetricPatches, setNodeMetricPatches] = useState<Record<string, Partial<NodeMetrics>>>({})
  const [alarmLog, setAlarmLog] = useState<AlarmRecord[]>([])
  const [selectedLinkId, setSelectedLinkId] = useState("lp_cb")
  const [visibleLayer, setVisibleLayer] = useState<NetworkLayer | "both">("both")
  const [mapZoom, setMapZoom] = useState(6)
  const [uptimeSeconds, setUptimeSeconds] = useState(0)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const interval = window.setInterval(() => {
      setUptimeSeconds((current) => current + 3)
      setTick((current) => current + 1)
    }, 3000)

    return () => window.clearInterval(interval)
  }, [])

  const linkTelemetry = useMemo(() => {
    return Object.fromEntries(
      ENTEL_LINKS.map((link) => {
        const patched = { ...link.metrics, ...linkMetricPatches[link.id] }
        const metrics = applyLinkNoise(link, patched, tick)

        return [link.id, { metrics, status: evaluateLinkStatus(link, metrics) }]
      })
    ) as Record<string, { metrics: LinkMetrics; status: NetworkStatus }>
  }, [linkMetricPatches, tick])

  const nodeTelemetry = useMemo(() => {
    return Object.fromEntries(
      ENTEL_NODES.map((node) => {
        const patched = { ...node.metrics, ...nodeMetricPatches[node.id] }
        const metrics = applyNodeNoise(node.id, patched, tick)

        return [node.id, { metrics, status: evaluateNodeStatus(node.id, metrics) }]
      })
    ) as Record<string, { metrics: NodeMetrics; status: NetworkStatus }>
  }, [nodeMetricPatches, tick])

  const selectedLink = ENTEL_LINKS.find((link) => link.id === selectedLinkId) ?? ENTEL_LINKS[0]
  const selectedTelemetry = linkTelemetry[selectedLink.id]
  const activeAlarms = alarmLog.filter((alarm) => !alarm.resolvedAt)
  const activeScenarioIds = new Set(activeAlarms.map((alarm) => alarm.scenarioId))
  const highlightedLinks = new Set(activeAlarms.flatMap((alarm) => [...alarm.affectedLinks, ...(alarm.rerouteLinks ?? [])]))
  const activeOverlayLinks = ENTEL_LINKS.filter((link) => highlightedLinks.has(link.id))
  const activeNodes = Object.values(nodeTelemetry).filter(({ status }) => status !== "critical" && status !== "unknown").length
  const okLinks = Object.values(linkTelemetry).filter(({ status }) => status === "ok").length
  const criticalLinks = Object.values(linkTelemetry).filter(({ status }) => status === "critical").length
  const gatewayLatency = nodeTelemetry.puerto_quijarro?.metrics.latencyMs ?? 55
  const showBackbone = visibleLayer === "backbone" || visibleLayer === "both"
  const showDistribution = visibleLayer === "distribution" || (visibleLayer === "both" && mapZoom >= 9)
  const visibleLinks = ENTEL_LINKS.filter((link) =>
    (link.layer === "backbone" && showBackbone) ||
    (link.layer === "distribution" && showDistribution)
  )
  const visibleNodes = ENTEL_NODES.filter((node) =>
    node.datacenter ||
    (node.layer === "backbone" && showBackbone) ||
    (node.layer === "distribution" && showDistribution)
  )
  const highestLoadLink = ENTEL_LINKS.reduce((current, link) => {
    const currentLoad = linkTelemetry[current.id]?.metrics.trafficLoadPercent ?? 0
    const nextLoad = linkTelemetry[link.id]?.metrics.trafficLoadPercent ?? 0

    return nextLoad > currentLoad ? link : current
  }, ENTEL_LINKS[0])
  const backboneScenarios = SCENARIOS.filter((scenario) => !scenario.id.startsWith("cbba-"))
  const cochabambaScenarios = SCENARIOS.filter((scenario) => scenario.id.startsWith("cbba-"))

  function activateScenario(scenario: Scenario) {
    if (activeAlarms.length) return

    const firstAffectedLink = ENTEL_LINKS.find((link) => scenario.affectedLinks.includes(link.id))

    if (firstAffectedLink) {
      setSelectedLinkId(firstAffectedLink.id)
      setVisibleLayer(firstAffectedLink.layer === "distribution" ? "distribution" : "both")
    }

    setLinkMetricPatches(scenario.linkMetricPatches ?? {})
    setNodeMetricPatches(scenario.nodeMetricPatches ?? {})
    setAlarmLog((current) => [
      {
        id: `${scenario.id}-${Date.now()}`,
        scenarioId: scenario.id,
        title: scenario.title,
        description: scenario.description,
        severity: scenario.severity,
        alarmType: scenario.alarmType,
        elementId: scenario.elementId,
        elementType: scenario.elementType,
        startedAt: new Date(),
        affectedLinks: scenario.affectedLinks,
        affectedNodes: scenario.affectedNodes ?? [],
        rerouteLinks: scenario.rerouteLinks,
        probableCause: scenario.probableCause,
        evidence: scenario.evidence,
        recommendation: scenario.recommendation,
        switchedTrafficGbps: scenario.switchedTrafficGbps,
        remainingCapacityGbps: scenario.remainingCapacityGbps,
        traceOverrides: scenario.traceOverrides,
      },
      ...current,
    ])
  }

  function repairAlarm(alarm: AlarmRecord) {
    setLinkMetricPatches((current) => {
      const next = { ...current }

      alarm.affectedLinks.forEach((linkId) => {
        delete next[linkId]
      })
      alarm.rerouteLinks?.forEach((linkId) => {
        delete next[linkId]
      })

      return next
    })
    setNodeMetricPatches((current) => {
      const next = { ...current }

      alarm.affectedNodes.forEach((nodeId) => {
        delete next[nodeId]
      })

      return next
    })
    setAlarmLog((current) =>
      current.map((item) =>
        item.id === alarm.id ? { ...item, acknowledgedAt: item.acknowledgedAt ?? new Date(), repairedAt: new Date() } : item
      )
    )
  }

  function resolveAlarm(alarm: AlarmRecord) {
    repairAlarm(alarm)
    closeAlarm(alarm)
  }

  function closeAlarm(alarm: AlarmRecord) {
    setAlarmLog((current) =>
      current.map((item) =>
        item.id === alarm.id ? { ...item, acknowledgedAt: item.acknowledgedAt ?? new Date(), repairedAt: item.repairedAt ?? new Date(), resolvedAt: new Date() } : item
      )
    )
  }

  function resolveAll() {
    const now = new Date()

    setLinkMetricPatches({})
    setNodeMetricPatches({})
    setAlarmLog((current) => current.map((alarm) => alarm.resolvedAt ? alarm : { ...alarm, resolvedAt: now }))
  }

  return (
    <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard icon={RadioTowerIcon} label="Nodos activos" value={`${activeNodes}/${ENTEL_NODES.length}`} detail="Core, regionales y gateways" />
          <MetricCard icon={RouteIcon} label="Enlaces OK" value={`${okLinks}/${ENTEL_LINKS.length}`} detail={`${criticalLinks} criticos detectados`} />
          <MetricCard icon={ZapIcon} label="Lima-Sao Paulo" value={`${gatewayLatency.toFixed(1)} ms`} detail="Salida internacional Brasil" />
          <MetricCard icon={GaugeIcon} label="Mayor carga" value={`${linkTelemetry[highestLoadLink.id]?.metrics.trafficLoadPercent ?? 0}%`} detail={getLinkName(highestLoadLink)} />
          <MetricCard icon={Clock3Icon} label="Uptime" value={formatUptime(uptimeSeconds)} detail="Sesion de simulacion" />
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="border-b">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle>Mapa NOC Entel Bolivia</CardTitle>
                <CardDescription>
                  Dos capas jerarquicas: backbone enterrado por carretera y distribucion GPON/FTTH Cbba.
                </CardDescription>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant={visibleLayer === "backbone" ? "default" : "outline"} onClick={() => setVisibleLayer("backbone")}>
                    Ver backbone
                  </Button>
                  <Button size="sm" variant={visibleLayer === "distribution" ? "default" : "outline"} onClick={() => setVisibleLayer("distribution")}>
                    Ver distribucion Cbba
                  </Button>
                  <Button size="sm" variant={visibleLayer === "both" ? "default" : "outline"} onClick={() => setVisibleLayer("both")}>
                    Ver ambas
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <LegendSwatch color="#1d4ed8" label="Backbone" />
                  <LegendSwatch color="#38bdf8" label="Distribucion" />
                  <LegendSwatch color="#f97316" label="Gateway" />
                  <LegendDot status="warning" label="Warning" />
                  <LegendDot status="critical" label="Critico" />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative h-[640px] min-h-[520px] w-full">
              <MapContainer center={NETWORK_CENTER} zoom={6} scrollWheelZoom className="h-full w-full bg-background">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MonitoringViewport />
                <MapZoomWatcher onZoomChange={setMapZoom} />

                {visibleLinks.map((link) => {
                  const telemetry = linkTelemetry[link.id]
                  const isSelected = selectedLink.id === link.id
                  const isReroute = activeAlarms.some((alarm) => alarm.rerouteLinks?.includes(link.id))
                  const isHighlighted = highlightedLinks.has(link.id)
                  const color = getLinkColor(link, telemetry.status, isReroute)

                  return (
                    <Polyline
                      key={link.id}
                      positions={getLinkPositions(link)}
                      pathOptions={{
                        className: getLinkAnimationClass(telemetry.status, isReroute, isHighlighted),
                        color,
                        weight: isSelected ? 7 : link.layer === "backbone" ? link.type === "backbone" ? 5 : 4 : 2.5,
                        opacity: isSelected || isHighlighted ? 0.95 : 0.78,
                        dashArray: link.type === "international" ? "8 8" : isReroute ? "12 6" : undefined,
                      }}
                      eventHandlers={{ click: () => setSelectedLinkId(link.id) }}
                    >
                      <Tooltip sticky>{getLinkName(link)}</Tooltip>
                      <Popup>
                        <MapPopup title={getLinkName(link)} rows={[
                          ["Distancia", `${link.km.toLocaleString("es-BO")} km`],
                          ["Capacidad", `${link.gbps} Gbps`],
                          ["RX optico", `${telemetry.metrics.rxPowerDbm} dBm`],
                          ["Latencia", `${telemetry.metrics.latencyMs} ms`],
                          ["Estado", STATUS_META[telemetry.status].label],
                        ]} />
                      </Popup>
                    </Polyline>
                  )
                })}

                {activeOverlayLinks.map((link) => {
                  const telemetry = linkTelemetry[link.id]
                  const isReroute = activeAlarms.some((alarm) => alarm.rerouteLinks?.includes(link.id))
                  const isAffected = activeAlarms.some((alarm) => alarm.affectedLinks.includes(link.id))
                  const status = isReroute && !isAffected ? "warning" : telemetry.status

                  return (
                    <Polyline
                      key={`alarm-${link.id}`}
                      interactive={false}
                      positions={getLinkPositions(link)}
                      pathOptions={{
                        className: getLinkAnimationClass(status, isReroute, true),
                        color: getLinkColor(link, status, isReroute),
                        dashArray: isReroute ? "12 6" : link.type === "international" ? "8 8" : undefined,
                        opacity: 1,
                        weight: link.layer === "distribution" ? 8 : 10,
                      }}
                    />
                  )
                })}

                {visibleNodes.map((node) => {
                  const telemetry = nodeTelemetry[node.id]
                  const statusColor = STATUS_META[telemetry.status].color
                  const radius = node.type === "core" ? 11 : node.layer === "distribution" ? 6 : 8

                  if (node.type === "gateway") {
                    return (
                      <Polygon
                        key={node.id}
                        positions={gatewayDiamond(node.lat, node.lon)}
                        pathOptions={{ className: getNodeAnimationClass(telemetry.status), color: "#f97316", fillColor: statusColor, fillOpacity: 0.9, weight: 3 }}
                      >
                        <Tooltip>{node.name}</Tooltip>
                        <Popup>
                          <NodePopup nodeId={node.id} status={telemetry.status} metrics={telemetry.metrics} />
                        </Popup>
                      </Polygon>
                    )
                  }

                  return (
                    <CircleMarker
                      key={node.id}
                      center={[node.lat, node.lon]}
                      radius={node.datacenter ? 14 : radius}
                      pathOptions={{
                        className: getNodeAnimationClass(telemetry.status),
                        color: node.datacenter ? "#0f172a" : node.layer === "distribution" ? "#38bdf8" : "#1d4ed8",
                        fillColor: statusColor,
                        fillOpacity: 0.9,
                        weight: node.datacenter ? 4 : 3,
                      }}
                    >
                      <Tooltip>{node.datacenter ? `${node.name} - Data Center` : node.name}</Tooltip>
                      <Popup>
                        <NodePopup nodeId={node.id} status={telemetry.status} metrics={telemetry.metrics} />
                      </Popup>
                    </CircleMarker>
                  )
                })}
              </MapContainer>
              <div className="pointer-events-none absolute bottom-4 left-4 z-[1000] max-w-sm rounded-lg border bg-background/95 p-3 text-xs shadow-sm">
                <p className="font-semibold">Detalle por zoom</p>
                <p className="text-muted-foreground">
                  Zoom {mapZoom}: distribucion visible {showDistribution ? "activa" : "desde zoom 9 o modo distribucion"}.
                </p>
              </div>
              {activeAlarms[0] ? (
                <div className="pointer-events-none absolute right-4 top-4 z-[1000] max-w-xs rounded-lg border border-red-500/40 bg-background/95 p-3 text-xs shadow-lg fiber-alert-panel">
                  <p className="font-semibold text-red-600 dark:text-red-300">Alarma activa</p>
                  <p className="mt-1 text-foreground">{activeAlarms[0].title}</p>
                  <p className="mt-1 text-muted-foreground">{activeAlarms[0].description}</p>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <EventLog alarms={alarmLog} />
      </div>

      <aside className="flex min-w-0 flex-col gap-4">
        <SelectedLinkPanel
          activeAlarms={activeAlarms}
          link={selectedLink}
          telemetry={selectedTelemetry}
        />

        <Card>
          <CardHeader>
            <CardTitle>Simulacion de fallas</CardTitle>
            <CardDescription>Los botones alteran metricas; las reglas calculan el estado.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScenarioButtonGroup
              activeAlarms={activeAlarms}
              activeScenarioIds={activeScenarioIds}
              label="Backbone nacional"
              scenarios={backboneScenarios}
              onActivate={activateScenario}
            />
            <ScenarioButtonGroup
              activeAlarms={activeAlarms}
              activeScenarioIds={activeScenarioIds}
              label="Distribucion Cochabamba"
              scenarios={cochabambaScenarios}
              onActivate={activateScenario}
            />
            <Button type="button" variant="ghost" className="w-full justify-start" onClick={resolveAll}>
              <RotateCcwIcon data-icon="inline-start" />
              Resolver todo
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Diagnostico activo</CardTitle>
            <CardDescription>{activeAlarms.length ? "Alarmas detectadas por reglas." : "Sin alarmas activas."}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeAlarms.length ? activeAlarms.map((alarm) => (
              <AlarmCard
                key={alarm.id}
                alarm={alarm}
                onResolve={resolveAlarm}
              />
            )) : (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                La telemetria esta dentro de umbrales normales.
              </div>
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  )
}

function MetricCard({ icon: Icon, label, value, detail }: { icon: ComponentType<{ className?: string }>; label: string; value: string; detail: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex size-10 items-center justify-center rounded-lg border bg-muted">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold tracking-tight">{value}</p>
          <p className="truncate text-xs text-muted-foreground">{detail}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function ScenarioButtonGroup({
  activeAlarms,
  activeScenarioIds,
  label,
  scenarios,
  onActivate,
}: {
  activeAlarms: AlarmRecord[]
  activeScenarioIds: Set<string>
  label: string
  scenarios: Scenario[]
  onActivate: (scenario: Scenario) => void
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      {scenarios.map((scenario) => (
        <Button
          key={scenario.id}
          type="button"
          variant={activeScenarioIds.has(scenario.id) ? "secondary" : "outline"}
          className="h-auto w-full justify-start whitespace-normal py-2 text-left"
          disabled={activeAlarms.length > 0}
          onClick={() => onActivate(scenario)}
        >
          <ShieldAlertIcon data-icon="inline-start" />
          {scenario.title}
        </Button>
      ))}
    </div>
  )
}

function SelectedLinkPanel({
  activeAlarms,
  link,
  telemetry,
}: {
  activeAlarms: AlarmRecord[]
  link: EntelLink
  telemetry: { metrics: LinkMetrics; status: NetworkStatus }
}) {
  const metrics = telemetry.metrics
  const activeAlarm = activeAlarms.find((alarm) => alarm.affectedLinks.includes(link.id))
  const traceEvents = activeAlarm?.traceOverrides?.[link.id] ?? link.traceEvents
  const marginDb = round(metrics.rxPowerDbm - link.thresholds.criticalRxPowerDbm)
  const routeStatus = activeAlarm?.rerouteLinks?.length
    ? "Proteccion activa"
    : telemetry.status === "critical"
      ? "Principal interrumpida"
      : "Principal estable"
  const normalTrafficGbps = round(link.gbps * (metrics.trafficLoadPercent / 100), 2)
  const switchedGbps = activeAlarm?.switchedTrafficGbps ?? 0
  const lostGbps = metrics.availabilityPercent === 0 ? normalTrafficGbps : telemetry.status === "critical" ? round(normalTrafficGbps * 0.35, 2) : 0
  const remainingGbps = activeAlarm?.remainingCapacityGbps ?? round(Math.max(0, link.gbps - normalTrafficGbps - switchedGbps), 2)
  const logs = buildLinkLogs(link, telemetry.status, metrics, activeAlarm)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Ficha de monitoreo</CardTitle>
            <CardDescription>Click en un tramo para cambiar el enlace.</CardDescription>
          </div>
          <StatusBadge status={telemetry.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="font-semibold">{getLinkName(link)}</p>
          <p className="text-sm text-muted-foreground">{link.type} / {link.gbps} Gbps / {link.km} km</p>
        </div>
        <Separator />
        <Tabs defaultValue="optica">
          <TabsList className="grid h-auto w-full grid-cols-3 md:grid-cols-5">
            <TabsTrigger value="optica">
              <ZapIcon data-icon="inline-start" />
              Optica
            </TabsTrigger>
            <TabsTrigger value="trazas">
              <ListTreeIcon data-icon="inline-start" />
              Trazas
            </TabsTrigger>
            <TabsTrigger value="equipos">
              <ServerIcon data-icon="inline-start" />
              Equipos
            </TabsTrigger>
            <TabsTrigger value="logs">
              <TerminalIcon data-icon="inline-start" />
              Logs
            </TabsTrigger>
            <TabsTrigger value="rutas">
              <NetworkIcon data-icon="inline-start" />
              Rutas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="optica" className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Info label="TX optico" value={`${metrics.txPowerDbm} dBm`} />
              <Info label="RX optico" value={`${metrics.rxPowerDbm} dBm`} />
              <Info label="Atenuacion" value={`${metrics.attenuationDb} dB`} />
              <Info label="Margen estimado" value={`${marginDb} dB`} />
              <Info label="Warning RX" value={`${link.thresholds.warningRxPowerDbm} dBm`} />
              <Info label="Critico RX" value={`${link.thresholds.criticalRxPowerDbm} dBm`} />
            </div>
            <CapacityBar label="Uso de capacidad" value={metrics.trafficLoadPercent} />
          </TabsContent>

          <TabsContent value="trazas">
            <TraceTable events={traceEvents} />
          </TabsContent>

          <TabsContent value="equipos" className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Info label="Vendor" value={link.equipment.vendor} />
              <Info label="Modelo" value={link.equipment.model} />
              <Info label="Puerto local" value={link.equipment.localPort} />
              <Info label="Puerto remoto" value={link.equipment.remotePort} />
              <Info label="Transceptor" value={link.equipment.transceiver} />
              <Info label="EDFA" value={formatEdfa(link.equipment.edfa, activeAlarm)} />
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium">Extremos</p>
              <p className="text-muted-foreground">{getNode(link.from).name} / {link.id === "pq_br" ? "Sao Paulo" : getNode(link.to).name}</p>
            </div>
          </TabsContent>

          <TabsContent value="logs">
            <TechnicalLogs logs={logs} />
          </TabsContent>

          <TabsContent value="rutas" className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Info label="Proteccion" value={link.protection.type} />
              <Info label="Estado" value={routeStatus} />
              <Info label="Trafico normal" value={`${normalTrafficGbps} Gbps`} />
              <Info label="Conmutado" value={`${switchedGbps} Gbps`} />
              <Info label="Degradado/perdido" value={`${lostGbps} Gbps`} />
              <Info label="Capacidad libre" value={`${remainingGbps} Gbps`} />
            </div>
            <RoutePath label="Ruta principal" path={link.protection.primaryPath} />
            <RoutePath label="Ruta alternativa" path={link.protection.backupPath} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

function AlarmCard({
  alarm,
  onResolve,
}: {
  alarm: AlarmRecord
  onResolve: (alarm: AlarmRecord) => void
}) {
  const stage = getAlarmStage(alarm)

  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <AlertTriangleIcon className="mt-0.5 size-4 text-destructive" />
          <div>
            <p className="text-sm font-semibold">{alarm.title}</p>
            <p className="text-xs text-muted-foreground">{alarm.startedAt.toLocaleString("es-BO")}</p>
          </div>
        </div>
        <SeverityBadge severity={alarm.severity} />
      </div>
      <span className={cn("mb-2 inline-flex w-fit rounded-full px-2 py-1 text-xs font-medium", stage.className)}>
        {stage.label}
      </span>
      <p className="text-sm text-muted-foreground">{alarm.description}</p>
      <div className="mt-3 space-y-2 text-sm">
        <DiagnosticRow label="Causa probable" value={alarm.probableCause} />
        <DiagnosticRow label="Accion recomendada" value={alarm.recommendation} />
        {alarm.switchedTrafficGbps ? (
          <DiagnosticRow label="APS" value={`${alarm.switchedTrafficGbps} Gbps conmutados / ${alarm.remainingCapacityGbps} Gbps libres`} />
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {alarm.affectedLinks.map((linkId) => <Badge key={linkId} variant="destructive">{linkId}</Badge>)}
        {alarm.rerouteLinks?.map((linkId) => <Badge key={linkId} variant="secondary">APS {linkId}</Badge>)}
      </div>
      <div className="mt-3 rounded-md border bg-background/70 p-2">
        <p className="mb-1 text-xs font-medium">Evidencia</p>
        <ul className="space-y-1 text-xs text-muted-foreground">
          {alarm.evidence.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </div>
      <Button type="button" variant="outline" size="sm" className="mt-3 w-full" onClick={() => onResolve(alarm)}>
        <CheckCircle2Icon data-icon="inline-start" />
        Resolver falla
      </Button>
    </div>
  )
}

function CapacityBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div
          className={cn(
            "h-2 rounded-full transition-all",
            value >= 92 ? "bg-red-600" : value >= 78 ? "bg-amber-500" : "bg-primary"
          )}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

function TraceTable({ events }: { events: TraceEvent[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Km</TableHead>
          <TableHead>Evento</TableHead>
          <TableHead>Perdida</TableHead>
          <TableHead>Estado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.map((event) => (
          <TableRow key={`${event.km}-${event.type}-${event.description}`}>
            <TableCell>{event.km}</TableCell>
            <TableCell>
              <span className="block font-medium">{formatTraceType(event.type)}</span>
              <span className="block whitespace-normal text-xs text-muted-foreground">{event.description}</span>
            </TableCell>
            <TableCell>{event.lossDb} dB</TableCell>
            <TableCell><StatusBadge status={event.status} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function TechnicalLogs({ logs }: { logs: { time: string; severity: AlarmSeverity; message: string }[] }) {
  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <div key={`${log.time}-${log.message}`} className="rounded-lg border bg-muted/30 p-2 text-xs">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="font-mono text-muted-foreground">{log.time}</span>
            <SeverityBadge severity={log.severity} />
          </div>
          <p>{log.message}</p>
        </div>
      ))}
    </div>
  )
}

function RoutePath({ label, path }: { label: string; path: string[] }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="text-xs font-medium">{label}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {path.length ? path.join(" -> ") : "Sin ruta alternativa configurada"}
      </p>
    </div>
  )
}

function buildLinkLogs(
  link: EntelLink,
  status: NetworkStatus,
  metrics: LinkMetrics,
  alarm?: AlarmRecord
) {
  const baseLogs = [
    {
      time: "T-00:09",
      severity: "info" as AlarmSeverity,
      message: `${getLinkName(link)} polling SNMP/telemetria recibido correctamente.`,
    },
    {
      time: "T-00:06",
      severity: status === "ok" ? "info" as AlarmSeverity : "minor" as AlarmSeverity,
      message: `RX=${metrics.rxPowerDbm} dBm, latencia=${metrics.latencyMs} ms, perdida=${metrics.packetLossPercent}%.`,
    },
  ]

  if (!alarm) {
    return [
      ...baseLogs,
      {
        time: "T-00:03",
        severity: "info" as AlarmSeverity,
        message: "Sin eventos correlacionados; proteccion y trafico dentro de parametros.",
      },
    ]
  }

  return [
    {
      time: alarm.startedAt.toLocaleTimeString("es-BO"),
      severity: alarm.severity,
      message: `${alarm.title}: ${alarm.probableCause}`,
    },
    ...baseLogs,
    {
      time: "T+00:01",
      severity: alarm.severity,
      message: alarm.evidence.join(" / "),
    },
    {
      time: "T+00:02",
      severity: alarm.repairedAt ? "info" as AlarmSeverity : alarm.severity,
      message: alarm.repairedAt
        ? "Metricas restauradas por simulacion de reparacion; pendiente cierre operativo."
        : alarm.recommendation,
    },
  ]
}

function getAlarmStage(alarm: AlarmRecord) {
  if (alarm.resolvedAt) {
    return { label: "Cerrada", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" }
  }

  if (alarm.repairedAt) {
    return { label: "Reparada / pendiente cierre", className: "bg-sky-500/10 text-sky-700 dark:text-sky-300" }
  }

  if (alarm.acknowledgedAt) {
    return { label: "Reconocida / en atencion", className: "bg-amber-500/10 text-amber-700 dark:text-amber-300" }
  }

  return { label: "Activa / sin reconocer", className: "bg-red-500/10 text-red-700 dark:text-red-300" }
}

function formatEdfa(edfa: EntelLink["equipment"]["edfa"], alarm?: AlarmRecord) {
  if (alarm?.alarmType === "edfa_failure") return `${edfa} critico`
  if (edfa === "none") return "No aplica"

  return `${edfa} operativo`
}

function formatTraceType(type: TraceEvent["type"]) {
  const labels: Record<TraceEvent["type"], string> = {
    connector: "Conector",
    cut: "Corte",
    edfa: "EDFA",
    high_loss: "Alta perdida",
    reflection: "Reflexion",
    splice: "Empalme",
  }

  return labels[type]
}

function EventLog({ alarms }: { alarms: AlarmRecord[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bitacora de eventos</CardTitle>
        <CardDescription>Historial temporal de alarmas activas y resueltas durante la sesion.</CardDescription>
      </CardHeader>
      <CardContent>
        {alarms.length ? (
          <div className="grid gap-2">
            {alarms.slice(0, 8).map((alarm) => (
              <div key={alarm.id} className="grid gap-2 rounded-lg border bg-muted/20 p-3 text-sm md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr] md:items-center">
                <div className="min-w-0">
                  <p className="truncate font-medium">{alarm.title}</p>
                  <p className="text-xs text-muted-foreground">{alarm.elementType}: {alarm.elementId}</p>
                </div>
                <SeverityBadge severity={alarm.severity} />
                <span className={cn("inline-flex w-fit rounded-full px-2 py-1 text-xs font-medium", alarm.resolvedAt ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-red-500/10 text-red-700 dark:text-red-300")}>
                  {getAlarmStage(alarm).label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDuration(alarm.startedAt, alarm.resolvedAt)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Aun no hay eventos registrados.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DiagnosticRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">{value}</p>
    </div>
  )
}

function LegendDot({ status, label }: { status: NetworkStatus; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="size-2.5 rounded-full" style={{ backgroundColor: STATUS_META[status].color }} />
      {label}
    </span>
  )
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}

function StatusBadge({ status }: { status: NetworkStatus }) {
  return (
    <span className={cn("inline-flex h-6 items-center rounded-full px-2 text-xs font-medium", STATUS_META[status].className)}>
      {STATUS_META[status].label}
    </span>
  )
}

function SeverityBadge({ severity }: { severity: AlarmSeverity }) {
  return (
    <span className={cn("inline-flex w-fit rounded-full px-2 py-1 text-xs font-medium", SEVERITY_META[severity].className)}>
      {SEVERITY_META[severity].label}
    </span>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-medium">{value}</p>
    </div>
  )
}

function MapPopup({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="space-y-2">
      <p className="font-semibold">{title}</p>
      <div className="space-y-1">
        {rows.map(([label, value]) => (
          <p key={label} className="text-sm">
            <span className="font-medium">{label}:</span> {value}
          </p>
        ))}
      </div>
    </div>
  )
}

function NodePopup({ nodeId, status, metrics }: { nodeId: string; status: NetworkStatus; metrics: NodeMetrics }) {
  const node = getNode(nodeId)

  return (
    <MapPopup
      title={node.datacenter ? `${node.name} - Data Center Santivanez` : node.name}
      rows={[
        ["Tipo", node.type],
        ["Region", node.region],
        ["Latencia", `${metrics.latencyMs} ms`],
        ["Carga", `${metrics.trafficLoadPercent}%`],
        ["Estado", STATUS_META[status].label],
      ]}
    />
  )
}
