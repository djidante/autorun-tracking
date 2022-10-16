import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Vehicule } from "./vehicule";
import { JoinColumn } from "typeorm";
import { EtatVehicule } from "./etat-vehicule.enum";
import { IsEnum } from "class-validator";

@Entity({ name: "Last_info", synchronize: false })
export class LastInfo {

  @PrimaryGeneratedColumn({ name: "id_last_info_vehicule" })
  idPositionVehicule: number;

  @Column({ name: "logitude_position_vehicule", type: "float" })
  longitudePositionVehicule: number;

  @Column({ name: "latitude_position_vehicule", type: "float" })
  latitudePositionVehicule: number;

  @Column({ name: "temperature_vehicule", type: "float" })
  temperature: number;

  @Column({ name: "niveau_charge_vehicule" })
  niveauCharge: number;

  @Column({ name: "etat_vehicule" })
  @IsEnum(EtatVehicule)
  etatVehicule: EtatVehicule;

  @Column({ name: "verrouille" })
  verrouille: boolean;


  @OneToOne(() => Vehicule)
  @JoinColumn({ name: "vehicule_position" })
  vehicule: Vehicule;

}

