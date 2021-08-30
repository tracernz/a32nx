import { Airport } from "../shared/types/Airport";
import { Airway } from "../shared/types/Airway";
import { Approach } from "../shared/types/Approach";
import { Arrival } from "../shared/types/Arrival";
import { Departure } from "../shared/types/Departure";
import { NdbNavaid } from "../shared/types/NdbNavaid";
import { Runway } from "../shared/types/Runway";
import { VhfNavaid } from "../shared/types/VhfNavaid";
import { Waypoint } from "../shared/types/Waypoint";

export abstract class DatabaseBackend {
    abstract getAirportsByIdent(idents: string[]): Promise<Airport[]>;
    abstract getNearbyAirports(lat: number, lon: number, range?: number): Promise<Airport[]>;
    abstract getNearbyVhfNavaids(lat: number, lon: number, range?: number): Promise<VhfNavaid[]>;
    abstract getNearbyNdbNavaids(lat: number, lon: number, range?: number): Promise<NdbNavaid[]>;
    abstract getNearbyWaypoints(lat: number, lon: number, range?: number): Promise<Waypoint[]>;
    abstract getRunways(airportIdentifier: string): Promise<Runway[]>;
    abstract getDepartures(airportIdentifier: string): Promise<Departure[]>;
    abstract getArrivals(airportIdentifier: string): Promise<Arrival[]>;
    abstract getApproaches(airportIdentifier: string): Promise<Approach[]>;
    abstract getAirwaysByIdents(idents: string[]): Promise<Airway[]>;
    abstract getAirwaysByFix(ident: string): Promise<Airway[]>;
}
