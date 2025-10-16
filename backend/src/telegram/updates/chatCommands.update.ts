import { UserCheckMiddleware } from "@/auth/strategies/telegram.strategy";
import { ScamformService } from "@/scamform/scamform.service";
import { IScammerPayload, IUser } from "@/types/types";
import { UsersService } from "@/users/users.service";
import { UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ScammerStatus, UserRoles } from "@prisma/client";
import * as fs from 'fs';
import { Ctx, On, Update } from "nestjs-telegraf";
import { Context } from "telegraf";
import { CUSTOM_INFO, IMAGE_PATHS } from "../constants/telegram.constants";
import { Language } from "../decorators/language.decorator";
import { LocalizationService } from "../services/localization.service";
import { PollingService } from "../services/polling.service";
import { TelegramService } from "../telegram.service";
import { TelegramClient } from "./TelegramClient";

@UseGuards(UserCheckMiddleware)
@Update()
export class ChatCommandsUpdate {
    constructor(
        protected readonly telegramService: TelegramService,
        protected readonly configService: ConfigService,
        protected readonly userService: UsersService,
        private readonly scamformService: ScamformService,
        private readonly localizationService: LocalizationService,
        private readonly pollingService: PollingService,
        private readonly telegramClient: TelegramClient
    ) { }

    @On('message')
    async findUser(@Ctx() ctx: Context, @Language() lang: string) {
        const message = ctx.text?.trim().replace('@', '');
        console.log(message)
        console.log(ctx.message.chat)
        if (!message) return;

        const isChatBanWord = this.pollingService.checkIsChatBanWord((ctx as any).chat.username, message);
        if (isChatBanWord) {
            await this.telegramService.replyWithAutoDelete(ctx, 'Это слово запрещено в чате');
            await ctx.deleteMessage(ctx.message.message_id);
            return;
        }

        const words = message.split(/\s+/).filter(word => word.length > 0);
        const command = words[0].toLowerCase();
        const commandData = words.slice(2).join(' ');

        if (await this.telegramService.checkIsChatPrivate(ctx)) {
            console.log('message', ctx.message)

            if ((ctx.message as any)?.via_bot?.username) {
                return
            }

            if ((ctx.message as any)?.forward_origin?.type == 'hidden_user') {
                await ctx.reply('Этот пользователь скрыт. Вы не можете проверить его информацию. Пришлите в чат его Username или ID');
                return;
            }


            let query = words[0]
            const forwardFrom = (ctx.message as any).forward_from


            if (forwardFrom && forwardFrom.via_bot.username == 'TEM4iKTESTERBOT') {
                return
            }


            if (forwardFrom) {
                console.log('forwardFrom', forwardFrom)
                query = forwardFrom.username || forwardFrom.id.toString()
            }


            this.handleCheckCommand(ctx, query, lang);
            return;
        }

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
            this.telegramService.replyWithAutoDelete(adminAddCtx, 'Пользователь супер админ');
            return false
        }



        if (roles.includes(admin.role)) {
            return true;
        }

        this.telegramService.replyWithAutoDelete(adminAddCtx, 'У вас нет доступа к этой команде');
        return false;

    }

    private async handleAdmin(ctx: Context, user: IUser, isAdd: boolean) {
        await this.userService.updateUserRole(user.telegramId, isAdd ? UserRoles.ADMIN : UserRoles.USER)
        this.telegramService.replyWithAutoDelete(ctx, `Пользователь (@${user.username}) ${isAdd ? 'теперь' : 'больше не'} админ`)
    }

    private async checkUserAndSendInfo(ctx: Context, query: string, lang: string) {
        const isGarant = await this.checkAndSendGarantInfo(ctx, query, lang);
        if (isGarant) return

        const scammer = await this.scamformService.getScammerByQuery(query, ctx.from.id.toString());
        await this.onScammerDetail(ctx, lang, scammer, query);
    }

    private async checkAndSendGarantInfo(ctx: Context, query: string, lang: string): Promise<boolean> {
        if (await this.telegramService.checkIsGarant(query)) {
            const photoStream = fs.createReadStream(IMAGE_PATHS.GARANT);
            await this.telegramService.replyMediaWithAutoDelete(ctx,
                { source: photoStream },
                {
                    caption: this.localizationService.getT('userCheck.garantUser', lang)
                        .replace('{username}', this.telegramService.escapeMarkdown(query)),
                    parse_mode: 'Markdown',
                },
                'photo'
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
            await this.telegramService.replyWithAutoDelete(ctx, 'Пожалуйста, укажите имя пользователя. Пример: инфо @username или ответьте на сообщение пользователя словом "инфо"');
            return;
        }

        if (user.role != UserRoles.SUPER_ADMIN && user.role != UserRoles.ADMIN && commandData) {
            await this.telegramService.replyWithAutoDelete(ctx, 'У вас нет доступа к изменению описания');
            return;
        }

        const scammer = await this.scamformService.getScammerByQuery(query);
        if (await this.checkCustomUserInfo(ctx, scammer?.username)) return;

        if (await this.telegramService.checkIsGarant(query)) {
            const garant = await this.userService.findGarantByUsername(query)
            if (garant) {
                await this.telegramService.replyWithAutoDelete(ctx, this.localizationService.getT('commands.userDescription')
                    .replace('{query}', this.telegramService.escapeMarkdown(query))
                    .replace('{description}', this.telegramService.escapeMarkdown(garant.description || 'Описание отсутствует')), {
                    parse_mode: 'Markdown'
                })
                return;
            }
            return;
        }

        if (!scammer) {
            await this.telegramService.replyWithAutoDelete(ctx, 'Пользователь не найден');
            return;
        }

        if (!description) {
            await this.telegramService.replyWithAutoDelete(ctx, this.localizationService.getT('commands.userDescription')
                .replace('{query}', this.telegramService.escapeMarkdown(query))
                .replace('{description}', this.telegramService.escapeMarkdown(scammer.description || 'Описание отсутствует')), {
                parse_mode: 'Markdown'
            })
            return;
        }

        await this.scamformService.updateScammer(scammer.id, { description })
        const scammerInfo = this.telegramService.escapeMarkdown(scammer.username || scammer.telegramId || 'без username')
        await this.telegramService.replyWithAutoDelete(ctx, `Описание пользователя (@${scammerInfo}) обновлено`)
    }

    private async handleCheckCommand(ctx: Context, query: string, lang: string) {
        if (!query) {
            this.telegramService.replyWithAutoDelete(ctx, 'Пожалуйста, укажите имя пользователя.\n\nПример: чек @username или ответьте на сообщение пользователя словом "чек"');
            return;
        }

        await this.checkUserAndSendInfo(ctx, query, lang);
    }

    private async handleStatus(ctx: Context, repliedUser: IUser, statusText: string, query?: string) {
        let status: ScammerStatus;
        const user = await this.userService.findUserByTelegramId(ctx.from.id.toString())

        let queryFind
        if (query) {

            if (await this.telegramService.checkIsGarant(query)) {
                this.telegramService.replyWithAutoDelete(ctx, 'Это гарант. Вы не можете изменить его статус');
                return;
            }

            const exsScammer = await this.scamformService.getScammerByQuery(query)


            if (!exsScammer) {
                this.telegramService.replyWithAutoDelete(ctx, 'Пользователь не найден в скам базе')
                return
            }

            if (user.role != UserRoles.SUPER_ADMIN && user.role != UserRoles.ADMIN && exsScammer) {
                this.telegramService.replyWithAutoDelete(ctx, 'У вас нет доступа к изменению статуса');
                return;
            }

            queryFind = { username: query, id: exsScammer?.telegramId || null }
        }
        else if (repliedUser) {
            queryFind = { id: repliedUser.telegramId, username: repliedUser.username }
        }
        else {
            this.telegramService.replyWithAutoDelete(ctx, 'Пожалуйста, укажите имя пользователя. Пример: статус @username или ответьте на сообщение пользователя словом "статус"')
            return
        }

        console.log(queryFind, 'queryFind')

        let info = null
        if (queryFind.username) {
            info = await this.telegramClient.getUserData(queryFind.username)
        }

        const scammer = await this.scamformService.findOrCreateScammer(queryFind.username, queryFind.id, info?.collectionUsernames);
        if (await this.checkCustomUserInfo(ctx, scammer?.username)) return;

        if (!statusText) {
            if (!scammer) {
                await this.telegramService.replyWithAutoDelete(ctx, 'Пользователь не найден.\n\nЧтобы задать статус, выберите из списка: скам, неизв, подозр, спам');
                return;
            }
            const scammerInfo = this.telegramService.escapeMarkdown(scammer.username || scammer.telegramId || 'без username')

            await this.telegramService.replyWithAutoDelete(ctx, `Статус @${scammerInfo} ${scammer.status}.\n\nЧтобы задать статус, выберите из списка: скам, неизв, подозр, спам`);
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

            case 'спам':
                status = ScammerStatus.SPAMMER;
                break;

            default:
                await this.telegramService.replyWithAutoDelete(ctx, 'Неизвестный статус. Выберите из списка:\n`скам`, `неизв`, `подозр`, `спам`');
                return;
                break;
        }

        if (!scammer) {
            this.telegramService.replyWithAutoDelete(ctx, 'Пользователь не найден');
            return;
        }

        const result = await this.scamformService.updateScammerStatusByUsername({
            scammerId: scammer.id,
            status,
            formId: undefined
        });

        if (result.isSuccess && result.scammer) {
            const scammerInfo = this.telegramService.escapeMarkdown(result.scammer.username || result.scammer.telegramId || 'без username')
            await this.telegramService.replyWithAutoDelete(ctx, `Статус пользователя (@${scammerInfo}) изменен на ${result.scammer.status}`);
        }
    }

    async onScammerDetail(
        @Ctx() ctx: Context,
        lang: string,
        scammer: IScammerPayload | null,
        query: string
    ) {
        let scammerData = scammer
        if (!scammer) {
            console.log('scammer not found')
            // let queryData: any = query

            if (this.telegramService.testIsUsername(query)) {
                console.log('testIsUsername')
                const info = await this.telegramClient.getUserData(query)

                if (!info) {
                    await ctx.reply(`Такого юзернейма(@${query}) не существует. Возможно это канал или группа. Попробуйте ввести другой юзернейм.`)
                    return
                }
                if (await this.checkAndSendGarantInfo(ctx, info.username, lang)) {
                    return
                }

                scammerData = await this.scamformService.createScammer({ username: info.username, telegramId: info.telegramId }, null, info.collectionUsernames);
            }
            else if (this.telegramService.testIsTelegramId(query)) {
                scammerData = {
                    username: null,
                    telegramId: query,
                    registrationDate: this.telegramClient.getRegistrationDateByTelegramId(query),
                    scamForms: [],
                    twinAccounts: [],
                    views: []
                } as IScammerPayload
            }
            else {
                await ctx.reply('Неверный формат. Попробуйте ввести другой юзернейм или ID.')
                return
            }
        }

        if (await this.checkCustomUserInfo(ctx, scammerData?.username)) return

        const { textInfo, photoStream } = this.telegramService.formatScammerData(scammerData, true, lang, true)

        await this.telegramService.replyMediaWithAutoDelete(ctx,
            { source: photoStream },
            { caption: textInfo },
            'photo'
        )
    }

    async checkCustomUserInfo(ctx: Context, username?: string): Promise<boolean> {
        if (!username) return false;
        username = username.replace('@', '');

        switch (username) {
            case 'TeM4ik20':
                await this.handleCustomInfo(ctx, CUSTOM_INFO.PROGRAMMER_INFO, IMAGE_PATHS.PROGRAMMER, 'video');
                return true;

            case 'svdbasebot':
                await this.handleCustomInfo(ctx, CUSTOM_INFO.BOT_INFO, IMAGE_PATHS.BOT, 'photo');
                return true;

            default:
                return false;
        }
    }

    async handleCustomInfo(ctx: Context, info: string, streamPath?: string, mediaType?: 'photo' | 'video') {
        const stream = streamPath ? fs.createReadStream(streamPath) : undefined;

        if (!streamPath) {
            await ctx.reply(info)
            return
        }


        if (mediaType === 'photo') {
            await this.telegramService.replyMediaWithAutoDelete(ctx,
                { source: stream },
                {
                    caption: info,
                    parse_mode: 'Markdown'
                },
                'photo'
            );
        }
        else if (mediaType === 'video') {
            await this.telegramService.replyMediaWithAutoDelete(ctx,
                { source: stream },
                {
                    caption: info,
                    parse_mode: 'Markdown'
                },
                'video'
            );
        }
    }
}