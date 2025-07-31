import { useStore } from "@/store/root.store";
import type { RouteKey } from "@/types/routes/routeKeys";
import { cn } from "@/utils/cn";
import { motion } from "framer-motion";
import { ReactNode } from "react";
import { NavLink } from "react-router-dom";

interface Props {
    text?: string;
    FC?: () => void;
    routeKey?: RouteKey;
    color?: "red" | "blue" | "green" | "transparent";
    widthMin?: boolean;
    openNewPage?: boolean;
    href?: string;
    formSubmit?: boolean
    disabled?: boolean
    className?: string;
    icon?: ReactNode
    loading?: boolean;
}

export const Button = ({ text, FC, routeKey, icon, widthMin = false, href, className, openNewPage = false, disabled = false, formSubmit = false, color = "blue", loading = false }: Props) => {
    const buttonColor = color === "red"
        ? "bg-gradient-to-r from-red-500/90 to-red-600/90 active:from-red-600 active:to-red-700 md:hover:from-red-600 md:hover:to-red-700 border border-red-500/50"
        : color === "green"
            ? "bg-gradient-to-r from-green-500/90 to-green-600/90 active:from-green-600 active:to-green-700 md:hover:from-green-600 md:hover:to-green-700 border border-green-500/50"
            : color === "transparent"
                ? "bg-gradient-to-r from-gray-800/30 to-gray-700/30 active:from-gray-800/50 active:to-gray-700/50 md:hover:from-gray-800/50 md:hover:to-gray-700/50 border border-gray-600/50 text-gray-300"
                : "bg-gradient-to-r from-blue-500/90 to-blue-600/90 active:from-blue-600 active:to-blue-700 md:hover:from-blue-600 md:hover:to-blue-700 border border-blue-500/50";

    const buttonWidth = !widthMin ? "w-full" : "w-min"

    let path = '';
    if (routeKey) {
        const { routesStore: { getPathByKey } } = useStore();
        path = getPathByKey(routeKey);
    }
    if (!path && href) path = href;

    const renderButton = () => {
        return (
            <button
                onClick={FC}
                className={cn(
                    buttonWidth,
                    (disabled || loading) ? "bg-gradient-to-r from-gray-700/50 to-gray-600/50 cursor-not-allowed text-gray-500 border border-gray-600/30" : !(icon && !text) ? buttonColor : '',
                    "flex flex-row h-min mx-auto justify-center items-center text-nowrap transition-all duration-200 font-bold gap-3 py-2 px-4 rounded-lg shadow-sm",
                    className
                )}
                disabled={disabled || loading}
            >
                {loading ? (
                    <motion.span
                        // className="mx-5"
                        style={{
                            width: 24,
                            height: 24,
                            border: '2px solid #fff',
                            borderTop: '2px solid transparent',
                            borderRadius: '50%',
                            display: 'inline-block',
                        }}
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    />
                ) : <>
                    {icon}
                    {text}
                </>}
            </button>
        )
    }

    return (
        <>
            {!formSubmit ? (
                <NavLink to={path} target={openNewPage ? "_blank" : ''} className={cn("flex z-10", buttonWidth)}>
                    {renderButton()}
                </NavLink>
            ) : (
                renderButton()
            )}
        </>
    )
}