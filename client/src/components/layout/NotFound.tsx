import { Button } from "@/components/ui/Button";
import type { RouteKey } from "@/types/routes/routeKeys";
import { cn } from "@/utils/cn";
import { ArrowBigLeft } from "lucide-react";
import { PageContainer } from "./PageContainer";

interface NotFoundPageProps {
    title?: string;
    description?: string;
    showButton?: boolean;
    buttonText?: string;
    buttonRouteKey?: RouteKey;
    className?: string;
}

const NotFound: React.FC<NotFoundPageProps> = ({
    title = "Страница не найдена",
    description = "Извините, но страница, которую вы ищете, не существует или была перемещена.",
    showButton = true,
    buttonText = "Вернуться на главную",
    buttonRouteKey = "HOME",
    className = ''
}) => {
   
    return (
        <PageContainer className={cn("justify-center", className)}>
            <div className="flex flex-col text-center items-center max-w-2xl mx-auto p-8 space-y-8">
                <div className="space-y-6">
                    <h1 className="text-3xl font-bold text-gray-100 dark:text-white">
                        {title}
                    </h1>
                    <p className="text-xl font-bold text-gray-600 dark:text-gray-400">
                        {description}
                    </p>
                </div>

                {showButton && (
                    <Button
                        text={buttonText}
                        routeKey={buttonRouteKey}
                        icon={<ArrowBigLeft />}
                        widthMin={true}
                    />
                )}
            </div>
        </PageContainer>
    );
};

export default NotFound;