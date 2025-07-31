import { Roles } from '@/decorators/roles.decorator';
import { Controller, Delete, ForbiddenException, Get, Param, Query, UseGuards } from '@nestjs/common';
import { UserRoles } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/strategies/roles.strategy';
import { UsersService } from 'src/users/users.service';
import { AdminService } from './admin.service';
import { UserId } from '@/decorators/userid.decorator';


@Controller('admin')
@UseGuards(RolesGuard, JwtAuthGuard)
@Roles(UserRoles.ADMIN, UserRoles.SUPER_ADMIN)
export class AdminController {
  constructor(
    private readonly usersService: UsersService,
    private readonly adminService: AdminService,

  ) { }

}

