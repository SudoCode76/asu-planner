import {
  Circle,
  Document,
  Line,
  Page,
  Rect,
  StyleSheet,
  Svg,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer"
import { NextResponse, type NextRequest } from "next/server"
import type { ReactNode } from "react"

export const runtime = "nodejs"

type NetworkStatus = "ok" | "warning" | "critical" | "unknown"
type AlarmSeverity = "info" | "minor" | "major" | "critical"

type LinkMetrics = {
  txPowerDbm: number
  rxPowerDbm: number
  attenuationDb: number
  latencyMs: number
  jitterMs: number
  packetLossPercent: number
  trafficLoadPercent: number
  availabilityPercent: number
}

type TraceEvent = {
  km: number
  type: string
  lossDb: number
  status: NetworkStatus
  description: string
}

type IncidentPayload = {
  alarm: {
    id: string
    title: string
    description: string
    severity: AlarmSeverity
    alarmType: string
    elementId: string
    elementType: "link" | "node"
    startedAt: string
    probableCause: string
    evidence: string[]
    recommendation: string
    affectedLinks: string[]
    affectedNodes: string[]
    rerouteLinks?: string[]
    switchedTrafficGbps?: number
    remainingCapacityGbps?: number
  }
  link: {
    id: string
    from: string
    to: string
    km: number
    gbps: number
    layer: string
    type: string
    equipment: {
      vendor: string
      model: string
      localPort: string
      remotePort: string
      transceiver: string
      edfa: string
    }
    protection: {
      type: string
      primaryPath: string[]
      backupPath: string[]
    }
  }
  fromNode: { id: string; name: string; lat: number; lon: number; type: string; region: string }
  toNode: { id: string; name: string; lat: number; lon: number; type: string; region: string }
  metrics: LinkMetrics
  baselineMetrics: LinkMetrics
  status: NetworkStatus
  traceEvents: TraceEvent[]
  routePath: [number, number][]
  traffic: {
    normalGbps: number
    switchedGbps: number
    lostGbps: number
    remainingCapacityGbps: number
  }
  logs: { time: string; severity: AlarmSeverity; message: string }[]
  generatedAt: string
}

const STATUS_LABELS: Record<NetworkStatus, string> = {
  ok: "Operativo",
  warning: "Advertencia",
  critical: "Critico",
  unknown: "Desconocido",
}

const SEVERITY_LABELS: Record<AlarmSeverity, string> = {
  info: "Info",
  minor: "Menor",
  major: "Mayor",
  critical: "Critica",
}

const STATUS_COLORS: Record<NetworkStatus, { background: string; border: string; text: string; stroke: string }> = {
  ok: { background: "#dcfce7", border: "#16a34a", text: "#166534", stroke: "#16a34a" },
  warning: { background: "#fef3c7", border: "#d97706", text: "#92400e", stroke: "#eab308" },
  critical: { background: "#fee2e2", border: "#dc2626", text: "#991b1b", stroke: "#dc2626" },
  unknown: { background: "#f1f5f9", border: "#64748b", text: "#334155", stroke: "#64748b" },
}

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Helvetica",
    fontSize: 9,
    lineHeight: 1.35,
    color: "#111827",
  },
  brand: {
    color: "#475569",
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: 14,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    lineHeight: 1.15,
    marginBottom: 8,
  },
  subtitle: {
    color: "#475569",
    fontSize: 11,
    marginBottom: 12,
  },
  coverGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  coverMetric: {
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    flex: 1,
    padding: 10,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: 700,
    marginTop: 3,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    fontSize: 10,
    fontWeight: 700,
    marginBottom: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  section: {
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    marginBottom: 10,
    padding: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 7,
  },
  table: {
    border: "1px solid #e5e7eb",
    borderBottom: 0,
  },
  row: {
    borderBottom: "1px solid #e5e7eb",
    flexDirection: "row",
  },
  cellLabel: {
    backgroundColor: "#f8fafc",
    color: "#475569",
    padding: 5,
    width: "38%",
  },
  cellValue: {
    padding: 5,
    width: "62%",
  },
  twoColumns: {
    flexDirection: "row",
    gap: 10,
  },
  column: {
    flex: 1,
  },
  note: {
    backgroundColor: "#f8fafc",
    border: "1px solid #e5e7eb",
    borderRadius: 4,
    marginBottom: 4,
    padding: 6,
  },
  footer: {
    borderTop: "1px solid #e5e7eb",
    color: "#64748b",
    fontSize: 8,
    marginTop: 6,
    paddingTop: 7,
  },
  sketchBox: {
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    marginBottom: 6,
    padding: 8,
  },
  muted: {
    color: "#64748b",
  },
})

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json() as IncidentPayload

    if (!isPayloadValid(payload)) {
      return Response.json({ error: "Payload de incidente NOC incompleto." }, { status: 400 })
    }

    const buffer = await renderIncidentPdf(payload)
    const filename = `noc-entel-${slugify(payload.alarm.id)}.pdf`

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "error desconocido"

    return Response.json({ error: `No se pudo generar el PDF NOC: ${message}` }, { status: 500 })
  }
}

function renderIncidentPdf(payload: IncidentPayload) {
  return pdf(<IncidentDocument payload={payload} />).toBuffer()
}

function isPayloadValid(payload: Partial<IncidentPayload>) {
  return Boolean(
    payload.alarm?.id &&
    payload.link?.id &&
    payload.fromNode?.name &&
    payload.toNode?.name &&
    payload.metrics &&
    payload.baselineMetrics &&
    payload.generatedAt
  )
}

function IncidentDocument({ payload }: { payload: IncidentPayload }) {
  const colors = STATUS_COLORS[payload.status]

  return (
    <Document
      author="ASU PLANNER"
      subject="Reporte simulado de incidente NOC"
      title={`NOC Entel - ${payload.alarm.title}`}
    >
      <Page size="A4" style={styles.page}>
        <Text style={styles.brand}>ASU PLANNER / Consola NOC Entel Bolivia</Text>
        <Text style={styles.title}>Reporte tecnico de incidente NOC</Text>
        <Text style={styles.subtitle}>{payload.alarm.title}</Text>
        <Text
          style={[
            styles.badge,
            { backgroundColor: colors.background, borderColor: colors.border, color: colors.text },
          ]}
        >
          {SEVERITY_LABELS[payload.alarm.severity]} / {STATUS_LABELS[payload.status]}
        </Text>

        <View style={styles.coverGrid}>
          <CoverMetric label="Incidente" value={payload.alarm.id} />
          <CoverMetric label="Inicio" value={formatDate(payload.alarm.startedAt)} />
          <CoverMetric label="Generado" value={formatDate(payload.generatedAt)} />
        </View>

        <Section title="Resumen ejecutivo">
          <DataTable
            rows={[
              { label: "Elemento afectado", value: `${payload.link.id} / ${payload.fromNode.name} - ${payload.toNode.name}` },
              { label: "Tipo de evento", value: payload.alarm.alarmType },
              { label: "Descripcion", value: payload.alarm.description },
              { label: "Causa probable", value: payload.alarm.probableCause },
              { label: "Accion recomendada", value: payload.alarm.recommendation },
            ]}
          />
        </Section>

        <Section title="Croquis tecnico del tramo afectado">
          <IncidentSketch payload={payload} />
          <Text style={styles.muted}>
            Croquis academico aproximado. No representa plano propietario de Entel ni captura exacta de Leaflet.
          </Text>
        </Section>

        <Section title="Telemetria actual vs normal">
          <View style={styles.twoColumns}>
            <View style={styles.column}>
              <DataTable rows={metricRows("Lectura actual", payload.metrics)} />
            </View>
            <View style={styles.column}>
              <DataTable rows={metricRows("Normal/base", payload.baselineMetrics)} />
            </View>
          </View>
        </Section>

        <Text style={styles.footer}>
          Reporte generado automaticamente desde simulacion local. Uso academico, no documento oficial de Entel.
        </Text>
      </Page>

      <Page size="A4" style={styles.page}>
        <Section title="Datos del enlace y equipos">
          <View style={styles.twoColumns}>
            <View style={styles.column}>
              <DataTable
                rows={[
                  { label: "Origen", value: `${payload.fromNode.name} (${payload.fromNode.region})` },
                  { label: "Destino", value: `${payload.toNode.name} (${payload.toNode.region})` },
                  { label: "Distancia", value: `${payload.link.km} km` },
                  { label: "Capacidad", value: `${payload.link.gbps} Gbps` },
                  { label: "Capa/tipo", value: `${payload.link.layer} / ${payload.link.type}` },
                ]}
              />
            </View>
            <View style={styles.column}>
              <DataTable
                rows={[
                  { label: "Vendor", value: payload.link.equipment.vendor },
                  { label: "Modelo", value: payload.link.equipment.model },
                  { label: "Puerto local", value: payload.link.equipment.localPort },
                  { label: "Puerto remoto", value: payload.link.equipment.remotePort },
                  { label: "Transceptor", value: payload.link.equipment.transceiver },
                  { label: "EDFA", value: payload.link.equipment.edfa },
                ]}
              />
            </View>
          </View>
        </Section>

        <Section title="Proteccion y trafico degradado">
          <DataTable
            rows={[
              { label: "Proteccion", value: payload.link.protection.type },
              { label: "Ruta principal", value: formatPath(payload.link.protection.primaryPath) },
              { label: "Ruta alternativa", value: formatPath(payload.link.protection.backupPath) },
              { label: "Trafico normal", value: `${payload.traffic.normalGbps} Gbps` },
              { label: "Trafico conmutado", value: `${payload.traffic.switchedGbps} Gbps` },
              { label: "Trafico perdido/degradado", value: `${payload.traffic.lostGbps} Gbps` },
              { label: "Capacidad restante", value: `${payload.traffic.remainingCapacityGbps} Gbps` },
            ]}
          />
        </Section>

        <Section title="Trazas OTDR simuladas">
          <DataTable
            rows={payload.traceEvents.map((event) => ({
              label: `Km ${event.km} / ${event.type}`,
              value: `${event.lossDb} dB / ${STATUS_LABELS[event.status]} / ${event.description}`,
            }))}
          />
        </Section>

        <Section title="Evidencia y bitacora tecnica">
          {payload.alarm.evidence.map((item) => (
            <Text key={item} style={styles.note}>Evidencia: {item}</Text>
          ))}
          {payload.logs.map((log) => (
            <Text key={`${log.time}-${log.message}`} style={styles.note}>
              {log.time} [{SEVERITY_LABELS[log.severity]}] {log.message}
            </Text>
          ))}
        </Section>

        <Text style={styles.footer}>
          Validar en campo con OTDR, medicion de potencia optica y revision de equipo activo antes de cerrar el incidente.
        </Text>
      </Page>
    </Document>
  )
}

function IncidentSketch({ payload }: { payload: IncidentPayload }) {
  const sketchPoints = normalizePath(payload.routePath.length ? payload.routePath : [[payload.fromNode.lat, payload.fromNode.lon], [payload.toNode.lat, payload.toNode.lon]])
  const colors = STATUS_COLORS[payload.status]

  return (
    <View style={styles.sketchBox}>
      <Svg width="100%" height="170" viewBox="0 0 500 170">
        <Rect x="0" y="0" width="500" height="170" fill="#f8fafc" />
        {sketchPoints.slice(0, -1).map((point, index) => {
          const next = sketchPoints[index + 1]

          return (
            <Line
              key={`${point.x}-${point.y}-${index}`}
              x1={point.x}
              y1={point.y}
              x2={next.x}
              y2={next.y}
              stroke={colors.stroke}
              strokeWidth={index === Math.floor(sketchPoints.length / 2) ? 7 : 4}
            />
          )
        })}
        <Circle cx={sketchPoints[0]?.x ?? 70} cy={sketchPoints[0]?.y ?? 120} r="11" fill="#1d4ed8" />
        <Circle cx={sketchPoints.at(-1)?.x ?? 430} cy={sketchPoints.at(-1)?.y ?? 45} r="11" fill="#f97316" />
        <Text x="38" y="150" fill="#111827" style={{ fontSize: 12, fontWeight: 700 }}>
          {payload.fromNode.name}
        </Text>
        <Text x="340" y="30" fill="#111827" style={{ fontSize: 12, fontWeight: 700 }}>
          {payload.toNode.name}
        </Text>
        <Text x="190" y="86" fill={colors.stroke} style={{ fontSize: 13, fontWeight: 700 }}>
          Tramo afectado / {payload.link.id}
        </Text>
      </Svg>
    </View>
  )
}

function normalizePath(path: [number, number][]) {
  const lats = path.map(([lat]) => lat)
  const lons = path.map(([, lon]) => lon)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLon = Math.min(...lons)
  const maxLon = Math.max(...lons)
  const latSpan = Math.max(0.0001, maxLat - minLat)
  const lonSpan = Math.max(0.0001, maxLon - minLon)

  return path.map(([lat, lon]) => ({
    x: 45 + ((lon - minLon) / lonSpan) * 410,
    y: 145 - ((lat - minLat) / latSpan) * 110,
  }))
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  )
}

function CoverMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.coverMetric}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  )
}

function DataTable({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <View style={styles.table}>
      {rows.map((row) => (
        <View key={row.label} style={styles.row}>
          <Text style={styles.cellLabel}>{row.label}</Text>
          <Text style={styles.cellValue}>{row.value}</Text>
        </View>
      ))}
    </View>
  )
}

function metricRows(prefix: string, metrics: LinkMetrics) {
  return [
    { label: `${prefix} TX`, value: `${metrics.txPowerDbm} dBm` },
    { label: `${prefix} RX`, value: `${metrics.rxPowerDbm} dBm` },
    { label: `${prefix} Atenuacion`, value: `${metrics.attenuationDb} dB` },
    { label: `${prefix} Latencia`, value: `${metrics.latencyMs} ms` },
    { label: `${prefix} Jitter`, value: `${metrics.jitterMs} ms` },
    { label: `${prefix} Perdida`, value: `${metrics.packetLossPercent}%` },
    { label: `${prefix} Carga`, value: `${metrics.trafficLoadPercent}%` },
    { label: `${prefix} Disponibilidad`, value: `${metrics.availabilityPercent}%` },
  ]
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/La_Paz",
  }).format(new Date(value))
}

function formatPath(path: string[]) {
  return path.length ? path.join(" -> ") : "Sin ruta configurada"
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "incidente"
}
