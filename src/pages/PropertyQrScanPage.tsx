import { useState, useEffect } from 'react';
import { Key, MapPin, Building2, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface PropertyQrInfo {
  isActive: boolean;
  scanCount: number;
  property: {
    reference: string;
    address: string;
    city: string;
    postalCode: string;
    building: string;
    floor: string;
    door: string;
    keyCount: number;
    keys: Array<{
      id: string;
      label: string;
      type: string;
    }>;
  };
  agency: {
    name: string;
    logoUrl?: string;
    primaryColor: string;
    secondaryColor: string;
  };
}

export function PropertyQrScanPage() {
  const [qrCode, setQrCode] = useState<string>('');
  const [qrInfo, setQrInfo] = useState<PropertyQrInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/\/property-qr\/([A-Z0-9]+)/i);

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
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/property-qr-info?code=${code}`;

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-amber-500" />
          <p className="text-slate-600 font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error && !qrInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Erreur</h1>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!qrInfo) return null;

  const primaryColor = qrInfo.agency.primaryColor;
  const secondaryColor = qrInfo.agency.secondaryColor;

  return (
    <div className="min-h-screen py-8 px-4" style={{
      background: `linear-gradient(to bottom right, ${primaryColor}15, ${secondaryColor}10)`
    }}>
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 text-white" style={{
            background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})`
          }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {qrInfo.agency.logoUrl ? (
                  <img
                    src={qrInfo.agency.logoUrl}
                    alt={qrInfo.agency.name}
                    className="w-14 h-14 rounded-xl bg-white/90 p-2 object-contain"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
                    <Building2 className="w-8 h-8" />
                  </div>
                )}
                <div>
                  <p className="text-sm opacity-90 font-medium">Géré par</p>
                  <p className="font-bold text-xl">{qrInfo.agency.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs opacity-75 font-medium">Scans</p>
                <p className="text-3xl font-black">{qrInfo.scanCount}</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="mb-8">
              <div className="flex items-center justify-center mb-6">
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: `${primaryColor}20` }}
                >
                  <Key className="w-10 h-10" style={{ color: primaryColor }} />
                </div>
              </div>

              <div className="text-center mb-6">
                <h1 className="text-2xl font-black text-slate-900 mb-2">
                  Trousseau de clés
                </h1>
                <p className="text-lg font-semibold text-slate-600">
                  {qrInfo.property.keyCount} clé{qrInfo.property.keyCount > 1 ? 's' : ''}
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-6 space-y-4 border border-slate-200">
                <div className="flex items-start space-x-3">
                  <Building2 className="w-6 h-6 text-slate-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-1">
                      Référence
                    </p>
                    <p className="text-xl font-bold text-slate-900">
                      {qrInfo.property.reference}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <MapPin className="w-6 h-6 text-slate-400 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-1">
                      Adresse
                    </p>
                    <p className="text-lg font-semibold text-slate-900">
                      {qrInfo.property.address}
                    </p>
                    {(qrInfo.property.postalCode || qrInfo.property.city) && (
                      <p className="text-base text-slate-700 font-medium">
                        {qrInfo.property.postalCode} {qrInfo.property.city}
                      </p>
                    )}
                    {(qrInfo.property.building || qrInfo.property.floor || qrInfo.property.door) && (
                      <p className="text-sm text-slate-600 mt-1">
                        {qrInfo.property.building && `Bâtiment ${qrInfo.property.building}`}
                        {qrInfo.property.building && (qrInfo.property.floor || qrInfo.property.door) && ' • '}
                        {qrInfo.property.floor && `Étage ${qrInfo.property.floor}`}
                        {qrInfo.property.floor && qrInfo.property.door && ' • '}
                        {qrInfo.property.door && `Porte ${qrInfo.property.door}`}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {qrInfo.property.keys.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
                  <Key className="w-5 h-5 mr-2" style={{ color: primaryColor }} />
                  Clés du trousseau
                </h2>
                <div className="space-y-2">
                  {qrInfo.property.keys.map((key) => (
                    <div
                      key={key.id}
                      className="flex items-center p-4 rounded-xl border-2 border-slate-200 hover:border-slate-300 transition"
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center mr-3"
                        style={{ backgroundColor: `${primaryColor}15` }}
                      >
                        <Key className="w-5 h-5" style={{ color: primaryColor }} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{key.label}</p>
                        <p className="text-sm text-slate-500">{key.type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-slate-200">
              <div
                className="rounded-xl p-6 text-center"
                style={{ backgroundColor: `${primaryColor}10` }}
              >
                <CheckCircle className="w-12 h-12 mx-auto mb-3" style={{ color: primaryColor }} />
                <p className="font-bold text-lg" style={{ color: primaryColor }}>
                  QR Code scanné avec succès
                </p>
                <p className="text-slate-600 text-sm mt-2">
                  Ce trousseau est géré par {qrInfo.agency.name}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-sm text-slate-600">
            Code QR : <span className="font-mono font-bold">{qrCode}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
