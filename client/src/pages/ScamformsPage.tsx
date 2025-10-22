import { ScamFormList, ScamFormModal } from "@/components/scamform"
import { Block } from "@/components/ui/Block"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Pagination as ListPagination } from "@/components/ui/Pagination"
import { ScamformsService } from "@/services/scamforms.service"
import { useStore } from "@/store/root.store"
import { IPagination, IScamForm } from "@/types"
import { onRequest } from "@/utils/handleReq"
import { Filter } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "react-toastify"
import { PageContainer } from "../components/layout/PageContainer"


const savePaginationToLocalStorage = (pagination: IPagination) => {
    localStorage.setItem('scamformsPagination', JSON.stringify(pagination))
}

const getPaginationFromLocalStorage = () => {
    const pagination = localStorage.getItem('scamformsPagination')
    return pagination ? JSON.parse(pagination) : {
        totalCount: 0,
        maxPage: 1,
        currentPage: 1,
        limit: 10
    }
}

export const ScamForms: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>()
    const { scamformsStore: { forms, setForms } } = useStore()

    const [isLoading, setIsLoading] = useState(false)
    const [selectedForm, setSelectedForm] = useState<IScamForm | null>(null)
    const [showModal, setShowModal] = useState(false)

    const [pagination, setPagination] = useState<IPagination>(getPaginationFromLocalStorage())
    const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
    const initialSearch = id || startParam || "";
    const [search, setSearch] = useState<string>(initialSearch);

    const [showMarked, setShowMarked] = useState(true)


   

    const debouncedSearch = useCallback(
        (() => {
            let timeoutId: NodeJS.Timeout;
            return (searchValue: string) => {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    getScamForms(pagination.currentPage, searchValue, showMarked);
                }, 300);
            };
        })(),
        [pagination.currentPage]
    );

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.maxPage) {
            setPagination(prev => ({ ...prev, currentPage: newPage }))
        }
    }

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearch(value)
        setPagination(prev => ({ ...prev, currentPage: 1 }))
        debouncedSearch(value);
    }

    const getScamForms = async (page: number, searchValue = search, showMarked: boolean) => {
        setIsLoading(true)
        const data = await onRequest(ScamformsService.getAllScamForms({ page, limit: pagination.limit, search: searchValue, showMarked }))
        console.log(data)
        if (data) {
            setForms(data.scamForms)
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
            const updatedForms = forms.filter(form => form.id !== formId)
            setForms(updatedForms)
            toast.success('Жалоба удалена')
        }
    }

    useEffect(() => {
        if (!id && startParam && !search) {
            setSearch(startParam);
            console.log('save pagination')
            getScamForms(pagination.currentPage, startParam, showMarked);
        } else {
            savePaginationToLocalStorage(pagination)
            console.log('save pagination')

            getScamForms(pagination.currentPage, search, showMarked)
        }
    }, [pagination.currentPage, showMarked])


    useEffect(() => {
        if (id) {
            navigate('/scamforms', { replace: true });
        }
    }, []);

    return (
        <PageContainer title="Жалобы" className="gap-2 max-w-2xl mx-auto" itemsStart returnPage>
            <Input
                placeholder="Поиск по username или telegram id"
                name="search"
                value={search}
                onChange={handleSearchChange}

                onClear={() => {
                    setSearch('');
                    setPagination(prev => ({ ...prev, currentPage: 1 }));
                }}
                showTopPlaceholder={false}
            />

            <ListPagination
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

            <ScamFormList
                scamForms={forms}
                onViewForm={handleViewForm}
                isLoading={isLoading}
            />

            <ScamFormModal
                selectedForm={selectedForm}
                showModal={showModal}
                setShowModal={setShowModal}
            />
        </PageContainer >
    )
}
