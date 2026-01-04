import { Module } from '@nestjs/common';
import { ResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';
import { SpacesModule } from 'src/spaces/spaces.module';
import { PrismaService } from 'prisma/prisma.service';
import { ScrapeService } from './scrape.service';

@Module({
  imports: [SpacesModule],
  controllers: [ResourcesController],
  providers: [ResourcesService, PrismaService, ScrapeService],
})
export class ResourcesModule {}
