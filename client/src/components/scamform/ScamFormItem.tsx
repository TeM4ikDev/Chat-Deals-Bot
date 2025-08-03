import { Eye, Image, ThumbsDown, ThumbsUp, User, Video } from "lucide-react"
import { memo, useCallback, useMemo, useState } from "react"
import { Block } from "../ui/Block"
import { Button } from "../ui/Button"
import { IScamForm, voteType } from "@/types"
import { onRequest } from "@/utils/handleReq"
import { UserService } from "@/services/user.service"
import { ScamformsService } from "@/services/scamforms.service"
import { toast } from "react-toastify"

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
    const [userVote, setUserVote] = useState<'like' | 'dislike' | null>(null)
    const [localLikes, setLocalLikes] = useState(form.likes || 0)
    const [localDislikes, setLocalDislikes] = useState(form.dislikes || 0)

    const handleViewForm = useCallback(() => {
        onViewForm(form)
    }, [onViewForm, form])


    const handleVote = async (voteT: voteType) => {
        const data: { message: string, isSuccess: boolean, likes: number, dislikes: number, } = await onRequest(ScamformsService.userVote(form.id, voteT))
        if (data) {
            if (data.isSuccess) {
                voteT == voteType.Like ? setLocalLikes(prev => prev + 1) : setLocalDislikes(prev => prev + 1)
                toast.success(data.message)
            }
            else {
                toast.error(data.message)
            }
        }
    }

    const headerTitle = useMemo(() => {
        if (!showHeader) return ''
        // return ''
        return `Жалоба на ${form.scammer.username ? `@${form.scammer.username.replace('@', '')}` : form.scammer.telegramId || 'Неизвестный пользователь'}`
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
        <Block className={!showHeader ? 'gap-0' : ''} icons={!showHeader ? [] : [<User />]} title={headerTitle}>
            <div className="flex absolute right-2 flex-col items-center gap-0 text-xs text-gray-400 flex-nowrap">
                <span>{createdAt}</span>
                {mediaInfo}
            </div>

            <p className="text-gray-300 text-sm max-h-min mb-2 break-all">
                {description}
            </p>

            <div className="flex flex-row gap-2 justify-between">
                <div className="flex justify-between w-full gap-1">
                    <div className="flex flex-row">
                        <button
                            onClick={() => handleVote(voteType.Like)}
                            className={`flex items-center gap-1 transition-colors p-1 rounded ${userVote === 'like'
                                ? 'text-green-300 bg-green-900/20'
                                : 'text-green-400 hover:text-green-300'
                                }`}
                        >
                            <ThumbsUp className="w-6 h-6" />
                            <span className="text-xs">{localLikes}</span>
                        </button>
                        <button
                            onClick={() => handleVote(voteType.Dislike)}
                            className={`flex items-center gap-1 transition-colors p-1 rounded ${userVote === 'dislike'
                                ? 'text-red-300 bg-red-900/20'
                                : 'text-red-400 hover:text-red-300'
                                }`}
                        >
                            <ThumbsDown className="w-6 h-6" />
                            <span className="text-xs">{localDislikes}</span>
                        </button>

                    </div>
                </div>
                <Button
                    text=" "
                    icon={<Eye className="w-4 h-4" />}
                    FC={handleViewForm}
                    color="blue"
                    className="!p-3"
                    widthMin
                />
            </div>

        </Block>
    );
}); 