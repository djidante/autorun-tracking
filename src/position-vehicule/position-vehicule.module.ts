import { Module } from '@nestjs/common';
import { PositionVehiculeService } from './position-vehicule.service';
import { PositionVehiculeGateway } from './position-vehicule.gateway';
import {TypeOrmModule} from "@nestjs/typeorm";
import {LastInfo} from "./entities/last-info";
import {Vehicule} from "./entities/vehicule";

@Module({
  providers: [PositionVehiculeGateway, PositionVehiculeService],
  imports: [TypeOrmModule.forFeature([LastInfo,Vehicule])],
  exports: [TypeOrmModule]
})
export class PositionVehiculeModule {}
