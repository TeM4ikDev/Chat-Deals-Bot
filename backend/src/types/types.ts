import { Prisma } from "@prisma/client";

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


export interface ITgUser {
  username?: string;
  telegramId?: string;
  registrationDate?: Date;
  collectionUsernames?: string[];
}




export interface IUserTwink{
  username?: string
  telegramId?: string
  collectionUsernames?: string[];
  registrationDate?: Date
}


export interface IScammerData {
  username?: string
  telegramId?: string
  twinAccounts?: IUserTwink[];
  collectionUsernames?: string[];
  registrationDate?: Date
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
  scammerData: IScammerData,
  media: Array<IMediaData>,
}

export interface IUserInfoForm {
  step: number;
  addresses: string[];
  keyboardUrls: string[];
  currentInput: 'address' | 'url' | null;
  lastInstructionMessageId?: number;
}

export interface IUserInfoSession {
  userInfoForm?: IUserInfoForm;
}

declare module 'telegraf' {
  interface SessionData {
    userInfoForm?: IUserInfoForm;
  }
}


