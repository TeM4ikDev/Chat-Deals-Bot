import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UsersService } from 'src/users/users.service';
import { AdminService } from '../admin.service';
import { Roles } from '@/decorators/roles.decorator';
import { UserRoles } from '@prisma/client';
import { DatabaseService } from '@/database/database.service';


@Controller('admin/garants')
@UseGuards(JwtAuthGuard)
@Roles(UserRoles.SUPER_ADMIN)
export class GarantsController {
    constructor(
        private readonly usersService: UsersService,
        private readonly adminService: AdminService,
        private readonly database: DatabaseService
    ) { }

    @Get()
    async findAllGarants() {
        return await this.usersService.findGarants()
    }


    @Delete(':username')
    async deleteGarant(@Param('username') username: string) {
        return await this.database.garants.delete({
            where: {
                username
            }
        })
    }

    @Patch()
    async updateGarant(@Body() body: { username: string, description: string }) {

        return await this.database.garants.update({
            where: {
                username: body.username
            },
            data: body
        })

    }


    @Post()
    async addGarant(@Body() body: { username: string, description: string }) {
        console.log(body)

        const exGarant = await this.database.garants.findUnique({
            where: {
                username: body.username
            }
        })

        if (exGarant) throw new BadRequestException('Такой гарант уже есть')

        return await this.database.garants.create({
            data: body
        })
    }



}

