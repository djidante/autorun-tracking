import {Injectable} from "@nestjs/common";
import {CreateOrUpdateInfoVehiculeDto} from "./dto/create-update-position-vehicule.dto";
import {InfoVehicule} from "../../typing/info-vehicule";
import {LastInfo} from "./entities/last-info";
import {Repository} from "typeorm";
import {Socket} from "socket.io";
import {InjectRepository} from "@nestjs/typeorm";
import {Vehicule} from "./entities/vehicule";
import {EtatVehicule} from "./entities/etat-vehicule.enum";

@Injectable()
export class PositionVehiculeService {

  // Buffer des vehicules
  static infosVehicules: Map<number, { socket: Socket, infoVehicule: InfoVehicule, observateurs: Socket[] }>= new Map<number, {socket: Socket; infoVehicule: InfoVehicule; observateurs: Socket[]}>();

  constructor(
    @InjectRepository(LastInfo)
    private repo: Repository<LastInfo>,
    @InjectRepository(Vehicule)
    private repoV: Repository<Vehicule>
  ) {
  }

  subscribe(observateur: Socket, idsVehicules: number[]) {

    // Un socket va se connecter
    // après il envoie la liste des véhicules qu'il veut observer
    // d'où chaque véhicule va avoir une liste d'observateur
    // et à chaque changement de localisation, ces observateurs vont être notifié à travers un emit
    // ces observateurs vont être notifié lors de :
    // 1. La création ou la mise à jour d'une nouvelle entrée dans positionsVehicules : Map<number, InfoVehicule>
    // 2. Le garage d'un véhicule ou s'il est hors service

    // On récupère la liste des véhicules à observer
    const idsVehiculesObserver = idsVehicules.filter(id => {
        return PositionVehiculeService.infosVehicules.has(id);
      }
    );

    // On ajoute l'observateur à la liste des observateurs de chaque véhicule
    idsVehiculesObserver.forEach(id => {
        const observateurs = PositionVehiculeService.infosVehicules.get(id).observateurs;
        observateurs.push(observateur);
      }
    );

    // On retourne la liste des véhicules observés et non observés
    return {
      idsVehiculesObserver,
      idsVehiculesNonObserver: idsVehicules.filter(id => {
          return !idsVehiculesObserver.includes(id);
        }
      )
    };
  }

  createOrUpdate(createOrUpdateInfoVehiculeDto: CreateOrUpdateInfoVehiculeDto, client: Socket) {
    const { idVehicule, infoVehicule } = createOrUpdateInfoVehiculeDto;

    // check if the véhicules is in the buffer
    // if yes, then just update the value
    // and notify all the subscribed sockets
    // else, create a new ligne in PositionVehicule[]

    if (PositionVehiculeService.infosVehicules.has(idVehicule)) {
      PositionVehiculeService.infosVehicules.set(idVehicule, {
        infoVehicule: infoVehicule,
        socket: client,
        observateurs: PositionVehiculeService.infosVehicules.get(idVehicule).observateurs
      });
    } else {
      PositionVehiculeService.infosVehicules.set(idVehicule, {
        infoVehicule: infoVehicule,
        socket: client,
        observateurs: []
      });
    }

    return PositionVehiculeService.infosVehicules.get(idVehicule).observateurs;
  }

  async saveInfo(info: CreateOrUpdateInfoVehiculeDto){
    const { idVehicule, infoVehicule } = info;
    const {
      latitude,
      logitude,
      temperature,
      niveauCharge,
      etat,
      verrouille
    } = infoVehicule;

    // 1. On récupère la dernière position du véhicule dans la base de données si elle existe
    console.log(this.repo);
    let oldPositionVehicule = await this.repo
        .createQueryBuilder("positionVehicule")
        .leftJoin("positionVehicule.vehicule", "vehicule")
        .where("vehicule.idVehicule = :idVehicule", { idVehicule })
        .getOne();

    // 2. On crée ou met à jour la position du véhicule dans la base de données
    if (!oldPositionVehicule) {
      oldPositionVehicule = new LastInfo();
    }
    oldPositionVehicule.latitudePositionVehicule = latitude;
    oldPositionVehicule.longitudePositionVehicule = logitude;
    oldPositionVehicule.temperature = temperature;
    oldPositionVehicule.etatVehicule = etat;
    oldPositionVehicule.niveauCharge = niveauCharge;
    oldPositionVehicule.verrouille = verrouille;


    // get the vehicule
    let vehicule = await this.repoV
        .createQueryBuilder("vehicule")
        .where("vehicule.idVehicule = :idVehicule", { idVehicule })
        .getOne();

    oldPositionVehicule.vehicule = vehicule;
    await this.repo.save(oldPositionVehicule);
  }


  async saveOrUpdate(createOrUpdatePositionVehiculeDto: CreateOrUpdateInfoVehiculeDto) {

    /*
     * cette méthode est appelée lorsque le véhicule doit se mettre hors service (en garage, en cas de panne, etc.)
     * elle doit mettre à jour la dernière position du véhicule dans la base de données
     * et supprimer tous les observateurs associés à ce véhicule dans le buffer
     * 1. On récupère la dernière position du véhicule dans la base de données si elle existe
     * 2. On crée ou met à jour la position du véhicule dans la base de données
     * 3. On récupère la liste des observateurs associés à ce véhicule pour les notifier qu'il est hors service
     * 4. On supprime le véhicule du buffer
     */


    // extract info
    const { idVehicule, infoVehicule } = createOrUpdatePositionVehiculeDto;
    const {
      latitude,
      logitude,
      temperature,
      niveauCharge,
      etat,
      verrouille
    } = infoVehicule;

    // 1. On récupère la dernière position du véhicule dans la base de données si elle existe
    console.log(this.repo);
    let oldPositionVehicule = await this.repo
      .createQueryBuilder("positionVehicule")
      .leftJoin("positionVehicule.vehicule", "vehicule")
      .where("vehicule.idVehicule = :idVehicule", { idVehicule })
      .getOne();

    // 2. On crée ou met à jour la position du véhicule dans la base de données
    if (!oldPositionVehicule) {
      oldPositionVehicule = new LastInfo();
    }
    oldPositionVehicule.latitudePositionVehicule = latitude;
    oldPositionVehicule.longitudePositionVehicule = logitude;
    oldPositionVehicule.temperature = temperature;
    oldPositionVehicule.etatVehicule = etat;
    oldPositionVehicule.niveauCharge = niveauCharge;
    oldPositionVehicule.verrouille = verrouille;


    // get the vehicule
    let vehicule = await this.repoV
      .createQueryBuilder("vehicule")
      .where("vehicule.idVehicule = :idVehicule", { idVehicule })
      .getOne();

    oldPositionVehicule.vehicule = vehicule;
    await this.repo.save(oldPositionVehicule);

    // 4. On supprime tous les observateurs associés à ce véhicule dans le buffer
    const observateurs = PositionVehiculeService.infosVehicules.get(idVehicule).observateurs;
    PositionVehiculeService.infosVehicules.delete(idVehicule);

    return { idVehicule, oldPositionVehicule, observateurs };
  }

  getVehiculeSocket(idVehicule: number): Socket {

    // récupérer le socket du véhicule selon son id
    return PositionVehiculeService.infosVehicules.get(idVehicule)?.socket;

  }

  getFreeVehicule(): number {
    //retourne un véhicule libre proche, ou 0 si aucun n'existe
    let vehicule = PositionVehiculeService.infosVehicules.get(20);
    if (vehicule == undefined) return (0);
    else if (vehicule.infoVehicule.etat != EtatVehicule.LIBRE) return (0);
    else return 20;
  }

  getVehiculeBySocket(client: Socket): number {
    //retourne l'id d'un véhicule selon son Socket (0 si inexistant)
    let iterator = PositionVehiculeService.infosVehicules.entries();
    let entry = iterator.next();
    let id: number = 0;
    while (!entry.done){
      if (entry.value[1].socket.id == client.id) id = entry.value[0];
      entry = iterator.next();
    }
    return id;
  }

  getVehiculeById(vehiculeId: number):InfoVehicule{
    return PositionVehiculeService.infosVehicules.get(vehiculeId).infoVehicule;
  }

  removeObserver(client: Socket){
    PositionVehiculeService.infosVehicules.forEach(row => {
      row.observateurs=row.observateurs.filter(data => data.id != client.id);
    })
  }
}
