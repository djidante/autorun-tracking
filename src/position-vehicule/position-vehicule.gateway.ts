import {ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer, OnGatewayDisconnect} from "@nestjs/websockets";
import {PositionVehiculeService} from "./position-vehicule.service";
import {CreateOrUpdateInfoVehiculeDto} from "./dto/create-update-position-vehicule.dto";
import {Server, Socket} from "socket.io";
import {DestinationDto} from "./dto/destination.dto";
import {InfoVehicule} from "../../typing/info-vehicule";

@WebSocketGateway({
  cors: {
    origin: "*"
  }
})
export class PositionVehiculeGateway implements OnGatewayDisconnect {

  @WebSocketServer()
  server: Server;

  constructor(private readonly positionVehiculeService: PositionVehiculeService) {
  }

  async handleDisconnect(@ConnectedSocket() client) {
    console.log(client.id + " has disconnected.")
    const vehiculeId = this.positionVehiculeService.getVehiculeBySocket(client)
    if (vehiculeId != 0) { //Si client déconnecté est un véhicule
      let vehiculeInfo = new CreateOrUpdateInfoVehiculeDto();
      vehiculeInfo.idVehicule=vehiculeId
      vehiculeInfo.infoVehicule=this.positionVehiculeService.getVehiculeById(vehiculeId)
      const {
        idVehicule,
        oldPositionVehicule,
        observateurs
      } = await this.positionVehiculeService.saveOrUpdate(vehiculeInfo);
      if (observateurs.length > 0) {
        observateurs.forEach(observateur => {
          observateur.emit("vehicule_indisponible", {
            idVehicule,
            oldPositionVehicule
          });
        });
      }
    }
    this.positionVehiculeService.removeObserver(client);
  }


  @SubscribeMessage("deverrouiller_vehicule")
  async deverrouillerVehicule(@MessageBody() idVehicule: number, @ConnectedSocket() client) {
    const socket = this.positionVehiculeService.getVehiculeSocket(idVehicule);
    socket?.emit("ordre_deverrouillage");
    return socket !== undefined;
  }

  @SubscribeMessage("verrouiller_vehicule")
  async verrouillerVehicule(@MessageBody() idVehicule: number, @ConnectedSocket() client) {
    const socket = this.positionVehiculeService.getVehiculeSocket(idVehicule);
    socket?.emit("ordre_verrouillage");
    return socket !== undefined;
  }

  @SubscribeMessage("debut_location")
  async debutLocation(@MessageBody() idVehicule: number, @ConnectedSocket() client) {
    const socket = this.positionVehiculeService.getVehiculeSocket(idVehicule);
    socket?.emit("location_commencee");
    return socket !== undefined;
  }

  @SubscribeMessage("fin_location")
  async finLocation(@MessageBody() idVehicule: number, @ConnectedSocket() client) {
    const socket = this.positionVehiculeService.getVehiculeSocket(idVehicule);
    socket?.emit("location_finie");
    return socket !== undefined;
  }

  @SubscribeMessage("mise_en_service")
  async miseEnService(@MessageBody() idVehicule: number, @ConnectedSocket() client) {
    const socket = this.positionVehiculeService.getVehiculeSocket(idVehicule);
    socket?.emit("en_service");
    return socket !== undefined;
  }

  @SubscribeMessage("mise_hors_service")
  async miseHorsService(@MessageBody() idVehicule: number, @ConnectedSocket() client) {
    const socket = this.positionVehiculeService.getVehiculeSocket(idVehicule);
    socket?.emit("hors_service");
    return socket !== undefined;
  }

  @SubscribeMessage("destination")
  async destination(@MessageBody() message: DestinationDto, @ConnectedSocket() client) {
    const socket = this.positionVehiculeService.getVehiculeSocket(message.idVehicule);
    socket?.emit("aller_a", message);
    return socket !== undefined;
  }

  @SubscribeMessage("get_free_vehicule")
  async getFreeVehicule(@ConnectedSocket() client) {
    client.emit("vehicule",this.positionVehiculeService.getFreeVehicule());
  }

  @SubscribeMessage("subscribe")
  async subscribe(@ConnectedSocket() observateur: Socket, @MessageBody() idVehicules: number[]) {
    /*
     * cette méthode est appelée lorsqu'un client socket se connecte à la gateway
     * 1. On récupère la liste des véhicules qu'il peut observer et qu'il ne peut pas
     * 2. On notifie le client socket avec un message contenant la liste des véhicules qu'il peut observer
     * ainsi que la liste des véhicules qu'il ne peut pas observer
     */

    // 1. On récupère la liste des véhicules qu'il peut observer et qu'il ne peut pas
    const {
      idsVehiculesObserver,
      idsVehiculesNonObserver
    } = this.positionVehiculeService.subscribe(observateur, idVehicules);

    // 2. On retourne au client socket un message contenant la liste des véhicules qu'il peut observer et qu'il ne peut pas
    // Remarque : pour les vehicules qui ne peuvent pas observer, les clients client doivent récupérer leurs dernières positions
    // de la base de données, et par exemple faire un bouton de souscription, ...
    return {
      idsVehiculesObserver,
      idsVehiculesNonObserver
    };
  }

  @SubscribeMessage("createOrUpdatePositionVehicule")
  createOrUpdate(@MessageBody() createOrUpdatePositionVehiculeDto: CreateOrUpdateInfoVehiculeDto, @ConnectedSocket() client: Socket) {
    // on récupère la liste des observateurs du véhicule créé ou mis à jour
    // si le véhicule est déjà dans le buffer, la liste des observateurs récupérée est non vide d'où on les notifie
    // sinon, la liste des observateurs récupérée est vide, donc on ne notifie pas
    // pour ATC et AM il leur suffit de faire des autres tentatives de connexion pour qu'ils se reconnectent
    const observateurs = this.positionVehiculeService.createOrUpdate(createOrUpdatePositionVehiculeDto, client);
    if (observateurs.length > 0) {
      observateurs.forEach(observateur => {
        observateur.emit("position_update", { ...createOrUpdatePositionVehiculeDto });
      });
    }
  }

  @SubscribeMessage("saveInfoVehicule")
  async saveInfoVehicule(@MessageBody()infoVehicule: CreateOrUpdateInfoVehiculeDto){
    this.positionVehiculeService.saveInfo(infoVehicule);
  }

  @SubscribeMessage("saveOrUpdatePositionVehicule")
  async saveOrUpdate(@MessageBody() createOrUpdatePositionVehiculeDto: CreateOrUpdateInfoVehiculeDto) {
    /*
     * cette méthode est appelée lorsque le véhicule doit se mettre hors service (en garage, en cas de panne, etc.)
     * 1. On la liste des observateurs du véhicule sauvegardé
     * 2. On notifie tous les observateurs du véhicule sauvegardé qu'il est hors service
     */

    const {
      idVehicule,
      oldPositionVehicule,
      observateurs
    } = await this.positionVehiculeService.saveOrUpdate(createOrUpdatePositionVehiculeDto);

    if (observateurs.length > 0) {
      observateurs.forEach(observateur => {
        observateur.emit("vehicule_indisponible", {
          idVehicule,
          oldPositionVehicule
        });
      });
    }
  }
}
