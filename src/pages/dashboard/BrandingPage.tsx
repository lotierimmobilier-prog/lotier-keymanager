import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { DashboardLayout } from '../../components/DashboardLayout';
import { Palette, Upload, Link as LinkIcon, Copy, Check, Shield } from 'lucide-react';

interface AgencyBranding {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color?: string;
  sidebar_bg?: string;
  sidebar_text?: string;
}

export function BrandingPage() {
  const { profile } = useAuth();
  const [agency, setAgency] = useState<AgencyBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    slug: '',
    primary_color: '#D97706',
    secondary_color: '#92400E',
    accent_color: '#F59E0B',
    sidebar_bg: '#1E293B',
    sidebar_text: '#F1F5F9',
  });

  useEffect(() => {
    if (profile?.agency_id) {
      loadAgencyBranding();
    }
  }, [profile]);

  async function loadAgencyBranding() {
    if (!profile?.agency_id) return;

    try {
      const { data, error } = await supabase
        .from('agencies')
        .select('id, name, slug, logo_url, primary_color, secondary_color, accent_color, sidebar_bg, sidebar_text')
        .eq('id', profile.agency_id)
        .single();

      if (error) throw error;

      setAgency(data);
      setFormData({
        slug: data.slug || '',
        primary_color: data.primary_color || '#D97706',
        secondary_color: data.secondary_color || '#92400E',
        accent_color: data.accent_color || '#F59E0B',
        sidebar_bg: data.sidebar_bg || '#1E293B',
        sidebar_text: data.sidebar_text || '#F1F5F9',
      });
    } catch (error) {
      console.error('Error loading agency branding:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile?.agency_id) return;

    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('L\'image ne doit pas dépasser 2 MB');
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.agency_id}/logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('agency-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('agency-logos')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('agencies')
        .update({ logo_url: urlData.publicUrl })
        .eq('id', profile.agency_id);

      if (updateError) throw updateError;

      alert('Logo mis à jour avec succès');
      loadAgencyBranding();
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      alert(`Erreur: ${error.message}`);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile?.agency_id) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from('agencies')
        .update({
          slug: formData.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
          primary_color: formData.primary_color,
          secondary_color: formData.secondary_color,
          accent_color: formData.accent_color,
          sidebar_bg: formData.sidebar_bg,
          sidebar_text: formData.sidebar_text,
        })
        .eq('id', profile.agency_id);

      if (error) throw error;

      alert('Paramètres mis à jour avec succès');
      loadAgencyBranding();
    } catch (error: any) {
      console.error('Error saving branding:', error);
      alert(`Erreur: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  function copyLoginLink() {
    if (!agency?.slug) return;
    const link = `${window.location.origin}/login/${agency.slug}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <DashboardLayout currentPage="branding">
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-600">Chargement...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (profile?.role !== 'ADMIN') {
    return (
      <DashboardLayout currentPage="branding">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
            <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Accès restreint</h3>
            <p className="text-slate-600">Seuls les administrateurs peuvent personnaliser l'agence</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentPage="branding">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Personnalisation</h1>
          <p className="text-slate-600">
            Personnalisez l'apparence de votre espace et créez un lien de connexion dédié
          </p>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900 mb-6 flex items-center">
              <Upload className="w-5 h-5 mr-2 text-amber-600" />
              Logo de l'agence
            </h2>

            <div className="flex items-center space-x-6">
              {agency?.logo_url ? (
                <div className="w-32 h-32 rounded-lg border-2 border-slate-200 overflow-hidden bg-white flex items-center justify-center">
                  <img src={agency.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
                </div>
              ) : (
                <div className="w-32 h-32 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-slate-400" />
                </div>
              )}

              <div className="flex-1">
                <label className="block">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                  <span className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition cursor-pointer">
                    {uploading ? 'Envoi en cours...' : 'Télécharger un logo'}
                  </span>
                </label>
                <p className="text-sm text-slate-500 mt-2">
                  Format: PNG, JPG ou SVG. Taille max: 2 MB
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900 mb-6 flex items-center">
              <Palette className="w-5 h-5 mr-2 text-amber-600" />
              Couleurs de la marque
            </h2>

            <div className="space-y-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Couleur principale (boutons, liens)
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={formData.primary_color}
                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                    className="w-16 h-16 rounded-lg border-2 border-slate-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.primary_color}
                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                    placeholder="#D97706"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  <button type="button" onClick={() => setFormData({ ...formData, primary_color: '#D97706' })} className="w-8 h-8 rounded border-2 border-slate-300" style={{ backgroundColor: '#D97706' }} title="Amber"></button>
                  <button type="button" onClick={() => setFormData({ ...formData, primary_color: '#3B82F6' })} className="w-8 h-8 rounded border-2 border-slate-300" style={{ backgroundColor: '#3B82F6' }} title="Blue"></button>
                  <button type="button" onClick={() => setFormData({ ...formData, primary_color: '#10B981' })} className="w-8 h-8 rounded border-2 border-slate-300" style={{ backgroundColor: '#10B981' }} title="Green"></button>
                  <button type="button" onClick={() => setFormData({ ...formData, primary_color: '#EF4444' })} className="w-8 h-8 rounded border-2 border-slate-300" style={{ backgroundColor: '#EF4444' }} title="Red"></button>
                  <button type="button" onClick={() => setFormData({ ...formData, primary_color: '#8B5CF6' })} className="w-8 h-8 rounded border-2 border-slate-300" style={{ backgroundColor: '#8B5CF6' }} title="Purple"></button>
                  <button type="button" onClick={() => setFormData({ ...formData, primary_color: '#EC4899' })} className="w-8 h-8 rounded border-2 border-slate-300" style={{ backgroundColor: '#EC4899' }} title="Pink"></button>
                  <button type="button" onClick={() => setFormData({ ...formData, primary_color: '#F59E0B' })} className="w-8 h-8 rounded border-2 border-slate-300" style={{ backgroundColor: '#F59E0B' }} title="Orange"></button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Couleur secondaire (hover, ombres)
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={formData.secondary_color}
                    onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                    className="w-16 h-16 rounded-lg border-2 border-slate-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.secondary_color}
                    onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                    placeholder="#92400E"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  <button type="button" onClick={() => setFormData({ ...formData, secondary_color: '#92400E' })} className="w-8 h-8 rounded border-2 border-slate-300" style={{ backgroundColor: '#92400E' }} title="Dark Amber"></button>
                  <button type="button" onClick={() => setFormData({ ...formData, secondary_color: '#1E40AF' })} className="w-8 h-8 rounded border-2 border-slate-300" style={{ backgroundColor: '#1E40AF' }} title="Dark Blue"></button>
                  <button type="button" onClick={() => setFormData({ ...formData, secondary_color: '#047857' })} className="w-8 h-8 rounded border-2 border-slate-300" style={{ backgroundColor: '#047857' }} title="Dark Green"></button>
                  <button type="button" onClick={() => setFormData({ ...formData, secondary_color: '#B91C1C' })} className="w-8 h-8 rounded border-2 border-slate-300" style={{ backgroundColor: '#B91C1C' }} title="Dark Red"></button>
                  <button type="button" onClick={() => setFormData({ ...formData, secondary_color: '#6D28D9' })} className="w-8 h-8 rounded border-2 border-slate-300" style={{ backgroundColor: '#6D28D9' }} title="Dark Purple"></button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Couleur d'accent (badges, notifications)
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={formData.accent_color}
                    onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                    className="w-16 h-16 rounded-lg border-2 border-slate-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.accent_color}
                    onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                    placeholder="#F59E0B"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  <button type="button" onClick={() => setFormData({ ...formData, accent_color: '#F59E0B' })} className="w-8 h-8 rounded border-2 border-slate-300" style={{ backgroundColor: '#F59E0B' }} title="Orange"></button>
                  <button type="button" onClick={() => setFormData({ ...formData, accent_color: '#14B8A6' })} className="w-8 h-8 rounded border-2 border-slate-300" style={{ backgroundColor: '#14B8A6' }} title="Teal"></button>
                  <button type="button" onClick={() => setFormData({ ...formData, accent_color: '#F97316' })} className="w-8 h-8 rounded border-2 border-slate-300" style={{ backgroundColor: '#F97316' }} title="Deep Orange"></button>
                  <button type="button" onClick={() => setFormData({ ...formData, accent_color: '#06B6D4' })} className="w-8 h-8 rounded border-2 border-slate-300" style={{ backgroundColor: '#06B6D4' }} title="Cyan"></button>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Personnalisation de la barre latérale</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Fond de la barre latérale
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={formData.sidebar_bg}
                        onChange={(e) => setFormData({ ...formData, sidebar_bg: e.target.value })}
                        className="w-16 h-16 rounded-lg border-2 border-slate-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.sidebar_bg}
                        onChange={(e) => setFormData({ ...formData, sidebar_bg: e.target.value })}
                        className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                        placeholder="#1E293B"
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button type="button" onClick={() => setFormData({ ...formData, sidebar_bg: '#1E293B' })} className="w-8 h-8 rounded border-2 border-slate-300" style={{ backgroundColor: '#1E293B' }} title="Dark Slate"></button>
                      <button type="button" onClick={() => setFormData({ ...formData, sidebar_bg: '#1F2937' })} className="w-8 h-8 rounded border-2 border-slate-300" style={{ backgroundColor: '#1F2937' }} title="Dark Gray"></button>
                      <button type="button" onClick={() => setFormData({ ...formData, sidebar_bg: '#18181B' })} className="w-8 h-8 rounded border-2 border-slate-300" style={{ backgroundColor: '#18181B' }} title="Zinc"></button>
                      <button type="button" onClick={() => setFormData({ ...formData, sidebar_bg: '#0F172A' })} className="w-8 h-8 rounded border-2 border-slate-300" style={{ backgroundColor: '#0F172A' }} title="Deep Slate"></button>
                      <button type="button" onClick={() => setFormData({ ...formData, sidebar_bg: '#FFFFFF' })} className="w-8 h-8 rounded border-2 border-slate-300" style={{ backgroundColor: '#FFFFFF' }} title="White"></button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Texte de la barre latérale
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={formData.sidebar_text}
                        onChange={(e) => setFormData({ ...formData, sidebar_text: e.target.value })}
                        className="w-16 h-16 rounded-lg border-2 border-slate-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.sidebar_text}
                        onChange={(e) => setFormData({ ...formData, sidebar_text: e.target.value })}
                        className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                        placeholder="#F1F5F9"
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button type="button" onClick={() => setFormData({ ...formData, sidebar_text: '#F1F5F9' })} className="w-8 h-8 rounded border-2 border-slate-300" style={{ backgroundColor: '#F1F5F9' }} title="Light Slate"></button>
                      <button type="button" onClick={() => setFormData({ ...formData, sidebar_text: '#FFFFFF' })} className="w-8 h-8 rounded border-2 border-slate-300" style={{ backgroundColor: '#FFFFFF' }} title="White"></button>
                      <button type="button" onClick={() => setFormData({ ...formData, sidebar_text: '#E5E7EB' })} className="w-8 h-8 rounded border-2 border-slate-300" style={{ backgroundColor: '#E5E7EB' }} title="Light Gray"></button>
                      <button type="button" onClick={() => setFormData({ ...formData, sidebar_text: '#1E293B' })} className="w-8 h-8 rounded border-2 border-slate-300" style={{ backgroundColor: '#1E293B' }} title="Dark Slate"></button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-slate-50 to-amber-50 border border-slate-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-slate-900 mb-2">Aperçu en direct</h4>
                <div className="flex gap-3">
                  <button type="button" className="px-4 py-2 rounded-lg text-white font-medium" style={{ backgroundColor: formData.primary_color }}>
                    Bouton Principal
                  </button>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: formData.accent_color }}>
                    Badge
                  </span>
                  <div className="flex-1 h-10 rounded-lg flex items-center px-3 text-sm" style={{ backgroundColor: formData.sidebar_bg, color: formData.sidebar_text }}>
                    Sidebar Preview
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Identifiant unique (slug)
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="mon-agence"
                pattern="[a-z0-9-]+"
                required
              />
              <p className="text-sm text-slate-500 mt-1">
                Utilisé pour créer le lien de connexion personnalisé. Lettres minuscules, chiffres et tirets uniquement.
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-primary text-white px-6 py-3 rounded-lg hover:bg-secondary transition disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </form>

          {agency?.slug && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                <LinkIcon className="w-5 h-5 mr-2 text-amber-600" />
                Lien de connexion personnalisé
              </h2>

              <p className="text-slate-700 mb-4">
                Partagez ce lien avec vos collaborateurs pour qu'ils se connectent avec l'identité visuelle de votre agence :
              </p>

              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  value={`${window.location.origin}/login/${agency.slug}`}
                  readOnly
                  className="flex-1 px-4 py-3 bg-white border-2 border-amber-300 rounded-lg text-slate-900 font-mono text-sm"
                />
                <button
                  onClick={copyLoginLink}
                  className="flex items-center space-x-2 px-4 py-3 bg-primary text-white rounded-lg hover:bg-secondary transition"
                >
                  {copied ? (
                    <>
                      <Check className="w-5 h-5" />
                      <span>Copié!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      <span>Copier</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
