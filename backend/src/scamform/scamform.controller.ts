import { Body, Controller, Get, Param, Put, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ScamformService } from './scamform.service';

@Controller('scamform')
export class ScamformController {
    constructor(private readonly scamformService: ScamformService) {}

    @Get()
    async findAll(
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '10',
        @Query('search') search: string = ''
    ) {
        return this.scamformService.getAllScamFormsWithFileUrls(
            parseInt(page),
            parseInt(limit),
            search
        );
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
