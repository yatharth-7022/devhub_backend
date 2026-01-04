import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SpacesService } from './spaces.service';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { JwtUserPayload } from 'src/common/decorators/current-user.decorator';
import { CreateSpaceDto } from './dto/create-space.dto';
import { ok } from 'src/common/api-response';

@Controller('spaces')
@UseGuards(AuthGuard('jwt'))
export class SpacesController {
  // Controller methods would go here
  constructor(private readonly spacesService: SpacesService) {}

  @Post()
  async create(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: CreateSpaceDto,
  ) {
    const space = await this.spacesService.create(user.sub, dto);
    return ok(space);
  }
  @Get()
  async findAll(@CurrentUser() user: JwtUserPayload) {
    const spaces = await this.spacesService.findAllForUser(user.sub);
    return ok(spaces);
  }
}
