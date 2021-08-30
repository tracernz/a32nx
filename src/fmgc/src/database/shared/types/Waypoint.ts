import { DatabaseItem, Location } from "./Common";

export enum WaypointType {
    // TODO
    Unknown,
}

export interface Waypoint extends DatabaseItem {
    /**
     * Airport identifier if this is a terminal waypoint
     */
    airportIdent?: string,
    location: Location,
    name?: string,
    type: WaypointType,
    // TODO more...
}
