import { useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { Archive, Search, FileSignature, Image as ImageIcon, ArrowRight, ArrowLeft, Clock } from 'lucide-react';

interface Movement {
  id: string;
  key_id: string;
  given_to_name: string;
  purpose: string | null;
  out_at: string;
  expected_return_at: string;
  returned_at: string | null;
  notes: string | null;
  agency_signature_out: string | null;
  provider_signature_out: string | null;
  photo_out_url: string | null;
  agency_signature_in: string | null;
  provider_signature_in: string | null;
  photo_in_url: string | null;
  key?: {
    label: string;
  };
  property?: {
    reference: string;
    address: string;
  };
  recorder?: {
    first_name: string;
    last_name: string;
  };
}

export function KeysHistoryTab() {
  const { profile } = useAuth();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPhotoViewer, setShowPhotoViewer] = useState<{ show: boolean; url: string; type: 'out' | 'in' }>({ show: false, url: '', type: 'out' });
  const [showSignaturesViewer, setShowSignaturesViewer] = useState<{ show: boolean; movement: Movement | null; type: 'out' | 'in' }>({ show: false, movement: null, type: 'out' });

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
        .order('out_at', { ascending: false });

      if (error) throw error;

      const movementsData = (data || []).map((m: any) => ({
        ...m,
        key: m.keys,
        property: m.keys?.properties,
      }));

      setMovements(movementsData);
    } catch (error) {
      console.error('Error loading movements:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredMovements = movements.filter(movement => {
    if (searchTerm === '') return true;
    const search = searchTerm.toLowerCase();
    return (
      movement.given_to_name.toLowerCase().includes(search) ||
      movement.key?.label.toLowerCase().includes(search) ||
      movement.property?.reference.toLowerCase().includes(search) ||
      movement.property?.address.toLowerCase().includes(search) ||
      movement.purpose?.toLowerCase().includes(search)
    );
  });

  const groupedByProperty = filteredMovements.reduce((groups: {[key: string]: Movement[]}, movement) => {
    const propertyKey = movement.property?.reference || 'Sans bien';
    if (!groups[propertyKey]) {
      groups[propertyKey] = [];
    }
    groups[propertyKey].push(movement);
    return groups;
  }, {});

  if (loading) {
    return <div className="text-center py-12 text-slate-600">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-600 mb-4">Historique complet de tous les mouvements de clés (sorties et retours)</p>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher dans l'historique..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {filteredMovements.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
          <Archive className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">Aucun mouvement trouvé</h3>
          <p className="text-slate-600">L'historique apparaîtra ici une fois des mouvements effectués</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByProperty).map(([propertyRef, propertyMovements]) => (
            <div key={propertyRef} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-3">
                <h3 className="text-lg font-bold text-slate-900">{propertyRef}</h3>
                {propertyMovements[0].property && (
                  <p className="text-sm text-slate-600">{propertyMovements[0].property.address}</p>
                )}
                <p className="text-xs text-slate-500 mt-1">{propertyMovements.length} mouvement{propertyMovements.length > 1 ? 's' : ''}</p>
              </div>

              <div className="divide-y divide-slate-200">
                {propertyMovements.map((movement) => {
                  const isReturned = !!movement.returned_at;
                  const durationDays = isReturned
                    ? Math.ceil((new Date(movement.returned_at).getTime() - new Date(movement.out_at).getTime()) / (1000 * 60 * 60 * 24))
                    : Math.ceil((new Date().getTime() - new Date(movement.out_at).getTime()) / (1000 * 60 * 60 * 24));

                  return (
                    <div key={movement.id} className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-bold text-slate-900">{movement.key?.label}</h4>
                            {isReturned ? (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                                Retournée
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                                En cours
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 mb-1">
                            <span className="font-medium">Donné à:</span> {movement.given_to_name}
                          </p>
                          {movement.purpose && (
                            <p className="text-sm text-slate-600 mb-1">
                              <span className="font-medium">Motif:</span> {movement.purpose}
                            </p>
                          )}
                          {movement.recorder && (
                            <p className="text-xs text-slate-500">
                              Saisi par {movement.recorder.first_name} {movement.recorder.last_name}
                            </p>
                          )}
                        </div>
                        <div className="text-sm text-slate-500 text-right">
                          <p className="font-medium">{durationDays} jour{durationDays > 1 ? 's' : ''}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-start space-x-2">
                          <ArrowRight className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-slate-700 mb-1">SORTIE</p>
                            <p className="text-sm text-slate-900">
                              {new Date(movement.out_at).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </p>
                            <p className="text-xs text-slate-500">
                              {new Date(movement.out_at).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              {movement.photo_out_url && (
                                <button
                                  onClick={() => setShowPhotoViewer({ show: true, url: movement.photo_out_url!, type: 'out' })}
                                  className="flex items-center space-x-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition"
                                >
                                  <ImageIcon className="w-3 h-3" />
                                  <span>Photo</span>
                                </button>
                              )}
                              {movement.agency_signature_out && movement.provider_signature_out && (
                                <button
                                  onClick={() => setShowSignaturesViewer({ show: true, movement, type: 'out' })}
                                  className="flex items-center space-x-1 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200 transition"
                                >
                                  <FileSignature className="w-3 h-3" />
                                  <span>Signatures</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start space-x-2">
                          {isReturned ? (
                            <>
                              <ArrowLeft className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-xs font-semibold text-slate-700 mb-1">RETOUR</p>
                                <p className="text-sm text-slate-900">
                                  {new Date(movement.returned_at).toLocaleDateString('fr-FR', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {new Date(movement.returned_at).toLocaleTimeString('fr-FR', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  {movement.photo_in_url && (
                                    <button
                                      onClick={() => setShowPhotoViewer({ show: true, url: movement.photo_in_url!, type: 'in' })}
                                      className="flex items-center space-x-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition"
                                    >
                                      <ImageIcon className="w-3 h-3" />
                                      <span>Photo</span>
                                    </button>
                                  )}
                                  {movement.agency_signature_in && movement.provider_signature_in && (
                                    <button
                                      onClick={() => setShowSignaturesViewer({ show: true, movement, type: 'in' })}
                                      className="flex items-center space-x-1 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200 transition"
                                    >
                                      <FileSignature className="w-3 h-3" />
                                      <span>Signatures</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              <Clock className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-xs font-semibold text-slate-700 mb-1">RETOUR PRÉVU</p>
                                <p className="text-sm text-slate-900">
                                  {new Date(movement.expected_return_at).toLocaleDateString('fr-FR', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </p>
                                <p className="text-xs text-orange-600 font-medium mt-1">
                                  En cours
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {movement.notes && (
                        <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-slate-700">
                          <span className="font-medium">Note:</span> {movement.notes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
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
    </div>
  );
}
