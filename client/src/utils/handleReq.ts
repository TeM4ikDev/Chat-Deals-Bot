import { AxiosError } from 'axios';
import { toast } from 'react-toastify';


export async function onRequest<T>(request: Promise<T>): Promise<T | null> {
    try {
        return await request;
    } catch (err: any) {
        console.log(err)
        toast.error(handleError(err));
        return null
    }
}


export function handleError(error: unknown): string {
    if (error instanceof AxiosError) {
        return error.response?.data?.message || "Произошла ошибка при запросе. Попробуйте позже.";
    }
    if (error instanceof Error) {
        return error.message;
    }
    return "Произошла неизвестная ошибка. Попробуйте позже.";
}
