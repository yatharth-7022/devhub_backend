import { Module } from '@nestjs/common';
import { ResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';
import { SpacesModule } from 'src/spaces/spaces.module';
import { PrismaService } from 'prisma/prisma.service';
import { ScrapeService } from './scrape.service';
import { AiModule } from 'src/ai/ai.module';

@Module({
  imports: [SpacesModule, AiModule],
  controllers: [ResourcesController],
  providers: [ResourcesService, PrismaService, ScrapeService],
})
export class ResourcesModule {}
