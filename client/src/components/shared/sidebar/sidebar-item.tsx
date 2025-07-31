import { Route } from "@/types/routes/routeKeyPaths";
import { cn } from "@/utils/cn";
import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { SidebarSubItem } from "./sidebar-sub-item";
import { useStore } from '@/store/root.store';

interface Props {
    route: Route;
    children?: ReactNode;
    closeSidebar: () => void;
    userRole?: any;
}

export const SidebarItem = ({ route, children, closeSidebar, userRole }: Props) => {
    const { routesStore: { getStaticSubRoutes } } = useStore();
    const currentPath = useLocation().pathname;

    if (!route) return null;
    const { key, path, label, icon: Icon } = route;
    if (!label) return null;

    const subRoutes = getStaticSubRoutes(key);
    const hasSubRoutes = subRoutes.length > 0;

    return (
        <Disclosure as="div" className="w-full">
            {({ open }) => (
                <>
                    <div
                        className={cn(
                            "flex items-center justify-between w-full p-2 rounded-lg transition-all",
                            "hover:bg-gray-700/80 hover:text-gray-100 hover:shadow",
                            currentPath === path
                                ? "bg-gray-800/90 text-gray-100 font-bold shadow"
                                : "text-gray-300 font-semibold"
                        )}
                    >
                        {hasSubRoutes ? (
                            <DisclosureButton className="flex items-center w-full text-left">
                                {Icon && <Icon size={20} className="text-blue-200" />}
                                <span className="ml-3 font-bold tracking-wide text-base">{label}</span>
                            </DisclosureButton>
                        ) : (
                            <NavLink to={path} className="flex items-center w-full" onClick={closeSidebar}>
                                {Icon && <Icon size={20} className="text-blue-200" />}
                                <span className="ml-3 font-bold tracking-wide text-base">{label}</span>
                            </NavLink>
                        )}
                        {hasSubRoutes && (
                            <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                <DisclosureButton className="p-1">
                                    <ChevronDown size={18} className="text-gray-400" />
                                </DisclosureButton>
                            </motion.div>
                        )}
                    </div>
                    {hasSubRoutes && (
                        <DisclosurePanel>
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: open ? 1 : 0, y: open ? 0 : -10 }}
                                transition={{ duration: 0.3 }}
                                className="flex flex-col pl-8 mt-1 gap-1"
                            >
                                {subRoutes.map((subRoute) => (
                                    <SidebarSubItem
                                        key={subRoute.key}
                                        text={subRoute.label}
                                        href={subRoute.path}
                                        closeSidebar={closeSidebar}
                                        icon={"icon" in subRoute ? subRoute.icon : undefined}
                                    />
                                ))}
                            </motion.div>
                        </DisclosurePanel>
                    )}
                </>
            )}
        </Disclosure>
    );
}