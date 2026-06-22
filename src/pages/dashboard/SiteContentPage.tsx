import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Save, Plus, Trash2, Eye, EyeOff, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Button } from '../../components/Button';
import { DashboardLayout } from '../../components/DashboardLayout';

interface SiteContentSection {
  id: string;
  page: string;
  section_key: string;
  title: string;
  content: Record<string, any>;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

type PageType = 'homepage' | 'features' | 'pricing' | 'blog' | 'all';

export default function SiteContentPage() {
  const [sections, setSections] = useState<SiteContentSection[]>([]);
  const [filteredSections, setFilteredSections] = useState<SiteContentSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPage, setSelectedPage] = useState<PageType>('all');
  const [editingSection, setEditingSection] = useState<SiteContentSection | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const pages: { value: PageType; label: string }[] = [
    { value: 'all', label: 'Toutes les pages' },
    { value: 'homepage', label: 'Page d\'accueil' },
    { value: 'features', label: 'Page Fonctionnalités' },
    { value: 'pricing', label: 'Page Tarifs' },
    { value: 'blog', label: 'Page Blog' },
  ];

  useEffect(() => {
    loadSections();
  }, []);

  useEffect(() => {
    filterSections();
  }, [selectedPage, sections]);

  async function loadSections() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('site_content_sections')
        .select('*')
        .order('page', { ascending: true })
        .order('display_order', { ascending: true });

      if (error) throw error;
      setSections(data || []);
    } catch (error) {
      console.error('Error loading site content:', error);
      alert('Erreur lors du chargement du contenu');
    } finally {
      setLoading(false);
    }
  }

  function filterSections() {
    if (selectedPage === 'all') {
      setFilteredSections(sections);
    } else {
      setFilteredSections(sections.filter((s) => s.page === selectedPage));
    }
  }

  function handleEdit(section: SiteContentSection) {
    setEditingSection({ ...section });
    setShowModal(true);
  }

  function handleCreate() {
    setEditingSection({
      id: '',
      page: 'homepage',
      section_key: '',
      title: '',
      content: {},
      display_order: 0,
      is_active: true,
      created_at: '',
      updated_at: '',
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!editingSection) return;

    try {
      let contentJson;
      if (typeof editingSection.content === 'string') {
        try {
          contentJson = JSON.parse(editingSection.content);
        } catch {
          alert('Le contenu JSON n\'est pas valide');
          return;
        }
      } else {
        contentJson = editingSection.content;
      }

      if (editingSection.id) {
        const { error } = await supabase
          .from('site_content_sections')
          .update({
            page: editingSection.page,
            section_key: editingSection.section_key,
            title: editingSection.title,
            content: contentJson,
            display_order: editingSection.display_order,
            is_active: editingSection.is_active,
          })
          .eq('id', editingSection.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('site_content_sections')
          .insert({
            page: editingSection.page,
            section_key: editingSection.section_key,
            title: editingSection.title,
            content: contentJson,
            display_order: editingSection.display_order,
            is_active: editingSection.is_active,
          });

        if (error) throw error;
      }

      setShowModal(false);
      setEditingSection(null);
      await loadSections();
    } catch (error: any) {
      console.error('Error saving section:', error);
      alert('Erreur lors de la sauvegarde: ' + error.message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette section ?')) return;

    try {
      const { error } = await supabase
        .from('site_content_sections')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadSections();
    } catch (error) {
      console.error('Error deleting section:', error);
      alert('Erreur lors de la suppression');
    }
  }

  async function toggleActive(id: string, currentState: boolean) {
    try {
      const { error } = await supabase
        .from('site_content_sections')
        .update({ is_active: !currentState })
        .eq('id', id);

      if (error) throw error;
      await loadSections();
    } catch (error) {
      console.error('Error toggling active state:', error);
      alert('Erreur lors du changement de statut');
    }
  }

  function toggleExpand(id: string) {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedSections(newExpanded);
  }

  function formatJson(obj: any): string {
    return JSON.stringify(obj, null, 2);
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-slate-600">Chargement...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Gestion du Contenu du Site</h1>
            <p className="text-slate-600 mt-1">
              Modifiez les textes et contenus affichés sur les pages publiques
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle Section
          </Button>
        </div>

        <div className="flex gap-2">
          {pages.map((page) => (
            <button
              key={page.value}
              onClick={() => setSelectedPage(page.value)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedPage === page.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              {page.label}
            </button>
          ))}
        </div>
      </div>

      {filteredSections.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center">
          <p className="text-slate-600">Aucune section trouvée pour cette page</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSections.map((section) => (
            <div
              key={section.id}
              className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-900">{section.title}</h3>
                      <span className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded">
                        {section.page}
                      </span>
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                        {section.section_key}
                      </span>
                      <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded">
                        Ordre: {section.display_order}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleActive(section.id, section.is_active)}
                      className={`p-2 rounded-lg transition-colors ${
                        section.is_active
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                      title={section.is_active ? 'Désactiver' : 'Activer'}
                    >
                      {section.is_active ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => toggleExpand(section.id)}
                      className="p-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      {expandedSections.has(section.id) ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    <Button variant="secondary" size="sm" onClick={() => handleEdit(section)}>
                      Modifier
                    </Button>
                    <button
                      onClick={() => handleDelete(section.id)}
                      className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {expandedSections.has(section.id) && (
                  <div className="mt-4">
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <h4 className="text-sm font-semibold text-slate-700 mb-2">Contenu JSON:</h4>
                      <pre className="text-xs text-slate-600 overflow-x-auto whitespace-pre-wrap">
                        {formatJson(section.content)}
                      </pre>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      Créé le: {new Date(section.created_at).toLocaleDateString('fr-FR')} |
                      Modifié le: {new Date(section.updated_at).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && editingSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">
                {editingSection.id ? 'Modifier la Section' : 'Nouvelle Section'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingSection(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Page
                </label>
                <select
                  value={editingSection.page}
                  onChange={(e) =>
                    setEditingSection({ ...editingSection, page: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="homepage">Page d'accueil</option>
                  <option value="features">Page Fonctionnalités</option>
                  <option value="pricing">Page Tarifs</option>
                  <option value="blog">Page Blog</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Clé de Section
                </label>
                <input
                  type="text"
                  value={editingSection.section_key}
                  onChange={(e) =>
                    setEditingSection({ ...editingSection, section_key: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="hero, features, etc."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Titre
              </label>
              <input
                type="text"
                value={editingSection.title}
                onChange={(e) =>
                  setEditingSection({ ...editingSection, title: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Titre de la section"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Ordre d'affichage
                </label>
                <input
                  type="number"
                  value={editingSection.display_order}
                  onChange={(e) =>
                    setEditingSection({
                      ...editingSection,
                      display_order: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingSection.is_active}
                    onChange={(e) =>
                      setEditingSection({ ...editingSection, is_active: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm font-medium text-slate-700">
                    Section active
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Contenu (JSON)
              </label>
              <textarea
                value={
                  typeof editingSection.content === 'string'
                    ? editingSection.content
                    : formatJson(editingSection.content)
                }
                onChange={(e) =>
                  setEditingSection({ ...editingSection, content: e.target.value as any })
                }
                rows={12}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder='{"key": "value"}'
              />
              <p className="mt-1 text-xs text-slate-500">
                Entrez un objet JSON valide. Les champs disponibles dépendent de chaque section.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowModal(false);
                  setEditingSection(null);
                }}
              >
                Annuler
              </Button>
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Enregistrer
              </Button>
            </div>
          </div>
        </div>
        </div>
      )}
    </div>
    </DashboardLayout>
  );
}
