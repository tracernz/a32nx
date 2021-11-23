import { AltitudeConstraint, SpeedConstraint } from '@fmgc/guidance/lnav/legs/index';
import { Coordinates } from '@fmgc/flightplanning/data/geo';
import { Guidable } from '@fmgc/guidance/Guidable';
import { SegmentType } from '@fmgc/flightplanning/FlightPlanSegment';
import { GuidanceParameters } from '@fmgc/guidance/ControlLaws';
import { Geo } from '@fmgc/utils/Geo';
import { Type1Transition } from '@fmgc/guidance/lnav/transitions';
import { XFLeg } from '@fmgc/guidance/lnav/legs/XF';
import { LnavConfig } from '@fmgc/guidance/LnavConfig';
import { courseToFixDistanceToGo, courseToFixGuidance } from '@fmgc/guidance/lnav/CommonGeometry';
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

    getPathStartPoint(): Coordinates | undefined {
        return this.inboundGuidable?.getPathEndPoint();
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

    private start: Coordinates | undefined;

    private startingPointFrozen = false;

    recomputeWithParameters(_isActive: boolean, _tas: Knots, _gs: Knots, _ppos: Coordinates, previousGuidable: Guidable, nextGuidable: Guidable) {
        // We don't really do anything here
        this.inboundGuidable = previousGuidable;
        this.outboundGuidable = nextGuidable;

        const newStart = this.inboundGuidable?.getPathEndPoint();

        // Adjust the start point if we can
        if (newStart) {
            this.start = newStart;
        }

        this.computedPath = [{
            type: PathVectorType.Line,
            startPoint: this.start,
            endPoint: this.fix.infos.coordinates,
        }];

        if (LnavConfig.DEBUG_PREDICTED_PATH) {
            this.computedPath.push(
                {
                    type: PathVectorType.DebugPoint,
                    startPoint: this.start,
                    annotation: 'DF_START',
                },
                {
                    type: PathVectorType.DebugPoint,
                    startPoint: this.fix.infos.coordinates,
                    annotation: 'DF_END',
                },
            );
        }

        this.isComputed = true;
    }

    get altitudeConstraint(): AltitudeConstraint | undefined {
        return undefined;
    }

    get inboundCourse(): Degrees {
        return Geo.getGreatCircleBearing(this.inboundGuidable.getPathEndPoint(), this.fix.infos.coordinates);
    }

    get outboundCourse(): Degrees {
        return Geo.getGreatCircleBearing(this.inboundGuidable?.getPathEndPoint() ?? this.start, this.fix.infos.coordinates);
    }

    get distance(): NauticalMiles {
        return undefined;
    }

    getDistanceToGo(ppos: Coordinates): NauticalMiles {
        return courseToFixDistanceToGo(ppos, this.outboundCourse, this.fix.infos.coordinates);
    }

    getGuidanceParameters(ppos: Coordinates, trueTrack: Degrees): GuidanceParameters | undefined {
        return courseToFixGuidance(ppos, trueTrack, this.outboundCourse, this.fix.infos.coordinates);
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
