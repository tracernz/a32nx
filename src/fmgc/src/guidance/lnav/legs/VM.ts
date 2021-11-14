import { ControlLaw, GuidanceParameters } from '@fmgc/guidance/ControlLaws';
import { SegmentType } from '@fmgc/wtsdk';
import { Coordinates } from '@fmgc/flightplanning/data/geo';
import { Leg } from '@fmgc/guidance/lnav/legs/Leg';

// TODO needs updated with wind prediction, and maybe local magvar if following for longer distances
export class VMLeg extends Leg {
    // FIXME this is not really a thing, but it's temporary, ok ? I promise !
    public initialPosition: Coordinates;

    public heading: Degrees;

    public initialCourse: Degrees;

    constructor(heading: Degrees, initialPosition: Coordinates, initialCourse: Degrees, segment: SegmentType, indexInFullPath: number) {
        super();
        this.heading = heading;
        this.initialPosition = initialPosition;
        this.initialCourse = initialCourse;
        this.segment = segment;
        this.indexInFullPath = indexInFullPath;
    }

    getPathStartPoint(): Coordinates | undefined {
        // TODO
        return undefined;
    }

    getPathEndPoint(): Coordinates | undefined {
        return Avionics.Utils.bearingDistanceToCoordinates(
            this.heading,
            1,
            this.initialPosition.lat,
            this.initialPosition.long,
        );
    }

    get isCircularArc(): boolean {
        return false;
    }

    get inboundCourse(): Degrees {
        return this.initialCourse;
    }

    get outboundCourse(): Degrees {
        return this.initialCourse;
    }

    get distance(): NauticalMiles {
        return 1;
    }

    // Manual legs don't have speed contraints
    get speedConstraint(): undefined {
        return undefined;
    }

    get altitudeConstraint(): undefined {
        return undefined;
    }

    // Can't get pseudo-waypoint location without a finite terminator
    getPseudoWaypointLocation(_distanceBeforeTerminator: NauticalMiles): undefined {
        return undefined;
    }

    getGuidanceParameters(_ppos: LatLongData, _trueTrack: Track): GuidanceParameters {
        return {
            law: ControlLaw.HEADING,
            heading: this.heading,
        };
    }

    getNominalRollAngle(_gs): Degrees {
        return 0;
    }

    getDistanceToGo(_ppos: LatLongData): NauticalMiles {
        return 1;
    }

    isAbeam(_ppos: LatLongAlt): boolean {
        return true;
    }

    get repr(): string {
        return `VM(${this.heading.toFixed(1)}°)`;
    }
}
