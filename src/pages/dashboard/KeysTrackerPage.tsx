import { useState, useEffect } from 'react';
import { Clock, MessageSquare, Key, MapPin, User, Send, CheckCircle, Info, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { DashboardLayout } from '../../components/DashboardLayout';

interface KeyMovement {
  id: string;
  out_at: string;
  expected_return_at: string;
  given_to_name: string;
  contact_phone: string | null;
  purpose: string | null;
  keys: {
    label: string;
    properties: {
      address: string;
      reference: string;
    } | null;
  } | null;
  users: {
    first_name: string;
    last_name: string;
  } | null;
}

export function KeysTrackerPage() {
  const { profile } = useAuth();
  const [movements, setMovements] = useState<KeyMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [showKeysModal, setShowKeysModal] = useState<{ show: boolean; group: KeyMovement[] | null }>({ show: false, group: null });
  const [showContactModal, setShowContactModal] = useState<{ show: boolean; movement: KeyMovement | null }>({ show: false, movement: null });
  const [showDetailsModal, setShowDetailsModal] = useState<{ show: boolean; group: KeyMovement[] | null }>({ show: false, group: null });

  useEffect(() => {
    if (profile?.agency_id) {
      loadMovements();
    }
  }, [profile]);

  async function loadMovements() {
    if (!profile?.agency_id) return;

    try {
      const { data, error } = await supabase
        .from('key_movements')
        .select(`
          id,
          out_at,
          expected_return_at,
          given_to_name,
          contact_phone,
          purpose,
          keys:key_id (
            label,
            properties:property_id (
              address,
              reference
            )
          ),
          users:taken_by_user_id (
            first_name,
            last_name
          )
        `)
        .eq('agency_id', profile.agency_id)
        .is('returned_at', null)
        .is('deleted_at', null)
        .order('expected_return_at', { ascending: true });

      if (error) throw error;
      setMovements(data || []);
    } catch (err) {
      console.error('Erreur chargement mouvements:', err);
    } finally {
      setLoading(false);
    }
  }

  async function sendReminder(movement: KeyMovement) {
    if (!profile || !movement.contact_phone) return;

    setSendingId(movement.id);

    try {
      const keyLabel = movement.keys?.label || 'Clé';
      const propertyAddress = movement.keys?.properties?.address || 'Propriété';
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

  function getStatusLabel(expectedReturn: string): string {
    const now = new Date();
    const returnDate = new Date(expectedReturn);
    const diffHours = (returnDate.getTime() - now.getTime()) / 1000 / 60 / 60;

    if (diffHours < 0) return 'En retard';
    if (diffHours < 2) return 'Retour imminent';
    return 'En cours';
  }

  if (loading) {
    return (
      <DashboardLayout currentPage="keys-tracker">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  const groupedMovements = movements.reduce((groups: {[key: string]: KeyMovement[]}, movement) => {
    const propertyRef = movement.keys?.properties?.reference || 'N/A';
    const groupKey = `${propertyRef}_${movement.given_to_name}_${movement.out_at}`;
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(movement);
    return groups;
  }, {});

  const groupedArray = Object.values(groupedMovements);

  const overdueGroups = groupedArray.filter(group => new Date(group[0].expected_return_at) < new Date());
  const upcomingGroups = groupedArray.filter(group => {
    const diff = (new Date(group[0].expected_return_at).getTime() - new Date().getTime()) / 1000 / 60 / 60;
    return diff >= 0 && diff < 2;
  });

  return (
    <DashboardLayout currentPage="keys-tracker">
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center space-x-3">
            <Clock className="w-8 h-8 text-amber-600" />
            <span>Clés Sorties</span>
          </h1>
          <p className="text-slate-600 mt-2">Suivi des clés sorties et rappels SMS</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
              <Key className="w-6 h-6 text-white" />
            </div>
            <CheckCircle className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">{groupedArray.length}</div>
          <div className="text-sm font-semibold text-slate-600">Sorties en cours</div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-white animate-wiggle" />
            </div>
            <Clock className="w-5 h-5 text-orange-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">{upcomingGroups.length}</div>
          <div className="text-sm font-semibold text-slate-600">Retours imminents</div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <MessageSquare className="w-5 h-5 text-red-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">{overdueGroups.length}</div>
          <div className="text-sm font-semibold text-slate-600">Sorties en retard</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">Détails des clés en cours</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Clés
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Détenteur
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Sortie
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Retour prévu
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {groupedArray.map((group, groupIndex) => {
                const firstMovement = group[0];
                const statusColor = getStatusColor(firstMovement.expected_return_at);
                const statusLabel = getStatusLabel(firstMovement.expected_return_at);
                const canSendSms = firstMovement.contact_phone;
                const propertyRef = firstMovement.keys?.properties?.reference || 'N/A';
                const isFullKeyring = group.length > 1;

                return (
                  <tr key={`group-${groupIndex}`} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setShowKeysModal({ show: true, group })}
                        className="flex items-center space-x-2 text-left hover:text-amber-600 transition"
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Key className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">
                            {isFullKeyring ? `${propertyRef} - Trousseau (${group.length})` : firstMovement.keys?.label || 'Clé'}
                          </div>
                          <div className="text-xs text-slate-500">{firstMovement.keys?.properties?.address}</div>
                        </div>
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setShowContactModal({ show: true, movement: firstMovement })}
                        className="text-left hover:text-amber-600 transition"
                      >
                        <div className="font-medium text-slate-900">{firstMovement.given_to_name}</div>
                        {firstMovement.contact_phone && (
                          <div className="text-xs text-slate-500">{firstMovement.contact_phone}</div>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      {new Date(firstMovement.out_at).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      {new Date(firstMovement.expected_return_at).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                        statusColor === 'red'
                          ? 'bg-red-100 text-red-800'
                          : statusColor === 'orange'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => setShowDetailsModal({ show: true, group })}
                          className="p-2 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                          title="Voir les détails"
                        >
                          <Info className="w-5 h-5" />
                        </button>
                        {canSendSms && (
                          <button
                            onClick={() => sendReminder(firstMovement)}
                            disabled={sendingId === firstMovement.id}
                            className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition disabled:opacity-50"
                            title="Envoyer un rappel SMS"
                          >
                            {sendingId === firstMovement.id ? (
                              <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                            ) : (
                              <Send className="w-5 h-5" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {movements.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    Aucune clé en circulation pour le moment
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showKeysModal.show && showKeysModal.group && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowKeysModal({ show: false, group: null })}>
          <div className="bg-white rounded-xl p-6 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-900">Détail des clés</h3>
              <button
                onClick={() => setShowKeysModal({ show: false, group: null })}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              {showKeysModal.group.map((movement, idx) => (
                <div key={movement.id} className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                  <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Key className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-slate-900">{movement.keys?.label}</div>
                    <div className="text-xs text-slate-500">{movement.keys?.properties?.reference}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showContactModal.show && showContactModal.movement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowContactModal({ show: false, movement: null })}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-900">Informations du détenteur</h3>
              <button
                onClick={() => setShowContactModal({ show: false, movement: null })}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500">Nom</label>
                <div className="text-lg font-semibold text-slate-900">{showContactModal.movement.given_to_name}</div>
              </div>
              {showContactModal.movement.contact_phone && (
                <div>
                  <label className="text-xs font-medium text-slate-500">Téléphone</label>
                  <div className="text-lg font-medium text-slate-900">{showContactModal.movement.contact_phone}</div>
                </div>
              )}
              {showContactModal.movement.users && (
                <div>
                  <label className="text-xs font-medium text-slate-500">Sortie effectuée par</label>
                  <div className="text-base font-medium text-slate-900">
                    {showContactModal.movement.users.first_name} {showContactModal.movement.users.last_name}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showDetailsModal.show && showDetailsModal.group && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowDetailsModal({ show: false, group: null })}>
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900">Détails complets de la sortie</h3>
              <button
                onClick={() => setShowDetailsModal({ show: false, group: null })}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {(() => {
              const firstMovement = showDetailsModal.group[0];
              const isFullKeyring = showDetailsModal.group.length > 1;
              const propertyRef = firstMovement.keys?.properties?.reference || 'N/A';

              return (
                <div className="space-y-6">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h4 className="font-semibold text-slate-900 mb-3">Clés sorties</h4>
                    {isFullKeyring ? (
                      <div>
                        <div className="font-medium text-amber-900 mb-2">Trousseau complet ({showDetailsModal.group.length} clés)</div>
                        <div className="space-y-2">
                          {showDetailsModal.group.map((movement) => (
                            <div key={movement.id} className="text-sm text-slate-700 flex items-center space-x-2">
                              <Key className="w-3 h-3" />
                              <span>{movement.keys?.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="font-medium text-slate-900">{firstMovement.keys?.label}</div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-slate-500">Bien</label>
                      <div className="font-medium text-slate-900">{propertyRef}</div>
                      <div className="text-sm text-slate-600">{firstMovement.keys?.properties?.address}</div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500">Détenteur</label>
                      <div className="font-medium text-slate-900">{firstMovement.given_to_name}</div>
                      {firstMovement.contact_phone && (
                        <div className="text-sm text-slate-600">{firstMovement.contact_phone}</div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-slate-500">Date de sortie</label>
                      <div className="font-medium text-slate-900">
                        {new Date(firstMovement.out_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </div>
                      <div className="text-sm text-slate-600">
                        {new Date(firstMovement.out_at).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500">Retour prévu</label>
                      <div className="font-medium text-slate-900">
                        {new Date(firstMovement.expected_return_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </div>
                      <div className="text-sm text-slate-600">
                        {new Date(firstMovement.expected_return_at).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>

                  {firstMovement.purpose && (
                    <div>
                      <label className="text-xs font-medium text-slate-500">Motif</label>
                      <div className="text-slate-900">{firstMovement.purpose}</div>
                    </div>
                  )}

                  {firstMovement.users && (
                    <div>
                      <label className="text-xs font-medium text-slate-500">Sortie effectuée par</label>
                      <div className="font-medium text-slate-900">
                        {firstMovement.users.first_name} {firstMovement.users.last_name}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
      </div>
    </DashboardLayout>
  );
}
