import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { DashboardLayout } from '../../components/DashboardLayout';
import { Plus, CheckCircle, Activity, Filter, Ligature as FileSignature, Image as ImageIcon, Pencil, Trash2, Search, X, MapPin, Hash, Building2 } from 'lucide-react';
import { SignatureCanvas } from '../../components/SignatureCanvas';
import { PhotoUpload } from '../../components/PhotoUpload';
import { sendKeyCheckoutEmail } from '../../utils/emailUtils';

interface Movement {
  id: string;
  key_id: string;
  given_to_name: string;
  purpose: string | null;
  out_at: string;
  expected_return_at: string;
  returned_at: string | null;
  notes: string | null;
  responsibility_transferred: boolean;
  agency_signature_out: string | null;
  agency_signature_out_at: string | null;
  provider_signature_out: string | null;
  provider_signature_out_at: string | null;
  photo_out_url: string | null;
  agency_signature_in: string | null;
  agency_signature_in_at: string | null;
  provider_signature_in: string | null;
  provider_signature_in_at: string | null;
  photo_in_url: string | null;
  recorded_by?: string;
  recorder?: {
    first_name: string;
    last_name: string;
  };
  key?: {
    label: string;
  };
  property?: {
    reference: string;
    address: string;
  };
}

interface KeyItem {
  id: string;
  label: string;
  status: string;
  property?: {
    reference: string;
    address: string;
    city: string | null;
    postal_code: string | null;
  };
}

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  company: string;
  phone: string;
  email: string;
}

export function MovementsPage() {
  const { profile } = useAuth();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [keys, setKeys] = useState<KeyItem[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState<{
    show: boolean;
    type: 'agency_out' | 'provider_out' | 'agency_in' | 'provider_in';
    movementId?: string;
  }>({ show: false, type: 'agency_out' });
  const [showPhotoModal, setShowPhotoModal] = useState<{
    show: boolean;
    type: 'out' | 'in';
    movementId?: string;
  }>({ show: false, type: 'out' });
  const [filterStatus, setFilterStatus] = useState<'all' | 'out' | 'returned'>('all');
  const [checkoutStep, setCheckoutStep] = useState<'form' | 'agency_signature' | 'provider_signature' | 'photo'>('form');
  const [tempMovementId, setTempMovementId] = useState<string | null>(null);
  const [showPhotoViewer, setShowPhotoViewer] = useState<{ show: boolean; url: string; type: 'out' | 'in' }>({ show: false, url: '', type: 'out' });
  const [showSignaturesViewer, setShowSignaturesViewer] = useState<{ show: boolean; movement: Movement | null; type: 'out' | 'in' }>({ show: false, movement: null, type: 'out' });
  const [showEditModal, setShowEditModal] = useState<{ show: boolean; movement: Movement | null }>({ show: false, movement: null });
  const [showDeleteModal, setShowDeleteModal] = useState<{ show: boolean; movement: Movement | null }>({ show: false, movement: null });
  const [editReason, setEditReason] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [propertySearch, setPropertySearch] = useState('');
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);
  const [formData, setFormData] = useState({
    key_id: '',
    is_partial_keyring: false,
    selected_property_id: '',
    selected_keys: [] as string[],
    given_to_name: '',
    contact_phone: '',
    contact_email: '',
    purpose: '',
    expected_return_at: '',
    notes: '',
    disable_sms: false,
    agency_signature_out: '',
    provider_signature_out: '',
    photo_out_url: '',
  });

  useEffect(() => {
    if (profile?.agency_id) {
      loadData();
    }
  }, [profile]);

  async function loadData() {
    if (!profile?.agency_id) return;

    try {
      const [movementsResult, keysResult, contactsResult] = await Promise.all([
        supabase
          .from('key_movements')
          .select(`
            *,
            recorder:recorded_by (
              first_name,
              last_name
            ),
            keys!inner (
              label,
              properties (
                reference,
                address
              )
            )
          `)
          .eq('agency_id', profile.agency_id)
          .is('deleted_at', null)
          .order('out_at', { ascending: false }),
        supabase
          .from('keys')
          .select(`
            id,
            label,
            status,
            properties (
              reference,
              address,
              city,
              postal_code
            )
          `)
          .eq('agency_id', profile.agency_id)
          .eq('status', 'AVAILABLE'),
        supabase
          .from('contacts')
          .select('id, first_name, last_name, company, phone, email')
          .eq('agency_id', profile.agency_id)
          .order('last_name', { ascending: true }),
      ]);

      if (movementsResult.error) throw movementsResult.error;
      if (keysResult.error) throw keysResult.error;
      if (contactsResult.error) throw contactsResult.error;

      const movementsData = (movementsResult.data || []).map((m: any) => ({
        ...m,
        key: m.keys,
        property: m.keys?.properties,
      }));

      const keysData = (keysResult.data || []).map((k: any) => ({
        ...k,
        property: k.properties,
      }));

      setMovements(movementsData);
      setKeys(keysData);
      setContacts(contactsResult.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (!profile?.agency_id) return;

    if (!formData.selected_property_id) {
      alert('Veuillez sélectionner un bien');
      return;
    }

    if (formData.selected_keys.length === 0) {
      alert('Veuillez sélectionner au moins une clé');
      return;
    }

    setCheckoutStep('agency_signature');
    setShowSignatureModal({ show: true, type: 'agency_out' });
  }

  async function handleSignature(signature: string) {
    if (checkoutStep === 'agency_signature') {
      setFormData({ ...formData, agency_signature_out: signature });
      setShowSignatureModal({ show: false, type: 'agency_out' });
      setCheckoutStep('provider_signature');
      setTimeout(() => {
        setShowSignatureModal({ show: true, type: 'provider_out' });
      }, 100);
    } else if (checkoutStep === 'provider_signature') {
      setFormData({ ...formData, provider_signature_out: signature });
      setShowSignatureModal({ show: false, type: 'provider_out' });
      setCheckoutStep('photo');
      setTimeout(() => {
        setShowPhotoModal({ show: true, type: 'out' });
      }, 100);
    }
  }

  async function handlePhotoOut(url: string) {
    if (!profile?.agency_id) return;

    if (!url) {
      alert('La photo est obligatoire pour valider la sortie');
      return;
    }

    try {
      let contactId = null;

      if (formData.given_to_name && formData.contact_email && formData.contact_phone) {
        const nameParts = formData.given_to_name.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || firstName;

        const existingContact = contacts.find(
          c => c.email === formData.contact_email ||
               (c.first_name === firstName && c.last_name === lastName)
        );

        if (!existingContact) {
          const { data: newContact, error: contactError } = await supabase
            .from('contacts')
            .insert({
              agency_id: profile.agency_id,
              first_name: firstName,
              last_name: lastName,
              email: formData.contact_email,
              phone: formData.contact_phone,
              source: 'manual_entry'
            })
            .select()
            .single();

          if (!contactError && newContact) {
            contactId = newContact.id;
            await loadData();
          }
        } else {
          contactId = existingContact.id;
        }
      }

      const expectedReturnDate = new Date(formData.expected_return_at).toISOString();
      const now = new Date().toISOString();

      const keysToCheckout = formData.selected_keys;

      const movementsToCreate = keysToCheckout.map(keyId => ({
        agency_id: profile.agency_id,
        key_id: keyId,
        taken_by_user_id: profile.id,
        given_to_name: formData.given_to_name,
        contact_phone: formData.contact_phone || null,
        contact_email: formData.contact_email || null,
        purpose: formData.purpose || null,
        expected_return_at: expectedReturnDate,
        notes: formData.notes || null,
        responsibility_transferred: false,
        disable_sms: formData.disable_sms,
        agency_signature_out: formData.agency_signature_out,
        agency_signature_out_at: now,
        provider_signature_out: formData.provider_signature_out,
        provider_signature_out_at: now,
        photo_out_url: url,
        recorded_by: profile.id,
      }));

      const { data: newMovements, error: movementError } = await supabase
        .from('key_movements')
        .insert(movementsToCreate)
        .select();

      if (movementError) throw movementError;

      const { error: keyError } = await supabase
        .from('keys')
        .update({ status: 'OUT' })
        .in('id', keysToCheckout);

      if (keyError) throw keyError;

      // Send confirmation email (fire-and-forget)
      if (formData.contact_email && newMovements && newMovements.length > 0) {
        const { data: keysForEmail } = await supabase
          .from('keys')
          .select('id, label, properties(reference, address)')
          .in('id', keysToCheckout);

        const { data: agencyForEmail } = await supabase
          .from('agencies')
          .select('name')
          .eq('id', profile.agency_id)
          .single();

        if (keysForEmail && agencyForEmail) {
          const firstKey = (keysForEmail[0] as any);
          const prop = firstKey?.properties;
          sendKeyCheckoutEmail({
            agencyId: profile.agency_id,
            agencyName: agencyForEmail.name,
            contactEmail: formData.contact_email,
            contactName: formData.given_to_name,
            keyLabels: keysForEmail.map((k: any) => k.label),
            propertyReference: prop?.reference || '',
            propertyAddress: prop?.address || '',
            outAt: now,
            expectedReturnAt: expectedReturnDate,
            agencySignature: formData.agency_signature_out || undefined,
            providerSignature: formData.provider_signature_out || undefined,
          }).catch(err => console.error('Email error:', err));
        }
      }

      if (!formData.disable_sms && formData.contact_phone && newMovements && newMovements.length > 0) {
        const { data: keysData } = await supabase
          .from('keys')
          .select('id, label')
          .in('id', keysToCheckout);

        const { data: agencyData } = await supabase
          .from('agencies')
          .select('name')
          .eq('id', profile.agency_id)
          .single();

        if (keysData && agencyData) {
          const { sendKeyTakenSms } = await import('../../utils/smsTemplates');
          const firstName = formData.given_to_name.split(' ')[0];
          const lastName = formData.given_to_name.split(' ').slice(1).join(' ') || '';

          const keyLabels = keysData.map(k => k.label).join(', ');
          const firstMovement = newMovements[0];

          sendKeyTakenSms({
            contactFirstName: firstName,
            contactLastName: lastName,
            contactPhone: formData.contact_phone,
            keyLabel: keyLabels,
            outAt: now,
            expectedReturnAt: expectedReturnDate,
            agencyName: agencyData.name,
            agencyId: profile.agency_id,
            movementId: firstMovement.id,
          }).then(result => {
            if (result.success) {
              newMovements.forEach(movement => {
                supabase
                  .from('key_movements')
                  .update({ sms_taken_sent: true })
                  .eq('id', movement.id)
                  .then(() => {});
              });
            }
          }).catch(err => {
            console.error('Erreur SMS:', err);
          });
        }
      }

      setShowPhotoModal({ show: false, type: 'out' });
      setShowCheckoutModal(false);
      setCheckoutStep('form');
      setPropertySearch('');
      setShowPropertyDropdown(false);
      setFormData({
        key_id: '',
        is_partial_keyring: false,
        selected_property_id: '',
        selected_keys: [],
        given_to_name: '',
        contact_phone: '',
        contact_email: '',
        purpose: '',
        expected_return_at: '',
        notes: '',
        disable_sms: false,
        agency_signature_out: '',
        provider_signature_out: '',
        photo_out_url: '',
      });
      loadData();
    } catch (error) {
      console.error('Error checking out key:', error);
      alert('Erreur lors de la sortie de la clé');
    }
  }

  async function handleCheckin(movementId: string) {
    setTempMovementId(movementId);
    setShowSignatureModal({ show: true, type: 'provider_in', movementId });
  }

  async function handleSignatureCheckin(signature: string, type: 'provider_in' | 'agency_in') {
    const movementId = showSignatureModal.movementId;
    if (!movementId) return;

    try {
      const now = new Date().toISOString();

      if (type === 'provider_in') {
        await supabase
          .from('key_movements')
          .update({
            provider_signature_in: signature,
            provider_signature_in_at: now,
          })
          .eq('id', movementId);

        setShowSignatureModal({ show: false, type: 'provider_in' });
        setTimeout(() => {
          setShowSignatureModal({ show: true, type: 'agency_in', movementId });
        }, 100);
      } else if (type === 'agency_in') {
        await supabase
          .from('key_movements')
          .update({
            agency_signature_in: signature,
            agency_signature_in_at: now,
          })
          .eq('id', movementId);

        setShowSignatureModal({ show: false, type: 'agency_in' });
        setTimeout(() => {
          setShowPhotoModal({ show: true, type: 'in', movementId });
        }, 100);
      }
    } catch (error) {
      console.error('Error saving signature:', error);
      alert('Erreur lors de l\'enregistrement de la signature');
    }
  }

  async function handlePhotoIn(url: string) {
    const movementId = showPhotoModal.movementId;
    if (!movementId) return;

    if (!url) {
      alert('La photo est obligatoire pour valider le retour');
      return;
    }

    try {
      const movement = movements.find(m => m.id === movementId);
      if (!movement) return;

      const { error: movementError } = await supabase
        .from('key_movements')
        .update({
          returned_at: new Date().toISOString(),
          photo_in_url: url,
        })
        .eq('id', movementId);

      if (movementError) throw movementError;

      const { error: keyError } = await supabase
        .from('keys')
        .update({ status: 'AVAILABLE' })
        .eq('id', movement.key_id);

      if (keyError) throw keyError;

      setShowPhotoModal({ show: false, type: 'in' });
      setTempMovementId(null);
      loadData();
    } catch (error) {
      console.error('Error checking in key:', error);
      alert('Erreur lors du retour de la clé');
    }
  }

  async function handleEditMovement() {
    if (!showEditModal.movement || !editReason.trim()) {
      alert('La raison de modification est obligatoire');
      return;
    }

    if (!profile?.id) return;

    try {
      const { error } = await supabase
        .from('key_movements')
        .update({
          given_to_name: showEditModal.movement.given_to_name,
          purpose: showEditModal.movement.purpose,
          expected_return_at: showEditModal.movement.expected_return_at,
          notes: showEditModal.movement.notes,
          modified_at: new Date().toISOString(),
          modified_by: profile.id,
          modification_reason: editReason
        })
        .eq('id', showEditModal.movement.id);

      if (error) throw error;

      setShowEditModal({ show: false, movement: null });
      setEditReason('');
      loadData();
      alert('Mouvement modifié avec succès');
    } catch (error) {
      console.error('Error editing movement:', error);
      alert('Erreur lors de la modification du mouvement');
    }
  }

  async function handleDeleteMovement() {
    if (!showDeleteModal.movement || !deleteReason.trim()) {
      alert('La raison de suppression est obligatoire');
      return;
    }

    if (!profile?.id) return;

    try {
      const movement = showDeleteModal.movement;

      const { error: movementError } = await supabase
        .from('key_movements')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: profile.id,
          deletion_reason: deleteReason
        })
        .eq('id', movement.id);

      if (movementError) throw movementError;

      if (!movement.returned_at) {
        const { error: keyError } = await supabase
          .from('keys')
          .update({ status: 'AVAILABLE' })
          .eq('id', movement.key_id);

        if (keyError) throw keyError;
      }

      setShowDeleteModal({ show: false, movement: null });
      setDeleteReason('');
      loadData();
      alert('Mouvement supprimé avec succès');
    } catch (error) {
      console.error('Error deleting movement:', error);
      alert('Erreur lors de la suppression du mouvement');
    }
  }

  const filteredMovements = movements.filter((m) => {
    const isCompletelyReturned = m.returned_at &&
      m.agency_signature_in &&
      m.provider_signature_in &&
      m.photo_in_url;

    if (filterStatus === 'all') return !isCompletelyReturned;
    if (filterStatus === 'out') return !m.returned_at;
    if (filterStatus === 'returned') return !!m.returned_at && !isCompletelyReturned;
    return true;
  });

  const groupedMovements = filteredMovements.reduce((groups: {[key: string]: Movement[]}, movement) => {
    const groupKey = `${movement.property?.reference || 'N/A'}_${movement.given_to_name}_${movement.out_at}`;
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(movement);
    return groups;
  }, {});

  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 16);
  };

  if (loading) {
    return (
      <DashboardLayout currentPage="movements">
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-600">Chargement...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentPage="movements">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Mouvements</h1>
          <button
            onClick={() => setShowCheckoutModal(true)}
            className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-secondary transition w-full sm:w-auto justify-center"
          >
            <Plus className="w-5 h-5" />
            <span>Sortie de clé</span>
          </button>
        </div>

        <div className="bg-white rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex items-center space-x-2 sm:space-x-4 mb-3 sm:mb-0">
            <Filter className="w-5 h-5 text-slate-600 hidden sm:block" />
            <div className="flex flex-wrap gap-2 w-full">
              <button
                onClick={() => setFilterStatus('all')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filterStatus === 'all'
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Tous
              </button>
              <button
                onClick={() => setFilterStatus('out')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filterStatus === 'out'
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                En cours
              </button>
              <button
                onClick={() => setFilterStatus('returned')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filterStatus === 'returned'
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Rendues
              </button>
            </div>
          </div>
        </div>

        {filteredMovements.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
            <Activity className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Aucun mouvement</h3>
            <p className="text-slate-600 mb-6">Commencez par effectuer une sortie de clé</p>
            <button
              onClick={() => setShowCheckoutModal(true)}
              className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-secondary transition inline-flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Sortie de clé</span>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedMovements).map(([groupKey, movementsInGroup]) => {
              const firstMovement = movementsInGroup[0];
              const isOverdue = !firstMovement.returned_at && new Date(firstMovement.expected_return_at) < new Date();

              return (
                <div
                  key={groupKey}
                  className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
                    isOverdue ? 'border-red-300' : 'border-slate-200'
                  }`}
                >
                  <div className="bg-amber-50 border-b border-amber-100 px-4 sm:px-6 py-3 sm:py-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-3">
                      <div className="flex-1 w-full">
                        <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-1 break-words">
                          {firstMovement.property?.reference || 'N/A'} - {movementsInGroup.length > 1 ? `Entrée ${movementsInGroup[0].key?.label?.split(' - ')[1] || ''}` : movementsInGroup[0].key?.label}
                        </h3>
                        <div className="flex items-center space-x-3 text-sm">
                          {firstMovement.returned_at ? (
                            <span className="px-2 sm:px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                              Rendue
                            </span>
                          ) : (
                            <span className="px-2 sm:px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                              En cours
                            </span>
                          )}
                        </div>
                      </div>
                      {!firstMovement.returned_at && (
                        <button
                          onClick={() => movementsInGroup.forEach(m => handleCheckin(m.id))}
                          className="bg-green-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center space-x-2 text-sm w-full sm:w-auto justify-center"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span className="hidden sm:inline">Marquer rendue</span>
                          <span className="sm:hidden">Rendue</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-sm">
                      <div>
                        <p className="text-slate-600 text-xs">Donné à</p>
                        <p className="font-semibold text-slate-900 break-words">{firstMovement.given_to_name}</p>
                      </div>
                      <div>
                        <p className="text-slate-600 text-xs">Bien</p>
                        <p className="font-semibold text-slate-900">{firstMovement.property?.reference || 'N/A'}</p>
                        <p className="text-xs text-slate-500 break-words">{firstMovement.property?.address}</p>
                      </div>
                      <div>
                        <p className="text-slate-600 text-xs">Sortie le</p>
                        <p className="font-medium text-slate-900">
                          {new Date(firstMovement.out_at).toLocaleDateString('fr-FR')} {new Date(firstMovement.out_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600 text-xs">Retour prévu</p>
                        <p className="font-medium text-slate-900">
                          {new Date(firstMovement.expected_return_at).toLocaleDateString('fr-FR')} {new Date(firstMovement.expected_return_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    {firstMovement.recorder && (
                      <div className="mt-3 text-sm">
                        <p className="text-slate-600 text-xs">Saisi par</p>
                        <p className="font-medium text-slate-900">
                          {firstMovement.recorder.first_name} {firstMovement.recorder.last_name}
                        </p>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-4">
                      {firstMovement.photo_out_url && (
                        <button
                          onClick={() => setShowPhotoViewer({ show: true, url: firstMovement.photo_out_url!, type: 'out' })}
                          className="flex items-center space-x-2 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition"
                        >
                          <ImageIcon className="w-4 h-4" />
                          <span>Photo sortie</span>
                        </button>
                      )}
                      {firstMovement.agency_signature_out && firstMovement.provider_signature_out && (
                        <button
                          onClick={() => setShowSignaturesViewer({ show: true, movement: firstMovement, type: 'out' })}
                          className="flex items-center space-x-2 text-sm bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition"
                        >
                          <FileSignature className="w-4 h-4" />
                          <span>Signatures sortie</span>
                        </button>
                      )}
                      {profile?.role === 'ADMIN' && (
                        <>
                          <button
                            onClick={() => setShowEditModal({ show: true, movement: firstMovement })}
                            className="flex items-center space-x-2 text-sm bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary transition"
                          >
                            <Pencil className="w-4 h-4" />
                            <span>Modifier</span>
                          </button>
                          <button
                            onClick={() => setShowDeleteModal({ show: true, movement: firstMovement })}
                            className="flex items-center space-x-2 text-sm bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Supprimer</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showCheckoutModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-4 sm:p-6 lg:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Sortie de clé</h2>

              {keys.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-600 mb-4">Aucune clé disponible pour sortie</p>
                  <button
                    onClick={() => setShowCheckoutModal(false)}
                    className="bg-slate-100 text-slate-700 px-6 py-3 rounded-lg hover:bg-slate-200 transition"
                  >
                    Fermer
                  </button>
                </div>
              ) : checkoutStep === 'form' ? (
                <form onSubmit={handleCheckout} className="space-y-4">
                  {/* Property search */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Sélectionner le bien *
                    </label>
                    {formData.selected_property_id && !showPropertyDropdown ? (() => {
                      const selectedKey = keys.find(k => k.id === formData.selected_property_id);
                      const prop = selectedKey?.property;
                      return prop ? (
                        <div className="flex items-center justify-between p-3 border-2 border-primary rounded-lg bg-primary/5 mb-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                <Hash className="w-3 h-3" />{prop.reference}
                              </span>
                              {prop.city && (
                                <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                                  <MapPin className="w-3 h-3" />{prop.city}
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-medium text-slate-800 mt-1 truncate">{prop.address}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, selected_property_id: '', selected_keys: [] });
                              setPropertySearch('');
                              setShowPropertyDropdown(true);
                            }}
                            className="ml-2 p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex-shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : null;
                    })() : (
                      <div className="relative mb-2">
                        <div className="flex items-center border border-slate-300 rounded-lg focus-within:ring-2 focus-within:ring-primary focus-within:border-primary overflow-hidden">
                          <Search className="w-4 h-4 text-slate-400 ml-3 flex-shrink-0" />
                          <input
                            type="text"
                            placeholder="Rechercher par référence, adresse, ville..."
                            value={propertySearch}
                            onChange={e => {
                              setPropertySearch(e.target.value);
                              setShowPropertyDropdown(true);
                            }}
                            onFocus={() => setShowPropertyDropdown(true)}
                            className="w-full px-3 py-2.5 text-sm outline-none bg-transparent"
                          />
                          {propertySearch && (
                            <button
                              type="button"
                              onClick={() => setPropertySearch('')}
                              className="mr-2 p-1 text-slate-400 hover:text-slate-600"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        {showPropertyDropdown && (() => {
                          const search = propertySearch.toLowerCase().trim();
                          const uniqueRefs = Array.from(new Set(
                            keys.filter(k => k.property?.reference).map(k => k.property!.reference)
                          ));
                          const filtered = uniqueRefs
                            .map(ref => keys.find(k => k.property?.reference === ref)!)
                            .filter(k => {
                              if (!search) return true;
                              const p = k.property!;
                              return (
                                p.reference?.toLowerCase().includes(search) ||
                                p.address?.toLowerCase().includes(search) ||
                                p.city?.toLowerCase().includes(search) ||
                                p.postal_code?.toLowerCase().includes(search)
                              );
                            });
                          return (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                              {filtered.length === 0 ? (
                                <div className="px-4 py-6 text-center text-sm text-slate-400">
                                  <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                  Aucun bien trouvé
                                </div>
                              ) : filtered.map(k => {
                                const p = k.property!;
                                const keysCount = keys.filter(kk => kk.property?.reference === p.reference).length;
                                return (
                                  <button
                                    key={k.id}
                                    type="button"
                                    onMouseDown={() => {
                                      const keysForProperty = keys.filter(kk => kk.property?.reference === p.reference);
                                      setFormData({
                                        ...formData,
                                        selected_property_id: k.id,
                                        selected_keys: formData.is_partial_keyring ? [] : keysForProperty.map(kk => kk.id)
                                      });
                                      setShowPropertyDropdown(false);
                                      setPropertySearch('');
                                    }}
                                    className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                          {p.reference}
                                        </span>
                                        {p.city && (
                                          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                                            <MapPin className="w-3 h-3" />
                                            {p.postal_code ? `${p.postal_code} ` : ''}{p.city}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-xs text-slate-400 flex-shrink-0">
                                        {keysCount} clé{keysCount > 1 ? 's' : ''}
                                      </span>
                                    </div>
                                    <p className="text-sm text-slate-700 mt-0.5 truncate">{p.address}</p>
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {formData.selected_property_id && (() => {
                    const selectedKey = keys.find(k => k.id === formData.selected_property_id);
                    if (!selectedKey || !selectedKey.property) return null;
                    const keysForProperty = keys.filter(k => k.property?.reference === selectedKey.property?.reference);
                    if (keysForProperty.length === 0) return null;

                    return (
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-sm font-medium text-slate-700 mb-2">
                          {formData.is_partial_keyring
                            ? `Clés sélectionnées (${formData.selected_keys.length}/${keysForProperty.length})`
                            : `Toutes les clés du trousseau (${keysForProperty.length})`} :
                        </p>
                        <div className="space-y-1">
                          {keysForProperty.map(key => (
                            <div key={key.id} className="flex items-center">
                              <input
                                type="checkbox"
                                checked={formData.selected_keys.includes(key.id)}
                                disabled={!formData.is_partial_keyring}
                                onChange={(e) => {
                                  if (formData.is_partial_keyring) {
                                    if (e.target.checked) {
                                      setFormData({ ...formData, selected_keys: [...formData.selected_keys, key.id] });
                                    } else {
                                      setFormData({ ...formData, selected_keys: formData.selected_keys.filter(id => id !== key.id) });
                                    }
                                  }
                                }}
                                className="w-4 h-4 text-amber-700 border-slate-300 rounded focus:ring-primary disabled:opacity-50"
                              />
                              <label className="ml-2 text-sm text-slate-600">{key.label}</label>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <input
                        id="is_partial_keyring"
                        type="checkbox"
                        checked={formData.is_partial_keyring}
                        onChange={(e) => {
                          const isPartial = e.target.checked;
                          setFormData({
                            ...formData,
                            is_partial_keyring: isPartial,
                            selected_keys: isPartial ? [] : (() => {
                              if (formData.selected_property_id) {
                                const selectedKey = keys.find(k => k.id === formData.selected_property_id);
                                if (selectedKey && selectedKey.property) {
                                  const keysForProperty = keys.filter(k => k.property?.reference === selectedKey.property?.reference);
                                  return keysForProperty.map(k => k.id);
                                }
                              }
                              return [];
                            })()
                          });
                        }}
                        className="w-4 h-4 text-amber-700 border-slate-300 rounded focus:ring-primary"
                      />
                      <label htmlFor="is_partial_keyring" className="ml-2 text-sm font-medium text-blue-900">
                        Sortir seulement certaines clés du trousseau
                      </label>
                    </div>
                    <p className="text-xs text-blue-700 mt-1 ml-6">
                      Par défaut, toutes les clés du bien sont sorties. Cochez pour choisir.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="contact_select" className="block text-sm font-medium text-slate-700 mb-1">
                      Sélectionner un contact
                    </label>
                    <select
                      id="contact_select"
                      value=""
                      onChange={(e) => {
                        const contact = contacts.find(c => c.id === e.target.value);
                        if (contact) {
                          setFormData({
                            ...formData,
                            given_to_name: `${contact.first_name} ${contact.last_name}${contact.company ? ` (${contact.company})` : ''}`,
                            contact_phone: contact.phone || '',
                            contact_email: contact.email || ''
                          });
                        }
                      }}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mb-2"
                    >
                      <option value="">Choisir dans l'annuaire...</option>
                      {contacts.map((contact) => (
                        <option key={contact.id} value={contact.id}>
                          {contact.first_name} {contact.last_name}
                          {contact.company && ` - ${contact.company}`}
                        </option>
                      ))}
                    </select>
                    <label htmlFor="given_to_name" className="block text-sm font-medium text-slate-700 mb-1">
                      Ou saisir manuellement *
                    </label>
                    <input
                      id="given_to_name"
                      type="text"
                      value={formData.given_to_name}
                      onChange={(e) => setFormData({ ...formData, given_to_name: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Nom du preneur"
                    />
                  </div>

                  <div>
                    <label htmlFor="contact_email" className="block text-sm font-medium text-slate-700 mb-1">
                      Email *
                    </label>
                    <input
                      id="contact_email"
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="email@exemple.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="contact_phone" className="block text-sm font-medium text-slate-700 mb-1">
                      Téléphone (pour SMS) *
                    </label>
                    <input
                      id="contact_phone"
                      type="tel"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="06 12 34 56 78"
                    />
                  </div>

                  <div>
                    <label htmlFor="purpose" className="block text-sm font-medium text-slate-700 mb-1">
                      Motif (optionnel)
                    </label>
                    <input
                      id="purpose"
                      type="text"
                      value={formData.purpose}
                      onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Visite, travaux, etc."
                    />
                  </div>

                  <div>
                    <label htmlFor="expected_return_at" className="block text-sm font-medium text-slate-700 mb-1">
                      Date et heure de retour prévue
                    </label>
                    <input
                      id="expected_return_at"
                      type="datetime-local"
                      value={formData.expected_return_at}
                      onChange={(e) => setFormData({ ...formData, expected_return_at: e.target.value })}
                      required
                      min={getTomorrowDate()}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-1">
                      Notes (optionnel)
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

                  <div className="flex items-center">
                    <input
                      id="disable_sms"
                      type="checkbox"
                      checked={formData.disable_sms}
                      onChange={(e) => setFormData({ ...formData, disable_sms: e.target.checked })}
                      className="w-4 h-4 text-amber-700 border-slate-300 rounded focus:ring-primary"
                    />
                    <label htmlFor="disable_sms" className="ml-2 text-sm text-slate-700">
                      Désactiver les SMS pour ce prêt
                    </label>
                  </div>

                  <div className="flex space-x-4 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCheckoutModal(false);
                        setCheckoutStep('form');
                      }}
                      className="flex-1 bg-slate-100 text-slate-700 px-6 py-3 rounded-lg hover:bg-slate-200 transition"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-primary text-white px-6 py-3 rounded-lg hover:bg-secondary transition"
                    >
                      Continuer
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-8">
                  <FileSignature className="w-12 h-12 text-amber-700 mx-auto mb-4" />
                  <p className="text-slate-600 mb-4">
                    Étape {checkoutStep === 'agency_signature' ? '1' : checkoutStep === 'provider_signature' ? '2' : '3'} sur 3
                  </p>
                  <p className="text-sm text-slate-500">
                    {checkoutStep === 'agency_signature' && 'Signature de l\'agence requise'}
                    {checkoutStep === 'provider_signature' && 'Signature du prestataire requise'}
                    {checkoutStep === 'photo' && 'Photo des clés requise'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {showSignatureModal.show && (
          <SignatureCanvas
            title={
              showSignatureModal.type === 'agency_out'
                ? 'Signature de l\'agence (sortie)'
                : showSignatureModal.type === 'provider_out'
                ? 'Signature du prestataire (sortie)'
                : showSignatureModal.type === 'provider_in'
                ? 'Signature du prestataire (retour)'
                : 'Signature de l\'agence (retour)'
            }
            onSave={(signature) => {
              if (showSignatureModal.type === 'agency_out' || showSignatureModal.type === 'provider_out') {
                handleSignature(signature);
              } else {
                handleSignatureCheckin(signature, showSignatureModal.type);
              }
            }}
            onClose={() => {
              setShowSignatureModal({ show: false, type: 'agency_out' });
              if (checkoutStep !== 'form') {
                setShowCheckoutModal(false);
                setCheckoutStep('form');
              }
            }}
          />
        )}

        {showPhotoModal.show && profile?.agency_id && (
          <PhotoUpload
            title={showPhotoModal.type === 'out' ? 'Photo des clés (sortie)' : 'Photo des clés (retour)'}
            agencyId={profile.agency_id}
            movementId={showPhotoModal.movementId}
            onPhotoUploaded={(url) => {
              if (showPhotoModal.type === 'out') {
                handlePhotoOut(url);
              } else {
                handlePhotoIn(url);
              }
            }}
            onClose={() => {
              setShowPhotoModal({ show: false, type: 'out' });
              if (checkoutStep !== 'form') {
                setShowCheckoutModal(false);
                setCheckoutStep('form');
              }
            }}
          />
        )}

        {showPhotoViewer.show && (
          <div
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
            onClick={() => setShowPhotoViewer({ show: false, url: '', type: 'out' })}
          >
            <div className="bg-white rounded-xl p-4 max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-900">
                  {showPhotoViewer.type === 'out' ? 'Photo de sortie' : 'Photo de retour'}
                </h3>
                <button
                  onClick={() => setShowPhotoViewer({ show: false, url: '', type: 'out' })}
                  className="text-slate-600 hover:text-slate-900"
                >
                  ✕
                </button>
              </div>
              <img src={showPhotoViewer.url} alt="Photo" className="w-full h-auto rounded-lg" />
            </div>
          </div>
        )}

        {showSignaturesViewer.show && showSignaturesViewer.movement && (
          <div
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
            onClick={() => setShowSignaturesViewer({ show: false, movement: null, type: 'out' })}
          >
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-900">
                  {showSignaturesViewer.type === 'out' ? 'Signatures de sortie' : 'Signatures de retour'}
                </h3>
                <button
                  onClick={() => setShowSignaturesViewer({ show: false, movement: null, type: 'out' })}
                  className="text-slate-600 hover:text-slate-900"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">Signature de l'agence</h4>
                  {showSignaturesViewer.type === 'out' && showSignaturesViewer.movement.agency_signature_out && (
                    <img src={showSignaturesViewer.movement.agency_signature_out} alt="Signature agence" className="border border-slate-300 rounded-lg w-full" />
                  )}
                  {showSignaturesViewer.type === 'in' && showSignaturesViewer.movement.agency_signature_in && (
                    <img src={showSignaturesViewer.movement.agency_signature_in} alt="Signature agence" className="border border-slate-300 rounded-lg w-full" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">Signature du prestataire</h4>
                  {showSignaturesViewer.type === 'out' && showSignaturesViewer.movement.provider_signature_out && (
                    <img src={showSignaturesViewer.movement.provider_signature_out} alt="Signature prestataire" className="border border-slate-300 rounded-lg w-full" />
                  )}
                  {showSignaturesViewer.type === 'in' && showSignaturesViewer.movement.provider_signature_in && (
                    <img src={showSignaturesViewer.movement.provider_signature_in} alt="Signature prestataire" className="border border-slate-300 rounded-lg w-full" />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {showEditModal.show && showEditModal.movement && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowEditModal({ show: false, movement: null })}
          >
            <div className="bg-white rounded-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-slate-900 mb-4">Modifier le mouvement</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Donné à</label>
                  <input
                    type="text"
                    value={showEditModal.movement.given_to_name}
                    onChange={(e) => setShowEditModal({ ...showEditModal, movement: { ...showEditModal.movement!, given_to_name: e.target.value } })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Motif</label>
                  <input
                    type="text"
                    value={showEditModal.movement.purpose || ''}
                    onChange={(e) => setShowEditModal({ ...showEditModal, movement: { ...showEditModal.movement!, purpose: e.target.value } })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Retour prévu</label>
                  <input
                    type="datetime-local"
                    value={showEditModal.movement.expected_return_at ? new Date(showEditModal.movement.expected_return_at).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setShowEditModal({ ...showEditModal, movement: { ...showEditModal.movement!, expected_return_at: e.target.value } })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                  <textarea
                    value={showEditModal.movement.notes || ''}
                    onChange={(e) => setShowEditModal({ ...showEditModal, movement: { ...showEditModal.movement!, notes: e.target.value } })}
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Raison de la modification *</label>
                  <textarea
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    rows={3}
                    required
                    placeholder="Indiquez la raison de cette modification..."
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => { setShowEditModal({ show: false, movement: null }); setEditReason(''); }}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleEditMovement}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary transition"
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showDeleteModal.show && showDeleteModal.movement && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDeleteModal({ show: false, movement: null })}
          >
            <div className="bg-white rounded-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-red-600 mb-4">Supprimer le mouvement</h3>

              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-900 mb-2">
                    <strong>Attention :</strong> Cette action est irréversible.
                  </p>
                  <p className="text-sm text-red-800">
                    Mouvement : <strong>{showDeleteModal.movement.property?.reference}</strong> - <strong>{showDeleteModal.movement.given_to_name}</strong>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Raison de la suppression *</label>
                  <textarea
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    rows={4}
                    required
                    placeholder="Indiquez la raison de cette suppression..."
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={() => { setShowDeleteModal({ show: false, movement: null }); setDeleteReason(''); }}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleDeleteMovement}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                  >
                    Supprimer définitivement
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
