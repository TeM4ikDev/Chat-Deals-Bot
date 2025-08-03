import { Prisma } from "@prisma/client";

export const superAdminsTelegramIds = ['2027571609', '1162525174']

export type IUser = Prisma.UserGetPayload<{}>

export interface ITelegramUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    is_premium?: boolean;
}

export interface ITelegramCommand {
  command: string | RegExp;
  description?: string;
}

export enum BotScenes {
  MIN_PROFIT = 'MINPROFIT'

}