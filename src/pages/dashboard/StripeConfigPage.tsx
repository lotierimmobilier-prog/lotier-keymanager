import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { DashboardLayout } from '../../components/DashboardLayout';
import { CreditCard, Check, AlertCircle, ExternalLink, Save } from 'lucide-react';
import { formatKeyLimit } from '../../utils/constants';

interface Plan {
  id: string;
  name: string;
  included_keys: number;
  base_price: string;
  stripe_price_id: string | null;
}

export function StripeConfigPage() {
  const { profile } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stripeConfigured, setStripeConfigured] = useState(false);

  useEffect(() => {
    if (profile?.is_super_admin) {
      loadPlans();
      checkStripeConfig();
    }
  }, [profile]);

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
    } finally {
      setLoading(false);
    }
  }

  async function checkStripeConfig() {
    const hasKeys = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    setStripeConfigured(!!hasKeys);
  }

  async function handleUpdatePriceId(planId: string, priceId: string) {
    setSaving(true);

    try {
      const { error } = await supabase
        .from('plans')
        .update({ stripe_price_id: priceId || null })
        .eq('id', planId);

      if (error) throw error;

      alert('Price ID mis à jour avec succès');
      loadPlans();
    } catch (error) {
      console.error('Error updating price ID:', error);
      alert('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  }

  if (!profile?.is_super_admin) {
    return (
      <DashboardLayout currentPage="superadmin">
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Accès réservé aux super administrateurs</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout currentPage="superadmin">
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentPage="superadmin">
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Configuration Stripe</h1>
          <p className="text-slate-600">Configurez les identifiants Stripe pour activer les paiements</p>
        </div>

        {!stripeConfigured && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-6 mb-6">
            <div className="flex items-start space-x-4">
              <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-bold text-amber-900 mb-2">Configuration Stripe requise</h3>
                <p className="text-amber-800 mb-4">
                  Pour activer les paiements, vous devez configurer Stripe en suivant ces étapes :
                </p>
                <ol className="space-y-2 text-sm text-amber-900 mb-4">
                  <li className="flex items-start space-x-2">
                    <span className="font-bold">1.</span>
                    <span>Créez un compte Stripe sur <a href="https://dashboard.stripe.com/register" target="_blank" rel="noopener noreferrer" className="text-amber-700 underline font-semibold">dashboard.stripe.com</a></span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="font-bold">2.</span>
                    <span>Créez vos produits et prix dans le dashboard Stripe</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="font-bold">3.</span>
                    <span>Ajoutez vos clés API Stripe dans les variables d'environnement</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="font-bold">4.</span>
                    <span>Configurez le webhook Stripe pour pointer vers votre edge function</span>
                  </li>
                </ol>
                <a
                  href="https://bolt.new/setup/stripe"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition font-semibold"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Guide de configuration</span>
                </a>
              </div>
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
          <h3 className="text-lg font-bold text-blue-900 mb-3">Configuration des variables d'environnement</h3>
          <div className="space-y-3 text-sm">
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <code className="text-blue-900 font-mono text-xs">
                STRIPE_SECRET_KEY=sk_test_...
                <br />
                STRIPE_WEBHOOK_SECRET=whsec_...
                <br />
                VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
              </code>
            </div>
            <p className="text-blue-800">
              Ces clés doivent être configurées dans vos variables d'environnement Supabase et votre fichier .env local.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-900">Association des Price IDs Stripe</h2>
            <p className="text-slate-600 mt-1">
              Associez chaque plan à son Price ID Stripe correspondant
            </p>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {plans.map((plan) => (
                <div key={plan.id} className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                      <p className="text-sm text-slate-600 mt-1">
                        {formatKeyLimit(plan.included_keys)} - {parseFloat(plan.base_price).toFixed(2)}€/mois
                      </p>
                    </div>
                    {plan.stripe_price_id && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                        <Check className="w-3 h-3 inline mr-1" />
                        Configuré
                      </span>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Stripe Price ID
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={plan.stripe_price_id || ''}
                          onChange={(e) => {
                            const newPlans = plans.map(p =>
                              p.id === plan.id ? { ...p, stripe_price_id: e.target.value } : p
                            );
                            setPlans(newPlans);
                          }}
                          placeholder={plan.name === 'Gratuit' ? 'Pas de Price ID (gratuit)' : 'price_xxxxxxxxxxxxx'}
                          disabled={plan.name === 'Gratuit'}
                          className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-slate-100 disabled:text-slate-500"
                        />
                        <button
                          onClick={() => handleUpdatePriceId(plan.id, plan.stripe_price_id || '')}
                          disabled={saving || plan.name === 'Gratuit'}
                          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                        >
                          <Save className="w-4 h-4" />
                          <span>Enregistrer</span>
                        </button>
                      </div>
                    </div>

                    {plan.name === 'Gratuit' && (
                      <p className="text-xs text-slate-500">
                        Le plan gratuit ne nécessite pas de Price ID Stripe
                      </p>
                    )}

                    {plan.name !== 'Gratuit' && !plan.stripe_price_id && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start space-x-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-800">
                          Ce plan n'a pas de Price ID configuré. Les utilisateurs ne pourront pas payer pour ce plan.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-6 mt-6 border border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Comment obtenir les Price IDs ?</h3>
          <ol className="space-y-3 text-sm text-slate-700">
            <li className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <div>
                <p className="font-semibold">Accédez au dashboard Stripe</p>
                <p className="text-slate-600">Connectez-vous à <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">dashboard.stripe.com</a></p>
              </div>
            </li>
            <li className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <div>
                <p className="font-semibold">Créez vos produits</p>
                <p className="text-slate-600">Allez dans "Produits" et créez un produit pour chaque plan</p>
              </div>
            </li>
            <li className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <div>
                <p className="font-semibold">Créez les prix</p>
                <p className="text-slate-600">Pour chaque produit, créez un prix récurrent (abonnement mensuel)</p>
              </div>
            </li>
            <li className="flex items-start space-x-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
              <div>
                <p className="font-semibold">Copiez les Price IDs</p>
                <p className="text-slate-600">Copiez l'ID de chaque prix (commence par "price_") et collez-le ci-dessus</p>
              </div>
            </li>
          </ol>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl p-6 mt-6">
          <div className="flex items-start space-x-4">
            <Check className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-bold text-green-900 mb-2">Workflow de paiement</h3>
              <ol className="space-y-2 text-sm text-green-900">
                <li className="flex items-start space-x-2">
                  <span className="font-bold">1.</span>
                  <span>L'utilisateur sélectionne un plan et crée un bon de commande</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="font-bold">2.</span>
                  <span>Vous validez le bon de commande en tant que super admin</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="font-bold">3.</span>
                  <span>L'utilisateur est redirigé vers Stripe pour payer</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="font-bold">4.</span>
                  <span>Après paiement réussi, l'abonnement est automatiquement activé</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="font-bold">5.</span>
                  <span>L'utilisateur bénéficie de 7 jours d'essai gratuit sur tous les plans payants</span>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
