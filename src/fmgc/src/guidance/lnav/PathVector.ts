import { Coordinates } from '@fmgc/flightplanning/data/geo';

export enum PathVectorType {
    Line,
    Arc,
    DebugPoint,
}

export enum PathVectorColour {
    White,
    Green,
    Yellow,
    Cyan,
    Magenta,
}

/**
 * path vectors are generated for the ND etc.
 */
export interface PathVector {
    type: PathVectorType,
    colour?: PathVectorColour,
    startPoint: Coordinates,
    /**
     * end point of line
     */
    endPoint?: Coordinates,
    /**
     * centre of arc
     */
    centrePoint?: Coordinates,
    /**
     * conventional right-hand angle i.e. +ve = anti-clockwise, -ve = clockwise
     */
    sweepAngle?: Degrees,
}

export interface ArcPathVector {
    type: PathVectorType.Arc,
    startPoint: Coordinates,
    endPoint: Coordinates,
    centrePoint: Coordinates,
    sweepAngle: Degrees,
}

export interface LinePathVector {
    type: PathVectorType.Line,
    startPoint: Coordinates,
    endPoint: Coordinates,
}
