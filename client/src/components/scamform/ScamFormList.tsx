import { AlertTriangle } from "lucide-react"
import { ScamFormItem } from "./ScamFormItem"
import { IScamForm } from "@/types"

interface ScamFormListProps {
    scamForms: IScamForm[]
    onViewForm: (form: IScamForm) => void
    showHeader?: boolean
}

export const ScamFormList: React.FC<ScamFormListProps> = ({
    scamForms,
    onViewForm,
    showHeader = true
}) => {
    // console.log(scamForms)

    if (scamForms.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <AlertTriangle className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg font-medium">Жалобы не найдены</p>
                <p className="text-sm">Пока нет активных жалоб от пользователей</p>
            </div>
        );
    }

    return (
        <div className="grid w-full gap-1 max-w-2xl">
            {scamForms.map((form) => (
                <ScamFormItem
                    key={form.id}
                    form={form}
                    onViewForm={onViewForm}
                    showHeader={showHeader}
                />
            ))}
        </div>
    );
}; 