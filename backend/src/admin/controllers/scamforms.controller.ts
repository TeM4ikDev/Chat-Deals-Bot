import { DatabaseService } from '@/database/database.service';
import { Roles } from '@/decorators/roles.decorator';
import { ScamformService } from '@/scamform/scamform.service';
import { TelegramService } from '@/telegram/telegram.service';
import { Body, Controller, Delete, Param, Post, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { Prisma, UserRoles } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UsersService } from 'src/users/users.service';
import { UserId } from '@/decorators/userid.decorator';

@Controller('admin/scamforms')
@UseGuards(JwtAuthGuard)
@Roles(UserRoles.SUPER_ADMIN)
export class ScamformController {
    constructor(
        private readonly usersService: UsersService,
        private readonly scamformService: ScamformService,
        private readonly telegramService: TelegramService
    ) { }

    @Post('scammers')
    @UseInterceptors(AnyFilesInterceptor())
    async createScammer(@UploadedFiles() files: Express.Multer.File[], @Body() body: Prisma.ScammerCreateInput, @UserId() userId: string) {
        const user = await this.usersService.findUserById(userId);
        const scammer = await this.scamformService.createScammer(body);
        const mediaData = await this.telegramService.uploadFilesGroup(files);

        const scamForm = await this.scamformService.create({
            scammerData: {
                username: scammer.username,
                telegramId: scammer.telegramId
            },
            description: body.description,
            media: mediaData,
            userTelegramId: user?.telegramId,
        })

        await this.telegramService.sendScamFormMessageToChannel({
            fromUser: {
                username: user?.username,
                telegramId: user?.telegramId
            },
            scamForm,
            scammerData: {
                username: scammer.username,
                telegramId: scammer.telegramId
            },
            media: mediaData,
        })
        
        return scamForm;
    }

    @Roles(UserRoles.SUPER_ADMIN)
    @Delete(':id')
    async onDeleteForm(@Param('id') formId: string) {
        return await this.scamformService.deleteForm(formId)
    }
}

