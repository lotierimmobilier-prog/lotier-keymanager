import { useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { Plus, Edit, Trash2, Key, AlertCircle, Camera, Search, ChevronRight, X, QrCode } from 'lucide-react';
import { isUnlimited, formatKeyLimit } from '../../../utils/constants';

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
}

interface Property {
  id: string;
  reference: string;
  address: string;
}

interface KeyRing {
  propertyReference: string;
  propertyAddress: string;
  propertyId: string;
  keys: KeyItem[];
  statusCounts: {
    available: number;
    out: number;
    lost: number;
    archived: number;
  };
}

export function KeysInventoryTab() {
  const { profile } = useAuth();
  const [keys, setKeys] = useState<KeyItem[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState<KeyRing | null>(null);
  const [editingKey, setEditingKey] = useState<KeyItem | null>(null);
  const [maxKeys, setMaxKeys] = useState(10);
  const [activeKeysCount, setActiveKeysCount] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    label: '',
    code: '',
    property_id: '',
    service_type: 'AUTRE',
    status: 'AVAILABLE' as 'AVAILABLE' | 'OUT' | 'LOST' | 'ARCHIVED',
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
      if (showDetailModal) {
        setShowDetailModal(null);
      }
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

  const groupedKeys: KeyRing[] = keys
    .filter(key => key.property && key.property.reference)
    .reduce((groups: KeyRing[], key) => {
      const existingGroup = groups.find(g => g.propertyReference === key.property!.reference);

      if (existingGroup) {
        existingGroup.keys.push(key);
        existingGroup.statusCounts[key.status.toLowerCase() as keyof typeof existingGroup.statusCounts]++;
      } else {
        groups.push({
          propertyReference: key.property!.reference,
          propertyAddress: key.property!.address,
          propertyId: key.property_id!,
          keys: [key],
          statusCounts: {
            available: key.status === 'AVAILABLE' ? 1 : 0,
            out: key.status === 'OUT' ? 1 : 0,
            lost: key.status === 'LOST' ? 1 : 0,
            archived: key.status === 'ARCHIVED' ? 1 : 0,
          },
        });
      }

      return groups;
    }, []);

  const filteredKeyRings = groupedKeys.filter(keyRing => {
    if (searchTerm === '') return true;
    const search = searchTerm.toLowerCase();
    return (
      keyRing.propertyReference.toLowerCase().includes(search) ||
      keyRing.propertyAddress.toLowerCase().includes(search) ||
      keyRing.keys.some(k => k.label.toLowerCase().includes(search) || k.code?.toLowerCase().includes(search))
    );
  });

  const unassignedKeys = keys.filter(key => !key.property || !key.property.reference);

  if (loading) {
    return <div className="text-center py-12 text-slate-600">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-sm text-slate-600">Vue complète de toutes vos clés regroupées par bien</p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 mt-2 inline-flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-700" />
            <p className="text-sm text-amber-900">
              <strong>Quota:</strong> {activeKeysCount} / {formatKeyLimit(maxKeys)} clés actives
            </p>
          </div>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-secondary transition"
        >
          <Plus className="w-5 h-5" />
          <span>Nouvelle clé</span>
        </button>
      </div>

      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Rechercher un bien ou une clé..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {filteredKeyRings.length === 0 && unassignedKeys.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
          <Key className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">Aucune clé trouvée</h3>
          <p className="text-slate-600">Essayez d'ajuster votre recherche ou d'ajouter une nouvelle clé</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredKeyRings.map((keyRing) => (
            <div
              key={keyRing.propertyId}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:bg-slate-50 transition"
            >
              <div className="flex items-center justify-between">
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => setShowDetailModal(keyRing)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
                      <Key className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{keyRing.propertyReference}</h3>
                      <p className="text-sm text-slate-600">{keyRing.propertyAddress}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-semibold text-slate-700">{keyRing.keys.length} clé{keyRing.keys.length > 1 ? 's' : ''}</span>
                        {keyRing.statusCounts.available > 0 && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                            {keyRing.statusCounts.available} disponible{keyRing.statusCounts.available > 1 ? 's' : ''}
                          </span>
                        )}
                        {keyRing.statusCounts.out > 0 && (
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                            {keyRing.statusCounts.out} sortie{keyRing.statusCounts.out > 1 ? 's' : ''}
                          </span>
                        )}
                        {keyRing.statusCounts.lost > 0 && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                            {keyRing.statusCounts.lost} perdue{keyRing.statusCounts.lost > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = `/dashboard/qr-codes-print?propertyId=${keyRing.propertyId}`;
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="QR Codes du trousseau"
                  >
                    <QrCode className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setShowDetailModal(keyRing)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {unassignedKeys.length > 0 && (
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
              <h3 className="text-lg font-bold text-slate-900 mb-3">Clés non assignées à un bien</h3>
              <div className="space-y-2">
                {unassignedKeys.map((key) => (
                  <div key={key.id} className="bg-white rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Key className="w-5 h-5 text-slate-400" />
                      <div>
                        <div className="font-medium text-slate-900">{key.label}</div>
                        <div className="text-xs text-slate-500">{key.code || 'Pas de code'}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(key.status)}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openModal(key);
                        }}
                        className="p-2 text-amber-700 hover:bg-amber-50 rounded-lg transition"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(key.id);
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showDetailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowDetailModal(null)}>
          <div className="bg-white rounded-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{showDetailModal.propertyReference}</h2>
                <p className="text-slate-600">{showDetailModal.propertyAddress}</p>
                <p className="text-sm text-slate-500 mt-1">{showDetailModal.keys.length} clé{showDetailModal.keys.length > 1 ? 's' : ''} dans ce trousseau</p>
              </div>
              <button
                onClick={() => setShowDetailModal(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-3">
              {showDetailModal.keys.map((key) => (
                <div key={key.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-900">{key.label}</h3>
                      {key.code && <p className="text-sm text-slate-600">Code: {key.code}</p>}
                    </div>
                    {getStatusBadge(key.status)}
                  </div>

                  {key.photo_url && (
                    <div className="mb-3">
                      <img src={key.photo_url} alt={key.label} className="w-full h-32 object-cover rounded-lg" />
                    </div>
                  )}

                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => {
                        setShowDetailModal(null);
                        openModal(key);
                      }}
                      className="flex items-center space-x-1 px-3 py-1.5 text-sm text-amber-700 hover:bg-amber-50 rounded-lg transition"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Modifier</span>
                    </button>
                    <button
                      onClick={() => handleDelete(key.id)}
                      className="flex items-center space-x-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Supprimer</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
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
    </div>
  );
}
