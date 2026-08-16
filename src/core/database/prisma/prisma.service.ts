import { Injectable } from '@nestjs/common';
import { PrismaClient } from '../../../generated/prisma/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      options: '-c search_path=afinitivebd_test',
    });
    const adapter = new PrismaPg(pool, { schema: 'afinitivebd_test' });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
