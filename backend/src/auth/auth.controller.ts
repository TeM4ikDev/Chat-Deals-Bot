import {
	BadRequestException,
	Body,
	Controller,
	Get,
	Post,
	Request,
	UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
	UsersService,
} from 'src/users/users.service';
import { User } from 'telegraf/typings/core/types/typegram';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';



@Controller('auth')
export class AuthController {
	constructor(
		protected readonly authService: AuthService,
		protected readonly usersService: UsersService,
		protected readonly jwtService: JwtService,
	) { }

	

	@Get('profile')
	@UseGuards(JwtAuthGuard)
	async getProfile(@Request() req) {
		return req.user;
	}

	@Post('/login')
	async login(
		@Body() telegramData: User,
	) {
		// console.log(telegramData)
		const {user, isNew} = await this.usersService.findOrCreateUser(telegramData);

		// console.log(user)
		
		if (!user) {
			throw new BadRequestException('User not found');
		}

		return await this.authService.login(user);
	}



}




