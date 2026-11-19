import { Injectable } from '@nestjs/common';

@Injectable()
export class IngestorService {
  getHello(): string {
    return 'Hello World!';
  }
}
