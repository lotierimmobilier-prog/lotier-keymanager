import { useState, useRef } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PhotoUploadProps {
  onPhotoUploaded: (url: string) => void;
  onClose: () => void;
  title: string;
  agencyId: string;
  movementId?: string;
}

export function PhotoUpload({ onPhotoUploaded, onClose, title, agencyId, movementId }: PhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const resizeImage = (file: File, maxWidth: number, maxHeight: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Cannot get canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image');
      return;
    }

    try {
      const resizedImage = await resizeImage(file, 200, 200);
      setPreview(resizedImage);
    } catch (error) {
      console.error('Error resizing image:', error);
      alert('Erreur lors du traitement de l\'image');
    }
  };

  const uploadPhoto = async () => {
    if (!preview) return;

    setUploading(true);
    try {
      const blob = await fetch(preview).then(r => r.blob());
      const file = new File([blob], `key-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });

      const fileName = `${agencyId}/${movementId || 'temp'}-${Date.now()}.jpg`;

      const { data, error } = await supabase.storage
        .from('key-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('key-photos')
        .getPublicUrl(fileName);

      onPhotoUploaded(urlData.publicUrl);
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Erreur lors du téléchargement de la photo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-lg w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {preview ? (
          <div className="space-y-4">
            <div className="border-2 border-slate-300 rounded-lg overflow-hidden flex justify-center bg-slate-50">
              <img src={preview} alt="Preview" className="max-w-[200px] max-h-[200px] object-contain" />
            </div>
            <p className="text-xs text-slate-500 text-center">Image redimensionnée à 200x200 pixels</p>

            <div className="flex space-x-3">
              <button
                onClick={() => setPreview(null)}
                className="flex-1 bg-slate-100 text-slate-700 px-6 py-3 rounded-lg hover:bg-slate-200 transition"
              >
                Reprendre
              </button>
              <button
                onClick={uploadPhoto}
                disabled={uploading}
                className="flex-1 bg-primary text-white px-6 py-3 rounded-lg hover:bg-secondary transition disabled:opacity-50"
              >
                {uploading ? 'Envoi...' : 'Valider'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 mb-4">
              Prenez une photo des clés ou importez une image depuis votre appareil
            </p>

            <div className="grid grid-cols-1 gap-3">
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="flex items-center justify-center space-x-2 bg-primary text-white px-6 py-4 rounded-lg hover:bg-secondary transition"
              >
                <Camera className="w-5 h-5" />
                <span>Prendre une photo</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center space-x-2 bg-slate-100 text-slate-700 px-6 py-4 rounded-lg hover:bg-slate-200 transition"
              >
                <Upload className="w-5 h-5" />
                <span>Choisir une image</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
