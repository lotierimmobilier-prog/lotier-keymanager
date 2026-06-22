import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { DashboardLayout } from '../../components/DashboardLayout';
import { Building, Calendar, Info, AlertCircle, BookOpen, ArrowRight, TrendingUp, Save, Edit2, QrCode, Printer } from 'lucide-react';
import { formatKeyLimit } from '../../utils/constants';

interface AgencyInfo {
  id: string;
  name: string;
  address: string | null;
  max_keys: number;
  created_at: string;
  plan_name: string;
  plan_included_keys: number;
  plan_base_price: number;
  user_count: number;
  key_count: number;
  property_count: number;
  subscription_status: string;
  subscription_current_keys_limit: number;
  subscription_trial_end: string | null;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'information' | 'tutorial' | 'alert';
  created_at: string;
}

export function AgencyPage() {
  const { profile } = useAuth();
  const [agency, setAgency] = useState<AgencyInfo | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAddress, setEditingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.agency_id) {
      loadAgencyInfo();
      loadAnnouncements();
    }
  }, [profile]);

  async function loadAnnouncements() {
    if (!profile?.agency_id) return;

    try {
      const { data, error } = await supabase
        .from('agency_announcements')
        .select('*')
        .eq('agency_id', profile.agency_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error loading announcements:', error);
    }
  }

  function getTypeIcon(type: string) {
    switch (type) {
      case 'tutorial':
        return <BookOpen className="w-5 h-5" />;
      case 'alert':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  }

  function getTypeColor(type: string) {
    switch (type) {
      case 'tutorial':
        return 'bg-blue-100 text-blue-700';
      case 'alert':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-green-100 text-green-700';
    }
  }

  async function loadAgencyInfo() {
    if (!profile?.agency_id) return;

    try {
      const { data: agencyData, error: agencyError } = await supabase
        .from('agencies')
        .select(`
          id,
          name,
          address,
          max_keys,
          created_at,
          plans:plan_id (
            name,
            included_keys,
            base_price
          )
        `)
        .eq('id', profile.agency_id)
        .single();

      if (agencyError) throw agencyError;

      const { data: subscriptionData } = await supabase
        .from('subscriptions')
        .select('current_keys_limit, status, trial_end_at, plans:plan_id (name, included_keys, base_price)')
        .eq('agency_id', profile.agency_id)
        .maybeSingle();

      const { count: userCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('agency_id', profile.agency_id);

      const { count: keyCount } = await supabase
        .from('keys')
        .select('*', { count: 'exact', head: true })
        .eq('agency_id', profile.agency_id);

      const { count: propertyCount } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('agency_id', profile.agency_id);

      const hasActiveSubscription = subscriptionData && subscriptionData.status === 'active';
      const effectiveMaxKeys = hasActiveSubscription ? subscriptionData.current_keys_limit : agencyData.max_keys;
      const effectivePlan = hasActiveSubscription ? subscriptionData.plans : agencyData.plans;

      setAgency({
        id: agencyData.id,
        name: agencyData.name,
        address: agencyData.address,
        max_keys: effectiveMaxKeys,
        created_at: agencyData.created_at,
        plan_name: effectivePlan?.name || 'Aucun',
        plan_included_keys: effectivePlan?.included_keys || 0,
        plan_base_price: effectivePlan?.base_price || 0,
        user_count: userCount || 0,
        key_count: keyCount || 0,
        property_count: propertyCount || 0,
        subscription_status: subscriptionData?.status || 'active',
        subscription_current_keys_limit: subscriptionData?.current_keys_limit || agencyData.max_keys,
        subscription_trial_end: subscriptionData?.trial_end_at || null,
      });
    } catch (error) {
      console.error('Error loading agency info:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveAddress() {
    if (!profile?.agency_id) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('agencies')
        .update({ address: newAddress })
        .eq('id', profile.agency_id);

      if (error) throw error;

      setAgency(prev => prev ? { ...prev, address: newAddress } : null);
      setEditingAddress(false);
      alert('Adresse mise à jour avec succès');
    } catch (error) {
      console.error('Error updating address:', error);
      alert('Erreur lors de la mise à jour de l\'adresse');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout currentPage="agency">
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-600">Chargement...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!agency) {
    return (
      <DashboardLayout currentPage="agency">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
            <Building className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Agence non trouvée</h3>
            <p className="text-slate-600">Impossible de charger les informations de l'agence</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentPage="agency">
      <div className="max-w-7xl mx-auto px-4 sm:px-0">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">{agency.name}</h1>
          <p className="text-sm sm:text-base text-slate-600">
            {agency.address || 'Adresse non renseignée'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Informations générales</h2>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-slate-600 mb-1">Nom de l'agence</div>
                <div className="text-base font-medium text-slate-900">{agency.name}</div>
              </div>

              <div>
                <div className="text-sm text-slate-600 mb-1">Adresse</div>
                {profile?.role === 'ADMIN' && editingAddress ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Entrez l'adresse de l'agence"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveAddress}
                        disabled={saving}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm flex items-center"
                      >
                        <Save className="w-4 h-4 mr-1" />
                        {saving ? 'Enregistrement...' : 'Enregistrer'}
                      </button>
                      <button
                        onClick={() => {
                          setEditingAddress(false);
                          setNewAddress(agency.address || '');
                        }}
                        className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition text-sm"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="text-base font-medium text-slate-900">
                      {agency.address || 'Non renseignée'}
                    </div>
                    {profile?.role === 'ADMIN' && (
                      <button
                        onClick={() => {
                          setEditingAddress(true);
                          setNewAddress(agency.address || '');
                        }}
                        className="p-1 text-slate-400 hover:text-blue-600 transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div>
                <div className="text-sm text-slate-600 mb-1">Date de création</div>
                <div className="text-base font-medium text-slate-900 flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                  {new Date(agency.created_at).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </div>
              </div>
            </div>
          </div>

          {profile?.role === 'ADMIN' && (
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Abonnement</h2>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-slate-600 mb-1">Statut</div>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    agency.subscription_status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : agency.subscription_status === 'trialing'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {agency.subscription_status === 'active' ? 'Actif' :
                     agency.subscription_status === 'trialing' ? 'Période d\'essai' :
                     'Inactif'}
                  </span>
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-600 mb-1">Plan actuel</div>
                <div className="text-base font-medium text-slate-900">{agency.plan_name}</div>
              </div>

              <div>
                <div className="text-sm text-slate-600 mb-1">Clés incluses</div>
                <div className="text-base font-medium text-slate-900">
                  {agency.plan_included_keys} clés
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-600 mb-1">Prix de base</div>
                <div className="text-base font-medium text-slate-900">
                  {agency.plan_base_price} € / mois
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-600 mb-1">Limite actuelle</div>
                <div className="text-base font-medium text-slate-900">
                  {agency.subscription_current_keys_limit} clés maximum
                </div>
                {agency.subscription_current_keys_limit !== agency.plan_included_keys && (
                  <div className="text-xs text-amber-600 mt-1">
                    (Modifié par le super admin)
                  </div>
                )}
              </div>

              {agency.subscription_trial_end && (
                <div>
                  <div className="text-sm text-slate-600 mb-1">Fin de l'essai</div>
                  <div className="text-base font-medium text-slate-900">
                    {new Date(agency.subscription_trial_end).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
          )}
        </div>

        {announcements.length > 0 && (
          <div className="mt-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Informations de l'agence</h2>
            <div className="space-y-4">
              {announcements.map((announcement) => (
                <div key={announcement.id} className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg flex-shrink-0 ${getTypeColor(announcement.type)}`}>
                      {getTypeIcon(announcement.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">{announcement.title}</h3>
                      <p className="text-slate-600 whitespace-pre-wrap">{announcement.content}</p>
                      <p className="text-sm text-slate-400 mt-3">
                        {new Date(announcement.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {profile?.role === 'ADMIN' && (
          <div className="mt-8 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 rounded-3xl opacity-10 blur-2xl"></div>
            <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-1.5 shadow-2xl">
              <div className="bg-gradient-to-br from-white to-slate-50 rounded-[22px] p-10 text-center">
                <div className="max-w-3xl mx-auto">
                  <div className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-4">
                    Besoin de plus de clés ?
                  </div>
                  <h3 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 leading-tight">
                    Passez à un plan supérieur
                  </h3>
                  <p className="text-xl text-slate-600 leading-relaxed mb-8">
                    Gérez plus de clés, débloquez des fonctionnalités avancées et profitez de 7 jours d'essai gratuit
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <a
                      href="/dashboard/subscription"
                      className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold hover:from-blue-700 hover:to-blue-800 transition-all text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center"
                    >
                      <TrendingUp className="w-5 h-5 mr-2" />
                      Voir les plans disponibles
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </a>
                  </div>
                  <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-slate-600">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      7 jours d'essai gratuit
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      Sans engagement
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      Changement instantané
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Votre rôle</h3>
            <div className="flex items-center space-x-2">
              {profile?.role === 'ADMIN' && (
                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold">
                  Administrateur
                </span>
              )}
              {profile?.role === 'COLLAB' && (
                <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-semibold">
                  Collaborateur
                </span>
              )}
              {profile?.role === 'PRESTATAIRE' && (
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                  Prestataire
                </span>
              )}
              <span className="text-slate-600">
                {profile?.first_name} {profile?.last_name}
              </span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center mb-3">
              <QrCode className="w-6 h-6 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold text-slate-900">QR Codes</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Imprimez tous vos QR codes en une seule fois sur des planches d'étiquettes
            </p>
            <a
              href="/dashboard/qr-codes-print"
              className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <Printer className="w-4 h-4" />
              <span>Impression en masse</span>
            </a>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
