

// export interface IUser {
//     id: string;
//     telegramId: string;
//     username?: string;
//     lastName?: string;
//     firstName?: string;
//     role: UserRoles;
//     // hasAccess: boolean;


export enum UserRoles {
    Admin = 'ADMIN',
    User = 'USER',
    SuperAdmin = 'SUPER_ADMIN',
}


//     UsersConfig?: IUsersConfig;
//     createdAt: Date;
//     updatedAt: Date;
// }

export interface IUser {
    id: string;
    role: UserRoles;
    banned: boolean;
    name: string;

    telegramId: string;
    username: string;
    firstName?: string;
    lastName?: string;
    photoUrl: string;

}

export interface IEmailAuth {
    email: string
}

export interface ITelegramUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
}






export interface IUsersConfig {
    id: string;

    tonWallet: string
    card: string
    language: string
}



export interface TelegramLoginButtonType {
    botName: string;
    usePic: boolean;
    className?: string;
    cornerRadius?: number;
    requestAccess?: boolean;
    wrapperProps?: any;
    dataOnauth?: (res: any) => void;
    dataAuthUrl?: string;
    buttonSize: "large" | "medium" | "small";
}

export interface ITelegramAuth {
    id: number;
    first_name: string;
    last_name: string;
    username: string;
    photo_url: string;
    auth_date: number;
    hash: string;
}

export interface IGoogleAuth {
    clientId?: string;
    credential: string;
    select_by?: string;

}


