import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { SkipMlConnection } from './ml-connection.guard';
import { MlService } from './ml.service';
import { MlStatusResponseDto } from './dto/ml-status-response.dto';
import { MlConnectionRequestDto } from './dto/ml-connection-request.dto';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { MlConnectionResultDto } from './dto/ml-connection-result.dto';
import { MlSyncResultDto } from './dto/ml-sync-result.dto';
import { MlAuthUrlDto } from './dto/ml-auth-url.dto';
import type { AuthenticatedRequest } from '../auth/auth.guard';

@Controller('ml')
export class MlController {
  constructor(private readonly mlService: MlService) {}

  @ApiOkResponse({ type: MlAuthUrlDto })
  @SkipMlConnection()
  @Get()
  async getIntegrationLink(
    @Req() req: AuthenticatedRequest,
  ): Promise<MlAuthUrlDto> {
    const userId = String(req.user.sub);
    return { url: await this.mlService.generateAuthUrl(userId) };
  }

  @ApiOkResponse({ type: MlStatusResponseDto })
  @SkipMlConnection()
  @Get('status')
  async isConnectedMl(
    @Req() req: AuthenticatedRequest,
  ): Promise<MlStatusResponseDto> {
    const userId = String(req.user.sub);
    return await this.mlService.getConnectionStatus(userId);
  }

  @ApiOkResponse({ type: MlConnectionResultDto })
  @SkipMlConnection()
  @Post('connect')
  async connectAccount(
    @Req() req: AuthenticatedRequest,
    @Body() data: MlConnectionRequestDto,
  ): Promise<MlConnectionResultDto> {
    const userId = String(req.user.sub);
    return await this.mlService.exchangeCodeForToken(
      data.code,
      data.state,
      userId,
    );
  }

  @ApiBearerAuth()
  @ApiOkResponse({ type: MlSyncResultDto })
  @Post('sync')
  async sync(@Req() req: AuthenticatedRequest): Promise<MlSyncResultDto> {
    const userId = String(req.user.sub);
    const ids = await this.mlService.fetchSellerItems(userId);
    const notSaved = await this.mlService.fetchAndSaveDetailedItems(
      userId,
      ids,
    );
    return { found: ids.length, saved: ids.length - notSaved.length, notSaved };
  }
}
