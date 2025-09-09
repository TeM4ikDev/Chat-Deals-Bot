import { DatabaseService } from "@/database/database.service";
import { forwardRef, Inject, OnModuleInit } from "@nestjs/common";
import { TelegramService } from "../telegram.service";

interface IntervalConfig {
    chatId: string;
    interval: NodeJS.Timeout;
    autoMessageIntervalSec: number;
}

export class PollingService implements OnModuleInit {
    constructor(
        @Inject(forwardRef(() => DatabaseService))
        private database: DatabaseService,
        private readonly telegramService: TelegramService
    ) { }

    private intervals: IntervalConfig[] = [];
    private chatsBanWords: { chatUsername: string, banWords: string[] }[] = [];

    async startPolling() {
        const chatConfigs = await this.database.chatConfig.findMany();
        this.chatsBanWords = chatConfigs.map(chatConfig => ({ chatUsername: chatConfig.username, banWords: chatConfig.banWords as string[] }));

        for (const chatConfig of chatConfigs) {
            const existingInterval = this.intervals.find(interval => interval.chatId === chatConfig.id);

            if (existingInterval) {
                if (existingInterval.autoMessageIntervalSec !== chatConfig.autoMessageIntervalSec) {
                    clearInterval(existingInterval.interval);
                    const newInterval = setInterval(async () => {
                        await this.telegramService.sendChatAutoMessage(chatConfig);
                    }, chatConfig.autoMessageIntervalSec * 1000);
                    existingInterval.interval = newInterval;
                    existingInterval.autoMessageIntervalSec = chatConfig.autoMessageIntervalSec;
                }
            } else {
                const interval = setInterval(async () => {
                    await this.telegramService.sendChatAutoMessage(chatConfig);
                }, chatConfig.autoMessageIntervalSec * 1000);
                this.intervals.push({ chatId: chatConfig.id, interval, autoMessageIntervalSec: chatConfig.autoMessageIntervalSec });
            }
        }

        console.log(this.chatsBanWords)
    }

    checkIsChatBanWord(chatUsername: string, message: string): boolean {
        const chatBanWords = this.chatsBanWords.find(chat => chat.chatUsername === chatUsername);
        if (!chatBanWords) return false;
        return chatBanWords.banWords.some(word => message.toLowerCase().includes(word.toLowerCase()));
    }

    getChatsBanWords() {
        return this.chatsBanWords;
    }

    async onModuleInit() {
        this.startPolling();
        setInterval(() => this.startPolling(), 10000);
    }

    async onModuleDestroy() {
        for (const interval of this.intervals) {
            clearInterval(interval.interval);
        }
    }
}