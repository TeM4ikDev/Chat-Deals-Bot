import { PageContainer } from "@/components/layout/PageContainer";
import { Block } from "@/components/ui/Block";
import { Button } from "@/components/ui/Button";
import { Form } from "@/components/ui/Form";
import { Input } from "@/components/ui/Input";
import { AdminService } from "@/services/admin.service";
import { ScammerStatus } from "@/types";
import { FormConfig } from "@/types/form";
import { onRequest } from "@/utils/handleReq";
import { PlusIcon, TrashIcon } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

export const AddPerson = () => {
    const navigate = useNavigate();
    const [twinks, setTwinks] = useState<{ telegramId?: string; username?: string }[]>([]);

    const formConfig: FormConfig = {
        input: [
            {
                name: "telegramId",
                label: "Telegram ID",
                type: "number",
                placeholder: "Введите Telegram ID",
                required: false
            },
            {
                name: "username",
                label: "Username (необязательно)",
                type: "text",
                placeholder: "Введите username",
                required: false
            },
            {
                name: 'description',
                label: 'Описание',
                type: 'textarea',
                placeholder: 'Введите описание',
                required: false
            },
            {
                name: "file",
                label: "Пруфы",
                type: "file",
                multiple: true,
                required: true
            },

        ],
        select: [
            {
                name: "status",
                label: "Статус",
                placeholder: "Выберите статус",
                required: true,
                options: [
                    { value: ScammerStatus.SCAMMER, label: "Скаммер" },
                    { value: ScammerStatus.SUSPICIOUS, label: "Подозрительный" },
                    { value: ScammerStatus.UNKNOWN, label: "Неизвестно" }
                ]
            },
        ],



    };

    const addTwink = () => {
        setTwinks(prev => [...prev, { telegramId: '', username: '' }]);
    };

    const removeTwink = (index: number) => {
        setTwinks(prev => prev.filter((_, i) => i !== index));
    };

    const updateTwink = (index: number, field: 'telegramId' | 'username', value: string) => {
        setTwinks(prev => prev.map((twink, i) =>
            i === index ? { ...twink, [field]: value } : twink
        ));
    };

    const handleSubmit = async (values: { telegramId: string; username?: string; status: string; description?: string; file?: any }) => {

        if (!values.telegramId && !values.username) {
            toast.error("Необходимо ввести Telegram ID или username")
            return
        }

        const validTwinks = twinks.filter(twink => twink.telegramId || twink.username);

        const submitData = {
            ...values,
            username: values.username?.toLowerCase().replace('@', ''),

        };

        const twinAccounts = validTwinks.map(twink => ({
            telegramId: twink.telegramId,
            username: twink.username?.toLowerCase().replace('@', '')
        }))



        const data = await onRequest(AdminService.addScammer(submitData, twinAccounts));
        if (data) {
            toast.success("Человек успешно занесен в базу");
        }
    };

    const addTwinksElement = () => {
        return (
            <Block title="Твинки">
                <Button
                    icon={<PlusIcon />}
                    text="Добавить твинк"
                    FC={addTwink}
                    color="green"
                />

                {twinks.length === 0 && (
                    <p className="text-gray-400 text-sm">Твинки не добавлены</p>
                )}

                {twinks.map((twink, index) => (
                    <Block key={index} title={`Твинк ${index + 1}`}>
                        <Button
                            icon={<TrashIcon />}
                            text=" "
                            FC={() => removeTwink(index)}
                            color="red"
                            widthMin
                            className="absolute top-1 right-1 !p-1"
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <Input
                                name="telegramId"
                                type="number"
                                value={twink.telegramId || ''}
                                onChange={(e) => updateTwink(index, 'telegramId', e.target.value)}
                                placeholder="Введите Telegram ID"
                                isRequired={false}
                            />

                            <Input
                                name="username"
                                type="text"
                                value={twink.username || ''}
                                onChange={(e) => updateTwink(index, 'username', e.target.value)}
                                placeholder="Введите username"
                                isRequired={false}
                            />
                        </div>
                    </Block>
                ))}
            </Block>
        )
    }

    return (
        <PageContainer title="Занести в базу" itemsStart returnPage>
            <Form
                config={formConfig}
                message="Человек успешно занесен в базу"
                onSubmit={handleSubmit}
                title="Информация о человеке"
                icons={[]}
                customElements={
                    <>
                        {addTwinksElement()}
                    </>
                }
            />
        </PageContainer>
    );
};
