import { toast } from "react-toastify";
import { Navigate } from "react-router-dom";
import { useStore } from "@/store/root.store";

export const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) => {
    const { userStore: { isLoading, userRole } } = useStore()
    if (isLoading) {
        return
    }

    if (!userRole || !allowedRoles.includes(userRole)) {
        toast.error('You have no rights');
        return <Navigate to="/" replace />;
    }

    return children;
}