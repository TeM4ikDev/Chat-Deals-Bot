import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UsersService } from 'src/users/users.service';
import { AdminService } from '../admin.service';
import { Roles } from '@/decorators/roles.decorator';
import { Prisma, UserRoles } from '@prisma/client';
import { DatabaseService } from '@/database/database.service';
import { ScamformService } from '@/scamform/scamform.service';


@Controller('admin/scamforms')
@UseGuards(JwtAuthGuard)
@Roles(UserRoles.SUPER_ADMIN)
export class ScamformController {
    constructor(
        private readonly usersService: UsersService,
        private readonly adminService: AdminService,
        private readonly database: DatabaseService,
        private readonly scamformService: ScamformService
    ) { }


    @Post('scammers')
    async createScammer(@Body() body: Prisma.ScammerCreateInput) {
        return await this.scamformService.createScammer(body);
    }



    @Roles(UserRoles.SUPER_ADMIN)
    @Delete(':id')
    async onDeleteForm(@Param('id') formId: string) {
        console.log(formId)

        return await this.scamformService.deleteForm(formId)


    }



}

