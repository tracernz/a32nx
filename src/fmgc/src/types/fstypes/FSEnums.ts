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

export enum RunwayDesignatorChar {
    L = 1,
    R = 2,
    C = 3,
    W = 4, // water
    A = 5,
    B = 6,
}

export enum VorType {
    Unknown = 0,
    VOR = 1,
    VORDME = 2,
    DME = 3,
    TACAN = 4,
    VORTAC = 5,
    ILS = 6,
    VOT = 7,
}

export enum VorClass {
    Unknown = 0,
    Terminal = 1, // T
    LowAltitude = 2, // L
    HighAlttitude = 3, // H
    ILS = 4, // C TODO Tacan as well according to ARINC?
    VOT = 5,
}

export enum NdbType {
    Unknown = 0,
    CompassLocator = 1, // unsure on ARINC coding
    MH = 2, // marine beacon, >200 W
    H = 3, // NDB beacon, 50 - 199 W
    HH = 4, // NDB beacon, > 200 W
}

export enum RouteType {
    LowLevel = 1, // L, victor
    HighLevel = 2, // H, jet
    All = 3, // B, both
}

export enum AirportClass {
    Unknown = 0,
    Normal = 1,
    SoftUnknown = 2, // TODO no idea but is "soft" according to waypoint.js
    Seaplane = 3,
    Heliport = 4,
    Private = 5,
}

export enum AirspaceType {
    None = 0,
    Center = 1,
    ClassA = 2,
    ClassB = 3,
    ClassC = 4,
    ClassD = 5,
    ClassE = 6,
    ClassF = 7,
    ClassG = 8,
    Tower = 9,
    Clearance = 10,
    Ground = 11,
    Departure = 12,
    Approach = 13,
    MOA = 14,
    Restricted = 15,
    Prohibited = 16,
    Warning = 17,
    Alert = 18,
    Danger = 19,
    NationalPark = 20,
    MODEC = 21,
    Radar = 22,
    Training = 23,
}

export enum FrequencyType {
    ATIS = 1,
    Multicom = 2,
    Unicom = 3,
    CTAF = 4,
    Ground = 5,
    Tower = 6,
    Clearance = 7,
    Approach = 8,
    Departure = 9,
    Center = 10,
    FSS = 11,
    AWOS = 12,
    ASOS = 13,
    ClearancePreTaxi = 14,
    RemoteDeliveryClearance = 15,
}

export enum RunwayLighting { // TODO not 100% about this one..
    None = 0,
    Low = 1,
    Medium = 2,
    High = 3,
}

export enum RunwaySurface {
    Concrete = 0,
    Grass = 1,
    Water = 2,
    Cement = 3,
    Asphalt = 4,
    Clay = 7,
    Snow = 8,
    Ice = 9,
    Dirt = 12,
    Coral = 13,
    Gravel = 14,
    OilTreated = 15,
    SteelMats = 16,
    Bituminous = 17,
    Brick = 18,
    Macadam = 19,
    Planks = 20,
    Sand = 21,
    Shale = 22,
    Tarmac = 23,
    Unknown = 254,
    Fs20Material = 512,
    Fs20ApronMaterial = 65283,
}

export enum WaypointConstraintType {
    CLB = 1,
    DES = 2,
}
