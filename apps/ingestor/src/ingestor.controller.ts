import { Controller, Get } from '@nestjs/common';
import { IngestorService } from './ingestor.service';

@Controller()
export class IngestorController {
  constructor(private readonly ingestorService: IngestorService) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'ingestor', uptime: process.uptime() };
  }
}
