import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ScamformService } from './scamform.service';

@Controller('scamform')
export class ScamformController {
    constructor(private readonly scamformService: ScamformService) {}

    @Get()
    async findAll() {
        return this.scamformService.getAllScamFormsWithFileUrls();
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.scamformService.getScamFormWithFileUrls(id);
    }

    @Put(':id/status')
    async updateStatus(
        @Param('id') id: string,
        @Body() body: { status: string }
    ) {
        return this.scamformService.updateStatus(id, body.status);
    }

    @Get('test/file/:fileId')
    async testFileUrl(@Param('fileId') fileId: string) {
        const fileUrl = await this.scamformService.getFileUrl(fileId);
        return {
            fileId,
            fileUrl,
            success: !!fileUrl
        };
    }
}
