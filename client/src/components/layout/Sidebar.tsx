import { useStore } from '@/store/root.store';
import { removeTokenFromLocalStorage } from '@/utils/localstorage';
import { Dialog, Transition } from '@headlessui/react';
import { LogOut, MenuIcon, SidebarClose } from 'lucide-react';
import { Fragment, useState } from 'react';
import { toast } from 'react-toastify';
import { SidebarItem } from '../shared/sidebar/sidebar-item';
import { Button } from '../ui/Button';

export const Sidebar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { userStore: { user, logout }, routesStore: { getRootRoutes } } = useStore();

    const openSidebar = () => setIsOpen(true);
    const closeSidebar = () => setIsOpen(false);

    const handleLogout = () => {
        removeTokenFromLocalStorage();
        logout();
        closeSidebar();
        toast.success('Вы успешно вышли из системы');
    };

    const mainRoutes = getRootRoutes().filter(route =>
        !(route.disabled) &&
        (!route.accessRoles || (user && route.accessRoles.includes(user.role)))
    );

    return (
        <div className='z-50'>
            <MenuIcon onClick={openSidebar} size={40} />

            <Transition show={isOpen} as={Fragment}>
                <Dialog as="div" className="fixed inset-0 z-50" onClose={closeSidebar}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/50" />
                    </Transition.Child>

                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="-translate-x-full"
                        enterTo="translate-x-0"
                        leave="ease-in duration-200"
                        leaveFrom="translate-x-0"
                        leaveTo="-translate-x-full"
                    >
                        <Dialog.Panel className="fixed inset-y-0 left-0 flex w-full max-w-sm">
                            <div className="flex flex-col bg-[#1a1333] w-full overflow-y-auto h-full p-5 text-white">
                                <div className="flex justify-between items-center mb-5">
                                    <SidebarClose className='ml-auto' onClick={closeSidebar} size={28} />
                                </div>

                                <div className="flex flex-col gap-3 h-full">
                                    {mainRoutes.map(route => (
                                        <SidebarItem
                                            key={route.key}
                                            route={route}
                                            closeSidebar={closeSidebar}
                                            userRole={user?.role}
                                        />
                                    ))}

                                    <div className="flex flex-1 justify-end">
                                        {user && (
                                            <Button
                                                FC={handleLogout}
                                                icon={<LogOut size={20} />}
                                                color="red"
                                                text="Выйти"
                                                className="!mt-auto"
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Dialog.Panel>
                    </Transition.Child>
                </Dialog>
            </Transition>
        </div>
    );
};

