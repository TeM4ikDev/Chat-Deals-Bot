import { TelegramService } from "@/telegram/telegram.service";
import { UsersService } from "@/users/users.service";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Ctx, Hears, On, Scene, SceneEnter, SceneLeave } from "nestjs-telegraf";
import { Context, Scenes } from "telegraf";
import { FORM_LIMITS } from "../constants/form-limits.constants";
import { SCENES } from "../constants/telegram.constants";

interface IUserInfoForm {
  step: number;
  addresses: string[];
  keyboardUrls: Array<{text: string, url: string}>;
  currentInput: 'address' | 'url' | 'remove_address' | 'remove_url' | null;
  lastInstructionMessageId?: number;
}

interface IUserInfoSession {
  userInfoForm?: IUserInfoForm;
}

type UserInfoFormSession = Context & Scenes.SceneContext & IUserInfoSession;

@Injectable()
@Scene(SCENES.FILL_INFO)
export class FillInfo {
    // Константы лимитов
    private static readonly MAX_ADDRESSES = FORM_LIMITS.MAX_ADDRESSES;
    private static readonly MAX_URLS = FORM_LIMITS.MAX_URLS;

    private static readonly ADD_ADDRESS_TEXT = '💰 Добавить адрес кошелька';
    private static readonly ADD_URL_TEXT = '🔗 Добавить ссылку';
    private static readonly REMOVE_ADDRESS_TEXT = '🗑️ Удалить адрес';
    private static readonly REMOVE_URL_TEXT = '🗑️ Удалить ссылку';
    private static readonly DONE_TEXT = '✅ Готово';
    private static readonly SAVE_TEXT = '💾 Сохранить';
    private static readonly CANCEL_TEXT = '❌ Отмена';
    private static readonly BACK_TEXT = '⬅️ Назад';

    private maxAddresses = FillInfo.MAX_ADDRESSES;
    private maxUrls = FillInfo.MAX_URLS;

    constructor(
        private readonly telegramService: TelegramService,
        private readonly configService: ConfigService,
        private readonly usersService: UsersService,
    ) { }

    @SceneEnter()
    async onSceneEnter(@Ctx() ctx: UserInfoFormSession) {
        // Получаем существующие данные пользователя
        const telegramId = String(ctx.from?.id);
        const existingDealsInfo = await this.usersService.getDealsInfo(telegramId);
        
        const existingAddresses = existingDealsInfo?.addresses ? JSON.parse(existingDealsInfo.addresses as string) : [];
        const existingUrls = existingDealsInfo?.KeyboardUrls ? JSON.parse(existingDealsInfo.KeyboardUrls as string) : [];
        
        // Конвертируем старый формат (строки) в новый формат (объекты)
        const convertedUrls = existingUrls.map((url: any) => {
            if (typeof url === 'string') {
                return { text: url, url: url };
            }
            return url;
        });

        (ctx.session as any).userInfoForm = {
            step: 1,
            addresses: existingAddresses,
            keyboardUrls: convertedUrls,
            currentInput: null
        };

        await this.showStep1(ctx);
    }

    private async showStep1(@Ctx() ctx: UserInfoFormSession) {
        const form = (ctx.session as any).userInfoForm;
        if (!form) return;
        
        const addressesText = form.addresses.length > 0 
            ? form.addresses.map((addr, index) => `${index + 1}. ${addr}`).join('\n')
            : 'Нет адресов';

        const message = await ctx.reply(
            `💰 <b>Шаг 1: Адреса кошельков</b>\n\n📝 Отправьте адреса ваших кошельков (по одному в сообщении).\n\n📋 <b>Текущие адреса:</b>\n${addressesText}\n\n✅ Нажмите "Готово" когда закончите добавлять адреса.\n\n💡 <i>Максимум ${this.maxAddresses} адресов</i>`, {
            reply_markup: {
                keyboard: [
                    [{ text: FillInfo.ADD_ADDRESS_TEXT }],
                    form.addresses.length > 0 ? [{ text: FillInfo.REMOVE_ADDRESS_TEXT }] : [],
                    [{ text: FillInfo.DONE_TEXT }],
                    [{ text: FillInfo.CANCEL_TEXT }]
                ].filter(row => row.length > 0),
                resize_keyboard: true
            },
            parse_mode: 'HTML'
        });
        
        form.lastInstructionMessageId = message.message_id;
    }

    private async showStep2(@Ctx() ctx: UserInfoFormSession) {
        const form = (ctx.session as any).userInfoForm;
        if (!form) return;
        const urlsText = form.keyboardUrls.length > 0 
            ? form.keyboardUrls.map((urlObj, index) => `${index + 1}. ${urlObj.text} - ${urlObj.link}`).join('\n')
            : 'Нет ссылок';

        const message = await ctx.reply(
            `🔗 <b>Шаг 2: Ссылки для кнопок</b>\n\n📝 Отправьте ссылки для кнопок (по одной в сообщении).\n\n📋 <b>Текущие ссылки:</b>\n${urlsText}\n\n✅ Нажмите "Готово" когда закончите добавлять ссылки.\n\n💡 <i>Максимум ${this.maxUrls} ссылок</i>`, {
            reply_markup: {
                keyboard: [
                    [{ text: FillInfo.ADD_URL_TEXT }],
                    form.keyboardUrls.length > 0 ? [{ text: FillInfo.REMOVE_URL_TEXT }] : [],
                    [{ text: FillInfo.DONE_TEXT }],
                    [{ text: FillInfo.BACK_TEXT }],
                    [{ text: FillInfo.CANCEL_TEXT }]
                ].filter(row => row.length > 0),
                resize_keyboard: true,
                
            },
            link_preview_options:{
                is_disabled: true
            },
            parse_mode: 'HTML'
        });
        
        form.lastInstructionMessageId = message.message_id;
    }

    private async showStep3(@Ctx() ctx: UserInfoFormSession) {
        const form = (ctx.session as any).userInfoForm;
        if (!form) return;
        const addressesText = form.addresses.length > 0 
            ? form.addresses.map((addr, index) => `${index + 1}. ${addr}`).join('\n')
            : 'Нет адресов';
        
        const urlsText = form.keyboardUrls.length > 0 
            ? form.keyboardUrls.map((urlObj, index) => `${index + 1}. ${urlObj.text} - ${urlObj.link}`).join('\n')
            : 'Нет ссылок';

        const message = await ctx.reply(
            `✅ <b>Шаг 3: Подтверждение</b>\n\n💰 <b>Адреса кошельков:</b>\n${addressesText}\n\n🔗 <b>Ссылки для кнопок:</b>\n${urlsText}\n\n💾 Нажмите "Сохранить" для сохранения изменений.\n\n📊 <b>Итого:</b> ${form.addresses.length} адресов, ${form.keyboardUrls.length} ссылок`, {
            reply_markup: {
                keyboard: [
                    [{ text: FillInfo.SAVE_TEXT }],
                    [{ text: FillInfo.BACK_TEXT }],
                    [{ text: FillInfo.CANCEL_TEXT }]
                ],
                resize_keyboard: true,
                
            },
            link_preview_options:{
                is_disabled: true
            },
            parse_mode: 'HTML'
        });
        
        form.lastInstructionMessageId = message.message_id;
    }

    @Hears(FillInfo.ADD_ADDRESS_TEXT)
    async onAddAddress(@Ctx() ctx: UserInfoFormSession) {
        const form = (ctx.session as any).userInfoForm;
        if (!form) return;
        if (form.step !== 1) return;

        if (form.addresses.length >= this.maxAddresses) {
            await ctx.reply(`❗️ Максимум ${this.maxAddresses} адресов кошелька.`);
            return;
        }

        form.currentInput = 'address';
        await ctx.reply('💰 <b>Добавление адреса кошелька</b>\n\n📝 Отправьте адрес кошелька:\n\n💡 <i>Адрес должен быть длиной от 10 до 100 символов</i>', {
            parse_mode: 'HTML'
        });
    }

    @Hears(FillInfo.REMOVE_ADDRESS_TEXT)
    async onRemoveAddress(@Ctx() ctx: UserInfoFormSession) {
        const form = (ctx.session as any).userInfoForm;
        if (!form || form.step !== 1) return;

        if (form.addresses.length === 0) {
            await ctx.reply('❗️ Нет адресов для удаления.');
            return;
        }

        form.currentInput = 'remove_address';
        const addressesList = form.addresses.map((addr, index) => `${index + 1}. ${addr}`).join('\n');
        
        await ctx.reply(`🗑️ <b>Удаление адреса кошелька</b>\n\n📋 <b>Выберите адрес для удаления:</b>\n${addressesList}\n\n📝 Отправьте номер адреса для удаления:`, {
            parse_mode: 'HTML'
        });
    }

    @Hears(FillInfo.REMOVE_URL_TEXT)
    async onRemoveUrl(@Ctx() ctx: UserInfoFormSession) {
        const form = (ctx.session as any).userInfoForm;
        if (!form || form.step !== 2) return;

        if (form.keyboardUrls.length === 0) {
            await ctx.reply('❗️ Нет ссылок для удаления.');
            return;
        }

        form.currentInput = 'remove_url';
        const urlsList = form.keyboardUrls.map((urlObj, index) => `${index + 1}. ${urlObj.text} - ${urlObj.link}`).join('\n');
        
        await ctx.reply(`🗑️ <b>Удаление ссылки</b>\n\n📋 <b>Выберите ссылку для удаления:</b>\n${urlsList}\n\n📝 Отправьте номер ссылки для удаления:`, {
            parse_mode: 'HTML',
            link_preview_options:{
                is_disabled: true
            },
        });
    }

    @Hears(FillInfo.ADD_URL_TEXT)
    async onAddUrl(@Ctx() ctx: UserInfoFormSession) {
        const form = (ctx.session as any).userInfoForm;
        if (!form) return;
        if (form.step !== 2) return;

        if (form.keyboardUrls.length >= this.maxUrls) {
            await ctx.reply(`❗️ Максимум ${this.maxUrls} ссылок.`);
            return;
        }

        form.currentInput = 'url';
        await ctx.reply('🔗 <b>Добавление ссылки</b>\n\n📝 Отправьте ссылку в формате:\n<b>Текст кнопки | URL</b>\n\nПример: <code>Мой сайт | https://example.com</code>\n\n💡 <i>Разделитель: вертикальная черта |</i>', {
            parse_mode: 'HTML',
            link_preview_options:{
                is_disabled: true
            },
        });
    }

    @Hears(FillInfo.DONE_TEXT)
    async onDone(@Ctx() ctx: UserInfoFormSession) {
        const form = (ctx.session as any).userInfoForm;
        if (!form) return;
        
        if (form.step === 1) {
            form.step = 2;
            await this.showStep2(ctx);
        } else if (form.step === 2) {
            form.step = 3;
            await this.showStep3(ctx);
        }
    }

    @Hears(FillInfo.SAVE_TEXT)
    async onSave(@Ctx() ctx: UserInfoFormSession) {
        const form = (ctx.session as any).userInfoForm;
        if (!form) return;
        if (form.step !== 3) return;

        try {
            const telegramId = String(ctx.from?.id);
            await this.usersService.createOrUpdateDealsInfo(
                telegramId, 
                form.addresses, 
                form.keyboardUrls
            );

            await ctx.reply(`🎉 <b>Информация профиля успешно обновлена!</b>\n\n📊 <b>Сохранено:</b>\n💰 Адресов кошельков: ${form.addresses.length}\n🔗 Ссылок для кнопок: ${form.keyboardUrls.length}\n\n✅ Все данные сохранены в вашем профиле!`, {
                parse_mode: 'HTML',
                reply_markup: {
                    remove_keyboard: true
                }
            });

            await ctx.scene.leave();
        } catch (error) {
            console.error('Error saving user info:', error);
            await ctx.reply('Произошла ошибка при сохранении данных. Попробуйте позже.');
        }
    }

    @Hears(FillInfo.CANCEL_TEXT)
    async onCancel(@Ctx() ctx: UserInfoFormSession) {
        (ctx.session as any).userInfoForm = undefined;
        await ctx.reply('❌ <b>Изменение информации отменено</b>\n\n📝 Вы можете заполнить информацию позже, используя команду /fill_info', {
            parse_mode: 'HTML',
            reply_markup: {
                remove_keyboard: true,
            },
        });
        await ctx.scene.leave();
    }

    @Hears(FillInfo.BACK_TEXT)
    async onBack(@Ctx() ctx: UserInfoFormSession) {
        const form = (ctx.session as any).userInfoForm;
        if (!form) return;
        
        if (form.step === 2) {
            form.step = 1;
            await this.showStep1(ctx);
        } else if (form.step === 3) {
            form.step = 2;
            await this.showStep2(ctx);
        }
    }

    @On('text')
    async onText(@Ctx() ctx: UserInfoFormSession) {
        const form = (ctx.session as any).userInfoForm;
        if (!form || !form.currentInput) return;

        const text = (ctx.message as any)?.text?.trim();
        if (!text) return;

        if (form.currentInput === 'address') {
            if (form.addresses.includes(text)) {
                await ctx.reply('❗️ Этот адрес уже добавлен.');
                return;
            }

            // Простая валидация адреса кошелька
            if (text.length < 10 || text.length > 100) {
                await ctx.reply('❗️ Некорректный адрес кошелька.');
                return;
            }

            form.addresses.push(text);
            await ctx.reply(`✅ <b>Адрес успешно добавлен!</b>\n\n📝 <code>${text}</code>\n\n📊 Всего адресов: ${form.addresses.length}/${this.maxAddresses}`, {
                parse_mode: 'HTML'
            });
            form.currentInput = null;
            await this.showStep1(ctx);
        } else if (form.currentInput === 'url') {
            // Парсим текст в формате "Текст | URL"
            const parts = text.split('|').map(part => part.trim());
            if (parts.length !== 2) {
                await ctx.reply('❗️ Неверный формат. Используйте: <b>Текст кнопки | URL</b>\n\nПример: <code>Мой сайт | https://example.com</code>', {
                    parse_mode: 'HTML'
                });
                return;
            }

            const [buttonText, url] = parts;
            
            if (!buttonText || !url) {
                await ctx.reply('❗️ Текст кнопки и URL не могут быть пустыми.');
                return;
            }

            // Проверяем на дубликаты
            const isDuplicate = form.keyboardUrls.some(item => item.link === url);
            if (isDuplicate) {
                await ctx.reply('❗️ Эта ссылка уже добавлена.');
                return;
            }

            // Валидация URL
            try {
                new URL(url);
            } catch {
                await ctx.reply('❗️ Некорректный URL.');
                return;
            }

            const urlObj = { text: buttonText, url };
            form.keyboardUrls.push(urlObj);
            
            await ctx.reply(`✅ <b>Ссылка успешно добавлена!</b>\n\n🔗 <b>Текст:</b> ${buttonText}\n🌐 <b>URL:</b> <a href="${url}">${url}</a>\n\n📊 Всего ссылок: ${form.keyboardUrls.length}/${this.maxUrls}`, {
                parse_mode: 'HTML',
                link_preview_options:{
                    is_disabled: true
                },
            });
            form.currentInput = null;
            await this.showStep2(ctx);
        } else if (form.currentInput === 'remove_address') {
            const index = parseInt(text) - 1;
            if (isNaN(index) || index < 0 || index >= form.addresses.length) {
                await ctx.reply('❗️ Неверный номер адреса.');
                return;
            }

            const removedAddress = form.addresses[index];
            form.addresses.splice(index, 1);
            
            await ctx.reply(`🗑️ <b>Адрес удален!</b>\n\n📝 <code>${removedAddress}</code>\n\n📊 Осталось адресов: ${form.addresses.length}/${this.maxAddresses}`, {
                parse_mode: 'HTML'
            });
            form.currentInput = null;
            await this.showStep1(ctx);
        } else if (form.currentInput === 'remove_url') {
            const index = parseInt(text) - 1;
            if (isNaN(index) || index < 0 || index >= form.keyboardUrls.length) {
                await ctx.reply('❗️ Неверный номер ссылки.');
                return;
            }

            const removedUrl = form.keyboardUrls[index];
            form.keyboardUrls.splice(index, 1);
            
            await ctx.reply(`🗑️ <b>Ссылка удалена!</b>\n\n🔗 <b>Текст:</b> ${removedUrl.text}\n🌐 <b>URL:</b> ${removedUrl.link}\n\n📊 Осталось ссылок: ${form.keyboardUrls.length}/${this.maxUrls}`, {
                parse_mode: 'HTML',
                link_preview_options:{
                    is_disabled: true
                },
            });
            form.currentInput = null;
            await this.showStep2(ctx);
        }
    }

    @SceneLeave()
    async onSceneLeave(@Ctx() ctx: UserInfoFormSession) {
        (ctx.session as any).userInfoForm = undefined;
    }
}