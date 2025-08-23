import { Button } from "@/components/ui/Button"
import { Form } from "@/components/ui/Form"
import { Modal } from "@/components/ui/Modal"
import { AdminService } from "@/services/admin.service"
import { IChatMessage } from "@/types"
import { FormConfig } from "@/types/form"
import { onRequest } from "@/utils/handleReq"
import { useEffect, useState } from "react"
import { toast } from "react-toastify"
import { PageContainer } from "../../layout/PageContainer"
import { Block } from "@/components/ui/Block"
import { useStore } from "@/store/root.store"
import { UserRoles } from "@/types/auth"

export const ChatMessages: React.FC = () => {
    const { userStore: {userRole} } = useStore()
    const [chatMessages, setChatMessages] = useState<IChatMessage[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingMessage, setEditingMessage] = useState<IChatMessage | null>(null)

    const formConfig: FormConfig = {
        input: [
            {
                name: "message",
                label: "Сообщение",
                type: "textarea",
                placeholder: "Введите сообщение для новых пользователей",
                required: false
            },
            {
                name: "chatUsername",
                label: "Username чата",
                type: "text",
                placeholder: "Введите username чата",
                required: true
            },
            {
                name: "rulesTelegramLink",
                label: "Ссылка на правила (необязательно)",
                type: "text",
                placeholder: "Введите ссылку на правила",
                required: false
            }
        ],
        select: [
            // {
            //     name: "showRules",
            //     label: "Показывать правила",
            //     placeholder: "Показывать правила",
            //     required: true,
            //     options: [
            //         { value: "true", label: "Да" },
            //         { value: "false", label: "Нет" }
            //     ]
            // },
            {
                name: "showNewUserInfo",
                label: "Показывать информацию о новом пользователе",
                placeholder: "Показывать информацию о новом пользователе",
                required: true,
                options: [
                    { value: "true", label: "Да" },
                    { value: "false", label: "Нет" }
                ]
            }
        ]
    }

    const getChatMessages = async () => {
        setIsLoading(true)
        try {
            const data = await onRequest(AdminService.getChatMessages())
            console.log(data)
            setChatMessages(data)
        } catch (error) {
            toast.error("Ошибка при загрузке сообщений")
        } finally {
            setIsLoading(false)
        }
    }

    const handleSubmit = async (values: any) => {

        console.log(values)
        // return
        try {
            if (editingMessage) {
                await onRequest(AdminService.updateChatMessage(editingMessage.id, values))
                toast.success("Сообщение успешно обновлено")
            } else {
                // Создание нового сообщения
                await onRequest(AdminService.addChatMessage(values))
                toast.success("Сообщение успешно создано")
            }
            setIsModalOpen(false)
            setEditingMessage(null)
            getChatMessages()
        } catch (error) {
            toast.error("Ошибка при сохранении сообщения")
        }
    }

    const handleEdit = (message: IChatMessage) => {
        setEditingMessage(message)
        setIsModalOpen(true)
    }

    const handleCreate = () => {
        setEditingMessage(null)
        setIsModalOpen(true)
    }

    useEffect(() => {
        getChatMessages()
    }, [])


    if(userRole != UserRoles.SuperAdmin){
        return <PageContainer itemsStart title="">
            <div className="text-center py-8 text-gray-500">
                У вас нет доступа к этой странице
            </div>
        </PageContainer>
    }

    return (
        <PageContainer itemsStart title="Сообщения в чате">
            <Button
                text="Создать новое сообщение"
                FC={handleCreate}
                color="blue"
                widthMin
            />

            {isLoading ? (
                <div className="text-center py-8">Загрузка...</div>
            ) : (
                <div className="grid gap-4 w-full">
                    {chatMessages.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            Сообщения не найдены
                        </div>
                    ) : (
                        chatMessages.map((message) => (
                            <Block key={message.id} title={`Чат: @${message.chatUsername}`}>
                                <div className="flex flex-row gap-1 justify-between items-center">


                                    <div className="flex text-sm flex-col text-gray-600 justify-between items-start">
                                        <p className=" ">
                                            Сообщение: {message.message.length > 100
                                                ? `${message.message.substring(0, 100)}...`
                                                : message.message
                                            }
                                        </p>
                                        <span>Инфо о пользователе: {message.showNewUserInfo ? "Да" : "Нет"}</span>
                                        <p>ссылка на правила: {message.rulesTelegramLink || "Нет"}</p>
                                    </div>
                                    <Button
                                        text="Редактировать"
                                        FC={() => handleEdit(message)}
                                        color="green"
                                        widthMin
                                    />
                                </div>
                            </Block>

                        ))
                    )}
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                setIsOpen={setIsModalOpen}
                title={editingMessage ? `Редактировать сообщение ${editingMessage.chatUsername}` : "Создать новое сообщение"}
            >
                <Form
                    config={formConfig}
                    message={editingMessage ? "Сообщение успешно обновлено" : "Сообщение успешно создано"}
                    onSubmit={handleSubmit}
                    title=""
                    icons={[]}
                    initialValues={editingMessage ? {
                        message: editingMessage.message,
                        chatUsername: editingMessage.chatUsername,
                        rulesTelegramLink: editingMessage.rulesTelegramLink || "",
                        showNewUserInfo: editingMessage.showNewUserInfo.toString()
                    } : undefined}
                />
            </Modal>
        </PageContainer >
    )
}