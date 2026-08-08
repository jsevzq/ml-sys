import { Controller, Get, Param, Req } from '@nestjs/common';
import { ItemsService } from './items.service';
import { ItemDto } from './dto/item.dto';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import type { MlRequest } from '../ml/ml-connection.guard';

@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @ApiBearerAuth()
  @ApiOkResponse({ type: ItemDto, isArray: true })
  @Get()
  async findAll(@Req() req: MlRequest): Promise<ItemDto[]> {
    return this.itemsService.findAll(req.mlAccount.id);
  }

  @ApiBearerAuth()
  @ApiOkResponse({ type: ItemDto })
  @ApiNotFoundResponse({ description: 'La publicación no está sincronizada' })
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Req() req: MlRequest,
  ): Promise<ItemDto> {
    return this.itemsService.findOne(id, req.mlAccount.id);
  }
}
