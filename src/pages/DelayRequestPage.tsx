import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Key, Clock } from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const GOLD = '#B8924A';

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
      const res = await fetch(`${SUPABASE_URL}/functions/v1/delay-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ movementId, message }),
      });
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
      setErrorMsg('Erreur de connexion. Veuillez réessayer.');
      setStatus('error');
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
         style={{ background: 'linear-gradient(135deg, #f5f0e8 0%, #e8dcc8 100%)' }}>

      {/* Card */}
      <div className="w-full max-w-md">

        {/* Logo header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-3"
               style={{ border: `3px solid ${GOLD}`, background: '#fff' }}>
            <img src="/images/logo_rond.jpg" alt="LOTIER" className="w-full h-full rounded-full object-cover" />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: GOLD }}>
            Gestion Locative
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden" style={{ border: `1px solid #e8dcc8` }}>

          {/* Gold top bar */}
          <div style={{ height: 5, background: GOLD }} />

          {/* Content */}
          <div className="p-8">

            {/* SUCCESS */}
            {status === 'success' && (
              <div className="text-center py-2">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
                     style={{ background: '#f0fdf4', border: '2px solid #86efac' }}>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-xl font-bold mb-2" style={{ color: '#111827' }}>
                  Demande envoyée
                </h2>
                <p className="text-sm leading-relaxed" style={{ color: '#6b7280' }}>
                  Votre demande de délai supplémentaire a bien été transmise à l'agence.
                  Un conseiller prendra contact avec vous dans les meilleurs délais.
                </p>
              </div>
            )}

            {/* ALREADY RETURNED */}
            {status === 'already' && (
              <div className="text-center py-2">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
                     style={{ background: '#f8fafc', border: '2px solid #e2e8f0' }}>
                  <CheckCircle className="w-8 h-8 text-slate-400" />
                </div>
                <h2 className="text-xl font-bold mb-2" style={{ color: '#111827' }}>Clé déjà rendue</h2>
                <p className="text-sm" style={{ color: '#6b7280' }}>
                  Cette clé a déjà été restituée à l'agence.
                </p>
              </div>
            )}

            {/* FORM */}
            {(status === 'idle' || status === 'loading') && movementId && (
              <>
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3"
                       style={{ background: '#faf6ef', border: `1.5px solid ${GOLD}` }}>
                    <Clock className="w-6 h-6" style={{ color: GOLD }} />
                  </div>
                  <h2 className="text-xl font-bold mb-1" style={{ color: '#111827' }}>
                    Demande de délai
                  </h2>
                  <p className="text-sm" style={{ color: '#6b7280' }}>
                    Vous ne pouvez pas restituer les clés dans les délais ? Informez-nous.
                  </p>
                </div>

                {/* Reminder */}
                <div className="rounded-xl p-4 mb-5" style={{ background: '#111827' }}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: GOLD }}>
                    Rappel
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: '#d1d5db' }}>
                    Tout retard non signalé entraîne la facturation d'un{' '}
                    <strong style={{ color: GOLD }}>forfait minimum de 50 €</strong>.
                    Signalez votre situation avant l'échéance pour éviter toute pénalité.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1.5" style={{ color: '#374151' }}>
                      Motif de la demande
                      <span className="font-normal text-xs ml-1" style={{ color: '#9ca3af' }}>(optionnel)</span>
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={3}
                      placeholder="Ex : Travaux retardés, nouveau rendez-vous le..."
                      className="w-full px-4 py-3 rounded-xl text-sm resize-none outline-none transition"
                      style={{
                        border: `1.5px solid #e8dcc8`,
                        color: '#111827',
                        background: '#fdfaf7',
                      }}
                      onFocus={e => { e.target.style.borderColor = GOLD; e.target.style.boxShadow = `0 0 0 3px rgba(184,146,74,0.12)`; }}
                      onBlur={e => { e.target.style.borderColor = '#e8dcc8'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="w-full py-4 rounded-xl font-bold text-white text-sm uppercase tracking-wider transition-all disabled:opacity-60"
                    style={{ background: status === 'loading' ? '#9a8060' : GOLD, letterSpacing: '0.08em' }}
                  >
                    {status === 'loading' ? 'Envoi en cours…' : 'Envoyer ma demande de délai'}
                  </button>
                </form>
              </>
            )}

            {/* ERROR: invalid link */}
            {status === 'error' && !movementId && (
              <div className="text-center py-2">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
                     style={{ background: '#fef2f2', border: '2px solid #fca5a5' }}>
                  <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
                <h2 className="text-xl font-bold mb-2" style={{ color: '#111827' }}>Lien invalide</h2>
                <p className="text-sm" style={{ color: '#6b7280' }}>
                  Ce lien est invalide ou a expiré. Contactez directement l'agence.
                </p>
              </div>
            )}

            {/* ERROR: fetch failed */}
            {status === 'error' && movementId && (
              <div className="text-center py-2">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
                     style={{ background: '#fef2f2', border: '2px solid #fca5a5' }}>
                  <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
                <h2 className="text-xl font-bold mb-2" style={{ color: '#111827' }}>Erreur</h2>
                <p className="text-sm mb-4" style={{ color: '#6b7280' }}>{errorMsg}</p>
                <button
                  onClick={() => setStatus('idle')}
                  className="px-6 py-2.5 rounded-xl text-white text-sm font-semibold"
                  style={{ background: GOLD }}
                >
                  Réessayer
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-8 py-4 text-center" style={{ background: '#111827' }}>
            <p className="text-xs" style={{ color: '#6b7280' }}>
              LOTIER Immobilier &mdash;{' '}
              <a href="tel:0467112831" style={{ color: GOLD, textDecoration: 'none', fontWeight: 600 }}>
                04.67.11.28.31
              </a>
            </p>
          </div>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: '#a0917a' }}>
          Propulsé par{' '}
          <span style={{ color: GOLD, fontWeight: 600 }}>KeyManager.io</span>
        </p>
      </div>
    </div>
  );
}
