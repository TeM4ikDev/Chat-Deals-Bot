import { PageContainer } from "@/components/layout/PageContainer"
import { Button } from "@/components/ui/Button"
import { UserProfile } from "@/components/user/UserProfile"
import { useStore } from "@/store/root.store"
import { LogOut } from "lucide-react"
import { observer } from "mobx-react-lite"
import { useNavigate } from "react-router-dom"
import { toast } from "react-toastify"

const ProfilePage: React.FC = observer(() => {
    const { userStore: { user, logout } } = useStore()
    const navigate = useNavigate()

    const handleLogout = () => {
        logout();
        toast.success('Вы успешно вышли из системы');
        navigate('/')
    };


    return (
        <PageContainer needAuth itemsStart>
            <UserProfile user={user!} />
        </PageContainer>
    )
})

export default ProfilePage
