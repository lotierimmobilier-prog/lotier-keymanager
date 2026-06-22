import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { DashboardLayout } from '../../components/DashboardLayout';
import { Save, MoveUp, MoveDown, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { Button } from '../../components/Button';

interface MenuPreference {
  id: string;
  menu_item_id: string;
  display_order: number;
  is_visible: boolean;
}

interface MenuItem {
  id: string;
  name: string;
  display_order: number;
  is_visible: boolean;
}

const DEFAULT_MENU_ITEMS = [
  { id: 'dashboard', name: 'Dashboard' },
  { id: 'profile', name: 'Mon Profil' },
  { id: 'agency', name: 'Agence' },
  { id: 'properties', name: 'Biens et Clés' },
  { id: 'key-management', name: 'Gestion des Clés' },
  { id: 'contacts', name: 'Contacts' },
  { id: 'users', name: 'Utilisateurs' },
  { id: 'stats', name: 'Statistiques' },
  { id: 'announcements', name: 'Annonces' },
  { id: 'sms-config', name: 'Configuration SMS' },
  { id: 'purchase-orders', name: 'Bons de Commande' },
  { id: 'subscription', name: 'Abonnement' },
  { id: 'branding', name: 'Personnalisation' },
  { id: 'settings', name: 'Paramètres' },
];

export default function MenuOrderPage() {
  const { profile } = useAuth();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.agency_id && profile?.role === 'ADMIN') {
      loadMenuPreferences();
    }
  }, [profile]);

  async function loadMenuPreferences() {
    if (!profile?.agency_id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('agency_menu_preferences')
        .select('*')
        .eq('agency_id', profile.agency_id)
        .order('display_order', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const items = data.map((pref) => {
          const defaultItem = DEFAULT_MENU_ITEMS.find((item) => item.id === pref.menu_item_id);
          return {
            id: pref.menu_item_id,
            name: defaultItem?.name || pref.menu_item_id,
            display_order: pref.display_order,
            is_visible: pref.is_visible,
          };
        });
        setMenuItems(items);
      } else {
        const defaultItems = DEFAULT_MENU_ITEMS.map((item, index) => ({
          id: item.id,
          name: item.name,
          display_order: index,
          is_visible: true,
        }));
        setMenuItems(defaultItems);
      }
    } catch (error) {
      console.error('Error loading menu preferences:', error);
      const defaultItems = DEFAULT_MENU_ITEMS.map((item, index) => ({
        id: item.id,
        name: item.name,
        display_order: index,
        is_visible: true,
      }));
      setMenuItems(defaultItems);
    } finally {
      setLoading(false);
    }
  }

  function moveUp(index: number) {
    if (index === 0) return;
    const newItems = [...menuItems];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    newItems.forEach((item, idx) => {
      item.display_order = idx;
    });
    setMenuItems(newItems);
  }

  function moveDown(index: number) {
    if (index === menuItems.length - 1) return;
    const newItems = [...menuItems];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    newItems.forEach((item, idx) => {
      item.display_order = idx;
    });
    setMenuItems(newItems);
  }

  function toggleVisibility(index: number) {
    const newItems = [...menuItems];
    newItems[index].is_visible = !newItems[index].is_visible;
    setMenuItems(newItems);
  }

  async function handleSave() {
    if (!profile?.agency_id) return;

    try {
      setSaving(true);

      const { error: deleteError } = await supabase
        .from('agency_menu_preferences')
        .delete()
        .eq('agency_id', profile.agency_id);

      if (deleteError) throw deleteError;

      const preferences = menuItems.map((item) => ({
        agency_id: profile.agency_id,
        menu_item_id: item.id,
        display_order: item.display_order,
        is_visible: item.is_visible,
      }));

      const { error: insertError } = await supabase
        .from('agency_menu_preferences')
        .insert(preferences);

      if (insertError) throw insertError;

      alert('Ordre du menu sauvegardé avec succès. Rafraîchissez la page pour voir les changements.');
    } catch (error) {
      console.error('Error saving menu preferences:', error);
      alert('Erreur lors de la sauvegarde des préférences du menu');
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!confirm('Voulez-vous vraiment réinitialiser l\'ordre du menu par défaut ?')) return;

    const defaultItems = DEFAULT_MENU_ITEMS.map((item, index) => ({
      id: item.id,
      name: item.name,
      display_order: index,
      is_visible: true,
    }));
    setMenuItems(defaultItems);
  }

  if (profile?.role !== 'ADMIN') {
    return (
      <DashboardLayout currentPage="settings">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-700">Cette page est réservée aux administrateurs.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout currentPage="settings">
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-600">Chargement...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentPage="settings">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Ordre du Menu</h1>
          <p className="text-slate-600">
            Personnalisez l'ordre d'affichage et la visibilité des éléments du menu de navigation.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Éléments du menu</h2>
              <p className="text-sm text-slate-600 mt-1">
                Glissez les éléments pour changer leur ordre, ou utilisez les boutons.
              </p>
            </div>
            <button
              onClick={handleReset}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 transition flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Réinitialiser
            </button>
          </div>

          <div className="divide-y divide-slate-200">
            {menuItems.map((item, index) => (
              <div
                key={item.id}
                className="p-4 flex items-center justify-between hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="text-slate-400 font-mono text-sm min-w-[2rem]">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">{item.name}</div>
                    <div className="text-xs text-slate-500">{item.id}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleVisibility(index)}
                    className={`p-2 rounded-lg transition ${
                      item.is_visible
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                    title={item.is_visible ? 'Masquer' : 'Afficher'}
                  >
                    {item.is_visible ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    onClick={() => moveUp(index)}
                    disabled={index === 0}
                    className="p-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Déplacer vers le haut"
                  >
                    <MoveUp className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => moveDown(index)}
                    disabled={index === menuItems.length - 1}
                    className="p-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Déplacer vers le bas"
                  >
                    <MoveDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
            <p className="text-sm text-slate-600">
              Les modifications ne seront appliquées qu'après enregistrement.
            </p>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Enregistrement...' : 'Enregistrer l\'ordre'}
            </Button>
          </div>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Note importante</h3>
          <p className="text-sm text-blue-700">
            Après avoir sauvegardé, rafraîchissez la page pour voir les changements appliqués au menu de navigation.
            Les éléments masqués n'apparaîtront plus dans le menu.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
