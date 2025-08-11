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
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "react-toastify"

const ScammerPage: React.FC = observer(() => {
    const navigate = useNavigate();
    const { userStore: { userRole } } = useStore();
    const routeParams = useParams<{ id?: string; formId?: string }>();
    const { id: idParam, formId: formIdParam } = routeParams
    const [showMarked, setShowMarked] = useState(true)

    const [scammers, setScammers] = useState<IScammer[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [pagination, setPagination] = useState<IPagination>({
        totalCount: 0,
        maxPage: 1,
        currentPage: 1,
        limit: 10,
    });

    const isAdmin = userRole === UserRoles.Admin || userRole === UserRoles.SuperAdmin



    const rawParam = typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.start_param;
    let initialSearch = idParam || ''
    let initialFormId = formIdParam || ''

    if (rawParam) {
        try {
            const decodedParam = atob(rawParam);
            const { id, formId } = JSON.parse(decodedParam);

            initialSearch = id ? id : '';
            initialFormId = formId ? formId : '';

            if (window.Telegram?.WebApp?.initDataUnsafe) {
                window.Telegram.WebApp.initDataUnsafe.start_param = '';
            }
        } catch (error) {
            console.error('Ошибка при парсинге start_param:', error);
            // Очищаем невалидный параметр
            if (window.Telegram?.WebApp?.initDataUnsafe) {
                window.Telegram.WebApp.initDataUnsafe.start_param = '';
            }
        }
    }

    const [search, setSearch] = useState<string>(initialSearch);
    const [formId, setFormId] = useState<string>(initialFormId);

    useEffect(() => {
        if (initialSearch && !search) {
            setSearch(initialSearch);
        }

        try {
            if (window.Telegram?.WebApp?.initDataUnsafe?.start_param) {
                window.Telegram.WebApp.initDataUnsafe.start_param = '';
            }
        } catch (error) {
            console.error('Ошибка при очистке start_param:', error);
        }
    }, []);

    useEffect(() => {
        getScammers(pagination.currentPage, search, showMarked);
    }, [pagination.currentPage, search, showMarked])

    useEffect(() => {
        if (idParam || formIdParam) {
            navigate('/scammers', { replace: true });
        }

        try {
            if (window.Telegram?.WebApp?.initDataUnsafe?.start_param) {
                window.Telegram.WebApp.initDataUnsafe.start_param = '';
            }
        } catch (error) {
            console.error('Ошибка при очистке start_param:', error);
        }
    }, []);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.maxPage) {
            setPagination(prev => ({ ...prev, currentPage: newPage }))
        }
    }

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearch(value);
        setPagination(prev => ({ ...prev, currentPage: 1 }));
    }

    const getScammers = async (page: number, searchValue = search, showMarked: boolean) => {
        const data = await onRequest(ScamformsService.getScammers({
            page,
            limit: pagination.limit,
            search: searchValue,
            showMarked,
        }))

        console.log(data)

        if (data) {
            setScammers(data.scammers || [])
            setPagination(data.pagination || pagination)
        }
    }


    const handleUpdateScammerStatus = async (scammerId: string, status: ScammerStatus) => {
        if (isProcessing) return
        setIsProcessing(true)

        const data = await onRequest(ScamformsService.confirmScammerStatus(scammerId, status, formId))

        console.log(data)
        if (data?.isSuccess && data.scammer) {
            const statusMessages = {
                [ScammerStatus.SCAMMER]: 'Пользователь занесен как скамер',
                [ScammerStatus.SUSPICIOUS]: 'Пользователь занесен как подозрительный',
                [ScammerStatus.UNKNOWN]: 'В занесении отказано, аккаунт остается в неизвестных'
            }
            toast.success(statusMessages[status])

            setScammers(prevScammers =>
                prevScammers.map(scammer =>
                    scammer.id === scammerId
                        ? { ...scammer, ...data.scammer }
                        : scammer
                )
            )
        }

        setIsProcessing(false)
    }


    return (
        <PageContainer title="База данных" className="gap-2 max-w-2xl mx-auto" needAuth returnPage itemsStart>
            <Input
                placeholder="Поиск по username или telegram id"
                name="search"
                value={search}
                onChange={handleSearchChange}
                onClear={() => {
                    setSearch('');
                    setPagination(prev => ({ ...prev, currentPage: 1 }));
                }}
                showClearButton={true}
            />

            <Pagination
                currentPage={pagination.currentPage}
                maxPage={pagination.maxPage}
                onPageChange={handlePageChange}
            />

            <Block className="flex justify-between items-center">
                <Button
                    widthMin
                    text={!showMarked ? "Только не отмеченные" : "Показаны все"}
                    FC={() => setShowMarked(prev => !prev)}
                    color="transparent"
                    icon={[<Filter className="w-4 h-4" />]}
                    className="text-sm"
                />
            </Block>

            {/* <Block title='Статистика' icons={[<Users/>]}>
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
            </Block> */}

            <ScammerList
                scammers={scammers}
                onUpdateScammerStatus={handleUpdateScammerStatus}

                isProcessing={isProcessing}
                showConfirmButtons={isAdmin}
            />
        </PageContainer>
    )
})

export default ScammerPage
