import { ITelegramCommand } from '@/types/types';
import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Action, } from 'nestjs-telegraf';

export const Command = (command: ITelegramCommand) => {
    return SetMetadata('telegramCommand', command);
};

export const ActionParam = createParamDecorator(
    (data: number, ctx: ExecutionContext) => {
        const telegrafCtx = ctx.getArgByIndex(0);
        const dataCallback = telegrafCtx.callbackQuery?.data?.split(':').slice(1);
        console.log(dataCallback)
        return dataCallback[data];
    },
);


export function getActionParams(ctx: any): string[] {
    // console.log(ctx)
    const dataCallback = (ctx as any).callbackQuery?.data?.split(':').slice(1);
    // console.log(dataCallback)
    return dataCallback;
}

export const ActionWithData = (actionPrefix: string) => {
    const regex = new RegExp(`${actionPrefix}:(.+)`);
    console.log(`ActionWithData regex: ${regex}`);
    return Action(regex);
}