import { createContext, useContext, useState, ReactNode } from 'react';
import { Modal } from '../components/Modal';

interface ModalOptions {
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info' | 'confirm';
  confirmText?: string;
  cancelText?: string;
}

interface ModalContextType {
  showAlert: (options: ModalOptions) => void;
  showConfirm: (options: ModalOptions) => Promise<boolean>;
  showSuccess: (title: string, message: string) => void;
  showError: (title: string, message: string) => void;
  showWarning: (title: string, message: string) => void;
  showInfo: (title: string, message: string) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [modalOptions, setModalOptions] = useState<ModalOptions>({
    title: '',
    message: '',
    type: 'info',
  });
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null);

  const showAlert = (options: ModalOptions) => {
    setModalOptions(options);
    setIsOpen(true);
    setResolvePromise(null);
  };

  const showConfirm = (options: ModalOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setModalOptions({ ...options, type: 'confirm' });
      setIsOpen(true);
      setResolvePromise(() => resolve);
    });
  };

  const showSuccess = (title: string, message: string) => {
    showAlert({ title, message, type: 'success' });
  };

  const showError = (title: string, message: string) => {
    showAlert({ title, message, type: 'error' });
  };

  const showWarning = (title: string, message: string) => {
    showAlert({ title, message, type: 'warning' });
  };

  const showInfo = (title: string, message: string) => {
    showAlert({ title, message, type: 'info' });
  };

  const handleClose = () => {
    setIsOpen(false);
    if (resolvePromise) {
      resolvePromise(false);
      setResolvePromise(null);
    }
  };

  const handleConfirm = () => {
    if (resolvePromise) {
      resolvePromise(true);
      setResolvePromise(null);
    }
    setIsOpen(false);
  };

  return (
    <ModalContext.Provider
      value={{
        showAlert,
        showConfirm,
        showSuccess,
        showError,
        showWarning,
        showInfo,
      }}
    >
      {children}
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        onConfirm={modalOptions.type === 'confirm' ? handleConfirm : undefined}
        title={modalOptions.title}
        message={modalOptions.message}
        type={modalOptions.type}
        confirmText={modalOptions.confirmText}
        cancelText={modalOptions.cancelText}
      />
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}
