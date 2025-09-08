    import { DatabaseService } from "@/database/database.service";
import { forwardRef, Inject, OnModuleInit } from "@nestjs/common";
import { TelegramService } from "../telegram.service";

export class PollingService implements OnModuleInit {
    constructor(
        // private readonly userService: UsersService,
        @Inject(forwardRef(() => DatabaseService))
        private database: DatabaseService,
        private readonly telegramService: TelegramService
    ) { }

    private intervals: NodeJS.Timeout[] = []

    async startPolling() {
        
        const chatConfigs = await this.database.chatConfig.findMany();
        console.log(chatConfigs)
        for (const chatConfig of chatConfigs) {
            const interval = setInterval(async () => {
                await this.telegramService.sendChatAutoMessage(chatConfig)
            }, chatConfig.autoMessageIntervalSec * 1000)
            this.intervals.push(interval)
        }
    }

    async onModuleInit() {

        // setInterval( () => {
            this.startPolling()
        // }, 5000)
    }

    // async onModuleDestroy() {
    //     for (const interval of this.intervals) {
    //         clearInterval(interval)
    //     }
    // }
}