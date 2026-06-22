import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storageKey: 'keymanager-auth'
  }
});

export type Database = {
  public: {
    Tables: {
      agencies: {
        Row: {
          id: string;
          name: string;
          address: string | null;
          plan_id: string | null;
          max_keys: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['agencies']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['agencies']['Insert']>;
      };
      users: {
        Row: {
          id: string;
          agency_id: string;
          first_name: string;
          last_name: string;
          email: string;
          role: 'ADMIN' | 'COLLAB' | 'PRESTATAIRE';
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      properties: {
        Row: {
          id: string;
          agency_id: string;
          reference: string;
          address: string;
          type: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['properties']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['properties']['Insert']>;
      };
      keys: {
        Row: {
          id: string;
          agency_id: string;
          property_id: string | null;
          label: string;
          code: string | null;
          status: 'AVAILABLE' | 'OUT' | 'LOST' | 'ARCHIVED';
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['keys']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['keys']['Insert']>;
      };
      key_movements: {
        Row: {
          id: string;
          agency_id: string;
          key_id: string;
          taken_by_user_id: string | null;
          given_to_name: string;
          purpose: string | null;
          out_at: string;
          expected_return_at: string;
          returned_at: string | null;
          notes: string | null;
          responsibility_transferred: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['key_movements']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['key_movements']['Insert']>;
      };
      plans: {
        Row: {
          id: string;
          name: string;
          included_keys: number;
          base_price: number;
          extra_step: number;
          extra_price: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['plans']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['plans']['Insert']>;
      };
      subscriptions: {
        Row: {
          id: string;
          agency_id: string;
          plan_id: string;
          stripe_subscription_id: string | null;
          current_keys_limit: number;
          status: string;
          trial_end_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['subscriptions']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['subscriptions']['Insert']>;
      };
    };
  };
};
