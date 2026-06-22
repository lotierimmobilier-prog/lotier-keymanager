import { useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { Plus, CheckCircle, Filter, FileSignature, Image as ImageIcon, Pencil, Trash2, Send, Info, X, Clock, Activity } from 'lucide-react';
import { SignatureCanvas } from '../../../components/SignatureCanvas';
import { PhotoUpload } from '../../../components/PhotoUpload';

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
  contact_phone: string | null;
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

export function KeysCirculationTab() {
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
  const [filterStatus, setFilterStatus] = useState<'all' | 'out'>('all');
  const [checkoutStep, setCheckoutStep] = useState<'form' | 'agency_signature' | 'provider_signature' | 'photo'>('form');
  const [showPhotoViewer, setShowPhotoViewer] = useState<{ show: boolean; url: string; type: 'out' | 'in' }>({ show: false, url: '', type: 'out' });
  const [showSignaturesViewer, setShowSignaturesViewer] = useState<{ show: boolean; movement: Movement | null; type: 'out' | 'in' }>({ show: false, movement: null, type: 'out' });
  const [showEditModal, setShowEditModal] = useState<{ show: boolean; movement: Movement | null }>({ show: false, movement: null });
  const [showDeleteModal, setShowDeleteModal] = useState<{ show: boolean; movement: Movement | null }>({ show: false, movement: null });
  const [editReason, setEditReason] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [sendingId, setSendingId] = useState<string | null>(null);
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
    responsibility_transferred: false,
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
          .is('returned_at', null)
          .order('out_at', { ascending: false}),
        supabase
          .from('keys')
          .select(`
            id,
            label,
            status,
            properties (
              reference,
              address
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
      const expectedReturnDate = new Date(formData.expected_return_at).toISOString();
      const now = new Date().toISOString();

      const keysToCheckout = formData.selected_keys;

      const movementsToCreate = keysToCheckout.map(keyId => ({
        agency_id: profile.agency_id,
        key_id: keyId,
        taken_by_user_id: profile.id,
        given_to_name: formData.given_to_name,
        contact_phone: formData.contact_phone || null,
        purpose: formData.purpose || null,
        expected_return_at: expectedReturnDate,
        notes: formData.notes || null,
        responsibility_transferred: formData.responsibility_transferred,
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
          const { sendKeyTakenSms } = await import('../../../utils/smsTemplates');
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
        responsibility_transferred: false,
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

  async function sendReminder(movement: Movement) {
    if (!profile || !movement.contact_phone) return;

    setSendingId(movement.id);

    try {
      const keyLabel = movement.key?.label || 'Clé';
      const propertyAddress = movement.property?.address || 'Propriété';
      const expectedDate = new Date(movement.expected_return_at).toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const message = `Rappel : La clé "${keyLabel}" pour ${propertyAddress} devait être retournée le ${expectedDate}. Merci de la restituer rapidement.`;

      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session) throw new Error('Non authentifié');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-sms`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authData.session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: movement.contact_phone,
            message,
            movementId: movement.id,
            agencyId: profile.agency_id,
            type: 'key_overdue',
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        alert('SMS de rappel envoyé avec succès !');
      } else {
        alert(`Erreur lors de l'envoi : ${result.error}`);
      }
    } catch (err) {
      console.error('Erreur envoi SMS:', err);
      alert('Erreur lors de l\'envoi du SMS');
    } finally {
      setSendingId(null);
    }
  }

  function getStatusColor(expectedReturn: string): string {
    const now = new Date();
    const returnDate = new Date(expectedReturn);
    const diffHours = (returnDate.getTime() - now.getTime()) / 1000 / 60 / 60;

    if (diffHours < 0) return 'red';
    if (diffHours < 2) return 'orange';
    return 'green';
  }

  const filteredMovements = movements;

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

  const overdueCount = movements.filter(m => new Date(m.expected_return_at) < new Date()).length;
  const upcomingCount = movements.filter(m => {
    const diff = (new Date(m.expected_return_at).getTime() - new Date().getTime()) / 1000 / 60 / 60;
    return diff >= 0 && diff < 2;
  }).length;

  if (loading) {
    return <div className="text-center py-12 text-slate-600">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-slate-600">Vue des clés actuellement en circulation</p>
        </div>
        <button
          onClick={() => setShowCheckoutModal(true)}
          className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-secondary transition"
        >
          <Plus className="w-5 h-5" />
          <span>Sortie de clé</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{movements.length}</div>
          <div className="text-sm font-semibold text-slate-600">Sorties en cours</div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{upcomingCount}</div>
          <div className="text-sm font-semibold text-slate-600">Retours imminents</div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{overdueCount}</div>
          <div className="text-sm font-semibold text-slate-600">Sorties en retard</div>
        </div>
      </div>

      {movements.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
          <Activity className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">Aucune clé en circulation</h3>
          <p className="text-slate-600 mb-6">Toutes les clés sont actuellement disponibles</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedMovements).map(([groupKey, movementsInGroup]) => {
            const firstMovement = movementsInGroup[0];
            const isOverdue = new Date(firstMovement.expected_return_at) < new Date();
            const statusColor = getStatusColor(firstMovement.expected_return_at);

            return (
              <div
                key={groupKey}
                className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
                  isOverdue ? 'border-red-300' : 'border-slate-200'
                }`}
              >
                <div className="bg-amber-50 border-b border-amber-100 px-6 py-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-900 mb-1">
                        {firstMovement.property?.reference || 'N/A'} - {movementsInGroup.length > 1 ? `Entrée ${movementsInGroup[0].key?.label?.split(' - ')[1] || ''}` : movementsInGroup[0].key?.label}
                      </h3>
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                        statusColor === 'red'
                          ? 'bg-red-100 text-red-800'
                          : statusColor === 'orange'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {statusColor === 'red' ? 'En retard' : statusColor === 'orange' ? 'Retour imminent' : 'En cours'}
                      </span>
                    </div>
                    <button
                      onClick={() => movementsInGroup.forEach(m => handleCheckin(m.id))}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center space-x-2 text-sm"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Marquer rendue</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-slate-600 text-xs">Donné à</p>
                      <p className="font-semibold text-slate-900">{firstMovement.given_to_name}</p>
                    </div>
                    <div>
                      <p className="text-slate-600 text-xs">Bien</p>
                      <p className="font-semibold text-slate-900">{firstMovement.property?.reference || 'N/A'}</p>
                      <p className="text-xs text-slate-500">{firstMovement.property?.address}</p>
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

                  <div className="flex items-center gap-3 mt-4">
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
                        <span>Signatures</span>
                      </button>
                    )}
                    {firstMovement.contact_phone && (
                      <button
                        onClick={() => sendReminder(firstMovement)}
                        disabled={sendingId === firstMovement.id}
                        className="flex items-center space-x-2 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                      >
                        {sendingId === firstMovement.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            <span>Rappel SMS</span>
                          </>
                        )}
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
          <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
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
                <div>
                  <label htmlFor="property_select" className="block text-sm font-medium text-slate-700 mb-1">
                    Sélectionner le bien *
                  </label>
                  <select
                    id="property_select"
                    value={formData.selected_property_id}
                    onChange={(e) => {
                      const propertyId = e.target.value;
                      const selectedKey = keys.find(k => k.id === propertyId);
                      if (selectedKey && selectedKey.property) {
                        const keysForProperty = keys.filter(k => k.property?.reference === selectedKey.property?.reference);
                        setFormData({
                          ...formData,
                          selected_property_id: propertyId,
                          selected_keys: formData.is_partial_keyring ? [] : keysForProperty.map(k => k.id)
                        });
                      }
                    }}
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mb-2"
                  >
                    <option value="">Choisir un bien...</option>
                    {Array.from(new Set(keys.filter(k => k.property?.reference).map(k => k.property!.reference))).map(ref => {
                      const key = keys.find(k => k.property?.reference === ref)!;
                      return (
                        <option key={key.id} value={key.id}>
                          {key.property!.reference} - {key.property!.address}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {formData.selected_property_id && (() => {
                  const selectedKey = keys.find(k => k.id === formData.selected_property_id);
                  if (!selectedKey || !selectedKey.property) return null;
                  const keysForProperty = keys.filter(k => k.property?.reference === selectedKey.property?.reference);
                  if (keysForProperty.length === 0) return null;

                  return (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-sm font-medium text-slate-700 mb-2">
                        {formData.is_partial_keyring ? `Clés sélectionnées (${formData.selected_keys.length}/${keysForProperty.length})` : `Toutes les clés du trousseau (${keysForProperty.length})`} :
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
                                    setFormData({
                                      ...formData,
                                      selected_keys: [...formData.selected_keys, key.id]
                                    });
                                  } else {
                                    setFormData({
                                      ...formData,
                                      selected_keys: formData.selected_keys.filter(id => id !== key.id)
                                    });
                                  }
                                }
                              }}
                              className="w-4 h-4 text-amber-700 border-slate-300 rounded focus:ring-primary disabled:opacity-50"
                            />
                            <label className="ml-2 text-sm text-slate-600">
                              {key.label}
                            </label>
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

                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      id="responsibility_transferred"
                      type="checkbox"
                      checked={formData.responsibility_transferred}
                      onChange={(e) => setFormData({ ...formData, responsibility_transferred: e.target.checked })}
                      className="w-4 h-4 text-amber-700 border-slate-300 rounded focus:ring-primary"
                    />
                    <label htmlFor="responsibility_transferred" className="ml-2 text-sm text-slate-700">
                      Transfert de responsabilité
                    </label>
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
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setShowPhotoViewer({ show: false, url: '', type: 'out' })}>
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
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setShowSignaturesViewer({ show: false, movement: null, type: 'out' })}>
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900">Signatures de sortie</h3>
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
                {showSignaturesViewer.movement.agency_signature_out && (
                  <img src={showSignaturesViewer.movement.agency_signature_out} alt="Signature agence" className="border border-slate-300 rounded-lg w-full" />
                )}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Signature du prestataire</h4>
                {showSignaturesViewer.movement.provider_signature_out && (
                  <img src={showSignaturesViewer.movement.provider_signature_out} alt="Signature prestataire" className="border border-slate-300 rounded-lg w-full" />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditModal.show && showEditModal.movement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowEditModal({ show: false, movement: null })}>
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
                  onClick={() => {
                    setShowEditModal({ show: false, movement: null });
                    setEditReason('');
                  }}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowDeleteModal({ show: false, movement: null })}>
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
                  onClick={() => {
                    setShowDeleteModal({ show: false, movement: null });
                    setDeleteReason('');
                  }}
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
  );
}
