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
          id: string
          map_distance_km: number
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
