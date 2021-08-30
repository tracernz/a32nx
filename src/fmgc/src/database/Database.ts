import { Airport } from "./shared/types/Airport";
import { Approach } from "./shared/types/Approach";
import { Arrival } from "./shared/types/Arrival";
import { Departure } from "./shared/types/Departure";
import { Runway } from "./shared/types/Runway";
import { DatabaseBackend } from "./backends/Backend";
import { VhfNavaid } from "./shared/types/VhfNavaid";
import { NdbNavaid } from "./shared/types/NdbNavaid";
import { Waypoint } from "./shared/types/Waypoint";
import { Latitude, Longitude } from "./shared/types/Common";

export class Database {
    backend: DatabaseBackend;

    constructor(backend: DatabaseBackend) {
        this.backend = backend;
    }

    public async getAirportByIdent(ident: string): Promise<Airport | null> {
        const airports = await this.backend.getAirportsByIdent([ident]);
        if (airports.length < 1) {
            return null;
        }
        return airports[0];
    }

    public async getAirportsByIdent(idents: string[]): Promise<Airport[]> {
        return await this.backend.getAirportsByIdent(idents);
    }

    public async getNearbyAirports(lat: number, lon: number, range?: number): Promise<Airport[]> {
        return await this.backend.getNearbyAirports(lat, lon, range);
    }

    public async getNearbyVhfNavaids(lat: number, lon: number, range?: number): Promise<VhfNavaid[]> {
        return await this.backend.getNearbyVhfNavaids(lat, lon, range);
    }

    public async getNearbyNdbNavaids(lat: number, lon: number, range?: number): Promise<NdbNavaid[]> {
        return await this.backend.getNearbyNdbNavaids(lat, lon, range);
    }

    public async getNearbyWaypoints(lat: number, lon: number, range?: number): Promise<Waypoint[]> {
        return await this.backend.getNearbyWaypoints(lat, lon, range);
    }

    public async getRunways(airportIdentifier: string, procedure?: Departure | Arrival): Promise<Runway[]> {
        let runways = await this.backend.getRunways(airportIdentifier);
        if(procedure) {
            runways = runways.filter(runway => procedure.runwayTransitions.find(trans => trans.ident === runway.ident))
        }
        return runways;
    }

    public async getDepartures(airportIdentifier: string, runwayIdentifier?: string): Promise<Departure[]> {
        let departures = await this.backend.getDepartures(airportIdentifier);
        if(runwayIdentifier) {
            departures = departures.filter(departure => departure.runwayTransitions.find(trans => trans.ident === runwayIdentifier))
        }
        return departures;
    }

    public async getArrivals(airportIdentifier: string, approach?: Approach): Promise<Arrival[]> {
        let arrivals = await this.backend.getArrivals(airportIdentifier);
        if(approach) {
            //const runwayIdentifier = FlightPlanUtils.getRunwayFromApproachIdent(approach.ident);
            //arrivals = arrivals.filter(arrival => arrival.runwayTransitions.find(trans => trans.ident === runwayIdentifier))
        }
        return arrivals;
    }

    public async getApproaches(airportIdentifier: string, arrival?: Arrival): Promise<Approach[]> {
        let approaches = await this.backend.getApproaches(airportIdentifier);
        //if(arrival) approaches = approaches.filter(approach => arrival.runwayTransitions.find(trans =>
            //trans.ident === FlightPlanUtils.getRunwayFromApproachIdent(approach.ident)
        //));
        return approaches;
    }

    public async getMora(grids: [Latitude, Longitude][]): Promise<object> {
        return new Promise<object>((resolve, reject) => reject());
    }
}
