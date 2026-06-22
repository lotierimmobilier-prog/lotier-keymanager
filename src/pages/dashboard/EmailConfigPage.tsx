import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { DashboardLayout } from '../../components/DashboardLayout';
import { Save, Mail, Info, Eye, EyeOff, Send, CheckCircle, XCircle, ExternalLink } from 'lucide-react';

interface EmailConfig {
  email_provider: string;
  email_api_key: string;
  email_from_address: string;
  email_from_name: string;
}

export function EmailConfigPage() {
  const { profile } = useAuth();
  const [config, setConfig] = useState<EmailConfig>({
    email_provider: 'resend',
    email_api_key: '',
    email_from_address: '',
    email_from_name: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [testError, setTestError] = useState('');

  useEffect(() => {
    if (profile?.agency_id) loadConfig();
  }, [profile]);

  async function loadConfig() {
    if (!profile?.agency_id) return;
    try {
      const { data, error } = await supabase
        .from('agencies')
        .select('email_provider, email_api_key, email_from_address, email_from_name')
        .eq('id', profile.agency_id)
        .single();
      if (error) throw error;
      if (data) {
        setConfig({
          email_provider: data.email_provider || 'resend',
          email_api_key: data.email_api_key || '',
          email_from_address: data.email_from_address || '',
          email_from_name: data.email_from_name || '',
        });
      }
    } catch (err) {
      console.error('Error loading email config:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!profile?.agency_id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('agencies')
        .update({
          email_provider: config.email_provider,
          email_api_key: config.email_api_key,
          email_from_address: config.email_from_address,
          email_from_name: config.email_from_name,
        })
        .eq('id', profile.agency_id);
      if (error) throw error;
      alert('Configuration email enregistrée avec succès');
    } catch (err) {
      console.error('Error saving config:', err);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  async function handleTestEmail() {
    if (!profile?.agency_id || !profile?.email) return;
    if (!config.email_api_key || !config.email_from_address) {
      alert('Veuillez d\'abord configurer et sauvegarder la clé API et l\'adresse d\'envoi');
      return;
    }

    setTestStatus('sending');
    setTestError('');

    try {
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session) throw new Error('Non authentifié');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authData.session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            agencyId: profile.agency_id,
            to: profile.email,
            toName: `${profile.first_name} ${profile.last_name}`,
            subject: 'Test - Configuration Email KeyManager',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
                <div style="background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                  <h1 style="color: white; margin: 0; font-size: 24px;">Email de test</h1>
                  <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0;">Configuration KeyManager</p>
                </div>
                <p style="color: #374151;">Bonjour,</p>
                <p style="color: #374151;">Cet email confirme que votre configuration d'envoi d'emails est bien fonctionnelle.</p>
                <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin: 16px 0;">
                  <p style="color: #166534; margin: 0;"><strong>✅ Configuration valide</strong></p>
                  <p style="color: #15803d; margin: 8px 0 0; font-size: 14px;">Fournisseur : ${config.email_provider === 'resend' ? 'Resend' : 'Brevo'}</p>
                </div>
                <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">— L'équipe KeyManager</p>
              </div>
            `,
          }),
        }
      );

      const result = await response.json();
      if (result.success) {
        setTestStatus('success');
        setTimeout(() => setTestStatus('idle'), 4000);
      } else {
        setTestStatus('error');
        setTestError(result.error || 'Erreur inconnue');
      }
    } catch (err) {
      setTestStatus('error');
      setTestError(String(err));
    }
  }

  if (loading) {
    return (
      <DashboardLayout currentPage="email-config">
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-600">Chargement...</div>
        </div>
      </DashboardLayout>
    );
  }

  const providerDocs: Record<string, { label: string; url: string; description: string }> = {
    resend: {
      label: 'Resend',
      url: 'https://resend.com',
      description: 'API moderne et simple, idéal pour les développeurs. Gratuit jusqu\'à 3 000 emails/mois.',
    },
    brevo: {
      label: 'Brevo (ex-Sendinblue)',
      url: 'https://brevo.com',
      description: 'Société française gérant email + SMS en une seule plateforme. Gratuit jusqu\'à 300 emails/jour.',
    },
  };

  const currentProvider = providerDocs[config.email_provider];

  return (
    <DashboardLayout currentPage="email-config">
      <div className="max-w-3xl mx-auto px-4 sm:px-0">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Configuration Email</h1>
          <p className="text-slate-600">
            Paramétrez l'envoi automatique d'emails lors des remises et retours de clés
          </p>
        </div>

        {/* How it works */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">Quand l'email est-il envoyé ?</p>
              <p>Dès que les <strong>deux signatures sont complètes</strong> (agence + prestataire) et la photo prise, un email de confirmation est automatiquement envoyé au prestataire avec :</p>
              <ul className="mt-2 space-y-1 list-disc list-inside text-blue-800">
                <li>La liste des clés remises</li>
                <li>L'adresse du bien avec lien GPS (Google Maps)</li>
                <li>La date et heure de sortie</li>
                <li>La date de retour prévue</li>
                <li>Les signatures (agence + prestataire)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Provider selection */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-amber-600" />
            Fournisseur d'envoi
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {Object.entries(providerDocs).map(([key, doc]) => (
              <button
                key={key}
                type="button"
                onClick={() => setConfig({ ...config, email_provider: key })}
                className={`text-left p-4 rounded-xl border-2 transition-all ${
                  config.email_provider === key
                    ? 'border-primary bg-primary/5'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-900">{doc.label}</span>
                  {config.email_provider === key && (
                    <CheckCircle className="w-4 h-4 text-primary" />
                  )}
                </div>
                <p className="text-xs text-slate-500">{doc.description}</p>
              </button>
            ))}
          </div>

          {currentProvider && (
            <a
              href={currentProvider.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Créer un compte {currentProvider.label}
            </a>
          )}
        </div>

        {/* API credentials */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Paramètres d'envoi</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Clé API *
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={config.email_api_key}
                  onChange={(e) => setConfig({ ...config, email_api_key: e.target.value })}
                  placeholder={config.email_provider === 'resend' ? 're_xxxxxxxxxxxx' : 'xkeysib-xxxxxxxxxxxx'}
                  className="w-full px-4 py-2 pr-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {config.email_provider === 'resend'
                  ? 'Trouvez votre clé API dans Dashboard → API Keys sur resend.com'
                  : 'Trouvez votre clé API dans Mon compte → SMTP & API sur brevo.com'
                }
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Adresse d'envoi (From) *
              </label>
              <input
                type="email"
                value={config.email_from_address}
                onChange={(e) => setConfig({ ...config, email_from_address: e.target.value })}
                placeholder="notifications@votre-agence.fr"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-slate-500 mt-1">
                Doit être un domaine vérifié dans votre compte {currentProvider?.label}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nom d'envoi (From Name)
              </label>
              <input
                type="text"
                value={config.email_from_name}
                onChange={(e) => setConfig({ ...config, email_from_name: e.target.value })}
                placeholder="Agence Dupont Immobilier"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-4 border-t border-slate-200">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center justify-center space-x-2 bg-primary text-white px-5 py-2.5 rounded-lg hover:bg-secondary transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Enregistrement...' : 'Enregistrer'}</span>
            </button>

            <button
              onClick={handleTestEmail}
              disabled={testStatus === 'sending' || !config.email_api_key}
              className={`flex items-center justify-center space-x-2 px-5 py-2.5 rounded-lg border transition disabled:opacity-50 ${
                testStatus === 'success'
                  ? 'border-green-300 bg-green-50 text-green-700'
                  : testStatus === 'error'
                  ? 'border-red-300 bg-red-50 text-red-700'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {testStatus === 'sending' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                  <span>Envoi en cours...</span>
                </>
              ) : testStatus === 'success' ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Email envoyé !</span>
                </>
              ) : testStatus === 'error' ? (
                <>
                  <XCircle className="w-4 h-4" />
                  <span>Échec</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Envoyer un email de test</span>
                </>
              )}
            </button>
          </div>

          {testStatus === 'error' && testError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{testError}</p>
            </div>
          )}

          {testStatus === 'success' && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">
                Email de test envoyé à <strong>{profile?.email}</strong>. Vérifiez votre boîte de réception.
              </p>
            </div>
          )}
        </div>

        {/* Info box */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <h3 className="font-semibold text-amber-900 mb-3">Astuce : Brevo pour email + SMS</h3>
          <p className="text-sm text-amber-800">
            Si vous utilisez Brevo, vous pouvez configurer à la fois l'envoi d'emails et de SMS via la même plateforme,
            avec une seule clé API. C'est la solution la plus simple pour centraliser vos notifications.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
