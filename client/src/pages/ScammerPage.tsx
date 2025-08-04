import { PageContainer } from "@/components/layout/PageContainer"
import { ScammerList } from "@/components/scammer/ScammerList"
import { Block } from "@/components/ui/Block"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Pagination } from "@/components/ui/Pagination"
import { ScamformsService } from "@/services/scamforms.service"
import { useStore } from "@/store/root.store"
import { IPagination, IScammer, ScammerStatus } from "@/types"
import { UserRoles } from "@/types/auth"
import { onRequest } from "@/utils/handleReq"
import { Filter } from "lucide-react"
import { observer } from "mobx-react-lite"
import { useEffect, useState } from "react"
import { toast } from "react-toastify"

const ScammerPage: React.FC = observer(() => {
    const { userStore: { user, userRole } } = useStore()

    const [scammers, setScammers] = useState<IScammer[]>([])
    const [search, setSearch] = useState<string>("")
    const [isProcessing, setIsProcessing] = useState(false)
    const [pagination, setPagination] = useState<IPagination>({
        totalCount: 0,
        maxPage: 1,
        currentPage: 1,
        limit: 10
    })

    const [showNotMarked, setShowNotMarked] = useState(false)

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.maxPage) {
            setPagination(prev => ({ ...prev, currentPage: newPage }))
        }
    }

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearch(value)
        setPagination(prev => ({ ...prev, currentPage: 1 }))
    }

    const getScammers = async (page: number, searchValue = search) => {
        const data = await onRequest(ScamformsService.getScammers({
            page,
            limit: pagination.limit,
            search: searchValue
        }))

        console.log(data)

        if (data) {
            setScammers(data.scammers || [])
            setPagination(data.pagination || pagination)
        }
    }

    // Универсальный метод для обновления статуса скамера
    const handleUpdateScammerStatus = async (scammerId: string, status: ScammerStatus) => {
        if (isProcessing) return
        setIsProcessing(true)

        try {
            const data = await onRequest(ScamformsService.confirmScammerStatus(scammerId, status))

            console.log(data)
            if (data?.isSuccess && data.scammer) {
                const statusMessages = {
                    [ScammerStatus.SCAMMER]: 'Пользователь занесен как скамер',
                    [ScammerStatus.SUSPICIOUS]: 'Пользователь занесен как подозрительный',
                    [ScammerStatus.UNKNOWN]: 'В занесении отказано, аккаунт остается в неизвестных'
                }
                toast.success(statusMessages[status])

                // Обновляем состояние локально через ответ сервера
                setScammers(prevScammers =>
                    prevScammers.map(scammer =>
                        scammer.id === scammerId
                            ? { ...scammer, ...data.scammer }
                            : scammer
                    )
                )
            } else {
                toast.error(data?.message || 'Ошибка при обновлении статуса')
            }
        } catch (error) {
            toast.error('Ошибка при обновлении статуса')
        } finally {
            setIsProcessing(false)
        }
    }

    useEffect(() => {
        getScammers(pagination.currentPage, search)
    }, [pagination.currentPage, search])

    const isAdmin = userRole === UserRoles.Admin || userRole === UserRoles.SuperAdmin

    return (
        <PageContainer title="База данных" className="gap-2 max-w-2xl mx-auto" needAuth itemsStart>
            <Input
                placeholder="Поиск по username или telegram id"
                name="search"
                value={search}
                onChange={handleSearchChange}
            />

            <Pagination
                currentPage={pagination.currentPage}
                maxPage={pagination.maxPage}
                onPageChange={handlePageChange}
            />

            <Block>
                <div className="flex justify-between items-center">
                    <Button
                        widthMin
                        text={showNotMarked ? "Только не отмеченные" : "Показать всех"}
                        FC={() => setShowNotMarked(prev => !prev)}
                        color="transparent"
                        icon={[<Filter className="w-4 h-4" />]}
                        className="text-sm"
                    />
                </div>
            </Block>

            <ScammerList
                scammers={scammers}
                onConfirmAsScammer={isAdmin ? (scammerId) => handleUpdateScammerStatus(scammerId, ScammerStatus.SCAMMER) : undefined}
                onConfirmAsSuspicious={isAdmin ? (scammerId) => handleUpdateScammerStatus(scammerId, ScammerStatus.SUSPICIOUS) : undefined}
                onRejectConfirmation={isAdmin ? (scammerId) => handleUpdateScammerStatus(scammerId, ScammerStatus.UNKNOWN) : undefined}
                isProcessing={isProcessing}
                showConfirmButtons={isAdmin}
            />
        </PageContainer>
    )
})

export default ScammerPage
