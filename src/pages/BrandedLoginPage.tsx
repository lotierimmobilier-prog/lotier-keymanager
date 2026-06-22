import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { LogIn, AlertCircle } from 'lucide-react';

interface AgencyBranding {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
}

export function BrandedLoginPage() {
  const slug = window.location.pathname.split('/')[2];
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [agency, setAgency] = useState<AgencyBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (profile) {
      window.history.pushState({}, '', '/dashboard');
      window.location.reload();
    }
  }, [profile]);

  useEffect(() => {
    if (slug) {
      loadAgencyBranding();
    }
  }, [slug]);

  async function loadAgencyBranding() {
    try {
      const { data, error } = await supabase
        .from('agencies')
        .select('id, name, logo_url, primary_color, secondary_color')
        .eq('slug', slug)
        .single();

      if (error || !data) {
        window.history.pushState({}, '', '/login');
        window.location.reload();
        return;
      }

      setAgency(data);
    } catch (error) {
      console.error('Error loading agency branding:', error);
      window.history.pushState({}, '', '/login');
      window.location.reload();
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (authData.user) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('is_banned, ban_reason, agency_id')
          .eq('id', authData.user.id)
          .single();

        if (userError) throw userError;

        if (userData.is_banned) {
          await supabase.auth.signOut();
          setError(`Compte banni: ${userData.ban_reason || 'Contactez l\'administrateur'}`);
          return;
        }

        if (userData.agency_id !== agency?.id) {
          await supabase.auth.signOut();
          setError('Vous n\'êtes pas autorisé à vous connecter via ce lien');
          return;
        }

        window.history.pushState({}, '', '/dashboard');
        window.location.reload();
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Erreur de connexion');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-slate-600">{t('loading')}</div>
      </div>
    );
  }

  if (!agency) {
    return null;
  }

  const primaryColor = agency.primary_color || '#D97706';
  const secondaryColor = agency.secondary_color || '#92400E';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <style>{`
        .branded-button {
          background-color: ${primaryColor};
        }
        .branded-button:hover {
          background-color: ${secondaryColor};
        }
        .branded-focus:focus {
          --tw-ring-color: ${primaryColor};
        }
        .branded-header {
          background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);
        }
      `}</style>

      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
          <div className="branded-header px-8 py-10 text-center">
            {agency.logo_url ? (
              <div className="flex flex-col items-center mb-4">
                <div className="bg-white rounded-xl p-6 shadow-lg mb-3">
                  <img
                    src={agency.logo_url}
                    alt={agency.name}
                    className="h-20 object-contain"
                  />
                </div>
                <p className="text-white/80 text-sm italic">{t('branded.service')}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center mb-4">
                <div className="w-20 h-20 rounded-2xl mx-auto mb-3 flex items-center justify-center bg-white/20 backdrop-blur-sm shadow-lg">
                  <LogIn className="w-10 h-10 text-white" />
                </div>
                <p className="text-white/80 text-sm italic">{t('branded.service')}</p>
              </div>
            )}

            <h1 className="text-3xl font-bold text-white mb-2">{agency.name}</h1>
            <p className="text-white/90 font-medium">{t('branded.employee-space')}</p>
          </div>

          <div className="p-8">

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                {t('auth.login.email')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 branded-focus"
                placeholder="votre@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                {t('auth.login.password')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 branded-focus"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full branded-button text-white py-3 rounded-lg font-semibold transition disabled:opacity-50"
            >
              {isSubmitting ? t('loading.connecting') : t('auth.login.submit')}
            </button>
          </form>

            <div className="mt-6 pt-6 border-t border-slate-200">
              <p className="text-center text-sm text-slate-600">
                {t('branded.no-account')}{' '}
                <span className="text-slate-400">{t('branded.contact-admin')}</span>
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          {t('branded.access-restricted')} <span className="font-semibold">{agency.name}</span>
        </p>
      </div>
    </div>
  );
}
