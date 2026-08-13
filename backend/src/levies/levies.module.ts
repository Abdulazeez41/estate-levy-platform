import { Module } from '@nestjs/common';
import { LeviesController } from './levies.controller';
import { LeviesService } from './levies.service';

@Module({ controllers: [LeviesController], providers: [LeviesService], exports: [LeviesService] })
export class LeviesModule {}
