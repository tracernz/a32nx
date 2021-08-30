import { Location } from "@fmgc/database/shared/types/Common";

// TODO get from proper place
interface LatLongData {
    lat: number,
    long: number,
}

export enum NdSymbolTypeFlags {
    Vor = 1 << 0,
    VorDme = 1 << 1,
    Ndb = 1 << 2,
    Waypoint = 1 << 3,
    Airport = 1 << 4,
    Runway = 1 << 5,
    Tuned = 1 << 6,
    ActiveLegTermination = 1 << 7,
    EfisOption = 1 << 8,
    Dme = 1 << 9,
    ConstraintMet = 1 << 10,
    ConstraintMissed = 1 << 11,
    ConstraintUnknown = 1 << 12,
    SpeedChange = 1 << 13,
    FixInfo = 1 << 14,
}

export interface NdSymbol {
    databaseId: string,
    ident: string,
    location: Location,
    type: NdSymbolTypeFlags,
    constraints?: string[],
    fixInfoRadius?: number,
    fixInfoRadials?: number[],
}
