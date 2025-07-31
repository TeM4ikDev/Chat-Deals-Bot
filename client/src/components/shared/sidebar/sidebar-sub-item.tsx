import type { LucideIcon } from "lucide-react";
import { NavLink } from "react-router-dom";

interface Props {
    text: string;
    href: string;
    closeSidebar: () => void;
    icon?: LucideIcon;
}

export const SidebarSubItem = ({ text, href, closeSidebar, icon: Icon }: Props) => {
    return (
        <NavLink
            to={href}
            onClick={closeSidebar}
            className={({ isActive }) =>
                `flex items-center gap-2 py-2 px-4 text-base rounded-lg font-semibold transition-all
                ${isActive
                    ? 'bg-gray-800/90 text-gray-100 shadow'
                    : 'text-gray-300 hover:bg-gray-700/80 hover:text-gray-100 hover:shadow'}
               `
            }
        >
            {Icon && <Icon size={20} className="text-blue-200" />}
            <span className="font-bold tracking-wide">{text}</span>
        </NavLink>
    );
}