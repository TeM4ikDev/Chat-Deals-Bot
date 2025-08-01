import { DatabaseService } from '@/database/database.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface CreateScamFormData {
  username: string;
  description: string;
  media: Array<{ type: string; file_id: string }>;
  telegramId?: number;
}

interface TelegramFile {
  file_id: string;
  file_unique_id: string;
  file_size?: number;
  file_path?: string;
}

@Injectable()
export class ScamformService {
  constructor(
    private readonly database: DatabaseService,
    private readonly configService: ConfigService
  ) { }

  async create(data: CreateScamFormData) {
    let userId: string | null = null;

    if (data.telegramId) {
      const user = await this.database.user.findUnique({
        where: { telegramId: String(data.telegramId) }
      });

      if (!user) {
        const newUser = await this.database.user.create({
          data: {
            telegramId: String(data.telegramId),
            role: 'USER'
          }
        });
        userId = newUser.id;
      } else {
        userId = user.id;
      }
    }

    const scamForm = await this.database.scamForm.create({
      data: {
        username: data.username,
        description: data.description,
        userId: userId,
        media: {
          create: data.media.map(media => ({
            type: media.type,
            fileId: media.file_id
          }))
        }
      },
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

      console.log('Getting file URL for fileId:', fileId);
      const response = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
      const data = await response.json();

      console.log('Telegram API response:', data);

      if (data.ok && data.result.file_path) {
        const fileUrl = `https://api.telegram.org/file/bot${botToken}/${data.result.file_path}`;
        console.log('Generated file URL:', fileUrl);
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
