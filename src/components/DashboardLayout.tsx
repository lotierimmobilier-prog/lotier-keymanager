import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useModal } from '../contexts/ModalContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Key, Home, Building, Users, Activity, Settings, LogOut, BookUser, Store, Shield, Palette, CreditCard, MessageSquare, Menu, X, BarChart3, Clock, RefreshCw, TrendingUp, ShoppingCart, Package, FileText, FileEdit, List } from 'lucide-react';
import { Link } from './Link';
import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentPage?: string;
}

export function DashboardLayout({ children, currentPage = '' }: DashboardLayoutProps) {
  const { profile, signOut, isImpersonating, stopImpersonation } = useAuth();
  const { colors: theme } = useTheme();
  const { showConfirm, showError } = useModal();
  const [agencyLogo, setAgencyLogo] = useState<string | null>(null);
  const [agencyName, setAgencyName] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);

  useEffect(() => {
    if (profile?.agency_id) {
      loadAgencyLogo();
    }
  }, [profile]);

  useEffect(() => {
    console.log('DashboardLayout theme received:', theme);
  }, [theme]);

  async function loadAgencyLogo() {
    if (!profile?.agency_id) return;

    try {
      const { data, error } = await supabase
        .from('agencies')
        .select('logo_url, name')
        .eq('id', profile.agency_id)
        .single();

      if (error) throw error;
      setAgencyLogo(data?.logo_url || null);
      setAgencyName(data?.name || null);
    } catch (error) {
      console.error('Error loading agency logo:', error);
    }
  }

  async function handleClearCache() {
    if (clearingCache) return;

    const confirmed = await showConfirm({
      title: 'Vider le cache',
      message: 'Êtes-vous sûr de vouloir vider le cache ?\n\nCela va :\n- Supprimer toutes les données en cache\n- Rafraîchir la page\n- Recharger toutes les données',
      confirmText: 'Vider le cache',
      cancelText: 'Annuler'
    });

    if (!confirmed) return;

    setClearingCache(true);

    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }

      localStorage.clear();
      sessionStorage.clear();

      window.location.reload();
    } catch (error) {
      console.error('Error clearing cache:', error);
      showError('Erreur', 'Erreur lors du vidage du cache');
      setClearingCache(false);
    }
  }

  const baseMenuItems = [
    { name: 'Dashboard', icon: Home, href: '/dashboard', id: 'dashboard' },
    { name: 'Mon Profil', icon: Users, href: '/dashboard/profile', id: 'profile' },
    { name: 'Agence', icon: Store, href: '/dashboard/agency', id: 'agency' },
    { name: 'Biens et Clés', icon: Building, href: '/dashboard/properties', id: 'properties' },
    { name: 'Gestion des Clés', icon: Key, href: '/dashboard/key-management', id: 'key-management' },
    { name: 'Contacts', icon: BookUser, href: '/dashboard/contacts', id: 'contacts' },
  ];

  const adminMenuItems = [
    { name: 'Utilisateurs', icon: Users, href: '/dashboard/users', id: 'users' },
    { name: 'Statistiques', icon: BarChart3, href: '/dashboard/stats', id: 'stats' },
    { name: 'Annonces', icon: MessageSquare, href: '/dashboard/announcements', id: 'announcements' },
    { name: 'Configuration SMS', icon: MessageSquare, href: '/dashboard/sms-config', id: 'sms-config' },
    { name: 'Bons de Commande', icon: ShoppingCart, href: '/dashboard/purchase-orders', id: 'purchase-orders' },
    { name: 'Abonnement', icon: CreditCard, href: '/dashboard/subscription', id: 'subscription' },
    { name: 'Personnalisation', icon: Palette, href: '/dashboard/branding', id: 'branding' },
    { name: 'Ordre du Menu', icon: List, href: '/dashboard/menu-order', id: 'menu-order' },
    { name: 'Paramètres', icon: Settings, href: '/dashboard/settings', id: 'settings' },
  ];

  const superAdminMenuItems = [
    { name: 'Admin Site', icon: Shield, href: '/dashboard/superadmin', id: 'superadmin' },
    { name: 'Utilisateurs', icon: Users, href: '/dashboard/users', id: 'users' },
    { name: 'Contenu du Site', icon: FileEdit, href: '/dashboard/site-content', id: 'site-content' },
    { name: 'Gestion Blog', icon: FileText, href: '/dashboard/blog-management', id: 'blog-management' },
    { name: 'Bons de Commande', icon: ShoppingCart, href: '/dashboard/purchase-orders', id: 'purchase-orders' },
    { name: 'Gestion Plans', icon: Package, href: '/dashboard/plans-management', id: 'plans-management' },
    { name: 'Config Stripe', icon: CreditCard, href: '/dashboard/stripe-config', id: 'stripe-config' },
    { name: 'Chiffre d\'Affaires', icon: TrendingUp, href: '/dashboard/revenue', id: 'revenue' },
    { name: 'Personnalisation', icon: Palette, href: '/dashboard/branding', id: 'branding' },
  ];

  let menuItems = [];

  if (profile?.is_super_admin) {
    menuItems = [...superAdminMenuItems];
  } else {
    menuItems = [...baseMenuItems];
    if (profile?.role === 'ADMIN') {
      menuItems = [...menuItems, ...adminMenuItems];
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 px-4 py-3 flex items-center justify-between shadow-lg" style={{ backgroundColor: theme.sidebarBg }}>
        <div className="flex items-center space-x-2">
          {agencyLogo ? (
            <div className="bg-white rounded-lg p-1.5 flex items-center justify-center">
              <img
                src={agencyLogo}
                alt="Logo agence"
                className="h-8 object-contain"
              />
            </div>
          ) : (
            <div className="p-2 rounded-lg" style={{ backgroundColor: theme.primary }}>
              <Key className="w-5 h-5 text-white" />
            </div>
          )}
          <span className="text-lg font-bold" style={{ color: theme.sidebarText }}>
            {agencyName || 'KeyManager.io'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg transition-all flex flex-col gap-1 justify-center items-center w-10 h-10"
            style={{
              backgroundColor: mobileMenuOpen ? theme.primary : `${theme.primary}30`,
              border: `2px solid ${theme.primary}`
            }}
          >
          {(() => {
            const primaryRgb = theme.primary.startsWith('#') ? theme.primary : '#000000';
            const r = parseInt(primaryRgb.slice(1, 3), 16);
            const g = parseInt(primaryRgb.slice(3, 5), 16);
            const b = parseInt(primaryRgb.slice(5, 7), 16);
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            const iconColor = mobileMenuOpen ? (luminance > 0.5 ? '#1E293B' : '#F1F5F9') : theme.primary;

            return mobileMenuOpen ? (
              <X className="w-5 h-5" style={{ color: iconColor }} />
            ) : (
              <>
                <div className="w-6 h-0.5 rounded" style={{ backgroundColor: theme.primary }}></div>
                <div className="w-6 h-0.5 rounded" style={{ backgroundColor: theme.primary }}></div>
                <div className="w-6 h-0.5 rounded" style={{ backgroundColor: theme.primary }}></div>
              </>
            );
          })()}
          </button>
        </div>
      </div>

      <aside className={`w-64 sm:w-72 fixed h-full shadow-xl z-40 transition-transform duration-300 flex flex-col ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0`} style={{ backgroundColor: theme.sidebarBg }}>
        <div className="p-4 sm:p-6 flex-shrink-0">
          <div className="mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-slate-700">
            {agencyLogo ? (
              <div className="text-center">
                <div className="flex justify-center mb-2 bg-white rounded-lg p-2 sm:p-3">
                  <img
                    src={agencyLogo}
                    alt="Logo agence"
                    className="h-12 sm:h-16 object-contain"
                  />
                </div>
                <div className="text-xs font-medium uppercase tracking-wider hidden sm:block" style={{ color: `${theme.sidebarText}99` }}>Key Manager</div>
              </div>
            ) : (
              <div className="text-center">
                <div className="flex justify-center mb-2">
                  <div className="p-2 rounded-xl" style={{ backgroundColor: theme.primary }}>
                    <Key className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                  </div>
                </div>
                <span className="text-base sm:text-lg font-bold hidden sm:inline" style={{ color: theme.sidebarText }}>KeyManager.io</span>
              </div>
            )}

            <button
              onClick={handleClearCache}
              disabled={clearingCache}
              className="mt-3 w-full flex items-center justify-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 rounded-lg transition-all duration-200 disabled:opacity-50"
              style={{
                backgroundColor: clearingCache ? `${theme.primary}40` : `${theme.primary}20`,
                color: `${theme.sidebarText}CC`
              }}
              onMouseEnter={(e) => {
                if (!clearingCache) {
                  e.currentTarget.style.backgroundColor = `${theme.primary}30`;
                  e.currentTarget.style.color = theme.sidebarText;
                }
              }}
              onMouseLeave={(e) => {
                if (!clearingCache) {
                  e.currentTarget.style.backgroundColor = `${theme.primary}20`;
                  e.currentTarget.style.color = `${theme.sidebarText}CC`;
                }
              }}
            >
              <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${clearingCache ? 'animate-spin' : ''}`} />
              <span className="text-xs font-medium hidden sm:inline">
                {clearingCache ? 'Vidage en cours...' : 'Vider le cache'}
              </span>
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 sm:px-6 pb-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;

            const getTextColor = () => {
              if (isActive) {
                const primaryRgb = theme.primary.startsWith('#') ? theme.primary : '#000000';
                const r = parseInt(primaryRgb.slice(1, 3), 16);
                const g = parseInt(primaryRgb.slice(3, 5), 16);
                const b = parseInt(primaryRgb.slice(5, 7), 16);
                const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                return luminance > 0.5 ? '#1E293B' : '#F1F5F9';
              }
              return theme.sidebarText || '#F1F5F9';
            };

            const textColor = getTextColor();

            return (
              <Link
                key={item.id}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-200"
                style={{
                  backgroundColor: isActive ? theme.primary : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = `${theme.primary}30`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <Icon className="w-5 h-5 flex-shrink-0" style={{ color: textColor }} />
                <span className="font-medium text-sm" style={{ color: textColor }}>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex-shrink-0 p-3 sm:p-6 backdrop-blur-sm border-t" style={{ backgroundColor: `${theme.sidebarBg}80`, borderColor: `${theme.sidebarText}20` }}>
          {isImpersonating && (
            <div className="mb-3 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg" style={{ backgroundColor: `${theme.accent}20`, border: `2px solid ${theme.accent}` }}>
              <p className="text-xs font-semibold mb-2 hidden sm:block" style={{ color: theme.accent }}>
                MODE IMPERSONATION
              </p>
              <button
                onClick={stopImpersonation}
                className="w-full py-2 px-2 sm:px-3 rounded-lg font-medium text-xs sm:text-sm transition-all"
                style={{ backgroundColor: theme.accent, color: 'white' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                <span className="hidden sm:inline">Retour Super Admin</span>
                <span className="sm:hidden">Retour SA</span>
              </button>
            </div>
          )}
          <div className="mb-3 px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg" style={{ backgroundColor: `${theme.sidebarText}05` }}>
            <p className="text-xs sm:text-sm font-semibold truncate" style={{ color: theme.sidebarText }}>
              {profile?.first_name} {profile?.last_name}
            </p>
            <p className="text-xs mt-0.5 truncate hidden sm:block" style={{ color: `${theme.sidebarText}99` }}>{profile?.email}</p>
            <div className="mt-2 inline-flex items-center px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: `${theme.accent}20`, border: `1px solid ${theme.accent}30`, color: theme.accent }}>
              {profile?.role}
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex items-center justify-center space-x-1 sm:space-x-2 transition-all duration-200 w-full py-2 sm:py-2.5 rounded-lg"
            style={{ color: `${theme.sidebarText}CC` }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = `${theme.primary}20`;
              e.currentTarget.style.color = theme.sidebarText;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = `${theme.sidebarText}CC`;
            }}
          >
            <LogOut className="w-4 h-4" />
            <span className="font-medium text-xs sm:text-sm hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      </aside>

      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <main className="md:ml-72 flex-1 p-3 sm:p-4 md:p-6 lg:p-8 pt-16 sm:pt-20 md:pt-8">
        {children}
      </main>
    </div>
  );
}
