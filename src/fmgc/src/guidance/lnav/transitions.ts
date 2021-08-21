import { Guidable } from '@fmgc/guidance/Geometry';
import { LatLongData } from '@typings/fs-base-ui';
import { Degrees, NauticalMiles } from '@typings/types';

export abstract class Transition implements Guidable {
    abstract isAbeam(ppos: LatLongAlt): boolean;

    abstract getGuidanceParameters(ppos: LatLongAlt, trueTrack: Degrees);

    abstract getNominalRollAngle(gs): Degrees;

    abstract get isCircularArc(): boolean;

    abstract getDistanceToGo(ppos: LatLongAlt);

    abstract getTrackDistanceToTerminationPoint(ppos: LatLongAlt): NauticalMiles;

    abstract getTurningPoints(): [LatLongData, LatLongData]
}
