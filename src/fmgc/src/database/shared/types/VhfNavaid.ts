import { DatabaseItem, Degrees, Location, MegaHertz, NauticalMiles } from "./Common";

export type FigureOfMerit = 0 | 1 | 2 | 3;

export interface VhfNavaid extends DatabaseItem {
    frequency: MegaHertz,
    figureOfMerit: FigureOfMerit,
    /**
     * Beware: this is NOT the same as magnetic variation
     */
    stationDeclination: Degrees,
    vorLocation?: Location,
    dmeLocation?: Location,
    type: VhfNavaidType,
    class?: VorClass,
    ilsDmeBias?: NauticalMiles,

    // distance from centre location for nearby airport query
    distance?: NauticalMiles,
}

export enum VhfNavaidType {
    Unknown,
    Vor,
    VorDme,
    Dme,
    Tacan,
    Vortac,
    Vot,
    IlsDme,
    IlsTacan,
}

export enum VorClass {
    Unknown,
    Terminal,
    LowAlt,
    HighAlt,
}
