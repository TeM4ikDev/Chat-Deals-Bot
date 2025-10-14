import axios from "axios";
import { getTokenFromLocalStorage } from "@/utils/localstorage";

const prefix = import.meta.env.DEV ? 'http://localhost:3030' : ''

console.log(import.meta.env)


export const createAxiosInstance = (basePath: string) => {


    const instance = axios.create({
        baseURL: `${prefix}/api/${basePath}`,
        headers: {
            Authorization: 'Bearer ' + (getTokenFromLocalStorage() || '')
        }
    });

    instance.interceptors.request.use(
        config => {
            const token = getTokenFromLocalStorage();
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        },
        error => {
            return Promise.reject(error);
        }
    );

    return instance;
};
