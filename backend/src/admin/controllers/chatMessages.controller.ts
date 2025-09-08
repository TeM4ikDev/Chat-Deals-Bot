import { DatabaseService } from '@/database/database.service';
import { Roles } from '@/decorators/roles.decorator';
import { BadRequestException, Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { Prisma, UserRoles } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UsersService } from 'src/users/users.service';
import { AdminService } from '../admin.service';
import { CreateChatMessageDto } from '../dto/chatMessage-dto';

@Controller('admin/chatMessages')
@UseGuards(JwtAuthGuard)
@Roles(UserRoles.SUPER_ADMIN)
export class ChatMessagesController {
    constructor(
        private readonly usersService: UsersService,
        private readonly adminService: AdminService,
        private readonly database: DatabaseService
    ) { }

    @Get()
    async findAllMessages() {
        return await this.database.chatConfig.findMany()
    }

    @Patch()
    async updateMessage(@Body() body: CreateChatMessageDto & { id: string }) {
        return await this.database.chatConfig.update({
            where: {
                id: body.id
            },
            data: {
                ...body,
                username: body.username.replace('@', ''),
                showNewUserInfo: body.showNewUserInfo == 'true'
            }
        })
    }

    @Post()
    async addMessage(@Body() body: CreateChatMessageDto) {
        console.log(body)

        const exMessage = await this.database.chatConfig.findUnique({
            where: {
                username: body.username
            }
        })

        if (exMessage) throw new BadRequestException('Такое сообщение уже есть')

        return await this.database.chatConfig.create({
            data: {
                ...body,
                username: body.username.replace('@', ''),
                showNewUserInfo: body.showNewUserInfo == 'true'
            }
        })
    }
}

