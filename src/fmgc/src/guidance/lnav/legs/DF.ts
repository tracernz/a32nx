import { AltitudeConstraint, SpeedConstraint } from '@fmgc/guidance/lnav/legs/index';
import { Coordinates } from '@fmgc/flightplanning/data/geo';
import { Guidable } from '@fmgc/guidance/Guidable';
import { SegmentType } from '@fmgc/flightplanning/FlightPlanSegment';
import { GuidanceParameters } from '@fmgc/guidance/ControlLaws';
import { Geo } from '@fmgc/utils/Geo';
import { Type1Transition } from '@fmgc/guidance/lnav/transitions';
import { XFLeg } from '@fmgc/guidance/lnav/legs/XF';
import { PathVector, PathVectorType } from '../PathVector';

export class DFLeg extends XFLeg {
    private computedPath: PathVector[] = [];

    constructor(
        public fix: WayPoint,
        segment: SegmentType,
        indexInFullPath: number,
    ) {
        super();

        this.segment = segment;
        this.indexInFullPath = indexInFullPath;
    }

    start: Coordinates;

    getPathStartPoint(): Coordinates | undefined {
        return this.inboundGuidable?.getPathEndPoint();;
    }

    getPathEndPoint(): Coordinates | undefined {
        if (this.outboundGuidable instanceof Type1Transition) {
            return this.outboundGuidable.getTurningPoints()[0];
        }

        return this.fix.infos.coordinates;
    }

    get predictedPath(): PathVector[] {
        return this.computedPath;
    }

    private inboundGuidable: Guidable | undefined;

    private outboundGuidable: Guidable | undefined;

    recomputeWithParameters(_isActive: boolean, _tas: Knots, _gs: Knots, _ppos: Coordinates, previousGuidable: Guidable, nextGuidable: Guidable) {
        // We don't really do anything here
        this.inboundGuidable = previousGuidable;
        this.outboundGuidable = nextGuidable;

        const start = this.inboundGuidable.getPathEndPoint();
        if (start) {
            this.computedPath = [{
                type: PathVectorType.Line,
                startPoint: start,
                endPoint: this.fix.infos.coordinates,
            }]
        } else {
            this.computedPath.length = 0;
        }

        // FIXME terminator should be start of next guidable

        this.isComputed = true;
    }

    get altitudeConstraint(): AltitudeConstraint | undefined {
        return undefined;
    }

    get inboundCourse(): Degrees {
        return Geo.getGreatCircleBearing(this.inboundGuidable.getPathEndPoint(), this.fix.infos.coordinates);
    }

    get outboundCourse(): Degrees {
        return Geo.getGreatCircleBearing(this.inboundGuidable.getPathEndPoint(), this.fix.infos.coordinates);
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
