import { UserService } from "@/services/user.service"
import { Image, Video, X } from "lucide-react"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Link } from "react-router-dom"
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import { Navigation, Pagination } from 'swiper/modules'
import { Swiper as SwiperReact, SwiperSlide } from 'swiper/react'
import { Block } from "../ui/Block"
import { Modal } from "../ui/Modal"

interface IMedia {
    id: string
    fileId: string
    type: 'photo' | 'video'
    fileUrl?: string
}

interface IScamForm {
    id: string
    description: string
    media: IMedia[]
    scammerUsername?: string
    scammerTelegramId?: string
    createdAt: string
    status: 'pending' | 'reviewed' | 'resolved'
}

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

    const handleMediaClick = (media: IMedia) => {
        setFullscreenMedia(media)
    }

    const closeFullscreen = () => {
        setFullscreenMedia(null)
    }

    useEffect(() => {
        if (selectedForm && showModal) {
            const loadMediaUrls = async () => {
                const urls: Record<string, string> = {}
                
                for (const media of selectedForm.media) {
                    try {
                        const response = await UserService.getMediaData(media.fileId)
                        if (response.data) {
                            urls[media.fileId] = response.data.url || response.data
                        }
                    } catch (error) {
                        console.error(`Ошибка загрузки медиа ${media.fileId}:`, error)
                    }
                }
                
                setMediaUrls(urls)
            }
            
            loadMediaUrls()
        }
    }, [selectedForm, showModal])

    const getMediaUrl = (fileId: string) => {
        return mediaUrls[fileId] || `http://localhost:8080/api/scamform/file/${fileId}`
    }

    return (
        <>
            <Modal
                title={
                    selectedForm?.scammerUsername ? (
                        <Link className="text-blue-500" to={`https://t.me/${selectedForm.scammerUsername.replace('@', '')}`}>
                            Жалоба на @{selectedForm.scammerUsername.replace('@', '')}
                        </Link>
                    ) : (
                        <span className="text-white">
                            Жалоба на {selectedForm?.scammerTelegramId || 'Неизвестный пользователь'}
                        </span>
                    )
                }
                isOpen={showModal}
                setIsOpen={setShowModal}
            >
                {selectedForm && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                            <span>Создано: {new Date(selectedForm.createdAt).toLocaleString('ru-RU')}</span>
                        </div>

                        <Block>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-400">Username:</span>
                                    <span className="text-white font-medium">
                                        {selectedForm.scammerUsername ? `@${selectedForm.scammerUsername.replace('@', '')}` : 'Не указан'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-400">Telegram ID:</span>
                                    <span className="text-white font-medium">
                                        {selectedForm.scammerTelegramId || 'Не указан'}
                                    </span>
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
                                        breakpoints={{
                                            640: { slidesPerView: 1 },
                                            768: { slidesPerView: 2 },
                                            1024: { slidesPerView: 3 },
                                        }}
                                        navigation={true}
                                        pagination={{
                                            type: 'progressbar',
                                            clickable: true,
                                            dynamicBullets: true,
                                        }}
                                        modules={[Navigation, Pagination]}
                                        className="w-full"
                                    >
                                        {selectedForm.media.map((media, index) => (
                                            <SwiperSlide key={media.id}>
                                                <Block>
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
                                                        className="flex justify-center relative py-5 cursor-pointer hover:opacity-80 transition-opacity"
                                                        onClick={() => handleMediaClick(media)}
                                                    >
                                                        {media.type === 'photo' ? (
                                                            <img
                                                                src={getMediaUrl(media.fileId)}
                                                                alt={`Фото ${index + 1} из жалобы`}
                                                                className="max-w-full max-h-64 object-contain"
                                                            />
                                                        ) : (
                                                            <video
                                                                src={getMediaUrl(media.fileId)}
                                                                controls
                                                                className="max-w-full max-h-64"
                                                            />
                                                        )}
                                                    </div>
                                                </Block>
                                            </SwiperSlide>
                                        ))}
                                    </SwiperReact>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {fullscreenMedia && createPortal(
                <div 
                    className="fixed inset-0 bg-black bg-opacity-90 z-[9999] flex items-center justify-center p-4"
                    onClick={closeFullscreen}
                >
                    <div className="relative max-w-full max-h-full">
                        <button
                            onClick={closeFullscreen}
                            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10 bg-black bg-opacity-50 rounded-full p-2"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        
                        {fullscreenMedia.type === 'photo' ? (
                            <img
                                src={getMediaUrl(fullscreenMedia.fileId)}
                                alt="Полноэкранное изображение"
                                className="max-w-full max-h-full object-contain"
                                onClick={(e) => e.stopPropagation()}
                            />
                        ) : (
                            <video
                                src={getMediaUrl(fullscreenMedia.fileId)}
                                controls
                                className="max-w-full max-h-full"
                                onClick={(e) => e.stopPropagation()}
                            />
                        )}
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}; 