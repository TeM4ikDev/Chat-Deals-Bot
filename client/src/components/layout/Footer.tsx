import { appName } from "@/types";
import { Logo } from "./Logo";

interface FooterProps {
    className?: string;
}

export const Footer: React.FC = () => {
    return (
        <footer className="bg-gradient-to-b from-gray-900 to-gray-950 text-white w-full py-4 sm:py-6 px-3 sm:px-4 mt-auto">
            <div className="max-w-7xl mx-auto flex flex-col items-center">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-6 mb-4 sm:mb-6">
                    <div className="flex flex-col items-center gap-2">
                        <Logo className="w-auto h-6 sm:h-8" />
                    </div>
                </div>

                <div className="border-t border-gray-800/30 pt-3 sm:pt-4">
                    <p className="text-xs sm:text-sm text-gray-500 text-center">
                        &copy; {new Date().getFullYear()} {appName}. Все права защищены.
                    </p>
                </div>
            </div>
        </footer>
    );
};
