import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Clock, CheckCircle, AlertCircle, Key } from 'lucide-react';

export function DelayRequestPage() {
  const params = new URLSearchParams(window.location.search);
  const movementId = params.get('id');

  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'already'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!movementId) setStatus('error');
  }, [movementId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!movementId) return;
    setStatus('loading');

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delay-request`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ movementId, message }),
        }
      );
      const data = await res.json();
      if (data.success) {
        setStatus('success');
      } else if (data.error === 'Cette clé a déjà été rendue') {
        setStatus('already');
      } else {
        setErrorMsg(data.error || 'Une erreur est survenue');
        setStatus('error');
      }
    } catch {
      setErrorMsg('Erreur de connexion');
      setStatus('error');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f1f5f9' }}>
      <div className="w-full max-w-md mx-4">

        <div className="rounded-2xl overflow-hidden shadow-xl">
          <div className="px-8 py-6 text-center" style={{ background: '#1E293B' }}>
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4" style={{ background: '#D97706' }}>
              <Key className="w-7 h-7 text-white" />
            </div>
            <div className="text-2xl font-bold tracking-wide" style={{ color: '#D97706' }}>LOTIER</div>
            <p className="text-slate-300 text-sm mt-1">Gestion de clés</p>
          </div>

          <div className="bg-white px-8 py-8">
            {status === 'success' && (
              <div className="text-center py-4">
                <CheckCircle className="w-14 h-14 mx-auto mb-4" style={{ color: '#16a34a' }} />
                <h2 className="text-xl font-bold text-slate-900 mb-2">Demande envoyée</h2>
                <p className="text-slate-500 text-sm">
                  Votre demande de délai supplémentaire a bien été transmise à l'agence. Vous serez contacté rapidement.
                </p>
              </div>
            )}

            {status === 'already' && (
              <div className="text-center py-4">
                <CheckCircle className="w-14 h-14 mx-auto mb-4 text-slate-400" />
                <h2 className="text-xl font-bold text-slate-900 mb-2">Clé déjà rendue</h2>
                <p className="text-slate-500 text-sm">Cette clé a déjà été rendue à l'agence.</p>
              </div>
            )}

            {(status === 'idle' || status === 'loading') && movementId && (
              <>
                <div className="mb-6 p-4 rounded-xl border-l-4" style={{ background: '#fffbeb', borderColor: '#D97706' }}>
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#D97706' }} />
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">Demande de délai supplémentaire</p>
                      <p className="text-slate-600 text-xs mt-1">
                        Vous pouvez demander un délai supplémentaire pour la restitution de la clé. L'agence sera notifiée immédiatement.
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Motif de la demande <span className="text-slate-400">(optionnel)</span>
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={3}
                      placeholder="Ex : Travaux non terminés, nouveau rendez-vous prévu le..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 resize-none"
                      style={{ '--tw-ring-color': '#D97706' } as React.CSSProperties}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="w-full py-3 rounded-xl font-semibold text-white transition disabled:opacity-60"
                    style={{ background: '#D97706' }}
                  >
                    {status === 'loading' ? 'Envoi en cours...' : 'Envoyer la demande de délai'}
                  </button>
                </form>
              </>
            )}

            {status === 'error' && !movementId && (
              <div className="text-center py-4">
                <AlertCircle className="w-14 h-14 mx-auto mb-4 text-red-400" />
                <h2 className="text-xl font-bold text-slate-900 mb-2">Lien invalide</h2>
                <p className="text-slate-500 text-sm">Ce lien est invalide ou a expiré. Contactez directement l'agence.</p>
              </div>
            )}

            {status === 'error' && movementId && (
              <div className="text-center py-4">
                <AlertCircle className="w-14 h-14 mx-auto mb-4 text-red-400" />
                <h2 className="text-xl font-bold text-slate-900 mb-2">Erreur</h2>
                <p className="text-slate-500 text-sm">{errorMsg}</p>
                <button
                  onClick={() => setStatus('idle')}
                  className="mt-4 px-6 py-2 rounded-lg text-white text-sm font-medium"
                  style={{ background: '#D97706' }}
                >
                  Réessayer
                </button>
              </div>
            )}
          </div>

          <div className="px-8 py-4 text-center" style={{ background: '#1E293B' }}>
            <p className="text-slate-400 text-xs">
              Propulsé par <span style={{ color: '#D97706' }}>KeyManager.io</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
