import { DatabaseService } from '@/database/database.service';
import { IAppealUserData } from '@/telegram/scenes/appeal_form.scene';
import { IScammerData } from '@/telegram/scenes/scammer_form.scene';
import { TelegramService } from '@/telegram/telegram.service';
import { UsersService } from '@/users/users.service';
import { forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VoteType } from '@prisma/client';
import { IUpdateScamFormDto } from './dto/update-scamform.dto';

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
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => TelegramService))
    private readonly telegramService: TelegramService,
  ) { }

  async create(data: CreateScamFormData) {
    if (!data.scammerData.username && !data.scammerData.telegramId) {
      throw new Error('Необходимо указать либо username, либо telegramId мошенника');
    }

    const user = await this.usersService.findUserByTelegramId(data.userTelegramId);

    let scammerWithTelegramId: any = null;
    let scammerWithoutTelegramId: any = null;

    if (data.scammerData.telegramId) {
      scammerWithTelegramId = await this.database.scammer.findUnique({
        where: { telegramId: data.scammerData.telegramId },
      });
    }

    if (data.scammerData.username) {
      scammerWithoutTelegramId = await this.database.scammer.findFirst({
        where: {
          username: data.scammerData.username,
          telegramId: null,
        },
      });
    }

    if (scammerWithTelegramId) {
      if (scammerWithoutTelegramId) {
        await this.database.scamForm.updateMany({
          where: {
            scammerId: scammerWithoutTelegramId.id,
          },
          data: {
            scammerId: scammerWithTelegramId.id,
          },
        });

        await this.database.scammer.delete({
          where: { id: scammerWithoutTelegramId.id },
        });
      }

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

    let scammerToUse = scammerWithTelegramId;

    if (!scammerToUse) {
      if (data.scammerData.username) {
        scammerToUse = await this.database.scammer.findFirst({
          where: { username: data.scammerData.username },
        });
      }

      if (!scammerToUse) {
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

  async findById(id: string) {
    return this.database.scamForm.findUnique({
      where: { id },
      include: {
        media: true,
        scammer: true,
        user: true
      }
    });
  }

  async deleteForm(id: string) {
    const exsForm = await this.findById(id)
    if (!exsForm) throw new NotFoundException('Form not found')


    return await this.database.scamForm.delete({
      where: {
        id
      }
    })
  }

  async findAll(page: number = 1, limit: number = 10, search: string = '', showMarked: boolean = false) {
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
            : []),
          ...(showMarked ? [] : [{ marked: false }])
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

  async getScammers(page: number = 1, limit: number = 10, search: string = '', showMarked: boolean = true) {
    const skip = (page - 1) * limit;

    const garants = await this.database.garants.findMany();
    const garantsUsernames = garants.map(g => g.username);

    const where: any = {
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
          : []),
        ...(showMarked ? [] : [{ marked: false }])
      ]
    };

    const [scammers, totalCount] = await Promise.all([
      this.database.scammer.findMany({
        where,
        skip,
        take: limit,
        include: {
          scamForms: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      this.database.scammer.count({ where })
    ]);

    const maxPage = Math.ceil(totalCount / limit);

    return {
      scammers,
      pagination: {
        currentPage: page,
        maxPage,
        totalCount,
        limit
      }
    };
  }

  async getScammerByQuery(query: string) {
    return await this.database.scammer.findFirst({
      where: {
        OR: [
          {
            username: query
          },
          {
            telegramId: query
          }
        ]
      },
      include: {
        scamForms: true
      }
    });
  }

  async findScammerById(id: string) {
    return await this.database.scammer.findUnique({
      where: {
        id
      },
      include: {
        scamForms: true
      }
    })
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

  async voteFormUser(userTelegramId: string, scamFormId: string, voteType: VoteType) {
    const user = await this.usersService.findUserByTelegramId(userTelegramId);

    const existingVote = await this.database.userFormVote.findFirst({
      where: {
        userId: user.id,
        scamFormId: scamFormId,
      },
    });

    if (existingVote) {
      if (existingVote.voteType === voteType) {
        await this.database.userFormVote.delete({
          where: { id: existingVote.id },
        });

        const updatedScamForm = await this.database.scamForm.update({
          where: { id: scamFormId },
          data: {
            likes: voteType === VoteType.LIKE ? { decrement: 1 } : undefined,
            dislikes: voteType === VoteType.DISLIKE ? { decrement: 1 } : undefined,
          },
        });

        return {
          message: '❌ Ваш голос отменён',
          isSuccess: true,
          likes: updatedScamForm.likes,
          dislikes: updatedScamForm.dislikes,
          userVote: null,
        };
      } else {
        // Если голос другой - изменяем его
        await this.database.userFormVote.update({
          where: { id: existingVote.id },
          data: { voteType: voteType },
        });

        const updatedScamForm = await this.database.scamForm.update({
          where: { id: scamFormId },
          data: {
            likes: voteType === VoteType.LIKE ? { increment: 1 } : { decrement: 1 },
            dislikes: voteType === VoteType.DISLIKE ? { increment: 1 } : { decrement: 1 },
          },
        });

        return {
          message: '✅ Ваш голос изменён',
          isSuccess: true,
          likes: updatedScamForm.likes,
          dislikes: updatedScamForm.dislikes,
          userVote: voteType,
        };
      }
    }

    // Если пользователь ещё не голосовал - создаём новый голос
    await this.database.userFormVote.create({
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
      userVote: voteType,
    };
  }

  async voteScammerUser(userTelegramId: string, scammerId: string, voteType: VoteType) {
    const user = await this.usersService.findUserByTelegramId(userTelegramId);

    const existingVote = await this.database.userScammerVote.findFirst({
      where: {
        userId: user.id,
        scammerId: scammerId,
      },
    });

    if (existingVote) {
      if (existingVote.voteType === voteType) {
        await this.database.userScammerVote.delete({
          where: { id: existingVote.id },
        });

        const updatedScammer = await this.database.scammer.update({
          where: { id: scammerId },
          data: {
            likes: voteType === VoteType.LIKE ? { decrement: 1 } : undefined,
            dislikes: voteType === VoteType.DISLIKE ? { decrement: 1 } : undefined,
          },
        });

        return {
          message: '❌ Ваш голос отменён',
          isSuccess: true,
          likes: updatedScammer.likes,
          dislikes: updatedScammer.dislikes,
          userVote: null,
        };
      } else {
        // Если голос другой - изменяем его
        await this.database.userScammerVote.update({
          where: { id: existingVote.id },
          data: { voteType: voteType },
        });

        const updatedScammer = await this.database.scammer.update({
          where: { id: scammerId },
          data: {
            likes: voteType === VoteType.LIKE ? { increment: 1 } : { decrement: 1 },
            dislikes: voteType === VoteType.DISLIKE ? { increment: 1 } : { decrement: 1 },
          },
        });

        return {
          message: '✅ Ваш голос изменён',
          isSuccess: true,
          likes: updatedScammer.likes,
          dislikes: updatedScammer.dislikes,
          userVote: voteType,
        };
      }
    }

    // Если пользователь ещё не голосовал - создаём новый голос
    await this.database.userScammerVote.create({
      data: {
        userId: user.id,
        scammerId: scammerId,
        voteType: voteType,
      },
    });

    const updatedScammer = await this.database.scammer.update({
      where: { id: scammerId },
      data: {
        likes: voteType === VoteType.LIKE ? { increment: 1 } : undefined,
        dislikes: voteType === VoteType.DISLIKE ? { increment: 1 } : undefined,
      },
    });

    return {
      message: '✅ Ваш голос учтён',
      isSuccess: true,
      likes: updatedScammer.likes,
      dislikes: updatedScammer.dislikes,
      userVote: voteType,
    };
  }

  async updateScammerStatus(data: IUpdateScamFormDto) {
    const { status, scammerId } = data
    try {
      const scammer = await this.database.scammer.findUnique({
        where: { id: scammerId }
      });

      if (!scammer) {
        throw new Error('Scammer not found');
      }




      const updatedScammer = await this.database.scammer.update({
        where: { id: scammerId },
        data: {
          status,
          marked: true
        }
      });

      if (data.formId && scammer.marked == false) {
        const form = await this.findById(data.formId)

        await this.telegramService.complaintOutcome(form, status)
      }


      return {
        message: '✅ Статус успешно обновлен',
        isSuccess: true,
        scammer: updatedScammer
      };
    } catch (error) {
      console.error('Error updating scammer status:', error);
      return {
        message: '❌ Ошибка при обновлении статуса',
        isSuccess: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
