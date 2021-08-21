import { Latitude, Longitude, NauticalMiles } from "@typings/types";
import { Airport, IlsNavaid, NdbNavaid, VhfNavaid, Waypoint } from "./Types";

export abstract class NavDatabase {
    public abstract getAirport(ident: string): Promise<Airport | null>
    public abstract getAirports(idents: string[]): Promise<Airport[] | null>; // TODO maybe an object with ident keys better?
    /**
     *
     * @param ident
     * @param ppos result list will be sorted by distance from ppos if provided
     */
    public abstract getIls(idents: string[], ppos?: LatLongAlt): Promise<IlsNavaid[]>;
    public abstract getNdbs(idents: string[], ppos?: LatLongAlt): Promise<NdbNavaid[]>;

    public abstract getNearbyVors(range: NauticalMiles): Promise<VhfNavaid[]>;
    public abstract getNearbyNdbs(range: NauticalMiles): Promise<NdbNavaid[]>;
    public abstract getNearbyAirports(range: NauticalMiles): Promise<Airport[]>;
    public abstract getNearbyWaypoints(range: NauticalMiles): Promise<Waypoint[]>;

    public abstract getMora(grids: [Latitude, Longitude][]): Promise<object>;
}
