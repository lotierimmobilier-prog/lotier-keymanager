import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info' | 'confirm';
  confirmText?: string;
  cancelText?: string;
}

export function Modal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'info',
  confirmText = 'OK',
  cancelText = 'Annuler',
}: ModalProps) {
  const { colors: theme } = useTheme();
  const { profile } = useAuth();
  const [agencyLogo, setAgencyLogo] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.agency_id) {
      loadAgencyLogo();
    }
  }, [profile?.agency_id]);

  async function loadAgencyLogo() {
    if (!profile?.agency_id) return;

    try {
      const { data, error } = await supabase
        .from('agencies')
        .select('logo_url')
        .eq('id', profile.agency_id)
        .single();

      if (error) throw error;
      setAgencyLogo(data?.logo_url || null);
    } catch (error) {
      console.error('Error loading agency logo:', error);
    }
  }

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-12 h-12" style={{ color: theme.success }} />;
      case 'error':
        return <AlertCircle className="w-12 h-12" style={{ color: theme.error }} />;
      case 'warning':
        return <AlertTriangle className="w-12 h-12" style={{ color: theme.warning }} />;
      case 'confirm':
        return <AlertTriangle className="w-12 h-12" style={{ color: theme.primary }} />;
      default:
        return <Info className="w-12 h-12" style={{ color: theme.primary }} />;
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all animate-in fade-in zoom-in duration-200"
        style={{ border: `2px solid ${theme.primary}` }}
      >
        {agencyLogo && (
          <div className="flex justify-center pt-6 pb-2">
            <div className="bg-white rounded-lg p-3 shadow-sm border border-slate-200">
              <img
                src={agencyLogo}
                alt="Logo agence"
                className="h-12 object-contain"
              />
            </div>
          </div>
        )}

        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-3">
                {getIcon()}
                <h3 className="text-xl font-bold text-slate-900">{title}</h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-6">
            <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{message}</p>
          </div>

          <div className="flex space-x-3">
            {type === 'confirm' && (
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-lg border-2 font-medium transition-all hover:bg-slate-50"
                style={{ borderColor: theme.primary, color: theme.primary }}
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={() => {
                if (onConfirm) {
                  onConfirm();
                }
                onClose();
              }}
              className="flex-1 px-4 py-2.5 rounded-lg font-medium text-white transition-all hover:opacity-90 shadow-md"
              style={{ backgroundColor: theme.primary }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
