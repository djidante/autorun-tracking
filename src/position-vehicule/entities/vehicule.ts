import { Entity, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { LastInfo } from "./last-info";

@Entity({ name: "Vehicule", synchronize: false })
export class Vehicule {

  @PrimaryGeneratedColumn({ name: "vehicule_id" })
  idVehicule: number;


}