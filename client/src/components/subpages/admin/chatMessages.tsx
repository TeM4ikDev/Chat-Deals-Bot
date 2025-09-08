import { PageContainer } from "@/components/layout/PageContainer"
import { Block } from "@/components/ui/Block"
import { AdminService } from "@/services/admin.service"
import { IChatData } from "@/types"
import { onRequest } from "@/utils/handleReq"
import { useEffect, useState } from "react"
import { toast } from "react-toastify"

// interface IChat {
//     id: string
//     username: string
// }

export const ChatMessages: React.FC = () => {
    const [chats, setChats] = useState<IChatData[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingMessage, setEditingMessage] = useState(null)

    const getChatMessages = async () => {
        setIsLoading(true)
        try {
            const data = await onRequest(AdminService.getChatMessages())
            console.log(data)
            setChats(data)
        } catch (error) {
            toast.error("Ошибка при загрузке сообщений")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        getChatMessages()
    }, [])

    if (isLoading) {
        return <div className="text-center py-8">Загрузка...</div>
    }

    return (
        <PageContainer itemsStart >
            <Block title="Всплывающие сообщения">

            </Block>

            <Block title='Бан по словам'>


            </Block>
            <Block title='Спамеры'>

            </Block>
        </PageContainer>
    )
}