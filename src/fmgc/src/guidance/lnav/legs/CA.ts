import { AltitudeConstraint, SpeedConstraint } from '@fmgc/guidance/lnav/legs/index';
import { Coordinates } from '@fmgc/flightplanning/data/geo';
import { Guidable } from '@fmgc/guidance/Guidable';
import { SegmentType } from '@fmgc/flightplanning/FlightPlanSegment';
import { Leg } from '@fmgc/guidance/lnav/legs/Leg';
import { GuidanceParameters } from '@fmgc/guidance/ControlLaws';
import { PathVector, PathVectorType } from '../PathVector';

export class CALeg extends Leg {
    public estimatedTermination: Coordinates;

    private computedPath: PathVector[] = [];

    constructor(
        public readonly course: Degrees,
        public readonly altitude: Feet,
        segment: SegmentType,
        indexInFullPath: number,
    ) {
        super();

        this.segment = segment;
        this.indexInFullPath = indexInFullPath;
    }

    start: Coordinates;

    private terminator: Coordinates | undefined;

    private inboundGuidable: Guidable | undefined;

    getPathStartPoint(): Coordinates | undefined {
        return this.inboundGuidable.getPathEndPoint();
    }

    getPathEndPoint(): Coordinates | undefined {
        this.start = this.inboundGuidable.getPathEndPoint();

        const TEMP_DISTANCE = 2;

        this.terminator = Avionics.Utils.bearingDistanceToCoordinates(
            this.course,
            TEMP_DISTANCE,
            this.start.lat,
            this.start.long,
        );

        return this.terminator;
    }

    get predictedPath(): PathVector[] {
        return this.computedPath;
    }

    recomputeWithParameters(_isActive: boolean, _tas: Knots, _gs: Knots, _ppos: Coordinates, previousGuidable: Guidable, _nextGuidable: Guidable) {
        this.inboundGuidable = previousGuidable;

        this.computedPath = [{
            type: PathVectorType.Line,
            startPoint: this.inboundGuidable.getPathEndPoint(),
            endPoint: this.getPathEndPoint(),
        }];

        this.isComputed = true;
    }

    get altitudeConstraint(): AltitudeConstraint | undefined {
        return undefined;
    }

    get inboundCourse(): Degrees {
        return this.course;
    }

    get outboundCourse(): Degrees {
        return this.course;
    }

    get distance(): NauticalMiles {
        return undefined;
    }

    getDistanceToGo(_ppos: Coordinates): NauticalMiles {
        return undefined;
    }

    getGuidanceParameters(ppos: Coordinates, trueTrack: Degrees): GuidanceParameters | undefined {
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
        return `FA(${this.course.toFixed(1)}°) TO ${Math.round(this.altitude)} FT`;
    }
}
