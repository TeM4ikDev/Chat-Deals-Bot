import { Dialog, DialogTitle } from '@headlessui/react';
import { AnimatePresence, motion } from 'framer-motion';
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
    if (buttonFC) {
      buttonFC();
    }
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog 
          open={isOpen} 
          as="div" 
          className="relative z-50 focus:outline-none" 
          onClose={handleClose}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-10 flex items-center justify-center p-2 backdrop-blur-md bg-black/50"
          >
            <motion.div
              initial={{ 
                opacity: 0, 
                scale: 0.95, 
                y: 10 
              }}
              animate={{ 
                opacity: 1, 
                scale: 1, 
                y: 0 
              }}
              exit={{ 
                opacity: 0, 
                scale: 0.95, 
                y: 10 
              }}
              transition={{ 
                duration: 0.2, 
                ease: "easeOut"
              }}
              className="w-full max-w-lg bg-gray-900 rounded-xl shadow-2xl flex flex-col max-h-[90vh]"
            >
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

              {/* <div className="flex justify-end gap-3 p-6 border-t border-gray-700 bg-gray-900/50">
                <Button
                  text={buttonCloseText}
                  color={buttonColor}
                  FC={handleClose}
                />
              </div> */}
            </motion.div>
          </motion.div>
        </Dialog>
      )}
    </AnimatePresence>
  );
};
