import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useModal } from '../../contexts/ModalContext';
import { supabase } from '../../lib/supabase';
import { DashboardLayout } from '../../components/DashboardLayout';
import { Plus, Pencil, Trash2, Users, Upload, Download, Search, Info } from 'lucide-react';

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  company: string;
  phone: string;
  email: string;
  notes: string | null;
  created_at: string;
}

export function ContactsPage() {
  const { profile } = useAuth();
  const { showSuccess, showError, showWarning, showConfirm } = useModal();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showFormatModal, setShowFormatModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    company: '',
    phone: '',
    email: '',
    notes: '',
  });

  useEffect(() => {
    if (profile?.agency_id) {
      loadContacts();
    }
  }, [profile]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredContacts(contacts);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = contacts.filter(
        (c) =>
          c.first_name.toLowerCase().includes(term) ||
          c.last_name.toLowerCase().includes(term) ||
          c.company.toLowerCase().includes(term) ||
          c.email.toLowerCase().includes(term) ||
          c.phone.includes(term)
      );
      setFilteredContacts(filtered);
    }
  }, [searchTerm, contacts]);

  async function loadContacts() {
    if (!profile?.agency_id) return;

    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('agency_id', profile.agency_id)
        .order('last_name', { ascending: true });

      if (error) throw error;
      setContacts(data || []);
      setFilteredContacts(data || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile?.agency_id) return;

    try {
      if (editingContact) {
        const { error } = await supabase
          .from('contacts')
          .update({
            first_name: formData.first_name,
            last_name: formData.last_name,
            company: formData.company,
            phone: formData.phone,
            email: formData.email,
            notes: formData.notes || null,
          })
          .eq('id', editingContact.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('contacts').insert({
          agency_id: profile.agency_id,
          first_name: formData.first_name,
          last_name: formData.last_name,
          company: formData.company,
          phone: formData.phone,
          email: formData.email,
          notes: formData.notes || null,
        });

        if (error) throw error;
      }

      setShowModal(false);
      setEditingContact(null);
      setFormData({
        first_name: '',
        last_name: '',
        company: '',
        phone: '',
        email: '',
        notes: '',
      });
      loadContacts();
    } catch (error) {
      console.error('Error saving contact:', error);
      showError('Erreur', 'Erreur lors de la sauvegarde du contact');
    }
  }

  async function handleDelete(id: string) {
    const confirmed = await showConfirm({
      title: 'Supprimer le contact',
      message: 'Êtes-vous sûr de vouloir supprimer ce contact ?',
      confirmText: 'Supprimer',
      cancelText: 'Annuler'
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase.from('contacts').delete().eq('id', id);

      if (error) throw error;
      loadContacts();
    } catch (error) {
      console.error('Error deleting contact:', error);
      showError('Erreur', 'Erreur lors de la suppression du contact');
    }
  }

  function openModal(contact?: Contact) {
    if (contact) {
      setEditingContact(contact);
      setFormData({
        first_name: contact.first_name,
        last_name: contact.last_name,
        company: contact.company,
        phone: contact.phone,
        email: contact.email,
        notes: contact.notes || '',
      });
    } else {
      setEditingContact(null);
      setFormData({
        first_name: '',
        last_name: '',
        company: '',
        phone: '',
        email: '',
        notes: '',
      });
    }
    setShowModal(true);
  }

  function exportToCSV() {
    const headers = ['Prénom', 'Nom', 'Entreprise', 'Téléphone', 'Email', 'Notes'];
    const csvContent = [
      headers.join(','),
      ...contacts.map((c) =>
        [
          c.first_name,
          c.last_name,
          c.company,
          c.phone,
          c.email,
          c.notes || '',
        ]
          .map((field) => `"${field}"`)
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `contacts_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function handleCSVImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile?.agency_id) return;

    try {
      const text = await file.text();
      const lines = text.split('\n').filter((line) => line.trim());

      if (lines.length < 2) {
        showWarning('Attention', 'Le fichier CSV est vide ou invalide');
        return;
      }

      const dataLines = lines.slice(1);
      const contactsToImport = [];

      for (const line of dataLines) {
        const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        if (!matches || matches.length < 2) continue;

        const cleanValue = (val: string) => val.replace(/^"|"$/g, '').trim();

        contactsToImport.push({
          agency_id: profile.agency_id,
          first_name: cleanValue(matches[0] || ''),
          last_name: cleanValue(matches[1] || ''),
          company: cleanValue(matches[2] || ''),
          phone: cleanValue(matches[3] || ''),
          email: cleanValue(matches[4] || ''),
          notes: cleanValue(matches[5] || '') || null,
        });
      }

      if (contactsToImport.length === 0) {
        showWarning('Attention', 'Aucun contact valide trouvé dans le fichier');
        return;
      }

      const { error } = await supabase.from('contacts').insert(contactsToImport);

      if (error) throw error;

      showSuccess('Succès', `${contactsToImport.length} contact(s) importé(s) avec succès`);
      loadContacts();
    } catch (error) {
      console.error('Error importing CSV:', error);
      showError('Erreur', 'Erreur lors de l\'importation du fichier CSV');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  if (loading) {
    return (
      <DashboardLayout currentPage="contacts">
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-600">Chargement...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentPage="contacts">
      <div className="max-w-7xl mx-auto px-4 sm:px-0">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Annuaire contacts</h1>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCSVImport}
              className="hidden"
            />
            <button
              onClick={() => setShowFormatModal(true)}
              className="flex items-center space-x-2 bg-blue-100 text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-200 transition text-sm"
            >
              <Info className="w-4 h-4" />
              <span className="hidden sm:inline">Format CSV</span>
              <span className="sm:hidden">Format</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-2 bg-slate-100 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-200 transition text-sm"
            >
              <Upload className="w-4 h-4" />
              <span>Importer</span>
            </button>
            {contacts.length > 0 && (
              <button
                onClick={exportToCSV}
                className="flex items-center space-x-2 bg-slate-100 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-200 transition text-sm"
              >
                <Download className="w-4 h-4" />
                <span>Exporter</span>
              </button>
            )}
            <button
              onClick={() => openModal()}
              className="flex items-center space-x-2 bg-primary text-white px-3 py-2 rounded-lg hover:bg-secondary transition text-sm flex-1 sm:flex-none justify-center"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau</span>
            </button>
          </div>
        </div>

        {contacts.length > 0 && (
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher un contact..."
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        )}

        {contacts.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
            <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              Aucun contact enregistré
            </h3>
            <p className="text-slate-600 mb-6">
              Ajoutez des contacts manuellement ou importez un fichier CSV
            </p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-slate-100 text-slate-700 px-6 py-3 rounded-lg hover:bg-slate-200 transition inline-flex items-center space-x-2"
              >
                <Upload className="w-5 h-5" />
                <span>Importer CSV</span>
              </button>
              <button
                onClick={() => openModal()}
                className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-secondary transition inline-flex items-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>Ajouter un contact</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">
                    Nom
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">
                    Entreprise
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">
                    Téléphone
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">
                    Email
                  </th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-slate-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredContacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">
                        {contact.first_name} {contact.last_name}
                      </div>
                      {contact.notes && (
                        <div className="text-xs text-slate-500 mt-1">{contact.notes}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{contact.company || '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{contact.phone || '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{contact.email || '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => openModal(contact)}
                          className="p-2 text-amber-700 hover:bg-amber-50 rounded-lg transition"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(contact.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">
                {editingContact ? 'Modifier le contact' : 'Nouveau contact'}
              </h2>

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
                    placeholder="Jean"
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
                    placeholder="Dupont"
                  />
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-slate-700 mb-1">
                    Entreprise
                  </label>
                  <input
                    id="company"
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="ABC Services"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">
                    Téléphone
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="06 12 34 56 78"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="contact@exemple.fr"
                  />
                </div>

                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Notes supplémentaires..."
                  />
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingContact(null);
                    }}
                    className="flex-1 bg-slate-100 text-slate-700 px-6 py-3 rounded-lg hover:bg-slate-200 transition"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-primary text-white px-6 py-3 rounded-lg hover:bg-secondary transition"
                  >
                    {editingContact ? 'Modifier' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showFormatModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-2xl mx-4">
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900">Format du fichier CSV</h2>
              </div>

              <div className="p-6 space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-blue-900 mb-1">Instructions</h3>
                      <p className="text-sm text-blue-800">
                        Le fichier CSV doit contenir les colonnes suivantes dans cet ordre exact. La première ligne doit être l'en-tête avec les noms des colonnes.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900 mb-3">Colonnes obligatoires :</h3>
                  <div className="bg-slate-50 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                    <div className="text-amber-600 font-semibold mb-2">first_name,last_name,company,phone,email,notes</div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900 mb-3">Exemple de fichier CSV :</h3>
                  <div className="bg-slate-900 rounded-lg p-4 text-white font-mono text-sm overflow-x-auto">
                    <div className="text-green-400">first_name,last_name,company,phone,email,notes</div>
                    <div className="text-slate-300">Jean,Dupont,Entreprise ABC,0612345678,jean.dupont@exemple.fr,Client VIP</div>
                    <div className="text-slate-300">Marie,Martin,Société XYZ,0698765432,marie.martin@exemple.fr,</div>
                    <div className="text-slate-300">Pierre,Durand,Agence 123,0623456789,p.durand@exemple.fr,Nouveau contact</div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h3 className="font-semibold text-amber-900 mb-2">Points importants :</h3>
                  <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                    <li>Les colonnes doivent être séparées par des virgules</li>
                    <li>La colonne "notes" peut être vide</li>
                    <li>Utilisez le format UTF-8 pour éviter les problèmes d'encodage</li>
                    <li>N'utilisez pas de guillemets sauf si le contenu contient des virgules</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">Télécharger un modèle :</h3>
                  <button
                    onClick={() => {
                      const template = 'first_name,last_name,company,phone,email,notes\nJean,Dupont,Entreprise ABC,0612345678,jean.dupont@exemple.fr,Client VIP\n';
                      const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
                      const link = document.createElement('a');
                      link.href = URL.createObjectURL(blob);
                      link.download = 'modele_contacts.csv';
                      link.click();
                    }}
                    className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                  >
                    <Download className="w-5 h-5" />
                    <span>Télécharger le modèle CSV</span>
                  </button>
                </div>
              </div>

              <div className="border-t border-slate-200 p-6">
                <button
                  onClick={() => setShowFormatModal(false)}
                  className="w-full bg-slate-100 text-slate-700 px-6 py-3 rounded-lg hover:bg-slate-200 transition font-medium"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
