import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useModal } from '../../contexts/ModalContext';
import { supabase } from '../../lib/supabase';
import { DashboardLayout } from '../../components/DashboardLayout';
import { User, Mail, Lock, Save, Eye, EyeOff } from 'lucide-react';

export function ProfilePage() {
  const { profile, user } = useAuth();
  const { showSuccess, showError, showWarning } = useModal();
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
      });
    }
  }, [profile]);

  async function handleProfileUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!profile?.id) return;

    setLoading(true);
    try {
      const currentEmail = profile.email;
      const emailChanged = formData.email !== currentEmail;

      const { error: profileError } = await supabase
        .from('users')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
        })
        .eq('id', profile.id);

      if (profileError) throw profileError;

      if (emailChanged) {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;

        if (!token) {
          throw new Error('Session invalide');
        }

        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-user-email`;
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: profile.id,
            newEmail: formData.email,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erreur lors de la mise à jour de l\'email');
        }

        showSuccess(
          'Profil mis à jour',
          'Profil mis à jour avec succès !\n\nL\'email a été modifié. Veuillez vous reconnecter.'
        );

        setTimeout(async () => {
          await supabase.auth.signOut();
          window.location.href = '/login';
        }, 2000);
      } else {
        showSuccess('Profil mis à jour', 'Profil mis à jour avec succès !');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      showError('Erreur', 'Erreur lors de la mise à jour : ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showWarning('Attention', 'Les mots de passe ne correspondent pas');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      showWarning('Attention', 'Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      showSuccess('Succès', 'Mot de passe modifié avec succès !');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      console.error('Error changing password:', error);
      showError('Erreur', 'Erreur lors du changement de mot de passe : ' + error.message);
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <DashboardLayout currentPage="profile">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center space-x-3 mb-8">
          <User className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-slate-900">Mon Profil</h1>
        </div>

        <div className="grid gap-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-xl font-semibold text-slate-900">Informations personnelles</h2>
              <p className="text-sm text-slate-600 mt-1">
                Modifiez vos informations de profil
              </p>
            </div>

            <form onSubmit={handleProfileUpdate} className="p-6 space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Jean"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nom *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Dupont"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="jean.dupont@email.com"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Si vous changez votre email, vous devrez confirmer la nouvelle adresse
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="+33 6 12 34 56 78"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <div className="text-sm text-slate-600">
                  <p>Rôle : <span className="font-semibold text-slate-900">{profile?.role}</span></p>
                  <p className="mt-1">Agence : <span className="font-semibold text-slate-900">{profile?.agency_id ? 'Membre' : 'Aucune'}</span></p>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center space-x-2 bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
                >
                  <Save className="w-5 h-5" />
                  <span>{loading ? 'Enregistrement...' : 'Enregistrer les modifications'}</span>
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <h2 className="text-xl font-semibold text-slate-900">Sécurité</h2>
              <p className="text-sm text-slate-600 mt-1">
                Modifiez votre mot de passe
              </p>
            </div>

            <form onSubmit={handlePasswordChange} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Lock className="w-4 h-4 inline mr-1" />
                  Nouveau mot de passe *
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary pr-10"
                    placeholder="Nouveau mot de passe"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Au moins 6 caractères
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Confirmer le nouveau mot de passe *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary pr-10"
                    placeholder="Confirmer le mot de passe"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="flex items-center space-x-2 bg-slate-700 text-white px-6 py-3 rounded-lg hover:bg-slate-800 transition disabled:opacity-50"
                >
                  <Lock className="w-5 h-5" />
                  <span>{passwordLoading ? 'Modification...' : 'Changer le mot de passe'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
