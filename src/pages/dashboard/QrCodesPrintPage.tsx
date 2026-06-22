import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { DashboardLayout } from '../../components/DashboardLayout';
import { Printer, Download, Building2, CheckSquare, Square, Loader2 } from 'lucide-react';
import QRCodeLib from 'qrcode';

interface PropertyWithQr {
  id: string;
  reference: string;
  address: string;
  qr_code?: string;
  keyCount: number;
}

export function QrCodesPrintPage() {
  const { profile } = useAuth();
  const [properties, setProperties] = useState<PropertyWithQr[]>([]);
  const [selectedProperties, setSelectedProperties] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [labelSize, setLabelSize] = useState<'small' | 'medium' | 'large'>('medium');
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (profile?.agency_id) {
      loadProperties();
    }
  }, [profile]);

  const loadProperties = async () => {
    if (!profile?.agency_id) return;

    try {
      setLoading(true);

      const { data: propertiesData, error } = await supabase
        .from('properties')
        .select(`
          id,
          reference,
          address,
          property_qr_codes (qr_code),
          keys (id)
        `)
        .eq('agency_id', profile.agency_id)
        .order('reference');

      if (error) {
        console.error('Supabase error:', error);
        alert(`Erreur de chargement: ${error.message}`);
        throw error;
      }

      console.log('Properties loaded:', propertiesData);

      const propertiesWithQr = (propertiesData || []).map((property: any) => ({
        id: property.id,
        reference: property.reference,
        address: property.address,
        qr_code: property.property_qr_codes?.[0]?.qr_code,
        keyCount: property.keys?.filter((k: any) => k.id).length || 0
      }));

      console.log('Properties with QR:', propertiesWithQr);
      setProperties(propertiesWithQr);
    } catch (error: any) {
      console.error('Error loading properties:', error);
      alert(`Erreur: ${error.message || 'Impossible de charger les trousseaux'}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleProperty = (propertyId: string) => {
    const newSelected = new Set(selectedProperties);
    if (newSelected.has(propertyId)) {
      newSelected.delete(propertyId);
    } else {
      newSelected.add(propertyId);
    }
    setSelectedProperties(newSelected);
  };

  const selectAll = () => {
    const propertiesWithQr = properties.filter(p => p.qr_code);
    setSelectedProperties(new Set(propertiesWithQr.map(p => p.id)));
  };

  const deselectAll = () => {
    setSelectedProperties(new Set());
  };

  const generateQrCodes = async () => {
    if (!profile?.agency_id) return;

    setGenerating(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Non authentifié');

      for (const property of properties) {
        if (selectedProperties.has(property.id) && !property.qr_code) {
          const { data: newCode, error: rpcError } = await supabase.rpc('generate_property_qr_code');
          if (rpcError) throw rpcError;

          await supabase.from('property_qr_codes').insert({
            property_id: property.id,
            qr_code: newCode,
            agency_id: profile.agency_id,
            created_by: userData.user.id,
            is_active: true
          });
        }
      }

      await loadProperties();
    } catch (error) {
      console.error('Error generating QR codes:', error);
      alert('Erreur lors de la génération des QR codes');
    } finally {
      setGenerating(false);
    }
  };

  const getLabelDimensions = () => {
    switch (labelSize) {
      case 'small':
        return { width: 160, height: 160, padding: 10, fontSize: 10 };
      case 'large':
        return { width: 240, height: 240, padding: 15, fontSize: 14 };
      default:
        return { width: 200, height: 200, padding: 12, fontSize: 12 };
    }
  };

  const renderQrLabels = async () => {
    if (!canvasContainerRef.current) return;

    const selectedPropertiesData = properties.filter(p => selectedProperties.has(p.id) && p.qr_code);
    const dims = getLabelDimensions();
    const container = canvasContainerRef.current;
    container.innerHTML = '';

    for (const property of selectedPropertiesData) {
      const canvas = document.createElement('canvas');
      canvas.width = dims.width;
      canvas.height = dims.height;
      canvas.className = 'border border-slate-300';

      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, dims.width, dims.height);

      const qrSize = dims.width - (dims.padding * 2);
      const url = `${window.location.origin}/property-qr/${property.qr_code}`;

      try {
        const qrCanvas = document.createElement('canvas');
        await QRCodeLib.toCanvas(qrCanvas, url, {
          width: qrSize - 40,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });

        ctx.drawImage(qrCanvas, dims.padding, dims.padding);
      } catch (error) {
        console.error('Error generating QR code:', error);
      }

      ctx.fillStyle = '#1e293b';
      ctx.font = `bold ${dims.fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(property.reference, dims.width / 2, dims.height - dims.padding - 20);

      ctx.font = `${dims.fontSize - 2}px monospace`;
      ctx.fillStyle = '#64748b';
      ctx.fillText(property.qr_code || '', dims.width / 2, dims.height - dims.padding - 5);

      container.appendChild(canvas);
    }
  };

  useEffect(() => {
    if (selectedProperties.size > 0) {
      renderQrLabels();
    }
  }, [selectedProperties, labelSize, properties]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const canvases = canvasContainerRef.current?.querySelectorAll('canvas');
    if (!canvases || canvases.length === 0) return;

    const zip = await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm');
    const zipFile = new zip.default();

    canvases.forEach((canvas, index) => {
      const dataUrl = canvas.toDataURL('image/png');
      const base64Data = dataUrl.split(',')[1];
      zipFile.file(`qr-code-${index + 1}.png`, base64Data, { base64: true });
    });

    const blob = await zipFile.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'qr-codes-trousseaux.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const propertiesWithQr = properties.filter(p => p.qr_code);
  const propertiesWithoutQr = properties.filter(p => !p.qr_code && selectedProperties.has(p.id));

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">QR Codes Trousseaux</h1>
        <p className="text-slate-600">
          Sélectionnez les trousseaux pour lesquels vous souhaitez imprimer les QR codes
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-12 h-12 text-amber-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Chargement...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Sélection des trousseaux</h2>
                <p className="text-sm text-slate-600">
                  {selectedProperties.size} trousseau{selectedProperties.size > 1 ? 'x' : ''} sélectionné{selectedProperties.size > 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={selectAll}
                  className="px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 rounded-lg transition"
                >
                  Tout sélectionner
                </button>
                <button
                  onClick={deselectAll}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition"
                >
                  Tout désélectionner
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {properties.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600 font-medium">Aucun bien trouvé</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Créez d'abord des biens dans la section "Biens" pour générer des QR codes
                  </p>
                </div>
              ) : (
                properties.map(property => (
                  <button
                    key={property.id}
                    onClick={() => toggleProperty(property.id)}
                    className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition text-left ${
                      selectedProperties.has(property.id)
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {selectedProperties.has(property.id) ? (
                      <CheckSquare className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-400 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{property.reference}</p>
                      <p className="text-xs text-slate-500 truncate">{property.address}</p>
                      <p className="text-xs text-slate-600 font-medium">{property.keyCount} clé{property.keyCount > 1 ? 's' : ''}</p>
                      {!property.qr_code && (
                        <p className="text-xs text-red-600 font-medium">Pas de QR code</p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>

            {propertiesWithoutQr.length > 0 && (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-900 font-medium mb-2">
                  {propertiesWithoutQr.length} trousseau{propertiesWithoutQr.length > 1 ? 'x' : ''} sans QR code
                </p>
                <button
                  onClick={generateQrCodes}
                  disabled={generating}
                  className="text-sm bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition disabled:opacity-50"
                >
                  {generating ? 'Génération...' : 'Générer les QR codes manquants'}
                </button>
              </div>
            )}
          </div>

          {selectedProperties.size > 0 && propertiesWithoutQr.length === 0 && (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 print:hidden">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Options d'impression</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Taille des étiquettes
                    </label>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => setLabelSize('small')}
                        className={`px-4 py-2 rounded-lg border-2 transition ${
                          labelSize === 'small'
                            ? 'border-amber-500 bg-amber-50 text-amber-900 font-semibold'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        Petit (40x40mm)
                      </button>
                      <button
                        onClick={() => setLabelSize('medium')}
                        className={`px-4 py-2 rounded-lg border-2 transition ${
                          labelSize === 'medium'
                            ? 'border-amber-500 bg-amber-50 text-amber-900 font-semibold'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        Moyen (50x50mm)
                      </button>
                      <button
                        onClick={() => setLabelSize('large')}
                        className={`px-4 py-2 rounded-lg border-2 transition ${
                          labelSize === 'large'
                            ? 'border-amber-500 bg-amber-50 text-amber-900 font-semibold'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        Grand (60x60mm)
                      </button>
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={handlePrint}
                      className="flex items-center space-x-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-xl font-bold hover:from-amber-600 hover:to-orange-600 transition shadow-lg"
                    >
                      <Printer className="w-5 h-5" />
                      <span>Imprimer</span>
                    </button>

                    <button
                      onClick={handleDownloadPDF}
                      className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg"
                    >
                      <Download className="w-5 h-5" />
                      <span>Télécharger (ZIP)</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4 print:hidden">Aperçu</h2>
                <div
                  ref={canvasContainerRef}
                  className="grid gap-4"
                  style={{
                    gridTemplateColumns: labelSize === 'small'
                      ? 'repeat(auto-fill, minmax(160px, 1fr))'
                      : labelSize === 'large'
                      ? 'repeat(auto-fill, minmax(240px, 1fr))'
                      : 'repeat(auto-fill, minmax(200px, 1fr))'
                  }}
                />
              </div>
            </>
          )}
        </div>
      )}

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          ${canvasContainerRef.current ? `
          #print-container,
          #print-container * {
            visibility: visible;
          }
          #print-container {
            position: absolute;
            left: 0;
            top: 0;
          }
          ` : ''}
        }
      `}</style>
    </DashboardLayout>
  );
}
