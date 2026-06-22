import { useState, useEffect } from 'react';
import { Link } from '../components/Link';
import { Key, ArrowLeft, Check, Shield, CreditCard, Building } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Plan {
  id: string;
  name: string;
  included_keys: number;
  base_price: string;
}

export function CheckoutPage() {
  const { user, profile } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState('');

  const urlParams = new URLSearchParams(window.location.search);
  const planParam = urlParams.get('plan');

  useEffect(() => {
    loadPlans();
  }, []);

  useEffect(() => {
    if (plans.length > 0 && planParam) {
      const plan = plans.find(p => p.name.toLowerCase() === planParam.toLowerCase());
      if (plan) {
        setSelectedPlan(plan);
      }
    }
  }, [plans, planParam]);

  async function loadPlans() {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .neq('name', 'Gratuit')
        .order('included_keys');

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!user) {
      alert('Vous devez être connecté pour commander un plan');
      window.history.pushState({}, '', '/login');
      window.location.reload();
      return;
    }

    if (!profile?.agency_id) {
      alert('Impossible de créer une commande sans agence');
      return;
    }

    if (!selectedPlan) {
      alert('Veuillez sélectionner un plan');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('purchase_orders')
        .insert({
          agency_id: profile.agency_id,
          plan_id: selectedPlan.id,
          requested_by_user_id: profile.id,
          requested_keys_limit: selectedPlan.included_keys,
          total_amount: parseFloat(selectedPlan.base_price),
          notes: notes || null,
        });

      if (error) throw error;

      alert('Votre demande a été envoyée avec succès ! Un administrateur la validera prochainement.');
      window.history.pushState({}, '', '/dashboard/purchase-orders');
      window.location.reload();
    } catch (error) {
      console.error('Error creating purchase order:', error);
      alert('Erreur lors de la création de la demande');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <header className="bg-white/95 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Key className="w-8 h-8 text-amber-500" />
            <span className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">KeyManager</span>
          </div>
          <Link to="/pricing" className="flex items-center space-x-2 text-slate-600 hover:text-amber-600 font-medium transition">
            <ArrowLeft className="w-5 h-5" />
            <span>Retour aux tarifs</span>
          </Link>
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-slate-900 mb-4">
            Demande d'<span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">Abonnement</span>
          </h1>
          <p className="text-lg text-slate-600">
            Complétez votre demande et un administrateur la validera sous 24h
          </p>
        </div>

        {!user && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-8">
            <div className="flex items-start space-x-3">
              <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-blue-900 mb-2">Connexion requise</h3>
                <p className="text-blue-700 mb-4">
                  Vous devez créer un compte ou vous connecter pour commander un plan.
                </p>
                <div className="flex space-x-3">
                  <Link to="/login" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold">
                    Se connecter
                  </Link>
                  <Link to="/signup" className="px-4 py-2 bg-white text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition font-semibold">
                    Créer un compte
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl border-2 border-slate-200 overflow-hidden">
          <form onSubmit={handleSubmit}>
            <div className="p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center space-x-2">
                <CreditCard className="w-6 h-6 text-amber-600" />
                <span>Sélectionnez votre plan</span>
              </h2>

              <div className="grid md:grid-cols-2 gap-4 mb-8">
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlan(plan)}
                    className={`text-left p-6 rounded-xl border-2 transition-all ${
                      selectedPlan?.id === plan.id
                        ? 'border-amber-500 bg-amber-50 shadow-lg'
                        : 'border-slate-200 hover:border-amber-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                        <p className="text-sm text-slate-600 mt-1">
                          {plan.included_keys === 999999 ? 'Clés illimitées' : `${plan.included_keys} clés incluses`}
                        </p>
                      </div>
                      {selectedPlan?.id === plan.id && (
                        <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="text-3xl font-black text-amber-600">
                      {parseFloat(plan.base_price).toFixed(2)}€
                      <span className="text-sm text-slate-600 font-normal ml-2">/mois</span>
                    </div>
                  </button>
                ))}
              </div>

              {profile?.agency_id && (
                <div className="bg-slate-50 rounded-xl p-6 mb-6">
                  <div className="flex items-center space-x-2 text-slate-700 mb-2">
                    <Building className="w-5 h-5" />
                    <span className="font-semibold">Informations de facturation</span>
                  </div>
                  <div className="text-sm text-slate-600">
                    <p>Cette commande sera associée à votre agence</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Vous pouvez suivre l'état de votre demande dans la section "Bons de Commande"
                    </p>
                  </div>
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Notes complémentaires (optionnel)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Informations complémentaires, demandes particulières..."
                />
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
                <h3 className="font-bold text-blue-900 mb-3 flex items-center space-x-2">
                  <Shield className="w-5 h-5" />
                  <span>Processus de validation</span>
                </h3>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-start space-x-2">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Votre demande sera envoyée à un administrateur</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Validation sous 24h ouvrées maximum</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Vous recevrez une notification par email</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Activaton immédiate après validation</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-slate-50 p-8 border-t-2 border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Total</p>
                  <p className="text-3xl font-black text-slate-900">
                    {selectedPlan ? parseFloat(selectedPlan.base_price).toFixed(2) : '0.00'}€
                    <span className="text-sm text-slate-600 font-normal ml-2">/mois</span>
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={!selectedPlan || !user || submitting}
                  className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold hover:from-amber-600 hover:to-orange-600 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Envoi en cours...' : 'Envoyer la demande'}
                </button>
              </div>

              <p className="text-xs text-slate-500 text-center">
                En soumettant cette demande, vous acceptez nos conditions générales de vente
              </p>
            </div>
          </form>
        </div>

        <div className="mt-8 bg-white rounded-xl p-6 border-2 border-slate-200">
          <h3 className="font-bold text-slate-900 mb-4">Questions fréquentes</h3>
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-semibold text-slate-900 mb-1">Comment fonctionne la validation ?</p>
              <p className="text-slate-600">
                Un administrateur système examine votre demande et l'approuve généralement sous 24h. Vous recevrez un email de confirmation.
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-900 mb-1">Puis-je changer de plan plus tard ?</p>
              <p className="text-slate-600">
                Oui, vous pouvez soumettre une nouvelle demande à tout moment pour changer de plan ou ajuster votre nombre de clés.
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-900 mb-1">Y a-t-il un engagement ?</p>
              <p className="text-slate-600">
                Non, aucun engagement. Vous pouvez annuler à tout moment depuis votre espace d'administration.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
