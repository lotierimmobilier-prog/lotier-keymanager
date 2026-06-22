import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { DashboardLayout } from '../../components/DashboardLayout';
import { Shield, Ban, CheckCircle, XCircle, Building, CreditCard, Users as UsersIcon, FileText, Plus, Edit2, Trash2, AlertCircle, MessageSquare, Send } from 'lucide-react';
import { isUnlimited, formatKeyLimit } from '../../utils/constants';

interface Agency {
  id: string;
  name: string;
  created_at: string;
  user_count: number;
  key_count: number;
  plan_id: string | null;
  plan_name: string;
  max_keys: number;
}

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_banned: boolean;
  ban_reason: string | null;
  banned_at: string | null;
  agency_id: string;
  agency_name: string;
  created_at: string;
}

interface Subscription {
  id: string;
  agency_id: string;
  agency_name: string;
  plan_id: string;
  plan_name: string;
  status: string;
  payment_status: string;
  current_keys_limit: number;
  created_at: string;
  last_payment_date: string | null;
  next_payment_date: string | null;
}

interface Plan {
  id: string;
  name: string;
  included_keys: number;
  base_price: string;
}

interface DashboardContent {
  id: string;
  content_type: string;
  title: string;
  content: string;
  icon: string;
  color: string;
  is_active: boolean;
  display_order: number;
}

type TabType = 'agencies' | 'users' | 'subscriptions' | 'content' | 'sms-test';

export function SuperAdminPage() {
  const { profile, impersonateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('agencies');
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [contentBlocks, setContentBlocks] = useState<DashboardContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingContent, setEditingContent] = useState<DashboardContent | null>(null);
  const [showContentForm, setShowContentForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showUserEditModal, setShowUserEditModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [banUserId, setBanUserId] = useState<string | null>(null);
  const [banReason, setBanReason] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [editingAgency, setEditingAgency] = useState<Agency | null>(null);
  const [showAgencyPlanModal, setShowAgencyPlanModal] = useState(false);

  useEffect(() => {
    if (profile?.is_super_admin) {
      loadData();
      loadPlans();
    }
  }, [profile, activeTab]);

  async function loadData() {
    setLoading(true);
    try {
      if (activeTab === 'agencies') {
        await loadAgencies();
      } else if (activeTab === 'users') {
        await loadUsers();
      } else if (activeTab === 'subscriptions') {
        await loadSubscriptions();
      } else if (activeTab === 'content') {
        await loadContent();
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadAgencies() {
    const { data: agenciesData, error } = await supabase
      .from('agencies')
      .select(`
        id,
        name,
        created_at,
        plan_id,
        max_keys,
        plans:plan_id (name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const agenciesWithCounts = await Promise.all(
      (agenciesData || []).map(async (agency: any) => {
        const { count: userCount } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('agency_id', agency.id);

        const { count: keyCount } = await supabase
          .from('keys')
          .select('*', { count: 'exact', head: true })
          .eq('agency_id', agency.id);

        return {
          ...agency,
          plan_name: agency.plans?.name || 'Aucun',
          user_count: userCount || 0,
          key_count: keyCount || 0,
        };
      })
    );

    setAgencies(agenciesWithCounts);
  }

  async function loadUsers() {
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        first_name,
        last_name,
        role,
        is_banned,
        ban_reason,
        banned_at,
        agency_id,
        created_at,
        agencies:agency_id (name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    setUsers(
      (data || []).map((user: any) => ({
        ...user,
        agency_name: user.agencies?.name || 'N/A',
      }))
    );
  }

  async function loadSubscriptions() {
    const { data, error } = await supabase
      .from('subscriptions')
      .select(`
        id,
        agency_id,
        plan_id,
        status,
        payment_status,
        current_keys_limit,
        created_at,
        last_payment_date,
        next_payment_date,
        agencies:agency_id (name),
        plans:plan_id (name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    setSubscriptions(
      (data || []).map((sub: any) => ({
        ...sub,
        agency_name: sub.agencies?.name || 'N/A',
        plan_name: sub.plans?.name || 'N/A',
      }))
    );
  }

  async function loadPlans() {
    const { data, error } = await supabase
      .from('plans')
      .select('id, name, included_keys, base_price')
      .order('included_keys', { ascending: true });

    if (error) {
      console.error('Error loading plans:', error);
      return;
    }

    setPlans(data || []);
  }

  async function handleBanUser(userId: string, currentBanStatus: boolean) {
    if (currentBanStatus) {
      if (!confirm('Êtes-vous sûr de vouloir débannir cet utilisateur ?')) return;

      try {
        const { error } = await supabase
          .from('users')
          .update({
            is_banned: false,
            ban_reason: null,
            banned_at: null,
            banned_by: null
          })
          .eq('id', userId);

        if (error) throw error;
        alert('Utilisateur débanni avec succès');
        loadUsers();
      } catch (error) {
        console.error('Error unbanning user:', error);
        alert('Erreur lors du débannissement');
      }
    } else {
      setBanUserId(userId);
      setBanReason('');
      setShowBanModal(true);
    }
  }

  async function handleUpdateAgencyPlan(planId: string, maxKeys: number) {
    if (!editingAgency) return;

    try {
      const { error } = await supabase
        .from('agencies')
        .update({
          plan_id: planId || null,
          max_keys: maxKeys
        })
        .eq('id', editingAgency.id);

      if (error) throw error;

      alert('Plan mis à jour avec succès');
      setShowAgencyPlanModal(false);
      setEditingAgency(null);
      loadAgencies();
    } catch (error) {
      console.error('Error updating agency plan:', error);
      alert('Erreur lors de la mise à jour du plan');
    }
  }

  async function confirmBanUser() {
    if (!banUserId || !banReason.trim()) {
      alert('Veuillez indiquer la raison du bannissement');
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({
          is_banned: true,
          ban_reason: banReason,
          banned_at: new Date().toISOString(),
          banned_by: profile?.id
        })
        .eq('id', banUserId);

      if (error) throw error;

      alert('Utilisateur banni avec succès');
      setShowBanModal(false);
      setBanUserId(null);
      setBanReason('');
      loadUsers();
    } catch (error) {
      console.error('Error banning user:', error);
      alert('Erreur lors du bannissement');
    }
  }

  async function handleDeleteUser(userId: string, userName: string) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer définitivement l'utilisateur ${userName} ? Cette action est irréversible.`)) return;

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      alert('Utilisateur supprimé avec succès');
      loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Erreur lors de la suppression');
    }
  }

  async function handleUpdateUser(userData: Partial<User>) {
    if (!editingUser) return;

    try {
      const { error } = await supabase
        .from('users')
        .update(userData)
        .eq('id', editingUser.id);

      if (error) throw error;

      alert('Utilisateur mis à jour avec succès');
      setShowUserEditModal(false);
      setEditingUser(null);
      loadUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Erreur lors de la mise à jour');
    }
  }

  async function handleImpersonateUser(userId: string, userName: string) {
    if (!confirm(`Voulez-vous prendre le contrôle du compte de ${userName} ?`)) return;

    const { error } = await impersonateUser(userId);
    if (error) {
      alert('Erreur lors de la prise de contrôle: ' + error.message);
    } else {
      window.history.pushState({}, '', '/dashboard');
      window.location.reload();
    }
  }

  async function handleUpdatePaymentStatus(subscriptionId: string, newStatus: string) {
    try {
      const updates: any = { payment_status: newStatus };

      if (newStatus === 'paid') {
        updates.last_payment_date = new Date().toISOString();
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        updates.next_payment_date = nextMonth.toISOString();
      }

      const { error } = await supabase
        .from('subscriptions')
        .update(updates)
        .eq('id', subscriptionId);

      if (error) throw error;

      alert('Statut de paiement mis à jour avec succès');
      loadSubscriptions();
    } catch (error) {
      console.error('Error updating payment status:', error);
      alert('Erreur lors de la mise à jour du statut de paiement');
    }
  }

  async function handleUpdateSubscription(subscriptionData: { plan_id: string; current_keys_limit: number; status: string }) {
    if (!editingSubscription) return;

    try {
      const { error: subError } = await supabase
        .from('subscriptions')
        .update(subscriptionData)
        .eq('id', editingSubscription.id);

      if (subError) throw subError;

      const { error: agencyError } = await supabase
        .from('agencies')
        .update({
          max_keys: subscriptionData.current_keys_limit,
          plan_id: subscriptionData.plan_id,
        })
        .eq('id', editingSubscription.agency_id);

      if (agencyError) throw agencyError;

      alert('Abonnement mis à jour avec succès');
      setShowSubscriptionModal(false);
      setEditingSubscription(null);
      loadSubscriptions();
      loadAgencies();
    } catch (error) {
      console.error('Error updating subscription:', error);
      alert('Erreur lors de la mise à jour de l\'abonnement');
    }
  }

  async function loadContent() {
    const { data, error } = await supabase
      .from('dashboard_content')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;
    setContentBlocks(data || []);
  }

  async function handleSaveContent(content: Partial<DashboardContent>) {
    try {
      if (editingContent?.id) {
        const { error } = await supabase
          .from('dashboard_content')
          .update({ ...content, updated_at: new Date().toISOString() })
          .eq('id', editingContent.id);

        if (error) throw error;
        alert('Contenu mis à jour avec succès');
      } else {
        const { error } = await supabase
          .from('dashboard_content')
          .insert(content);

        if (error) throw error;
        alert('Contenu créé avec succès');
      }

      setShowContentForm(false);
      setEditingContent(null);
      loadContent();
    } catch (error) {
      console.error('Error saving content:', error);
      alert('Erreur lors de la sauvegarde du contenu');
    }
  }

  async function handleDeleteContent(contentId: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce contenu ?')) return;

    try {
      const { error } = await supabase
        .from('dashboard_content')
        .delete()
        .eq('id', contentId);

      if (error) throw error;
      alert('Contenu supprimé avec succès');
      loadContent();
    } catch (error) {
      console.error('Error deleting content:', error);
      alert('Erreur lors de la suppression du contenu');
    }
  }

  async function handleToggleActive(contentId: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from('dashboard_content')
        .update({ is_active: !currentStatus })
        .eq('id', contentId);

      if (error) throw error;
      loadContent();
    } catch (error) {
      console.error('Error toggling active status:', error);
      alert('Erreur lors de la mise à jour du statut');
    }
  }

  if (!profile?.is_super_admin) {
    return (
      <DashboardLayout currentPage="superadmin">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
            <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Accès refusé</h3>
            <p className="text-slate-600">Cette page est réservée aux super administrateurs</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentPage="superadmin">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center space-x-3">
            <Shield className="w-8 h-8 text-red-600" />
            <span>Administration Générale</span>
          </h1>
          <p className="text-slate-600">Gestion de toutes les agences du site</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6">
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('agencies')}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition ${
                activeTab === 'agencies'
                  ? 'text-amber-700 border-b-2 border-amber-700 bg-amber-50'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building className="w-5 h-5 inline mr-2" />
              Agences
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition ${
                activeTab === 'users'
                  ? 'text-amber-700 border-b-2 border-amber-700 bg-amber-50'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UsersIcon className="w-5 h-5 inline mr-2" />
              Utilisateurs
            </button>
            <button
              onClick={() => setActiveTab('subscriptions')}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition ${
                activeTab === 'subscriptions'
                  ? 'text-amber-700 border-b-2 border-amber-700 bg-amber-50'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-5 h-5 inline mr-2" />
              Abonnements
            </button>
            <button
              onClick={() => setActiveTab('content')}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition ${
                activeTab === 'content'
                  ? 'text-amber-700 border-b-2 border-amber-700 bg-amber-50'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-5 h-5 inline mr-2" />
              Contenu Dashboard
            </button>
            <button
              onClick={() => setActiveTab('sms-test')}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition ${
                activeTab === 'sms-test'
                  ? 'text-amber-700 border-b-2 border-amber-700 bg-amber-50'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-5 h-5 inline mr-2" />
              Test SMS
            </button>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-12 text-slate-600">Chargement...</div>
            ) : (
              <>
                {activeTab === 'agencies' && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="text-left px-4 py-3 text-sm font-semibold text-slate-900">Agence</th>
                          <th className="text-left px-4 py-3 text-sm font-semibold text-slate-900">Plan</th>
                          <th className="text-left px-4 py-3 text-sm font-semibold text-slate-900">Limite clés</th>
                          <th className="text-left px-4 py-3 text-sm font-semibold text-slate-900">Utilisateurs</th>
                          <th className="text-left px-4 py-3 text-sm font-semibold text-slate-900">Clés actives</th>
                          <th className="text-left px-4 py-3 text-sm font-semibold text-slate-900">Date création</th>
                          <th className="text-right px-4 py-3 text-sm font-semibold text-slate-900">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {agencies.map((agency) => (
                          <tr key={agency.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-sm font-medium text-slate-900">{agency.name}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-semibold">
                                {agency.plan_name}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">{isUnlimited(agency.max_keys) ? 'Illimité' : `${agency.max_keys} clés`}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{agency.user_count}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              <span className={!isUnlimited(agency.max_keys) && agency.key_count >= agency.max_keys ? 'text-red-600 font-semibold' : ''}>
                                {agency.key_count} / {formatKeyLimit(agency.max_keys)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {new Date(agency.created_at).toLocaleDateString('fr-FR')}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => {
                                  setEditingAgency(agency);
                                  setShowAgencyPlanModal(true);
                                }}
                                className="text-amber-600 hover:text-amber-700 font-semibold text-sm"
                              >
                                <Edit2 className="w-4 h-4 inline mr-1" />
                                Modifier plan
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === 'users' && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="text-left px-4 py-3 text-sm font-semibold text-slate-900">Utilisateur</th>
                          <th className="text-left px-4 py-3 text-sm font-semibold text-slate-900">Email</th>
                          <th className="text-left px-4 py-3 text-sm font-semibold text-slate-900">Agence</th>
                          <th className="text-left px-4 py-3 text-sm font-semibold text-slate-900">Rôle</th>
                          <th className="text-left px-4 py-3 text-sm font-semibold text-slate-900">Statut</th>
                          <th className="text-right px-4 py-3 text-sm font-semibold text-slate-900">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {users.map((user) => (
                          <tr key={user.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-sm font-medium text-slate-900">
                              {user.first_name} {user.last_name}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">{user.email}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{user.agency_name}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                                {user.role}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {user.is_banned ? (
                                <div>
                                  <span className="flex items-center text-red-600">
                                    <XCircle className="w-4 h-4 mr-1" />
                                    Banni
                                  </span>
                                  {user.ban_reason && (
                                    <span className="text-xs text-slate-500 mt-1 block">
                                      {user.ban_reason}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="flex items-center text-green-600">
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Actif
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => handleImpersonateUser(user.id, `${user.first_name} ${user.last_name}`)}
                                  className="px-3 py-1 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded text-xs font-semibold transition"
                                  title="Prendre le contrôle"
                                >
                                  Se connecter
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingUser(user);
                                    setShowUserEditModal(true);
                                  }}
                                  className="p-2 hover:bg-blue-50 rounded transition"
                                  title="Modifier"
                                >
                                  <Edit2 className="w-4 h-4 text-blue-600" />
                                </button>
                                <button
                                  onClick={() => handleBanUser(user.id, user.is_banned)}
                                  className={`px-3 py-1 rounded text-xs font-semibold transition ${
                                    user.is_banned
                                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                                  }`}
                                  title={user.is_banned ? 'Débannir' : 'Bannir'}
                                >
                                  {user.is_banned ? 'Débannir' : 'Bannir'}
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(user.id, `${user.first_name} ${user.last_name}`)}
                                  className="p-2 hover:bg-red-50 rounded transition"
                                  title="Supprimer"
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === 'subscriptions' && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="text-left px-4 py-3 text-sm font-semibold text-slate-900">Agence</th>
                          <th className="text-left px-4 py-3 text-sm font-semibold text-slate-900">Plan</th>
                          <th className="text-left px-4 py-3 text-sm font-semibold text-slate-900">Limite clés</th>
                          <th className="text-left px-4 py-3 text-sm font-semibold text-slate-900">Statut</th>
                          <th className="text-left px-4 py-3 text-sm font-semibold text-slate-900">Paiement</th>
                          <th className="text-left px-4 py-3 text-sm font-semibold text-slate-900">Prochain paiement</th>
                          <th className="text-right px-4 py-3 text-sm font-semibold text-slate-900">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {subscriptions.map((sub) => (
                          <tr key={sub.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-sm font-medium text-slate-900">{sub.agency_name}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{sub.plan_name}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{sub.current_keys_limit}</td>
                            <td className="px-4 py-3 text-sm">
                              <span
                                className={`px-2 py-1 rounded text-xs font-semibold ${
                                  sub.status === 'active'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {sub.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span
                                className={`px-2 py-1 rounded text-xs font-semibold ${
                                  sub.payment_status === 'paid'
                                    ? 'bg-green-100 text-green-700'
                                    : sub.payment_status === 'failed'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}
                              >
                                {sub.payment_status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {sub.next_payment_date
                                ? new Date(sub.next_payment_date).toLocaleDateString('fr-FR')
                                : 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={() => {
                                    setEditingSubscription(sub);
                                    setShowSubscriptionModal(true);
                                  }}
                                  className="p-2 hover:bg-blue-50 rounded transition"
                                  title="Modifier l'abonnement"
                                >
                                  <Edit2 className="w-4 h-4 text-blue-600" />
                                </button>
                                <select
                                  value={sub.payment_status}
                                  onChange={(e) => handleUpdatePaymentStatus(sub.id, e.target.value)}
                                  className="text-xs border border-slate-300 rounded px-2 py-1"
                                  title="Statut de paiement"
                                >
                                  <option value="pending">En attente</option>
                                  <option value="paid">Payé</option>
                                  <option value="failed">Échoué</option>
                                  <option value="cancelled">Annulé</option>
                                </select>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeTab === 'sms-test' && (
                  <div className="max-w-2xl mx-auto">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 mb-6 border border-blue-200">
                      <div className="flex items-start space-x-3">
                        <MessageSquare className="w-6 h-6 text-blue-600 mt-1" />
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900 mb-2">Test d'envoi SMS</h3>
                          <p className="text-sm text-slate-600 mb-2">
                            Cette page vous permet de tester la configuration SMS OVH de votre système.
                          </p>
                          <p className="text-xs text-slate-500">
                            Assurez-vous d'avoir configuré les variables d'environnement OVH dans Supabase.
                          </p>
                        </div>
                      </div>
                    </div>

                    {testResult && (
                      <div
                        className={`mb-6 p-4 rounded-lg border ${
                          testResult.success
                            ? 'bg-green-50 border-green-200'
                            : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          {testResult.success ? (
                            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                          )}
                          <div>
                            <h4
                              className={`font-semibold mb-1 ${
                                testResult.success ? 'text-green-900' : 'text-red-900'
                              }`}
                            >
                              {testResult.success ? 'SMS envoyé avec succès !' : 'Erreur lors de l\'envoi'}
                            </h4>
                            <p
                              className={`text-sm ${
                                testResult.success ? 'text-green-700' : 'text-red-700'
                              }`}
                            >
                              {testResult.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="bg-white rounded-lg border border-slate-200 p-6">
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          setSendingTest(true);
                          setTestResult(null);

                          try {
                            const { data: { session } } = await supabase.auth.getSession();
                            if (!session) throw new Error('Non authentifié');

                            const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-sms`;
                            const response = await fetch(apiUrl, {
                              method: 'POST',
                              headers: {
                                'Authorization': `Bearer ${session.access_token}`,
                                'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({
                                to: testPhone,
                                message: testMessage,
                                agencyId: profile?.agency_id || '',
                                type: 'key_taken',
                              }),
                            });

                            const result = await response.json();

                            if (result.success) {
                              setTestResult({
                                success: true,
                                message: 'Le SMS a été envoyé avec succès. Vérifiez votre téléphone.',
                              });
                              setTestPhone('');
                              setTestMessage('');
                            } else {
                              setTestResult({
                                success: false,
                                message: result.error || 'Erreur inconnue lors de l\'envoi du SMS.',
                              });
                            }
                          } catch (error: any) {
                            setTestResult({
                              success: false,
                              message: `Erreur: ${error.message}`,
                            });
                          } finally {
                            setSendingTest(false);
                          }
                        }}
                        className="space-y-6"
                      >
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Numéro de téléphone *
                          </label>
                          <input
                            type="tel"
                            value={testPhone}
                            onChange={(e) => setTestPhone(e.target.value)}
                            placeholder="06 12 34 56 78 ou +33612345678"
                            required
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          <p className="text-xs text-slate-500 mt-1">
                            Formats acceptés : 06 12 34 56 78, 0612345678, +33612345678
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Message *
                          </label>
                          <textarea
                            value={testMessage}
                            onChange={(e) => setTestMessage(e.target.value)}
                            placeholder="Entrez votre message de test..."
                            required
                            rows={5}
                            maxLength={160}
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          <p className="text-xs text-slate-500 mt-1">
                            {testMessage.length}/160 caractères
                          </p>
                        </div>

                        <button
                          type="submit"
                          disabled={sendingTest || !testPhone || !testMessage}
                          className="w-full flex items-center justify-center space-x-2 bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {sendingTest ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Envoi en cours...</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-5 h-5" />
                              <span>Envoyer le SMS de test</span>
                            </>
                          )}
                        </button>
                      </form>
                    </div>

                    <div className="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <h4 className="font-semibold text-blue-900 mb-2 text-sm">Configuration requise</h4>
                      <ul className="text-xs text-blue-800 space-y-1">
                        <li>• OVH_APP_KEY : Clé d'application OVH</li>
                        <li>• OVH_APP_SECRET : Secret d'application OVH</li>
                        <li>• OVH_CONSUMER_KEY : Clé consommateur OVH</li>
                        <li>• OVH_SMS_ACCOUNT : Compte SMS (ex: sms-ab12345-1)</li>
                        <li>• OVH_SMS_SENDER : Expéditeur (ex: KeyManager)</li>
                      </ul>
                    </div>
                  </div>
                )}

                {activeTab === 'content' && (
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-semibold text-slate-900">Gestion du contenu du dashboard</h3>
                      <button
                        onClick={() => {
                          setEditingContent(null);
                          setShowContentForm(true);
                        }}
                        className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary transition"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Ajouter contenu</span>
                      </button>
                    </div>

                    {showContentForm && (
                      <div className="bg-slate-50 rounded-lg p-6 mb-6 border border-slate-200">
                        <h4 className="text-md font-semibold text-slate-900 mb-4">
                          {editingContent ? 'Modifier le contenu' : 'Nouveau contenu'}
                        </h4>
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            handleSaveContent({
                              content_type: formData.get('content_type') as string,
                              title: formData.get('title') as string,
                              content: formData.get('content') as string,
                              icon: formData.get('icon') as string,
                              color: formData.get('color') as string,
                              display_order: parseInt(formData.get('display_order') as string),
                              is_active: formData.get('is_active') === 'on',
                            });
                          }}
                        >
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Titre</label>
                              <input
                                type="text"
                                name="title"
                                defaultValue={editingContent?.title || ''}
                                required
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                              <select
                                name="content_type"
                                defaultValue={editingContent?.content_type || 'tip'}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                              >
                                <option value="welcome">Bienvenue</option>
                                <option value="tip">Conseil</option>
                                <option value="announcement">Annonce</option>
                                <option value="guide">Guide</option>
                              </select>
                            </div>
                          </div>
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Contenu</label>
                            <textarea
                              name="content"
                              defaultValue={editingContent?.content || ''}
                              required
                              rows={4}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-4 mb-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Icône</label>
                              <select
                                name="icon"
                                defaultValue={editingContent?.icon || 'Info'}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                              >
                                <option value="Home">Home</option>
                                <option value="BookOpen">BookOpen</option>
                                <option value="Lightbulb">Lightbulb</option>
                                <option value="Bell">Bell</option>
                                <option value="Info">Info</option>
                                <option value="Key">Key</option>
                                <option value="Building">Building</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Couleur</label>
                              <select
                                name="color"
                                defaultValue={editingContent?.color || 'blue'}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                              >
                                <option value="blue">Bleu</option>
                                <option value="green">Vert</option>
                                <option value="amber">Ambre</option>
                                <option value="red">Rouge</option>
                                <option value="slate">Gris</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">Ordre</label>
                              <input
                                type="number"
                                name="display_order"
                                defaultValue={editingContent?.display_order || 0}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                              />
                            </div>
                          </div>
                          <div className="mb-4">
                            <label className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                name="is_active"
                                defaultChecked={editingContent?.is_active !== false}
                                className="rounded"
                              />
                              <span className="text-sm font-medium text-slate-700">Actif</span>
                            </label>
                          </div>
                          <div className="flex space-x-3">
                            <button
                              type="submit"
                              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary transition"
                            >
                              Enregistrer
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowContentForm(false);
                                setEditingContent(null);
                              }}
                              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
                            >
                              Annuler
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    <div className="space-y-4">
                      {contentBlocks.map((block) => (
                        <div
                          key={block.id}
                          className="bg-white border border-slate-200 rounded-lg p-4 flex items-start justify-between"
                        >
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="text-md font-semibold text-slate-900">{block.title}</h4>
                              <span
                                className={`px-2 py-1 rounded text-xs font-semibold ${
                                  block.is_active
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {block.is_active ? 'Actif' : 'Inactif'}
                              </span>
                              <span className="text-xs text-slate-500">
                                {block.content_type} • {block.color} • Ordre: {block.display_order}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 mb-2">{block.content.substring(0, 100)}...</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleToggleActive(block.id, block.is_active)}
                              className="p-2 hover:bg-slate-100 rounded transition"
                              title={block.is_active ? 'Désactiver' : 'Activer'}
                            >
                              {block.is_active ? (
                                <XCircle className="w-5 h-5 text-slate-600" />
                              ) : (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setEditingContent(block);
                                setShowContentForm(true);
                              }}
                              className="p-2 hover:bg-slate-100 rounded transition"
                              title="Modifier"
                            >
                              <Edit2 className="w-5 h-5 text-blue-600" />
                            </button>
                            <button
                              onClick={() => handleDeleteContent(block.id)}
                              className="p-2 hover:bg-slate-100 rounded transition"
                              title="Supprimer"
                            >
                              <Trash2 className="w-5 h-5 text-red-600" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {showUserEditModal && editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Modifier l'utilisateur</h2>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleUpdateUser({
                    first_name: formData.get('first_name') as string,
                    last_name: formData.get('last_name') as string,
                    email: formData.get('email') as string,
                    role: formData.get('role') as string,
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Prénom</label>
                  <input
                    type="text"
                    name="first_name"
                    defaultValue={editingUser.first_name}
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nom</label>
                  <input
                    type="text"
                    name="last_name"
                    defaultValue={editingUser.last_name}
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={editingUser.email}
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Rôle</label>
                  <select
                    name="role"
                    defaultValue={editingUser.role}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="ADMIN">Administrateur</option>
                    <option value="COLLAB">Collaborateur</option>
                    <option value="PRESTATAIRE">Prestataire</option>
                  </select>
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserEditModal(false);
                      setEditingUser(null);
                    }}
                    className="flex-1 bg-slate-100 text-slate-700 px-6 py-3 rounded-lg hover:bg-slate-200 transition"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-primary text-white px-6 py-3 rounded-lg hover:bg-secondary transition"
                  >
                    Enregistrer
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showBanModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-8 max-w-md w-full">
              <div className="flex items-center space-x-3 mb-6">
                <AlertCircle className="w-8 h-8 text-red-600" />
                <h2 className="text-2xl font-bold text-slate-900">Bannir l'utilisateur</h2>
              </div>

              <p className="text-slate-600 mb-6">
                Veuillez indiquer la raison du bannissement. L'utilisateur ne pourra plus se connecter.
              </p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">Raison du bannissement *</label>
                <textarea
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Ex: Violation des conditions d'utilisation, comportement inapproprié..."
                  rows={4}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                  required
                />
              </div>

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowBanModal(false);
                    setBanUserId(null);
                    setBanReason('');
                  }}
                  className="flex-1 bg-slate-100 text-slate-700 px-6 py-3 rounded-lg hover:bg-slate-200 transition"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmBanUser}
                  className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition"
                >
                  Confirmer le bannissement
                </button>
              </div>
            </div>
          </div>
        )}

        {showSubscriptionModal && editingSubscription && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-8 max-w-lg w-full">
              <div className="flex items-center space-x-3 mb-6">
                <CreditCard className="w-8 h-8 text-amber-600" />
                <h2 className="text-2xl font-bold text-slate-900">Modifier l'abonnement</h2>
              </div>

              <div className="mb-4 p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600">
                  <strong>Agence:</strong> {editingSubscription.agency_name}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  <strong>Plan actuel:</strong> {editingSubscription.plan_name}
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleUpdateSubscription({
                    plan_id: formData.get('plan_id') as string,
                    current_keys_limit: parseInt(formData.get('current_keys_limit') as string),
                    status: formData.get('status') as string,
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Plan</label>
                  <select
                    name="plan_id"
                    defaultValue={editingSubscription.plan_id}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  >
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} - {isUnlimited(plan.included_keys) ? 'Illimité' : `${plan.included_keys} clés`} - {plan.base_price}€/mois
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Limite de clés</label>
                  <input
                    type="number"
                    name="current_keys_limit"
                    defaultValue={editingSubscription.current_keys_limit}
                    min="1"
                    max="999999999"
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Nombre maximum de clés que l'agence peut gérer
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Statut de l'abonnement</label>
                  <select
                    name="status"
                    defaultValue={editingSubscription.status}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  >
                    <option value="active">Actif</option>
                    <option value="suspended">Suspendu</option>
                    <option value="cancelled">Annulé</option>
                  </select>
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSubscriptionModal(false);
                      setEditingSubscription(null);
                    }}
                    className="flex-1 bg-slate-100 text-slate-700 px-6 py-3 rounded-lg hover:bg-slate-200 transition"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary transition"
                  >
                    Enregistrer
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showAgencyPlanModal && editingAgency && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Modifier le plan de l'agence</h2>

              <div className="mb-4 bg-slate-50 rounded-lg p-4">
                <p className="text-sm font-medium text-slate-700">Agence</p>
                <p className="text-lg font-bold text-slate-900">{editingAgency.name}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {editingAgency.key_count} clés actives / {formatKeyLimit(editingAgency.max_keys)} autorisées
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleUpdateAgencyPlan(
                    formData.get('plan_id') as string,
                    parseInt(formData.get('max_keys') as string)
                  );
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Plan</label>
                  <select
                    name="plan_id"
                    defaultValue={editingAgency.plan_id || ''}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Aucun plan</option>
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} - {isUnlimited(plan.included_keys) ? 'Illimité' : `${plan.included_keys} clés`} - {plan.base_price}€/mois
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Limite de clés *
                  </label>
                  <input
                    type="number"
                    name="max_keys"
                    defaultValue={editingAgency.max_keys}
                    min="1"
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Nombre maximum de clés que l'agence peut créer
                  </p>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs text-amber-900">
                    <strong>Note :</strong> Si vous réduisez la limite en dessous du nombre de clés actives,
                    l'agence ne pourra plus créer de nouvelles clés jusqu'à ce qu'elle en supprime.
                  </p>
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAgencyPlanModal(false);
                      setEditingAgency(null);
                    }}
                    className="flex-1 bg-slate-100 text-slate-700 px-6 py-3 rounded-lg hover:bg-slate-200 transition"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary transition"
                  >
                    Enregistrer
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
