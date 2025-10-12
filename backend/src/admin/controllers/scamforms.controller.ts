import { Roles } from '@/decorators/roles.decorator';
import { UserId } from '@/decorators/userid.decorator';
import { ScamformService } from '@/scamform/scamform.service';
import { TelegramService } from '@/telegram/telegram.service';
import { Body, Controller, Delete, Param, Post, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { Prisma, ScammerStatus, UserRoles } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UsersService } from 'src/users/users.service';

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
    async createScammer(@UploadedFiles() files: any[], @Body() body: { scammerData: Prisma.ScammerCreateInput, twinAccounts: Prisma.TwinAccountCreateInput[] }, @UserId() userId: string) {
        console.log('=== Создание скаммера ===');
        console.log('Scammer Data:', JSON.stringify(body.scammerData, null, 2));
        console.log('Twin Accounts:', JSON.stringify(body.twinAccounts, null, 2));
        console.log('Files count:', files?.length || 0);
        console.log('User ID:', userId);
        console.log('========================');

        // return

        const user = await this.usersService.findUserById(userId);
        const {username, telegramId} = await this.scamformService.createScammer(body.scammerData, body.twinAccounts);
        const mediaData = await this.telegramService.uploadFilesGroup(files);


        const scamForm = await this.scamformService.create({
            scammerData: {
                username: username,
                telegramId: telegramId,
                // collectionUsernames: body.scammerData.collectionUsernames
            },
            description: body.scammerData.description,
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
                username: username,
                telegramId: telegramId
            },
            media: mediaData,
        })

        return scamForm;
    }

    @Roles(UserRoles.SUPER_ADMIN)
    @Post('spammer')
    async createSpammer(@Body() body: { username: string}) {
        // console.log(body)
       
        
        return await this.scamformService.createScammer({
            username: (body.username).replace('@', ''),
            status: ScammerStatus.SPAMMER
        });
    }


    @Roles(UserRoles.SUPER_ADMIN)
    @Delete(':id')
    async onDeleteForm(@Param('id') formId: string) {
        return await this.scamformService.deleteForm(formId)
    }
}

