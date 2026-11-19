import { NestFactory } from '@nestjs/core';
import { ProcessorModule } from './processor.module';

async function bootstrap() {
  const app = await NestFactory.create(ProcessorModule);
  await app.listen(process.env.port ?? 3002);
}
bootstrap();
