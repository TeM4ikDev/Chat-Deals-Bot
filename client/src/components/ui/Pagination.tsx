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


    // if(!maxPage || maxPage == 0) return 


    return (
        <div className={cn("flex w-full justify-center items-center gap-4", className)}>
            <Button
                text="← Назад"
                FC={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                color="transparent"
            />
            <span className="text-gray-400 text-nowrap font-bold text-sm">{currentPage} / {maxPage}</span>
            <Button
                text="Вперед →"
                FC={() => onPageChange(currentPage + 1)}
                disabled={currentPage === maxPage}
                color="transparent"
            />
        </div>
    )
}