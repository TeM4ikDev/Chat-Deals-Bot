import { IScammer, ScammerStatus } from "@/types"
import { AlertTriangle, Calendar, ChevronDown, ChevronUp, Mail, Shield, User, XCircle } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"
import { Block } from "../ui/Block"
import { Button } from "../ui/Button"

interface ScammerItemProps {
    scammer: IScammer
    onUpdateScammerStatus?: (scammerId: string, status: ScammerStatus) => void
    isProcessing?: boolean
    showConfirmButtons?: boolean
}

export const ScammerItem: React.FC<ScammerItemProps> = ({
    scammer,
    onUpdateScammerStatus,
    isProcessing = false,
    showConfirmButtons = false
}) => {
    const [showStatusButtons, setShowStatusButtons] = useState(false)
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
            case ScammerStatus.SPAMMER:
                return "Спаммер"
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
            case ScammerStatus.SPAMMER:
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
                    FC: () => onUpdateScammerStatus?.(scammer.id, status)
                }
            case ScammerStatus.SUSPICIOUS:
                return {
                    text: "50/50",
                    color: (isCurrentStatus ? "green" : "transparent") as "green" | "transparent",
                    icon: <AlertTriangle className="w-4 h-4" />,
                    className: isCurrentStatus ? "opacity-100" : "opacity-60 hover:opacity-80",
                    FC: () => onUpdateScammerStatus?.(scammer.id, status)
                }

            case ScammerStatus.SPAMMER:
                return {
                    text: "Спаммер",
                    color: (isCurrentStatus ? "red" : "transparent") as "red" | "transparent",
                    icon: <Mail className="w-4 h-4" />,
                    className: isCurrentStatus ? "opacity-100" : "opacity-60 hover:opacity-80",
                    FC: () => onUpdateScammerStatus?.(scammer.id, status)
                }
            default:
                return {
                    text: "Неизвестный",
                    color: "transparent" as const,
                    icon: <XCircle className="w-4 h-4" />,
                    className: "opacity-60 hover:opacity-80",
                    disabled: isProcessing,
                    FC: () => onUpdateScammerStatus?.(scammer.id, status)
                }
        }
    }

    return (
        <Block className="flex p-0.5 !flex-row justify-between">
            <div className="flex flex-1 flex-col gap-2 justify-between">
                <div className="flex items-center gap-3 ">
                    {getStatusIcon()}
                    <div className="flex flex-col">
                        <div className="flex flex-row gap-2 items-baseline">
                            <Link className="text-blue-300 font-bold" to={`../scamforms/${scammer.username ? (scammer.username).replace('@', '') : scammer.telegramId}`}>
                                {scammer.username ? `@${scammer.username}` : `${scammer.telegramId}`}
                            </Link>
                            <div className="flex items-center gap-2">
                                {scammer.marked ? (
                                    <div className="flex items-center gap-1 text-green-500 text-xs">
                                        <span>Отмечен</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1 text-gray-500 text-xs">
                                        <span>Не отмечен</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <span className={`text-xs w-min px-2 rounded-full ${getStatusColor()}`}>
                            {getStatusText()}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col text-sm gap-1 text-gray-400">
                    {scammer.twinAccounts && scammer.twinAccounts.length > 0 && (
                        <Block variant='lighter' title="Твинки" className="!p-0 !gap-0 !w-auto">
                            <div className="flex flex-row gap-1 flex-wrap">
                                {scammer.twinAccounts.map((twin) => (
                                    <div className="flex w-min items-center flex-row gap-1 text-white text-xs" key={twin.telegramId}>
                                        <span>@{twin.username || twin.telegramId}</span>
                                    </div>
                                ))}
                            </div>
                        </Block>
                    )}


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
                    {scammer.description && (
                        <div className="flex items-start gap-2 mt-2">
                            <span className="text-xs text-gray-400 leading-relaxed">
                                {scammer.description}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {showConfirmButtons && onUpdateScammerStatus && (
                <div className="flex flex-col items-end gap-1">
                    <Button
                        text=""
                        FC={() => setShowStatusButtons(!showStatusButtons)}
                        color="transparent"
                        icon={showStatusButtons ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        className="text-xs self-end w-min !px-1 !mr-0 ml-auto py-1 opacity-60 hover:opacity-80"
                    />
                    
                    {showStatusButtons && (
                        <Block className="!gap-1 !p-0 justify-start min-w max-w-min" variant='transparent'>
                            {[ScammerStatus.SCAMMER, ScammerStatus.SUSPICIOUS, ScammerStatus.SPAMMER].map((status) => {
                                const props = getStatusButtonProps(status)
                                return (
                                    <Button
                                        key={status}
                                        text={props.text}
                                        FC={scammer.status != status ? props.FC : () => { }}
                                        color={props.color}
                                        // loading={i sProcessing}
                                        icon={props.icon}
                                        // disabled={props.disabled}
                                        className={`text-xs !px-1 py-1 ${props.className}`}
                                    />
                                )
                            })}

                            <Button
                                text="Отклонить"
                                FC={() => onUpdateScammerStatus?.(scammer.id, ScammerStatus.UNKNOWN)}
                                color="transparent"
                                // loading={isProcessing}
                                icon={<XCircle className="w-4 h-4" />}
                                // disabled={isProcessing}
                                className="text-xs !px-1 py-1 opacity-60 hover:opacity-80"
                            />
                        </Block>
                    )}
                </div>
            )}
        </Block>
    )
}
