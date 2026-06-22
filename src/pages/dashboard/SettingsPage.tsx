import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { DashboardLayout } from '../../components/DashboardLayout';
import { ServiceTabContent } from '../../components/SettingsTabContent';
import { Settings, Save, Info, RefreshCw, Trash2 } from 'lucide-react';

interface AgencySettings {
  id: string;
  property_reference_pattern: string;
  key_reference_pattern: string;
  property_counter: number;
  key_counter: number;
  property_reference_pattern_gestion: string;
  property_reference_pattern_location: string;
  property_reference_pattern_vente: string;
  property_reference_pattern_syndic: string;
  property_counter_gestion: number;
  property_counter_location: number;
  property_counter_vente: number;
  property_counter_syndic: number;
}

type TabType = 'general' | 'gestion' | 'location' | 'vente' | 'syndic';

export function SettingsPage() {
  const { profile } = useAuth();
  const [settings, setSettings] = useState<AgencySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [formData, setFormData] = useState({
    property_reference_pattern: '{owner_name:3}-{address:3}-{counter:3}',
    key_reference_pattern: '{property_ref}-{counter:2}',
    property_reference_pattern_gestion: '{owner_name:3}-GES-{counter:3}',
    property_reference_pattern_location: '{owner_name:3}-LOC-{counter:3}',
    property_reference_pattern_vente: '{owner_name:3}-VTE-{counter:3}',
    property_reference_pattern_syndic: '{owner_name:3}-SYN-{counter:3}',
    property_counter: 0,
    key_counter: 0,
    property_counter_gestion: 0,
    property_counter_location: 0,
    property_counter_vente: 0,
    property_counter_syndic: 0,
  });
  const [patternChanged, setPatternChanged] = useState(false);

  useEffect(() => {
    if (profile?.agency_id) {
      loadSettings();
    }
  }, [profile]);

  async function loadSettings() {
    if (!profile?.agency_id) return;

    try {
      const { data, error } = await supabase
        .from('agency_settings')
        .select('*')
        .eq('agency_id', profile.agency_id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings(data);
        setFormData({
          property_reference_pattern: data.property_reference_pattern,
          key_reference_pattern: data.key_reference_pattern,
          property_reference_pattern_gestion: data.property_reference_pattern_gestion || '{owner_name:3}-GES-{counter:3}',
          property_reference_pattern_location: data.property_reference_pattern_location || '{owner_name:3}-LOC-{counter:3}',
          property_reference_pattern_vente: data.property_reference_pattern_vente || '{owner_name:3}-VTE-{counter:3}',
          property_reference_pattern_syndic: data.property_reference_pattern_syndic || '{owner_name:3}-SYN-{counter:3}',
          property_counter: data.property_counter || 0,
          key_counter: data.key_counter || 0,
          property_counter_gestion: data.property_counter_gestion || 0,
          property_counter_location: data.property_counter_location || 0,
          property_counter_vente: data.property_counter_vente || 0,
          property_counter_syndic: data.property_counter_syndic || 0,
        });
        setPatternChanged(false);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile?.agency_id) return;

    if (profile.role !== 'ADMIN') {
      alert('Seuls les administrateurs peuvent modifier les paramètres');
      return;
    }

    setSaving(true);

    try {
      if (settings) {
        const { error } = await supabase
          .from('agency_settings')
          .update({
            property_reference_pattern: formData.property_reference_pattern,
            key_reference_pattern: formData.key_reference_pattern,
            property_reference_pattern_gestion: formData.property_reference_pattern_gestion,
            property_reference_pattern_location: formData.property_reference_pattern_location,
            property_reference_pattern_vente: formData.property_reference_pattern_vente,
            property_reference_pattern_syndic: formData.property_reference_pattern_syndic,
            property_counter: formData.property_counter,
            key_counter: formData.key_counter,
            property_counter_gestion: formData.property_counter_gestion,
            property_counter_location: formData.property_counter_location,
            property_counter_vente: formData.property_counter_vente,
            property_counter_syndic: formData.property_counter_syndic,
          })
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('agency_settings').insert({
          agency_id: profile.agency_id,
          property_reference_pattern: formData.property_reference_pattern,
          key_reference_pattern: formData.key_reference_pattern,
          property_reference_pattern_gestion: formData.property_reference_pattern_gestion,
          property_reference_pattern_location: formData.property_reference_pattern_location,
          property_reference_pattern_vente: formData.property_reference_pattern_vente,
          property_reference_pattern_syndic: formData.property_reference_pattern_syndic,
          property_counter: formData.property_counter,
          key_counter: formData.key_counter,
          property_counter_gestion: formData.property_counter_gestion,
          property_counter_location: formData.property_counter_location,
          property_counter_vente: formData.property_counter_vente,
          property_counter_syndic: formData.property_counter_syndic,
        });

        if (error) throw error;
      }

      alert('Paramètres enregistrés avec succès');
      const hasPatternChanged = (
        settings?.property_reference_pattern !== formData.property_reference_pattern ||
        settings?.property_reference_pattern_gestion !== formData.property_reference_pattern_gestion ||
        settings?.property_reference_pattern_location !== formData.property_reference_pattern_location ||
        settings?.property_reference_pattern_vente !== formData.property_reference_pattern_vente ||
        settings?.property_reference_pattern_syndic !== formData.property_reference_pattern_syndic
      );
      setPatternChanged(hasPatternChanged);
      loadSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Erreur lors de la sauvegarde des paramètres');
    } finally {
      setSaving(false);
    }
  }

  async function renameExistingKeys() {
    if (!profile?.agency_id) return;

    if (!confirm(
      'Êtes-vous sûr de vouloir renommer toutes les clés existantes selon le nouveau format de référence des biens ?\n\n' +
      'Cette action va :\n' +
      '- Régénérer les références de tous les biens\n' +
      '- Mettre à jour les labels de toutes les clés\n\n' +
      'Cette opération peut prendre quelques instants.'
    )) {
      return;
    }

    setRenaming(true);

    try {
      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select('id, reference, owner_name, owner_first_name, address, type')
        .eq('agency_id', profile.agency_id);

      if (propertiesError) throw propertiesError;

      let successCount = 0;
      let errorCount = 0;

      for (const property of properties || []) {
        try {
          const { data: newReference, error: refError } = await supabase.rpc(
            'generate_property_reference',
            {
              p_agency_id: profile.agency_id,
              p_owner_name: property.owner_name,
              p_owner_first_name: property.owner_first_name || '',
              p_address: property.address,
              p_type: property.type,
            }
          );

          if (refError) {
            console.error(`Error generating reference for property ${property.id}:`, refError);
            errorCount++;
            continue;
          }

          const { error: updateError } = await supabase
            .from('properties')
            .update({ reference: newReference })
            .eq('id', property.id);

          if (updateError) {
            console.error(`Error updating property ${property.id}:`, updateError);
            errorCount++;
            continue;
          }

          const { data: keys, error: keysError } = await supabase
            .from('keys')
            .select('id, label')
            .eq('property_id', property.id);

          if (keysError) {
            console.error(`Error fetching keys for property ${property.id}:`, keysError);
            errorCount++;
            continue;
          }

          for (const key of keys || []) {
            const oldLabel = key.label;
            const newLabel = oldLabel.replace(property.reference, newReference);

            if (newLabel !== oldLabel) {
              const { error: keyUpdateError } = await supabase
                .from('keys')
                .update({ label: newLabel })
                .eq('id', key.id);

              if (keyUpdateError) {
                console.error(`Error updating key ${key.id}:`, keyUpdateError);
                errorCount++;
              }
            }
          }

          successCount++;
        } catch (error) {
          console.error(`Error processing property ${property.id}:`, error);
          errorCount++;
        }
      }

      if (errorCount === 0) {
        alert(`✓ Renommage terminé avec succès !\n\n${successCount} bien(s) et leurs clés ont été renommés.`);
      } else {
        alert(
          `Renommage terminé avec quelques erreurs.\n\n` +
          `${successCount} bien(s) renommé(s)\n` +
          `${errorCount} erreur(s)\n\n` +
          `Consultez la console pour plus de détails.`
        );
      }

      setPatternChanged(false);
    } catch (error) {
      console.error('Error renaming keys:', error);
      alert('Erreur lors du renommage des clés');
    } finally {
      setRenaming(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout currentPage="settings">
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-600">Chargement...</div>
        </div>
      </DashboardLayout>
    );
  }

  const tabs = [
    { id: 'general' as TabType, label: 'Général', icon: Settings },
    { id: 'gestion' as TabType, label: 'Gestion' },
    { id: 'location' as TabType, label: 'Location' },
    { id: 'vente' as TabType, label: 'Vente' },
    { id: 'syndic' as TabType, label: 'Syndic' },
  ];

  return (
    <DashboardLayout currentPage="settings">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center space-x-3 mb-8">
          <Settings className="w-8 h-8 text-amber-700" />
          <h1 className="text-3xl font-bold text-slate-900">Paramètres de l'agence</h1>
        </div>

        {profile?.role !== 'ADMIN' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-amber-900 text-sm">
              Vous ne pouvez pas modifier les paramètres. Contactez un administrateur.
            </p>
          </div>
        )}

        {profile?.role === 'ADMIN' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-blue-900 text-sm font-medium mb-1">
                  Rafraîchissement des références
                </p>
                <p className="text-blue-800 text-sm">
                  Si vous modifiez les formats de référence, utilisez le bouton "Rafraîchir les références" en bas de page
                  pour appliquer les nouveaux formats à tous les biens et clés existants.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="border-b-2 border-slate-200 bg-slate-50">
            <div className="flex overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-8 py-4 text-base font-semibold whitespace-nowrap transition-all border-b-4 -mb-0.5 ${
                    activeTab === tab.id
                      ? 'border-amber-600 text-amber-700 bg-white'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {activeTab === 'general' && (
              <>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    Format de référence des biens (Général)
                  </h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Ce format sera utilisé pour les biens de type : Appartement, Maison, Bureau, Commerce, Terrain, Parking.
                  </p>
                  <label
                    htmlFor="property_reference_pattern"
                    className="block text-sm font-medium text-slate-700 mb-2"
                  >
                    Format de référence
                  </label>
                  <input
                    id="property_reference_pattern"
                    type="text"
                    value={formData.property_reference_pattern}
                    onChange={(e) =>
                      setFormData({ ...formData, property_reference_pattern: e.target.value })
                    }
                    disabled={profile?.role !== 'ADMIN'}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono disabled:bg-slate-100"
                    placeholder="{owner_name:3}-{address:3}-{counter:3}"
                  />
                  <div className="mt-3 bg-slate-50 rounded-lg p-4">
                    <div className="flex items-start space-x-2 mb-2">
                      <Info className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-slate-700 font-medium">Variables disponibles :</p>
                    </div>
                    <ul className="text-xs text-slate-600 space-y-1 ml-6">
                      <li>
                        <code className="bg-slate-200 px-1 rounded">
                          {'{owner_name:3}'}
                        </code>{' '}
                        - 3 premières lettres du nom
                      </li>
                      <li>
                        <code className="bg-slate-200 px-1 rounded">
                          {'{owner_first_name:3}'}
                        </code>{' '}
                        - 3 premières lettres du prénom
                      </li>
                      <li>
                        <code className="bg-slate-200 px-1 rounded">
                          {'{address:3}'}
                        </code>{' '}
                        - 3 premières lettres de l'adresse
                      </li>
                      <li>
                        <code className="bg-slate-200 px-1 rounded">
                          {'{type:3}'}
                        </code>{' '}
                        - 3 premières lettres du type
                      </li>
                      <li>
                        <code className="bg-slate-200 px-1 rounded">
                          {'{counter:3}'}
                        </code>{' '}
                        - Compteur auto-incrémenté sur 3 chiffres
                      </li>
                    </ul>
                    <p className="text-xs text-slate-500 mt-3">
                      Exemple : DUP-RUE-001 pour "Dupont" habitant "Rue de la Paix"
                    </p>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    Compteur général
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Prochain numéro (Biens généraux)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.property_counter}
                        onChange={(e) =>
                          setFormData({ ...formData, property_counter: parseInt(e.target.value) || 0 })
                        }
                        disabled={profile?.role !== 'ADMIN'}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-slate-100"
                      />
                      <p className="text-xs text-slate-500 mt-2">
                        Définissez le prochain numéro qui sera utilisé
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Prochain numéro (Clés)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.key_counter}
                        onChange={(e) =>
                          setFormData({ ...formData, key_counter: parseInt(e.target.value) || 0 })
                        }
                        disabled={profile?.role !== 'ADMIN'}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-slate-100"
                      />
                      <p className="text-xs text-slate-500 mt-2">
                        Compteur pour les références de clés
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    Format de référence des clés
                  </h3>
                  <label
                    htmlFor="key_reference_pattern"
                    className="block text-sm font-medium text-slate-700 mb-2"
                  >
                    Format de référence
                  </label>
                  <input
                    id="key_reference_pattern"
                    type="text"
                    value={formData.key_reference_pattern}
                    onChange={(e) =>
                      setFormData({ ...formData, key_reference_pattern: e.target.value })
                    }
                    disabled={profile?.role !== 'ADMIN'}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono disabled:bg-slate-100"
                    placeholder="{property_ref}-{counter:2}"
                  />
                  <div className="mt-3 bg-slate-50 rounded-lg p-4">
                    <div className="flex items-start space-x-2 mb-2">
                      <Info className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-slate-700 font-medium">Variables disponibles :</p>
                    </div>
                    <ul className="text-xs text-slate-600 space-y-1 ml-6">
                      <li>
                        <code className="bg-slate-200 px-1 rounded">
                          {'{property_ref}'}
                        </code>{' '}
                        - Référence complète du bien
                      </li>
                      <li>
                        <code className="bg-slate-200 px-1 rounded">
                          {'{label:3}'}
                        </code>{' '}
                        - 3 premières lettres du label
                      </li>
                      <li>
                        <code className="bg-slate-200 px-1 rounded">
                          {'{counter:2}'}
                        </code>{' '}
                        - Compteur auto-incrémenté sur 2 chiffres
                      </li>
                    </ul>
                    <p className="text-xs text-slate-500 mt-3">
                      Exemple : DUP-RUE-001-01 pour la première clé du bien DUP-RUE-001
                    </p>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'gestion' && (
              <ServiceTabContent
                serviceType="gestion"
                serviceLabel="Gestion"
                patternValue={formData.property_reference_pattern_gestion}
                counterValue={formData.property_counter_gestion}
                onPatternChange={(value) =>
                  setFormData({ ...formData, property_reference_pattern_gestion: value })
                }
                onCounterChange={(value) =>
                  setFormData({ ...formData, property_counter_gestion: value })
                }
                disabled={profile?.role !== 'ADMIN'}
              />
            )}

            {activeTab === 'location' && (
              <ServiceTabContent
                serviceType="location"
                serviceLabel="Location"
                patternValue={formData.property_reference_pattern_location}
                counterValue={formData.property_counter_location}
                onPatternChange={(value) =>
                  setFormData({ ...formData, property_reference_pattern_location: value })
                }
                onCounterChange={(value) =>
                  setFormData({ ...formData, property_counter_location: value })
                }
                disabled={profile?.role !== 'ADMIN'}
              />
            )}

            {activeTab === 'vente' && (
              <ServiceTabContent
                serviceType="vente"
                serviceLabel="Vente"
                patternValue={formData.property_reference_pattern_vente}
                counterValue={formData.property_counter_vente}
                onPatternChange={(value) =>
                  setFormData({ ...formData, property_reference_pattern_vente: value })
                }
                onCounterChange={(value) =>
                  setFormData({ ...formData, property_counter_vente: value })
                }
                disabled={profile?.role !== 'ADMIN'}
              />
            )}

            {activeTab === 'syndic' && (
              <ServiceTabContent
                serviceType="syndic"
                serviceLabel="Syndic"
                patternValue={formData.property_reference_pattern_syndic}
                counterValue={formData.property_counter_syndic}
                onPatternChange={(value) =>
                  setFormData({ ...formData, property_reference_pattern_syndic: value })
                }
                onCounterChange={(value) =>
                  setFormData({ ...formData, property_counter_syndic: value })
                }
                disabled={profile?.role !== 'ADMIN'}
              />
            )}

            {profile?.role === 'ADMIN' && (
              <div className="flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-3 pt-6 mt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={renameExistingKeys}
                  disabled={renaming}
                  className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-5 h-5 ${renaming ? 'animate-spin' : ''}`} />
                  <span>{renaming ? 'Renommage en cours...' : 'Rafraîchir les références'}</span>
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center justify-center space-x-2 bg-primary text-white px-6 py-3 rounded-lg hover:bg-secondary transition disabled:opacity-50"
                >
                  <Save className="w-5 h-5" />
                  <span>{saving ? 'Enregistrement...' : 'Enregistrer'}</span>
                </button>
              </div>
            )}
          </form>
        </div>

        {profile?.role === 'ADMIN' && (
          <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Maintenance</h2>
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-amber-900 mb-1">
                      Vider le cache de l'application
                    </h3>
                    <p className="text-sm text-amber-700 mb-3">
                      Si vous rencontrez des problèmes de chargement ou des bugs, videz le cache local.
                      Cela supprimera toutes les données temporaires et vous serez déconnecté.
                    </p>
                    <button
                      onClick={() => {
                        if (confirm('Êtes-vous sûr de vouloir vider le cache ? Vous serez déconnecté.')) {
                          localStorage.clear();
                          sessionStorage.clear();
                          supabase.auth.signOut();
                          window.location.reload();
                        }
                      }}
                      className="flex items-center space-x-2 bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Vider le cache et redémarrer</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </DashboardLayout>
  );
}
