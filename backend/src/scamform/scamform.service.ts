import { DatabaseService } from '@/database/database.service';
import { IScammerData } from '@/telegram/scenes/scammer_form.scene';
import { UsersService } from '@/users/users.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface CreateScamFormData {
  scammerData: IScammerData;
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

    const user = await this.usersService.findUserByTelegramId(data.userTelegramId)


    const scamForm = await this.database.scamForm.create({
      data: {
        scammerUsername: data.scammerData.username,
        scammerTelegramId: data.scammerData.telegramId,

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

    return scamForm;
  }

  async findAll(page: number = 1, limit: number = 10, search: string = '') {
    const skip = (page - 1) * limit;
    const where = search
      ? {
        OR: [
          { username: { contains: search } },
          { description: { contains: search } }
        ]
      }
      : undefined;

    const [scamForms, totalCount] = await Promise.all([
      this.database.scamForm.findMany({
        skip,
        take: limit,
        include: {
          media: true,
          user: {
            select: {
              id: true,
              telegramId: true,
              username: true,
              firstName: true,
              lastName: true,
              role: true,
              createdAt: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        where,
      }),
      this.database.scamForm.count({ where }),
    ]);

    const maxPage = Math.ceil(totalCount / limit);
    return {
      scamForms,
      pagination: {
        totalCount,
        maxPage,
        currentPage: page,
        limit,
      },
    };
  }

  async findById(id: string) {
    return this.database.scamForm.findUnique({
      where: { id },
      include: {
        media: true,
        user: {
          select: {
            id: true,
            telegramId: true,
            username: true,
            firstName: true,
            lastName: true,
            role: true,
            createdAt: true
          }
        }
      }
    });
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


}
