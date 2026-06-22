import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { DashboardLayout } from '../../components/DashboardLayout';
import { TrendingUp, DollarSign, CreditCard, Calendar, ArrowUp, ArrowDown, Users, Building2 } from 'lucide-react';

interface RevenueData {
  total_revenue: number;
  monthly_recurring_revenue: number;
  active_subscriptions: number;
  total_agencies: number;
  revenue_by_plan: { plan_name: string; count: number; revenue: number }[];
  recent_payments: { agency_name: string; amount: number; date: string; plan_name: string }[];
}

interface Forecast {
  period: string;
  estimated_revenue: number;
  based_on_mrr: number;
}

export function RevenuePage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'3' | '6' | '12'>('3');

  useEffect(() => {
    if (profile?.is_super_admin) {
      loadRevenueData();
    }
  }, [profile]);

  useEffect(() => {
    if (revenueData) {
      calculateForecasts();
    }
  }, [revenueData, selectedPeriod]);

  async function loadRevenueData() {
    setLoading(true);
    try {
      console.log('Loading revenue data...');
      const { data: subscriptions, error: subError } = await supabase
        .from('subscriptions')
        .select(`
          id,
          status,
          payment_status,
          last_payment_date,
          agencies:agency_id (name),
          plans:plan_id (name, base_price)
        `)
        .eq('status', 'active');

      console.log('Subscriptions data:', subscriptions);
      console.log('Subscriptions error:', subError);

      if (subError) throw subError;

      const activeSubscriptions = subscriptions?.filter(
        (sub: any) => sub.payment_status === 'paid'
      ) || [];

      const totalRevenue = activeSubscriptions.reduce(
        (sum: number, sub: any) => sum + parseFloat(sub.plans?.base_price || '0'),
        0
      );

      const monthlyRecurringRevenue = totalRevenue;

      const revenueByPlan = subscriptions?.reduce((acc: any[], sub: any) => {
        const planName = sub.plans?.name || 'Inconnu';
        const existing = acc.find((item) => item.plan_name === planName);

        if (existing) {
          existing.count += 1;
          if (sub.payment_status === 'paid') {
            existing.revenue += parseFloat(sub.plans?.base_price || '0');
          }
        } else {
          acc.push({
            plan_name: planName,
            count: 1,
            revenue: sub.payment_status === 'paid' ? parseFloat(sub.plans?.base_price || '0') : 0,
          });
        }

        return acc;
      }, []) || [];

      const recentPayments = activeSubscriptions
        .filter((sub: any) => sub.last_payment_date)
        .sort((a: any, b: any) =>
          new Date(b.last_payment_date).getTime() - new Date(a.last_payment_date).getTime()
        )
        .slice(0, 10)
        .map((sub: any) => ({
          agency_name: sub.agencies?.name || 'N/A',
          amount: parseFloat(sub.plans?.base_price || '0'),
          date: sub.last_payment_date,
          plan_name: sub.plans?.name || 'Inconnu',
        }));

      const { count: agencyCount } = await supabase
        .from('agencies')
        .select('*', { count: 'exact', head: true });

      setRevenueData({
        total_revenue: totalRevenue,
        monthly_recurring_revenue: monthlyRecurringRevenue,
        active_subscriptions: activeSubscriptions.length,
        total_agencies: agencyCount || 0,
        revenue_by_plan: revenueByPlan,
        recent_payments: recentPayments,
      });
    } catch (error) {
      console.error('Error loading revenue data:', error);
    } finally {
      setLoading(false);
    }
  }

  function calculateForecasts() {
    if (!revenueData) return;

    const mrr = revenueData.monthly_recurring_revenue;
    const periods = parseInt(selectedPeriod);

    const growthRate = 0.05;

    const forecasts: Forecast[] = [];

    for (let i = 1; i <= periods; i++) {
      const estimatedRevenue = mrr * i * (1 + growthRate * (i - 1));
      forecasts.push({
        period: `Mois ${i}`,
        estimated_revenue: estimatedRevenue,
        based_on_mrr: mrr,
      });
    }

    setForecasts(forecasts);
  }

  if (!profile?.is_super_admin) {
    return (
      <DashboardLayout currentPage="revenue">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
            <TrendingUp className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Accès refusé</h3>
            <p className="text-slate-600">Cette page est réservée aux super administrateurs</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout currentPage="revenue">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12 text-slate-600">Chargement des données...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentPage="revenue">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2 flex items-center space-x-3">
            <TrendingUp className="w-8 h-8 text-green-600" />
            <span>Chiffre d'Affaires et Prévisions</span>
          </h1>
          <p className="text-slate-600">Suivi du CA, abonnements actifs et prévisions financières</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 opacity-80" />
              <ArrowUp className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-medium opacity-90 mb-1">CA Total</h3>
            <p className="text-3xl font-bold">{revenueData?.total_revenue.toFixed(2)} €</p>
            <p className="text-xs opacity-75 mt-2">Revenu mensuel actuel</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <CreditCard className="w-8 h-8 opacity-80" />
              <ArrowUp className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-medium opacity-90 mb-1">MRR</h3>
            <p className="text-3xl font-bold">{revenueData?.monthly_recurring_revenue.toFixed(2)} €</p>
            <p className="text-xs opacity-75 mt-2">Revenu mensuel récurrent</p>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 opacity-80" />
              <span className="text-sm font-semibold">Actifs</span>
            </div>
            <h3 className="text-sm font-medium opacity-90 mb-1">Abonnements</h3>
            <p className="text-3xl font-bold">{revenueData?.active_subscriptions}</p>
            <p className="text-xs opacity-75 mt-2">Clients payants</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <Building2 className="w-8 h-8 opacity-80" />
              <span className="text-sm font-semibold">Total</span>
            </div>
            <h3 className="text-sm font-medium opacity-90 mb-1">Agences</h3>
            <p className="text-3xl font-bold">{revenueData?.total_agencies}</p>
            <p className="text-xs opacity-75 mt-2">Inscrites sur le site</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Revenus par Plan</h2>
            <div className="space-y-3">
              {revenueData?.revenue_by_plan && revenueData.revenue_by_plan.length > 0 ? (
                revenueData.revenue_by_plan.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-slate-900">{item.plan_name}</p>
                      <p className="text-sm text-slate-600">{item.count} abonnement(s)</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-green-600">{item.revenue.toFixed(2)} €</p>
                      <p className="text-xs text-slate-500">/mois</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <p>Aucun revenu enregistré pour le moment</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Paiements Récents</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {revenueData?.recent_payments && revenueData.recent_payments.length > 0 ? (
                revenueData.recent_payments.map((payment, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">{payment.agency_name}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded font-semibold">
                          {payment.plan_name}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(payment.date).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-green-600">{payment.amount.toFixed(2)} €</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <p>Aucun paiement récent</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
              <Calendar className="w-6 h-6 text-blue-600" />
              <span>Prévisions de Chiffre d'Affaires</span>
            </h2>
            <div className="flex space-x-2">
              <button
                onClick={() => setSelectedPeriod('3')}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  selectedPeriod === '3'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                3 mois
              </button>
              <button
                onClick={() => setSelectedPeriod('6')}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  selectedPeriod === '6'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                6 mois
              </button>
              <button
                onClick={() => setSelectedPeriod('12')}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  selectedPeriod === '12'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                12 mois
              </button>
            </div>
          </div>

          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-900">
              <strong>Méthodologie :</strong> Les prévisions sont basées sur le MRR actuel avec un taux de croissance estimé de 5% par mois.
              Ces projections sont indicatives et peuvent varier selon l'évolution des abonnements.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-900">Période</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-slate-900">CA Estimé</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-slate-900">Basé sur MRR</th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-slate-900">Croissance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {forecasts.map((forecast, index) => {
                  const growth = index === 0 ? 0 : forecast.estimated_revenue - forecasts[0].based_on_mrr;
                  const growthPercent = index === 0 ? 0 : (growth / forecasts[0].based_on_mrr) * 100;

                  return (
                    <tr key={index} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">{forecast.period}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-lg font-bold text-green-600">
                          {forecast.estimated_revenue.toFixed(2)} €
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-slate-600">
                        {forecast.based_on_mrr.toFixed(2)} €
                      </td>
                      <td className="px-4 py-3 text-right">
                        {index === 0 ? (
                          <span className="text-sm text-slate-500">—</span>
                        ) : (
                          <div className="flex items-center justify-end space-x-1">
                            <ArrowUp className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-semibold text-green-600">
                              +{growthPercent.toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-100 border-t-2 border-slate-300">
                <tr>
                  <td className="px-4 py-4 text-sm font-bold text-slate-900">Total sur {selectedPeriod} mois</td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-xl font-bold text-green-600">
                      {forecasts.reduce((sum, f) => sum + f.estimated_revenue, 0).toFixed(2)} €
                    </span>
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
