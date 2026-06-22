import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  sidebarBg: string;
  sidebarText: string;
}

interface ThemeContextType {
  colors: ThemeColors;
  loading: boolean;
}

const defaultColors: ThemeColors = {
  primary: '#f59e0b',
  secondary: '#ea580c',
  accent: '#fbbf24',
  sidebarBg: '#1e293b',
  sidebarText: '#ffffff',
};

const ThemeContext = createContext<ThemeContextType>({
  colors: defaultColors,
  loading: true,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [colors, setColors] = useState<ThemeColors>(defaultColors);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.agency_id) {
      setLoading(false);
      return;
    }

    loadTheme();

    const channel = supabase
      .channel('theme-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agencies',
          filter: `id=eq.${profile.agency_id}`,
        },
        (payload) => {
          if (payload.new) {
            applyTheme(payload.new as any);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [profile?.agency_id]);

  async function loadTheme() {
    if (!profile?.agency_id) return;

    try {
      const { data, error } = await supabase
        .from('agencies')
        .select('primary_color, secondary_color, accent_color, sidebar_bg, sidebar_text')
        .eq('id', profile.agency_id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        applyTheme(data);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    } finally {
      setLoading(false);
    }
  }

  function applyTheme(data: any) {
    const newColors: ThemeColors = {
      primary: data.primary_color || defaultColors.primary,
      secondary: data.secondary_color || defaultColors.secondary,
      accent: data.accent_color || defaultColors.accent,
      sidebarBg: data.sidebar_bg || defaultColors.sidebarBg,
      sidebarText: data.sidebar_text || defaultColors.sidebarText,
    };

    console.log('Applying theme colors:', newColors);
    setColors(newColors);

    const root = document.documentElement;
    root.style.setProperty('--color-primary', newColors.primary);
    root.style.setProperty('--color-secondary', newColors.secondary);
    root.style.setProperty('--color-accent', newColors.accent);
    root.style.setProperty('--color-sidebar-bg', newColors.sidebarBg);
    root.style.setProperty('--color-sidebar-text', newColors.sidebarText);
  }

  return (
    <ThemeContext.Provider value={{ colors, loading }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
