import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ModalProvider } from './contexts/ModalContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { HomePage } from './pages/HomePage';
import { FeaturesPage } from './pages/FeaturesPage';
import { PricingPage } from './pages/PricingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { AgencyPage } from './pages/dashboard/AgencyPage';
import { PropertiesPage } from './pages/dashboard/PropertiesPage';
import { KeysPage } from './pages/dashboard/KeysPage';
import { MovementsPage } from './pages/dashboard/MovementsPage';
import { ContactsPage } from './pages/dashboard/ContactsPage';
import { UsersPage } from './pages/dashboard/UsersPage';
import { SettingsPage } from './pages/dashboard/SettingsPage';
import { SubscriptionPage } from './pages/dashboard/SubscriptionPage';
import { SuperAdminPage } from './pages/dashboard/SuperAdminPage';
import { BrandingPage } from './pages/dashboard/BrandingPage';
import { BrandedLoginPage } from './pages/BrandedLoginPage';
import { AnnouncementsPage } from './pages/dashboard/AnnouncementsPage';
import { SmsConfigPage } from './pages/dashboard/SmsConfigPage';
import { EmailConfigPage } from './pages/dashboard/EmailConfigPage';
import { StatsPage } from './pages/dashboard/StatsPage';
import { KeysTrackerPage } from './pages/dashboard/KeysTrackerPage';
import { KeyManagementPage } from './pages/dashboard/KeyManagementPage';
import { RevenuePage } from './pages/dashboard/RevenuePage';
import { PurchaseOrdersPage } from './pages/dashboard/PurchaseOrdersPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { PlansManagementPage } from './pages/dashboard/PlansManagementPage';
import { StripeConfigPage } from './pages/dashboard/StripeConfigPage';
import { BlogManagementPage } from './pages/dashboard/BlogManagementPage';
import { BlogPage } from './pages/BlogPage';
import { BlogArticlePage } from './pages/BlogArticlePage';
import { ProfilePage } from './pages/dashboard/ProfilePage';
import SiteContentPage from './pages/dashboard/SiteContentPage';
import MenuOrderPage from './pages/dashboard/MenuOrderPage';
import { QrScanPage } from './pages/QrScanPage';
import { PropertyQrScanPage } from './pages/PropertyQrScanPage';
import { QrCodesPrintPage } from './pages/dashboard/QrCodesPrintPage';

function Router() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [showForceReload, setShowForceReload] = useState(false);

  useEffect(() => {
    if (loading) {
      const forceReloadTimer = setTimeout(() => {
        setShowForceReload(true);
      }, 8000);

      return () => clearTimeout(forceReloadTimer);
    } else {
      setShowForceReload(false);
    }
  }, [loading]);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handleLocationChange);

    const originalPushState = window.history.pushState;
    window.history.pushState = function(...args) {
      originalPushState.apply(window.history, args);
      handleLocationChange();
    };

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.history.pushState = originalPushState;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="absolute top-4 right-4">
          <LanguageSwitcher />
        </div>
        <div className="flex flex-col items-center space-y-4 max-w-md px-6">
          <div className="relative">
            <div className="animate-pulse">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-amber-700 rounded-2xl flex items-center justify-center shadow-xl">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"></path>
                  <path d="m21 2-9.6 9.6"></path>
                  <circle cx="7.5" cy="15.5" r="5.5"></circle>
                </svg>
              </div>
            </div>
          </div>
          <div className="text-slate-600 text-lg font-semibold">{t('loading.connecting')}</div>
          <div className="text-slate-400 text-sm text-center">
            {t('loading.session')}
          </div>
          {showForceReload && (
            <>
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="text-amber-800 text-sm text-center font-medium mb-2">
                  {t('error.connection')}
                </div>
                <div className="text-amber-700 text-xs text-center mb-3">
                  {t('error.check-internet')}
                </div>
                <button
                  onClick={() => {
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.reload();
                  }}
                  className="w-full px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium shadow-sm"
                >
                  {t('action.clear-cache')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (user && (currentPath === '/login' || currentPath === '/signup')) {
    window.history.pushState({}, '', '/dashboard');
    setCurrentPath('/dashboard');
  }

  if (!user && currentPath.startsWith('/dashboard')) {
    window.history.pushState({}, '', '/login');
    setCurrentPath('/login');
  }

  if (currentPath.startsWith('/login/')) {
    return <BrandedLoginPage />;
  }

  if (currentPath.startsWith('/blog/')) {
    const slug = currentPath.replace('/blog/', '');
    return <BlogArticlePage slug={slug} />;
  }

  if (currentPath.startsWith('/qr/')) {
    return <QrScanPage />;
  }

  if (currentPath.startsWith('/property-qr/')) {
    return <PropertyQrScanPage />;
  }

  switch (currentPath) {
    case '/':
      return <HomePage />;
    case '/features':
      return <FeaturesPage />;
    case '/pricing':
      return <PricingPage />;
    case '/login':
      return <LoginPage />;
    case '/signup':
      return <SignupPage />;
    case '/dashboard':
      return <DashboardPage />;
    case '/dashboard/agency':
      return <AgencyPage />;
    case '/dashboard/properties':
      return <PropertiesPage />;
    case '/dashboard/keys':
      return <KeysPage />;
    case '/dashboard/movements':
      return <MovementsPage />;
    case '/dashboard/contacts':
      return <ContactsPage />;
    case '/dashboard/users':
      return <UsersPage />;
    case '/dashboard/settings':
      return <SettingsPage />;
    case '/dashboard/subscription':
      return <SubscriptionPage />;
    case '/dashboard/superadmin':
      return <SuperAdminPage />;
    case '/dashboard/branding':
      return <BrandingPage />;
    case '/dashboard/announcements':
      return <AnnouncementsPage />;
    case '/dashboard/sms-config':
      return <SmsConfigPage />;
    case '/dashboard/email-config':
      return <EmailConfigPage />;
    case '/dashboard/stats':
      return <StatsPage />;
    case '/dashboard/keys-tracker':
      return <KeysTrackerPage />;
    case '/dashboard/key-management':
      return <KeyManagementPage />;
    case '/dashboard/revenue':
      return <RevenuePage />;
    case '/dashboard/purchase-orders':
      return <PurchaseOrdersPage />;
    case '/checkout':
      return <CheckoutPage />;
    case '/dashboard/plans-management':
      return <PlansManagementPage />;
    case '/dashboard/stripe-config':
      return <StripeConfigPage />;
    case '/dashboard/blog-management':
      return <BlogManagementPage />;
    case '/dashboard/site-content':
      return <SiteContentPage />;
    case '/dashboard/profile':
      return <ProfilePage />;
    case '/dashboard/menu-order':
      return <MenuOrderPage />;
    case '/dashboard/qr-codes-print':
      return <QrCodesPrintPage />;
    case '/blog':
      return <BlogPage />;
    default:
      return <HomePage />;
  }
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ThemeProvider>
          <ModalProvider>
            <Router />
          </ModalProvider>
        </ThemeProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
