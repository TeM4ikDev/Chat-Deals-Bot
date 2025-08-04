import { useStore } from "@/store/root.store"
import { cn } from "@/utils/cn"
import { motion } from "framer-motion"
import { ArrowLeft, LogOut } from "lucide-react"
import React, { ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { Block } from "../ui/Block"
import { Button } from "../ui/Button"
import { Loader } from "./Loader"

interface PageContainerProps {
    title?: string
    children: ReactNode
    className?: string
    returnPage?: boolean
    loading?: boolean
    itemsStart?: boolean,
    needAuth?: boolean
}

const headerHeight = '96px';
const headerHeightMobile = '80px';

export const PageContainer: React.FC<PageContainerProps> = ({ title, children, className, returnPage, loading = false, itemsStart = false, needAuth = false }) => {
    const navigate = useNavigate()
    const { userStore: { user, isLoading } } = useStore()

    if (needAuth && !user && !isLoading) {
        return (
            <PageContainer itemsStart>
                <Block  
                    title="Вы не авторизованы"
                    icons={[<LogOut />]}
                    className="!max-w-[500px] mt-10 p-5 gap-5"
                    variant="darker"
                    titleCenter
                    mediumTitle
                >
                    <Button text="На главную" routeKey="HOME" />
                </Block>
            </PageContainer>
        )
    }

    return (
        <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className={cn(
                "flex flex-1 flex-col w-full h-full md:px-4 z-10 p-2 items-center",
                !itemsStart ? "justify-center" : "justify-start",
                "mt-[64px] md:mt-[64px]",
                "!min-h-[calc(100vh-64px)] md:!min-h-[calc(100vh-64px)]",
                className
            )}
        >
            {title && (
                <div className="relative w-full flex justify-center items-center p-2 pt-2">
                    <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 text-center">
                        {title}
                    </h1>
                    {returnPage && (
                        <div className="absolute left-0">
                            <Button icon={<ArrowLeft />} FC={() => navigate(-1)} />
                        </div>
                    )}
                </div>
            )}


            {!loading ? children : <Loader />}
        </motion.section>
    )
}
