import { Module } from "@nestjs/common";
import { PositionVehiculeModule } from "./position-vehicule/position-vehicule.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { LastInfo } from "./position-vehicule/entities/last-info";
import { Vehicule } from "./position-vehicule/entities/vehicule";

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "postgres",
      host: "",
      port: 5432,
      username: "",
      password: "",
      database: "autorun",
      synchronize: false,
      autoLoadEntities: true,
      logging: true,
      entities: [LastInfo, Vehicule]
    }), PositionVehiculeModule]
})
export class AppModule {
}
