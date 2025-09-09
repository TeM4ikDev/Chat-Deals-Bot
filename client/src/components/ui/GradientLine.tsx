import { cn } from "@/utils/cn";

interface GradientLineProps {
    className?: string;
    height?: string;
}

export const GradientLine: React.FC<GradientLineProps> = ({ className = "", height = "h-[2px]" }) => (
    <div className={cn("w-full bottom-0 inset-x-0 bg-gradient-to-r from-transparent via-white/60 to-transparent", height, className)} />
); 