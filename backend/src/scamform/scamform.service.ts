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
    ) {}

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

    async findAll() {
        return this.database.scamForm.findMany({
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
            }
        });
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

    async updateStatus(id: string, status: string) {
        return this.database.scamForm.update({
            where: { id },
            data: { status }
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
                
                // Проверяем, что файл доступен
                try {
                    const fileResponse = await fetch(fileUrl, { method: 'HEAD' });
                    if (fileResponse.ok) {
                        console.log('File is accessible');
                        return fileUrl;
                    } else {
                        console.log('File not accessible, status:', fileResponse.status);
                        return null;
                    }
                } catch (fileError) {
                    console.log('Error checking file accessibility:', fileError);
                    return null;
                }
            } else {
                console.log('File path not available or API error:', data);
            }

            return null;
        } catch (error) {
            console.error('Error getting file URL:', error);
            return null;
        }
    }

    async getScamFormWithFileUrls(id: string) {
        const scamForm = await this.findById(id);
        if (!scamForm) return null;

        const mediaWithUrls = await Promise.all(
            scamForm.media.map(async (media) => {
                const fileUrl = await this.getFileUrl(media.fileId);
                return {
                    ...media,
                    fileUrl
                };
            })
        );

        return {
            ...scamForm,
            media: mediaWithUrls
        };
    }

    async getAllScamFormsWithFileUrls() {
        const scamForms = await this.findAll();
        
        const formsWithUrls = await Promise.all(
            scamForms.map(async (form) => {
                const mediaWithUrls = await Promise.all(
                    form.media.map(async (media) => {
                        const fileUrl = await this.getFileUrl(media.fileId);
                        return {
                            ...media,
                            fileUrl
                        };
                    })
                );

                return {
                    ...form,
                    media: mediaWithUrls
                };
            })
        );

        return formsWithUrls;
    }
}
