import { ScamformsService } from "@/services/scamforms.service"
import { UserService } from "@/services/user.service"
import { useStore } from "@/store/root.store"
import { IMedia, IScamForm, IVoteResponse, ScammerStatus, voteType } from "@/types"
import { UserRoles } from "@/types/auth"
import { onRequest } from "@/utils/handleReq"
import { AlertTriangle, Image, Shield, ThumbsDown, ThumbsUp, Video, X, XCircle } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { Link } from "react-router-dom"
import { toast } from "react-toastify"
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import { Navigation, Pagination } from 'swiper/modules'
import { Swiper as SwiperReact, SwiperSlide } from 'swiper/react'
import { Block } from "../ui/Block"
import { Button } from "../ui/Button"
import { Modal } from "../ui/Modal"

interface ScamFormModalProps {
    selectedForm: IScamForm | null
    showModal: boolean
    setShowModal: (show: boolean) => void
}

export const ScamFormModal: React.FC<ScamFormModalProps> = ({
    selectedForm,
    showModal,
    setShowModal
}) => {
    const [fullscreenMedia, setFullscreenMedia] = useState<IMedia | null>(null)
    const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({})
    const [loadingMedia, setLoadingMedia] = useState<Record<string, boolean>>({})
    const [mediaErrors, setMediaErrors] = useState<Record<string, string>>({})
    const [userVote, setUserVote] = useState<'like' | 'dislike' | null>(null)
    const [localLikes, setLocalLikes] = useState(selectedForm?.likes || 0)
    const [localDislikes, setLocalDislikes] = useState(selectedForm?.dislikes || 0)
    const [isProcessing, setIsProcessing] = useState(false)

    const { userStore: { userRole } } = useStore()

    const handleMediaClick = useCallback((media: IMedia) => {
        setFullscreenMedia(media)
    }, [])

    const closeFullscreen = useCallback(() => {
        setFullscreenMedia(null)
    }, [])

    const handleVote = async (voteT: voteType) => {
        if (!selectedForm) return
        const data: IVoteResponse = await onRequest(ScamformsService.userVote(selectedForm.id, voteT))
        if (data) {
            if (data.isSuccess) {
                setLocalLikes(data.likes)
                setLocalDislikes(data.dislikes)
                setUserVote(data.userVote === 'LIKE' ? 'like' : data.userVote === 'DISLIKE' ? 'dislike' : null)
                toast.success(data.message)
            }
            else {
                toast.error(data.message)
            }
        }
    }

   
    const getMediaUrl = useCallback((fileId: string) => {
        return mediaUrls[fileId] || ''
    }, [mediaUrls])

    const isMediaLoading = useCallback((fileId: string) => {
        return loadingMedia[fileId] || false
    }, [loadingMedia])

    const getMediaError = useCallback((fileId: string) => {
        return mediaErrors[fileId] || ''
    }, [mediaErrors])

    const modalTitle = useMemo(() => {
        if (!selectedForm) return ''

        if (selectedForm.scammer.username) {
            return (
                <Link className="text-blue-500" to={`https://t.me/${selectedForm.scammer.username.replace('@', '')}`}>
                    Жалоба на @{selectedForm.scammer.username.replace('@', '')}
                </Link>
            )
        } else {
            return (
                <span className="text-white">
                    Жалоба на {selectedForm.scammer.telegramId || 'Неизвестный пользователь'}
                </span>
            )
        }
    }, [selectedForm?.scammer.telegramId, selectedForm?.scammer.username])

    const createdAt = useMemo(() => {
        if (!selectedForm) return ''
        return new Date(selectedForm.createdAt).toLocaleString('ru-RU')
    }, [selectedForm?.createdAt])

    useEffect(() => {
        if (selectedForm) {
            setLocalLikes(selectedForm.likes);
            setLocalDislikes(selectedForm.dislikes);
            setUserVote(null);
        }
    }, [selectedForm]);

    useEffect(() => {
        if (selectedForm && showModal) {
            const loadMediaUrls = async () => {
                const urls: Record<string, string> = {}
                const loading: Record<string, boolean> = {}
                const errors: Record<string, string> = {}

                selectedForm.media.forEach(media => {
                    loading[media.fileId] = true
                })
                setLoadingMedia(loading)

                for (const media of selectedForm.media) {
                    try {
                        const blob = await UserService.getMediaData(media.fileId)
                        const url = URL.createObjectURL(blob)
                        urls[media.fileId] = url
                        loading[media.fileId] = false
                    } catch (error) {
                        console.error(`Ошибка загрузки медиа ${media.fileId}:`, error)
                        errors[media.fileId] = 'Ошибка загрузки файла'
                        loading[media.fileId] = false
                    }
                }

                setMediaUrls(urls)
                setLoadingMedia(loading)
                setMediaErrors(errors)
            }

            loadMediaUrls()
        }

        return () => {
            Object.values(mediaUrls).forEach(url => {
                URL.revokeObjectURL(url)
            })
        }
    }, [selectedForm?.id, showModal])

    const mediaSlides = useMemo(() => {
        if (!selectedForm) return []

        return selectedForm.media.map((media, index) => (
            <SwiperSlide key={media.id} className="h-full">
                <Block className="h-full flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            {media.type === 'photo' ? (
                                <Image className="w-4 h-4 text-blue-400" />
                            ) : (
                                <Video className="w-4 h-4 text-red-400" />
                            )}
                            <span className="text-sm text-gray-300">
                                {media.type === 'photo' ? 'Фото' : 'Видео'}
                            </span>
                        </div>
                    </div>

                    <div
                        className="flex justify-center items-center relative py-5 cursor-pointer hover:opacity-80 transition-opacity flex-1"
                        onClick={() => handleMediaClick(media)}
                    >
                        {isMediaLoading(media.fileId) ? (
                            <div className="flex items-center justify-center h-64">
                                <span className="ml-2 text-gray-400">Загрузка...</span>
                            </div>
                        ) : getMediaError(media.fileId) ? (
                            <div className="flex items-center justify-center h-64 text-red-400">
                                <span>{getMediaError(media.fileId)}</span>
                            </div>
                        ) : (
                            <>
                                {media.type === 'photo' ? (
                                    <img
                                        src={getMediaUrl(media.fileId)}
                                        alt={`Фото ${index + 1} из жалобы`}
                                        className="max-w-full max-h-64 object-contain"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = 'none';
                                            setMediaErrors(prev => ({
                                                ...prev,
                                                [media.fileId]: 'Ошибка загрузки изображения'
                                            }));
                                        }}
                                    />
                                ) : (
                                    <video
                                        src={getMediaUrl(media.fileId)}
                                        controls
                                        className="max-w-full max-h-64"
                                        onError={() => {
                                            setMediaErrors(prev => ({
                                                ...prev,
                                                [media.fileId]: 'Ошибка загрузки видео'
                                            }));
                                        }}
                                    />
                                )}
                            </>
                        )}
                    </div>
                </Block>
            </SwiperSlide>
        ))
    }, [selectedForm?.media, mediaUrls, loadingMedia, mediaErrors, handleMediaClick, isMediaLoading, getMediaError, getMediaUrl])

    return (
        <>
            <Modal
                title={modalTitle}
                isOpen={showModal}
                setIsOpen={setShowModal}
            >
                {selectedForm && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                            <span>Создано: {createdAt}</span>
                        </div>

                        <Block>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-400">Username:</span>
                                    <span className="text-white font-medium">
                                        {selectedForm.scammer.username ? `@${selectedForm.scammer.username.replace('@', '')}` : 'Не указан'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-400">Telegram ID:</span>
                                    <span className="text-white font-medium">
                                        {selectedForm.scammer.telegramId || 'Не указан'}
                                    </span>
                                </div>
                            </div>
                        </Block>

                        <Block>
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium text-gray-400">Статистика:</h4>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => handleVote(voteType.Like)}
                                        className={`flex items-center gap-2 transition-colors p-0 rounded ${userVote === 'like'
                                            ? 'text-green-300 bg-green-900/20'
                                            : 'text-green-400 hover:text-green-300'
                                            }`}
                                    >
                                        <ThumbsUp className="w-5 h-5" />
                                        <span className="text-white">{localLikes} согласны</span>
                                    </button>
                                    <button
                                        onClick={() => handleVote(voteType.Dislike)}
                                        className={`flex items-center gap-2 transition-colors p-0 rounded ${userVote === 'dislike'
                                            ? 'text-red-300 bg-red-900/20'
                                            : 'text-red-400 hover:text-red-300'
                                            }`}
                                    >
                                        <ThumbsDown className="w-5 h-5" />
                                        <span className="text-white">{localDislikes} не согласны</span>
                                    </button>
                                </div>
                            </div>
                        </Block>

                        <Block>
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium text-gray-400">Описание жалобы:</h4>
                                <p className="text-white leading-relaxed">{selectedForm.description}</p>
                            </div>
                        </Block>

                        {selectedForm.media.length > 0 && (
                            <div>
                                <h4 className="text-lg font-semibold text-white mb-2">Медиа файлы ({selectedForm.media.length}):</h4>
                                <div className="relative">
                                    <SwiperReact
                                        spaceBetween={16}
                                        slidesPerView={1}
                                        navigation={true}
                                        pagination={{
                                            type: 'progressbar',
                                            clickable: true,
                                            dynamicBullets: true,
                                        }}
                                        modules={[Navigation, Pagination]}
                                        className="w-full h-80"
                                        style={{ minHeight: '320px' }}
                                    >
                                        {mediaSlides}
                                    </SwiperReact>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {fullscreenMedia && createPortal(
                <div
                    className="fixed inset-0 bg-black bg-opacity-90 z-[9999] flex items-center justify-center p-1"
                    onClick={closeFullscreen}
                >
                    <div className="relative w-full h-full flex items-center justify-center">
                        <button
                            onClick={closeFullscreen}
                            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10 bg-black bg-opacity-50 rounded-full p-2"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        {isMediaLoading(fullscreenMedia.fileId) ? (
                            <div className="flex items-center justify-center h-full">
                                <span className="ml-3 text-white text-lg">Загрузка...</span>
                            </div>
                        ) : getMediaError(fullscreenMedia.fileId) ? (
                            <div className="flex items-center justify-center h-full text-red-400 text-lg">
                                <span>{getMediaError(fullscreenMedia.fileId)}</span>
                            </div>
                        ) : (
                            <>
                                {fullscreenMedia.type === 'photo' ? (
                                    <div className="w-full h-full overflow-auto flex items-center justify-center">
                                        <img
                                            src={getMediaUrl(fullscreenMedia.fileId)}
                                            alt="Полноэкранное изображение"
                                            className="max-w-full max-h-full object-contain"
                                            onClick={(e) => e.stopPropagation()}
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.style.display = 'none';
                                                setMediaErrors(prev => ({
                                                    ...prev,
                                                    [fullscreenMedia.fileId]: 'Ошибка загрузки изображения'
                                                }));
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <div className="w-full h-full overflow-auto flex items-center justify-center">
                                        <video
                                            src={getMediaUrl(fullscreenMedia.fileId)}
                                            controls
                                            className="max-w-full max-h-full"
                                            onClick={(e) => e.stopPropagation()}
                                            onError={() => {
                                                setMediaErrors(prev => ({
                                                    ...prev,
                                                    [fullscreenMedia.fileId]: 'Ошибка загрузки видео'
                                                }));
                                            }}
                                        />
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}; 