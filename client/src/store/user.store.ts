import { AuthService } from "@/services/auth.service";
import { ITelegramUser, IUser } from "@/types/auth";
import { onRequest } from "@/utils/handleReq";
import { setTokenToLocalStorage } from "@/utils/localstorage";
import { makeAutoObservable, runInAction } from "mobx";
import { fromPromise } from "mobx-utils";

const mockData = {
    id: 2027571609,
    first_name: "Artem",
    last_name: "",
    username: "TeM4ik20",
    language_code: "ru",
    is_premium: true,
    allows_write_to_pm: true,
    photo_url: "https://t.me/i/userpic/320/kf7ulebcULGdGk8Fpe4W3PkcpX2DxWO1rIHZdwT60vM.svg"
};

class UserStore {
    user: IUser | null = null;
    isAuth: boolean = false;
    isLoading: boolean = true;
    updateTrigger: boolean = false;

    constructor() {
        makeAutoObservable(this);
        this.checkAuth();
    }

    checkAuth = () => {
        this.isLoading = true;
        const authPromise = fromPromise(this.getAuthPromise());

        authPromise.then(
            (data) => {
                runInAction(() => {
                    if (data?.user) {
                        setTokenToLocalStorage(data.token);
                        this.login(data.user);
                    } else {
                        this.logout();
                    }
                });
            },
            (error) => {
                console.error("Ошибка при получении профиля:", error);
                runInAction(() => {
                    this.logout();
                });
            }
        );
    };

    getAuthPromise(): Promise<{ token: string, user: IUser }> {
        if (import.meta.env.DEV) {
            return onRequest(AuthService.login(mockData));
        } else {
            const newUserData = window.Telegram?.WebApp?.initDataUnsafe?.user;
            if (newUserData) {
                return onRequest(AuthService.login(newUserData as ITelegramUser));
            } else {
                return Promise.reject('no telegram data');
            }
        }
    }

    login(userData: IUser) {
        this.user = userData;
        this.isAuth = true;
        this.isLoading = false;
    }

    logout() {
        this.isAuth = false;
        this.user = null;
        this.isLoading = false;
    }

    setLoading(loading: boolean) {
        this.isLoading = loading;
    }

    updateData() {
        this.updateTrigger = !this.updateTrigger;
    }

    get userRole() {
        return this.user?.role;
    }
}

export default new UserStore(); 