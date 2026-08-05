// prisma.config.ts
import 'dotenv/config'; // This forces the .env file to load immediately
import { defineConfig } from '@prisma/config';

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL,
  }
});