import { Latitude, Longitude, NauticalMiles } from "@typings/types";
import { NavDatabase } from "../NavDatabase";

import { Airport, IlsNavaid, NdbNavaid, VhfNavaid, Waypoint } from "../Types";

export class RemoteDatabase implements NavDatabase {
    private static _instance: RemoteDatabase;
    private static apiUrl = 'http://localhost:5000'; // TODO config from somewhere

    public static get instance(): RemoteDatabase {
        if (!this._instance) {
            this._instance = new RemoteDatabase();
        }
        return this._instance;
    }

    /* private ctor for singleton */
    private constructor() {

    }

    public init(): void {

    }

    public update(deltaTime: number): void {

    }

    private async fetchApi(query: string): Promise<object | null> {
        const request = new Request(`${RemoteDatabase.apiUrl}${query}`);

        const response = await fetch(request);
        if (response.status === 200) {
            return response.json();
        }

        return null;
    }

    public async getAirports(idents: string[]): Promise<Airport[] | null> {
        return await this.fetchApi(`/airport/${idents.join()}`) as Airport[];
    }

    public async getAirport(ident: string): Promise<Airport | null> {
        const ret = await this.fetchApi(`/airport/${ident}`) as Airport[];
        if (ret.length < 1) {
            return null;
        } else {
            return ret[0];
        }
    }

    public async getIls(idents: string[], ppos?: LatLongAlt): Promise<IlsNavaid[]> {
        const query = ppos ? `?ppos=${ppos.lat},${ppos.long}` : '';
        return await this.fetchApi(`/ils/${idents.join()}${query}`) as IlsNavaid[];
    }

    public async getNdbs(idents: string[], ppos?: LatLongAlt): Promise<NdbNavaid[]> {
        const query = ppos ? `?ppos=${ppos.lat},${ppos.long}` : '';
        return await this.fetchApi(`/ndb/${idents.join()}${query}`) as NdbNavaid[];
    }

    public async getNearbyVors(range: NauticalMiles = 381): Promise<VhfNavaid[]> {
        // TODO use FMGC position
        const ppos = {
            lat: SimVar.GetSimVarValue('PLANE LATITUDE', 'degree latitude'),
            long: SimVar.GetSimVarValue('PLANE LONGITUDE', 'degree longitude'),
        };
        return await this.fetchApi(`/nearby/vor/${ppos.lat},${ppos.long}?range=${range}`) as VhfNavaid[];
    }

    public async getNearbyNdbs(range: NauticalMiles = 381): Promise<NdbNavaid[]> {
        // TODO use FMGC position
        const ppos = {
            lat: SimVar.GetSimVarValue('PLANE LATITUDE', 'degree latitude'),
            long: SimVar.GetSimVarValue('PLANE LONGITUDE', 'degree longitude'),
        };
        return await this.fetchApi(`/nearby/ndb/${ppos.lat},${ppos.long}?range=${range}`) as NdbNavaid[];
    }

    public async getNearbyAirports(range: NauticalMiles = 381): Promise<Airport[]> {
        // TODO use FMGC position
        const ppos = {
            lat: SimVar.GetSimVarValue('PLANE LATITUDE', 'degree latitude'),
            long: SimVar.GetSimVarValue('PLANE LONGITUDE', 'degree longitude'),
        };
        return await this.fetchApi(`/nearby/airport/${ppos.lat},${ppos.long}?range=${range}`) as Airport[];
    }

    public async getNearbyWaypoints(range: NauticalMiles = 381): Promise<Waypoint[]> {
        // TODO use FMGC position
        const ppos = {
            lat: SimVar.GetSimVarValue('PLANE LATITUDE', 'degree latitude'),
            long: SimVar.GetSimVarValue('PLANE LONGITUDE', 'degree longitude'),
        };
        return await this.fetchApi(`/nearby/waypoint/${ppos.lat},${ppos.long}?range=${range}`) as Waypoint[];
    }

    public async getMora(grids: [Latitude, Longitude][]): Promise<object> {
        const apiGrids = grids.map((grid) => {
            return (grid[0] < 0 ? 'S' : 'N') + Math.abs(grid[0]) + (grid[1] < 0 ? 'W' : 'E') + Math.abs(grid[1]);
        }, '');
        return await this.fetchApi(`/mora/${apiGrids.join()}`);
    }
}
