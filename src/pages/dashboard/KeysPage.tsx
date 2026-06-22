import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { DashboardLayout } from '../../components/DashboardLayout';
import { Plus, Edit, Trash2, Key, AlertCircle, Camera, Upload, QrCode } from 'lucide-react';
import { isUnlimited, formatKeyLimit } from '../../utils/constants';
import { QrCodeGenerator } from '../../components/QrCodeGenerator';

interface KeyItem {
  id: string;
  label: string;
  code: string | null;
  status: 'AVAILABLE' | 'OUT' | 'LOST' | 'ARCHIVED';
  property_id: string | null;
  service_type: string;
  photo_url: string | null;
  key_entrance: boolean;
  key_mailbox: boolean;
  key_badge: boolean;
  key_parking: boolean;
  key_bike: boolean;
  key_building: boolean;
  key_other: string | null;
  property?: {
    reference: string;
    address: string;
  };
  created_at: string;
}

interface Property {
  id: string;
  reference: string;
  address: string;
}

export function KeysPage() {
  const { profile } = useAuth();
  const [keys, setKeys] = useState<KeyItem[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingKey, setEditingKey] = useState<KeyItem | null>(null);
  const [maxKeys, setMaxKeys] = useState(10);
  const [activeKeysCount, setActiveKeysCount] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedKeyForQr, setSelectedKeyForQr] = useState<KeyItem | null>(null);
  const [formData, setFormData] = useState({
    label: '',
    code: '',
    property_id: '',
    service_type: 'AUTRE',
    status: 'AVAILABLE' as const,
    photo_url: '',
    key_entrance: false,
    key_mailbox: false,
    key_badge: false,
    key_parking: false,
    key_bike: false,
    key_building: false,
    key_other: '',
  });

  useEffect(() => {
    if (profile?.agency_id) {
      loadData();
    }
  }, [profile]);

  async function loadData() {
    if (!profile?.agency_id) return;

    try {
      const [keysResult, propertiesResult, agencyResult, subscriptionResult] = await Promise.all([
        supabase
          .from('keys')
          .select(`
            *,
            properties:property_id (
              reference,
              address
            )
          `)
          .eq('agency_id', profile.agency_id)
          .order('created_at', { ascending: false }),
        supabase
          .from('properties')
          .select('id, reference, address')
          .eq('agency_id', profile.agency_id),
        supabase
          .from('agencies')
          .select('max_keys')
          .eq('id', profile.agency_id)
          .single(),
        supabase
          .from('subscriptions')
          .select('current_keys_limit, status')
          .eq('agency_id', profile.agency_id)
          .maybeSingle(),
      ]);

      if (keysResult.error) throw keysResult.error;
      if (propertiesResult.error) throw propertiesResult.error;

      const keysData = (keysResult.data || []).map((key: any) => ({
        ...key,
        property: key.properties,
      }));

      setKeys(keysData);
      setProperties(propertiesResult.data || []);

      const hasActiveSubscription = subscriptionResult.data && subscriptionResult.data.status === 'active';
      const effectiveMaxKeys = hasActiveSubscription
        ? subscriptionResult.data.current_keys_limit
        : agencyResult.data?.max_keys || 10;

      setMaxKeys(effectiveMaxKeys);

      const activeCount = keysData.filter(
        (k: KeyItem) => k.status !== 'ARCHIVED'
      ).length;
      setActiveKeysCount(activeCount);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image');
      return;
    }

    if (!profile?.agency_id) return;

    setUploading(true);
    try {
      const fileName = `${profile.agency_id}/key-${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('key-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('key-photos')
        .getPublicUrl(fileName);

      setFormData({ ...formData, photo_url: urlData.publicUrl });
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Erreur lors du téléchargement de la photo');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile?.agency_id) return;

    if (!editingKey && !isUnlimited(maxKeys) && activeKeysCount >= maxKeys) {
      alert(`Vous avez atteint la limite de ${maxKeys} clés actives. Veuillez mettre à niveau votre abonnement.`);
      return;
    }

    try {
      if (!formData.photo_url) {
        alert('La photo de la clé est obligatoire');
        return;
      }

      const keyData = {
        label: formData.label,
        code: formData.code || null,
        property_id: formData.property_id || null,
        service_type: formData.service_type,
        status: formData.status,
        photo_url: formData.photo_url,
        key_entrance: formData.key_entrance,
        key_mailbox: formData.key_mailbox,
        key_badge: formData.key_badge,
        key_parking: formData.key_parking,
        key_bike: formData.key_bike,
        key_building: formData.key_building,
        key_other: formData.key_other || null,
        agency_id: profile.agency_id,
      };

      if (editingKey) {
        const { error } = await supabase
          .from('keys')
          .update(keyData)
          .eq('id', editingKey.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('keys')
          .insert(keyData);

        if (error) throw error;
      }

      setShowModal(false);
      setEditingKey(null);
      setFormData({
        label: '',
        code: '',
        property_id: '',
        service_type: 'AUTRE',
        status: 'AVAILABLE',
        photo_url: '',
        key_entrance: false,
        key_mailbox: false,
        key_badge: false,
        key_parking: false,
        key_bike: false,
        key_building: false,
        key_other: '',
      });
      loadData();
    } catch (error) {
      console.error('Error saving key:', error);
      alert('Erreur lors de la sauvegarde de la clé');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette clé ?')) return;

    try {
      const { error } = await supabase
        .from('keys')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error deleting key:', error);
      alert('Erreur lors de la suppression de la clé');
    }
  }

  function openModal(key?: KeyItem) {
    if (key) {
      setEditingKey(key);
      setFormData({
        label: key.label,
        code: key.code || '',
        property_id: key.property_id || '',
        service_type: key.service_type || 'AUTRE',
        status: key.status,
        photo_url: key.photo_url || '',
        key_entrance: key.key_entrance || false,
        key_mailbox: key.key_mailbox || false,
        key_badge: key.key_badge || false,
        key_parking: key.key_parking || false,
        key_bike: key.key_bike || false,
        key_building: key.key_building || false,
        key_other: key.key_other || '',
      });
    } else {
      setEditingKey(null);
      setFormData({
        label: '',
        code: '',
        property_id: '',
        service_type: 'AUTRE',
        status: 'AVAILABLE',
        photo_url: '',
        key_entrance: false,
        key_mailbox: false,
        key_badge: false,
        key_parking: false,
        key_bike: false,
        key_building: false,
        key_other: '',
      });
    }
    setShowModal(true);
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      AVAILABLE: 'bg-green-100 text-green-700',
      OUT: 'bg-orange-100 text-orange-700',
      LOST: 'bg-red-100 text-red-700',
      ARCHIVED: 'bg-slate-100 text-slate-700',
    };
    const labels = {
      AVAILABLE: 'Disponible',
      OUT: 'Sortie',
      LOST: 'Perdue',
      ARCHIVED: 'Archivée',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  if (loading) {
    return (
      <DashboardLayout currentPage="keys">
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-600">Chargement...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentPage="keys">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Clés</h1>
          <button
            onClick={() => openModal()}
            className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-secondary transition"
          >
            <Plus className="w-5 h-5" />
            <span>Nouvelle clé</span>
          </button>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-900">
              <strong>Quota:</strong> {activeKeysCount} / {formatKeyLimit(maxKeys)} clés actives
            </p>
            {!isUnlimited(maxKeys) && activeKeysCount >= maxKeys && (
              <p className="text-sm text-amber-800 mt-1">
                Vous avez atteint votre limite. Mettez à niveau votre abonnement pour ajouter plus de clés.
              </p>
            )}
          </div>
        </div>

        {keys.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
            <Key className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Aucune clé enregistrée</h3>
            <p className="text-slate-600 mb-6">Commencez par ajouter votre première clé</p>
            <button
              onClick={() => openModal()}
              className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-secondary transition inline-flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Ajouter une clé</span>
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Label</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Code</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Bien</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Statut</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-slate-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {keys.map((key) => (
                  <tr key={key.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{key.label}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{key.code || '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {key.property ? (
                        <div>
                          <div className="font-medium">{key.property.reference}</div>
                          <div className="text-xs text-slate-500">{key.property.address}</div>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(key.status)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => {
                            setSelectedKeyForQr(key);
                            setShowQrModal(true);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Générer QR Code"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openModal(key)}
                          className="p-2 text-amber-700 hover:bg-amber-50 rounded-lg transition"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(key.id)}
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 my-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">
                {editingKey ? 'Modifier la clé' : 'Nouvelle clé'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="label" className="block text-sm font-medium text-slate-700 mb-1">
                    Label *
                  </label>
                  <input
                    id="label"
                    type="text"
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Clé principale"
                  />
                </div>

                <div>
                  <label htmlFor="code" className="block text-sm font-medium text-slate-700 mb-1">
                    Code (optionnel)
                  </label>
                  <input
                    id="code"
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="1234"
                  />
                </div>

                <div>
                  <label htmlFor="property_id" className="block text-sm font-medium text-slate-700 mb-1">
                    Bien (optionnel)
                  </label>
                  <select
                    id="property_id"
                    value={formData.property_id}
                    onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Aucun</option>
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.reference} - {property.address}
                      </option>
                    ))}
                  </select>
                  {formData.property_id && (() => {
                    const selectedProperty = properties.find(p => p.id === formData.property_id);
                    return selectedProperty ? (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs font-medium text-blue-900 mb-1">Référence du bien</p>
                        <p className="text-lg font-bold text-blue-700">{selectedProperty.reference}</p>
                        <p className="text-xs text-blue-600 mt-1">{selectedProperty.address}</p>
                      </div>
                    ) : null;
                  })()}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="service_type" className="block text-sm font-medium text-slate-700 mb-1">
                      Service *
                    </label>
                    <select
                      id="service_type"
                      value={formData.service_type}
                      onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="GESTION">Gestion</option>
                      <option value="LOCATION">Location</option>
                      <option value="VENTE">Vente</option>
                      <option value="SYNDIC">Syndic</option>
                      <option value="AUTRE">Autre</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-slate-700 mb-1">
                      Statut
                    </label>
                    <select
                      id="status"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="AVAILABLE">Disponible</option>
                      <option value="OUT">Sortie</option>
                      <option value="LOST">Perdue</option>
                      <option value="ARCHIVED">Archivée</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    Type de clé *
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.key_entrance}
                        onChange={(e) => setFormData({ ...formData, key_entrance: e.target.checked })}
                        className="w-4 h-4 text-amber-700 border-slate-300 rounded focus:ring-primary"
                      />
                      <span className="text-sm text-slate-700">Entrée</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.key_mailbox}
                        onChange={(e) => setFormData({ ...formData, key_mailbox: e.target.checked })}
                        className="w-4 h-4 text-amber-700 border-slate-300 rounded focus:ring-primary"
                      />
                      <span className="text-sm text-slate-700">Boîtes aux lettres</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.key_badge}
                        onChange={(e) => setFormData({ ...formData, key_badge: e.target.checked })}
                        className="w-4 h-4 text-amber-700 border-slate-300 rounded focus:ring-primary"
                      />
                      <span className="text-sm text-slate-700">Badge</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.key_parking}
                        onChange={(e) => setFormData({ ...formData, key_parking: e.target.checked })}
                        className="w-4 h-4 text-amber-700 border-slate-300 rounded focus:ring-primary"
                      />
                      <span className="text-sm text-slate-700">Bip parking</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.key_bike}
                        onChange={(e) => setFormData({ ...formData, key_bike: e.target.checked })}
                        className="w-4 h-4 text-amber-700 border-slate-300 rounded focus:ring-primary"
                      />
                      <span className="text-sm text-slate-700">Local vélo</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.key_building}
                        onChange={(e) => setFormData({ ...formData, key_building: e.target.checked })}
                        className="w-4 h-4 text-amber-700 border-slate-300 rounded focus:ring-primary"
                      />
                      <span className="text-sm text-slate-700">Immeuble</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label htmlFor="key_other" className="block text-sm font-medium text-slate-700 mb-1">
                    Autre (optionnel)
                  </label>
                  <input
                    id="key_other"
                    type="text"
                    value={formData.key_other}
                    onChange={(e) => setFormData({ ...formData, key_other: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Autre type de clé..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Photo de la clé *
                  </label>
                  {formData.photo_url ? (
                    <div className="space-y-2">
                      <div className="border-2 border-slate-300 rounded-lg overflow-hidden">
                        <img src={formData.photo_url} alt="Photo de la clé" className="w-full h-48 object-cover" />
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, photo_url: '' })}
                        className="text-sm text-amber-700 hover:text-amber-800 underline"
                      >
                        Changer la photo
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoSelect}
                        className="hidden"
                        id="photo-input"
                      />
                      <label
                        htmlFor="photo-input"
                        className="flex items-center justify-center space-x-2 bg-primary text-white px-4 py-3 rounded-lg hover:bg-secondary transition cursor-pointer"
                      >
                        {uploading ? (
                          <span>Téléchargement...</span>
                        ) : (
                          <>
                            <Camera className="w-5 h-5" />
                            <span>Ajouter une photo</span>
                          </>
                        )}
                      </label>
                    </div>
                  )}
                </div>

                <div className="flex space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingKey(null);
                    }}
                    className="flex-1 bg-slate-100 text-slate-700 px-6 py-3 rounded-lg hover:bg-slate-200 transition"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-primary text-white px-6 py-3 rounded-lg hover:bg-secondary transition"
                  >
                    {editingKey ? 'Modifier' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showQrModal && selectedKeyForQr && profile?.agency_id && (
          <QrCodeGenerator
            keyId={selectedKeyForQr.id}
            keyLabel={selectedKeyForQr.label}
            agencyId={profile.agency_id}
            onClose={() => {
              setShowQrModal(false);
              setSelectedKeyForQr(null);
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
