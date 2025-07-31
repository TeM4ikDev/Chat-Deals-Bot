import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react'
import { useState } from 'react'
import { Button } from './Button';
import { Input } from './Input';

interface Props {
    title: string;
    buttonOpenText: string;
    buttonCloseText?: string;
    buttonColor: 'red' | 'blue';
    isOpen: boolean;
    onClose: () => void;
    code: string;
    setCode: (value: string) => void;
    IsValidCodeFrom: () => boolean;
    verifyCodeHandler: () => void;
}

export const ModalCheckCode = ({
    title,
    buttonOpenText,
    buttonCloseText,
    buttonColor,
    isOpen,
    onClose,
    code,
    setCode,
    IsValidCodeFrom,
    verifyCodeHandler
}: Props) => {

    return (
        <>
            <Dialog open={isOpen} as="div" className="relative z-50 focus:outline-none" onClose={onClose}>
                <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center backdrop-blur-sm z-0 p-4">
                        <DialogPanel
                            transition
                            className="w-full max-w-md bg-gray-900 rounded-2xl p-6 ease-out"
                        >
                            <DialogTitle as="h3" className="text-2xl font-medium text-white mb-4">
                                {title}
                            </DialogTitle>


                            <div className='flex flex-row gap-3 w-full'>
                                <Input
                                    name='text'
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    placeholder="Введите код с почты"
                                />

                                <Button text='Подтвердить'
                                    FC={() => {
                                        if (IsValidCodeFrom()) {
                                            verifyCodeHandler();
                                        }
                                    }}
                                    widthMin={true}
                                    disabled={!IsValidCodeFrom()}
                                />

                            </div>


                            <div className="mt-4 text-center">

                                {buttonCloseText && (
                                    <Button
                                        text={buttonCloseText}
                                        color={buttonColor}
                                        FC={onClose}
                                    />
                                )}

                            </div>
                        </DialogPanel>
                    </div>
                </div>
            </Dialog>
        </>
    )
}
