export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      fiber_link_designs: {
        Row: {
          attenuation_db_per_km: number
          cable_type: Database["public"]["Enums"]["cable_type"]
          calculation_version: number
          connector_count: number
          connector_loss_db: number
          created_at: string
          description: string | null
          destination_name: string | null
          fiber_loss_db: number
          fiber_strands: number
          fiber_type: Database["public"]["Enums"]["fiber_type"]
          final_margin_db: number
          gis_layers: Json
          id: string
          map_distance_km: number
          mechanical_profile: Json
          name: string
          optical_budget_db: number
          origin_name: string | null
          point_a_lat: number
          point_a_lng: number
          point_b_lat: number
          point_b_lng: number
          real_distance_km: number
          receiver_sensitivity_dbm: number
          recommendations: Json
          route_analysis: Json
          route_points: Json
          safety_margin_db: number
          splice_count: number
          splice_loss_db: number
          status: Database["public"]["Enums"]["link_status"]
          total_connector_loss_db: number
          total_loss_db: number
          total_splice_loss_db: number
          transmitter_power_dbm: number
          updated_at: string
          user_id: string
          wavelength_nm: number
        }
        Insert: Omit<
          Database["public"]["Tables"]["fiber_link_designs"]["Row"],
          "id" | "created_at" | "updated_at"
        > & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["fiber_link_designs"]["Insert"]>
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>
      }
      gis_layers: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          layer_type: "geojson" | "kml" | "drawn"
          data: Json
          feature_count: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["gis_layers"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["gis_layers"]["Insert"]>
      }
      gis_features: {
        Row: {
          id: string
          user_id: string
          layer_id: string | null
          name: string | null
          feature_type: string
          properties: Json
          geometry: Json
          geom: unknown | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["gis_features"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["gis_features"]["Insert"]>
      }
      network_assets: {
        Row: {
          id: string
          user_id: string
          name: string
          asset_type: "node" | "pole" | "splice_box" | "client" | "reserve" | "other"
          latitude: number
          longitude: number
          geom: unknown
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["network_assets"]["Row"], "id" | "geom" | "created_at" | "updated_at"> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["network_assets"]["Insert"]>
      }
      cable_catalog: {
        Row: {
          id: string
          user_id: string | null
          name: string
          cable_type: Database["public"]["Enums"]["cable_type"]
          fiber_strands: number
          attenuation_1310_db_per_km: number
          attenuation_1550_db_per_km: number
          max_span_m: number
          cable_weight_n_per_m: number
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["cable_catalog"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["cable_catalog"]["Insert"]>
      }
      mechanical_profiles: {
        Row: {
          id: string
          user_id: string | null
          name: string
          max_span_m: number
          reserve_percent: number
          cable_weight_n_per_m: number
          installation_tension_n: number
          max_tension_n: number
          max_sag_percent: number
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["mechanical_profiles"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["mechanical_profiles"]["Insert"]>
      }
      fiber_routes: {
        Row: {
          id: string
          user_id: string
          design_id: string | null
          name: string
          route_points: Json
          route_analysis: Json
          geom: unknown | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["fiber_routes"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["fiber_routes"]["Insert"]>
      }
      fiber_route_points: {
        Row: {
          id: string
          user_id: string
          route_id: string
          point_order: number
          point_kind: string
          label: string
          latitude: number
          longitude: number
          geom: unknown
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["fiber_route_points"]["Row"], "id" | "geom" | "created_at" | "updated_at"> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["fiber_route_points"]["Insert"]>
      }
      fiber_route_spans: {
        Row: {
          id: string
          user_id: string
          route_id: string
          span_order: number
          from_label: string
          to_label: string
          distance_km: number
          span_m: number
          estimated_sag_m: number
          sag_percent: number
          warnings: Json
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["fiber_route_spans"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["fiber_route_spans"]["Insert"]>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      cable_type: "asu" | "adss" | "other"
      fiber_type: "single_mode" | "multi_mode"
      link_status: "viable" | "critical" | "non_viable"
    }
    CompositeTypes: Record<string, never>
  }
}

export type LinkDesign = Database["public"]["Tables"]["fiber_link_designs"]["Row"]
export type LinkDesignInsert =
  Database["public"]["Tables"]["fiber_link_designs"]["Insert"]
export type LinkDesignUpdate =
  Database["public"]["Tables"]["fiber_link_designs"]["Update"]
