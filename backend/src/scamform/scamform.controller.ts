import { Body, Controller, Get, Param, Patch, Put, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ScamformService } from './scamform.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { UserId } from '@/decorators/userid.decorator';
import { VoteType } from '@prisma/client';
import { UsersService } from '@/users/users.service';

@Controller('scamform')
export class ScamformController {
    constructor(
        private readonly scamformService: ScamformService,
        private readonly usersService: UsersService
    ) { }

    @Get()
    async findAllScamforms(
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '10',
        @Query('search') search: string = ''
    ) {
        const pageNum = parseInt(page, 10) || 1;
        const limitNum = parseInt(limit, 10) || 10;

        return await this.scamformService.findAll(pageNum, limitNum, search)
    }

    @UseGuards(JwtAuthGuard)
    @Patch('vote/:voteType/:id')
    async vote(@Param('id') id: string, @Param('voteType') voteType: VoteType, @UserId() userId: string) {
        const user = await this.usersService.findUserById(userId)

        return await this.scamformService.voteUser(user.telegramId, id, voteType)
    }

    @Get('file/:fileId')
    async getFile(@Param('fileId') fileId: string, @Res() res: Response) {
        try {
            const fileUrl = await this.scamformService.getFileUrl(fileId);

            if (!fileUrl) {
                return res.status(404).json({ error: 'File not found' });
            }

            const response = await fetch(fileUrl);

            if (!response.ok) {
                return res.status(404).json({ error: 'Image not found' });
            }

            const buffer = await response.arrayBuffer();
            const contentType = response.headers.get('content-type') || 'image/jpeg';

            res.set({
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000',
                'Access-Control-Allow-Origin': '*'
            });

            res.send(Buffer.from(buffer));
        } catch (error) {
            console.error('Error fetching file:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
