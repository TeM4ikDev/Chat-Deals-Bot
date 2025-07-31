import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";
import React from "react";

interface PaginationProps {
    currentPage: number
    maxPage: number
    onPageChange: (page: number) => void
    className?: string
}

export const Pagination: React.FC<PaginationProps> = ({ currentPage, maxPage, onPageChange, className }) => {
    return (
        <div className={cn("flex justify-center items-center gap-4", className)}>
            <Button
                text="← Назад"
                FC={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                color="transparent"
                // className="px-4 py-2 rounded-lg bg-[#221a3a] text-[#b6aaff] border border-[#31295a] hover:bg-[#2d2150] transition disabled:opacity-50"
            />
            <span className="text-gray-400 text-nowrap font-bold text-sm">{currentPage} / {maxPage}</span>
            <Button
                text="Вперед →"
                FC={() => onPageChange(currentPage + 1)}
                disabled={currentPage === maxPage}
                color="transparent"
                // className="px-4 py-2 rounded-lg bg-[#221a3a] text-[#b6aaff] border border-[#31295a] hover:bg-[#2d2150] transition disabled:opacity-50"
            />
        </div>
    )
}