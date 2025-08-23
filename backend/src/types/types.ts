import { Prisma, ScamForm } from "@prisma/client";

export const superAdminsTelegramIds = ['1162525174', '2027571609']

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


export interface IScammerData {
  username?: string
  telegramId?: string
}

export interface IMediaData {
  type: string;
  file_id: string;
}

export interface IMessageDataScamForm {
  fromUser: {
    username: string,
    telegramId: string
  },
  scamForm: ScamForm,
  scammerData: IScammerData,
  media: Array<IMediaData>,
}


