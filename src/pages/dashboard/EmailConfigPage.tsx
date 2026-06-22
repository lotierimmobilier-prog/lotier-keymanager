import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { DashboardLayout } from '../../components/DashboardLayout';
import { Save, Mail, Info, Eye, EyeOff, Send, CheckCircle, XCircle, ExternalLink, Server } from 'lucide-react';

interface EmailConfig {
  email_provider: string;
  email_from_address: string;
  email_from_name: string;
  notification_email: string;
  // SMTP
  email_smtp_host: string;
  email_smtp_port: number;
  email_smtp_user: string;
  email_smtp_pass: string;
  email_smtp_secure: boolean;
  // API providers
  email_api_key: string;
}

const PROVIDERS = [
  {
    id: 'smtp',
    label: 'SMTP',
    description: 'Votre propre serveur mail (OVH, Gmail, Outlook, hébergeur…). Aucun compte tiers requis.',
    icon: Server,
  },
  {
    id: 'resend',
    label: 'Resend',
    description: 'API moderne, gratuit jusqu\'à 3 000 emails/mois.',
    icon: Mail,
  },
  {
    id: 'brevo',
    label: 'Brevo',
    description: 'Société française, gère email + SMS, gratuit jusqu\'à 300 emails/jour.',
    icon: Mail,
  },
];

export function EmailConfigPage() {
  const { profile } = useAuth();
  const [config, setConfig] = useState<EmailConfig>({
    email_provider: 'smtp',
    email_from_address: '',
    email_from_name: '',
    notification_email: '',
    email_smtp_host: '',
    email_smtp_port: 587,
    email_smtp_user: '',
    email_smtp_pass: '',
    email_smtp_secure: false,
    email_api_key: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPass, setShowPass] = useState(false);
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
        .select('email_provider, email_from_address, email_from_name, email_api_key, email_smtp_host, email_smtp_port, email_smtp_user, email_smtp_pass, email_smtp_secure, notification_email')
        .eq('id', profile.agency_id)
        .single();
      if (error) throw error;
      if (data) {
        setConfig({
          email_provider: data.email_provider || 'smtp',
          email_from_address: data.email_from_address || '',
          email_from_name: data.email_from_name || '',
          notification_email: data.notification_email || '',
          email_api_key: data.email_api_key || '',
          email_smtp_host: data.email_smtp_host || '',
          email_smtp_port: data.email_smtp_port || 587,
          email_smtp_user: data.email_smtp_user || '',
          email_smtp_pass: data.email_smtp_pass || '',
          email_smtp_secure: data.email_smtp_secure || false,
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
          email_from_address: config.email_from_address,
          email_from_name: config.email_from_name,
          notification_email: config.notification_email || null,
          email_api_key: config.email_api_key,
          email_smtp_host: config.email_smtp_host,
          email_smtp_port: config.email_smtp_port,
          email_smtp_user: config.email_smtp_user,
          email_smtp_pass: config.email_smtp_pass,
          email_smtp_secure: config.email_smtp_secure,
        })
        .eq('id', profile.agency_id);
      if (error) throw error;
      alert('Configuration enregistrée avec succès');
    } catch (err) {
      console.error('Error saving config:', err);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  async function handleTestEmail() {
    if (!profile?.agency_id || !profile?.email) return;

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
            subject: 'Test — Configuration Email KeyManager',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
                <div style="background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                  <h1 style="color: white; margin: 0; font-size: 22px;">Email de test</h1>
                  <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0;">Configuration KeyManager</p>
                </div>
                <p style="color: #374151;">Bonjour,</p>
                <p style="color: #374151;">Cet email confirme que votre configuration SMTP est bien fonctionnelle.</p>
                <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin: 16px 0;">
                  <p style="color: #166534; margin: 0;"><strong>✅ Connexion SMTP valide</strong></p>
                  <p style="color: #15803d; margin: 8px 0 0; font-size: 14px;">Serveur : ${config.email_smtp_host || config.email_provider}</p>
                </div>
                <p style="color: #6b7280; font-size: 13px; margin-top: 24px;">— KeyManager.io</p>
              </div>
            `,
          }),
        }
      );

      const result = await response.json();
      if (result.success) {
        setTestStatus('success');
        setTimeout(() => setTestStatus('idle'), 5000);
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
        <div className="flex items-center justify-center h-64 text-slate-600">Chargement...</div>
      </DashboardLayout>
    );
  }

  const isSMTP = config.email_provider === 'smtp';
  const isAPIProvider = config.email_provider === 'resend' || config.email_provider === 'brevo';

  return (
    <DashboardLayout currentPage="email-config">
      <div className="max-w-3xl mx-auto px-4 sm:px-0">

        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Configuration Email</h1>
          <p className="text-slate-600">
            Paramétrez l'envoi automatique d'emails lors des remises de clés
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">Quand l'email est-il envoyé ?</p>
              <p>Après les deux signatures (agence + prestataire) et la photo, un email de confirmation part automatiquement au prestataire avec les clés remises, l'adresse du bien, le lien GPS et les dates.</p>
            </div>
          </div>
        </div>

        {/* Provider tabs */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Mode d'envoi</h2>
          <div className="grid grid-cols-3 gap-2 mb-6">
            {PROVIDERS.map(p => {
              const Icon = p.icon;
              const active = config.email_provider === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setConfig({ ...config, email_provider: p.id })}
                  className={`flex flex-col items-start p-3 rounded-xl border-2 transition-all text-left ${
                    active ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className={`text-sm font-semibold ${active ? 'text-primary' : 'text-slate-700'}`}>{p.label}</span>
                    {active && <CheckCircle className="w-3.5 h-3.5 text-primary" />}
                  </div>
                  <p className="text-xs text-slate-500 leading-snug">{p.description}</p>
                </button>
              );
            })}
          </div>

          {/* Common fields */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Adresse d'expéditeur *</label>
                <input
                  type="email"
                  value={config.email_from_address}
                  onChange={e => setConfig({ ...config, email_from_address: e.target.value })}
                  placeholder="notifications@votre-agence.fr"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nom d'expéditeur</label>
                <input
                  type="text"
                  value={config.email_from_name}
                  onChange={e => setConfig({ ...config, email_from_name: e.target.value })}
                  placeholder="Agence Dupont Immobilier"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email de notification agence
                <span className="ml-1.5 text-xs font-normal text-slate-400">(gestion@, copie interne)</span>
              </label>
              <input
                type="email"
                value={config.notification_email}
                onChange={e => setConfig({ ...config, notification_email: e.target.value })}
                placeholder="gestion@votre-agence.fr"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
              <p className="text-xs text-slate-400 mt-1">
                Recevra une copie à chaque remise de clés et une notification lors des demandes de délai avec lien d'approbation.
              </p>
            </div>

            {/* SMTP specific fields */}
            {isSMTP && (
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Server className="w-4 h-4 text-slate-500" />
                  Paramètres SMTP
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Serveur SMTP (host) *</label>
                    <input
                      type="text"
                      value={config.email_smtp_host}
                      onChange={e => setConfig({ ...config, email_smtp_host: e.target.value })}
                      placeholder="ssl0.ovh.net"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Port *</label>
                    <input
                      type="number"
                      value={config.email_smtp_port}
                      onChange={e => setConfig({ ...config, email_smtp_port: parseInt(e.target.value) || 587 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Identifiant (email ou login) *</label>
                  <input
                    type="text"
                    value={config.email_smtp_user}
                    onChange={e => setConfig({ ...config, email_smtp_user: e.target.value })}
                    placeholder="votre.email@domaine.fr"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mot de passe *</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={config.email_smtp_pass}
                      onChange={e => setConfig({ ...config, email_smtp_pass: e.target.value })}
                      placeholder="••••••••••••"
                      className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <input
                    id="smtp_secure"
                    type="checkbox"
                    checked={config.email_smtp_secure}
                    onChange={e => setConfig({ ...config, email_smtp_secure: e.target.checked })}
                    className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary"
                  />
                  <label htmlFor="smtp_secure" className="text-sm text-slate-700">
                    <span className="font-medium">SSL/TLS direct</span>
                    <span className="text-slate-500 ml-1">(port 465) — décoché = STARTTLS (port 587)</span>
                  </label>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
                  <p className="font-semibold">Paramètres OVH courants :</p>
                  <p>Host : <code className="bg-amber-100 px-1 rounded">ssl0.ovh.net</code> — Port SSL : <code className="bg-amber-100 px-1 rounded">465</code> (cocher SSL) ou Port STARTTLS : <code className="bg-amber-100 px-1 rounded">587</code></p>
                  <p>Host : <code className="bg-amber-100 px-1 rounded">pro1.mail.ovh.net</code> pour les offres Pro</p>
                </div>
              </div>
            )}

            {/* API key field for Resend/Brevo */}
            {isAPIProvider && (
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-sm font-medium text-slate-700 mb-1">Clé API *</label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={config.email_api_key}
                    onChange={e => setConfig({ ...config, email_api_key: e.target.value })}
                    placeholder={config.email_provider === 'resend' ? 're_xxxxxxxxxxxx' : 'xkeysib-xxxxxxxxxxxx'}
                    className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm font-mono"
                  />
                  <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <a
                  href={config.email_provider === 'resend' ? 'https://resend.com/api-keys' : 'https://app.brevo.com/settings/keys/api'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Obtenir ma clé API {config.email_provider === 'resend' ? 'Resend' : 'Brevo'}
                </a>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-5 border-t border-slate-200">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg hover:bg-secondary transition disabled:opacity-50 text-sm font-medium"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>

            <button
              onClick={handleTestEmail}
              disabled={testStatus === 'sending'}
              className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border transition text-sm font-medium disabled:opacity-50 ${
                testStatus === 'success'
                  ? 'border-green-300 bg-green-50 text-green-700'
                  : testStatus === 'error'
                  ? 'border-red-300 bg-red-50 text-red-700'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {testStatus === 'sending' ? (
                <><div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" /><span>Envoi en cours...</span></>
              ) : testStatus === 'success' ? (
                <><CheckCircle className="w-4 h-4" /><span>Email envoyé !</span></>
              ) : testStatus === 'error' ? (
                <><XCircle className="w-4 h-4" /><span>Échec</span></>
              ) : (
                <><Send className="w-4 h-4" /><span>Envoyer un email de test</span></>
              )}
            </button>
          </div>

          {testStatus === 'error' && testError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{testError}</div>
          )}
          {testStatus === 'success' && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              Email de test envoyé à <strong>{profile?.email}</strong>. Vérifiez votre boîte de réception (et les spams).
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
