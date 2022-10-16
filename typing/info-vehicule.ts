import { EtatVehicule } from "../src/position-vehicule/entities/etat-vehicule.enum";
import { Socket } from "socket.io";

export type InfoVehicule = {
  logitude: number;
  latitude: number;
  temperature: number;
  niveauCharge: number;
  etat: EtatVehicule;
  verrouille: boolean;
}