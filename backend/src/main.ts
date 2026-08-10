import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { join } from 'path';
import express from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: process.env.APP_ORIGIN?.split(',').map((value) => value.trim()) ?? true,
      credentials: true,
    },
    rawBody: true,
  });

  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  app.use('/storage', express.static(join(process.cwd(), 'storage')));

  const config = new DocumentBuilder()
    .setTitle('Estate Levy Platform API')
    .setDescription('Slice 5 API surface for Greenview Estate levy management')
    .setVersion('1.5.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(Number(process.env.PORT ?? 4000));
}

bootstrap();
