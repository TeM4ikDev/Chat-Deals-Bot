
import { PageContainer } from "@/components/layout/PageContainer";
import { Block } from "@/components/ui/Block";
import { Button } from "@/components/ui/Button";
import { AdminService } from "@/services/admin.service";
import { onRequest } from "@/utils/handleReq";
import { AlertTriangle, Bot, CheckCircle, Crown, Database, MessageCircle, Shield, Star, UserCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const MainPage: React.FC = () => {
    const [garants, setGarants] = useState<{ username: string }[] | null>(null);
    const [isLoadingGarants, setIsLoadingGarants] = useState(false);

    const getGarants = async () => {
        setIsLoadingGarants(true);
        const data = await onRequest(AdminService.getAllGarants());
        if (data) {
            setGarants(data);
        }
        setIsLoadingGarants(false);
    };

    useEffect(() => {
        getGarants();
    }, []);

    return (
        <PageContainer title="" itemsStart loading={false}>
            <div className="flex flex-col justify-center items-center gap-2 w-full max-w-4xl">

                <Block
                    title="🏆 Список ТОП Гарантов"
                    icons={[<Crown className="w-6 h-6 text-yellow-400" />]}
                    variant="lighter"
                >
                    {isLoadingGarants ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        </div>
                    ) : !garants || garants.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Crown className="w-16 h-16 text-gray-500 mb-4" />
                            <h3 className="text-xl font-semibold text-gray-400 mb-2">Гаранты не найдены</h3>
                            <p className="text-gray-500">Список гарантов пуст</p>
                        </div>
                    ) : (
                        <div className="grid gap-1 p-1">
                            {garants.map((garant, index) => (
                                <Link to={`https://t.me/${garant.username}`}>
                                    <Block key={index} className="!flex-row justify-between">
                                        <div className="flex flex-row items-center gap-4">
                                            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                                                <Crown className="w-5 h-5 text-white" />
                                            </div>
                                            <div className="flex flex-col">
                                                <h4 className="font-semibold text-white">{garant.username}</h4>
                                                {/* <span className="text-sm text-gray-400">ТОП Гарант</span> */}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Star className="w-4 h-4 text-yellow-400" />
                                            <span className="text-sm text-gray-400">Проверен</span>
                                        </div>
                                    </Block>

                                </Link >

                            ))}
                        </div>
                    )}
                </Block>

                <Block
                    title="Просмотр жалоб"
                    icons={[<AlertTriangle className="w-6 h-6 text-red-400" />]}
                    variant="lighter"
                    subtitle=' Посмотрите все поданные жалобы'
                >
                    <div className="flex flex-col gap-2 p-1">
                        {/* <p className="text-gray-300 text-center">
                           
                        </p> */}
                        <Button
                            text="Перейти к жалобам"
                            routeKey="SCAMFORMS"
                            icon={<MessageCircle className="w-5 h-5" />}
                            color="blue"
                            className="w-full"
                        />
                    </div>
                </Block>

                <Block
                    title="База данных скамеров"
                    icons={[<Database className="w-6 h-6 text-red-400" />]}
                    variant="lighter"
                    subtitle='Просмотр базы данных скамеров и подозрительных пользователей'
                >
                    <div className="flex flex-col gap-2 p-1">
                        <Button
                            text="Перейти к базе данных"
                            routeKey="SCAMMERS"
                            icon={<Database className="w-5 h-5" />}
                            color="red"
                            className="w-full"
                        />
                    </div>
                </Block>

                <Block
                    title="ℹ️ Что ты можешь сделать в личке бота"
                    icons={[<Bot className="w-6 h-6 text-blue-400" />]}
                    variant="lighter"
                >
                    <div className="flex flex-col gap-2 p-2">
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-sm font-bold">1</span>
                            </div>
                            <span className="text-gray-300">Отправить @username</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-sm font-bold">2</span>
                            </div>
                            <span className="text-gray-300">Переслать сообщение человека</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-sm font-bold">3</span>
                            </div>
                            <span className="text-gray-300">Нажать на «Выбрать пользователя»</span>
                        </div>
                    </div>
                </Block>

                <Block
                    title="💪 Что отправит бот в ответ"
                    icons={[<Shield className="w-6 h-6 text-green-400" />]}
                    variant="lighter"
                >
                    <div className="flex flex-col gap-2 p-2">
                        <div className="flex items-center gap-3">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                            <span className="text-gray-300">ID пользователя</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                            <span className="text-gray-300">Наличие в скам базе</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <UserCheck className="w-5 h-5 text-blue-400" />
                            <span className="text-gray-300">Наличие в базе проверенных исполнителей</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Star className="w-5 h-5 text-yellow-400" />
                            <span className="text-gray-300">Наличие в базе ТОП Гарантов</span>
                        </div>
                    </div>
                </Block>

                <Block
                    title="❓ Есть жалоба на мошенника?"
                    icons={[<MessageCircle className="w-6 h-6 text-orange-400" />]}
                    variant="lighter"
                >
                    <div className="flex flex-col gap-2 p-1">
                        <p className="text-gray-300 text-center">
                            Помогите сообществу, сообщив о мошеннике
                        </p>
                        <Button
                            text="Подать жалобу"
                            icon={<AlertTriangle className="w-5 h-5" />}
                            color="red"
                            className="w-full"
                            href="https://t.me/svdbasebot?start="
                            openNewPage
                        />
                    </div>
                </Block>

               

            </div>
        </PageContainer>
    );
};

export default MainPage;