import { ScamformsService } from "@/services/scamforms.service"
import { useStore } from "@/store/root.store"
import { IScamForm, IVoteResponse, voteType } from "@/types"
import { onRequest } from "@/utils/handleReq"
import { Eye, Image, ThumbsDown, ThumbsUp, User, Video } from "lucide-react"
import { memo, useCallback, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "react-toastify"
import { Block } from "../ui/Block"
import { Button } from "../ui/Button"

interface ScamFormItemProps {
    showHeader: boolean
    form: IScamForm
    onViewForm: (form: IScamForm) => void
}

export const ScamFormItem: React.FC<ScamFormItemProps> = memo(({
    form,
    onViewForm,
    showHeader
}) => {
    const { scamformsStore } = useStore()
    const [userVote, setUserVote] = useState<'like' | 'dislike' | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)

    // Получаем актуальные данные из store
    const currentForm = scamformsStore.getFormById(form.id) || form

    const handleViewForm = useCallback(() => {
        onViewForm(form)
    }, [onViewForm, form])

    const handleVote = async (voteT: voteType) => {
        if (isProcessing) return
        setIsProcessing(true)

        try {
            const data: IVoteResponse = await onRequest(ScamformsService.userVote(form.id, voteT))
            if (data) {
                if (data.isSuccess) {
                    // Обновляем глобальное состояние
                    scamformsStore.updateFormVotes(
                        form.id,
                        data.likes,
                        data.dislikes,
                        data.userVote
                    )
                    setUserVote(data.userVote === 'LIKE' ? 'like' : data.userVote === 'DISLIKE' ? 'dislike' : null)
                    toast.success(data.message)
                } else {
                    toast.error(data.message)
                }
            }
        } catch (error) {
            toast.error('Ошибка при голосовании')
        } finally {
            setIsProcessing(false)
        }
    }

    const headerTitle = useMemo(() => {
        if (!showHeader) return ''
        return (
            <Link className='flex gap-2 text-blue-300 font-bold' to={`../scammers/${form.scammer.username ? (form.scammer.username).replace('@', '') : form.scammer.telegramId}/${form.id}`}>
                Жалоба на {form.scammer.username ? `@${form.scammer.username.replace('@', '')}` : form.scammer.telegramId || 'Неизвестный пользователь'}

                <div className="flex items-center gap-2 mt-1">
                    {form.scammer.marked ? (
                        <div className="flex items-center gap-1 text-green-500 text-xs">
                            <span>Отмечена</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 text-gray-500 text-xs">
                            <span>Не отмечена</span>
                        </div>
                    )}
                </div>
            </Link>
        )
    }, [showHeader, form.scammer?.username, form?.scammer.telegramId])

    const description = useMemo(() => {
        return form.description.length > 150
            ? `${form.description.substring(0, 100)}...`
            : form.description
    }, [form.description])

    const createdAt = useMemo(() => {
        return new Date(form.createdAt).toLocaleDateString('ru-RU')
    }, [form.createdAt])

    const mediaInfo = useMemo(() => {
        if (form.media.length === 0) return null

        const hasPhotos = form.media.some(m => m.type === 'photo')
        const hasVideos = form.media.some(m => m.type === 'video')

        return (
            <div className="flex items-center gap-1 text-nowrap">
                {hasPhotos && <Image className="w-3 h-3" />}
                {hasVideos && <Video className="w-3 h-3" />}
                <span>{form.media.length} медиа</span>
            </div>
        )
    }, [form.media])

    return (
        <Block className={!showHeader ? 'gap-0' : '!p-0.5'} icons={!showHeader ? [] : [<User className="w-4 h-4 text-red-500"  />]} title={headerTitle}>
            <div className="flex absolute right-2 flex-col items-center gap-0 text-xs text-gray-400 flex-nowrap">
                <span>{createdAt}</span>
                {mediaInfo}
            </div>

            <p className="text-gray-300 text-sm max-h-min break-all">
                {description}
            </p>

            <div className="flex flex-row gap-2 justify-between">
                <div className="flex justify-between w-full gap-1">
                    <div className="flex flex-row">
                        <button
                            onClick={() => handleVote(voteType.Like)}
                            disabled={isProcessing}
                            className={`flex items-center gap-1 transition-colors p-1 rounded ${userVote === 'like'
                                ? 'text-green-300 bg-green-900/20'
                                : 'text-green-400 hover:text-green-300'
                                }`}
                        >
                            <ThumbsUp className="w-6 h-6" />
                            <span className="text-xs">{currentForm.likes}</span>
                        </button>
                        <button
                            onClick={() => handleVote(voteType.Dislike)}
                            disabled={isProcessing}
                            className={`flex items-center gap-1 transition-colors p-1 rounded ${userVote === 'dislike'
                                ? 'text-red-300 bg-red-900/20'
                                : 'text-red-400 hover:text-red-300'
                                }`}
                        >
                            <ThumbsDown className="w-6 h-6" />
                            <span className="text-xs">{currentForm.dislikes}</span>
                        </button>
                    </div>
                </div>
                <Button
                    text=" "
                    icon={<Eye className="w-4 h-4" />}
                    FC={handleViewForm}
                    color="blue"
                    className="!p-2.5"
                    widthMin
                />
            </div>
        </Block>
    );
}); 