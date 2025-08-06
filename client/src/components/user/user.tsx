import { IUser, UserRoles } from "@/types/auth"
import { cn } from "@/utils/cn"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Switch } from "../ui/Switch"
import { useStore } from "@/store/root.store"
import { Infinity } from "lucide-react"

interface UserProps {
    userProp: IUser
    user: IUser | null
    onToggleAdmin?: (telegramId: string, role: UserRoles) => void
    onToggleBanned?: (telegramId: string, banned: boolean) => void
}

export const User: React.FC<UserProps> = ({ userProp, user, onToggleAdmin, onToggleBanned }) => {
    const [isUserAdmin, setIsUserAdmin] = useState(userProp.role == UserRoles.Admin)
    const [isBanned, setIsBanned] = useState(userProp.banned)

    const { routesStore: { getDynamicPathByKey }, userStore: { userRole } } = useStore();

    const handleToggleAdmin = () => {
        if (onToggleAdmin) {
            setIsUserAdmin(!isUserAdmin)
            onToggleAdmin(userProp.id, !isUserAdmin ? UserRoles.Admin : UserRoles.User)
        }
    }

    const handleToggleBanned = () => {
        if (onToggleBanned) {
            setIsBanned(!isBanned)
            onToggleBanned(userProp.id, !isBanned)
        }
    }

    useEffect(() => {
        setIsUserAdmin(userProp.role == UserRoles.Admin)
    }, [userProp])

    return (
        <tr className="grid grid-cols-3 px-2 items-center hover:bg-gray-700/50 transition-colors h-12">
            <td className="flex items-center gap-2 max-w-xs overflow-hidden whitespace-nowrap truncate">
                <Link
                    to={getDynamicPathByKey('ADMIN_USERS_ID', { id: userProp.id })}

                    className="text-blue-500 font-medium underline truncate"
                    title={userProp.username || userProp.firstName}
                >
                    {userProp.username || userProp.firstName}
                </Link>
            </td>

            {/* <td className="flex items-center justify-center">
                <Switch
                    value={isUserAdmin}
                    onToggle={handleToggleAdmin}
                    disabled={user?.role != UserRoles.SuperAdmin}
                />
            </td> */}

            <td className="flex items-center justify-center">
                {userProp.role  != UserRoles.SuperAdmin ? (
                    <Switch
                        value={isBanned}
                        onToggle={handleToggleBanned}
                        disabled={user?.role == UserRoles.Admin && userProp.role == UserRoles.Admin}

                    />

                ) : (
                    <span className="text-lg font-medium text-green-400">
                        <Infinity />
                    </span>
                )}
            </td>

            <td className="flex items-center justify-center">
                <span className={cn('px-2 py-1 text-xs font-semibold rounded-full', userProp.role === UserRoles.Admin
                    ? 'bg-green-900 text-green-300'
                    : 'bg-red-900 text-red-300'
                )}>
                    {userProp.role}
                </span>
            </td>
        </tr>
    )
}
