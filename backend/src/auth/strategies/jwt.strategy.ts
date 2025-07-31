import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from 'src/users/users.service';
// import { adminTelegramIds } from '@/types/types';
import { AuthService } from '../auth.service';



@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly authService: AuthService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // console.log('payload: ', payload)
    const user = await this.usersService.findUserById(payload.id);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    
    // if (!user.hasAccess) throw new UnauthorizedException('You have no access!');


    return user;
  }
}
