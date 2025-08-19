import { PageContainer } from "@/components/layout/PageContainer";
import { Form } from "@/components/ui/Form";
import { AdminService } from "@/services/admin.service";
import { ScammerStatus } from "@/types";
import { FormConfig } from "@/types/form";
import { onRequest } from "@/utils/handleReq";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

export const AddPerson = () => {
    const navigate = useNavigate();

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

    const handleSubmit = async (values: { telegramId: string; username?: string; status: string }) => {

        if (!values.telegramId && !values.username) {
            toast.error("Необходимо ввести Telegram ID или username")
            return
        }
        values.username = values.username?.toLowerCase().replace('@', '')
        const data = await onRequest(AdminService.addScammer(values));
        if (data) {
            toast.success("Человек успешно занесен в базу");
        }
    };

    return (
        <PageContainer title="Занести в базу" itemsStart returnPage>

            <Form
                config={formConfig}
                message="Человек успешно занесен в базу"
                onSubmit={handleSubmit}
                title="Информация о человеке"
                icons={[]}
            />
        </PageContainer>
    );
};
