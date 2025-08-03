import { Dialog, DialogTitle } from '@headlessui/react';
import { X } from 'lucide-react';
import { Button } from './Button';
import { ReactNode } from 'react';

interface Props {
  title: string | ReactNode;
  buttonFC?: () => void;
  content?: string;
  buttonCloseText?: string;
  buttonColor?: 'red' | 'blue';
  children?: React.ReactNode;
  isOpen: boolean;
  setIsOpen: (arg: boolean) => void;
}

export const Modal = ({
  title,
  buttonCloseText = "Закрыть",
  buttonColor = "blue",
  children,
  buttonFC,
  isOpen,
  setIsOpen
}: Props) => {

  const handleClose = () => {
    if (buttonFC) buttonFC();
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/60" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-1">
        <Dialog.Panel className="w-full max-w-lg bg-gray-900 rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <DialogTitle as="h3" className="text-xl font-semibold text-white">
              {title}
            </DialogTitle>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors duration-200"
            >
              <X className="w-5 h-5 text-gray-400 hover:text-white transition-colors" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {children}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};
