import assert from "node:assert/strict"
import fs from "node:fs"
import Module from "node:module"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

import ts from "typescript"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, "..")
const require = Module.createRequire(import.meta.url)
const originalResolveFilename = Module._resolveFilename

Module._resolveFilename = function resolveAlias(request, parent, isMain, options) {
  if (request.startsWith("@/")) {
    return originalResolveFilename.call(
      this,
      path.join(repoRoot, request.slice(2)),
      parent,
      isMain,
      options
    )
  }

  return originalResolveFilename.call(this, request, parent, isMain, options)
}

for (const extension of [".ts", ".tsx"]) {
  require.extensions[extension] = function compileTypeScript(module, filename) {
    const source = fs.readFileSync(filename, "utf8")
    const output = ts.transpileModule(source, {
      compilerOptions: {
        esModuleInterop: true,
        jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
      fileName: filename,
    }).outputText

    module._compile(output, filename)
  }
}

const {
  buildRecommendations,
  calculateOpticalBudget,
} = require("../lib/fibermap/calculations.ts")
const { linkDesignSchema } = require("../lib/fibermap/schemas.ts")
const { buildDesignInsert } = require("../lib/fibermap/data.ts")

const baseDesignInput = {
  name: "Enlace ASU Validado",
  description: "Caso de prueba automatizado",
  origin_name: "Punto A",
  destination_name: "Punto B",
  point_a_lat: -17.7833,
  point_a_lng: -63.1821,
  point_b_lat: -17.7933,
  point_b_lng: -63.1721,
  map_distance_km: 10,
  real_distance_km: 10,
  cable_type: "asu",
  fiber_strands: 12,
  wavelength_nm: 1550,
  fiber_type: "single_mode",
  transmitter_power_dbm: 0,
  receiver_sensitivity_dbm: -20,
  attenuation_db_per_km: 0.35,
  splice_count: 4,
  splice_loss_db: 0.1,
  connector_count: 2,
  connector_loss_db: 0.5,
  safety_margin_db: 3,
  route_points: "[]",
  gis_layers: "[]",
  mechanical_profile: "{}",
}

test("calcula y recomienda un enlace viable", () => {
  const result = calculateOpticalBudget({
    real_distance_km: 10,
    attenuation_db_per_km: 0.35,
    splice_count: 4,
    splice_loss_db: 0.1,
    connector_count: 2,
    connector_loss_db: 0.5,
    safety_margin_db: 3,
    transmitter_power_dbm: 0,
    receiver_sensitivity_dbm: -20,
  })

  assert.equal(result.total_loss_db, 7.9)
  assert.equal(result.optical_budget_db, 20)
  assert.equal(result.final_margin_db, 12.1)
  assert.equal(result.status, "viable")
  assert.ok(result.recommendations.includes("Mantener el diseño actual."))
})

test("calcula y recomienda un enlace critico", () => {
  const result = calculateOpticalBudget({
    real_distance_km: 40,
    attenuation_db_per_km: 0.35,
    splice_count: 10,
    splice_loss_db: 0.1,
    connector_count: 2,
    connector_loss_db: 0.5,
    safety_margin_db: 3,
    transmitter_power_dbm: 0,
    receiver_sensitivity_dbm: -20,
  })

  assert.equal(result.total_loss_db, 19)
  assert.equal(result.optical_budget_db, 20)
  assert.equal(result.final_margin_db, 1)
  assert.equal(result.status, "critical")
  assert.ok(result.recommendations.some((item) => item.includes("Agregar al menos 2.0000 dB")))
  assert.ok(result.recommendations.includes("Reducir la cantidad de conectores si es posible."))
})

test("calcula y recomienda un enlace no viable", () => {
  const result = calculateOpticalBudget({
    real_distance_km: 60,
    attenuation_db_per_km: 0.35,
    splice_count: 10,
    splice_loss_db: 0.1,
    connector_count: 2,
    connector_loss_db: 0.5,
    safety_margin_db: 3,
    transmitter_power_dbm: 0,
    receiver_sensitivity_dbm: -20,
  })

  assert.equal(result.total_loss_db, 26)
  assert.equal(result.optical_budget_db, 20)
  assert.equal(result.final_margin_db, -6)
  assert.equal(result.status, "non_viable")
  assert.ok(result.recommendations.some((item) => item.includes("al menos 9.0000 dB")))
  assert.ok(result.recommendations.includes("Reducir distancia o considerar un punto intermedio."))
})

test("rechaza datos invalidos y recalcula resultados antes de persistir", () => {
  const invalid = linkDesignSchema.safeParse({
    ...baseDesignInput,
    name: "A",
    point_a_lat: -91,
    point_a_lng: -181,
    real_distance_km: 0,
    fiber_strands: 12.5,
    wavelength_nm: 1490,
  })

  assert.equal(invalid.success, false)
  assert.deepEqual(
    new Set(invalid.error.issues.map((issue) => issue.path[0])),
    new Set([
      "name",
      "point_a_lat",
      "point_a_lng",
      "real_distance_km",
      "fiber_strands",
      "wavelength_nm",
    ])
  )

  const valid = linkDesignSchema.parse(baseDesignInput)
  const insert = buildDesignInsert(valid, "00000000-0000-4000-8000-000000000001")
  const expected = calculateOpticalBudget({
    real_distance_km: insert.real_distance_km,
    attenuation_db_per_km: insert.attenuation_db_per_km,
    splice_count: insert.splice_count,
    splice_loss_db: insert.splice_loss_db,
    connector_count: insert.connector_count,
    connector_loss_db: insert.connector_loss_db,
    safety_margin_db: insert.safety_margin_db,
    transmitter_power_dbm: insert.transmitter_power_dbm,
    receiver_sensitivity_dbm: insert.receiver_sensitivity_dbm,
  })

  assert.equal(insert.user_id, "00000000-0000-4000-8000-000000000001")
  assert.equal(insert.calculation_version, 2)
  assert.notEqual(insert.real_distance_km, baseDesignInput.real_distance_km)
  assert.equal(insert.total_loss_db, expected.total_loss_db)
  assert.equal(insert.optical_budget_db, expected.optical_budget_db)
  assert.equal(insert.final_margin_db, expected.final_margin_db)
  assert.equal(insert.status, expected.status)
  assert.deepEqual(insert.recommendations, buildRecommendations(expected.status))
})

test("cubre dashboard, historial, reporte PDF y politicas RLS por usuario", () => {
  const dashboardPage = fs.readFileSync(
    path.join(repoRoot, "app", "(protected)", "dashboard", "page.tsx"),
    "utf8"
  )
  const linksPage = fs.readFileSync(
    path.join(repoRoot, "app", "(protected)", "links", "page.tsx"),
    "utf8"
  )
  const comparePage = fs.readFileSync(
    path.join(repoRoot, "app", "(protected)", "links", "compare", "page.tsx"),
    "utf8"
  )
  const reportPdfRoute = fs.readFileSync(
    path.join(repoRoot, "app", "(protected)", "reports", "[id]", "pdf", "route.tsx"),
    "utf8"
  )
  const coreMigration = fs.readFileSync(
    path.join(repoRoot, "supabase", "migrations", "202605310001_create_fibermap_asu_core_schema.sql"),
    "utf8"
  )

  for (const expected of ["total", "viable", "critical", "non_viable"]) {
    assert.ok(dashboardPage.includes(expected))
  }

  assert.ok(linksPage.includes("listDesigns"))
  assert.ok(linksPage.includes("status"))
  assert.ok(linksPage.includes("query"))
  assert.ok(comparePage.includes("Comparar"))
  assert.ok(reportPdfRoute.includes("Reporte tecnico de enlace"))
  assert.ok(reportPdfRoute.includes("Resultados del presupuesto optico"))
  assert.ok(reportPdfRoute.includes("Recomendaciones tecnicas"))
  assert.match(coreMigration, /alter table public\.fiber_link_designs enable row level security/i)
  assert.match(coreMigration, /fiber_link_designs_select_own[\s\S]*\(select auth\.uid\(\)\) = user_id/i)
  assert.match(coreMigration, /fiber_link_designs_insert_own[\s\S]*\(select auth\.uid\(\)\) = user_id/i)
  assert.match(coreMigration, /fiber_link_designs_update_own[\s\S]*\(select auth\.uid\(\)\) = user_id/i)
  assert.match(coreMigration, /fiber_link_designs_delete_own[\s\S]*\(select auth\.uid\(\)\) = user_id/i)
})
