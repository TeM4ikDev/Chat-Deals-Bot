import { PageContainer } from "@/components/layout/PageContainer"
import { Button } from "@/components/ui/Button"
import { UserProfile } from "@/components/user/UserProfile"
import { onRequest } from "@/utils/handleReq"
import { UserService } from "@/services/user.service"
import { useStore } from "@/store/root.store"
import { LogOut } from "lucide-react"
import { observer } from "mobx-react-lite"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "react-toastify"
import { IUser } from "@/types/auth"

const ProfilePage: React.FC = observer(() => {
    // const { userStore: { user, logout } } = useStore()

    const [userProfile, setUserProfile] = useState<IUser | null>(null)
    const navigate = useNavigate()

    async function getUserProfile() {
        const user = await onRequest(UserService.getUserProfile())
        console.log(user)
        setUserProfile(user)
    }


    useEffect(() => {
        getUserProfile()
    }, [])


    return (
        <PageContainer needAuth itemsStart>
            {userProfile && <UserProfile user={userProfile} />}
        </PageContainer>
    )
})

export default ProfilePage
