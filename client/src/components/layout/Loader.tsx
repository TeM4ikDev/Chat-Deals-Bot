import { motion } from 'framer-motion';
import { PageContainer } from './PageContainer';

export const Loader = () => (
    <PageContainer className="flex relative justify-center h-screen items-center w-full min-h-[200px]">
        {/* <></> */}
        <div className="flex flex-col gap-2 items-center">
            <div className="flex gap-2">
                {[0, 1, 2].map(i => (
                    <motion.span
                        key={i}
                        className="w-4 h-4 rounded-full bg-cyan-400"
                        animate={{
                            y: [0, -12, 0],
                            opacity: [0.7, 1, 0.7],
                        }}
                        transition={{
                            duration: 0.8,
                            repeat: Infinity,
                            delay: i * 0.2,
                        }}
                    />

                ))}
            </div>
            <span className="ml-4 text-cyan-300 font-semibold text-lg">Загрузка страницы...</span>
        </div>
    </PageContainer>
);
