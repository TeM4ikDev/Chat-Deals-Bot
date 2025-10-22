import { IScammer, ScammerStatus } from "@/types"
import { ScammerItem } from "./scammer"
import { Loader } from "../layout/Loader"
import { AlertTriangle } from "lucide-react"

interface ScammerListProps {
    scammers: IScammer[]
    onUpdateScammerStatus?: (scammerId: string, status: ScammerStatus) => void
    isProcessing?: boolean
    showConfirmButtons?: boolean
    isLoading?: boolean
}

export const ScammerList: React.FC<ScammerListProps> = ({
    scammers,
    onUpdateScammerStatus,
    isProcessing = false,
    showConfirmButtons = false,
    isLoading = false
}) => {

    if(isLoading) {
        return <Loader text="Загрузка пользователей..." className="!m-0 !min-h-0 !p-0" />
    }   

    if (scammers.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <AlertTriangle className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg font-medium">Пользователи не найдены</p>
                <p className="text-sm">Пока нет таких пользователей в базе</p>
            </div>
        )
    }

    return (
        <div className="grid w-full gap-2 ">
            {scammers.map((scammer) => (
                <ScammerItem
                    key={scammer.id}
                    scammer={scammer}
                    onUpdateScammerStatus={onUpdateScammerStatus}
                    isProcessing={isProcessing}
                    showConfirmButtons={showConfirmButtons}
                />
            ))}
        </div>

    )
} 