import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isLoading) onClose();
      }}
      title={title}
      maxWidth="sm"
    >
      <div className="space-y-4 pt-2">
        <div className="text-sm text-brand-muted leading-relaxed">
          {description}
        </div>
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-brand-border">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={isDestructive ? 'danger' : 'primary'}
            size="sm"
            onClick={handleConfirm}
            disabled={isLoading}
            className="font-semibold"
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
