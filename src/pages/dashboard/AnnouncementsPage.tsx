import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { DashboardLayout } from '../../components/DashboardLayout';
import { Plus, Pencil, Trash2, MessageSquare, Info, AlertCircle, BookOpen } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'information' | 'tutorial' | 'alert';
  created_at: string;
  is_active: boolean;
}

export function AnnouncementsPage() {
  const { profile } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'information' as 'information' | 'tutorial' | 'alert',
    is_active: true,
  });

  useEffect(() => {
    if (profile?.agency_id && profile?.role === 'ADMIN') {
      loadAnnouncements();
    }
  }, [profile]);

  async function loadAnnouncements() {
    if (!profile?.agency_id) return;

    try {
      const { data, error } = await supabase
        .from('agency_announcements')
        .select('*')
        .eq('agency_id', profile.agency_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error loading announcements:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile?.agency_id || !profile?.id) return;

    try {
      if (editingAnnouncement) {
        const { error } = await supabase
          .from('agency_announcements')
          .update({
            title: formData.title,
            content: formData.content,
            type: formData.type,
            is_active: formData.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingAnnouncement.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('agency_announcements')
          .insert({
            agency_id: profile.agency_id,
            title: formData.title,
            content: formData.content,
            type: formData.type,
            is_active: formData.is_active,
            created_by: profile.id,
          });

        if (error) throw error;
      }

      setShowModal(false);
      setEditingAnnouncement(null);
      setFormData({ title: '', content: '', type: 'information', is_active: true });
      loadAnnouncements();
    } catch (error) {
      console.error('Error saving announcement:', error);
      alert('Erreur lors de la sauvegarde de l\'annonce');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette annonce ?')) return;

    try {
      const { error } = await supabase
        .from('agency_announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadAnnouncements();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      alert('Erreur lors de la suppression de l\'annonce');
    }
  }

  function openModal(announcement?: Announcement) {
    if (announcement) {
      setEditingAnnouncement(announcement);
      setFormData({
        title: announcement.title,
        content: announcement.content,
        type: announcement.type,
        is_active: announcement.is_active,
      });
    } else {
      setEditingAnnouncement(null);
      setFormData({ title: '', content: '', type: 'information', is_active: true });
    }
    setShowModal(true);
  }

  function getTypeIcon(type: string) {
    switch (type) {
      case 'tutorial':
        return <BookOpen className="w-5 h-5" />;
      case 'alert':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  }

  function getTypeColor(type: string) {
    switch (type) {
      case 'tutorial':
        return 'bg-blue-100 text-blue-700';
      case 'alert':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-green-100 text-green-700';
    }
  }

  if (profile?.role !== 'ADMIN') {
    return (
      <DashboardLayout currentPage="announcements">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
            <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Accès réservé</h3>
            <p className="text-slate-600">Cette page est réservée aux administrateurs</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout currentPage="announcements">
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-600">Chargement...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentPage="announcements">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Annonces de l'agence</h1>
          <button
            onClick={() => openModal()}
            className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-secondary transition"
          >
            <Plus className="w-5 h-5" />
            <span>Nouvelle annonce</span>
          </button>
        </div>

        {announcements.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
            <MessageSquare className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Aucune annonce</h3>
            <p className="text-slate-600 mb-6">Créez votre première annonce pour informer votre équipe</p>
            <button
              onClick={() => openModal()}
              className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-secondary transition inline-flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Créer une annonce</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className={`p-2 rounded-lg ${getTypeColor(announcement.type)}`}>
                        {getTypeIcon(announcement.type)}
                      </div>
                      <h3 className="text-xl font-semibold text-slate-900">{announcement.title}</h3>
                      {!announcement.is_active && (
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                          Masquée
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 whitespace-pre-wrap">{announcement.content}</p>
                    <p className="text-sm text-slate-400 mt-3">
                      {new Date(announcement.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => openModal(announcement)}
                      className="p-2 text-amber-700 hover:bg-amber-50 rounded-lg transition"
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(announcement.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full mx-4 flex flex-col" style={{ maxWidth: '600px', maxHeight: '90vh' }}>
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900">
                  {editingAnnouncement ? 'Modifier l\'annonce' : 'Nouvelle annonce'}
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                <div className="overflow-y-auto px-6 py-4 space-y-4">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">
                      Titre *
                    </label>
                    <input
                      id="title"
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Titre de l'annonce"
                    />
                  </div>

                  <div>
                    <label htmlFor="type" className="block text-sm font-medium text-slate-700 mb-1">
                      Type *
                    </label>
                    <select
                      id="type"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as 'information' | 'tutorial' | 'alert' })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="information">Information</option>
                      <option value="tutorial">Tutoriel</option>
                      <option value="alert">Alerte</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="content" className="block text-sm font-medium text-slate-700 mb-1">
                      Contenu *
                    </label>
                    <textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      required
                      rows={8}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Contenu de l'annonce"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      id="is_active"
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 text-amber-600 border-slate-300 rounded focus:ring-primary"
                    />
                    <label htmlFor="is_active" className="ml-2 text-sm text-slate-700">
                      Annonce visible
                    </label>
                  </div>
                </div>

                <div className="border-t border-slate-200 p-6 bg-slate-50 flex space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingAnnouncement(null);
                    }}
                    className="flex-1 bg-slate-100 text-slate-700 px-6 py-3 rounded-lg hover:bg-slate-200 transition"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-primary text-white px-6 py-3 rounded-lg hover:bg-secondary transition"
                  >
                    {editingAnnouncement ? 'Modifier' : 'Créer'}
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
