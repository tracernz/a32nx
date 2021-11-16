import { SegmentType } from '@fmgc/flightplanning/FlightPlanSegment';
import { Coordinates } from '@fmgc/flightplanning/data/geo';
import { AltitudeConstraint, SpeedConstraint } from '@fmgc/guidance/lnav/legs/index';
import { Guidable } from '@fmgc/guidance/Guidable';

export abstract class Leg extends Guidable {
    segment: SegmentType;

    indexInFullPath: number;

    abstract get isCircularArc(): boolean;

    abstract get inboundCourse(): Degrees | undefined;

    abstract get outboundCourse(): Degrees | undefined;

    abstract get distance(): NauticalMiles | undefined;

    abstract get speedConstraint(): SpeedConstraint | undefined;

    abstract get altitudeConstraint(): AltitudeConstraint | undefined;

    abstract get initialLocation(): LatLongData | undefined;

    /** @inheritDoc */
    recomputeWithParameters(_isActive: boolean, _tas: Knots, _gs: Knots, _ppos: Coordinates, _previousGuidable: Guidable, _nextGuidable: Guidable): void {
        // Default impl.
    }

    abstract getNominalRollAngle(gs): Degrees | undefined;
}
