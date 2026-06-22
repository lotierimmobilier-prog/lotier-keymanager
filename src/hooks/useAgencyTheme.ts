import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface AgencyTheme {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  sidebar_bg: string;
  sidebar_text: string;
}

export function useAgencyTheme(agencyId: string | undefined) {
  const [theme, setTheme] = useState<AgencyTheme>({
    primary_color: '#D97706',
    secondary_color: '#92400E',
    accent_color: '#F59E0B',
    sidebar_bg: '#1E293B',
    sidebar_text: '#F1F5F9',
  });

  useEffect(() => {
    if (!agencyId) return;

    loadAgencyTheme();

    const channel = supabase
      .channel('agency-theme-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'agencies',
          filter: `id=eq.${agencyId}`,
        },
        (payload) => {
          if (payload.new) {
            const newTheme = payload.new as any;
            applyTheme({
              primary_color: newTheme.primary_color || '#D97706',
              secondary_color: newTheme.secondary_color || '#92400E',
              accent_color: newTheme.accent_color || '#F59E0B',
              sidebar_bg: newTheme.sidebar_bg || '#1E293B',
              sidebar_text: newTheme.sidebar_text || '#F1F5F9',
            });
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [agencyId]);

  async function loadAgencyTheme() {
    if (!agencyId) return;

    try {
      const { data, error } = await supabase
        .from('agencies')
        .select('primary_color, secondary_color, accent_color, sidebar_bg, sidebar_text')
        .eq('id', agencyId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        applyTheme({
          primary_color: data.primary_color || '#D97706',
          secondary_color: data.secondary_color || '#92400E',
          accent_color: data.accent_color || '#F59E0B',
          sidebar_bg: data.sidebar_bg || '#1E293B',
          sidebar_text: data.sidebar_text || '#F1F5F9',
        });
      }
    } catch (error) {
      console.error('Error loading agency theme:', error);
    }
  }

  function applyTheme(newTheme: AgencyTheme) {
    setTheme(newTheme);

    const root = document.documentElement;
    root.style.setProperty('--color-primary', newTheme.primary_color);
    root.style.setProperty('--color-secondary', newTheme.secondary_color);
    root.style.setProperty('--color-accent', newTheme.accent_color);
    root.style.setProperty('--color-sidebar-bg', newTheme.sidebar_bg);
    root.style.setProperty('--color-sidebar-text', newTheme.sidebar_text);
  }

  return theme;
}
