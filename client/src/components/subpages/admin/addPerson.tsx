import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";
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
                required: true
            },
            {
                name: "username",
                label: "Username (необязательно)",
                type: "text",
                placeholder: "Введите username",
                required: false
            }
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
            }
        ]
    };

    const handleSubmit = async (values: { telegramId: string; username?: string; status: string }) => {
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
