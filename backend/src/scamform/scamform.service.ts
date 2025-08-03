import { DatabaseService } from '@/database/database.service';
import { IAppealUserData } from '@/telegram/scenes/appeal_form.scene';
import { IScammerData } from '@/telegram/scenes/scammer_form.scene';
import { UsersService } from '@/users/users.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VoteType } from '@prisma/client';

interface CreateScamFormData {
  scammerData: IScammerData;
  description: string;
  media: Array<{ type: string; file_id: string }>;
  userTelegramId: string
}

interface CreateAppealFormData {
  userData: IAppealUserData;
  description: string;
  media: Array<{ type: string; file_id: string }>;
  userTelegramId: string
}

@Injectable()
export class ScamformService {
  constructor(
    private readonly database: DatabaseService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService
  ) { }

  async create(data: CreateScamFormData) {
    if (!data.scammerData.username && !data.scammerData.telegramId) {
      throw new Error('Необходимо указать либо username, либо telegramId мошенника');
    }

    const user = await this.usersService.findUserByTelegramId(data.userTelegramId);

    let scammerWithTelegramId: any = null;
    let scammerWithoutTelegramId: any = null;

    if (data.scammerData.telegramId) {
      // Ищем скаммера по telegramId (уникально)
      scammerWithTelegramId = await this.database.scammer.findUnique({
        where: { telegramId: data.scammerData.telegramId },
      });
    }

    if (data.scammerData.username) {
      // Ищем скаммера с таким username, но без telegramId
      scammerWithoutTelegramId = await this.database.scammer.findFirst({
        where: {
          username: data.scammerData.username,
          telegramId: null,
        },
      });
    }

    // Если есть скаммер с telegramId
    if (scammerWithTelegramId) {
      // Если есть скаммер без telegramId с таким же username
      if (scammerWithoutTelegramId) {
        // Переносим все жалобы с скаммера без telegramId на скаммера с telegramId
        await this.database.scamForm.updateMany({
          where: {
            scammerId: scammerWithoutTelegramId.id,
          },
          data: {
            scammerId: scammerWithTelegramId.id,
          },
        });

        // Удаляем скаммера без telegramId
        await this.database.scammer.delete({
          where: { id: scammerWithoutTelegramId.id },
        });
      }

      // Обновляем username, если отличается и если пришёл новый username
      if (
        data.scammerData.username &&
        data.scammerData.username !== scammerWithTelegramId.username
      ) {
        scammerWithTelegramId = await this.database.scammer.update({
          where: { id: scammerWithTelegramId.id },
          data: { username: data.scammerData.username },
        });
      }
    }

    // Если скаммер с telegramId не найден — ищем или создаём скаммера с username (без telegramId)
    let scammerToUse = scammerWithTelegramId;

    if (!scammerToUse) {
      if (data.scammerData.username) {
        scammerToUse = await this.database.scammer.findFirst({
          where: { username: data.scammerData.username },
        });
      }

      if (!scammerToUse) {
        // Создаём нового скаммера
        scammerToUse = await this.database.scammer.create({
          data: {
            username: data.scammerData.username,
            telegramId: data.scammerData.telegramId,
          },
        });
      }
    }

    const scamForm = await this.database.scamForm.create({
      data: {
        description: data.description,
        userId: user?.id || null,
        scammerId: scammerToUse.id,
        media: {
          create: data.media.map((media) => ({
            type: media.type,
            fileId: media.file_id,
          })),
        },
      },
      include: {
        media: true,
        user: true,
      },
    });

    return scamForm;
  }



  async createAppeal(data: CreateAppealFormData) {

    if (!data.userData.username && !data.userData.telegramId) {
      throw new Error('Необходимо указать либо username, либо telegramId пользователя');
    }

    const user = await this.usersService.findUserByTelegramId(data.userTelegramId)

    const appealForm = await this.database.appealForm.create({
      data: {
        appealUsername: data.userData.username,
        appealTelegramId: data.userData.telegramId,
        description: data.description,
        userId: user.id,
        media: {
          create: data.media.map(media => ({
            type: media.type,
            fileId: media.file_id
          }))
        }
      },
      include: {
        media: true,
        user: true
      }
    });

    return appealForm;
  }

  async findAll(page: number = 1, limit: number = 10, search: string = '') {
    const skip = (page - 1) * limit;

    const garants = await this.database.garants.findMany();
    const garantsUsernames = garants.map(g => g.username);

    const where = {
      scammer: {
        AND: [
          {
            OR: [
              { username: { notIn: garantsUsernames } },
              { username: null }
            ]
          },
          ...(search
            ? [
                {
                  OR: [
                    { username: { contains: search } },
                    { telegramId: { contains: search } }
                  ]
                }
              ]
            : [])
        ]
      }
    };
    

    const [scamForms, totalCount] = await Promise.all([
      this.database.scamForm.findMany({
        where,
        skip,
        take: limit,
        include: {
          media: true,
          user: true,
          scammer: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      this.database.scamForm.count({ where })
    ]);

    const maxPage = Math.ceil(totalCount / limit);

    return {
      scamForms,
      pagination: {
        totalCount,
        maxPage,
        currentPage: page,
        limit
      }
    };
  }


  async findById(id: string) {
    return this.database.scamForm.findUnique({
      where: { id },
      include: {
        media: true,
        scammer: true
      }
    });
  }

  async getScammers(search: string = '') {
    const where = search
      ? {
        OR: [
          { username: { contains: search } },
          { telegramId: { contains: search } }
        ]
      }
      : {};

    const scammers = await this.database.scammer.findMany({
      where,
      include: {
        scamForms: true
      }
    });

    // Получаем список гарантов для фильтрации
    const garants = await this.database.garants.findMany();
    const garantsUsernames = garants.map(g => g.username);

    // Фильтруем гарантов из результатов
    const filteredScammers = scammers.filter(scammer =>
      !garantsUsernames.includes(scammer.username)
    );

    return filteredScammers.map(scammer => ({
      username: scammer.username,
      telegramId: scammer.telegramId,
      count: scammer.scamForms.length
    }));
  }


  async getFileUrl(fileId: string): Promise<string | null> {
    try {
      const botToken = this.configService.get<string>('BOT_TOKEN');
      if (!botToken) {
        throw new Error('BOT_TOKEN not configured');
      }

      const response = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
      const data = await response.json();

      if (data.ok && data.result.file_path) {
        const fileUrl = `https://api.telegram.org/file/bot${botToken}/${data.result.file_path}`;
        return fileUrl;
      } else {
        console.log('File path not available or API error:', data);
      }
      return null;
    } catch (error) {
      console.error('Error getting file URL:', error);
      return null;
    }
  }

  async voteUser(userTelegramId: string, scamFormId: string, voteType: VoteType) {
    const user = await this.usersService.findUserByTelegramId(userTelegramId);

    const existingVote = await this.database.userVote.findFirst({
      where: {
        userId: user.id,
        scamFormId: scamFormId,
      },
    });

    if (existingVote) {
      return {
        message: '❗️ Вы уже голосовали за эту жалобу',
        isSuccess: false,
      };
    }

    await this.database.userVote.create({
      data: {
        userId: user.id,
        scamFormId: scamFormId,
        voteType: voteType,
      },
    });

    const updatedScamForm = await this.database.scamForm.update({
      where: { id: scamFormId },
      data: {
        likes: voteType === VoteType.LIKE ? { increment: 1 } : undefined,
        dislikes: voteType === VoteType.DISLIKE ? { increment: 1 } : undefined,
      },
    });

    return {
      message: '✅ Ваш голос учтён',
      isSuccess: true,
      likes: updatedScamForm.likes,
      dislikes: updatedScamForm.dislikes,
    };
  }


}
