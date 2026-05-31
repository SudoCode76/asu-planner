import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer"
import { NextResponse, type NextRequest } from "next/server"

import type { LinkDesign } from "@/lib/database.types"
import { parseRecommendations } from "@/lib/fibermap/calculations"
import { STATUS_LABELS } from "@/lib/fibermap/constants"
import { getDesign, requireUser } from "@/lib/fibermap/data"

export const runtime = "nodejs"

type Props = {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: Props) {
  const user = await requireUser()
  const { id } = await params
  const design = await getDesign(user.id, id)
  const buffer = await pdf(<ReportDocument design={design} />).toBuffer()

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=\"fibermap-asu-${design.id}.pdf\"`,
    },
  })
}

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, color: "#111827" },
  title: { fontSize: 20, marginBottom: 6 },
  subtitle: { color: "#4b5563", marginBottom: 18 },
  section: { marginBottom: 14, padding: 12, border: "1px solid #e5e7eb" },
  heading: { fontSize: 13, marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4, gap: 10 },
  label: { color: "#6b7280" },
  value: { fontWeight: 600 },
})

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  )
}

function ReportDocument({ design }: { design: LinkDesign }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>FiberMap ASU - Reporte tecnico</Text>
        <Text style={styles.subtitle}>{design.name}</Text>

        <View style={styles.section}>
          <Text style={styles.heading}>Datos generales</Text>
          <Row label="Estado" value={STATUS_LABELS[design.status]} />
          <Row label="Origen" value={design.origin_name || "No especificado"} />
          <Row label="Destino" value={design.destination_name || "No especificado"} />
          <Row label="Punto A" value={`${design.point_a_lat}, ${design.point_a_lng}`} />
          <Row label="Punto B" value={`${design.point_b_lat}, ${design.point_b_lng}`} />
          <Row label="Distancia real" value={`${design.real_distance_km.toFixed(4)} km`} />
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>Parametros opticos</Text>
          <Row label="Cable" value={design.cable_type.toUpperCase()} />
          <Row label="Hilos" value={String(design.fiber_strands)} />
          <Row label="Longitud de onda" value={`${design.wavelength_nm} nm`} />
          <Row label="Potencia TX" value={`${design.transmitter_power_dbm} dBm`} />
          <Row label="Sensibilidad RX" value={`${design.receiver_sensitivity_dbm} dBm`} />
          <Row label="Atenuacion" value={`${design.attenuation_db_per_km} dB/km`} />
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>Resultados</Text>
          <Row label="Perdida por distancia" value={`${design.fiber_loss_db.toFixed(4)} dB`} />
          <Row label="Perdida por empalmes" value={`${design.total_splice_loss_db.toFixed(4)} dB`} />
          <Row label="Perdida por conectores" value={`${design.total_connector_loss_db.toFixed(4)} dB`} />
          <Row label="Perdida total" value={`${design.total_loss_db.toFixed(4)} dB`} />
          <Row label="Presupuesto optico" value={`${design.optical_budget_db.toFixed(4)} dB`} />
          <Row label="Margen final" value={`${design.final_margin_db.toFixed(4)} dB`} />
        </View>

        <View style={styles.section}>
          <Text style={styles.heading}>Recomendaciones</Text>
          {parseRecommendations(design).map((item) => (
            <Text key={item}>- {item}</Text>
          ))}
        </View>
      </Page>
    </Document>
  )
}
