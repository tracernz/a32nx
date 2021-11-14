import { Guidable } from '@fmgc/guidance/Geometry';
import { PathVector } from './PathVector';

export abstract class Transition implements Guidable {
    abstract isAbeam(ppos: LatLongData): boolean;

    recomputeWithParameters(_tas: Knots) {
        // Default impl.
    }

    abstract getGuidanceParameters(ppos: LatLongData, trueTrack: Degrees);

    abstract getPseudoWaypointLocation(distanceBeforeTerminator: NauticalMiles): LatLongData | undefined;

    abstract getNominalRollAngle(gs): Degrees;

    abstract get isCircularArc(): boolean;

    abstract getDistanceToGo(ppos: LatLongData);

    abstract getTurningPoints(): [LatLongData, LatLongData];

    abstract get distance(): NauticalMiles;

    get isNull(): boolean {
        return false;
    }

    get predictedPath(): PathVector[] | undefined {
        return undefined;
    }
}
