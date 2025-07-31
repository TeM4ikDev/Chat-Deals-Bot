import { Button } from "@/components/ui/Button";
import { Section } from "@/components/ui/Section";
import { ShieldAlert } from "lucide-react";

export const NoRightsPage: React.FC = () => {
    return (
        <Section className="min-h-[calc(100vh-200px)] p-3 flex items-center justify-center">
            <div className="flex flex-col items-center gap-6 text-center max-w-md p-8 bg-gray-800/50 rounded-lg backdrop-blur-sm border border-gray-700">
                <div className="p-4 bg-red-500/20 rounded-full">
                    <ShieldAlert className="h-12 w-12 text-red-400" />
                </div>
                <h1 className="text-2xl font-bold text-gray-100">Доступ ограничен</h1>
                <p className="text-gray-400">
                    Для доступа к этой странице требуются специальные права. 
                    Пожалуйста, обратитесь к администратору через Telegram бота для получения доступа.
                </p>
                <Button 
                    text="Перейти в Telegram бота"
                    href="https://t.me/GiftGardBot"
                    openNewPage={true}
                    color="blue"
                    className="mt-4"
                />
            </div>
        </Section>
    );
};

export default NoRightsPage;
