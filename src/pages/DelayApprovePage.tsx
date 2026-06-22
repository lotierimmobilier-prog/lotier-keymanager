import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle, ChevronRight } from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

type Status = 'loading' | 'confirm' | 'processing' | 'done' | 'already' | 'error';

export function DelayApprovePage() {
  const params = new URLSearchParams(window.location.search);
  const movementId = params.get('id');
  const action = params.get('action') as 'approve' | 'reject' | null;

  const [status, setStatus] = useState<Status>('loading');
  const [result, setResult] = useState<{ approved?: boolean; given_to_name?: string; property?: { reference?: string; address?: string }; new_date?: string | null; already?: boolean } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const isApprove = action === 'approve';

  useEffect(() => {
    if (!movementId || (action !== 'approve' && action !== 'reject')) {
      setStatus('error');
      setErrorMsg('Lien invalide.');
      return;
    }
    // Just show confirmation screen — don't auto-execute
    setStatus('confirm');
  }, [movementId, action]);

  async function handleConfirm() {
    if (!movementId || !action) return;
    setStatus('processing');

    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/delay-request?id=${movementId}&action=${action}`,
        { headers: { apikey: SUPABASE_ANON_KEY } }
      );
      const data = await res.json();

      if (!data.success && !data.already) {
        setErrorMsg(data.error || 'Une erreur est survenue');
        setStatus('error');
        return;
      }

      if (data.already) {
        setResult({ already: true, approved: data.approved });
        setStatus('already');
        return;
      }

      setResult(data);
      setStatus('done');
    } catch {
      setErrorMsg('Erreur de connexion. Veuillez réessayer.');
      setStatus('error');
    }
  }

  const accentColor = isApprove ? '#059669' : '#EF4444';
  const accentLight = isApprove ? '#ECFDF5' : '#FEF2F2';
  const accentBorder = isApprove ? '#6EE7B7' : '#FCA5A5';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ background: '#F7F7F7' }}>
      <div className="w-full max-w-md">

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div style={{ height: 4, background: accentColor }} />

          {/* Loading */}
          {status === 'loading' && (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto" style={{ borderColor: `${accentColor}30`, borderTopColor: accentColor }} />
            </div>
          )}

          {/* Confirm screen */}
          {status === 'confirm' && (
            <div className="p-8">
              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: accentLight, border: `2px solid ${accentBorder}` }}>
                  {isApprove
                    ? <CheckCircle className="w-8 h-8" style={{ color: accentColor }} />
                    : <XCircle className="w-8 h-8" style={{ color: accentColor }} />}
                </div>
              </div>
              <h1 className="text-xl font-bold text-slate-900 text-center mb-2">
                {isApprove ? 'Accepter le délai ?' : 'Refuser le délai ?'}
              </h1>
              <p className="text-sm text-slate-500 text-center mb-8 leading-relaxed">
                {isApprove
                  ? "La date de retour sera mise à jour et le prestataire sera notifié par email."
                  : "Le prestataire sera informé que le délai n'est pas accordé."}
              </p>
              <button
                onClick={handleConfirm}
                className="w-full py-3.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-opacity"
                style={{ background: accentColor }}
              >
                {isApprove ? 'Confirmer l\'acceptation' : 'Confirmer le refus'}
                <ChevronRight className="w-4 h-4" />
              </button>
              <a
                href="/dashboard/movements"
                className="block text-center text-sm text-slate-400 hover:text-slate-600 mt-4 transition"
              >
                Gérer depuis le tableau de bord
              </a>
            </div>
          )}

          {/* Processing */}
          {status === 'processing' && (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-3" style={{ borderColor: `${accentColor}30`, borderTopColor: accentColor }} />
              <p className="text-slate-500 text-sm">Traitement en cours…</p>
            </div>
          )}

          {/* Done */}
          {status === 'done' && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: accentLight, border: `2px solid ${accentBorder}` }}>
                {isApprove
                  ? <CheckCircle className="w-8 h-8" style={{ color: accentColor }} />
                  : <XCircle className="w-8 h-8" style={{ color: accentColor }} />}
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">
                {isApprove ? 'Délai accordé' : 'Délai refusé'}
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed mb-2">
                {result?.given_to_name && (
                  <><strong className="text-slate-700">{result.given_to_name}</strong> a été notifié par email.</>
                )}
              </p>
              {isApprove && result?.new_date && (
                <div className="mt-4 inline-block rounded-xl px-4 py-2 text-sm font-semibold text-white" style={{ background: accentColor }}>
                  Nouvelle date : {new Date(result.new_date).toLocaleString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
              <a
                href="/dashboard/movements"
                className="block mt-6 text-sm font-medium transition"
                style={{ color: accentColor }}
              >
                Retour au tableau de bord
              </a>
            </div>
          )}

          {/* Already processed */}
          {status === 'already' && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 bg-amber-50 border-2 border-amber-200">
                <Clock className="w-8 h-8 text-amber-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Déjà traitée</h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                Cette demande a déjà été {result?.approved ? 'acceptée' : 'refusée'}.
              </p>
              <a href="/dashboard/movements" className="block mt-6 text-sm font-medium text-amber-600">
                Retour au tableau de bord
              </a>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 bg-red-50 border-2 border-red-200">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Erreur</h2>
              <p className="text-sm text-slate-500 leading-relaxed">{errorMsg || 'Une erreur est survenue.'}</p>
            </div>
          )}
        </div>

        <p className="text-center text-xs mt-4 text-slate-400">
          Propulsé par <span className="font-semibold text-slate-600">KeyManager.io</span>
        </p>
      </div>
    </div>
  );
}
