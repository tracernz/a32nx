import { AltitudeConstraint, SpeedConstraint } from '@fmgc/guidance/lnav/legs/index';
import { Coordinates } from '@fmgc/flightplanning/data/geo';
import { Guidable } from '@fmgc/guidance/Guidable';
import { SegmentType } from '@fmgc/flightplanning/FlightPlanSegment';
import { Leg } from '@fmgc/guidance/lnav/legs/Leg';
import { GuidanceParameters } from '@fmgc/guidance/ControlLaws';
import { Geo } from '@fmgc/utils/Geo';

export class DFLeg extends Leg {
    constructor(
        public fix: WayPoint,
        segment: SegmentType,
        indexInFullPath: number,
    ) {
        super();

        this.segment = segment;
        this.indexInFullPath = indexInFullPath;

        this.terminator = this.fix.infos.coordinates;
    }

    start: Coordinates;

    private readonly terminator: Coordinates | undefined;

    getTerminator(): Coordinates | undefined {
        return this.terminator;
    }

    private inboundGuidable: Guidable | undefined;

    recomputeWithParameters(_isActive: boolean, _tas: Knots, _gs: Knots, _ppos: Coordinates, previousGuidable: Guidable, _nextGuidable: Guidable) {
        // We don't really do anything here
        this.inboundGuidable = previousGuidable;
        // FIXME terminator should be start of next guidable

        this.isComputed = true;
    }

    get altitudeConstraint(): AltitudeConstraint | undefined {
        return undefined;
    }

    get bearing(): Degrees {
        return Geo.getGreatCircleBearing(this.inboundGuidable.getTerminator(), this.fix.infos.coordinates);
    }

    get distance(): NauticalMiles {
        return undefined;
    }

    getDistanceToGo(_ppos: Coordinates): NauticalMiles {
        return undefined;
    }

    getGuidanceParameters(_ppos: Coordinates, _trueTrack: Degrees): GuidanceParameters | undefined {
        return undefined;
    }

    getNominalRollAngle(_gs: Knots): Degrees {
        return undefined;
    }

    getPseudoWaypointLocation(_distanceBeforeTerminator: NauticalMiles): Coordinates | undefined {
        return undefined;
    }

    get initialLocation(): LatLongData | undefined {
        return undefined;
    }

    isAbeam(_ppos: Coordinates): boolean {
        return false;
    }

    get isCircularArc(): boolean {
        return false;
    }

    get speedConstraint(): SpeedConstraint | undefined {
        return undefined;
    }

    get repr(): string {
        return `DF TO '${this.fix.ident}'`;
    }
}
