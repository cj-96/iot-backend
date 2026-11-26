import { Controller, Get } from '@nestjs/common';
import { ProcessorService } from './processor.service';

@Controller()
export class ProcessorController {
  constructor(private readonly processorService: ProcessorService) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'processor', uptime: process.uptime() };
  }
}
