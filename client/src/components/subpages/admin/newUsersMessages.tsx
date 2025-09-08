import { Block } from "@/components/ui/Block"
import { Button } from "@/components/ui/Button"
import { Form } from "@/components/ui/Form"
import { Modal } from "@/components/ui/Modal"
import { AdminService } from "@/services/admin.service"
import { useStore } from "@/store/root.store"
import { IChatData } from "@/types"
import { UserRoles } from "@/types/auth"
import { FormConfig } from "@/types/form"
import { onRequest } from "@/utils/handleReq"
import { useEffect, useState } from "react"
import { toast } from "react-toastify"
import { PageContainer } from "../../layout/PageContainer"

export const NewUsersMessages: React.FC = () => {
    const { userStore: { userRole } } = useStore()
    const [newUsersMessages, setNewUsersMessages] = useState<IChatData[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingMessage, setEditingMessage] = useState<IChatData | null>(null)

    const formConfig: FormConfig = {
        input: [
            {
                name: "username",
                label: "Username чата",
                type: "text",
                placeholder: "Введите username чата",
                required: true
            },
            {
                name: "newUserMessage",
                label: "Сообщение",
                type: "textarea",
                placeholder: "Введите сообщение для новых пользователей",
                required: false
            },
            {
                name: "rulesTelegramLink",
                label: "Ссылка на правила (необязательно)",
                type: "text",
                placeholder: "Введите ссылку на правила",
                required: false
            },
            {
                name: "autoMessageId",
                label: "ID автоматического сообщения (необязательно)",
                type: "text",
                placeholder: "Введите ID сообщения для автоотправки",
                required: false
            },
            {
                name: "autoMessageIntervalSec",
                label: "Интервал автосообщений в секундах (необязательно)",
                type: "number",
                placeholder: "Введите интервал в секундах",
                required: false
            },
            {
                name: "banWords",
                label: "Запрещенные слова (через запятую)",
                type: "textarea",
                placeholder: "Введите запрещенные слова через запятую",
                required: false
            }
        ],

        select: [
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
            setNewUsersMessages(data)
        } catch (error) {
            toast.error("Ошибка при загрузке сообщений")
        } finally {
            setIsLoading(false)
        }
    }

    const handleSubmit = async (values: any) => {
        // Преобразуем строку запрещенных слов в массив и autoMessageIntervalSec в число
        const processedValues = {
            ...values,
            autoMessageIntervalSec: Number(values.autoMessageIntervalSec) || null,
            banWords: values.banWords 
                ? values.banWords.split(',').map((word: string) => word.trim()).filter((word: string) => word.length > 0)
                : []
        }

        console.log(processedValues)
        // return
        try {
            if (editingMessage) {
                await onRequest(AdminService.updateChatMessage(editingMessage.id, processedValues))
                toast.success("Сообщение успешно обновлено")
            } else {
                // Создание нового сообщения
                await onRequest(AdminService.addChatMessage(processedValues))
                toast.success("Сообщение успешно создано")
            }
            setIsModalOpen(false)
            setEditingMessage(null)
            getChatMessages()
        } catch (error) {
            toast.error("Ошибка при сохранении сообщения")
        }
    }

    const handleEdit = (message: IChatData) => {
        // Преобразуем массив запрещенных слов в строку для формы и число в строку
        const messageForEdit = {
            ...message,
            autoMessageIntervalSec: message.autoMessageIntervalSec ? message.autoMessageIntervalSec.toString() : '',
            banWords: message.banWords && Array.isArray(message.banWords) 
                ? message.banWords.join(', ') 
                : (typeof message.banWords === 'string' ? message.banWords : '')
        } as any
        setEditingMessage(messageForEdit)
        setIsModalOpen(true)
    }

    const handleCreate = () => {
        setEditingMessage(null)
        setIsModalOpen(true)
    }

    useEffect(() => {
        getChatMessages()
    }, [])

    if (userRole != UserRoles.SuperAdmin) {
        return <PageContainer itemsStart title="">
            <div className="text-center py-8 text-gray-500">
                У вас нет доступа к этой странице
            </div>
        </PageContainer>
    }

    return (
        <PageContainer itemsStart title="Конфиг сообщений">
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
                    {newUsersMessages.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            Сообщения не найдены
                        </div>
                    ) : (
                        newUsersMessages.map((message) => (
                            <Block key={message.id} title={`Чат: @${message.username}`}>
                                <div className="flex flex-row gap-1 justify-between items-center">


                                    <div className="flex text-sm flex-col text-gray-600 justify-between items-start">
                                        <p className=" ">
                                            Приветствие: {message.newUserMessage && message.newUserMessage.length > 100
                                                ? `${message.newUserMessage.substring(0, 100)}...`
                                                : message.newUserMessage || "Не задано"
                                            }
                                        </p>
                                        <span>Инфо о пользователе: {message.showNewUserInfo ? "Да" : "Нет"}</span>
                                        <p>Ссылка на правила: {message.rulesTelegramLink || "Нет"}</p>
                                        <p>ID автосообщения: {message.autoMessageId || "Не настроено"}</p>
                                        <p>Интервал автосообщений: {message.autoMessageIntervalSec ? `${message.autoMessageIntervalSec} сек` : "Не настроено"}</p>
                                        <p>Запрещенные слова: {message.banWords && message.banWords.length > 0 ? message.banWords.join(", ") : "Нет"}</p>
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
                title={editingMessage ? `Редактировать сообщение ${editingMessage.username}` : "Создать новое сообщение"}
            >
                <Form
                    config={formConfig}
                    message={editingMessage ? "Сообщение успешно обновлено" : "Сообщение успешно создано"}
                    onSubmit={handleSubmit}
                    title=""
                    icons={[]}
                    initialValues={editingMessage || undefined}
                />
            </Modal>
        </PageContainer>
    )
}