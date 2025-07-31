import { DatabaseService } from '@/database/database.service';
import { createParamDecorator, ExecutionContext, Logger } from '@nestjs/common';

export const Language = createParamDecorator(
    async (data: unknown, ctx: ExecutionContext) => {
        const logger = new Logger('LanguageDecorator');
        const request = ctx.switchToHttp().getRequest();
        const database = new DatabaseService();

        const telegramId = request.from?.id;

        if (!telegramId) {
            logger.warn('No telegramId found in request');
            return 'ru';
        }

        try {
            const user = await database.user.findUnique({
                where: { telegramId: String(telegramId) },
                include: { UsersConfig: true }
            });

            const language = user?.UsersConfig?.language?.toLowerCase() || 'ru';
            return language;
        } catch (error: any) {
            logger.error(`Error getting language: ${error?.message || 'Unknown error'}`, error?.stack);
            return 'ru';
        }
    },
); 