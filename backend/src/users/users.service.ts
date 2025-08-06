import { DatabaseService } from '@/database/database.service';
import { IUser, superAdminsTelegramIds } from '@/types/types';
import { Injectable } from '@nestjs/common';
import { UserLanguage, UserRoles } from '@prisma/client';
import { User } from 'telegraf/typings/core/types/typegram';


@Injectable()
export class UsersService {
  constructor(private database: DatabaseService) { }

  async findAllUsers(page: number = 1, limit: number = 10, search: string = '') {
    const skip = (page - 1) * limit;
    const where = search
      ? {
        OR: [
          { username: { contains: search } },
          { telegramId: { contains: search } }
        ]
      }
      : undefined;



    const [users, totalCount] = await Promise.all([
      this.database.user.findMany({
        skip,
        take: limit,
        orderBy: [
          { role: 'asc' },
        ],
        where,
      }),
      this.database.user.count({ where }),
    ]);
    const maxPage = Math.ceil(totalCount / limit);
    return {
      users,
      pagination: {
        totalCount,
        maxPage,
        currentPage: page,
        limit,
      },
    };
  }

  async findUserById(userId: string): Promise<IUser> {
    return await this.database.user.findUnique({
      where: { id: userId },
      include: {
        UsersConfig: true,
      }
    });
  }

  async findUserByTelegramId(telegramId: string) {
    return await this.database.user.findUnique({
      where: {
        telegramId: telegramId
      },
      include: {
        UsersConfig: true
      }

    })
  }

  async findUsersByRole(role: UserRoles) {
    return await this.database.user.findMany({
      where: {
        role
      }
    })
  }

  async findOrCreateUser(createUserDto: User): Promise<{ user: any; isNew: boolean }> {
    const { id, last_name, first_name, username, is_premium } = createUserDto

    const existingUser = await this.findUserByTelegramId(String(id))

    if (existingUser) {
      if (superAdminsTelegramIds.includes(existingUser.telegramId)) {
        const updatedUser = await this.database.user.update({
          where: {
            telegramId: existingUser.telegramId
          },
          data: {
            role: UserRoles.SUPER_ADMIN,
          },
        });
        return { user: updatedUser, isNew: false };
      }
      return { user: existingUser, isNew: false };
    }

    const newUser = await this.database.user.create({
      data: {
        telegramId: String(id),
        firstName: first_name,
        lastName: last_name,
        username: username,

        UsersConfig: {
          create: {}
        }
      }
    });

    return { user: newUser, isNew: true };
  }

  async findUserByUsername(username: string) {
    return await this.database.user.findFirst({
      where: { username },
      include: { UsersConfig: true }
    });
  }

  async findGarants() {
    return await this.database.garants.findMany({
      orderBy: {
        username: 'asc'
      }
    })
  }


  async updateUserRights(telegramId: string) {
    const user = await this.findUserByTelegramId(telegramId);

    const updatedUser = await this.database.user.update({
      where: {
        telegramId,
      },
      data: {
        role: user.role == UserRoles.USER ? UserRoles.ADMIN : UserRoles.USER
      }
    });

    return updatedUser;
  }

  async updateUserBanned(userId: string, banned: boolean) {
    return await this.database.user.update({
      where: { id: userId },
      data: { banned },
    })
  }

  async setUserLanguage(telegramId: string, language: UserLanguage) {
    const user = await this.findUserByTelegramId(telegramId);
    if (!user) throw new Error('Пользователь не найден');


    console.log(language)
    return this.database.usersConfig.update({
      where: { userId: user.id },
      data: { language },
    });
  }


  async generateMockUsers(count: number = 20) {
    const users = [];
    for (let i = 0; i < count; i++) {
      users.push({
        telegramId: `mock_${i}_${Date.now()}`,
        username: `user${i}`,
        firstName: `Имя${i}`,
        lastName: `Фамилия${i}`,
        role: 'USER',
      });
    }
    return await this.database.user.createMany({ data: users });
  }


  async setAdminRole(telegramId: string) {
    return await this.database.user.update({
      where: { telegramId },
      data: { role: UserRoles.ADMIN }
    });
  }

  async removeAdminRole(telegramId: string) {
    return await this.database.user.update({
      where: { telegramId },
      data: { role: UserRoles.USER }
    });
  }

  async updateUsernameByTelegramId(telegramId: string, username: string) {
    return await this.database.user.update({
      where: { telegramId },
      data: { username }
    });
  }

}






