import { Coordinates } from '@fmgc/flightplanning/data/geo';
import { Guidable } from '@fmgc/guidance/Guidable';

export abstract class Transition extends Guidable {
    abstract isAbeam(ppos: LatLongData): boolean;

    recomputeWithParameters(_isActive: boolean, _tas: Knots, _gs: MetresPerSecond, _ppos: Coordinates, _previousGuidable: Guidable, _nextGuidable: Guidable) {
        // Default impl.
    }

    abstract getGuidanceParameters(ppos: LatLongData, trueTrack: Degrees);

    abstract getPseudoWaypointLocation(distanceBeforeTerminator: NauticalMiles): LatLongData | undefined;

    abstract getNominalRollAngle(gs): Degrees;

    abstract getDistanceToGo(ppos: LatLongData);

    abstract getTurningPoints(): [LatLongData, LatLongData];

    abstract get distance(): NauticalMiles;

    abstract get repr(): string;

    get isNull(): boolean {
        return false;
    }
}
