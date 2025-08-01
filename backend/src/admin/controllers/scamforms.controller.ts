import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UsersService } from 'src/users/users.service';
import { AdminService } from '../admin.service';
import { Roles } from '@/decorators/roles.decorator';
import { UserRoles } from '@prisma/client';
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

    @Get()
    async findAllScamforms(
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '10',
        @Query('search') search: string = ''
    ) {
        const pageNum = parseInt(page, 10) || 1;
        const limitNum = parseInt(limit, 10) || 10;


        return await this.scamformService.findAll(pageNum, limitNum, search)
    }

    // @Post()
    // async addGarant(@Body() body: { username: string }) {
    //     console.log(body)

    //     const exGarant = await this.database.garants.findUnique({
    //         where: {
    //             username: body.username
    //         }
    //     })

    //     if (exGarant) throw new BadRequestException('Такой гарант уже есть')

    //     return await this.database.garants.create({
    //         data: body
    //     })
    // }



}

