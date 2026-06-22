import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Clock, MapPin, Key, Calendar, ChevronRight } from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

interface MovementInfo {
  id: string;
  given_to_name: string;
  out_at: string;
  expected_return_at: string;
  returned_at: string | null;
  delay_requested_at: string | null;
  delay_request_status: string | null;
  keys: { label: string; properties: { reference: string; address: string } | null };
  agency: { name: string; logo_url: string | null; primary_color: string | null; address: string | null };
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function toLocalDatetimeValue(iso: string) {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function DelayRequestPage() {
  const params = new URLSearchParams(window.location.search);
  const movementId = params.get('id');

  const [movement, setMovement] = useState<MovementInfo | null>(null);
  const [loadStatus, setLoadStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  const [message, setMessage] = useState('');
  const [newReturnDate, setNewReturnDate] = useState('');
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'already' | 'pending'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!movementId) { setLoadStatus('error'); return; }
    fetch(`${SUPABASE_URL}/functions/v1/delay-request?id=${movementId}`, {
      headers: { apikey: SUPABASE_ANON_KEY },
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setMovement(data.movement);
          if (data.movement.returned_at) setSubmitStatus('already');
          else if (data.movement.delay_request_status === 'pending') setSubmitStatus('pending');
          // Pre-fill new date: expected_return_at + 2 days
          const d = new Date(data.movement.expected_return_at);
          d.setDate(d.getDate() + 2);
          setNewReturnDate(toLocalDatetimeValue(d.toISOString()));
          setLoadStatus('loaded');
        } else {
          setLoadStatus('error');
        }
      })
      .catch(() => setLoadStatus('error'));
  }, [movementId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!movementId) return;
    if (!newReturnDate) { setErrorMsg('Veuillez choisir une nouvelle date de retour.'); return; }

    const minDate = movement ? new Date(movement.expected_return_at) : new Date();
    if (new Date(newReturnDate) <= minDate) {
      setErrorMsg('La nouvelle date doit être postérieure à la date de retour prévue.');
      return;
    }

    setSubmitStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/delay-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
        body: JSON.stringify({
          movementId,
          message,
          newReturnDate: new Date(newReturnDate).toISOString(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitStatus('success');
      } else if (data.error === 'Cette clé a déjà été rendue') {
        setSubmitStatus('already');
      } else if (data.error === 'Une demande est déjà en attente') {
        setSubmitStatus('pending');
      } else {
        setErrorMsg(data.error || 'Une erreur est survenue');
        setSubmitStatus('idle');
      }
    } catch {
      setErrorMsg('Erreur de connexion. Veuillez réessayer.');
      setSubmitStatus('idle');
    }
  }

  const primary = movement?.agency?.primary_color || '#111827';
  const agencyName = movement?.agency?.name || 'Votre agence';
  const logoUrl = movement?.agency?.logo_url;
  const prop = movement?.keys?.properties;

  const minDateValue = movement
    ? (() => { const d = new Date(movement.expected_return_at); d.setMinutes(d.getMinutes()+1); return toLocalDatetimeValue(d.toISOString()); })()
    : '';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
         style={{ background: '#F7F7F7' }}>
      <div className="w-full max-w-lg">

        {/* Agency header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-4">
          <div style={{ height: 4, background: primary }} />
          <div className="px-6 py-4 flex items-center gap-4">
            {logoUrl ? (
              <div className="w-14 h-14 rounded-xl bg-white border flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm"
                   style={{ borderColor: `${primary}30` }}>
                <img src={logoUrl} alt={agencyName} className="w-full h-full object-contain p-1" />
              </div>
            ) : (
              <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-xl shadow-sm"
                   style={{ background: primary }}>
                {agencyName.charAt(0)}
              </div>
            )}
            <div>
              <p className="font-700 text-slate-900 font-bold text-sm">{agencyName}</p>
              {movement?.agency?.address && (
                <p className="text-xs text-slate-500">{movement.agency.address}</p>
              )}
            </div>
          </div>
        </div>

        {/* Main card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

          {/* Loading */}
          {loadStatus === 'loading' && (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-3"
                   style={{ borderColor: `${primary}30`, borderTopColor: primary }} />
              <p className="text-slate-500 text-sm">Chargement…</p>
            </div>
          )}

          {/* Load error */}
          {loadStatus === 'error' && (
            <div className="p-10 text-center">
              <div className="w-14 h-14 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-7 h-7 text-red-400" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-2">Lien invalide</h2>
              <p className="text-slate-500 text-sm">Ce lien est invalide ou a expiré. Contactez directement l'agence.</p>
            </div>
          )}

          {/* Already returned */}
          {loadStatus === 'loaded' && submitStatus === 'already' && (
            <div className="p-10 text-center">
              <div className="w-14 h-14 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-slate-400" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-2">Clé déjà rendue</h2>
              <p className="text-slate-500 text-sm">Cette clé a déjà été restituée à l'agence. Aucune action nécessaire.</p>
            </div>
          )}

          {/* Already pending */}
          {loadStatus === 'loaded' && submitStatus === 'pending' && (
            <div className="p-10 text-center">
              <div className="w-14 h-14 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-7 h-7 text-amber-500" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-2">Demande en attente</h2>
              <p className="text-slate-500 text-sm">
                Votre demande de délai a déjà été transmise à l'agence.<br />
                Vous recevrez une réponse par email dès que possible.
              </p>
            </div>
          )}

          {/* Success */}
          {submitStatus === 'success' && (
            <div className="p-10 text-center">
              <div className="w-14 h-14 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-green-500" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-2">Demande envoyée</h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                Votre demande de délai a bien été transmise à l'agence.<br />
                Vous recevrez une réponse par email.
              </p>
              {newReturnDate && (
                <div className="mt-4 inline-block rounded-xl px-4 py-2 text-sm font-semibold text-white"
                     style={{ background: primary }}>
                  Nouvelle date demandée : {new Date(newReturnDate).toLocaleString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          )}

          {/* FORM */}
          {loadStatus === 'loaded' && (submitStatus === 'idle' || submitStatus === 'loading') && movement && (
            <>
              {/* Page title */}
              <div className="px-6 pt-6 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                       style={{ background: `${primary}15` }}>
                    <Clock className="w-5 h-5" style={{ color: primary }} />
                  </div>
                  <h1 className="text-lg font-800 text-slate-900 font-bold">Demande de délai</h1>
                </div>
                <p className="text-sm text-slate-500 ml-12">
                  Vous ne pouvez pas restituer les clés dans les délais ?<br />
                  Signalez-le maintenant pour éviter toute pénalité.
                </p>
              </div>

              {/* Movement summary */}
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 space-y-2.5">
                {prop && (
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">Bien</span>
                      <span className="text-sm font-semibold text-slate-800">{prop.reference}</span>
                      <span className="text-sm text-slate-500 ml-2">{prop.address}</span>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2.5">
                  <Key className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">Clé</span>
                    <span className="text-sm font-semibold text-slate-800">{movement.keys?.label}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Calendar className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">Retour prévu initialement</span>
                    <span className="text-sm font-semibold text-slate-800">{fmt(movement.expected_return_at)}</span>
                  </div>
                </div>
              </div>

              {/* Penalty warning */}
              <div className="mx-6 mt-4 rounded-xl p-3.5 flex gap-2.5"
                   style={{ background: '#111827' }}>
                <span className="text-base flex-shrink-0">⚠️</span>
                <p className="text-sm text-gray-300 leading-relaxed">
                  Tout retard non signalé entraîne la facturation d'un{' '}
                  <strong className="text-white">forfait minimum de 50 €</strong>.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

                {/* New return date picker */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Nouvelle date de retour souhaitée <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={newReturnDate}
                    onChange={e => setNewReturnDate(e.target.value)}
                    min={minDateValue}
                    required
                    className="w-full px-4 py-3 rounded-xl text-sm border border-slate-200 bg-white outline-none transition focus:ring-2 text-slate-800"
                    style={{ '--tw-ring-color': `${primary}40` } as React.CSSProperties}
                    onFocus={e => { e.target.style.borderColor = primary; e.target.style.boxShadow = `0 0 0 3px ${primary}20`; }}
                    onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                  />
                  <p className="text-xs text-slate-400 mt-1">Doit être postérieure à la date de retour initiale.</p>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Motif{' '}
                    <span className="text-slate-400 font-normal">(optionnel)</span>
                  </label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={3}
                    placeholder="Ex : Travaux retardés, disponibilité repoussée au…"
                    className="w-full px-4 py-3 rounded-xl text-sm border border-slate-200 bg-white resize-none outline-none transition text-slate-800"
                    onFocus={e => { e.target.style.borderColor = primary; e.target.style.boxShadow = `0 0 0 3px ${primary}20`; }}
                    onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>

                {errorMsg && (
                  <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 p-3">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{errorMsg}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitStatus === 'loading'}
                  className="w-full py-3.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
                  style={{ background: primary }}
                >
                  {submitStatus === 'loading' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Envoi en cours…
                    </>
                  ) : (
                    <>
                      Envoyer ma demande de délai
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs mt-4 text-slate-400">
          Propulsé par <span className="font-semibold text-slate-600">KeyManager.io</span>
        </p>
      </div>
    </div>
  );
}
