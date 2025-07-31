import { IUser } from "@/types/auth"
import { Send, ShieldCheck, UserCircle2 } from "lucide-react"
import { Block } from "../ui/Block"
import { GradientLine } from "../ui/GradientLine"

interface UserProfileProps {
    user: IUser
    title?: string
    showAvatar?: boolean
    className?: string
}

export const UserProfile: React.FC<UserProfileProps> = ({ 
    user, 
    title, 
    showAvatar = true,
    className = ""
}) => {
    const displayName = user.firstName || user.name
    const avatarUrl = user.photoUrl

    return (
        <Block
            title={title || `Профиль ${displayName}`}
            icons={[<UserCircle2 className="text-cyan-400" />]}
            className={`p-4 gap-4 ${className}`}
            titleCenter
            mediumTitle
        >
            {showAvatar && (
                <div className="flex flex-col items-center gap-4">
                    {avatarUrl && (
                        <img
                            src={avatarUrl}
                            alt="avatar"
                            className="w-28 h-28 rounded-full border-4 border-cyan-400 shadow-lg object-cover"
                        />
                    )}

                    <span className="text-sm text-gray-400 flex items-center gap-1">
                        <ShieldCheck className="w-4 h-4" />
                        {user.role}
                    </span>
                </div>
            )}

            <GradientLine />

            <div className="flex flex-col gap-4">
                {user.username && (
                    <div className="flex items-center gap-3 bg-slate-700/60 rounded-lg p-3">
                        <Send className="text-cyan-400 w-5 h-5" />
                        <span className="font-semibold">Telegram:</span>
                        <span className="text-gray-200">@{user.username}</span>
                    </div>
                )}
            </div>

            <GradientLine />

            <div className="flex flex-col gap-2 text-sm text-gray-400">
                <div className="flex justify-between">
                    <span>ID:</span>
                    <span className="text-gray-200 font-mono">{user.id}</span>
                </div>
                <div className="flex justify-between">
                    <span>Telegram ID:</span>
                    <span className="text-gray-200 font-mono">{user.telegramId}</span>
                </div>
                <div className="flex justify-between">
                    <span>Имя:</span>
                    <span className="text-gray-200">{user.firstName}</span>
                </div>
                <div className="flex justify-between">
                    <span>Статус:</span>
                    <span className={`font-semibold ${user.banned ? 'text-red-400' : 'text-green-400'}`}>
                        {user.banned ? 'Заблокирован' : 'Активен'}
                    </span>
                </div>
            </div>
        </Block>
    )
} 