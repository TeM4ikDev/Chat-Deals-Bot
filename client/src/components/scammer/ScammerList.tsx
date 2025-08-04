import { IScammer } from "@/types"
import { Filter, Users } from "lucide-react"
import { Block } from "../ui/Block"
import { ScammerItem } from "./scammer"
import { Button } from "@headlessui/react"

interface ScammerListProps {
    scammers: IScammer[]
    onConfirmAsScammer?: (scammerId: string) => void
    onConfirmAsSuspicious?: (scammerId: string) => void
    onRejectConfirmation?: (scammerId: string) => void
    isProcessing?: boolean
    showConfirmButtons?: boolean
}

export const ScammerList: React.FC<ScammerListProps> = ({
    scammers,
    onConfirmAsScammer,
    onConfirmAsSuspicious,
    onRejectConfirmation,
    isProcessing = false,
    showConfirmButtons = false
}) => {
    const getStatusCounts = () => {
        const counts = {
            scammer: 0,
            suspicious: 0,
            unknown: 0
        }

        scammers.forEach(scammer => {
            switch (scammer.status) {
                case 'SCAMMER':
                    counts.scammer++
                    break
                case 'SUSPICIOUS':
                    counts.suspicious++
                    break
                case 'UNKNOWN':
                    counts.unknown++
                    break
            }
        })
        return counts
    }
    const statusCounts = getStatusCounts()

    return (
        <div className="flex flex-col w-full max-w-2xl gap-2">
            <Block title='Статистика' icons={[<Users/>]}>
                <div className="grid grid-cols-3 gap-4 text-lg font-bold">
                    <div className="text-center">
                        <div className="text-red-400">{statusCounts.scammer}</div>
                        <div className="text-gray-400">Скамеры</div>
                    </div>
                    <div className="text-center">
                        <div className="text-yellow-400 ">{statusCounts.suspicious}</div>
                        <div className="text-gray-400">Подозрительные</div>
                    </div>
                    <div className="text-center">
                        <div className="text-gray-400">{statusCounts.unknown}</div>
                        <div className="text-gray-400">Неизвестные</div>
                    </div>
                </div>
            </Block>

            
            
            {scammers.length === 0 ? (
                <Block>
                    <div className="text-center py-8">
                        <Users className="w-12 h-12 text-gray-500 mx-auto" />
                        <p className="text-gray-400">
                           Список пуст
                        </p>
                    </div>
                </Block>
            ) : (
                <div className="grid w-full gap-1 ">
                    {scammers.map((scammer) => (
                        <ScammerItem
                            key={scammer.id}
                            scammer={scammer}
                            onConfirmAsScammer={onConfirmAsScammer ? () => onConfirmAsScammer(scammer.id) : undefined}
                            onConfirmAsSuspicious={onConfirmAsSuspicious ? () => onConfirmAsSuspicious(scammer.id) : undefined}
                            onRejectConfirmation={onRejectConfirmation ? () => onRejectConfirmation(scammer.id) : undefined}
                            isProcessing={isProcessing}
                            showConfirmButtons={showConfirmButtons}
                        />
                    ))}
                </div>
            )}
        </div>
    )
} 