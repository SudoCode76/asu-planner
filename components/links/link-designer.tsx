"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { ChangeEvent, useActionState, useMemo, useRef, useState } from "react"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  DownloadIcon,
  EraserIcon,
  FileUpIcon,
  MapPinnedIcon,
  PencilRulerIcon,
  PlusIcon,
  RouteIcon,
  SaveIcon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react"

import { saveDesign, updateDesign } from "@/app/actions/links"
import type { DesignActionState } from "@/app/actions/links"
import { StatusBadge } from "@/components/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSet, FieldLegend } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import type { LinkDesign } from "@/lib/database.types"
import { calculateDistanceKm, calculateOpticalBudget, type Coordinate } from "@/lib/fibermap/calculations"
import { CABLE_TYPES, DEFAULT_LINK_VALUES, FIBER_TYPES, WAVELENGTHS } from "@/lib/fibermap/constants"
import {
  DEFAULT_MECHANICAL_PROFILE,
  analyzeRoute,
  buildRoutePoints,
  parseGisLayers,
  parseMechanicalProfile,
  parseRoutePoints,
  type GisLayer,
  type MechanicalProfile,
  type RoutePoint,
} from "@/lib/fibermap/gis"
import { ENTEL_NODES } from "@/lib/fibermap/entel-network"
import { cn } from "@/lib/utils"

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

type MapMode = "select" | "pole" | "measure" | "inspect"
type DesignMode = "free" | "entel"
type DemoKind = "viable" | "non_viable"
type TabValue = "mapa" | "ruta" | "optico" | "mecanico" | "capas"

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
  route_points: RoutePoint[]
  gis_layers: GisLayer[]
  mechanical_profile: MechanicalProfile
}

const DEMO_BASE_STATE: FormState = {
  name: "Enlace demo ASU - Zona urbana",
  description: "Diseno de prueba con postes intermedios para validar calculos GIS, mecanicos y presupuesto optico.",
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
  route_points: [
    { id: "demo-pole-1", kind: "pole", label: "Poste 1", lat: -17.776521, lng: -63.176984 },
    { id: "demo-pole-2", kind: "pole", label: "Poste 2", lat: -17.769807, lng: -63.172223 },
    { id: "demo-pole-3", kind: "splice", label: "Empalme 1", lat: -17.763349, lng: -63.167138 },
  ],
  gis_layers: [],
  mechanical_profile: DEFAULT_MECHANICAL_PROFILE,
}

const DEMO_LINK_STATES: Record<DemoKind, FormState> = {
  viable: {
    ...DEMO_BASE_STATE,
    name: "Demo viable ASU - Zona urbana",
    description: "Caso demo con margen optico holgado para validar un enlace viable.",
    transmitter_power_dbm: 3,
    receiver_sensitivity_dbm: -24,
    attenuation_db_per_km: 0.22,
    splice_count: 6,
    splice_loss_db: 0.1,
    connector_count: 4,
    connector_loss_db: 0.3,
    safety_margin_db: 3,
  },
  non_viable: {
    ...DEMO_BASE_STATE,
    name: "Demo no viable ASU - Zona urbana",
    description: "Caso demo con presupuesto optico insuficiente para validar un enlace no viable.",
    transmitter_power_dbm: -5,
    receiver_sensitivity_dbm: -15,
    attenuation_db_per_km: 0.5,
    splice_count: 20,
    splice_loss_db: 0.2,
    connector_count: 8,
    connector_loss_db: 0.5,
    safety_margin_db: 3,
  },
}

const FIELD_TABS: Record<string, TabValue> = {
  name: "optico",
  real_distance_km: "optico",
  cable_type: "optico",
  fiber_strands: "optico",
  wavelength_nm: "optico",
  fiber_type: "optico",
  transmitter_power_dbm: "optico",
  receiver_sensitivity_dbm: "optico",
  attenuation_db_per_km: "optico",
  splice_count: "optico",
  splice_loss_db: "optico",
  connector_count: "optico",
  connector_loss_db: "optico",
  safety_margin_db: "optico",
  point_a: "mapa",
  point_a_lat: "mapa",
  point_a_lng: "mapa",
  point_b: "mapa",
  point_b_lat: "mapa",
  point_b_lng: "mapa",
  map_distance_km: "mapa",
}

const EMPTY_ACTION_STATE: DesignActionState = { status: "idle" }

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
    route_points: parseRoutePoints(design?.route_points),
    gis_layers: parseGisLayers(design?.gis_layers),
    mechanical_profile: parseMechanicalProfile(design?.mechanical_profile),
  }
}

export function LinkDesigner({
  design,
  error,
}: {
  design?: LinkDesign
  error?: string
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<FormState>(() => initialState(design))
  const [mapMode, setMapMode] = useState<MapMode>("select")
  const [designMode, setDesignMode] = useState<DesignMode>("free")
  const [activeTab, setActiveTab] = useState<TabValue>("mapa")
  const [selectedDemo, setSelectedDemo] = useState<DemoKind | "">("")
  const [selectedEntelNodeId, setSelectedEntelNodeId] = useState<string | undefined>(undefined)
  const [realDistanceEdited, setRealDistanceEdited] = useState(false)

  const routeAnalysis = useMemo(() => {
    return analyzeRoute(
      buildRoutePoints(state.pointA, state.route_points, state.pointB),
      state.mechanical_profile
    )
  }, [state.pointA, state.pointB, state.route_points, state.mechanical_profile])

  const effectiveDistance = routeAnalysis.total_cable_length_km || state.real_distance_km || state.map_distance_km
  const result = useMemo(
    () =>
      calculateOpticalBudget({
        ...state,
        real_distance_km: effectiveDistance,
      }),
    [state, effectiveDistance]
  )

  const action = design ? updateDesign : saveDesign
  const [actionState, formAction, isPending] = useActionState(action, EMPTY_ACTION_STATE)
  const fieldErrors = actionState.fieldErrors ?? {}
  const errorEntries = Object.entries(fieldErrors)
  const hasActionError = actionState.status === "error"
  const legacyErrorState = error
    ? { status: "error" as const, message: error, fieldErrors: {} }
    : null
  const visibleError = hasActionError ? actionState : legacyErrorState
  const mapErrorMessages = Array.from(new Set([
    ...(fieldErrors.point_a ?? []),
    ...(fieldErrors.point_a_lat ?? []),
    ...(fieldErrors.point_a_lng ?? []),
    ...(fieldErrors.point_b ?? []),
    ...(fieldErrors.point_b_lat ?? []),
    ...(fieldErrors.point_b_lng ?? []),
    ...(fieldErrors.map_distance_km ?? []),
  ]))

  function getEntelNode(id: string) {
    return ENTEL_NODES.find((node) => node.id === id)
  }

  function applyEntelNodeSelect(nodeId: string) {
    const node = getEntelNode(nodeId)
    if (!node) return

    const nodeCoordinate = { lat: node.lat, lng: node.lon }

    if (mapMode === "pole") {
      if (!state.pointA) return

      setState((current) => ({
        ...current,
        route_points: [
          ...current.route_points,
          {
            ...nodeCoordinate,
            id: `entel-pole-${node.id}-${Date.now()}`,
            kind: "pole",
            label: node.name,
          },
        ],
      }))
      return
    }

    if (mapMode !== "select") return

    setDesignMode("entel")
    setRealDistanceEdited(false)
    setState((current) => {
      if (!current.pointA || current.pointB) {
        setSelectedEntelNodeId(node.id)

        return {
          ...current,
          name: current.name || `Enlace Entel ${node.name} - nuevo destino`,
          description: current.description || `Diseno iniciado desde el nodo ${node.name} de la red Entel Bolivia hacia un nuevo punto.`,
          origin_name: node.name,
          destination_name: current.destination_name && current.destination_name !== node.name ? current.destination_name : "",
          pointA: nodeCoordinate,
          pointB: null,
          map_distance_km: 0,
          real_distance_km: 0,
          route_points: [],
        }
      }

      const distance = calculateDistanceKm(current.pointA, nodeCoordinate)

      return {
        ...current,
        destination_name: node.name,
        pointB: nodeCoordinate,
        map_distance_km: distance,
        real_distance_km: current.real_distance_km > distance ? current.real_distance_km : distance,
      }
    })
  }

  function setNumber(key: keyof FormState, value: string) {
    setState((current) => ({ ...current, [key]: Number(value) }))
  }

  function setMechanicalNumber(key: keyof MechanicalProfile, value: string) {
    setState((current) => ({
      ...current,
      mechanical_profile: {
        ...current.mechanical_profile,
        [key]: Number(value),
      },
    }))
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
      route_points: pointA ? current.route_points : [],
      map_distance_km: distance,
      real_distance_km:
        pointA && pointB && realDistanceEdited && current.real_distance_km > distance
          ? current.real_distance_km
          : distance,
    }))
    if (designMode !== "entel" || !pointA) {
      setSelectedEntelNodeId(undefined)
    }
  }

  function clearPoints() {
    setRealDistanceEdited(false)
    setSelectedEntelNodeId(undefined)
    setState((current) => ({
      ...current,
      pointA: null,
      pointB: null,
      route_points: [],
      map_distance_km: 0,
      real_distance_km: 0,
    }))
  }

  function fillDemoData(kind: DemoKind) {
    const demoState = DEMO_LINK_STATES[kind]
    const mapDistance = calculateDistanceKm(
      demoState.pointA as Coordinate,
      demoState.pointB as Coordinate
    )

    setSelectedDemo(kind)
    setRealDistanceEdited(false)
    setDesignMode("free")
    setActiveTab("mapa")
    setSelectedEntelNodeId(undefined)
    setState({
      ...demoState,
      map_distance_km: mapDistance,
    })
  }

  function updateRoutePoint(index: number, key: "label" | "kind", value: string) {
    setState((current) => ({
      ...current,
      route_points: current.route_points.map((point, pointIndex) =>
        pointIndex === index ? { ...point, [key]: value } as RoutePoint : point
      ),
    }))
  }

  function moveRoutePoint(index: number, direction: -1 | 1) {
    setState((current) => {
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= current.route_points.length) return current

      const routePoints = [...current.route_points]
      const [point] = routePoints.splice(index, 1)
      routePoints.splice(nextIndex, 0, point)

      return { ...current, route_points: routePoints }
    })
  }

  function removeRoutePoint(index: number) {
    setState((current) => ({
      ...current,
      route_points: current.route_points.filter((_, pointIndex) => pointIndex !== index),
    }))
  }

  function exportGeoJson() {
    const lineCoordinates = routeAnalysis.points.map((point) => [point.lng, point.lat])
    const features = [
      ...(lineCoordinates.length >= 2
        ? [{
            type: "Feature",
            properties: { name: state.name || "Ruta FiberMap ASU", kind: "fiber_route" },
            geometry: { type: "LineString", coordinates: lineCoordinates },
          }]
        : []),
      ...routeAnalysis.points.map((point) => ({
        type: "Feature",
        properties: { name: point.label, kind: point.kind },
        geometry: { type: "Point", coordinates: [point.lng, point.lat] },
      })),
    ]
    const geojson = {
      type: "FeatureCollection",
      features,
    }
    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: "application/geo+json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${slugify(state.name || "fibermap-asu-ruta")}.geojson`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function importLayer(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const text = await file.text()
    const layerData = file.name.toLowerCase().endsWith(".kml")
      ? kmlToGeoJson(text)
      : JSON.parse(text)
    const featureCount = Array.isArray(layerData.features) ? layerData.features.length : 1

    setState((current) => ({
      ...current,
      gis_layers: [
        ...current.gis_layers,
        {
          id: `layer-${Date.now()}`,
          name: file.name,
          type: file.name.toLowerCase().endsWith(".kml") ? "kml" : "geojson",
          featureCount,
          data: layerData,
        },
      ],
    }))

    event.target.value = ""
  }

  function tabHasError(tab: TabValue) {
    return Object.keys(fieldErrors).some((field) => (FIELD_TABS[field] ?? "optico") === tab)
  }

  function focusFirstIncompleteSection() {
    if (!state.pointA || !state.pointB) {
      setActiveTab("mapa")
      return
    }

    if (!state.name.trim() || effectiveDistance <= 0) {
      setActiveTab("optico")
    }
  }

  return (
    <form action={formAction} noValidate onSubmit={focusFirstIncompleteSection} className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
      {design ? <input type="hidden" name="id" value={design.id} /> : null}
      <input type="hidden" name="point_a_lat" value={state.pointA?.lat ?? ""} />
      <input type="hidden" name="point_a_lng" value={state.pointA?.lng ?? ""} />
      <input type="hidden" name="point_b_lat" value={state.pointB?.lat ?? ""} />
      <input type="hidden" name="point_b_lng" value={state.pointB?.lng ?? ""} />
      <input type="hidden" name="map_distance_km" value={state.map_distance_km} />
      <input type="hidden" name="route_points" value={JSON.stringify(state.route_points)} />
      <input type="hidden" name="gis_layers" value={JSON.stringify(state.gis_layers)} />
      <input type="hidden" name="mechanical_profile" value={JSON.stringify(state.mechanical_profile)} />
      <input type="hidden" name="cable_type" value={state.cable_type} />
      <input type="hidden" name="wavelength_nm" value={state.wavelength_nm} />
      <input type="hidden" name="fiber_type" value={state.fiber_type} />

      <div className="flex flex-col gap-6">
        {visibleError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <p className="font-medium">{visibleError.message}</p>
            {errorEntries.length ? (
              <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
                {errorEntries.flatMap(([field, messages]) =>
                  messages.map((message) => (
                    <li key={`${field}-${message}`}>{message}</li>
                  ))
                )}
              </ul>
            ) : null}
          </div>
        ) : null}

        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
              <div>
                <CardTitle>Disenador GIS del enlace</CardTitle>
                <CardDescription>
                  Define Punto A/B, agrega postes intermedios, importa capas y revisa vanos antes de guardar.
                </CardDescription>
              </div>
              <Badge variant={state.pointA && state.pointB ? "secondary" : "outline"}>
                {state.pointA && state.pointB ? "Ruta definida" : "Seleccion pendiente"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)} className="flex flex-col gap-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="mapa" className={cn(tabHasError("mapa") && "text-destructive")}>Mapa</TabsTrigger>
                <TabsTrigger value="ruta" className={cn(tabHasError("ruta") && "text-destructive")}>Ruta</TabsTrigger>
                <TabsTrigger value="optico" className={cn(tabHasError("optico") && "text-destructive")}>Optico</TabsTrigger>
                <TabsTrigger value="mecanico" className={cn(tabHasError("mecanico") && "text-destructive")}>Mecanico</TabsTrigger>
                <TabsTrigger value="capas" className={cn(tabHasError("capas") && "text-destructive")}>Capas</TabsTrigger>
              </TabsList>

              <TabsContent value="mapa" className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant={designMode === "free" ? "default" : "outline"} onClick={() => setDesignMode("free")}>
                    <MapPinnedIcon data-icon="inline-start" />
                    Diseno libre
                  </Button>
                  <Button type="button" size="sm" variant={designMode === "entel" ? "default" : "outline"} onClick={() => {
                    setDesignMode("entel")
                    setMapMode("select")
                  }}>
                    <RouteIcon data-icon="inline-start" />
                    Desde red Entel
                  </Button>
                </div>
                {designMode === "entel" ? (
                  <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                    Modo red Entel: usa A/B para seleccionar nodos o puntos del mapa, y Postes para agregar apoyos intermedios.
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <ModeButton mode="select" current={mapMode} onClick={setMapMode} label="A/B" icon={MapPinnedIcon} />
                  <ModeButton mode="pole" current={mapMode} onClick={setMapMode} label="Postes" icon={PlusIcon} />
                  <ModeButton mode="measure" current={mapMode} onClick={setMapMode} label="Medir" icon={PencilRulerIcon} />
                  <ModeButton mode="inspect" current={mapMode} onClick={setMapMode} label="Inspeccionar" icon={RouteIcon} />
                </div>
                <div className="rounded-xl border bg-muted/40 p-1 shadow-sm">
                  <div className="overflow-hidden rounded-lg border bg-background">
                    <LinkMap
                      designMode={designMode}
                      pointA={state.pointA}
                      pointB={state.pointB}
                      mode={mapMode}
                      routePoints={state.route_points}
                      gisLayers={state.gis_layers}
                      selectedEntelNodeId={selectedEntelNodeId}
                      onChange={setPoints}
                      onEntelOriginSelect={applyEntelNodeSelect}
                      onRoutePointsChange={(points) => setState((current) => ({ ...current, route_points: points }))}
                    />
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <Metric label="Punto A" value={state.pointA ? `${state.pointA.lat}, ${state.pointA.lng}` : designMode === "entel" ? "Selecciona un nodo Entel" : "Haz clic en el mapa"} />
                  <Metric label="Punto B" value={state.pointB ? `${state.pointB.lat}, ${state.pointB.lng}` : state.pointA ? "Haz clic para elegir destino" : "Pendiente"} />
                  <Metric label="Distancia por ruta" value={`${routeAnalysis.total_cable_length_km.toFixed(4)} km`} />
                </div>
                {mapErrorMessages.length ? (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    <ul className="flex list-disc flex-col gap-1 pl-5">
                      {mapErrorMessages.map((message) => (
                        <li key={message}>{message}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={clearPoints}>
                    <EraserIcon data-icon="inline-start" />
                    Limpiar puntos
                  </Button>
                  <div className="min-w-[220px]">
                    <Select value={selectedDemo} onValueChange={(value) => fillDemoData(value as DemoKind)}>
                      <SelectTrigger className="w-full">
                        <SparklesIcon data-icon="inline-start" />
                        <SelectValue placeholder="Autocompletar demo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="viable">Demo viable</SelectItem>
                          <SelectItem value="non_viable">Demo no viable</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="button" variant="outline" onClick={exportGeoJson}>
                    <DownloadIcon data-icon="inline-start" />
                    Exportar GeoJSON
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="ruta" className="flex flex-col gap-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <Metric label="Puntos de ruta" value={String(routeAnalysis.points.length)} />
                  <Metric label="Tramos" value={String(routeAnalysis.spans.length)} />
                  <Metric label="Reserva" value={`${routeAnalysis.reserve_length_km.toFixed(4)} km`} />
                  <Metric label="Vano maximo" value={`${routeAnalysis.max_span_m.toFixed(2)} m`} />
                </div>
                <div className="flex flex-col gap-2">
                  {state.route_points.length ? (
                    state.route_points.map((point, index) => (
                      <div key={point.id} className="grid gap-2 rounded-lg border bg-muted/30 p-3 md:grid-cols-[1fr_140px_auto]">
                        <Input
                          value={point.label}
                          onChange={(event) => updateRoutePoint(index, "label", event.target.value)}
                          aria-label={`Nombre del punto ${index + 1}`}
                        />
                        <Select value={point.kind} onValueChange={(value) => updateRoutePoint(index, "kind", value)}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectItem value="pole">Poste</SelectItem>
                              <SelectItem value="splice">Empalme</SelectItem>
                              <SelectItem value="reserve">Reserva</SelectItem>
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <div className="flex gap-1">
                          <Button type="button" size="icon" variant="outline" onClick={() => moveRoutePoint(index, -1)} aria-label="Subir punto">
                            <ArrowUpIcon />
                          </Button>
                          <Button type="button" size="icon" variant="outline" onClick={() => moveRoutePoint(index, 1)} aria-label="Bajar punto">
                            <ArrowDownIcon />
                          </Button>
                          <Button type="button" size="icon" variant="destructive" onClick={() => removeRoutePoint(index)} aria-label="Eliminar punto">
                            <Trash2Icon />
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                      Cambia el modo del mapa a Postes y haz clic sobre el recorrido para construir la ruta real.
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="optico">
                <LinkDataFields state={state} fieldErrors={fieldErrors} setState={setState} setNumber={setNumber} setRealDistance={setRealDistance} />
              </TabsContent>

              <TabsContent value="mecanico">
                <MechanicalFields state={state} setState={setState} setMechanicalNumber={setMechanicalNumber} />
              </TabsContent>

              <TabsContent value="capas" className="flex flex-col gap-4">
                <input ref={fileInputRef} type="file" accept=".geojson,.json,.kml" className="hidden" onChange={(event) => void importLayer(event)} />
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <FileUpIcon data-icon="inline-start" />
                    Importar GeoJSON/KML
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setState((current) => ({ ...current, gis_layers: [] }))}>
                    <EraserIcon data-icon="inline-start" />
                    Limpiar capas
                  </Button>
                </div>
                <div className="grid gap-3">
                  {state.gis_layers.length ? (
                    state.gis_layers.map((layer) => (
                      <div key={layer.id} className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{layer.name}</p>
                          <p className="text-xs text-muted-foreground">{layer.type.toUpperCase()} - {layer.featureCount} geometria(s)</p>
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => setState((current) => ({
                            ...current,
                            gis_layers: current.gis_layers.filter((item) => item.id !== layer.id),
                          }))}
                          aria-label="Eliminar capa"
                        >
                          <Trash2Icon />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                      No hay capas importadas. Puedes cargar restricciones, zonas, rutas de referencia o notas de campo en GeoJSON/KML.
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
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
            <CardDescription>El calculo visible es auxiliar; al guardar se recalcula en servidor.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="grid gap-3">
              <Metric label="Cable total con reserva" value={`${effectiveDistance.toFixed(4)} km`} />
              <Metric label="Perdida por distancia" value={`${result.fiber_loss_db.toFixed(4)} dB`} />
              <Metric label="Perdida total" value={`${result.total_loss_db.toFixed(4)} dB`} />
              <Metric label="Presupuesto optico" value={`${result.optical_budget_db.toFixed(4)} dB`} />
              <Metric label="Margen final" value={`${result.final_margin_db.toFixed(4)} dB`} />
            </div>
            <Separator />
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Advertencias GIS/mecanicas</p>
              <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
                {routeAnalysis.warnings.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <Separator />
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Recomendaciones opticas</p>
              <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
                {result.recommendations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-2">
              <Button type="submit" disabled={isPending}>
                <SaveIcon data-icon="inline-start" />
                {isPending ? "Guardando..." : design ? "Actualizar calculo" : "Guardar calculo"}
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

function LinkDataFields({
  state,
  fieldErrors,
  setState,
  setNumber,
  setRealDistance,
}: {
  state: FormState
  fieldErrors: Record<string, string[]>
  setState: (state: FormState) => void
  setNumber: (key: keyof FormState, value: string) => void
  setRealDistance: (value: string) => void
}) {
  const errorFor = (field: string) => fieldErrors[field]?.[0]

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Datos del enlace</CardTitle>
          <CardDescription>Identifica el diseno y ajusta la distancia real del cable si aplica.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-4 md:grid-cols-2">
              <Field data-invalid={!!errorFor("name")}>
                <FieldLabel htmlFor="name">Nombre del enlace</FieldLabel>
                <Input id="name" name="name" value={state.name} onChange={(event) => setState({ ...state, name: event.target.value })} aria-invalid={!!errorFor("name")} required />
                {errorFor("name") ? <FieldDescription>{errorFor("name")}</FieldDescription> : null}
              </Field>
              <Field data-invalid={!!errorFor("real_distance_km")}>
                <FieldLabel htmlFor="real_distance_km">Distancia manual de cable (km)</FieldLabel>
                <Input id="real_distance_km" name="real_distance_km" type="number" step="0.0001" min="0.0001" value={state.real_distance_km} onChange={(event) => setRealDistance(event.target.value)} aria-invalid={!!errorFor("real_distance_km")} required />
                <FieldDescription>{errorFor("real_distance_km") ?? "Si hay postes, el servidor prioriza la distancia por ruta con reserva."}</FieldDescription>
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
              <SelectField label="Tipo de cable" value={state.cable_type} items={CABLE_TYPES} error={errorFor("cable_type")} onChange={(value) => setState({ ...state, cable_type: value as FormState["cable_type"] })} />
              <Field data-invalid={!!errorFor("fiber_strands")}>
                <FieldLabel htmlFor="fiber_strands">Hilos</FieldLabel>
                <Input id="fiber_strands" name="fiber_strands" type="number" min="1" value={state.fiber_strands} onChange={(event) => setNumber("fiber_strands", event.target.value)} aria-invalid={!!errorFor("fiber_strands")} required />
                {errorFor("fiber_strands") ? <FieldDescription>{errorFor("fiber_strands")}</FieldDescription> : null}
              </Field>
              <SelectField label="Longitud de onda" value={String(state.wavelength_nm)} items={WAVELENGTHS.map((item) => ({ value: String(item.value), label: item.label }))} error={errorFor("wavelength_nm")} onChange={(value) => setState({ ...state, wavelength_nm: Number(value) as 1310 | 1550 })} />
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Parametros opticos</CardTitle>
          <CardDescription>Estos valores alimentan el presupuesto optico.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldSet>
            <FieldLegend>Equipos y fibra</FieldLegend>
            <div className="grid gap-4 md:grid-cols-3">
              <Field data-invalid={!!errorFor("transmitter_power_dbm")}>
                <FieldLabel htmlFor="transmitter_power_dbm">Potencia TX (dBm)</FieldLabel>
                <Input id="transmitter_power_dbm" name="transmitter_power_dbm" type="number" step="0.001" value={state.transmitter_power_dbm} onChange={(event) => setNumber("transmitter_power_dbm", event.target.value)} aria-invalid={!!errorFor("transmitter_power_dbm")} required />
                {errorFor("transmitter_power_dbm") ? <FieldDescription>{errorFor("transmitter_power_dbm")}</FieldDescription> : null}
              </Field>
              <Field data-invalid={!!errorFor("receiver_sensitivity_dbm")}>
                <FieldLabel htmlFor="receiver_sensitivity_dbm">Sensibilidad RX (dBm)</FieldLabel>
                <Input id="receiver_sensitivity_dbm" name="receiver_sensitivity_dbm" type="number" step="0.001" value={state.receiver_sensitivity_dbm} onChange={(event) => setNumber("receiver_sensitivity_dbm", event.target.value)} aria-invalid={!!errorFor("receiver_sensitivity_dbm")} required />
                {errorFor("receiver_sensitivity_dbm") ? <FieldDescription>{errorFor("receiver_sensitivity_dbm")}</FieldDescription> : null}
              </Field>
              <SelectField label="Tipo de fibra" value={state.fiber_type} items={FIBER_TYPES} error={errorFor("fiber_type")} onChange={(value) => setState({ ...state, fiber_type: value as FormState["fiber_type"] })} />
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              <Field data-invalid={!!errorFor("attenuation_db_per_km")}>
                <FieldLabel htmlFor="attenuation_db_per_km">Atenuacion (dB/km)</FieldLabel>
                <Input id="attenuation_db_per_km" name="attenuation_db_per_km" type="number" step="0.0001" min="0" value={state.attenuation_db_per_km} onChange={(event) => setNumber("attenuation_db_per_km", event.target.value)} aria-invalid={!!errorFor("attenuation_db_per_km")} required />
                {errorFor("attenuation_db_per_km") ? <FieldDescription>{errorFor("attenuation_db_per_km")}</FieldDescription> : null}
              </Field>
              <Field data-invalid={!!errorFor("splice_count")}>
                <FieldLabel htmlFor="splice_count">Empalmes</FieldLabel>
                <Input id="splice_count" name="splice_count" type="number" min="0" value={state.splice_count} onChange={(event) => setNumber("splice_count", event.target.value)} aria-invalid={!!errorFor("splice_count")} required />
                {errorFor("splice_count") ? <FieldDescription>{errorFor("splice_count")}</FieldDescription> : null}
              </Field>
              <Field data-invalid={!!errorFor("splice_loss_db")}>
                <FieldLabel htmlFor="splice_loss_db">Perdida/empalme</FieldLabel>
                <Input id="splice_loss_db" name="splice_loss_db" type="number" step="0.0001" min="0" value={state.splice_loss_db} onChange={(event) => setNumber("splice_loss_db", event.target.value)} aria-invalid={!!errorFor("splice_loss_db")} required />
                {errorFor("splice_loss_db") ? <FieldDescription>{errorFor("splice_loss_db")}</FieldDescription> : null}
              </Field>
              <Field data-invalid={!!errorFor("safety_margin_db")}>
                <FieldLabel htmlFor="safety_margin_db">Margen seguridad</FieldLabel>
                <Input id="safety_margin_db" name="safety_margin_db" type="number" step="0.001" min="0" value={state.safety_margin_db} onChange={(event) => setNumber("safety_margin_db", event.target.value)} aria-invalid={!!errorFor("safety_margin_db")} required />
                {errorFor("safety_margin_db") ? <FieldDescription>{errorFor("safety_margin_db")}</FieldDescription> : null}
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field data-invalid={!!errorFor("connector_count")}>
                <FieldLabel htmlFor="connector_count">Conectores</FieldLabel>
                <Input id="connector_count" name="connector_count" type="number" min="0" value={state.connector_count} onChange={(event) => setNumber("connector_count", event.target.value)} aria-invalid={!!errorFor("connector_count")} required />
                {errorFor("connector_count") ? <FieldDescription>{errorFor("connector_count")}</FieldDescription> : null}
              </Field>
              <Field data-invalid={!!errorFor("connector_loss_db")}>
                <FieldLabel htmlFor="connector_loss_db">Perdida/conector</FieldLabel>
                <Input id="connector_loss_db" name="connector_loss_db" type="number" step="0.0001" min="0" value={state.connector_loss_db} onChange={(event) => setNumber("connector_loss_db", event.target.value)} aria-invalid={!!errorFor("connector_loss_db")} required />
                {errorFor("connector_loss_db") ? <FieldDescription>{errorFor("connector_loss_db")}</FieldDescription> : null}
              </Field>
            </div>
          </FieldSet>
        </CardContent>
      </Card>
    </div>
  )
}

function MechanicalFields({
  state,
  setState,
  setMechanicalNumber,
}: {
  state: FormState
  setState: (state: FormState) => void
  setMechanicalNumber: (key: keyof MechanicalProfile, value: string) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Perfil mecanico configurable</CardTitle>
        <CardDescription>
          Estimacion tecnica editable. No reemplaza validacion de campo ni diseno estructural certificado.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="mechanical_profile_name">Nombre del perfil</FieldLabel>
            <Input
              id="mechanical_profile_name"
              value={state.mechanical_profile.name}
              onChange={(event) => setState({
                ...state,
                mechanical_profile: { ...state.mechanical_profile, name: event.target.value },
              })}
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="max_span_m">Vano maximo (m)</FieldLabel>
              <Input id="max_span_m" type="number" min="1" value={state.mechanical_profile.max_span_m} onChange={(event) => setMechanicalNumber("max_span_m", event.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="reserve_percent">Reserva (%)</FieldLabel>
              <Input id="reserve_percent" type="number" min="0" step="0.1" value={state.mechanical_profile.reserve_percent} onChange={(event) => setMechanicalNumber("reserve_percent", event.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="max_sag_percent">Flecha maxima (%)</FieldLabel>
              <Input id="max_sag_percent" type="number" min="0" step="0.1" value={state.mechanical_profile.max_sag_percent} onChange={(event) => setMechanicalNumber("max_sag_percent", event.target.value)} />
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="cable_weight_n_per_m">Peso cable (N/m)</FieldLabel>
              <Input id="cable_weight_n_per_m" type="number" min="0" step="0.001" value={state.mechanical_profile.cable_weight_n_per_m} onChange={(event) => setMechanicalNumber("cable_weight_n_per_m", event.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="installation_tension_n">Tension instalacion (N)</FieldLabel>
              <Input id="installation_tension_n" type="number" min="1" step="1" value={state.mechanical_profile.installation_tension_n} onChange={(event) => setMechanicalNumber("installation_tension_n", event.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="max_tension_n">Tension maxima (N)</FieldLabel>
              <Input id="max_tension_n" type="number" min="1" step="1" value={state.mechanical_profile.max_tension_n} onChange={(event) => setMechanicalNumber("max_tension_n", event.target.value)} />
            </Field>
          </div>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}

function ModeButton({
  mode,
  current,
  label,
  icon: Icon,
  onClick,
  disabled = false,
}: {
  mode: MapMode
  current: MapMode
  label: string
  icon: typeof MapPinnedIcon
  onClick: (mode: MapMode) => void
  disabled?: boolean
}) {
  return (
    <Button type="button" variant={current === mode ? "default" : "outline"} disabled={disabled} onClick={() => onClick(mode)}>
      <Icon data-icon="inline-start" />
      {label}
    </Button>
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
  error,
  onChange,
}: {
  label: string
  value: string
  items: readonly { value: string; label: string }[]
  error?: string
  onChange: (value: string) => void
}) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel>{label}</FieldLabel>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full" aria-invalid={!!error}>
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
      {error ? <FieldDescription>{error}</FieldDescription> : null}
    </Field>
  )
}

function kmlToGeoJson(text: string) {
  const parser = new DOMParser()
  const document = parser.parseFromString(text, "application/xml")
  const placemarks = Array.from(document.querySelectorAll("Placemark"))
  type ImportedFeature = {
    type: "Feature"
    properties: { name: string }
    geometry:
      | { type: "Point"; coordinates: number[] }
      | { type: "LineString"; coordinates: number[][] }
      | { type: "Polygon"; coordinates: number[][][] }
  }

  return {
    type: "FeatureCollection",
    features: placemarks.flatMap<ImportedFeature>((placemark) => {
      const name = placemark.querySelector("name")?.textContent ?? "Capa KML"
      const point = placemark.querySelector("Point coordinates")?.textContent
      const line = placemark.querySelector("LineString coordinates")?.textContent
      const polygon = placemark.querySelector("Polygon outerBoundaryIs LinearRing coordinates")?.textContent

      if (point) {
        return [{
          type: "Feature" as const,
          properties: { name },
          geometry: { type: "Point" as const, coordinates: parseKmlCoordinate(point)[0] },
        }]
      }

      if (line) {
        return [{
          type: "Feature" as const,
          properties: { name },
          geometry: { type: "LineString" as const, coordinates: parseKmlCoordinate(line) },
        }]
      }

      if (polygon) {
        return [{
          type: "Feature" as const,
          properties: { name },
          geometry: { type: "Polygon" as const, coordinates: [parseKmlCoordinate(polygon)] },
        }]
      }

      return []
    }),
  }
}

function parseKmlCoordinate(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .map((coordinate) => {
      const [lng, lat] = coordinate.split(",").map(Number)
      return [lng, lat]
    })
    .filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat))
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}
