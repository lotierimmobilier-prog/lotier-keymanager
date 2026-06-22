import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { DashboardLayout } from '../../components/DashboardLayout';
import { CreditCard, Check, AlertCircle, ArrowUp, ArrowDown, X, Shield, TrendingUp, Info, Package, Star, Zap } from 'lucide-react';
import { isUnlimited, formatKeyLimit } from '../../utils/constants';

interface Plan {
  id: string;
  name: string;
  included_keys: number;
  base_price: string;
}

interface PlanFeature {
  id: string;
  feature_name: string;
  feature_description: string | null;
  is_included: boolean;
}

interface Subscription {
  id: string;
  plan_id: string;
  current_keys_limit: number;
  status: string;
  trial_ends_at: string | null;
  payment_status: string;
  plan?: Plan;
}

interface Agency {
  name: string;
  max_keys: number;
  plan_id: string | null;
  plan?: Plan;
}

export function SubscriptionPage() {
  const { profile } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [agency, setAgency] = useState<Agency | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planFeatures, setPlanFeatures] = useState<Record<string, PlanFeature[]>>({});
  const [activeKeysCount, setActiveKeysCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedPlanForChange, setSelectedPlanForChange] = useState<Plan | null>(null);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (profile?.agency_id) {
      loadData();
    }
  }, [profile]);

  async function loadData() {
    if (!profile?.agency_id) return;

    try {
      const [subResult, agencyResult, plansResult, keysResult, featuresResult] = await Promise.all([
        supabase
          .from('subscriptions')
          .select(`
            *,
            plans (*)
          `)
          .eq('agency_id', profile.agency_id)
          .maybeSingle(),
        supabase
          .from('agencies')
          .select(`
            name,
            max_keys,
            plan_id,
            plans:plan_id (*)
          `)
          .eq('id', profile.agency_id)
          .single(),
        supabase
          .from('plans')
          .select('*')
          .order('included_keys', { ascending: true }),
        supabase
          .from('keys')
          .select('id')
          .eq('agency_id', profile.agency_id)
          .neq('status', 'ARCHIVED'),
        supabase
          .from('plan_features')
          .select('*')
          .order('display_order', { ascending: true }),
      ]);

      if (subResult.data) {
        setSubscription({
          ...subResult.data,
          plan: subResult.data.plans as Plan,
        });
      }

      if (agencyResult.data) {
        const hasActiveSubscription = subResult.data && subResult.data.status === 'active';

        const effectivePlan = hasActiveSubscription ? subResult.data.plans : agencyResult.data.plans;
        const effectiveMaxKeys = hasActiveSubscription ? subResult.data.current_keys_limit : agencyResult.data.max_keys;
        const effectivePlanId = hasActiveSubscription ? subResult.data.plan_id : agencyResult.data.plan_id;

        setAgency({
          name: agencyResult.data.name,
          max_keys: effectiveMaxKeys,
          plan_id: effectivePlanId,
          plan: effectivePlan as Plan,
        });
      }

      const allPlans = plansResult.data || [];
      setPlans(allPlans);

      const featuresMap: Record<string, PlanFeature[]> = {};
      if (featuresResult.data) {
        featuresResult.data.forEach((feature) => {
          if (!featuresMap[feature.plan_id]) {
            featuresMap[feature.plan_id] = [];
          }
          featuresMap[feature.plan_id].push(feature);
        });
      }
      setPlanFeatures(featuresMap);

      setActiveKeysCount(keysResult.data?.length || 0);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleChangePlan(targetPlan: Plan) {
    if (!profile?.agency_id) return;

    const targetPrice = parseFloat(targetPlan.base_price);

    if (targetPrice === 0) {
      await handleDowngradeToFree(targetPlan);
    } else {
      await handleProceedToPaymentDirect(targetPlan);
    }
  }

  async function handleDowngradeToFree(targetPlan: Plan) {
    setSubmitting(true);

    try {
      const { error: agencyError } = await supabase
        .from('agencies')
        .update({
          plan_id: targetPlan.id,
          max_keys: targetPlan.included_keys,
        })
        .eq('id', profile.agency_id);

      if (agencyError) throw agencyError;

      alert(`Vous êtes maintenant sur le plan ${targetPlan.name}`);
      setShowChangeModal(false);
      setSelectedPlanForChange(null);
      loadData();
    } catch (error) {
      console.error('Error changing to free plan:', error);
      alert('Erreur lors du changement de plan');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelSubscription() {
    if (!profile?.agency_id || !subscription) return;

    if (!cancelReason.trim()) {
      alert('Veuillez indiquer la raison de votre annulation');
      return;
    }

    setSubmitting(true);

    try {
      const freePlan = plans.find(p => p.name === 'Gratuit');
      if (!freePlan) {
        throw new Error('Plan gratuit introuvable');
      }

      const { error: agencyError } = await supabase
        .from('agencies')
        .update({
          plan_id: freePlan.id,
          max_keys: freePlan.included_keys,
        })
        .eq('id', profile.agency_id);

      if (agencyError) throw agencyError;

      if (subscription.id) {
        const { error: subError } = await supabase
          .from('subscriptions')
          .update({ status: 'cancelled' })
          .eq('id', subscription.id);

        if (subError) console.error('Error updating subscription:', subError);
      }

      alert('Votre abonnement a été annulé. Vous êtes maintenant sur le plan gratuit.');
      setShowCancelModal(false);
      setCancelReason('');
      loadData();
    } catch (error) {
      console.error('Error canceling subscription:', error);
      alert('Erreur lors de l\'annulation');
    } finally {
      setSubmitting(false);
    }
  }

  function getChangeType(targetPlan: Plan): 'upgrade' | 'downgrade' | 'same' {
    const currentPrice = parseFloat(agency?.plan?.base_price || '0');
    const targetPrice = parseFloat(targetPlan.base_price);

    if (targetPrice > currentPrice) return 'upgrade';
    if (targetPrice < currentPrice) return 'downgrade';
    return 'same';
  }

  function canDowngradeToFree(): boolean {
    const freePlan = plans.find(p => p.name === 'Gratuit');
    if (!freePlan) return false;
    return activeKeysCount <= freePlan.included_keys;
  }

  async function handleProceedToPaymentDirect(targetPlan: Plan) {
    if (!targetPlan.stripe_price_id) {
      alert('Ce plan n\'est pas encore configuré pour les paiements en ligne. Contactez un administrateur.');
      setShowChangeModal(false);
      setSelectedPlanForChange(null);
      return;
    }

    setSubmitting(true);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !sessionData.session) {
        alert('Erreur d\'authentification');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          price_id: targetPlan.stripe_price_id,
          mode: 'subscription',
          success_url: `${window.location.origin}/dashboard/subscription?payment=success&plan=${targetPlan.id}`,
          cancel_url: `${window.location.origin}/dashboard/subscription?payment=cancelled`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la création de la session de paiement');
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('URL de paiement non reçue');
      }
    } catch (error: any) {
      console.error('Error proceeding to payment:', error);
      alert(error.message || 'Erreur lors de la redirection vers le paiement');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout currentPage="subscription">
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-600">Chargement...</div>
        </div>
      </DashboardLayout>
    );
  }

  const currentPlanPrice = parseFloat(agency?.plan?.base_price || '0');
  const isFreePlan = currentPlanPrice === 0;
  const daysInTrial = subscription?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(subscription.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <DashboardLayout currentPage="subscription">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Mon Abonnement</h1>

        <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">{agency?.name}</h2>
              <div className="flex items-center space-x-3">
                <p className="text-slate-600">Plan actuel:</p>
                <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-semibold">
                  {agency?.plan?.name || 'Gratuit'}
                </span>
                {subscription?.status === 'trialing' && daysInTrial > 0 && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                    {daysInTrial} jours d'essai restants
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-slate-900 mb-1">
                {currentPlanPrice.toFixed(2)}€
                <span className="text-lg text-slate-600">/mois</span>
              </div>
              <p className="text-sm text-slate-600">Prix du plan</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 mb-6">
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-600 mb-1">Clés actives</p>
              <p className="text-2xl font-bold text-slate-900">
                {activeKeysCount} / {formatKeyLimit(agency?.max_keys || 3)}
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-600 mb-1">Statut</p>
              <p className="text-2xl font-bold text-green-600">
                {subscription?.status === 'active' ? 'Actif' :
                 subscription?.status === 'trialing' ? 'Essai gratuit' :
                 'Actif'}
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-600 mb-1">Paiement</p>
              <p className="text-2xl font-bold text-blue-600">
                {subscription?.payment_status === 'paid' ? 'À jour' :
                 subscription?.payment_status === 'pending' ? 'En attente' :
                 isFreePlan ? 'Gratuit' : 'N/A'}
              </p>
            </div>
          </div>

          {!isUnlimited(agency?.max_keys || 3) && activeKeysCount >= (agency?.max_keys || 3) && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-orange-900 mb-1">Limite atteinte</p>
                <p className="text-sm text-orange-800">
                  Vous avez atteint votre limite de clés actives. Passez à un plan supérieur pour ajouter plus de clés.
                </p>
              </div>
            </div>
          )}

          {!isFreePlan && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <button
                onClick={() => setShowCancelModal(true)}
                className="text-red-600 hover:text-red-700 font-semibold text-sm"
              >
                Annuler mon abonnement
              </button>
            </div>
          )}
        </div>

        <div className="mb-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 px-5 py-2.5 rounded-full text-sm font-bold mb-4 shadow-sm">
              <Zap className="w-4 h-4 fill-current" />
              <span>7 jours d'essai gratuit sur tous les plans payants</span>
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-3 flex items-center justify-center space-x-2">
              <Package className="w-8 h-8 text-blue-600" />
              <span>Changer de plan</span>
            </h2>
            <p className="text-lg text-slate-600">
              Sélectionnez un nouveau plan et procédez au paiement en quelques clics
            </p>
          </div>

          {(() => {
            const getPlanColor = (planName: string) => {
              if (planName === 'Gratuit') return 'from-slate-50 to-slate-100';
              if (planName === 'Team') return 'from-blue-50 to-cyan-50';
              if (planName === 'Business') return 'from-green-50 to-emerald-50';
              if (planName === 'Business+') return 'from-amber-50 to-orange-50';
              if (planName === 'Corporate') return 'from-blue-600 via-indigo-600 to-purple-700';
              return 'from-slate-50 to-slate-100';
            };

            const getBorderColor = (planName: string) => {
              if (planName === 'Gratuit') return 'border-slate-200';
              if (planName === 'Team') return 'border-blue-300';
              if (planName === 'Business') return 'border-green-300';
              if (planName === 'Business+') return 'border-amber-400';
              if (planName === 'Corporate') return 'border-blue-400';
              return 'border-slate-200';
            };

            const getBadgeColor = (planName: string) => {
              if (planName === 'Gratuit') return 'bg-slate-200 text-slate-600';
              if (planName === 'Team') return 'bg-blue-200 text-blue-700';
              if (planName === 'Business') return 'bg-green-200 text-green-700';
              if (planName === 'Business+') return 'bg-amber-200 text-amber-700';
              if (planName === 'Corporate') return 'bg-white/20 text-white';
              return 'bg-slate-200 text-slate-600';
            };

            const getTextColor = (planName: string) => {
              return planName === 'Corporate' ? 'text-white' : 'text-slate-700';
            };

            const businessPlusPlan = plans.find(p => p.name === 'Business+');
            const otherPlans = plans.filter(p => p.name !== 'Business+');

            const renderPlan = (plan: Plan) => {
              const isCurrentPlan = agency?.plan_id === plan.id;
              const price = parseFloat(plan.base_price);
              const changeType = getChangeType(plan);
              const features = planFeatures[plan.id] || [];
              const isDowngradeBlocked = changeType === 'downgrade' && plan.name === 'Gratuit' && !canDowngradeToFree();
              const isCorporate = plan.name === 'Corporate';
              const isBusinessPlus = plan.name === 'Business+';

              return (
                <div
                  key={plan.id}
                  className={`bg-gradient-to-br ${getPlanColor(plan.name)} rounded-2xl p-6 border-${isBusinessPlus ? '4' : '2'} ${getBorderColor(plan.name)} shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-2 relative ${
                    isCurrentPlan ? 'ring-4 ring-blue-600' : ''
                  } ${isBusinessPlus ? 'md:flex md:items-center md:justify-between' : ''}`}
                >
                  {plan.name === 'Business+' && !isCurrentPlan && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-full text-xs font-black shadow-xl flex items-center space-x-1">
                        <Star className="w-4 h-4 fill-current" />
                        <span>POPULAIRE</span>
                      </span>
                    </div>
                  )}

                  {isCurrentPlan && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-blue-600 text-white px-4 py-2 rounded-full text-xs font-bold shadow-xl">
                        Plan actuel
                      </span>
                    </div>
                  )}

                  <div className={isBusinessPlus ? 'md:flex-1' : ''}>
                    <div className="text-center mb-6 mt-2">
                      <div className={`inline-block ${getBadgeColor(plan.name)} px-3 py-1 rounded-full text-xs font-bold mb-3`}>
                        {plan.name === 'Gratuit' ? 'GRATUIT' :
                         plan.name === 'Corporate' ? '🏢 ENTREPRISE • 7 JOURS GRATUITS' :
                         `${plan.name.toUpperCase()} • 7 JOURS GRATUITS`}
                      </div>
                      <h3 className={`text-2xl font-black mb-3 ${isCorporate ? 'text-white' : 'text-slate-900'}`}>{plan.name}</h3>
                      <div className={`text-5xl font-black mb-2 ${
                        plan.name === 'Business+' ? 'bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent' :
                        plan.name === 'Team' ? 'text-blue-600' :
                        plan.name === 'Business' ? 'text-green-600' :
                        plan.name === 'Corporate' ? 'bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent' :
                        'text-slate-900'
                      }`}>
                        {price.toFixed(2)}€
                      </div>
                      <div className={`font-bold mb-3 ${isCorporate ? 'text-blue-100' : 'text-slate-600'}`}>par mois</div>
                      <div className={`text-sm font-bold px-3 py-1 rounded-full inline-block ${getBadgeColor(plan.name)}`}>
                        {formatKeyLimit(plan.included_keys)}
                      </div>
                    </div>

                    <ul className={`space-y-3 mb-6 ${isBusinessPlus ? 'md:columns-2 md:gap-8' : ''}`}>
                      {features.slice(0, isBusinessPlus ? 8 : 5).map((feature) => (
                        <li key={feature.id} className="flex items-start break-inside-avoid">
                          <Check className={`w-5 h-5 mr-2 flex-shrink-0 mt-0.5 ${isCorporate ? 'text-white' : 'text-green-600'}`} />
                          <span className={`text-sm font-semibold ${getTextColor(plan.name)}`}>{feature.feature_name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className={isBusinessPlus ? 'md:w-64 md:text-center md:flex md:flex-col md:justify-center' : ''}>
                    {isCurrentPlan ? (
                      <div className="w-full bg-slate-700 text-white px-6 py-3 rounded-xl font-bold text-center">
                        Plan actuel
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedPlanForChange(plan);
                          setShowChangeModal(true);
                        }}
                        disabled={isDowngradeBlocked || submitting}
                        className={`w-full px-6 py-3 rounded-xl font-bold transition shadow-lg text-center ${
                          isDowngradeBlocked
                            ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                            : plan.name === 'Gratuit'
                            ? 'bg-slate-700 text-white hover:bg-slate-800'
                            : plan.name === 'Team'
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : plan.name === 'Business'
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : plan.name === 'Business+'
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600'
                            : plan.name === 'Corporate'
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                            : 'bg-slate-600 text-white hover:bg-slate-700'
                        }`}
                        title={isDowngradeBlocked ? 'Vous avez trop de clés pour ce plan' : ''}
                      >
                        {isDowngradeBlocked ? 'Non disponible' :
                         price > 0 ? `7 jours gratuits puis ${price.toFixed(2)}€/mois` :
                         changeType === 'upgrade' ? 'Passer à ce plan' :
                         changeType === 'downgrade' ? 'Rétrograder' :
                         'Commencer'}
                      </button>
                    )}
                  </div>
                </div>
              );
            };

            return (
              <div className="space-y-6">
                {businessPlusPlan && (
                  <div>
                    {renderPlan(businessPlusPlan)}
                  </div>
                )}
                <div className="grid md:grid-cols-2 gap-6">
                  {otherPlans.map(plan => renderPlan(plan))}
                </div>
              </div>
            );
          })()}
        </div>

        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 rounded-3xl opacity-10 blur-2xl"></div>
          <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-1.5 shadow-2xl">
            <div className="bg-gradient-to-br from-white to-slate-50 rounded-[22px] p-10 text-center">
              <div className="max-w-3xl mx-auto">
                <div className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-4">
                  Besoin d'aide ?
                </div>
                <h3 className="text-3xl font-bold text-slate-900 mb-4 leading-tight">
                  Comment changer de plan ?
                </h3>
                <ul className="space-y-3 text-left text-slate-700 mb-6 max-w-2xl mx-auto">
                  <li className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                    <span className="text-base">Sélectionnez le plan qui vous convient ci-dessus</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                    <span className="text-base">Cliquez sur le bouton pour passer au plan choisi</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                    <span className="text-base">Vous êtes redirigé vers Stripe pour un paiement 100% sécurisé</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                    <span className="text-base">Votre plan est activé immédiatement après le paiement</span>
                  </li>
                </ul>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 max-w-2xl mx-auto">
                  <p className="text-green-800 font-semibold flex items-center justify-center">
                    <Check className="w-5 h-5 mr-2" />
                    Profitez de 7 jours d'essai gratuit sur tous les plans payants
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showChangeModal && selectedPlanForChange && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-4">
                Confirmer le changement de plan
              </h3>
              <div className="mb-6">
                <div className="bg-slate-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-slate-600 mb-2">Plan actuel</p>
                  <p className="text-lg font-bold text-slate-900">{agency?.plan?.name || 'Gratuit'}</p>
                  <p className="text-sm text-slate-600">{currentPlanPrice.toFixed(2)}€/mois</p>
                </div>
                <div className="flex items-center justify-center mb-4">
                  {getChangeType(selectedPlanForChange) === 'upgrade' ? (
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  ) : (
                    <ArrowDown className="w-6 h-6 text-blue-600" />
                  )}
                </div>
                <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-400">
                  <p className="text-sm text-slate-600 mb-2">Nouveau plan</p>
                  <p className="text-lg font-bold text-slate-900">{selectedPlanForChange.name}</p>
                  <p className="text-sm text-slate-600">{parseFloat(selectedPlanForChange.base_price).toFixed(2)}€/mois</p>
                  {parseFloat(selectedPlanForChange.base_price) > 0 && (
                    <p className="text-xs text-green-600 font-semibold mt-2">
                      Inclus 7 jours d'essai gratuit
                    </p>
                  )}
                </div>
              </div>
              {parseFloat(selectedPlanForChange.base_price) > 0 ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-green-900">
                    <CreditCard className="w-4 h-4 inline mr-1" />
                    Vous serez redirigé vers Stripe pour effectuer le paiement sécurisé. Profitez de 7 jours d'essai gratuit.
                  </p>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-900">
                    <Shield className="w-4 h-4 inline mr-1" />
                    Votre plan sera immédiatement changé vers le plan gratuit.
                  </p>
                </div>
              )}
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowChangeModal(false);
                    setSelectedPlanForChange(null);
                  }}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition font-semibold"
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleChangePlan(selectedPlanForChange)}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-bold disabled:opacity-50"
                >
                  {submitting ? (parseFloat(selectedPlanForChange.base_price) > 0 ? 'Redirection...' : 'Changement...') : 'Confirmer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showCancelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center space-x-2">
                <X className="w-6 h-6 text-red-600" />
                <span>Annuler mon abonnement</span>
              </h3>
              <p className="text-slate-700 mb-4">
                Nous sommes désolés de vous voir partir. Pour nous aider à améliorer nos services, pourriez-vous nous dire pourquoi vous souhaitez annuler ?
              </p>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mb-4"
                placeholder="Raison de l'annulation..."
                required
              />
              {canDowngradeToFree() && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-green-900">
                    <Check className="w-4 h-4 inline mr-1" />
                    Vous serez automatiquement basculé vers le plan gratuit (jusqu'à 3 clés).
                  </p>
                </div>
              )}
              {!canDowngradeToFree() && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                  <AlertCircle className="w-4 h-4 inline mr-1 text-orange-600" />
                  <p className="text-sm text-orange-900">
                    Attention: Vous avez actuellement {activeKeysCount} clés actives. Le plan gratuit est limité à 3 clés.
                    Vous devrez archiver des clés avant de pouvoir revenir au plan gratuit.
                  </p>
                </div>
              )}
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelReason('');
                  }}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition font-semibold"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCancelSubscription}
                  disabled={submitting || !cancelReason.trim()}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-bold disabled:opacity-50"
                >
                  {submitting ? 'Envoi...' : 'Confirmer l\'annulation'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
