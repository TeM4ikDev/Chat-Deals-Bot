import tonIcon from '@/assets/ton.svg';
import { cn } from "@/utils/cn";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { ReactNode, useRef, useState } from "react";

export interface BlockProps {
    children?: ReactNode,
    className?: string
    variant?: 'default' | 'lighter' | 'darker' | 'transparent'
    title?: ReactNode
    subtitle?: ReactNode
    icons?: ReactNode[]
    canCollapse?: boolean
    isCollapsedInitially?: boolean
    priceTitle?: number | ReactNode
    titleCenter?: boolean
    hugeTitle?: boolean
    mediumTitle?: boolean
    overflowHidden?: boolean
    onClick?: () => void
}

export const Block = ({
    children,
    className,
    variant = 'default',
    title,
    subtitle,
    icons: Icons,
    canCollapse = false,
    isCollapsedInitially = false,
    priceTitle,
    titleCenter = false,
    hugeTitle = false,
    mediumTitle = false,
    overflowHidden = false,
    onClick
}: BlockProps) => {
    const [isCollapsed, setIsCollapsed] = useState(isCollapsedInitially);
    const blockRef = useRef<HTMLDivElement>(null);

    const handleCollapse = (value: boolean) => {
        setIsCollapsed(value);
    };


    const getBackgroundColor = () => {
        switch (variant) {
            case 'lighter':
                return 'bg-[#221a3a]'
            case 'darker':
                return 'bg-[#120c22]'
            case 'transparent':
                return 'bg-transparent border-none shadow-none'
            default:
                return 'bg-[#18132a]'
        }
    }

    return (
        <div
            ref={blockRef}
            className={cn(
                getBackgroundColor(),
                `flex w-full max-w-2xl lg:max-w-6xl h-full min-h-0 flex-col relative shadow-lg rounded-lg border border-[#28204a] p-2 backdrop-blur-sm `,
                // isCollapsed ? 'gap-1' : 'gap-2',
                overflowHidden && '!overflow-hidden',
                className,
                onClick && 'cursor-pointer'
            )}
            onClick={onClick}
        >


            {(title || Icons || canCollapse) && (
                <div className={cn("flex flex-col gap-3 w-auto ", canCollapse && 'cursor-pointer !flex-row')}
                    onClick={() => canCollapse && handleCollapse(!isCollapsed)}>

                    <div className="flex flex-col items-start gap-2 w-full h-min">
                        <div className="flex w-full h-auto gap-2">
                            <div className={cn("flex h-full w-full items-center", titleCenter && '!justify-center text-center')}>
                                <div className={cn("flex items-center justify-center", Icons && Icons.length > 0 && 'mr-2')}>
                                    {Icons && Icons.map((Icon, index) => (
                                        <div key={index} className="flex items-center justify-center">{Icon}</div>
                                    ))}
                                </div>

                                {title && (
                                    typeof title === 'string'
                                        ? <h3 className={cn("text-lg items-center  h-min font-bold text-cyan-300", hugeTitle && '!text-3xl lg:!text-4xl', mediumTitle && '!text-2xl lg:!text-3xl')}>{title}</h3>
                                        : title
                                )}
                            </div>

                            {priceTitle && (
                                <div className="flex items-center gap-1">
                                    {typeof priceTitle === 'number' ? (
                                        <>
                                            <span className="text-lg font-semibold">{priceTitle}</span>
                                            <img src={tonIcon} alt="TON" className="w-4 h-4" />
                                        </>
                                    ) : (
                                        priceTitle
                                    )}
                                </div>
                            )}
                        </div>
                        {subtitle && (
                            <p className={cn("text-base font-bold md:text-lg w-full text-gray-400", titleCenter && '!text-center')}>{subtitle}</p>
                        )}
                    </div>
                    {canCollapse && (
                        <button
                            onClick={(e) => {
                                handleCollapse(!isCollapsed);
                            }}
                            className="p-1 rounded-md hover:bg-gray-600/50 transition-colors"
                            // aria-expanded={!isCollapsed}
                            aria-label={isCollapsed ? 'Развернуть блок' : 'Свернуть блок'}
                        >
                            <motion.div
                                animate={{ rotate: isCollapsed ? 0 : 180 }}
                                transition={{ duration: 0.2, ease: "easeInOut" }}
                            >
                                <ChevronDown className="w-5 h-5" />
                            </motion.div>
                        </button>
                    )}
                </div>
            )}

            {!isCollapsed && children}
        </div>
    )
}