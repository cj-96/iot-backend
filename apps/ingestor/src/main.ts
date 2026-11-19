import { NestFactory } from '@nestjs/core';
import { IngestorModule } from './ingestor.module';

async function bootstrap() {
  const app = await NestFactory.create(IngestorModule);
  await app.listen(process.env.port ?? 3001);
}
bootstrap();
