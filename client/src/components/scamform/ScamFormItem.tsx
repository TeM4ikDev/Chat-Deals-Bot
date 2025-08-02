import { useStore } from "@/store/root.store"
import { Eye, Image, User, Video } from "lucide-react"
import { Link } from "react-router-dom"
import { Block } from "../ui/Block"
import { Button } from "../ui/Button"

interface IMedia {
    id: string
    fileId: string
    type: 'photo' | 'video'
    fileUrl?: string
}

interface IScamForm {
    id: string
    description: string
    media: IMedia[]
    scammerUsername?: string
    scammerTelegramId?: string
    createdAt: string
    status: 'pending' | 'reviewed' | 'resolved'
}

interface ScamFormItemProps {
    showHeader: boolean
    form: IScamForm
    onViewForm: (form: IScamForm) => void
}

export const ScamFormItem: React.FC<ScamFormItemProps> = ({
    form,
    onViewForm,
    showHeader
}) => {


    const { routesStore: { getDynamicPathByKey } } = useStore()



    return (
        <Block className={!showHeader ? 'gap-0' : ''} icons={!showHeader ? [] : [<User />]} title={showHeader &&
            // <Link to={`users/${form?.scammerUsername?.replace('@', '') || form.scammerTelegramId || ''}`}>
            `Жалоба на ${form.scammerUsername ? `@${form.scammerUsername.replace('@', '')}` : form.scammerTelegramId || 'Неизвестный пользователь'}`
            // </Link>
        }>
            <div className="flex flex-row">
                <div className="flex flex-col flex-1">
                    <p className="text-gray-300 text-sm mb-2">
                        {form.description.length > 150
                            ? `${form.description.substring(0, 100)}...`
                            : form.description
                        }
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span>Создано: {new Date(form.createdAt).toLocaleDateString('ru-RU')}</span>
                        {form.media.length > 0 && (
                            <div className="flex items-center gap-1 text-nowrap">
                                {form.media.some(m => m.type === 'photo') && <Image className="w-3 h-3" />}
                                {form.media.some(m => m.type === 'video') && <Video className="w-3 h-3" />}
                                <span>{form.media.length} медиа</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-2 ml-4">
                    <Button
                        text="Просмотр"
                        icon={<Eye className="w-4 h-4" />}
                        FC={() => onViewForm(form)}
                        color="blue"
                        widthMin
                    />
                </div>
            </div>
        </Block>
    );
}; 