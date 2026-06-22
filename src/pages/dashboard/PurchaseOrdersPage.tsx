import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { DashboardLayout } from '../../components/DashboardLayout';
import { ShoppingCart, Plus, Check, X, Eye, AlertCircle } from 'lucide-react';
import { isUnlimited, formatKeyLimit } from '../../utils/constants';

interface PurchaseOrder {
  id: string;
  order_number: string;
  agency_id: string;
  agency_name?: string;
  plan_id: string;
  plan_name?: string;
  requested_by_user_id: string;
  requester_name?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requested_keys_limit: number;
  total_amount: number;
  notes: string | null;
  rejection_reason: string | null;
  approved_by_admin_id: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Plan {
  id: string;
  name: string;
  included_keys: number;
  base_price: string;
}

export function PurchaseOrdersPage() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [formData, setFormData] = useState({
    plan_id: '',
    requested_keys_limit: 0,
    notes: '',
  });
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    if (profile) {
      loadData();
    }
  }, [profile]);

  async function loadData() {
    setLoading(true);
    try {
      await Promise.all([loadOrders(), loadPlans()]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadOrders() {
    try {
      let query = supabase
        .from('purchase_orders')
        .select(`
          *,
          agencies!purchase_orders_agency_id_fkey(name),
          plans!purchase_orders_plan_id_fkey(name),
          users!purchase_orders_requested_by_user_id_fkey(first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (!profile?.is_super_admin) {
        query = query.eq('agency_id', profile?.agency_id);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedOrders = data?.map((order: any) => ({
        ...order,
        agency_name: order.agencies?.name,
        plan_name: order.plans?.name,
        requester_name: `${order.users?.first_name} ${order.users?.last_name}`,
      })) || [];

      setOrders(formattedOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  }

  async function loadPlans() {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('included_keys');

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error loading plans:', error);
    }
  }

  async function handleCreateOrder(e: React.FormEvent) {
    e.preventDefault();

    if (!profile?.agency_id) {
      alert('Impossible de créer une commande sans agence');
      return;
    }

    const selectedPlan = plans.find(p => p.id === formData.plan_id);
    if (!selectedPlan) {
      alert('Veuillez sélectionner un plan');
      return;
    }

    try {
      const { error } = await supabase
        .from('purchase_orders')
        .insert({
          agency_id: profile.agency_id,
          plan_id: formData.plan_id,
          requested_by_user_id: profile.id,
          requested_keys_limit: formData.requested_keys_limit || selectedPlan.included_keys,
          total_amount: parseFloat(selectedPlan.base_price),
          notes: formData.notes || null,
        });

      if (error) throw error;

      alert('Bon de commande créé avec succès');
      setShowCreateModal(false);
      setFormData({ plan_id: '', requested_keys_limit: 0, notes: '' });
      loadOrders();
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Erreur lors de la création du bon de commande');
    }
  }

  async function handleApproveOrder(orderId: string) {
    if (!confirm('Voulez-vous approuver ce bon de commande ?')) return;

    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      const { error: orderError } = await supabase
        .from('purchase_orders')
        .update({
          status: 'approved',
          approved_by_admin_id: profile?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (orderError) throw orderError;

      const { error: subError } = await supabase
        .from('subscriptions')
        .upsert({
          agency_id: order.agency_id,
          plan_id: order.plan_id,
          status: 'active',
          current_keys_limit: order.requested_keys_limit,
          payment_status: 'paid',
          last_payment_date: new Date().toISOString(),
        });

      if (subError) throw subError;

      const { error: agencyError } = await supabase
        .from('agencies')
        .update({
          plan_id: order.plan_id,
          max_keys: order.requested_keys_limit,
        })
        .eq('id', order.agency_id);

      if (agencyError) throw agencyError;

      alert('Bon de commande approuvé avec succès');
      loadOrders();
      setShowDetailModal(false);
    } catch (error) {
      console.error('Error approving order:', error);
      alert('Erreur lors de l\'approbation du bon de commande');
    }
  }

  async function handleRejectOrder(orderId: string) {
    if (!rejectionReason.trim()) {
      alert('Veuillez indiquer la raison du rejet');
      return;
    }

    try {
      const { error } = await supabase
        .from('purchase_orders')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          approved_by_admin_id: profile?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) throw error;

      alert('Bon de commande rejeté');
      setRejectionReason('');
      loadOrders();
      setShowDetailModal(false);
    } catch (error) {
      console.error('Error rejecting order:', error);
      alert('Erreur lors du rejet du bon de commande');
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'En attente' },
      approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Approuvé' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejeté' },
      cancelled: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'Annulé' },
    };
    const badge = badges[status as keyof typeof badges];
    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <DashboardLayout currentPage="purchase-orders">
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentPage="purchase-orders">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Bons de Commande</h1>
            <p className="text-slate-600 mt-1">Gérez vos demandes d'abonnement</p>
          </div>
          {profile?.role === 'ADMIN' && !profile?.is_super_admin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary transition"
            >
              <Plus className="w-5 h-5" />
              <span>Nouvelle Demande</span>
            </button>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-900">N° Commande</th>
                  {profile?.is_super_admin && (
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-900">Agence</th>
                  )}
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-900">Plan</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-900">Clés</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-900">Montant</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-900">Statut</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-900">Date</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-slate-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={profile?.is_super_admin ? 8 : 7} className="px-4 py-8 text-center text-slate-500">
                      <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                      <p>Aucun bon de commande</p>
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">
                        {order.order_number}
                      </td>
                      {profile?.is_super_admin && (
                        <td className="px-4 py-3 text-sm text-slate-600">{order.agency_name}</td>
                      )}
                      <td className="px-4 py-3 text-sm text-slate-600">{order.plan_name}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {formatKeyLimit(order.requested_keys_limit)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {order.total_amount.toFixed(2)} €
                      </td>
                      <td className="px-4 py-3 text-sm">{getStatusBadge(order.status)}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {new Date(order.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowDetailModal(true);
                          }}
                          className="p-2 hover:bg-blue-50 rounded transition"
                          title="Voir les détails"
                        >
                          <Eye className="w-4 h-4 text-blue-600" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-xl font-bold text-slate-900">Nouvelle Demande d'Abonnement</h2>
              </div>
              <form onSubmit={handleCreateOrder} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Plan *
                  </label>
                  <select
                    value={formData.plan_id}
                    onChange={(e) => {
                      const plan = plans.find(p => p.id === e.target.value);
                      setFormData({
                        ...formData,
                        plan_id: e.target.value,
                        requested_keys_limit: plan?.included_keys || 0,
                      });
                    }}
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Sélectionner un plan</option>
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} - {formatKeyLimit(plan.included_keys)} - {parseFloat(plan.base_price).toFixed(2)} €
                      </option>
                    ))}
                  </select>
                </div>

                {formData.plan_id && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Nombre de clés *
                    </label>
                    <input
                      type="number"
                      value={formData.requested_keys_limit}
                      onChange={(e) => setFormData({ ...formData, requested_keys_limit: parseInt(e.target.value) })}
                      min="1"
                      required
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Informations complémentaires..."
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setFormData({ plan_id: '', requested_keys_limit: 0, notes: '' });
                    }}
                    className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary transition"
                  >
                    Créer la Demande
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showDetailModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-xl font-bold text-slate-900">
                  Bon de Commande {selectedOrder.order_number}
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Statut</p>
                    <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                  </div>
                  {profile?.is_super_admin && (
                    <div>
                      <p className="text-sm text-slate-500">Agence</p>
                      <p className="font-medium text-slate-900">{selectedOrder.agency_name}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-slate-500">Plan</p>
                    <p className="font-medium text-slate-900">{selectedOrder.plan_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Nombre de clés</p>
                    <p className="font-medium text-slate-900">
                      {formatKeyLimit(selectedOrder.requested_keys_limit)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Montant</p>
                    <p className="font-medium text-slate-900">{selectedOrder.total_amount.toFixed(2)} €</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Demandé par</p>
                    <p className="font-medium text-slate-900">{selectedOrder.requester_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Date de création</p>
                    <p className="font-medium text-slate-900">
                      {new Date(selectedOrder.created_at).toLocaleString('fr-FR')}
                    </p>
                  </div>
                </div>

                {selectedOrder.notes && (
                  <div>
                    <p className="text-sm text-slate-500 mb-1">Notes</p>
                    <p className="text-slate-900 bg-slate-50 p-3 rounded-lg">{selectedOrder.notes}</p>
                  </div>
                )}

                {selectedOrder.rejection_reason && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                      <div>
                        <p className="font-semibold text-red-900">Raison du rejet</p>
                        <p className="text-red-700 mt-1">{selectedOrder.rejection_reason}</p>
                      </div>
                    </div>
                  </div>
                )}

                {profile?.is_super_admin && selectedOrder.status === 'pending' && (
                  <div className="border-t pt-4 mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Raison du rejet (si applicable)
                      </label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Indiquez la raison du rejet..."
                      />
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => handleApproveOrder(selectedOrder.id)}
                        className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                      >
                        <Check className="w-5 h-5" />
                        <span>Approuver</span>
                      </button>
                      <button
                        onClick={() => handleRejectOrder(selectedOrder.id)}
                        className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                      >
                        <X className="w-5 h-5" />
                        <span>Rejeter</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      setSelectedOrder(null);
                      setRejectionReason('');
                    }}
                    className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
