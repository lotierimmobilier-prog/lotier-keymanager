import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { DashboardLayout } from '../../components/DashboardLayout';
import { Save, MessageSquare, Info } from 'lucide-react';

interface SmsTemplate {
  id: string;
  code: string;
  label: string;
  content: string;
  enabled: boolean;
  updated_at: string;
}

export function SmsConfigPage() {
  const { profile } = useAuth();
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    try {
      const { data, error } = await supabase
        .from('sms_templates')
        .select('*')
        .order('code', { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des templates:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(template: SmsTemplate) {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('sms_templates')
        .update({
          content: template.content,
          enabled: template.enabled,
          updated_at: new Date().toISOString(),
        })
        .eq('id', template.id);

      if (error) throw error;
      alert('Template enregistré avec succès');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde du template');
    } finally {
      setSaving(false);
    }
  }

  function updateTemplate(id: string, updates: Partial<SmsTemplate>) {
    setTemplates(templates.map(t =>
      t.id === id ? { ...t, ...updates } : t
    ));
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

  return (
    <DashboardLayout currentPage="settings">
      <div className="max-w-5xl mx-auto px-4 sm:px-0">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Configuration SMS</h1>
          <p className="text-sm sm:text-base text-slate-600">
            Personnalisez les messages SMS envoyés automatiquement lors des mouvements de clés
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-2">Variables disponibles dans les templates :</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div><code className="bg-blue-100 px-2 py-0.5 rounded">{'{{prenom}}'}</code> - Prénom du contact</div>
                <div><code className="bg-blue-100 px-2 py-0.5 rounded">{'{{nom}}'}</code> - Nom du contact</div>
                <div><code className="bg-blue-100 px-2 py-0.5 rounded">{'{{reference_cle}}'}</code> - Référence de la clé</div>
                <div><code className="bg-blue-100 px-2 py-0.5 rounded">{'{{date_prise}}'}</code> - Date de sortie</div>
                <div><code className="bg-blue-100 px-2 py-0.5 rounded">{'{{heure_prise}}'}</code> - Heure de sortie</div>
                <div><code className="bg-blue-100 px-2 py-0.5 rounded">{'{{date_retour}}'}</code> - Date de retour prévue</div>
                <div><code className="bg-blue-100 px-2 py-0.5 rounded">{'{{heure_retour}}'}</code> - Heure de retour prévue</div>
                <div><code className="bg-blue-100 px-2 py-0.5 rounded">{'{{nom_agence}}'}</code> - Nom de l'agence</div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {templates.map((template) => (
            <div key={template.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <MessageSquare className="w-6 h-6 text-amber-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{template.label}</h3>
                    <p className="text-sm text-slate-500">Code: {template.code}</p>
                  </div>
                </div>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={template.enabled}
                    onChange={(e) => updateTemplate(template.id, { enabled: e.target.checked })}
                    className="w-5 h-5 text-amber-700 border-slate-300 rounded focus:ring-primary"
                  />
                  <span className="ml-2 text-sm font-medium text-slate-700">
                    {template.enabled ? 'Activé' : 'Désactivé'}
                  </span>
                </label>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Contenu du SMS
                </label>
                <textarea
                  value={template.content}
                  onChange={(e) => updateTemplate(template.id, { content: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                  placeholder="Contenu du SMS avec variables..."
                />
                <p className="text-xs text-slate-500 mt-1">
                  Longueur: {template.content.length} caractères (max conseillé: 160)
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => handleSave(template)}
                  disabled={saving}
                  className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-secondary transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Enregistrement...' : 'Enregistrer'}</span>
                </button>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-xs text-slate-500">
                  Dernière modification: {new Date(template.updated_at).toLocaleString('fr-FR')}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h3 className="font-semibold text-amber-900 mb-2">À propos de l'envoi automatique</h3>
          <ul className="text-sm text-amber-800 space-y-2">
            <li><strong>SMS #1 - Confirmation de sortie:</strong> Envoyé immédiatement lors de l'enregistrement d'une sortie de clé.</li>
            <li><strong>SMS #2 - Rappel 2h avant:</strong> Envoyé automatiquement 2 heures avant l'heure de retour prévue.</li>
            <li><strong>SMS #3 - Alerte retard:</strong> Envoyé automatiquement si la clé n'est pas rendue après l'heure prévue.</li>
          </ul>
          <p className="text-sm text-amber-800 mt-4">
            <strong>Note:</strong> Les SMS automatiques (rappel et retard) sont gérés par une tâche planifiée qui s'exécute toutes les 10 minutes.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
