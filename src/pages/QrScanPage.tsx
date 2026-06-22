import { useState, useEffect } from 'react';
import { Key, MapPin, Building2, CheckCircle, XCircle, Clock, User, Phone, Mail, Loader2 } from 'lucide-react';

interface QrInfo {
  isActive: boolean;
  scanCount: number;
  key: {
    label: string;
    type: string;
    buildingType?: string;
  };
  property: {
    reference: string;
    address: string;
    city: string;
    postalCode: string;
  } | null;
  agency: {
    name: string;
    logoUrl?: string;
  };
  currentStatus: {
    isOut: boolean;
    takenBy?: string;
    takenAt?: string;
    expectedReturnAt?: string;
  };
}

export function QrScanPage() {
  const [qrCode, setQrCode] = useState<string>('');
  const [qrInfo, setQrInfo] = useState<QrInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    userName: '',
    userPhone: '',
    userEmail: '',
    notes: ''
  });

  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/\/qr\/([A-Z0-9]+)/i);

    if (match && match[1]) {
      const code = match[1];
      setQrCode(code);
      loadQrInfo(code);
    } else {
      setError('Code QR invalide');
      setLoading(false);
    }
  }, []);

  const loadQrInfo = async (code: string) => {
    try {
      setLoading(true);
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/qr-info?code=${code}`;

      const response = await fetch(apiUrl);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors du chargement');
      }

      setQrInfo(data);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: 'take' | 'drop') => {
    if (!formData.userName.trim()) {
      setError('Veuillez indiquer votre nom');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/qr-action`;

      const payload = {
        qrCode,
        action,
        userName: formData.userName,
        userPhone: formData.userPhone || undefined,
        userEmail: formData.userEmail || undefined,
        notes: formData.notes || undefined
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de l\'enregistrement');
      }

      setSuccess(true);
      setTimeout(() => {
        loadQrInfo(qrCode);
        setSuccess(false);
        setFormData({ userName: '', userPhone: '', userEmail: '', notes: '' });
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Erreur de connexion');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-amber-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error && !qrInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Erreur</h1>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!qrInfo) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                {qrInfo.agency.logoUrl ? (
                  <img src={qrInfo.agency.logoUrl} alt={qrInfo.agency.name} className="w-12 h-12 rounded-lg bg-white p-1" />
                ) : (
                  <Key className="w-12 h-12" />
                )}
                <div>
                  <p className="text-sm opacity-90">Géré par</p>
                  <p className="font-bold text-lg">{qrInfo.agency.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs opacity-75">Scans</p>
                <p className="text-2xl font-black">{qrInfo.scanCount}</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="mb-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Key className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 font-medium">Clé</p>
                  <p className="text-xl font-bold text-slate-900">{qrInfo.key.label}</p>
                </div>
              </div>

              {qrInfo.property && (
                <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                  <div className="flex items-start space-x-2">
                    <Building2 className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-600">Référence</p>
                      <p className="text-slate-900 font-semibold">{qrInfo.property.reference}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <MapPin className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-600">Adresse</p>
                      <p className="text-slate-900">{qrInfo.property.address}</p>
                      <p className="text-slate-700">{qrInfo.property.postalCode} {qrInfo.property.city}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {qrInfo.currentStatus.isOut && (
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="w-5 h-5 text-red-600" />
                  <p className="font-bold text-red-900">Clé actuellement sortie</p>
                </div>
                <p className="text-sm text-red-700">
                  Prise par <span className="font-semibold">{qrInfo.currentStatus.takenBy}</span>
                </p>
                {qrInfo.currentStatus.expectedReturnAt && (
                  <p className="text-sm text-red-600 mt-1">
                    Retour prévu : {new Date(qrInfo.currentStatus.expectedReturnAt).toLocaleString('fr-FR')}
                  </p>
                )}
              </div>
            )}

            {!qrInfo.currentStatus.isOut && (
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-6">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="font-bold text-green-900">Clé disponible</p>
                </div>
              </div>
            )}

            {success ? (
              <div className="bg-green-100 border-2 border-green-300 rounded-xl p-6 text-center">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-3" />
                <p className="text-xl font-bold text-green-900">Enregistré avec succès !</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900">Enregistrer un mouvement</h3>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    <User className="w-4 h-4 inline mr-1" />
                    Votre nom *
                  </label>
                  <input
                    type="text"
                    value={formData.userName}
                    onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition"
                    placeholder="Prénom Nom"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    <Phone className="w-4 h-4 inline mr-1" />
                    Téléphone (optionnel)
                  </label>
                  <input
                    type="tel"
                    value={formData.userPhone}
                    onChange={(e) => setFormData({ ...formData, userPhone: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition"
                    placeholder="06 12 34 56 78"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    <Mail className="w-4 h-4 inline mr-1" />
                    Email (optionnel)
                  </label>
                  <input
                    type="email"
                    value={formData.userEmail}
                    onChange={(e) => setFormData({ ...formData, userEmail: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition"
                    placeholder="email@exemple.fr"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Notes (optionnel)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition"
                    placeholder="Informations complémentaires..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <button
                    onClick={() => handleAction('take')}
                    disabled={submitting || !formData.userName.trim()}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-4 rounded-xl font-bold hover:from-green-600 hover:to-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                  >
                    {submitting ? (
                      <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    ) : (
                      <>🔓 Je prends la clé</>
                    )}
                  </button>

                  <button
                    onClick={() => handleAction('drop')}
                    disabled={submitting || !formData.userName.trim()}
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-4 rounded-xl font-bold hover:from-blue-600 hover:to-cyan-600 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                  >
                    {submitting ? (
                      <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    ) : (
                      <>🔐 Je dépose la clé</>
                    )}
                  </button>
                </div>

                <p className="text-xs text-slate-500 text-center mt-4">
                  En enregistrant ce mouvement, vous acceptez que vos informations soient stockées pour la traçabilité des clés.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-sm text-slate-600">
            Propulsé par <span className="font-bold text-amber-600">KeyManager</span>
          </p>
        </div>
      </div>
    </div>
  );
}
