import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useModal } from '../../contexts/ModalContext';
import { supabase } from '../../lib/supabase';
import { DashboardLayout } from '../../components/DashboardLayout';
import { CSVImporter } from '../../components/CSVImporter';
import { Plus, CreditCard as Edit, Trash2, Building, Upload, Camera, Minus, QrCode, File as FileEdit, Search } from 'lucide-react';

interface Property {
  id: string;
  reference: string;
  owner_name: string;
  owner_first_name: string;
  address: string;
  postal_code: string;
  city: string;
  building: string;
  floor: string;
  door: string;
  type: string;
  service_type: string;
  mandate_number: string | null;
  photo_url: string | null;
  key_entrance_count: number;
  key_mailbox_count: number;
  key_badge_count: number;
  key_parking_count: number;
  key_bike_count: number;
  key_building_count: number;
  key_other_description: string;
  key_other_count: number;
  created_at: string;
  created_by?: string;
  creator?: {
    first_name: string;
    last_name: string;
  };
}

function KeyCounterInput({ label, value, onChange }: { label: string; value: number; onChange: (val: number) => void }) {
  return (
    <div className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3 border border-slate-200">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          disabled={value === 0}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-300 hover:bg-slate-100 transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Minus className="w-4 h-4 text-slate-600" />
        </button>
        <input
          type="number"
          min="0"
          value={value}
          onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
          className="w-16 px-2 py-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-center font-semibold"
        />
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-300 hover:bg-slate-100 transition"
        >
          <Plus className="w-4 h-4 text-slate-600" />
        </button>
      </div>
    </div>
  );
}

export function PropertiesPage() {
  const { profile } = useAuth();
  const { showSuccess, showError, showWarning, showConfirm } = useModal();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCSVImporter, setShowCSVImporter] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    owner_name: '',
    owner_first_name: '',
    address: '',
    postal_code: '',
    city: '',
    building: '',
    floor: '',
    door: '',
    type: 'Appartement',
    service_type: 'AUTRE',
    mandate_number: '',
    photo_url: '',
    key_entrance_count: 0,
    key_mailbox_count: 0,
    key_badge_count: 0,
    key_parking_count: 0,
    key_bike_count: 0,
    key_building_count: 0,
    key_other_description: '',
    key_other_count: 0,
  });
  const [generatedReference, setGeneratedReference] = useState('');
  const [showReferenceModal, setShowReferenceModal] = useState(false);
  const [newReference, setNewReference] = useState('');
  const [referenceProperty, setReferenceProperty] = useState<Property | null>(null);

  useEffect(() => {
    if (profile?.agency_id) {
      loadProperties();
    }
  }, [profile]);

  async function loadProperties() {
    if (!profile?.agency_id) return;

    try {
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          creator:created_by (
            first_name,
            last_name
          )
        `)
        .eq('agency_id', profile.agency_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoading(false);
    }
  }

  async function generateReference() {
    if (!profile?.agency_id || !formData.owner_name || !formData.address) {
      return;
    }

    try {
      const { data, error } = await supabase.rpc('generate_property_reference', {
        p_agency_id: profile.agency_id,
        p_owner_name: formData.owner_name,
        p_owner_first_name: formData.owner_first_name || '',
        p_address: formData.address,
        p_type: formData.type,
      });

      if (error) throw error;
      setGeneratedReference(data);
    } catch (error) {
      console.error('Error generating reference:', error);
    }
  }

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showWarning('Attention', 'Veuillez sélectionner une image');
      return;
    }

    if (!profile?.agency_id) return;

    setUploading(true);
    try {
      const fileName = `${profile.agency_id}/property-${Date.now()}.jpg`;

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
      showError('Erreur', 'Erreur lors du téléchargement de la photo');
    } finally {
      setUploading(false);
    }
  }

  async function createKeysForProperty(propertyId: string, propertyReference: string) {
    const keysToCreate = [];

    const keyTypes = [
      { count: formData.key_entrance_count, field: 'key_entrance', label: 'Entrée' },
      { count: formData.key_mailbox_count, field: 'key_mailbox', label: 'Boîte aux lettres' },
      { count: formData.key_badge_count, field: 'key_badge', label: 'Badge' },
      { count: formData.key_parking_count, field: 'key_parking', label: 'Parking' },
      { count: formData.key_bike_count, field: 'key_bike', label: 'Local vélo' },
      { count: formData.key_building_count, field: 'key_building', label: 'Immeuble' },
    ];

    for (const keyType of keyTypes) {
      for (let i = 1; i <= keyType.count; i++) {
        const suffix = keyType.count > 1 ? ` ${i}` : '';
        keysToCreate.push({
          agency_id: profile!.agency_id,
          property_id: propertyId,
          label: `${propertyReference} - ${keyType.label}${suffix}`,
          [keyType.field]: true,
          status: 'AVAILABLE',
        });
      }
    }

    if (formData.key_other_count > 0 && formData.key_other_description) {
      for (let i = 1; i <= formData.key_other_count; i++) {
        const suffix = formData.key_other_count > 1 ? ` ${i}` : '';
        keysToCreate.push({
          agency_id: profile!.agency_id,
          property_id: propertyId,
          label: `${propertyReference} - ${formData.key_other_description}${suffix}`,
          key_other: formData.key_other_description,
          status: 'AVAILABLE',
        });
      }
    }

    if (keysToCreate.length > 0) {
      const { error } = await supabase
        .from('keys')
        .insert(keysToCreate);

      if (error) throw error;
    }
  }

  async function updateKeysForProperty(propertyId: string, propertyReference: string) {
    const { data: existingKeys, error: fetchError } = await supabase
      .from('keys')
      .select('*')
      .eq('property_id', propertyId);

    if (fetchError) throw fetchError;

    const { error: deleteError } = await supabase
      .from('keys')
      .delete()
      .eq('property_id', propertyId)
      .eq('status', 'AVAILABLE');

    if (deleteError) throw deleteError;

    await createKeysForProperty(propertyId, propertyReference);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile?.agency_id) return;

    if (!editingProperty && !generatedReference) {
      showWarning('Attention', 'Veuillez générer une référence avant de créer le bien');
      return;
    }

    try {
      if (editingProperty) {
        const { error } = await supabase
          .from('properties')
          .update({
            owner_name: formData.owner_name,
            owner_first_name: formData.owner_first_name,
            address: formData.address,
            postal_code: formData.postal_code,
            city: formData.city,
            building: formData.building,
            floor: formData.floor,
            door: formData.door,
            type: formData.type,
            service_type: formData.service_type,
            mandate_number: formData.mandate_number || null,
            photo_url: formData.photo_url || null,
            key_entrance_count: formData.key_entrance_count,
            key_mailbox_count: formData.key_mailbox_count,
            key_badge_count: formData.key_badge_count,
            key_parking_count: formData.key_parking_count,
            key_bike_count: formData.key_bike_count,
            key_building_count: formData.key_building_count,
            key_other_description: formData.key_other_description,
            key_other_count: formData.key_other_count,
          })
          .eq('id', editingProperty.id);

        if (error) throw error;

        await updateKeysForProperty(editingProperty.id, editingProperty.reference);
      } else {
        const { data: newProperty, error } = await supabase
          .from('properties')
          .insert({
            agency_id: profile.agency_id,
            reference: generatedReference,
            owner_name: formData.owner_name,
            owner_first_name: formData.owner_first_name,
            address: formData.address,
            postal_code: formData.postal_code,
            city: formData.city,
            building: formData.building,
            floor: formData.floor,
            door: formData.door,
            type: formData.type,
            service_type: formData.service_type,
            mandate_number: formData.mandate_number || null,
            photo_url: formData.photo_url || null,
            key_entrance_count: formData.key_entrance_count,
            key_mailbox_count: formData.key_mailbox_count,
            key_badge_count: formData.key_badge_count,
            key_parking_count: formData.key_parking_count,
            key_bike_count: formData.key_bike_count,
            key_building_count: formData.key_building_count,
            key_other_description: formData.key_other_description,
            key_other_count: formData.key_other_count,
            created_by: profile.id,
          })
          .select()
          .single();

        if (error) throw error;

        if (newProperty) {
          await createKeysForProperty(newProperty.id, generatedReference);
        }
      }

      setShowModal(false);
      setEditingProperty(null);
      setFormData({ owner_name: '', owner_first_name: '', address: '', postal_code: '', city: '', building: '', floor: '', door: '', type: 'Appartement', service_type: 'AUTRE', mandate_number: '', photo_url: '', key_entrance_count: 0, key_mailbox_count: 0, key_badge_count: 0, key_parking_count: 0, key_bike_count: 0, key_building_count: 0, key_other_description: '', key_other_count: 0 });
      setGeneratedReference('');
      loadProperties();
    } catch (error) {
      console.error('Error saving property:', error);
      showError('Erreur', 'Erreur lors de la sauvegarde du bien');
    }
  }

  async function handleDelete(id: string) {
    const confirmed = await showConfirm({
      title: 'Supprimer le bien',
      message: 'Êtes-vous sûr de vouloir supprimer ce bien ?',
      confirmText: 'Supprimer',
      cancelText: 'Annuler'
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadProperties();
    } catch (error) {
      console.error('Error deleting property:', error);
      showError('Erreur', 'Erreur lors de la suppression du bien');
    }
  }

  function openModal(property?: Property) {
    if (property) {
      setEditingProperty(property);
      setFormData({
        owner_name: property.owner_name,
        owner_first_name: property.owner_first_name || '',
        address: property.address,
        postal_code: property.postal_code || '',
        city: property.city || '',
        building: property.building || '',
        floor: property.floor || '',
        door: property.door || '',
        type: property.type,
        service_type: property.service_type || 'AUTRE',
        mandate_number: property.mandate_number || '',
        photo_url: property.photo_url || '',
        key_entrance_count: property.key_entrance_count || 0,
        key_mailbox_count: property.key_mailbox_count || 0,
        key_badge_count: property.key_badge_count || 0,
        key_parking_count: property.key_parking_count || 0,
        key_bike_count: property.key_bike_count || 0,
        key_building_count: property.key_building_count || 0,
        key_other_description: property.key_other_description || '',
        key_other_count: property.key_other_count || 0,
      });
      setGeneratedReference('');
    } else {
      setEditingProperty(null);
      setFormData({ owner_name: '', owner_first_name: '', address: '', postal_code: '', city: '', building: '', floor: '', door: '', type: 'Appartement', service_type: 'AUTRE', mandate_number: '', photo_url: '', key_entrance_count: 0, key_mailbox_count: 0, key_badge_count: 0, key_parking_count: 0, key_bike_count: 0, key_building_count: 0, key_other_description: '', key_other_count: 0 });
      setGeneratedReference('');
    }
    setShowModal(true);
  }

  function openReferenceModal(property: Property) {
    if (profile?.role !== 'ADMIN' && profile?.role !== 'agency_admin') {
      showError('Accès refusé', 'Seuls les administrateurs d\'agence peuvent modifier les références');
      return;
    }
    setReferenceProperty(property);
    setNewReference(property.reference);
    setShowReferenceModal(true);
  }

  async function handleReferenceUpdate() {
    if (!referenceProperty || !newReference.trim()) {
      showWarning('Attention', 'Veuillez saisir une nouvelle référence');
      return;
    }

    if (newReference === referenceProperty.reference) {
      showWarning('Attention', 'La nouvelle référence est identique à l\'ancienne');
      return;
    }

    try {
      const { data: existing } = await supabase
        .from('properties')
        .select('id')
        .eq('reference', newReference)
        .eq('agency_id', profile!.agency_id)
        .maybeSingle();

      if (existing) {
        showWarning('Référence existante', 'Cette référence existe déjà. Veuillez en choisir une autre.');
        return;
      }

      const confirmed = await showConfirm({
        title: 'Confirmer la modification',
        message: `Êtes-vous sûr de vouloir changer la référence de "${referenceProperty.reference}" en "${newReference}" ?`,
        confirmText: 'Confirmer',
        cancelText: 'Annuler'
      });

      if (!confirmed) return;

      const { error } = await supabase
        .from('properties')
        .update({ reference: newReference })
        .eq('id', referenceProperty.id);

      if (error) throw error;

      const { data: keys } = await supabase
        .from('keys')
        .select('id, label')
        .eq('property_id', referenceProperty.id);

      if (keys && keys.length > 0) {
        for (const key of keys) {
          const updatedLabel = key.label.replace(referenceProperty.reference, newReference);
          await supabase
            .from('keys')
            .update({ label: updatedLabel })
            .eq('id', key.id);
        }
      }

      setShowReferenceModal(false);
      setReferenceProperty(null);
      setNewReference('');
      loadProperties();
      showSuccess('Succès', 'La référence a été modifiée avec succès');
    } catch (error) {
      console.error('Error updating reference:', error);
      showError('Erreur', 'Erreur lors de la modification de la référence');
    }
  }

  const filteredProperties = properties.filter((property) => {
    if (!searchTerm.trim()) return true;

    const search = searchTerm.toLowerCase();
    const ownerFullName = `${property.owner_first_name} ${property.owner_name}`.toLowerCase();

    return (
      property.reference.toLowerCase().includes(search) ||
      property.owner_name.toLowerCase().includes(search) ||
      property.owner_first_name.toLowerCase().includes(search) ||
      ownerFullName.includes(search) ||
      property.address.toLowerCase().includes(search) ||
      (property.city && property.city.toLowerCase().includes(search))
    );
  });

  if (loading) {
    return (
      <DashboardLayout currentPage="properties">
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-600">Chargement...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentPage="properties">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Biens et Clés</h1>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowCSVImporter(true)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <Upload className="w-5 h-5" />
              <span>Importer CSV</span>
            </button>
            <button
              onClick={() => openModal()}
              className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-secondary transition"
            >
              <Plus className="w-5 h-5" />
              <span>Nouveau bien</span>
            </button>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par référence, propriétaire, adresse ou ville..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {properties.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
            <Building className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Aucun bien enregistré</h3>
            <p className="text-slate-600 mb-6">Commencez par ajouter votre premier bien immobilier</p>
            <button
              onClick={() => openModal()}
              className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-secondary transition inline-flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Ajouter un bien</span>
            </button>
          </div>
        ) : (
          <>
            <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Référence</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Propriétaire</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Localisation</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Type</th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-900">Saisi par</th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-slate-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredProperties.map((property) => (
                    <tr key={property.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{property.reference}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {property.owner_first_name && `${property.owner_first_name} `}{property.owner_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        <div className="font-medium text-slate-900">{property.address}</div>
                        {(property.postal_code || property.city) && (
                          <div className="text-xs text-slate-500 mt-0.5">
                            {[property.postal_code, property.city].filter(Boolean).join(' ')}
                          </div>
                        )}
                        {(property.building || property.floor || property.door) && (
                          <div className="flex flex-wrap gap-x-3 mt-1">
                            {property.building && (
                              <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                Bât. {property.building}
                              </span>
                            )}
                            {property.floor && (
                              <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                Étage {property.floor}
                              </span>
                            )}
                            {property.door && (
                              <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                Porte {property.door}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{property.type}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {property.creator ? `${property.creator.first_name} ${property.creator.last_name}` : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => window.location.href = `/dashboard/qr-codes-print?propertyId=${property.id}`}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="QR Codes de ce bien"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                          {(profile?.role === 'ADMIN' || profile?.role === 'agency_admin') && (
                            <button
                              onClick={() => openReferenceModal(property)}
                              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition"
                              title="Modifier la référence"
                            >
                              <FileEdit className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => openModal(property)}
                            className="p-2 text-amber-700 hover:bg-amber-50 rounded-lg transition"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(property.id)}
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

            <div className="md:hidden space-y-4">
              {filteredProperties.map((property) => (
                <div key={property.id} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-slate-900 mb-1">{property.reference}</h3>
                      <p className="text-sm text-slate-600">
                        {property.owner_first_name && `${property.owner_first_name} `}{property.owner_name}
                      </p>
                    </div>
                    <div className="flex space-x-2 ml-2">
                      <button
                        onClick={() => window.location.href = `/dashboard/qr-codes-print?propertyId=${property.id}`}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="QR Codes de ce bien"
                      >
                        <QrCode className="w-5 h-5" />
                      </button>
                      {(profile?.role === 'ADMIN' || profile?.role === 'agency_admin') && (
                        <button
                          onClick={() => openReferenceModal(property)}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition"
                          title="Modifier la référence"
                        >
                          <FileEdit className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => openModal(property)}
                        className="p-2 text-amber-700 hover:bg-amber-50 rounded-lg transition"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(property.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-slate-500">Adresse:</span>
                      <p className="text-slate-900 font-medium">{property.address}</p>
                      {(property.postal_code || property.city) && (
                        <p className="text-slate-500 text-xs">{[property.postal_code, property.city].filter(Boolean).join(' ')}</p>
                      )}
                      {(property.building || property.floor || property.door) && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {property.building && (
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">Bât. {property.building}</span>
                          )}
                          {property.floor && (
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">Étage {property.floor}</span>
                          )}
                          {property.door && (
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">Porte {property.door}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <div>
                        <span className="text-slate-500">Type:</span>
                        <p className="text-slate-900">{property.type}</p>
                      </div>
                      {property.creator && (
                        <div className="text-right">
                          <span className="text-slate-500">Saisi par:</span>
                          <p className="text-slate-900">{property.creator.first_name} {property.creator.last_name}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full mx-4 flex flex-col" style={{ maxWidth: '600px', maxHeight: '90vh' }}>
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900">
                  {editingProperty ? 'Modifier le bien' : 'Nouvelle saisie de clé'}
                </h2>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                <div className="overflow-y-auto px-6 py-4 space-y-4">
                <div>
                  <label htmlFor="owner_name" className="block text-sm font-medium text-slate-700 mb-1">
                    Nom du propriétaire ou SCI *
                  </label>
                  <input
                    id="owner_name"
                    type="text"
                    value={formData.owner_name}
                    onChange={(e) => {
                      setFormData({ ...formData, owner_name: e.target.value });
                      setGeneratedReference('');
                    }}
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Dupont ou SCI IMMO"
                  />
                </div>

                <div>
                  <label htmlFor="owner_first_name" className="block text-sm font-medium text-slate-700 mb-1">
                    Prénom du propriétaire (optionnel)
                  </label>
                  <input
                    id="owner_first_name"
                    type="text"
                    value={formData.owner_first_name}
                    onChange={(e) => {
                      setFormData({ ...formData, owner_first_name: e.target.value });
                      setGeneratedReference('');
                    }}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Jean"
                  />
                </div>

                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-slate-700 mb-1">
                    Adresse *
                  </label>
                  <input
                    id="address"
                    type="text"
                    value={formData.address}
                    onChange={(e) => {
                      setFormData({ ...formData, address: e.target.value });
                      setGeneratedReference('');
                    }}
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="123 rue de la Paix"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="postal_code" className="block text-sm font-medium text-slate-700 mb-1">
                      Code postal
                    </label>
                    <input
                      id="postal_code"
                      type="text"
                      value={formData.postal_code}
                      onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="75001"
                    />
                  </div>

                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-slate-700 mb-1">
                      Ville
                    </label>
                    <input
                      id="city"
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Paris"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="building" className="block text-sm font-medium text-slate-700 mb-1">
                      Bâtiment
                    </label>
                    <input
                      id="building"
                      type="text"
                      value={formData.building}
                      onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="A"
                    />
                  </div>

                  <div>
                    <label htmlFor="floor" className="block text-sm font-medium text-slate-700 mb-1">
                      Étage
                    </label>
                    <input
                      id="floor"
                      type="text"
                      value={formData.floor}
                      onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="3"
                    />
                  </div>

                  <div>
                    <label htmlFor="door" className="block text-sm font-medium text-slate-700 mb-1">
                      Porte
                    </label>
                    <input
                      id="door"
                      type="text"
                      value={formData.door}
                      onChange={(e) => setFormData({ ...formData, door: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="12"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="service_type" className="block text-sm font-medium text-slate-700 mb-1">
                      Service *
                    </label>
                    <select
                      id="service_type"
                      value={formData.service_type}
                      onChange={(e) => {
                        setFormData({ ...formData, service_type: e.target.value });
                        setGeneratedReference('');
                      }}
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
                    <label htmlFor="type" className="block text-sm font-medium text-slate-700 mb-1">
                      Type de bien *
                    </label>
                    <select
                      id="type"
                      value={formData.type}
                      onChange={(e) => {
                        setFormData({ ...formData, type: e.target.value });
                        setGeneratedReference('');
                      }}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="Appartement">Appartement</option>
                      <option value="Maison">Maison</option>
                      <option value="Bureau">Bureau</option>
                      <option value="Commerce">Commerce</option>
                      <option value="Terrain">Terrain</option>
                      <option value="Parking">Parking</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="mandate_number" className="block text-sm font-medium text-slate-700 mb-1">
                    Numéro de mandat (optionnel)
                  </label>
                  <input
                    id="mandate_number"
                    type="text"
                    value={formData.mandate_number}
                    onChange={(e) => setFormData({ ...formData, mandate_number: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="M2024-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Photo des clés *
                  </label>
                  {formData.photo_url ? (
                    <div className="space-y-2">
                      <div className="border-2 border-slate-300 rounded-lg overflow-hidden">
                        <img src={formData.photo_url} alt="Photo des clés" className="w-full h-48 object-cover" />
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

                {!editingProperty && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-slate-700">
                        Référence générée
                      </label>
                      <button
                        type="button"
                        onClick={generateReference}
                        disabled={!formData.owner_name || !formData.address}
                        className="text-sm bg-primary text-white px-3 py-1 rounded hover:bg-secondary transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Générer
                      </button>
                    </div>
                    <div className="text-lg font-bold text-amber-900">
                      {generatedReference || 'Cliquez sur Générer'}
                    </div>
                    <p className="text-xs text-slate-600 mt-2">
                      La référence sera générée automatiquement selon les paramètres de votre agence
                    </p>
                  </div>
                )}

                <div className="border-t border-slate-200 pt-6 mt-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Nombre de clés par type</h3>

                  <div className="space-y-3">
                    <KeyCounterInput
                      label="Entrée"
                      value={formData.key_entrance_count}
                      onChange={(val) => setFormData({ ...formData, key_entrance_count: val })}
                    />
                    <KeyCounterInput
                      label="Boîte aux lettres"
                      value={formData.key_mailbox_count}
                      onChange={(val) => setFormData({ ...formData, key_mailbox_count: val })}
                    />
                    <KeyCounterInput
                      label="Badge"
                      value={formData.key_badge_count}
                      onChange={(val) => setFormData({ ...formData, key_badge_count: val })}
                    />
                    <KeyCounterInput
                      label="Parking"
                      value={formData.key_parking_count}
                      onChange={(val) => setFormData({ ...formData, key_parking_count: val })}
                    />
                    <KeyCounterInput
                      label="Local vélo"
                      value={formData.key_bike_count}
                      onChange={(val) => setFormData({ ...formData, key_bike_count: val })}
                    />
                    <KeyCounterInput
                      label="Immeuble"
                      value={formData.key_building_count}
                      onChange={(val) => setFormData({ ...formData, key_building_count: val })}
                    />
                  </div>

                  <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <label htmlFor="key_other_description" className="block text-sm font-medium text-slate-700 mb-2">
                      Autre type de clé (optionnel)
                    </label>
                    <div className="space-y-3">
                      <input
                        id="key_other_description"
                        type="text"
                        value={formData.key_other_description}
                        onChange={(e) => setFormData({ ...formData, key_other_description: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                        placeholder="Cave, garage..."
                      />
                      {formData.key_other_description && (
                        <KeyCounterInput
                          label={formData.key_other_description || "Nombre d'autres clés"}
                          value={formData.key_other_count}
                          onChange={(val) => setFormData({ ...formData, key_other_count: val })}
                        />
                      )}
                    </div>
                  </div>
                </div>
                </div>

                <div className="border-t border-slate-200 p-6 bg-slate-50 flex space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingProperty(null);
                    }}
                    className="flex-1 bg-slate-100 text-slate-700 px-6 py-3 rounded-lg hover:bg-slate-200 transition"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={!editingProperty && !generatedReference}
                    className="flex-1 bg-primary text-white px-6 py-3 rounded-lg hover:bg-secondary transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editingProperty ? 'Modifier' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showReferenceModal && referenceProperty && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-md p-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Modifier la référence</h2>

              <div className="mb-6">
                <div className="mb-4 p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-600 mb-1">Référence actuelle</p>
                  <p className="text-lg font-bold text-slate-900">{referenceProperty.reference}</p>
                </div>

                <label htmlFor="new_reference" className="block text-sm font-medium text-slate-700 mb-2">
                  Nouvelle référence *
                </label>
                <input
                  id="new_reference"
                  type="text"
                  value={newReference}
                  onChange={(e) => setNewReference(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Saisir la nouvelle référence"
                  autoFocus
                />
                <p className="text-xs text-slate-500 mt-2">
                  Cette modification mettra également à jour toutes les clés associées.
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowReferenceModal(false);
                    setReferenceProperty(null);
                    setNewReference('');
                  }}
                  className="flex-1 bg-slate-100 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-200 transition"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleReferenceUpdate}
                  disabled={!newReference.trim() || newReference === referenceProperty.reference}
                  className="flex-1 bg-primary text-white px-4 py-2 rounded-lg hover:bg-secondary transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Valider
                </button>
              </div>
            </div>
          </div>
        )}

        {showCSVImporter && profile?.agency_id && (
          <CSVImporter
            agencyId={profile.agency_id}
            onSuccess={() => {
              loadProperties();
            }}
            onClose={() => setShowCSVImporter(false)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
