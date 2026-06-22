import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useModal } from '../../contexts/ModalContext';
import { supabase } from '../../lib/supabase';
import { DashboardLayout } from '../../components/DashboardLayout';
import { Users, Shield, Plus, Trash2 } from 'lucide-react';

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'ADMIN' | 'COLLAB' | 'PRESTATAIRE';
  agency_id: string;
  agency_name?: string;
  created_at: string;
}

export function UsersPage() {
  const { profile } = useAuth();
  const { showSuccess, showError, showWarning } = useModal();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'COLLAB' as 'COLLAB' | 'PRESTATAIRE',
  });

  useEffect(() => {
    if (profile?.agency_id) {
      loadUsers();
    }
  }, [profile]);

  async function loadUsers() {
    try {
      let query = supabase
        .from('users')
        .select(`
          id,
          first_name,
          last_name,
          email,
          role,
          agency_id,
          created_at,
          is_super_admin,
          agencies!inner(name)
        `);

      if (!profile?.is_super_admin) {
        query = query.eq('agency_id', profile?.agency_id).eq('is_super_admin', false);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      const { data: authUsers } = await supabase.auth.admin.listUsers();

      const usersWithAgency = (data || []).map((user: any) => {
        const authUser = authUsers?.users.find(au => au.id === user.id);
        return {
          ...user,
          email: authUser?.email || user.email,
          agency_name: user.agencies?.name || 'N/A',
        };
      });

      setUsers(usersWithAgency);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile?.agency_id) return;

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.first_name,
            last_name: formData.last_name,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Échec de la création du compte');

      const { error: userError } = await supabase.from('users').insert({
        id: authData.user.id,
        agency_id: profile.agency_id,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        role: formData.role,
      });

      if (userError) throw userError;

      setShowModal(false);
      setFormData({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        role: 'COLLAB',
      });
      loadUsers();
      showSuccess('Succès', 'Utilisateur créé avec succès');
    } catch (error: any) {
      console.error('Error creating user:', error);
      showError('Erreur', `Erreur lors de la création: ${error.message}`);
    }
  }

  async function handleDelete(userId: string) {
    if (userId === profile?.id) {
      showWarning('Attention', 'Vous ne pouvez pas supprimer votre propre compte');
      return;
    }

    if (!confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;

    try {
      const { error } = await supabase.from('users').delete().eq('id', userId);

      if (error) throw error;

      const { error: authError } = await supabase.auth.admin.deleteUser(userId);
      if (authError) console.warn('Could not delete auth user:', authError);

      loadUsers();
      showSuccess('Succès', 'Utilisateur supprimé avec succès');
    } catch (error) {
      console.error('Error deleting user:', error);
      showError('Erreur', 'Erreur lors de la suppression de l\'utilisateur');
    }
  }

  const getRoleBadge = (role: string) => {
    const badges = {
      ADMIN: 'bg-red-100 text-red-700',
      COLLAB: 'bg-amber-100 text-amber-800',
      PRESTATAIRE: 'bg-green-100 text-green-700',
    };
    const labels = {
      ADMIN: 'Administrateur',
      COLLAB: 'Collaborateur',
      PRESTATAIRE: 'Prestataire',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badges[role as keyof typeof badges]}`}>
        {labels[role as keyof typeof labels]}
      </span>
    );
  };

  if (loading) {
    return (
      <DashboardLayout currentPage="users">
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-600">Chargement...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (profile?.role !== 'ADMIN') {
    return (
      <DashboardLayout currentPage="users">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
            <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Accès restreint</h3>
            <p className="text-slate-600">Seuls les administrateurs peuvent gérer les utilisateurs</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentPage="users">
      <div className="max-w-7xl mx-auto px-4 sm:px-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Utilisateurs</h1>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-secondary transition w-full sm:w-auto justify-center"
          >
            <Plus className="w-5 h-5" />
            <span>Nouvel utilisateur</span>
          </button>
        </div>

        {users.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Aucun utilisateur</h3>
            <p className="text-slate-600 mb-6">Les utilisateurs de votre agence apparaîtront ici</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-secondary transition inline-flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Ajouter un utilisateur</span>
            </button>
          </div>
        ) : (
          <>
            <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Nom</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Email</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Agence</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Rôle</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Date création</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-slate-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">
                        {user.first_name} {user.last_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{user.email}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 font-medium">{user.agency_name}</td>
                      <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {new Date(user.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {user.id !== profile?.id && user.role !== 'ADMIN' && (
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-4">
              {users.map((user) => (
                <div key={user.id} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-1">
                        {user.first_name} {user.last_name}
                      </h3>
                      <p className="text-sm text-slate-600 mb-1">{user.email}</p>
                      {getRoleBadge(user.role)}
                    </div>
                    {user.id !== profile?.id && user.role !== 'ADMIN' && (
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  <div className="text-sm space-y-1">
                    <div>
                      <span className="text-slate-500">Agence:</span>
                      <span className="text-slate-900 ml-2 font-medium">{user.agency_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Créé le:</span>
                      <span className="text-slate-900 ml-2">{new Date(user.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Rôles et permissions</h3>
          <div className="space-y-2 text-sm text-slate-700">
            <p><strong>Administrateur:</strong> Accès complet - gestion des utilisateurs, paramètres et abonnement (premier compte uniquement)</p>
            <p><strong>Collaborateur:</strong> Gestion des biens, clés, mouvements et contacts</p>
            <p><strong>Prestataire:</strong> Accès limité aux clés qui lui sont attribuées</p>
          </div>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Nouvel utilisateur</h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="first_name" className="block text-sm font-medium text-slate-700 mb-1">
                    Prénom *
                  </label>
                  <input
                    id="first_name"
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label htmlFor="last_name" className="block text-sm font-medium text-slate-700 mb-1">
                    Nom *
                  </label>
                  <input
                    id="last_name"
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                    Email *
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                    Mot de passe *
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Minimum 6 caractères"
                  />
                </div>

                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-slate-700 mb-1">
                    Rôle *
                  </label>
                  <select
                    id="role"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as 'COLLAB' | 'PRESTATAIRE' })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="COLLAB">Collaborateur</option>
                    <option value="PRESTATAIRE">Prestataire</option>
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    Les collaborateurs ont accès à toutes les fonctionnalités sauf l'administration
                  </p>
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 bg-slate-100 text-slate-700 px-6 py-3 rounded-lg hover:bg-slate-200 transition"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-primary text-white px-6 py-3 rounded-lg hover:bg-secondary transition"
                  >
                    Créer
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
