import { AdminService } from "@/services/admin.service"
import { IUser } from "@/types/auth"
import { onRequest } from "@/utils/handleReq"
import { MessageCircle } from "lucide-react"
import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { toast } from "react-toastify"
import { PageContainer } from "../../layout/PageContainer"
import { Button } from "../../ui/Button"
import { UserProfile } from "../../user/UserProfile"

export const UserDetails: React.FC = () => {
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [userData, setUserData] = useState<IUser | null>(null)
    const { id } = useParams();

    const getUserData = async () => {
        setIsLoading(true)
        if (!id) {
            toast.error('id пользователя не передан')
            return
        }

        const userData: IUser = await onRequest(AdminService.getUserDetails(id))

        console.log({ userData })

        if (userData) {
            setUserData(userData)
        }

        setIsLoading(false)
    }

    useEffect(() => {
        getUserData()
    }, [])

    if (!userData) return null;

    return (
        <PageContainer
            title={
                userData?.username
                || userData?.firstName
                || "Пользователь"
            }
            loading={isLoading}
            returnPage
            itemsStart
        >
            <Button
                text="Чат Telegram"
                icon={<MessageCircle />}
                href={`https://t.me/${userData.username}`}
                className="mb-4"
            />

            <UserProfile
                user={userData}
                showAvatar={false}
                title={`Детали пользователя`}
            />
        </PageContainer>
    )
}