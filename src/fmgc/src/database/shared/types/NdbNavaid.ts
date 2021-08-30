import { DatabaseItem, Degrees, KiloHertz, Location, NauticalMiles } from "./Common";
import { VhfNavaidType } from "./VhfNavaid";

export interface NdbNavaid extends DatabaseItem {
    frequency: KiloHertz,
    /**
     * Beware: this is NOT the same as magnetic variation
     */
    stationDeclination?: Degrees,
    location: Location,
    class: NdbClass,
    bfoOperation?: boolean,

    // distance from centre location for nearby airport query
    distance?: NauticalMiles,
}

export enum NdbClass {
    Unknown,
    CompassLocator,
    Mh,
    H,
    Hh,
}
