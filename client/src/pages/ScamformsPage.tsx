import { ScamFormList, ScamFormModal } from "@/components/scamform"
import { Input } from "@/components/ui/Input"
import { Pagination as ListPagination } from "@/components/ui/Pagination"
import { ScamformsService } from "@/services/scamforms.service"
import { useStore } from "@/store/root.store"
import { IPagination, IScamForm } from "@/types"
import { onRequest } from "@/utils/handleReq"
import { useCallback, useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { toast } from "react-toastify"
import { PageContainer } from "../components/layout/PageContainer"

export const ScamForms: React.FC = () => {
    const { id } = useParams<{ id: string }>()
    const { userStore: { user } } = useStore()
    const [scamForms, setScamForms] = useState<IScamForm[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [selectedForm, setSelectedForm] = useState<IScamForm | null>(null)
    const [showModal, setShowModal] = useState(false)

    const [pagination, setPagination] = useState<IPagination>({
        totalCount: 0,
        maxPage: 1,
        currentPage: 1,
        limit: 5
    })
    const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
    const initialSearch = id || startParam || "";
    const [search, setSearch] = useState<string>(initialSearch);

    const debouncedSearch = useCallback(
        (() => {
            let timeoutId: NodeJS.Timeout;
            return (searchValue: string) => {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    getScamForms(pagination.currentPage, searchValue);
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

    const getScamForms = async (page: number, searchValue = search) => {
        setIsLoading(true)
        const data = await onRequest(ScamformsService.getAllScamForms({ page, limit: pagination.limit, search: searchValue }))
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
            setScamForms(prev => prev.filter(form => form.id !== formId))
            toast.success('Жалоба удалена')
        }
    }

    useEffect(() => {
        if (!id && startParam && !search) {
            setSearch(startParam);
            getScamForms(pagination.currentPage, startParam);
        } else {
            getScamForms(pagination.currentPage, search)
        }
    }, [pagination.currentPage])

    return (
        <PageContainer title="Жалобы" className="gap-2 max-w-2xl mx-auto" itemsStart returnPage>
            <Input
                placeholder="Поиск по username или telegram id"
                name="search"
                value={search}
                onChange={handleSearchChange}
            />

            <ListPagination
                currentPage={pagination.currentPage}
                maxPage={pagination.maxPage}
                onPageChange={handlePageChange}
            />

            <ScamFormList
                scamForms={scamForms}
                onViewForm={handleViewForm}
            />

            <ScamFormModal
                selectedForm={selectedForm}
                showModal={showModal}
                setShowModal={setShowModal}
            />
        </PageContainer>
    )
}
