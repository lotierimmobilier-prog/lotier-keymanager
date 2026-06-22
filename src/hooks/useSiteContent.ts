import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface SiteContentSection {
  id: string;
  page: string;
  section_key: string;
  title: string;
  content: Record<string, any>;
  display_order: number;
  is_active: boolean;
}

export function useSiteContent(page: string) {
  const [sections, setSections] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContent();
  }, [page]);

  async function loadContent() {
    try {
      const { data, error } = await supabase
        .from('site_content_sections')
        .select('*')
        .eq('page', page)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;

      const contentMap: Record<string, any> = {};
      data?.forEach((section: SiteContentSection) => {
        contentMap[section.section_key] = section.content;
      });

      setSections(contentMap);
    } catch (error) {
      console.error('Error loading site content:', error);
    } finally {
      setLoading(false);
    }
  }

  return { sections, loading };
}
