"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { useMemo, useState } from "react"
import { EraserIcon, SaveIcon, SparklesIcon } from "lucide-react"

import { saveDesign, updateDesign } from "@/app/actions/links"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSet, FieldLegend } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { StatusBadge } from "@/components/status-badge"
import type { LinkDesign } from "@/lib/database.types"
import { calculateDistanceKm, calculateOpticalBudget, type Coordinate } from "@/lib/fibermap/calculations"
import { CABLE_TYPES, DEFAULT_LINK_VALUES, FIBER_TYPES, WAVELENGTHS } from "@/lib/fibermap/constants"

const LinkMap = dynamic(
  () => import("@/components/map/link-map").then((mod) => mod.LinkMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[420px] w-full items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
        Cargando mapa...
      </div>
    ),
  }
)

type FormState = {
  name: string
  description: string
  origin_name: string
  destination_name: string
  pointA: Coordinate | null
  pointB: Coordinate | null
  map_distance_km: number
  real_distance_km: number
  cable_type: "asu" | "adss" | "other"
  fiber_strands: number
  wavelength_nm: 1310 | 1550
  fiber_type: "single_mode" | "multi_mode"
  transmitter_power_dbm: number
  receiver_sensitivity_dbm: number
  attenuation_db_per_km: number
  splice_count: number
  splice_loss_db: number
  connector_count: number
  connector_loss_db: number
  safety_margin_db: number
}

const DEMO_LINK_STATE: FormState = {
  name: "Enlace demo ASU - Zona urbana",
  description: "Diseno de prueba para validar calculos de presupuesto optico.",
  origin_name: "Nodo Central",
  destination_name: "Cliente Empresarial",
  pointA: { lat: -17.783327, lng: -63.18214 },
  pointB: { lat: -17.754962, lng: -63.161884 },
  map_distance_km: 0,
  real_distance_km: 4.25,
  cable_type: "asu",
  fiber_strands: 12,
  wavelength_nm: 1550,
  fiber_type: "single_mode",
  transmitter_power_dbm: 3,
  receiver_sensitivity_dbm: -24,
  attenuation_db_per_km: 0.22,
  splice_count: 6,
  splice_loss_db: 0.1,
  connector_count: 4,
  connector_loss_db: 0.3,
  safety_margin_db: 3,
}

function initialState(design?: LinkDesign): FormState {
  return {
    name: design?.name ?? "",
    description: design?.description ?? "",
    origin_name: design?.origin_name ?? "",
    destination_name: design?.destination_name ?? "",
    pointA: design ? { lat: design.point_a_lat, lng: design.point_a_lng } : null,
    pointB: design ? { lat: design.point_b_lat, lng: design.point_b_lng } : null,
    map_distance_km: design?.map_distance_km ?? 0,
    real_distance_km: design?.real_distance_km ?? 0,
    cable_type: design?.cable_type ?? DEFAULT_LINK_VALUES.cable_type,
    fiber_strands: design?.fiber_strands ?? DEFAULT_LINK_VALUES.fiber_strands,
    wavelength_nm: (design?.wavelength_nm as 1310 | 1550) ?? DEFAULT_LINK_VALUES.wavelength_nm,
    fiber_type: design?.fiber_type ?? DEFAULT_LINK_VALUES.fiber_type,
    transmitter_power_dbm: design?.transmitter_power_dbm ?? DEFAULT_LINK_VALUES.transmitter_power_dbm,
    receiver_sensitivity_dbm: design?.receiver_sensitivity_dbm ?? DEFAULT_LINK_VALUES.receiver_sensitivity_dbm,
    attenuation_db_per_km: design?.attenuation_db_per_km ?? DEFAULT_LINK_VALUES.attenuation_db_per_km,
    splice_count: design?.splice_count ?? DEFAULT_LINK_VALUES.splice_count,
    splice_loss_db: design?.splice_loss_db ?? DEFAULT_LINK_VALUES.splice_loss_db,
    connector_count: design?.connector_count ?? DEFAULT_LINK_VALUES.connector_count,
    connector_loss_db: design?.connector_loss_db ?? DEFAULT_LINK_VALUES.connector_loss_db,
    safety_margin_db: design?.safety_margin_db ?? DEFAULT_LINK_VALUES.safety_margin_db,
  }
}

export function LinkDesigner({
  design,
  error,
}: {
  design?: LinkDesign
  error?: string
}) {
  const [state, setState] = useState<FormState>(() => initialState(design))
  const [realDistanceEdited, setRealDistanceEdited] = useState(false)

  const result = useMemo(
    () =>
      calculateOpticalBudget({
        ...state,
        real_distance_km: state.real_distance_km || state.map_distance_km,
      }),
    [state]
  )

  const action = design ? updateDesign : saveDesign

  function setNumber(key: keyof FormState, value: string) {
    setState((current) => ({ ...current, [key]: Number(value) }))
  }

  function setRealDistance(value: string) {
    setRealDistanceEdited(true)
    setNumber("real_distance_km", value)
  }

  function setPoints(pointA: Coordinate | null, pointB: Coordinate | null) {
    const distance = pointA && pointB ? calculateDistanceKm(pointA, pointB) : 0

    if (!pointA || !pointB) {
      setRealDistanceEdited(false)
    }

    setState((current) => ({
      ...current,
      pointA,
      pointB,
      map_distance_km: distance,
      real_distance_km:
        pointA && pointB && realDistanceEdited && current.real_distance_km > distance
          ? current.real_distance_km
          : distance,
    }))
  }

  function clearPoints() {
    setRealDistanceEdited(false)
    setState((current) => ({
      ...current,
      pointA: null,
      pointB: null,
      map_distance_km: 0,
      real_distance_km: 0,
    }))
  }

  function fillDemoData() {
    const mapDistance = calculateDistanceKm(
      DEMO_LINK_STATE.pointA as Coordinate,
      DEMO_LINK_STATE.pointB as Coordinate
    )

    setRealDistanceEdited(false)
    setState({
      ...DEMO_LINK_STATE,
      map_distance_km: mapDistance,
    })
  }

  return (
    <form action={action} className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
      {design ? <input type="hidden" name="id" value={design.id} /> : null}
      <input type="hidden" name="point_a_lat" value={state.pointA?.lat ?? ""} />
      <input type="hidden" name="point_a_lng" value={state.pointA?.lng ?? ""} />
      <input type="hidden" name="point_b_lat" value={state.pointB?.lat ?? ""} />
      <input type="hidden" name="point_b_lng" value={state.pointB?.lng ?? ""} />
      <input type="hidden" name="map_distance_km" value={state.map_distance_km} />
      <input type="hidden" name="cable_type" value={state.cable_type} />
      <input type="hidden" name="wavelength_nm" value={state.wavelength_nm} />
      <input type="hidden" name="fiber_type" value={state.fiber_type} />

      <div className="flex flex-col gap-6">
        {error ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
              <div>
                <CardTitle>Mapa del enlace</CardTitle>
                <CardDescription>
                  Haz clic para seleccionar Punto A y luego Punto B. El tercer clic reinicia la seleccion.
                </CardDescription>
              </div>
              <Badge variant={state.pointA && state.pointB ? "secondary" : "outline"}>
                {state.pointA && state.pointB ? "Enlace definido" : "Seleccion pendiente"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="rounded-xl border bg-muted/40 p-1 shadow-sm">
              <div className="overflow-hidden rounded-lg border bg-background">
                <LinkMap pointA={state.pointA} pointB={state.pointB} onChange={setPoints} />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Metric label="Punto A" value={state.pointA ? `${state.pointA.lat}, ${state.pointA.lng}` : "Haz clic en el mapa"} />
              <Metric label="Punto B" value={state.pointB ? `${state.pointB.lat}, ${state.pointB.lng}` : state.pointA ? "Haz clic para cerrar el enlace" : "Pendiente"} />
              <Metric label="Distancia mapa" value={`${state.map_distance_km.toFixed(4)} km`} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={clearPoints}>
                <EraserIcon data-icon="inline-start" />
                Limpiar puntos
              </Button>
              <Button type="button" variant="secondary" onClick={fillDemoData}>
                <SparklesIcon data-icon="inline-start" />
                Autocompletar demo
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Datos del enlace</CardTitle>
            <CardDescription>Identifica el diseno y ajusta la distancia real del cable.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="name">Nombre del enlace</FieldLabel>
                  <Input id="name" name="name" value={state.name} onChange={(event) => setState({ ...state, name: event.target.value })} required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="real_distance_km">Distancia real del cable (km)</FieldLabel>
                  <Input id="real_distance_km" name="real_distance_km" type="number" step="0.0001" min="0.0001" value={state.real_distance_km} onChange={(event) => setRealDistance(event.target.value)} required />
                  <FieldDescription>Puede ser mayor que la distancia recta del mapa.</FieldDescription>
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="description">Descripcion</FieldLabel>
                <Textarea id="description" name="description" value={state.description} onChange={(event) => setState({ ...state, description: event.target.value })} />
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="origin_name">Origen</FieldLabel>
                  <Input id="origin_name" name="origin_name" value={state.origin_name} onChange={(event) => setState({ ...state, origin_name: event.target.value })} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="destination_name">Destino</FieldLabel>
                  <Input id="destination_name" name="destination_name" value={state.destination_name} onChange={(event) => setState({ ...state, destination_name: event.target.value })} />
                </Field>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <SelectField label="Tipo de cable" value={state.cable_type} items={CABLE_TYPES} onChange={(value) => setState({ ...state, cable_type: value as FormState["cable_type"] })} />
                <Field>
                  <FieldLabel htmlFor="fiber_strands">Hilos</FieldLabel>
                  <Input id="fiber_strands" name="fiber_strands" type="number" min="1" value={state.fiber_strands} onChange={(event) => setNumber("fiber_strands", event.target.value)} required />
                </Field>
                <SelectField label="Longitud de onda" value={String(state.wavelength_nm)} items={WAVELENGTHS.map((item) => ({ value: String(item.value), label: item.label }))} onChange={(value) => setState({ ...state, wavelength_nm: Number(value) as 1310 | 1550 })} />
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Parametros tecnicos</CardTitle>
            <CardDescription>Estos valores alimentan el presupuesto optico.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldSet>
              <FieldLegend>Equipos y fibra</FieldLegend>
              <div className="grid gap-4 md:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor="transmitter_power_dbm">Potencia TX (dBm)</FieldLabel>
                  <Input id="transmitter_power_dbm" name="transmitter_power_dbm" type="number" step="0.001" value={state.transmitter_power_dbm} onChange={(event) => setNumber("transmitter_power_dbm", event.target.value)} required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="receiver_sensitivity_dbm">Sensibilidad RX (dBm)</FieldLabel>
                  <Input id="receiver_sensitivity_dbm" name="receiver_sensitivity_dbm" type="number" step="0.001" value={state.receiver_sensitivity_dbm} onChange={(event) => setNumber("receiver_sensitivity_dbm", event.target.value)} required />
                </Field>
                <SelectField label="Tipo de fibra" value={state.fiber_type} items={FIBER_TYPES} onChange={(value) => setState({ ...state, fiber_type: value as FormState["fiber_type"] })} />
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <Field>
                  <FieldLabel htmlFor="attenuation_db_per_km">Atenuacion (dB/km)</FieldLabel>
                  <Input id="attenuation_db_per_km" name="attenuation_db_per_km" type="number" step="0.0001" min="0" value={state.attenuation_db_per_km} onChange={(event) => setNumber("attenuation_db_per_km", event.target.value)} required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="splice_count">Empalmes</FieldLabel>
                  <Input id="splice_count" name="splice_count" type="number" min="0" value={state.splice_count} onChange={(event) => setNumber("splice_count", event.target.value)} required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="splice_loss_db">Perdida/empalme</FieldLabel>
                  <Input id="splice_loss_db" name="splice_loss_db" type="number" step="0.0001" min="0" value={state.splice_loss_db} onChange={(event) => setNumber("splice_loss_db", event.target.value)} required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="safety_margin_db">Margen seguridad</FieldLabel>
                  <Input id="safety_margin_db" name="safety_margin_db" type="number" step="0.001" min="0" value={state.safety_margin_db} onChange={(event) => setNumber("safety_margin_db", event.target.value)} required />
                </Field>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="connector_count">Conectores</FieldLabel>
                  <Input id="connector_count" name="connector_count" type="number" min="0" value={state.connector_count} onChange={(event) => setNumber("connector_count", event.target.value)} required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="connector_loss_db">Perdida/conector</FieldLabel>
                  <Input id="connector_loss_db" name="connector_loss_db" type="number" step="0.0001" min="0" value={state.connector_loss_db} onChange={(event) => setNumber("connector_loss_db", event.target.value)} required />
                </Field>
              </div>
            </FieldSet>
          </CardContent>
        </Card>
      </div>

      <aside className="flex flex-col gap-6">
        <Card className="sticky top-6 overflow-hidden shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Resultado</CardTitle>
              <StatusBadge status={result.status} />
            </div>
            <CardDescription>Calculo en vivo; al guardar se recalcula en servidor.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="grid gap-3">
              <Metric label="Perdida por distancia" value={`${result.fiber_loss_db.toFixed(4)} dB`} />
              <Metric label="Perdida empalmes" value={`${result.total_splice_loss_db.toFixed(4)} dB`} />
              <Metric label="Perdida conectores" value={`${result.total_connector_loss_db.toFixed(4)} dB`} />
              <Metric label="Perdida total" value={`${result.total_loss_db.toFixed(4)} dB`} />
              <Metric label="Presupuesto optico" value={`${result.optical_budget_db.toFixed(4)} dB`} />
              <Metric label="Margen final" value={`${result.final_margin_db.toFixed(4)} dB`} />
            </div>
            <Separator />
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Recomendaciones</p>
              <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
                {result.recommendations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-2">
              <Button disabled={!state.pointA || !state.pointB}>
                <SaveIcon data-icon="inline-start" />
                {design ? "Actualizar calculo" : "Guardar calculo"}
              </Button>
              <Button variant="outline" asChild>
                <Link href="/links">Volver al historial</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </aside>
    </form>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate font-medium">{value}</p>
    </div>
  )
}

function SelectField({
  label,
  value,
  items,
  onChange,
}: {
  label: string
  value: string
  items: readonly { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  )
}
