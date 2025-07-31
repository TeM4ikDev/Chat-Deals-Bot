
import { AdminService } from "@/services/admin.service"
import { useStore } from "@/store/root.store"
import { FormConfig } from "@/types/form"
import { onRequest } from "@/utils/handleReq"
import { Plus, Shield, Trash2, User, Users } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "react-toastify"
import { PageContainer } from "../../layout/PageContainer"
import { Block } from "../../ui/Block"
import { Button } from "../../ui/Button"
import { Form } from "../../ui/Form"
import { Link } from "react-router-dom"

export const Garants: React.FC = () => {
    const { userStore: { user } } = useStore()
    const [garants, setGarants] = useState<{ username: string }[] | null>(null)
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

    const handleAddGarant = async (values: { username: string }) => {
        const data = await onRequest(AdminService.addGarant((values.username).replace('@', '')))
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

    useEffect(() => {
        getGarants()
    }, [])

    return (
        <PageContainer title="Управление гарантами" loading={isLoading} itemsStart returnPage>
            <div className="flex flex-col justify-center items-center gap-6 w-full max-w-4xl">


                <Block variant="transparent">
                    <Button
                        text="Добавить гаранта"
                        FC={() => setShowAddForm(!showAddForm)}
                        icon={<Plus className="w-5 h-5" />}
                        className="w-full md:w-auto"
                    />
                </Block>

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
                                    className="flex items-center justify-between p-2 bg-[#18132a] rounded-lg border border-[#28204a] hover:border-[#3a2f5a] transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
                                            <User className="w-5 h-5 text-white" />
                                        </div>
                                        <Link to={`https://t.me/${garant.username.replace('@', '')}`}>
                                            <h4 className="font-semibold text-white">{garant.username}</h4>

                                        </Link>
                                    </div>

                                    <Button
                                        widthMin
                                        text=""
                                        FC={() => handleRemoveGarant(garant.username)}
                                        icon={<Trash2 className="w-4 h-4 text-red-400" />}
                                        className="p-2 hover:bg-red-500/20 hover:border-red-500/30"
                                        color="red"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </Block>
            </div>
        </PageContainer>
    )
}
