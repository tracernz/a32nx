import { Degrees, NauticalMiles } from '@typings/types';
import { ControlLaw, GuidanceParameters } from '@fmgc/guidance/ControlLaws';
import { LatLongData } from '@typings/fs-base-ui/html_ui/JS/Types';
import { MathUtils } from '@shared/MathUtils';
import { EARTH_RADIUS_NM } from '@fmgc/guidance/Geometry';
import {
    Leg,
    AltitudeConstraint,
    SpeedConstraint,
    getAltitudeConstraintFromWaypoint,
    getSpeedConstraintFromWaypoint,
    waypointToLocation,
} from '@fmgc/guidance/lnav/legs';
import { WayPoint } from '@fmgc/types/fstypes/FSTypes';
import { SegmentType } from '@fmgc/wtsdk';
import { Type4Transition } from '../transitions/Type4';

export class DFLeg implements Leg {
    public from: Type4Transition;

    public to: WayPoint;

    public segment: SegmentType;


    constructor(from: Type4Transition, to: WayPoint, segment: SegmentType) {
        this.from = from;
        this.to = to;
        this.segment = segment;
    }

    get isCircularArc(): boolean {
        return false;
    }

    get bearing(): Degrees {
        // TODO, not really true :/
        return Avionics.Utils.computeGreatCircleHeading(
            this.from.infos.coordinates,
            this.to.infos.coordinates,
        );
    }

    get distance(): NauticalMiles {
        // TODO should be from FTP of type 4
        return Avionics.Utils.computeGreatCircleDistance(this.from.infos.coordinates, this.to.infos.coordinates);
    }

    get speedConstraint(): SpeedConstraint | undefined {
        return getSpeedConstraintFromWaypoint(this.to);
    }

    get altitudeConstraint(): AltitudeConstraint | undefined {
        return getAltitudeConstraintFromWaypoint(this.to);
    }

    // TODO: refactor
    get initialSpeedConstraint(): SpeedConstraint | undefined {
        return getSpeedConstraintFromWaypoint(this.from);
    }

    // TODO: refactor
    get initialAltitudeConstraint(): AltitudeConstraint | undefined {
        return getAltitudeConstraintFromWaypoint(this.from);
    }

    get initialLocation(): LatLongData {
        // TODO not really true
        return waypointToLocation(this.from);
    }

    get terminatorLocation(): LatLongData {
        return waypointToLocation(this.to);
    }

    getPseudoWaypointLocation(distanceBeforeTerminator: NauticalMiles): LatLongData {
        // TODO use ftp of type 4
        const dist = Avionics.Utils.computeGreatCircleDistance(this.from.infos.coordinates, this.to.infos.coordinates) - distanceBeforeTerminator;
        return Avionics.Utils.bearingDistanceToCoordinates(Avionics.Utils.computeGreatCircleHeading(this.from.infos.coordinates, this.to.infos.coordinates), dist, this.to.infos.coordinates.lat, this.to.infos.coordinates.long);
    }

    getGuidanceParameters(ppos: LatLongData, trueTrack: Degrees): GuidanceParameters | null {
        // track angle error
        const desiredTrack = Avionics.Utils.computeGreatCircleHeading(ppos, this.to.infos.coordinates);
        const trackAngleError = MathUtils.mod(desiredTrack - trueTrack + 180, 360) - 180;

        return {
            law: ControlLaw.LATERAL_PATH, // TODO should be track?
            trackAngleError,
            crossTrackError: 0,
            phiCommand: 0,
        };
    }

    getNominalRollAngle(gs): Degrees {
        return 0;
    }

    getDistanceToGo(ppos: LatLongData): NauticalMiles {
        const bearingPposTf = Avionics.Utils.computeGreatCircleHeading(ppos, this.to.infos.coordinates);
        if (Avionics.Utils.diffAngle(bearingPposTf, this.))
        return Avionics.Utils.computeGreatCircleDistance(ppos, this.to.infos.coordinates);
    }

    isAbeam(ppos: LatLongAlt): boolean {
        return true;
    }

    toString(): string {
        return `<DFLeg to=${this.to.ident}>`;
    }
}
