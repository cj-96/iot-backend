import { Module } from '@nestjs/common';
import { IngestorController } from './ingestor.controller';
import { IngestorService } from './ingestor.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [IngestorController],
  providers: [IngestorService],
})
export class IngestorModule {}
