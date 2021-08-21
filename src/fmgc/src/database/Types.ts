import { Degrees, Feet, FlightLevel, Knots, Metres, TrueDegrees, MagneticDegrees, MegaHertz, KiloHertz, NauticalMiles } from "@typings/types";

export interface DatabaseItem {
    // unique ID that can be used to compare objects
    databaseId: string;
    ident: string;
}

export interface Airport extends DatabaseItem {
    location: LatLongAlt;
    runways: Runway[];
    speedLimit?: Knots;
    speedLimitAltitude?: Feet;
    transitionAltitude?: Feet;
    transitionLevel?: FlightLevel;
    longestRunwaySurfaceType: RunwaySurfaceType;
}

export interface Runway {
    databaseId: string;
    ident: string;
    airportIdent: string;
    centreLocation: LatLong;
    bearing: TrueDegrees;
    magneticBearing: MagneticDegrees;
    gradient: Degrees;
    thresholdLocation: LatLongAlt;
    thresholdCrossingHeight: Feet;
    length: Metres;
    width: Metres;
    lsIdent: string;
    lsCategory: LsCategory;
    surfaceType?: RunwaySurfaceType;
}

export enum LsCategory {
    None,
    LocOnly,
    Category1,
    Category2,
    Category3,
    IgsOnly,
    LdaGlideslope,
    LdaOnly,
    SdfGlideslope,
    SdfOnly,
}

export enum RunwaySurfaceType {
    Unknown,
    Hard,
    Soft,
    Water,
}

export interface Airway {
    databaseId: string;
    ident: string;
    icaoCode: string;
    fixes: string[];
    // TODO continue...
}

export interface ProcedureLeg {
    databaseId: string;
}

export interface VhfNavaid {
    databaseId: string;
    ident: string;
    frequency: MegaHertz;
    figureOfMerit: number;
    stationDeclination: Degrees;
    vorLocation?: LatLongAlt;
    dmeLocation?: LatLongAlt;
    type: VhfNavaidType;
    class?: VorClass;
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

export interface NdbNavaid {
    databaseId: string;
    ident: string;
    frequency: KiloHertz;
    stationDeclination: Degrees;
    location: LatLongAlt;
    class: NdbClass;
}

export enum NdbClass {
    Unknown,
    CompassLocator,
    Mh,
    H,
    Hh,
}

export interface IlsNavaid {
    databaseId: string;
    ident: string;
    frequency: KiloHertz;
    category: LsCategory;
    runwayIdent: string;
    locLocation: LatLongAlt;
    locBearing: MagneticDegrees;
    gsLocation: LatLongAlt;
    gsSlope: Degrees;
    stationDeclination: Degrees;
}

export enum GlsType {
    Unknown,
    LaasGls,
    Scat1,
}

export interface GlsNavaid {
    databaseId: string;
    ident: string;
    channel: number;
    category: LsCategory;
    runwayIdent: string;
    location: LatLongAlt;
    bearing: MagneticDegrees;
    slope: Degrees;
    type: GlsType;
}

export interface Waypoint {
    databaseId: string;
    ident: string;
    location: LatLongAlt;
}

export enum AltitudeDescriptor {
    Empty = 0,
    At = 1, // @, At in Alt1
    AtOrAbove = 2, // +, at or above in Alt1
    AtOrBelow = 3, // -, at or below in Alt1
    Between = 4, // B, range between Alt1 and Alt2
    C = 5, // C, at or above in Alt2
    G = 6, // G, Alt1 At for FAF, Alt2 is glideslope MSL
    H = 7, // H, Alt1 is At or above for FAF, Alt2 is glideslope MSL
    I = 8, // I, Alt1 is at for FACF, Alt2 is glidelope intercept
    J = 9, // J, Alt1 is at or above for FACF, Alt2 is glideslope intercept
    V = 10, // V, Alt1 is procedure alt for step-down, Alt2 is at alt for vertical path angle
    // X = ? maybe not supported
    // Y = ? maybe not supported
}

export enum SpeedDescriptor {
    Mandatory,
    Minimum,
    Maximum,
}

export enum TurnDirection {
    Unknown = 0,
    Left = 1,
    Right = 2,
    Either = 3,
}

// ARINC424 names
export enum LegType {
    Unknown = 0,
    AF = 1, // Arc to a fix (i.e. DME ARC)
    CA = 2, // Course to an Altitude
    CD = 3, // Course to a DME distance
    CF = 4, // Course to a Fix
    CI = 5, // Course to an intercept (next leg)
    CR = 6, // Course to a VOR radial
    DF = 7, // Direct to Fix from PPOS
    FA = 8, // Track from Fix to Altitude
    FC = 9, // Track from Fix to a Distance
    FD = 10, // Track from Fix to a DME distance (not the same fix)
    FM = 11, // Track from Fix to a Manual termination
    HA = 12, // Holding with Altitude termination
    HF = 13, // Holding, single circuit terminating at the fix
    HM = 14, // Holding with manual termination
    IF = 15, // Initial Fix
    PI = 16, // Procedure turn
    RF = 17, // Constant radius arc between two fixes, lines tangent to arc and a centre fix
    TF = 18, // Track to a Fix
    VA = 19, // Heading to an altitude
    VD = 20, // Heading to a DME distance
    VI = 21, // Heading to an intercept
    VM = 22, // Heading to a manual termination
    VR = 23, // Heading to a VOR radial
}

export interface LegConstraints {
    altitude1: Feet;
    altitude2: Feet;
    altitudeDescriptor: AltitudeDescriptor;

    speed: Knots;
    speedDescriptor: SpeedDescriptor;
}

export interface ProcedureLeg {
    databaseId: string;
    type: LegType;
    fixIdent: string;
    constraints?: LegConstraints;
    rnp: NauticalMiles;
    turnDirection: TurnDirection;
}
