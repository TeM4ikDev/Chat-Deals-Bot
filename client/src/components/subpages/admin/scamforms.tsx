import { Pagination as ListPagination } from "@/components/ui/Pagination"
import { AdminService } from "@/services/admin.service"
import { useStore } from "@/store/root.store"
import { IPagination } from "@/types"
import { onRequest } from "@/utils/handleReq"
import { AlertTriangle, Eye, Image, User, Video } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "react-toastify"
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import { Navigation, Pagination } from 'swiper/modules'
import { Swiper as SwiperReact, SwiperSlide } from 'swiper/react'
import { PageContainer } from "../../layout/PageContainer"
import { Block } from "../../ui/Block"
import { Button } from "../../ui/Button"
import { Modal } from "../../ui/Modal"

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

export const ScamForms: React.FC = () => {
    const { userStore: { user } } = useStore()
    const [scamForms, setScamForms] = useState<IScamForm[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [selectedForm, setSelectedForm] = useState<IScamForm | null>(null)
    const [showModal, setShowModal] = useState(false)


    const [pagination, setPagination] = useState<IPagination>({
        totalCount: 0,
        maxPage: 1,
        currentPage: 1,
        limit: 10
    })
    const [search, setSearch] = useState("");


    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.maxPage) {
            setPagination(prev => ({ ...prev, currentPage: newPage }))
        }
    }

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value)
        setPagination(prev => ({ ...prev, currentPage: 1 }))
    }


    const getScamForms = async (page: number, searchValue = search) => {
        setIsLoading(true)
        const data = await onRequest(AdminService.getAllScamForms({ page, limit: pagination.limit, search: searchValue }))
        console.log(data)
        if (data) {

            setScamForms(data.scamForms)
            setPagination(data.pagination)
        }
        setIsLoading(false)
    }

    const handleViewForm = (form: IScamForm) => {
        setSelectedForm(form)
        setShowModal(true)
    }

    const handleDeleteForm = async (formId: string) => {
        if (window.confirm('Вы уверены, что хотите удалить эту жалобу?')) {
            // Здесь можно добавить вызов API для удаления
            setScamForms(prev => prev.filter(form => form.id !== formId))
            toast.success('Жалоба удалена')
        }
    }
    useEffect(() => {
        getScamForms(pagination.currentPage, search)
    }, [pagination.currentPage, search])

    return (
        <PageContainer title="Жалобы" className="gap-2" loading={isLoading} itemsStart returnPage>



            {scamForms.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <AlertTriangle className="w-16 h-16 mb-4 opacity-50" />
                    <p className="text-lg font-medium">Жалобы не найдены</p>
                    <p className="text-sm">Пока нет активных жалоб от пользователей</p>
                </div>
            ) : (
                <div className="grid w-full gap-4 max-w-2xl">

                    <ListPagination
                        currentPage={pagination.currentPage}
                        maxPage={pagination.maxPage}
                        onPageChange={handlePageChange}
                    />


                    {scamForms.map((form) => (

                        <Block key={form.id} icons={[<User />]} title={`Жалоба на ${form.scammerUsername ? `@${form.scammerUsername.replace('@', '')}` : form.scammerTelegramId || 'Неизвестный пользователь'}`}>
                            <div className="flex flex-row">
                                <div className="flex flex-col flex-1">

                                    <p className="text-gray-300 text-sm mb-2">
                                        {form.description.length > 150
                                            ? `${form.description.substring(0, 100)}...`
                                            : form.description
                                        }
                                    </p>
                                    <div className="flex items-center gap-4 text-xs text-gray-400">
                                        <span>Создано: {new Date(form.createdAt).toLocaleDateString('ru-RU')}</span>
                                        {form.media.length > 0 && (
                                            <div className="flex items-center gap-1">
                                                {form.media.some(m => m.type === 'photo') && <Image className="w-3 h-3" />}
                                                {form.media.some(m => m.type === 'video') && <Video className="w-3 h-3" />}
                                                <span>{form.media.length} медиа</span>
                                            </div>
                                        )}
                                    </div>


                                </div>

                                <div className="flex gap-2 ml-4">
                                    <Button
                                        text="Просмотр"
                                        icon={<Eye className="w-4 h-4" />}
                                        FC={() => handleViewForm(form)}
                                        color="blue"
                                        widthMin
                                    />
                                    {/* <Button
                                        text="Удалить"
                                        icon={<Trash2 className="w-4 h-4" />}
                                        FC={() => handleDeleteForm(form.id)}
                                        color="red"
                                        widthMin
                                    /> */}
                                </div>

                            </div>
                        </Block>


                    ))}
                </div>
            )}


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

                                                    <div className="flex justify-center relative py-5">
                                                        {media.type === 'photo' ? (
                                                            <img
                                                                src={`http://localhost:8080/api/scamform/file/${media.fileId}`}
                                                                alt={`Фото ${index + 1} из жалобы`}

                                                            />
                                                        ) : (
                                                            <video
                                                                src={`http://localhost:8080/api/scamform/file/${media.fileId}`}
                                                                controls
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
        </PageContainer >
    )
}
