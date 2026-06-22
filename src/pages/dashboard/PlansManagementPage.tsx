import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { DashboardLayout } from '../../components/DashboardLayout';
import { Package, Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import { formatKeyLimit } from '../../utils/constants';

interface Plan {
  id: string;
  name: string;
  included_keys: number;
  base_price: string;
}

interface PlanFeature {
  id: string;
  plan_id: string;
  feature_name: string;
  feature_description: string | null;
  is_included: boolean;
  display_order: number;
}

export function PlansManagementPage() {
  const { profile } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [features, setFeatures] = useState<PlanFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [editingFeature, setEditingFeature] = useState<PlanFeature | null>(null);
  const [featureForm, setFeatureForm] = useState({
    feature_name: '',
    feature_description: '',
    is_included: true,
    display_order: 0,
  });

  useEffect(() => {
    if (profile?.is_super_admin) {
      loadPlans();
    }
  }, [profile]);

  useEffect(() => {
    if (selectedPlan) {
      loadFeatures(selectedPlan.id);
    }
  }, [selectedPlan]);

  async function loadPlans() {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('included_keys');

      if (error) throw error;
      setPlans(data || []);
      if (data && data.length > 0) {
        setSelectedPlan(data[0]);
      }
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadFeatures(planId: string) {
    try {
      const { data, error } = await supabase
        .from('plan_features')
        .select('*')
        .eq('plan_id', planId)
        .order('display_order');

      if (error) throw error;
      setFeatures(data || []);
    } catch (error) {
      console.error('Error loading features:', error);
    }
  }

  async function handleSaveFeature(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedPlan) {
      alert('Veuillez sélectionner un plan');
      return;
    }

    try {
      if (editingFeature) {
        const { error } = await supabase
          .from('plan_features')
          .update({
            feature_name: featureForm.feature_name,
            feature_description: featureForm.feature_description || null,
            is_included: featureForm.is_included,
            display_order: featureForm.display_order,
          })
          .eq('id', editingFeature.id);

        if (error) throw error;
        alert('Fonctionnalité mise à jour');
      } else {
        const { error } = await supabase
          .from('plan_features')
          .insert({
            plan_id: selectedPlan.id,
            feature_name: featureForm.feature_name,
            feature_description: featureForm.feature_description || null,
            is_included: featureForm.is_included,
            display_order: featureForm.display_order,
          });

        if (error) throw error;
        alert('Fonctionnalité ajoutée');
      }

      setShowFeatureModal(false);
      setEditingFeature(null);
      setFeatureForm({
        feature_name: '',
        feature_description: '',
        is_included: true,
        display_order: 0,
      });
      loadFeatures(selectedPlan.id);
    } catch (error) {
      console.error('Error saving feature:', error);
      alert('Erreur lors de l\'enregistrement');
    }
  }

  async function handleDeleteFeature(featureId: string, featureName: string) {
    if (!confirm(`Voulez-vous vraiment supprimer la fonctionnalité "${featureName}" ?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('plan_features')
        .delete()
        .eq('id', featureId);

      if (error) throw error;
      alert('Fonctionnalité supprimée');
      if (selectedPlan) {
        loadFeatures(selectedPlan.id);
      }
    } catch (error) {
      console.error('Error deleting feature:', error);
      alert('Erreur lors de la suppression');
    }
  }

  function openAddFeatureModal() {
    setEditingFeature(null);
    setFeatureForm({
      feature_name: '',
      feature_description: '',
      is_included: true,
      display_order: features.length,
    });
    setShowFeatureModal(true);
  }

  function openEditFeatureModal(feature: PlanFeature) {
    setEditingFeature(feature);
    setFeatureForm({
      feature_name: feature.feature_name,
      feature_description: feature.feature_description || '',
      is_included: feature.is_included,
      display_order: feature.display_order,
    });
    setShowFeatureModal(true);
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
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Gestion des Plans et Fonctionnalités</h1>
          <p className="text-slate-600">Gérez les détails et fonctionnalités de chaque plan d'abonnement</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Plans disponibles</h2>
              <div className="space-y-2">
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition ${
                      selectedPlan?.id === plan.id
                        ? 'border-primary bg-amber-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-slate-900">{plan.name}</div>
                    <div className="text-sm text-slate-600 mt-1">
                      {formatKeyLimit(plan.included_keys)} - {parseFloat(plan.base_price).toFixed(2)}€/mois
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedPlan && (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                <div className="p-6 border-b border-slate-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">{selectedPlan.name}</h2>
                      <p className="text-slate-600 mt-1">
                        {formatKeyLimit(selectedPlan.included_keys)} - {parseFloat(selectedPlan.base_price).toFixed(2)}€/mois
                      </p>
                    </div>
                    <button
                      onClick={openAddFeatureModal}
                      className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary transition"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Ajouter</span>
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {features.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p>Aucune fonctionnalité définie</p>
                      <p className="text-sm mt-1">Cliquez sur "Ajouter" pour commencer</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {features.map((feature) => (
                        <div
                          key={feature.id}
                          className="flex items-start justify-between p-4 bg-slate-50 rounded-lg border border-slate-200"
                        >
                          <div className="flex items-start space-x-3 flex-1">
                            {feature.is_included ? (
                              <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            ) : (
                              <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <h3 className="font-semibold text-slate-900">{feature.feature_name}</h3>
                              {feature.feature_description && (
                                <p className="text-sm text-slate-600 mt-1">{feature.feature_description}</p>
                              )}
                              <p className="text-xs text-slate-500 mt-1">Ordre: {feature.display_order}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              onClick={() => openEditFeatureModal(feature)}
                              className="p-2 hover:bg-blue-50 rounded transition"
                              title="Modifier"
                            >
                              <Edit2 className="w-4 h-4 text-blue-600" />
                            </button>
                            <button
                              onClick={() => handleDeleteFeature(feature.id, feature.feature_name)}
                              className="p-2 hover:bg-red-50 rounded transition"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {showFeatureModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-xl font-bold text-slate-900">
                  {editingFeature ? 'Modifier la fonctionnalité' : 'Ajouter une fonctionnalité'}
                </h2>
              </div>
              <form onSubmit={handleSaveFeature} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nom de la fonctionnalité *
                  </label>
                  <input
                    type="text"
                    value={featureForm.feature_name}
                    onChange={(e) => setFeatureForm({ ...featureForm, feature_name: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Ex: Support prioritaire"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Description (optionnel)
                  </label>
                  <textarea
                    value={featureForm.feature_description}
                    onChange={(e) => setFeatureForm({ ...featureForm, feature_description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Description détaillée de la fonctionnalité"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Ordre d'affichage
                  </label>
                  <input
                    type="number"
                    value={featureForm.display_order}
                    onChange={(e) => setFeatureForm({ ...featureForm, display_order: parseInt(e.target.value) })}
                    min="0"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_included"
                    checked={featureForm.is_included}
                    onChange={(e) => setFeatureForm({ ...featureForm, is_included: e.target.checked })}
                    className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-2 focus:ring-primary"
                  />
                  <label htmlFor="is_included" className="ml-2 text-sm text-slate-700">
                    Fonctionnalité incluse dans ce plan
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowFeatureModal(false);
                      setEditingFeature(null);
                    }}
                    className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary transition"
                  >
                    {editingFeature ? 'Mettre à jour' : 'Ajouter'}
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
