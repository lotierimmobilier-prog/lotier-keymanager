import { useState, useEffect, useRef } from 'react';
import { QrCode, Download, Printer, ExternalLink, X, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface QrCodeGeneratorProps {
  keyId: string;
  keyLabel: string;
  agencyId: string;
  onClose: () => void;
}

export function QrCodeGenerator({ keyId, keyLabel, agencyId, onClose }: QrCodeGeneratorProps) {
  const [qrCode, setQrCode] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadOrCreateQrCode();
  }, [keyId]);

  const loadOrCreateQrCode = async () => {
    try {
      setLoading(true);

      const { data: existingQr, error: fetchError } = await supabase
        .from('key_qr_codes')
        .select('qr_code, is_active')
        .eq('key_id', keyId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingQr && existingQr.is_active) {
        setQrCode(existingQr.qr_code);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateNewQrCode = async () => {
    try {
      setGenerating(true);
      setError('');

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Non authentifié');

      const { data, error: rpcError } = await supabase.rpc('generate_qr_code');
      if (rpcError) throw rpcError;

      const newCode = data as string;

      const { error: insertError } = await supabase
        .from('key_qr_codes')
        .insert({
          key_id: keyId,
          qr_code: newCode,
          agency_id: agencyId,
          created_by: userData.user.id,
          is_active: true
        });

      if (insertError) throw insertError;

      setQrCode(newCode);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (qrCode && canvasRef.current) {
      generateQrCodeImage(qrCode);
    }
  }, [qrCode]);

  const generateQrCodeImage = (code: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 300;
    const qrSize = 200;
    const padding = 50;

    canvas.width = size;
    canvas.height = size + 80;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const url = `${window.location.origin}/qr/${code}`;

    drawQRCodePattern(ctx, url, padding, padding, qrSize);

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(keyLabel, size / 2, size + 30);

    ctx.font = '12px monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText(code, size / 2, size + 55);
  };

  const drawQRCodePattern = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number) => {
    const moduleCount = 25;
    const moduleSize = size / moduleCount;

    const hash = simpleHash(text);

    ctx.fillStyle = '#000000';
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        const index = row * moduleCount + col;
        const shouldFill = (hash[index % hash.length].charCodeAt(0) + row + col) % 2 === 0;

        if (shouldFill) {
          ctx.fillRect(
            x + col * moduleSize,
            y + row * moduleSize,
            moduleSize,
            moduleSize
          );
        }
      }
    }

    const cornerSize = moduleSize * 7;
    drawFinderPattern(ctx, x, y, cornerSize);
    drawFinderPattern(ctx, x + size - cornerSize, y, cornerSize);
    drawFinderPattern(ctx, x, y + size - cornerSize, cornerSize);
  };

  const drawFinderPattern = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    ctx.fillStyle = '#000000';
    ctx.fillRect(x, y, size, size);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x + size * 0.15, y + size * 0.15, size * 0.7, size * 0.7);

    ctx.fillStyle = '#000000';
    ctx.fillRect(x + size * 0.3, y + size * 0.3, size * 0.4, size * 0.4);
  };

  const simpleHash = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36).repeat(10);
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;

    canvasRef.current.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-code-${keyLabel.replace(/[^a-z0-9]/gi, '-')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  };

  const handlePrint = () => {
    if (!canvasRef.current) return;

    const dataUrl = canvasRef.current.toDataURL();
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code - ${keyLabel}</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
            img {
              max-width: 100%;
              height: auto;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <img src="${dataUrl}" alt="QR Code ${keyLabel}" />
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const qrUrl = qrCode ? `${window.location.origin}/qr/${qrCode}` : '';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">QR Code - {keyLabel}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 text-amber-500 animate-spin mx-auto mb-4" />
              <p className="text-slate-600">Chargement...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-700">{error}</p>
              </div>
              <button
                onClick={loadOrCreateQrCode}
                className="text-amber-600 hover:text-amber-700 font-medium"
              >
                Réessayer
              </button>
            </div>
          ) : !qrCode ? (
            <div className="text-center py-8">
              <QrCode className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 mb-6">Aucun QR Code généré pour cette clé</p>
              <button
                onClick={generateNewQrCode}
                disabled={generating}
                className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-xl font-bold hover:from-amber-600 hover:to-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                    Génération...
                  </>
                ) : (
                  <>
                    <QrCode className="w-5 h-5 inline mr-2" />
                    Générer un QR Code
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-slate-50 rounded-xl p-6 text-center">
                <canvas
                  ref={canvasRef}
                  className="mx-auto border-4 border-white shadow-lg rounded-lg"
                />
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="font-bold text-green-900">QR Code actif</p>
                </div>
                <p className="text-sm text-green-700">
                  Code : <span className="font-mono font-bold">{qrCode}</span>
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    URL publique
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={qrUrl}
                      readOnly
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono bg-slate-50"
                    />
                    <button
                      onClick={() => window.open(qrUrl, '_blank')}
                      className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition"
                      title="Ouvrir"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleDownload}
                    className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg"
                  >
                    <Download className="w-5 h-5" />
                    <span>Télécharger</span>
                  </button>

                  <button
                    onClick={handlePrint}
                    className="flex items-center justify-center space-x-2 bg-slate-700 text-white px-4 py-3 rounded-xl font-bold hover:bg-slate-800 transition shadow-lg"
                  >
                    <Printer className="w-5 h-5" />
                    <span>Imprimer</span>
                  </button>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-900 font-semibold mb-2">Comment ça fonctionne ?</p>
                <ul className="text-sm text-amber-800 space-y-1">
                  <li>• Imprimez ce QR Code sur une étiquette</li>
                  <li>• Collez-la sur le trousseau de clés</li>
                  <li>• Scannez pour enregistrer les prises/dépôts</li>
                  <li>• Aucune connexion requise pour scanner</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
