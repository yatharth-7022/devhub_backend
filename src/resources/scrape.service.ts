// src/resources/scrape.service.ts

import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Injectable, Logger } from '@nestjs/common';
import { chromium } from 'playwright';

class HTMLLoader {
  parse({ html }: { html: string }) {
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return Promise.resolve([{ pageContent: text }]);
  }
}

@Injectable()
export class ScrapeService {
  private readonly logger = new Logger(ScrapeService.name);

  private readonly splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  async scrapeAndProcess(url: string): Promise<{
    title: string;
    contentPreview: string;
    text: string; // main extracted text
  }> {
    let browser;
    try {
      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        viewport: { width: 1920, height: 1080 },
      });

      const page = await context.newPage();
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      const html = await page.content();
      const title = (await page.title()) || 'Untitled';

      const loader = new HTMLLoader();
      const docs = await loader.parse({ html });

      const rawText = docs
        .map((d) => d.pageContent)
        .join('\n')
        .trim();
      if (!rawText) throw new Error('No readable content found');

      // We keep full text for embedding, and preview for UI
      const chunks = await this.splitter.splitText(rawText);
      const contentPreview = (chunks[0] ?? rawText).slice(0, 400);

      return {
        title: title.slice(0, 200),
        contentPreview,
        text: rawText,
      };
    } catch (error: any) {
      this.logger.error(`Scrape failed for ${url}: ${error?.message ?? error}`);
      throw new Error(
        `Failed to scrape ${url}: ${error?.message ?? 'Unknown error'}`,
      );
    } finally {
      if (browser) await browser.close();
    }
  }
}
