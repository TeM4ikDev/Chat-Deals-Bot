import { AuthService } from "@/services/auth.service";
import { ITelegramUser, IUser } from "@/types/auth";
import { onRequest } from "@/utils/handleReq";
import { getDataFromLocalStorage, removeDataFromLocalStorage, removeTokenFromLocalStorage, setDataToLocalStorage, setTokenToLocalStorage } from "@/utils/localstorage";
import { makeAutoObservable, runInAction } from "mobx";
import { toast } from "react-toastify";

class UserStore {
    user: IUser | null = null;
    isAuth = false;
    isLoading = false;
    updateTrigger = false;

    constructor() {
        makeAutoObservable(this);
        this.checkAuth();
    }

    checkAuth = async () => {
        this.isLoading = true;
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const dataParam = urlParams.get('data');
    
            let userData: ITelegramUser | null = null;
    
            if (dataParam) {
                try {
                    const decodedData = decodeURIComponent(dataParam);
                    userData = JSON.parse(decodedData);
    
                    if (!userData || typeof userData !== 'object' || !userData.id) {
                        throw new Error('Неверная структура данных пользователя');
                    }
    
                    setDataToLocalStorage('userData', userData);
    
                    const newUrl = window.location.pathname + window.location.hash;
                    window.history.replaceState({}, '', newUrl);
    
                    toast.success('Данные пользователя успешно получены');
                } catch (error) {
                    console.error('Ошибка при парсинге данных из URL:', error);
                    toast.error('Неверный формат данных в URL');
                    removeDataFromLocalStorage('userData');
                }
            } else {
                userData = getDataFromLocalStorage('userData');
            }
    
    
            if (userData) {
                const data: { token: string, user: IUser } = await onRequest(AuthService.login(userData));
    
                console.log(data)
    
                setTokenToLocalStorage(data.token);
                this.login(data);
            } else {
                toast.warning('Нет данных пользователя');
                this.logout();
            }
    
        } catch (error) {
            console.error("Ошибка при получении профиля:", error);
            runInAction(() => {
                this.logout();
                this.isLoading = false;
            });
        }
    };

    setUser = (user: IUser) => {
        this.user = user;
    };

    login = (userData: { user: IUser; token: string }) => {
        setTokenToLocalStorage(userData.token);
        runInAction(() => {
            this.setUser(userData.user);
            this.isAuth = true;
            this.isLoading = false;
        });
    };


    logout = () => {
        runInAction(() => {
            removeTokenFromLocalStorage();
            this.isAuth = false;
            this.user = null;
            this.isLoading = false;
        });
    };

    setLoading = (loading: boolean) => {
        this.isLoading = loading;
    };

    updateData = () => {
        this.updateTrigger = !this.updateTrigger;
    };

    get userRole() {
        return this.user?.role;
    }
}

export default new UserStore(); 