import { useStore } from "@/store/root.store";
import { observer } from "mobx-react-lite";
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SidebarSubItem } from "../shared/sidebar/sidebar-sub-item";
import { Block } from "../ui/Block";
import { Button } from "../ui/Button";
import { Logo } from "./Logo";
import { Sidebar } from "./Sidebar";

export const Header: React.FC = observer(() => {
    const { userStore: { user, isLoading }, routesStore: { getAll } } = useStore();
    const [hoveredKey, setHoveredKey] = useState<string | null>(null);
    const [dropdownPosition, setDropdownPosition] = useState<{ x: number, width: number } | null>(null);
    const navigate = useNavigate();
    const location = useLocation();

    const allRoutes = getAll();

    const navLinks = useMemo(() => (
        allRoutes.filter(route => route.showInHeader && !("disabled" in route && route.disabled) && (!("accessRoles" in route) || !route.accessRoles || (user && route.accessRoles.includes(user.role as any))))
    ), [allRoutes, user]);

    const getSubRoutes = (parentKey: string) => {
        const prefix = parentKey + '_';
        return allRoutes.filter(route => route.key.startsWith(prefix) && route.key !== parentKey);
    };

    const handleBlockClick = (
        event: React.MouseEvent<HTMLDivElement>,
        key: string,
        path: string,
        hasSubRoutes: boolean
    ) => {
        if (hasSubRoutes) {
            event.preventDefault();
            event.stopPropagation();
            const element = event.currentTarget;
            const rect = element.getBoundingClientRect();
            setDropdownPosition({ x: rect.left, width: rect.width });
            setHoveredKey(hoveredKey === key ? null : key);
        } else {
            navigate(path);
        }
    };

    const activeDropdown = () => {
        if (!hoveredKey || !dropdownPosition) return null;
        const subRoutes = getSubRoutes(hoveredKey);
        if (!subRoutes.length) return null;
        return (
            <div
                className="absolute flex text-nowrap backdrop-blur-lg flex-col gap-2 p-1 bg-slate-800 rounded-lg shadow-lg min-w-[200px] z-[100] border border-slate-600/50"
                style={{
                    left: `${dropdownPosition.x + dropdownPosition.width - 200}px`,
                    width: '200px',
                    top: '5rem'
                }}
            >
                {subRoutes.map((route) => (
                    <SidebarSubItem
                        key={route.key}
                        text={route.label}
                        href={route.path}
                        closeSidebar={() => {
                            setHoveredKey(null);
                        }}
                        icon={"icon" in route ? route.icon : undefined}
                    />
                ))}
            </div>
        );
    };

    return (
        <header
            className={`fixed top-0 left-0 right-0 w-full max-w-full z-50 transition-all duration-300 bg-slate-800/60 backdrop-blur-lg`}
        >
            <div className="max-w-7xl mx-auto py-1 px-2 sm:px-3 lg:px-8">
                <div className="flex justify-between items-center md:h-14">
                    <div className="flex-shrink-0">
                        <Logo className="hover:opacity-80 transition-opacity duration-300 w-auto h-6 md:h-8" />
                    </div>
                
                    <Sidebar />
                </div>
            </div>
            <div>
                {activeDropdown()}
            </div>
        </header>
    );
});
