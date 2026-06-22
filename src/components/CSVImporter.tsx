import { useState } from 'react';
import { Upload, X, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface CSVImporterProps {
  agencyId: string;
  onSuccess: () => void;
  onClose: () => void;
}

interface PropertyRow {
  owner_name: string;
  owner_first_name: string;
  address: string;
  type: string;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export function CSVImporter({ agencyId, onSuccess, onClose }: CSVImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [preview, setPreview] = useState<PropertyRow[]>([]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      parseCSVPreview(selectedFile);
    } else {
      alert('Veuillez sélectionner un fichier CSV');
    }
  }

  async function parseCSVPreview(file: File) {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      alert('Le fichier CSV doit contenir au moins une ligne de données');
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const previewData: PropertyRow[] = [];

    for (let i = 1; i < Math.min(lines.length, 6); i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: any = {};

      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      previewData.push({
        owner_name: row.owner_name || row.nom || row['nom propriétaire'] || '',
        owner_first_name: row.owner_first_name || row.prénom || row['prénom propriétaire'] || '',
        address: row.address || row.adresse || '',
        type: row.type || 'Appartement',
      });
    }

    setPreview(previewData);
  }

  async function handleImport() {
    if (!file) return;

    setImporting(true);
    const importResult: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: any = {};

        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });

        const propertyData = {
          owner_name: row.owner_name || row.nom || row['nom propriétaire'] || '',
          owner_first_name: row.owner_first_name || row.prénom || row['prénom propriétaire'] || '',
          address: row.address || row.adresse || '',
          type: row.type || 'Appartement',
        };

        if (!propertyData.owner_name || !propertyData.address) {
          importResult.failed++;
          importResult.errors.push(`Ligne ${i + 1}: Nom propriétaire ou adresse manquant`);
          continue;
        }

        try {
          const { data: reference, error: refError } = await supabase.rpc('generate_property_reference', {
            p_agency_id: agencyId,
            p_owner_name: propertyData.owner_name,
            p_owner_first_name: propertyData.owner_first_name,
            p_address: propertyData.address,
            p_type: propertyData.type,
          });

          if (refError) throw refError;

          const { error: insertError } = await supabase
            .from('properties')
            .insert({
              agency_id: agencyId,
              reference: reference,
              owner_name: propertyData.owner_name,
              owner_first_name: propertyData.owner_first_name,
              address: propertyData.address,
              type: propertyData.type,
            });

          if (insertError) throw insertError;

          importResult.success++;
        } catch (error: any) {
          importResult.failed++;
          importResult.errors.push(`Ligne ${i + 1}: ${error.message}`);
        }
      }

      setResult(importResult);
      if (importResult.success > 0) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error importing CSV:', error);
      alert('Erreur lors de l\'import du fichier CSV');
    } finally {
      setImporting(false);
    }
  }

  function downloadTemplate() {
    const template = 'owner_name,owner_first_name,address,type\nDupont,Jean,123 rue de la Paix 75001 Paris,Appartement\nMartin,Marie,456 avenue Victor Hugo 75016 Paris,Maison\nSCI IMMO,,789 boulevard Saint-Germain 75006 Paris,Bureau';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modele_import_biens.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Importer des biens (CSV)</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {!result ? (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">Format du fichier CSV</h3>
              <p className="text-sm text-blue-800 mb-3">
                Le fichier doit contenir les colonnes suivantes (dans n'importe quel ordre) :
              </p>
              <ul className="text-sm text-blue-800 space-y-1 mb-3">
                <li><strong>owner_name</strong> ou <strong>nom</strong> : Nom du propriétaire (obligatoire)</li>
                <li><strong>owner_first_name</strong> ou <strong>prénom</strong> : Prénom du propriétaire (optionnel)</li>
                <li><strong>address</strong> ou <strong>adresse</strong> : Adresse complète (obligatoire)</li>
                <li><strong>type</strong> : Type de bien (optionnel, par défaut: Appartement)</li>
              </ul>
              <button
                onClick={downloadTemplate}
                className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Télécharger un modèle
              </button>
            </div>

            <div className="mb-6">
              <label className="block w-full">
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-amber-500 transition cursor-pointer">
                  <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-700 font-medium mb-2">
                    {file ? file.name : 'Cliquez pour sélectionner un fichier CSV'}
                  </p>
                  <p className="text-sm text-slate-500">
                    Format accepté : .csv
                  </p>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </label>
            </div>

            {preview.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-slate-900 mb-3">Aperçu (5 premières lignes)</h3>
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left px-4 py-2 font-semibold text-slate-900">Nom</th>
                        <th className="text-left px-4 py-2 font-semibold text-slate-900">Prénom</th>
                        <th className="text-left px-4 py-2 font-semibold text-slate-900">Adresse</th>
                        <th className="text-left px-4 py-2 font-semibold text-slate-900">Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {preview.map((row, index) => (
                        <tr key={index} className="hover:bg-slate-50">
                          <td className="px-4 py-2">{row.owner_name}</td>
                          <td className="px-4 py-2">{row.owner_first_name || '-'}</td>
                          <td className="px-4 py-2">{row.address}</td>
                          <td className="px-4 py-2">{row.type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex space-x-4">
              <button
                onClick={onClose}
                className="flex-1 bg-slate-100 text-slate-700 px-6 py-3 rounded-lg hover:bg-slate-200 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleImport}
                disabled={!file || importing}
                className="flex-1 bg-primary text-white px-6 py-3 rounded-lg hover:bg-secondary transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? 'Import en cours...' : 'Importer'}
              </button>
            </div>
          </>
        ) : (
          <div>
            <div className="text-center mb-6">
              {result.failed === 0 ? (
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              ) : (
                <AlertCircle className="w-16 h-16 text-orange-600 mx-auto mb-4" />
              )}
              <h3 className="text-xl font-bold text-slate-900 mb-2">Import terminé</h3>
              <p className="text-slate-600">
                <span className="text-green-600 font-semibold">{result.success} biens importés</span>
                {result.failed > 0 && (
                  <span className="text-red-600 font-semibold ml-2">• {result.failed} échecs</span>
                )}
              </p>
            </div>

            {result.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 max-h-64 overflow-y-auto">
                <h4 className="font-semibold text-red-900 mb-2">Erreurs</h4>
                <ul className="text-sm text-red-800 space-y-1">
                  {result.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full bg-primary text-white px-6 py-3 rounded-lg hover:bg-secondary transition"
            >
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
