import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UsersService } from 'src/users/users.service';
import { AdminService } from '../admin.service';
import { Roles } from '@/decorators/roles.decorator';
import { UserRoles } from '@prisma/client';


@Controller('admin/users')
@UseGuards(JwtAuthGuard)
@Roles(UserRoles.ADMIN, UserRoles.SUPER_ADMIN)
export class UserManagementController {
    constructor(
        private readonly usersService: UsersService,
        private readonly adminService: AdminService,
    ) { }

    @Get()
    async findAllUsers(
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '10',
        @Query('search') search: string = ''
    ) {
        const pageNum = parseInt(page, 10) || 1;
        const limitNum = parseInt(limit, 10) || 10;
        return await this.usersService.findAllUsers(pageNum, limitNum, search);
    }

    @Get(":id")
    async getUserDetails(@Param('id') userId: string) {
        return await this.usersService.findUserById(userId)
    }

    @Patch('update-rights')
    async updateUserRights(@Body() body: { telegramId: number }) {
        console.log(body)
        return await this.usersService.updateUserRights(String(body.telegramId))
    }
   

}

