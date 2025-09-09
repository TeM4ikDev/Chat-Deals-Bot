import { Block } from "@/components/ui/Block"
import { Button } from "@/components/ui/Button"
import { Form } from "@/components/ui/Form"
import { Input } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { AdminService } from "@/services/admin.service"
import { useStore } from "@/store/root.store"
import { IChatData } from "@/types"
import { UserRoles } from "@/types/auth"
import { FormConfig } from "@/types/form"
import { onRequest } from "@/utils/handleReq"
import { PencilIcon, TrashIcon } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "react-toastify"
import { PageContainer } from "../../layout/PageContainer"

export const ChatMessages: React.FC = () => {
    const { userStore: { userRole } } = useStore()
    const [newUsersMessages, setNewUsersMessages] = useState<IChatData[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingMessage, setEditingMessage] = useState<IChatData | null>(null)
    const [keyboardRows, setKeyboardRows] = useState<{ text: string; url: string }[]>([])

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
                min: 1,
                required: false
            } as any,
            
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
            autoMessageKeyboardUrls: (() => {
                const rows = keyboardRows
                    .filter(row => row.text && row.url)
                    .map(row => [{ text: row.text, url: row.url }])
                return rows.length ? JSON.stringify(rows) : null
            })(),
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
        // Заполняем ряды клавиатуры из сохраненного значения
        try {
            const raw = (message as any).autoMessageKeyboardUrls
            if (!raw) {
                setKeyboardRows([])
            } else {
                const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
                if (Array.isArray(parsed)) {
                    const rowsParsed: { text: string; url: string }[] = []
                    for (const row of parsed) {
                        const first = Array.isArray(row) && row.length > 0 ? row[0] : null
                        if (first && first.text && first.url) {
                            rowsParsed.push({ text: String(first.text), url: String(first.url) })
                        }
                    }
                    setKeyboardRows(rowsParsed)
                } else {
                    setKeyboardRows([])
                }
            }
        } catch {
            setKeyboardRows([])
        }
        setIsModalOpen(true)
    }

    const handleCreate = () => {
        setEditingMessage(null)
        setKeyboardRows([])
        setIsModalOpen(true)
    }

    const addKeyboardRow = () => {
        setKeyboardRows(prev => [...prev, { text: '', url: '' }])
    }

    const removeKeyboardRow = (index: number) => {
        setKeyboardRows(prev => prev.filter((_, i) => i !== index))
    }

    const updateKeyboardRow = (index: number, field: 'text' | 'url', value: string) => {
        setKeyboardRows(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row))
    }

    const renderKeyboardBlock = () => (
        <Block title="Клавиатура автосообщения">
            <Button
                text="Добавить кнопку"
                FC={addKeyboardRow}
                color="green"
                widthMin
            />
            {keyboardRows.length === 0 && (
                <p className="text-gray-400 text-sm">Кнопки не добавлены</p>
            )}
            {keyboardRows.map((row, index) => (
                <Block key={index} title={`Кнопка ${index + 1}`}>
                    <Button
                        text=" "
                        icon={<TrashIcon />}
                        FC={() => removeKeyboardRow(index)}
                        color="red"
                        widthMin
                        className="absolute top-1 right-1 !p-1"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Input
                            name={`kb_text_${index}`}
                            type="text"
                            value={row.text}
                            onChange={(e) => updateKeyboardRow(index, 'text', e.target.value)}
                            placeholder="Текст кнопки"
                            isRequired={false}
                        />
                        <Input
                            name={`kb_url_${index}`}
                            type="text"
                            value={row.url}
                            onChange={(e) => updateKeyboardRow(index, 'url', e.target.value)}
                            placeholder="URL"
                            isRequired={false}
                        />
                    </div>
                </Block>
            ))}
        </Block>
    )

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
                                <div className="flex flex-row gap-1 justify-between items-start">


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
                                        <p>Клавиатура автосообщений: {message.autoMessageKeyboardUrls && message.autoMessageKeyboardUrls.length > 0 ? "Настроена" : "Не настроена"}</p>
                                        <p>Запрещенные слова: {message.banWords && message.banWords.length > 0 ? message.banWords.join(", ") : "Нет"}</p>
                                    </div>
                                    <Button
                                        text=" "
                                        icon={<PencilIcon />}
                                        FC={() => handleEdit(message)}
                                        color="green"
                                        className="!p-2"
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
                    customElements={<>{renderKeyboardBlock()}</>}
                />
            </Modal>
        </PageContainer>
    )
}