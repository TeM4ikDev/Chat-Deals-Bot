import { IScammer, ScammerStatus } from "@/types"
import { AlertTriangle, Calendar, Shield, User, XCircle } from "lucide-react"
import { Block } from "../ui/Block"
import { Button } from "../ui/Button"

interface ScammerItemProps {
    scammer: IScammer
    onConfirmAsScammer?: () => void
    onConfirmAsSuspicious?: () => void
    onRejectConfirmation?: () => void
    isProcessing?: boolean
    showConfirmButtons?: boolean
}

export const ScammerItem: React.FC<ScammerItemProps> = ({
    scammer,
    onConfirmAsScammer,
    onConfirmAsSuspicious,
    onRejectConfirmation,
    isProcessing = false,
    showConfirmButtons = false
}) => {
    const getStatusIcon = () => {
        switch (scammer.status) {
            case ScammerStatus.SCAMMER:
                return <Shield className="w-4 h-4 text-red-500" />
            case ScammerStatus.SUSPICIOUS:
                return <AlertTriangle className="w-4 h-4 text-yellow-500" />
            case ScammerStatus.UNKNOWN:
                return <User className="w-4 h-4 text-gray-500" />
            default:
                return <User className="w-4 h-4 text-gray-500" />
        }
    }

    const getStatusText = () => {
        switch (scammer.status) {
            case ScammerStatus.SCAMMER:
                return "Скамер"
            case ScammerStatus.SUSPICIOUS:
                return "Подозрительный"
            case ScammerStatus.UNKNOWN:
                return "Неизвестный"
            default:
                return "Неизвестный"
        }
    }

    const getStatusColor = () => {
        switch (scammer.status) {
            case ScammerStatus.SCAMMER:
                return "text-red-400 bg-red-900/20"
            case ScammerStatus.SUSPICIOUS:
                return "text-yellow-400 bg-yellow-900/20"
            case ScammerStatus.UNKNOWN:
                return "text-gray-400 bg-gray-900/20"
            default:
                return "text-gray-400 bg-gray-900/20"
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const getStatusButtonProps = (status: ScammerStatus) => {
        const isCurrentStatus = scammer.status === status
        
        switch (status) {
            case ScammerStatus.SCAMMER:
                return {
                    text: "Скамер",
                    color: (isCurrentStatus ? "red" : "transparent") as "red" | "transparent",
                    icon: <Shield className="w-4 h-4" />,
                    className: isCurrentStatus ? "opacity-100" : "opacity-60 hover:opacity-80",
                    FC: onConfirmAsScammer
                }
            case ScammerStatus.SUSPICIOUS:
                return {
                    text: "Подозрительный",
                    color: (isCurrentStatus ? "green" : "transparent") as "green" | "transparent",
                    icon: <AlertTriangle className="w-4 h-4" />,
                    className: isCurrentStatus ? "opacity-100" : "opacity-60 hover:opacity-80",
                    FC: onConfirmAsSuspicious
                }
            default:
                return {
                    text: "Неизвестный",
                    color: "transparent" as const,
                    icon: <XCircle className="w-4 h-4" />,
                    className: "opacity-60 hover:opacity-80",
                    disabled: isProcessing,
                    FC: onRejectConfirmation
                }
        }
    }

    return (
        <Block className="flex !flex-row justify-between">
            <div className="flex flex-1 flex-col">
                <div className="flex items-center gap-3">
                    {getStatusIcon()}
                    <div>
                        <h3 className="text-white font-medium">
                            {scammer.username ? `@${scammer.username}` : `ID: ${scammer.telegramId}`}
                        </h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor()}`}>
                            {getStatusText()}
                        </span>
                    </div>
                </div>

                <div className="space-y-2 text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>Telegram ID: {scammer.telegramId}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Добавлен: {formatDate(scammer.createdAt)}</span>
                    </div>
                    {scammer.scamForms > 0 && (
                        <div className="flex items-center gap-2">
                            <span>Жалоб: {scammer.scamForms}</span>
                        </div>
                    )}
                </div>
            </div>

            {showConfirmButtons && onConfirmAsScammer && onConfirmAsSuspicious && onRejectConfirmation && (
                <Block className="!gap-1 p-0 justify-end min-w max-w-min" variant='transparent'>
                    {/* Кнопки статусов */}
                    {[ScammerStatus.SCAMMER, ScammerStatus.SUSPICIOUS].map((status) => {
                        const props = getStatusButtonProps(status)
                        return (
                            <Button
                                key={status}
                                text={props.text}
                                FC={props.FC}
                                color={props.color}
                                loading={isProcessing}
                                icon={props.icon}
                                disabled={props.disabled}
                                className={`text-xs px-2 py-1 ${props.className}`}
                            />
                        )
                    })}
                    
                    {/* Отдельная кнопка для отклонения */}
                    <Button
                        text="Отклонить"
                        FC={onRejectConfirmation}
                        color="transparent"
                        loading={isProcessing}
                        icon={<XCircle className="w-4 h-4" />}
                        disabled={isProcessing}
                        className="text-xs px-2 py-1 opacity-60 hover:opacity-80"
                    />
                </Block>
            )}
        </Block>
    )
}
