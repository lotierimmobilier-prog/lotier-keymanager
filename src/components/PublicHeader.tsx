import { useState, useEffect } from 'react';
import { Link } from './Link';
import { Key, Sparkles, User, LogIn, Menu, X, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';

export function PublicHeader() {
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [agencyLogo, setAgencyLogo] = useState<string | null>(null);
  const [agencyName, setAgencyName] = useState<string>('');

  useEffect(() => {
    if (user && profile?.agency_id) {
      loadAgencyLogo();
    }
  }, [user, profile?.agency_id]);

  async function loadAgencyLogo() {
    if (!profile?.agency_id) return;

    try {
      const { data, error } = await supabase
        .from('agencies')
        .select('logo_url, name')
        .eq('id', profile.agency_id)
        .maybeSingle();

      if (data && !error) {
        setAgencyLogo(data.logo_url);
        setAgencyName(data.name);
      }
    } catch (error) {
      console.error('Error loading agency logo:', error);
    }
  }

  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <Link to="/" className="flex items-center space-x-3">
          {user && agencyLogo ? (
            <>
              <img
                src={agencyLogo}
                alt={agencyName}
                className="h-8 sm:h-10 object-contain lg:hidden"
              />
              <div className="hidden lg:flex items-center space-x-3">
                <div className="relative">
                  <Key className="w-7 h-7 sm:w-8 sm:h-8 text-amber-500" />
                  <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400 absolute -top-1 -right-1 animate-pulse" />
                </div>
                <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">KeyManager.io</span>
              </div>
            </>
          ) : (
            <>
              <div className="relative">
                <Key className="w-7 h-7 sm:w-8 sm:h-8 text-amber-500" />
                <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400 absolute -top-1 -right-1 animate-pulse" />
              </div>
              <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">KeyManager.io</span>
            </>
          )}
        </Link>

        <div className="hidden lg:flex items-center space-x-6">
          <Link to="/features" className="text-slate-600 hover:text-amber-600 font-medium transition">{t('nav.features')}</Link>
          <Link to="/pricing" className="text-slate-600 hover:text-amber-600 font-medium transition">{t('nav.pricing')}</Link>
          <Link to="/blog" className="text-slate-600 hover:text-amber-600 font-medium transition">{t('nav.blog')}</Link>
          {user ? (
            <>
              <Link to="/dashboard" className="flex items-center space-x-2 text-slate-600 hover:text-amber-600 font-medium transition">
                <User className="w-4 h-4" />
                <span>{profile?.first_name || t('nav.dashboard')}</span>
              </Link>
              <Link to="/dashboard" className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-2.5 rounded-full hover:from-amber-600 hover:to-orange-600 transition font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center space-x-2">
                <span>{t('nav.dashboard')}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="flex items-center space-x-2 text-slate-600 hover:text-amber-600 font-medium transition">
                <LogIn className="w-4 h-4" />
                <span>{t('nav.login')}</span>
              </Link>
              <Link to="/signup" className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-2.5 rounded-full hover:from-amber-600 hover:to-orange-600 transition font-semibold shadow-lg hover:shadow-xl transform hover:scale-105">
                {t('nav.signup')}
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 text-slate-600 hover:text-amber-600 transition"
          aria-label="Menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-slate-200 shadow-lg">
          <div className="px-4 py-4 space-y-3">
            <Link
              to="/features"
              className="block py-2 text-slate-600 hover:text-amber-600 font-medium transition"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('nav.features')}
            </Link>
            <Link
              to="/pricing"
              className="block py-2 text-slate-600 hover:text-amber-600 font-medium transition"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('nav.pricing')}
            </Link>
            <Link
              to="/blog"
              className="block py-2 text-slate-600 hover:text-amber-600 font-medium transition"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('nav.blog')}
            </Link>
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="block py-2 text-slate-600 hover:text-amber-600 font-medium transition"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {profile?.first_name || t('nav.dashboard')}
                </Link>
                <Link
                  to="/dashboard"
                  className="block w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-full hover:from-amber-600 hover:to-orange-600 transition font-semibold shadow-lg text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav.dashboard')}
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="block py-2 text-slate-600 hover:text-amber-600 font-medium transition"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav.login')}
                </Link>
                <Link
                  to="/signup"
                  className="block w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-full hover:from-amber-600 hover:to-orange-600 transition font-semibold shadow-lg text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('nav.signup')}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
