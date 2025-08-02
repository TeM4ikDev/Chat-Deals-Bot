import logo from "@/assets/logo.png";
import { Link } from "react-router-dom";
import { appName } from "@/types";
import { cn } from "@/utils/cn";
import { useStore } from "@/store/root.store";
import { observer } from "mobx-react-lite";

interface Props {
    className?: string;
}

export const Logo: React.FC<Props> = observer(({ className }) => {
    const { routesStore: { getPathByKey } } = useStore();
    return (
        <div className={cn("flex gap-2 items-center z-50 py-1 h-min mr-auto", className)}>
            <img src={logo} color="white" alt="logo" className="w-12 filter invert" />
            <Link to={getPathByKey('HOME')}>
                <span className="font-pixel p-1 text-nowrap text-lg sm:text-xl bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 text-transparent bg-clip-text">
                    {appName}   
                </span>
            </Link>
        </div>
    )
})

