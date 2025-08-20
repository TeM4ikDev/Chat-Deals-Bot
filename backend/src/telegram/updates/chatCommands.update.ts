import { AdminService } from "@/admin/admin.service";
import { UserCheckMiddleware } from "@/auth/strategies/telegram.strategy";
import { ScamformService } from "@/scamform/scamform.service";
import { IUser } from "@/types/types";
import { UsersService } from "@/users/users.service";
import { UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma, ScammerStatus, UserRoles } from "@prisma/client";
import * as fs from 'fs';
import { Ctx, On, Update } from "nestjs-telegraf";
import { Context } from "telegraf";
import { IMAGE_PATHS } from "../constants/telegram.constants";
import { Language } from "../decorators/language.decorator";
import { LocalizationService } from "../services/localization.service";
import { TelegramService } from "../telegram.service";
import e from "express";




@UseGuards(UserCheckMiddleware)
@Update()
export class ChatCommandsUpdate {

    constructor(
        protected readonly telegramService: TelegramService,
        protected readonly configService: ConfigService,
        protected readonly userService: UsersService,
        private readonly scamformService: ScamformService,
        private readonly localizationService: LocalizationService,

        private readonly adminService: AdminService,

    ) { }

    @On('message')
    async findUser(@Ctx() ctx: Context, @Language() lang: string) {
        const message = ctx.text?.trim().replace('@', '');
        if (!message) return;

        const words = message.split(/\s+/).filter(word => word.length > 0);
        const command = words[0].toLowerCase();

        const commandData = words.slice(2).join(' ');


        if ('reply_to_message' in ctx.message && ctx.message.reply_to_message) {
            const repliedMessage = ctx.message.reply_to_message;
            const user = repliedMessage.from;
            if (!user) return;

            const msg = message.toLowerCase().replace('@', '');

            const telegramId = user.username || user.id.toString()
            const word = msg.split(' ')[1]

            const commandData = words.slice(1).join(' ');

            const { user: repliedUser } = await this.userService.findOrCreateUser(user);

            // console.log('repliedUser ___________________', repliedUser)

            switch (msg) {
                case 'чек':
                    await this.checkUserAndSendInfo(ctx, telegramId, lang);
                    break;

                case '+адм':
                    if (!await this.guardCommandRoles([UserRoles.SUPER_ADMIN], ctx, repliedUser)) return
                    await this.handleAdmin(ctx, repliedUser, true);
                    break;

                case '-адм':
                    if (!await this.guardCommandRoles([UserRoles.SUPER_ADMIN], ctx, repliedUser)) return
                    await this.handleAdmin(ctx, repliedUser, false);
                    break;
            }
            await this.handlePrefixCommands(ctx, msg, repliedUser, word, commandData);
            return;
        }

        switch (command) {
            case 'чек':
                await this.handleCheckCommand(ctx, words[1], lang);
                break;

            case 'инфо':
                // if (!await this.guardCommandRoles([UserRoles.SUPER_ADMIN, UserRoles.ADMIN], ctx)) return
                await this.handleDescriptionCommand(ctx, words[1], commandData);
                break;

            case 'статус':
                await this.handleStatus(ctx, undefined, words[2], words[1]);
                break;
        }
    }

    private async handlePrefixCommands(ctx: Context, message: string, repliedUser: IUser, word: string, commandData?: string) {
        if (message.startsWith('статус')) {
            if (!await this.guardCommandRoles([UserRoles.SUPER_ADMIN, UserRoles.ADMIN], ctx, repliedUser)) return

            await this.handleStatus(ctx, repliedUser, word);
            return;
        }

        if (message.startsWith('инфо')) {
            // if (!await this.guardCommandRoles([UserRoles.SUPER_ADMIN, UserRoles.ADMIN], ctx, repliedUser)) return

            await this.handleDescriptionCommand(ctx, word, commandData, repliedUser);
            return;
        }
    }

    private async guardCommandRoles(roles: UserRoles[], adminAddCtx: Context, userAction?: IUser) {

        const admin = await this.userService.findUserByTelegramId(adminAddCtx.from.id.toString());


        // console.log('admin', admin)

        // if (!userAction) {
        //   adminAddCtx.reply('Пользователя нет в боте. Ему нужно сначала зайти в бота.', {
        //     reply_markup: {
        //       inline_keyboard: [
        //         [{
        //           text: 'Зайти в бота',
        //           url: 'https://t.me/svdbasebot'
        //         }]
        //       ]
        //     }
        //   });
        //   return false;
        // }


        // if (this.checkIsGarant(userAction?.username)) {
        //   // await adminAddCtx.reply('Это гарант. Вы не можете изменить его статус');
        //   return false
        // }

        if (userAction && userAction.role === UserRoles.SUPER_ADMIN) {
            adminAddCtx.reply('Пользователь супер админ');
            return false
        }



        if (roles.includes(admin.role)) {
            return true;
        }

        await adminAddCtx.reply('У вас нет доступа к этой команде');
        return false;

    }

    private async handleAdmin(ctx: Context, user: IUser, isAdd: boolean) {
        await this.userService.updateUserRole(user.telegramId, isAdd ? UserRoles.ADMIN : UserRoles.USER)
        ctx.reply(`Пользователь (@${user.username}) ${isAdd ? 'теперь' : 'больше не'} админ`)
    }

    private async checkUserAndSendInfo(ctx: Context, query: string, lang: string) {
        const isGarant = await this.checkAndSendGarantInfo(ctx, query, lang);
        if (isGarant) return

        const scammer = await this.scamformService.getScammerByQuery(query);
        console.log(scammer)

        await this.onScammerDetail(ctx, lang, scammer, query);
    }

    private async checkAndSendGarantInfo(ctx: Context, query: string, lang: string): Promise<boolean> {
        if (await this.checkIsGarant(query)) {
            const photoStream = fs.createReadStream(IMAGE_PATHS.GARANT);
            await ctx.replyWithPhoto(
                { source: photoStream },
                {
                    caption: this.localizationService.getT('userCheck.garantUser', lang)
                        .replace('{username}', query),
                    parse_mode: 'Markdown',
                }
            );
            return true;
        }

        return false;
    }

    private async handleDescriptionCommand(ctx: Context, query: string, commandData: string, userAction?: IUser) {

        const user = await this.userService.findUserByTelegramId(ctx.from.id.toString())

        const description = commandData

        console.log('description', description)
        console.log('query', query)

        query = userAction?.username || userAction?.telegramId || query

        if (!query && !userAction) {
            await ctx.reply('Пожалуйста, укажите имя пользователя. Пример: инфо @username или ответьте на сообщение пользователя словом "инфо"');
            return;
        }

        if (user.role != UserRoles.SUPER_ADMIN && user.role != UserRoles.ADMIN && commandData) {
            await ctx.reply('У вас нет доступа к изменению описания');
            return;
        }

        const scammer = await this.scamformService.getScammerByQuery(query);

        if (await this.checkIsGarant(query)) {
            const garant = await this.userService.findGarantByUsername(query)
            if (garant) {
                await ctx.reply(this.localizationService.getT('commands.userDescription')
                    .replace('{query}', this.telegramService.escapeMarkdown(query))
                    .replace('{description}', garant.description || 'Описание отсутствует'), {
                    parse_mode: 'Markdown'
                })
                return;
            }

            // await ctx.reply('Это гарант. Вы не можете изменить его описание');
            return;
        }



        if (!scammer) {
            await ctx.reply('Пользователь не найден');
            return;
        }

        if (!description) {
            await ctx.reply(this.localizationService.getT('commands.userDescription')
                .replace('{query}', this.telegramService.escapeMarkdown(query))
                .replace('{description}', scammer.description || 'Описание отсутствует'), {
                parse_mode: 'Markdown'
            })
            return;
        }

        await this.scamformService.updateScammer(scammer.id, { description })
        await ctx.reply(`Описание пользователя (@${scammer.username}) обновлено`)
    }

    private async handleCheckCommand(ctx: Context, query: string, lang: string) {
        if (!query) {
            await ctx.reply('Пожалуйста, укажите имя пользователя.\n\nПример: чек @username или ответьте на сообщение пользователя словом "чек"');
            return;
        }

        await this.checkUserAndSendInfo(ctx, query, lang);
    }

    private async handleDirectSearch(ctx: Context, message: string, lang: string) {
        const query = message.trim().replace('@', '');

        await this.checkUserAndSendInfo(ctx, query, lang);
    }

    private async checkIsGarant(username: string): Promise<boolean> {
        const garants = await this.userService.findGarants();

        if (!username) return

        return garants.some(garant =>
            garant.username?.toLowerCase() === username.toLowerCase()
        );
    }

    private async handleStatus(ctx: Context, repliedUser: IUser, statusText: string, query?: string) {
        let status: ScammerStatus;

        const user = await this.userService.findUserByTelegramId(ctx.from.id.toString())
        // let scammer

        console.log(query)

        console.log(statusText)




        // return
        let queryFind
        if (query) {

            if (await this.checkIsGarant(query)) {
                await ctx.reply('Это гарант. Вы не можете изменить его статус');
                return;
            }

            const exsScammer = await this.scamformService.getScammerByQuery(query)


            if (!exsScammer) {
                ctx.reply('Пользователь не найден в скам базе')
                return
            }

            if (user.role != UserRoles.SUPER_ADMIN && user.role != UserRoles.ADMIN && exsScammer) {
                await ctx.reply('У вас нет доступа к изменению статуса');
                return;
            }





            queryFind = { username: query, id: exsScammer?.telegramId || null }
        }
        else if (repliedUser) {
            queryFind = { id: repliedUser.telegramId, username: repliedUser.username }
        }
        else {
            ctx.reply('Пожалуйста, укажите имя пользователя. Пример: статус @username или ответьте на сообщение пользователя словом "статус"')
            return
        }

        console.log(queryFind, 'queryFind')


        const scammer = await this.scamformService.findOrCreateScammer(queryFind);


        if (!statusText) {
            await ctx.reply(`${scammer ? `Статус @${scammer?.username} ${scammer.status}` : 'Пользователь не найден'}.\n\nЧтобы задать статус, выберите из списка: скам, неизв, подозр`);
            return;
        }

        switch (statusText) {
            case 'скам':
                status = ScammerStatus.SCAMMER;
                break;

            case 'неизв':
                status = ScammerStatus.UNKNOWN;
                break;

            case 'подозр':
                status = ScammerStatus.SUSPICIOUS;
                break;
        }

        let result;

        // if (repliedUser) {
        //     result = await this.scamformService.updateScammerStatus({
        //         scammerId: scammer.id,
        //         status,
        //         formId: undefined
        //     }, repliedUser);

        // }
        // else{
        result = await this.scamformService.updateScammerStatusByUsername({
            scammerId: scammer.id,
            status,
            formId: undefined
        });
        // }



        if (result.isSuccess && result.scammer) {
            await ctx.reply(`Статус пользователя (@${result.scammer.username || scammer.username}) изменен на ${result.scammer.status}`);
        }
        else {
            await ctx.reply(`Ошибка при обновлении статуса: ${result.message}`);
        }
    }

    async onScammerDetail(
        @Ctx() ctx: Context,
        lang: string,
        scammer: Prisma.ScammerGetPayload<{ include: { scamForms: true } }> | null,
        query: string
    ) {
        if (!scammer) {
            const photoStream = fs.createReadStream(IMAGE_PATHS.UNKNOWN);
            await ctx.replyWithPhoto(
                { source: photoStream },
                {
                    caption: this.localizationService.getT('userCheck.userNotFound', lang).replace('{userinfo}', this.telegramService.escapeMarkdown(query)),
                    parse_mode: 'Markdown',

                }
            );
            return;
        }

        const username = scammer.username ? `${scammer.username}` : this.localizationService.getT('userCheck.noUsername', lang);
        const telegramId = scammer.telegramId || '--';
        const formsCount = scammer.scamForms.length;
        let status = scammer.status
        const link = `https://t.me/svdbasebot/scamforms?startapp=${scammer.username || scammer.telegramId}`;
        let photoStream = fs.createReadStream(IMAGE_PATHS[status]);


        if (scammer.username.replace('@', '') == 'TeM4ik20') {
            photoStream = fs.createReadStream(IMAGE_PATHS.OGUREC);
            status = 'DIKIJ OGUREC' as ScammerStatus
        }

        const escapedUsername = this.telegramService.escapeMarkdown(scammer.username);

        await ctx.replyWithPhoto(
            { source: photoStream },
            {
                caption: this.localizationService.getT('userCheck.userDetails', lang)
                    .replace('{username}', escapedUsername)
                    .replace('{telegramId}', telegramId)
                    .replace('{status}', status)
                    .replace('{formsCount}', formsCount.toString())
                    .replace('{description}', scammer.description || 'нет описания')
                    .replace('{link}', link),
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{
                            text: `👍 ${scammer.likes}`,
                            callback_data: `like_user:${scammer.id}`
                        },
                        {
                            text: `👎 ${scammer.dislikes}`,
                            callback_data: `dislike_user:${scammer.id}`
                        }]
                    ]
                }
            }
        );
    }

}