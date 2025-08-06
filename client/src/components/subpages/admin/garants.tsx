
import { Input } from "@/components/ui/Input"
import { AdminService } from "@/services/admin.service"
import { useStore } from "@/store/root.store"
import { FormConfig } from "@/types/form"
import { onRequest } from "@/utils/handleReq"
import { Plus, Save, Shield, Trash2, User, Users, X } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "react-toastify"
import { PageContainer } from "../../layout/PageContainer"
import { Block } from "../../ui/Block"
import { Button } from "../../ui/Button"
import { Form } from "../../ui/Form"

export const Garants: React.FC = () => {
    const { userStore: { user } } = useStore()
    const [garants, setGarants] = useState<{ username: string; description?: string }[] | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [showAddForm, setShowAddForm] = useState(false)

    const formConfig: FormConfig = {
        input: [
            {
                name: "username",
                label: "Имя пользователя",
                placeholder: "Введите имя пользователя",
                required: true,
                type: "text"
            },
            {
                name: "description",
                label: "Описание",
                placeholder: "Введите описание гаранта",
                required: false,
                type: "text"
            }
        ]
    }

    const getGarants = async () => {
        setIsLoading(true)
        const data = await onRequest(AdminService.getAllGarants())

        console.log(data)
        if (data) {
            setGarants(data)
        }
        setIsLoading(false)
    }

    const handleAddGarant = async (values: { username: string; description?: string }) => {
        const data = await onRequest(AdminService.addGarant((values.username).replace('@', ''), values.description || ''))
        if (data) {
            toast.success("Гарант успешно добавлен")
            setShowAddForm(false)
            getGarants()
        }
    }

    const handleRemoveGarant = async (username: string) => {
        const data = await onRequest(AdminService.removeGarant(username))

        console.log(data)
        if (data) {
            toast.success("Гарант удален")
            getGarants()
        }
    }

    const [editingGarant, setEditingGarant] = useState<string | null>(null)
    const [editDescription, setEditDescription] = useState<string>("")

    const handleEditGarant = (garant: { username: string; description?: string }) => {
        setEditingGarant(garant.username)
        setEditDescription(garant.description || "")
    }

    const handleSaveDescription = async (username: string) => {
        const data = await onRequest(AdminService.updateGarant(username, editDescription))
        if (data) {
            toast.success("Описание обновлено")
            setEditingGarant(null)
            getGarants()
        }
    }

    useEffect(() => {
        getGarants()
    }, [])

    return (
        <PageContainer className="gap-2 " title="Гаранты" loading={isLoading} itemsStart returnPage>
            <Button
                text="Добавить гаранта"
                FC={() => setShowAddForm(!showAddForm)}
                icon={<Plus className="w-5 h-5" />}
                className="w-full md:w-auto"
            />

            {showAddForm && (
                <Block
                    title="Добавить нового гаранта"
                    icons={[<Plus className="w-6 h-6 text-green-400" />]}
                    variant="lighter"
                    canCollapse
                    isCollapsedInitially={false}
                >
                    <Form
                        config={formConfig}
                        message="Гарант успешно добавлен"
                        onSubmit={handleAddGarant}
                        className="w-full"
                        isCollapsedInitially={false}
                        canCollapse={false}
                    />
                </Block>
            )}

            <Block
                title="Список гарантов"
                icons={[<Users className="w-6 h-6 text-blue-400" />]}
                variant="lighter"
            >
                {!garants || garants.length == 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Shield className="w-16 h-16 text-gray-500 mb-4" />
                        <h3 className="text-xl font-semibold text-gray-400 mb-2">Гаранты не найдены</h3>
                        <p className="text-gray-500">Добавьте первого гаранта, чтобы начать</p>
                    </div>
                ) : (
                    <div className="grid gap-2">
                        {garants.map((garant, index) => (
                            <div
                                key={index}
                                className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-2 p-2 bg-[#18132a] rounded-lg border border-[#28204a] hover:border-[#3a2f5a] transition-colors"
                            >
                                <Button
                                    widthMin
                                    text=""
                                    FC={() => handleRemoveGarant(garant.username)}
                                    icon={<Trash2 className="w-4 h-4 text-red-400" />}
                                    className="absolute top-2 right-2 z-10 hover:bg-red-500/20 hover:border-red-500/30"
                                    color="red"
                                />
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
                                        <User className="w-5 h-5 text-white" />
                                    </div>
                                    <Link to={`https://t.me/${garant.username.replace('@', '')}`}>
                                        <h4 className="font-semibold text-white break-all">{garant.username}</h4>
                                    </Link>
                                </div>
                                <div className="flex flex-col md:flex-row md:items-center gap-2 w-full md:w-auto">
                                    {editingGarant === garant.username ? (
                                        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                                            <Input
                                                placeholder="Описание"
                                                name="description"
                                                value={editDescription}
                                                onChange={e => setEditDescription(e.target.value)}
                                                className="w-full md:w-64"
                                            />
                                            <div className="flex gap-2">
                                                <Button widthMin text=' ' icon={<Save/>} FC={() => handleSaveDescription(garant.username)} />
                                                <Button widthMin text=' ' color="red" icon={<X/>} FC={() => setEditingGarant(null)} />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-2">
                                            <span className="text-gray-300 break-words text-sm md:text-base">{garant.description || "Нет описания"}</span>
                                            <div className="flex gap-2 items-center">
                                                <Button widthMin text="Изменить" FC={() => handleEditGarant(garant)} className="px-2 py-1" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Block>
        </PageContainer>
    )
}
