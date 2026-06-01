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

import type { LinkDesign } from "@/lib/database.types"
import { parseRecommendations } from "@/lib/fibermap/calculations"
import { CABLE_TYPES, FIBER_TYPES, STATUS_LABELS } from "@/lib/fibermap/constants"
import { getDesign, requireUser } from "@/lib/fibermap/data"

export const runtime = "nodejs"

type Props = {
  params: Promise<{ id: string }>
}

const STATUS_COLORS = {
  viable: { background: "#dcfce7", border: "#16a34a", text: "#166534" },
  critical: { background: "#fef9c3", border: "#ca8a04", text: "#854d0e" },
  non_viable: { background: "#fee2e2", border: "#dc2626", text: "#991b1b" },
} as const

export async function GET(_request: NextRequest, { params }: Props) {
  const user = await requireUser()
  const { id } = await params
  const design = await getDesign(user.id, id)
  const buffer = await pdf(<ReportDocument design={design} />).toBuffer()
  const filename = `fibermap-asu-${slugify(design.name)}.pdf`

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  })
}

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 9,
    color: "#111827",
    fontFamily: "Helvetica",
    lineHeight: 1.35,
  },
  cover: {
    minHeight: "100%",
  },
  coverHero: {
    marginBottom: 24,
  },
  brand: {
    color: "#4b5563",
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 18,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    lineHeight: 1.15,
    marginBottom: 12,
  },
  subtitle: {
    color: "#4b5563",
    fontSize: 12,
    lineHeight: 1.3,
    marginBottom: 14,
  },
  coverGrid: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  coverMetric: {
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    flex: 1,
    padding: 12,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: 700,
    marginTop: 3,
  },
  footer: {
    borderTop: "1px solid #e5e7eb",
    color: "#6b7280",
    fontSize: 8,
    paddingTop: 8,
  },
  coverFooter: {
    marginTop: 12,
  },
  section: {
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    marginBottom: 12,
    padding: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 8,
  },
  textMuted: {
    color: "#6b7280",
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
    backgroundColor: "#f9fafb",
    color: "#4b5563",
    padding: 6,
    width: "42%",
  },
  cellValue: {
    padding: 6,
    width: "58%",
  },
  twoColumns: {
    flexDirection: "row",
    gap: 12,
  },
  column: {
    flex: 1,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    fontSize: 10,
    fontWeight: 700,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sketchBox: {
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    marginBottom: 8,
    padding: 8,
  },
  formula: {
    backgroundColor: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: 4,
    color: "#374151",
    marginBottom: 4,
    padding: 6,
  },
  recommendation: {
    marginBottom: 4,
  },
})

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "reporte"
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-BO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/La_Paz",
  }).format(new Date(value))
}

function fixed(value: number, unit: string, digits = 4) {
  return `${value.toFixed(digits)} ${unit}`
}

function labelFrom<T extends readonly { value: string; label: string }[]>(
  items: T,
  value: string
) {
  return items.find((item) => item.value === value)?.label ?? value
}

function conclusion(design: LinkDesign) {
  if (design.status === "viable") {
    return "El enlace cumple el margen minimo recomendado y puede mantenerse con el diseno actual."
  }

  if (design.status === "critical") {
    return "El enlace opera con margen bajo. Se recomienda optimizar perdidas antes de implementarlo."
  }

  return "El enlace no cumple el presupuesto optico disponible. Requiere rediseño o equipos de mayor alcance."
}

function StatusBadgePdf({ design }: { design: LinkDesign }) {
  const colors = STATUS_COLORS[design.status]

  return (
    <Text
      style={[
        styles.badge,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
          color: colors.text,
        },
      ]}
    >
      {STATUS_LABELS[design.status]}
    </Text>
  )
}

function TableRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.cellLabel}>{label}</Text>
      <Text style={styles.cellValue}>{value}</Text>
    </View>
  )
}

function DataTable({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <View style={styles.table}>
      {rows.map((row) => (
        <TableRow key={row.label} label={row.label} value={row.value} />
      ))}
    </View>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  )
}

function LinkSketch({ design }: { design: LinkDesign }) {
  return (
    <View style={styles.sketchBox}>
      <Svg width="100%" height="150" viewBox="0 0 500 150">
        <Rect x="0" y="0" width="500" height="150" fill="#f9fafb" />
        <Line x1="72" y1="98" x2="428" y2="52" stroke="#111827" strokeWidth="4" />
        <Circle cx="72" cy="98" r="12" fill="#111827" />
        <Circle cx="428" cy="52" r="12" fill="#dc2626" />
        <Text x="48" y="128" fill="#111827" style={{ fontSize: 14, fontWeight: 700 }}>
          Punto A
        </Text>
        <Text x="398" y="36" fill="#dc2626" style={{ fontSize: 14, fontWeight: 700 }}>
          Punto B
        </Text>
        <Text x="205" y="64" fill="#374151" style={{ fontSize: 12 }}>
          Enlace optico aereo
        </Text>
      </Svg>
      <Text style={styles.textMuted}>
        Croquis referencial. No representa una captura cartografica exacta.
      </Text>
      <Text>Punto A: {design.point_a_lat}, {design.point_a_lng}</Text>
      <Text>Punto B: {design.point_b_lat}, {design.point_b_lng}</Text>
    </View>
  )
}

function CoverMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.coverMetric}>
      <Text style={styles.textMuted}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  )
}

function ReportDocument({ design }: { design: LinkDesign }) {
  const recommendations = parseRecommendations(design)
  const cableType = labelFrom(CABLE_TYPES, design.cable_type)
  const fiberType = labelFrom(FIBER_TYPES, design.fiber_type)

  return (
    <Document
      author="FiberMap ASU"
      subject="Reporte tecnico de enlace de fibra optica aerea"
      title={`FiberMap ASU - ${design.name}`}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.cover}>
          <View style={styles.coverHero}>
            <Text style={styles.brand}>FiberMap ASU</Text>
            <Text style={styles.title}>Reporte tecnico de enlace</Text>
            <Text style={styles.subtitle}>{design.name}</Text>
            <StatusBadgePdf design={design} />

            <View style={styles.coverGrid}>
              <CoverMetric label="Distancia real" value={fixed(design.real_distance_km, "km")} />
              <CoverMetric label="Margen final" value={fixed(design.final_margin_db, "dB")} />
              <CoverMetric label="Presupuesto" value={fixed(design.optical_budget_db, "dB")} />
            </View>
          </View>

          <Section title="Resumen ejecutivo">
            <DataTable
              rows={[
                { label: "Origen", value: design.origin_name || "No especificado" },
                { label: "Destino", value: design.destination_name || "No especificado" },
                { label: "Estado del enlace", value: STATUS_LABELS[design.status] },
                { label: "Conclusion", value: conclusion(design) },
              ]}
            />
          </Section>

          <View style={[styles.footer, styles.coverFooter]}>
            <Text>Creado: {formatDate(design.created_at)}</Text>
            <Text>Actualizado: {formatDate(design.updated_at)}</Text>
            <Text>Version de calculo: {design.calculation_version}</Text>
          </View>
        </View>
      </Page>

      <Page size="A4" style={styles.page}>
        <Section title="Datos generales y georreferencia">
          <View style={styles.twoColumns}>
            <View style={styles.column}>
              <DataTable
                rows={[
                  { label: "Nombre", value: design.name },
                  { label: "Descripcion", value: design.description || "Sin descripcion" },
                  { label: "Origen", value: design.origin_name || "No especificado" },
                  { label: "Destino", value: design.destination_name || "No especificado" },
                ]}
              />
            </View>
            <View style={styles.column}>
              <DataTable
                rows={[
                  { label: "Punto A", value: `${design.point_a_lat}, ${design.point_a_lng}` },
                  { label: "Punto B", value: `${design.point_b_lat}, ${design.point_b_lng}` },
                  { label: "Distancia mapa", value: fixed(design.map_distance_km, "km") },
                  { label: "Distancia real", value: fixed(design.real_distance_km, "km") },
                ]}
              />
            </View>
          </View>
        </Section>

        <Section title="Croquis tecnico del enlace">
          <LinkSketch design={design} />
        </Section>

        <Section title="Parametros opticos">
          <View style={styles.twoColumns}>
            <View style={styles.column}>
              <DataTable
                rows={[
                  { label: "Tipo de cable", value: cableType },
                  { label: "Hilos de fibra", value: String(design.fiber_strands) },
                  { label: "Longitud de onda", value: `${design.wavelength_nm} nm` },
                  { label: "Tipo de fibra", value: fiberType },
                  { label: "Atenuacion", value: fixed(design.attenuation_db_per_km, "dB/km") },
                ]}
              />
            </View>
            <View style={styles.column}>
              <DataTable
                rows={[
                  { label: "Potencia TX", value: fixed(design.transmitter_power_dbm, "dBm", 3) },
                  { label: "Sensibilidad RX", value: fixed(design.receiver_sensitivity_dbm, "dBm", 3) },
                  { label: "Empalmes", value: `${design.splice_count} x ${fixed(design.splice_loss_db, "dB")}` },
                  { label: "Conectores", value: `${design.connector_count} x ${fixed(design.connector_loss_db, "dB")}` },
                  { label: "Margen seguridad", value: fixed(design.safety_margin_db, "dB", 3) },
                ]}
              />
            </View>
          </View>
        </Section>
      </Page>

      <Page size="A4" style={styles.page}>
        <Section title="Resultados del presupuesto optico">
          <DataTable
            rows={[
              { label: "Perdida por distancia", value: fixed(design.fiber_loss_db, "dB") },
              { label: "Perdida por empalmes", value: fixed(design.total_splice_loss_db, "dB") },
              { label: "Perdida por conectores", value: fixed(design.total_connector_loss_db, "dB") },
              { label: "Perdida total", value: fixed(design.total_loss_db, "dB") },
              { label: "Presupuesto optico", value: fixed(design.optical_budget_db, "dB") },
              { label: "Margen final", value: fixed(design.final_margin_db, "dB") },
              { label: "Estado", value: STATUS_LABELS[design.status] },
            ]}
          />
        </Section>

        <Section title="Formulas aplicadas">
          <Text style={styles.formula}>Perdida fibra = distancia real x atenuacion</Text>
          <Text style={styles.formula}>Perdida empalmes = numero de empalmes x perdida por empalme</Text>
          <Text style={styles.formula}>Perdida conectores = numero de conectores x perdida por conector</Text>
          <Text style={styles.formula}>Perdida total = fibra + empalmes + conectores + margen de seguridad</Text>
          <Text style={styles.formula}>Presupuesto optico = potencia TX - sensibilidad RX</Text>
          <Text style={styles.formula}>Margen final = presupuesto optico - perdida total</Text>
        </Section>

        <Section title="Criterio de evaluacion">
          <DataTable
            rows={[
              { label: "Viable", value: "Margen final mayor o igual a 3 dB" },
              { label: "Critico", value: "Margen final entre 0 y 2.99 dB" },
              { label: "No viable", value: "Margen final menor a 0 dB" },
            ]}
          />
        </Section>

        <Section title="Recomendaciones tecnicas">
          {recommendations.map((item, index) => (
            <Text key={item} style={styles.recommendation}>
              {index + 1}. {item}
            </Text>
          ))}
        </Section>

        <Text style={styles.footer}>
          Reporte generado por FiberMap ASU. Los resultados dependen de los parametros ingresados y deben validarse contra especificaciones reales de equipos y cable.
        </Text>
      </Page>
    </Document>
  )
}
