import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { SpacesService } from 'src/spaces/spaces.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { ScrapeService } from './scrape.service';
import { CreateFromUrlDto } from './dto/create-from-url.dto';
import { ListResourcesQueryDto } from './dto/list-resources.query.dto';
import { PageResult } from 'src/common/pagination';
import { Prisma } from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import { INGEST_QUEUE, INGEST_RESOURCE_JOB } from 'src/ai/ai.constant';
import { Queue } from 'bullmq';
import { IngestResourceJob } from 'src/ai/types/ingest-job.type';

@Injectable()
export class ResourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly spacesService: SpacesService,
    private readonly scrapeService: ScrapeService,
    @InjectQueue(INGEST_QUEUE) private readonly ingestQueue: Queue,
  ) {}

  async createForUser(userId: string, dto: CreateResourceDto) {
    // Ensure the space belongs to the user
    await this.spacesService.ensureUserOwnsSpace(userId, dto.spaceId);
    const resource = await this.prisma.resource.create({
      data: {
        spaceId: dto.spaceId,
        title: dto.title,
        url: dto.url,
        contentPreview: dto.contentPreview,
        tags: dto.tags,
      },
    });
    return resource;
  }
  async createFromUrl(userId: string, dto: CreateFromUrlDto) {
    // Ensure the space belongs to the user
    await this.spacesService.ensureUserOwnsSpace(userId, dto.spaceId);

    const { title, contentPreview, text } =
      await this.scrapeService.scrapeAndProcess(dto.url);

    const resource = await this.prisma.resource.create({
      data: {
        spaceId: dto.spaceId,
        title,
        url: dto.url,
        contentPreview,
        tags: [],
        // pineconeId = null (W3)
      },
    });
    const payload: IngestResourceJob = {
      resourceId: resource.id,
      spaceId: resource.spaceId,
      title: resource.title ?? undefined,
      url: resource.url ?? undefined,
      text,
    };

    // Enqueue ingestion job
    await this.ingestQueue.add(INGEST_RESOURCE_JOB, payload);

    return resource;
  }
  async findBySpaceForUser(userId: string, spaceId: string) {
    // Ensure the space belongs to the user
    await this.spacesService.ensureUserOwnsSpace(userId, spaceId);
    const resources = await this.prisma.resource.findMany({
      where: {
        spaceId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return resources;
  }
  async listForSpace(
    userId: string,
    query: ListResourcesQueryDto,
  ): Promise<PageResult<any>> {
    const {
      spaceId,
      q,
      tags,
      sort = 'createdAt_desc',
      page = 1,
      limit = 20,
    } = query;

    await this.spacesService.ensureUserOwnsSpace(userId, spaceId);

    const skip = (page - 1) * limit;
    const tagList = (tags ?? '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const orderBy =
      sort === 'createdAt_asc'
        ? ({ createdAt: 'asc' } as const)
        : sort === 'title_asc'
          ? ({ title: 'asc' } as const)
          : sort === 'title_desc'
            ? ({ title: 'desc' } as const)
            : ({ createdAt: 'desc' } as const);

    if (!q?.trim()) {
      const where: Prisma.ResourceWhereInput = {
        spaceId,
        ...(tagList.length ? { tags: { hasEvery: tagList } } : {}),
      };

      const [total, items] = await Promise.all([
        this.prisma.resource.count({ where }),
        this.prisma.resource.findMany({
          where,
          orderBy,
          skip,
          take: limit,
        }),
      ]);

      return {
        items,
        page,
        limit,
        total,
        hasNextPage: skip + items.length < total,
      };
    }

    // Search query exists => Postgres FTS fallback (raw SQL)
    // Uses websearch_to_tsquery for a Google-like search syntax.
    // See Postgres docs for text search functions. [web:62]
    const search = q.trim();

    const tagFilterSql =
      tagList.length > 0
        ? Prisma.sql` AND "tags" @> ${tagList}::text[] `
        : Prisma.empty;

    // Total
    const totalRows = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM "Resource"
      WHERE "spaceId" = ${spaceId}
        ${tagFilterSql}
        AND (
          to_tsvector('english', COALESCE("title",'') || ' ' || COALESCE("url",'') || ' ' || COALESCE("contentPreview",''))
          @@ websearch_to_tsquery('english', ${search})
        )
    `;

    const total = Number(totalRows[0]?.count ?? 0n);

    // Items (ranked)
    const items = await this.prisma.$queryRaw<any[]>`
      SELECT *
      FROM "Resource"
      WHERE "spaceId" = ${spaceId}
        ${tagFilterSql}
        AND (
          to_tsvector('english', COALESCE("title",'') || ' ' || COALESCE("url",'') || ' ' || COALESCE("contentPreview",''))
          @@ websearch_to_tsquery('english', ${search})
        )
      ORDER BY "createdAt" DESC
      OFFSET ${skip}
      LIMIT ${limit}
    `;

    return {
      items,
      page,
      limit,
      total,
      hasNextPage: skip + items.length < total,
    };
  }
}
