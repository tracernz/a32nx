import { ControlLaw, GuidanceParameters } from '@fmgc/guidance/ControlLaws';
import {
    AltitudeConstraint,
    SpeedConstraint,
    getAltitudeConstraintFromWaypoint,
    getSpeedConstraintFromWaypoint,
} from '@fmgc/guidance/lnav/legs';
import { SegmentType } from '@fmgc/wtsdk';
import { Coordinates } from '@fmgc/flightplanning/data/geo';
import { Leg } from '@fmgc/guidance/lnav/legs/Leg';
import { arcDistanceToGo, arcGuidance, pointOnArc } from '@fmgc/guidance/lnav/CommonGeometry';

export class RFLeg extends Leg {
    // termination fix of the previous leg
    public from: WayPoint;

    // to fix for the RF leg, most params referenced off this
    public to: WayPoint;

    // location of the centre fix of the arc
    public center: LatLongData;

    public radius: NauticalMiles;

    public angle: Degrees;

    public clockwise: boolean;

    private mDistance: NauticalMiles;

    constructor(from: WayPoint, to: WayPoint, center: LatLongData, segment: SegmentType, indexInFullPath: number) {
        super();
        this.from = from;
        this.to = to;
        this.center = center;
        this.radius = Avionics.Utils.computeGreatCircleDistance(this.center, this.to.infos.coordinates);
        this.segment = segment;
        this.indexInFullPath = indexInFullPath;

        const bearingFrom = Avionics.Utils.computeGreatCircleHeading(this.center, this.from.infos.coordinates); // -90?
        const bearingTo = Avionics.Utils.computeGreatCircleHeading(this.center, this.to.infos.coordinates); // -90?

        switch (to.additionalData.turnDirection) {
        case 1: // left
            this.clockwise = false;
            this.angle = Avionics.Utils.clampAngle(bearingFrom - bearingTo);
            break;
        case 2: // right
            this.clockwise = true;
            this.angle = Avionics.Utils.clampAngle(bearingTo - bearingFrom);
            break;
        case 0: // unknown
        case 3: // either
        default:
            const angle = Avionics.Utils.diffAngle(bearingTo, bearingFrom);
            this.clockwise = this.angle > 0;
            this.angle = Math.abs(angle);
            break;
        }

        this.mDistance = 2 * Math.PI * this.radius / 360 * this.angle;

        this.terminator = this.to.infos.coordinates;
    }

    terminator: Coordinates | undefined;

    getTerminator(): Coordinates | undefined {
        return this.terminator;
    }

    get isCircularArc(): boolean {
        return true;
    }

    get inboundCourse(): Degrees {
        return Avionics.Utils.clampAngle(Avionics.Utils.computeGreatCircleHeading(this.center, this.from.infos.coordinates) + (this.clockwise ? 90 : -90));
    }

    get outboundCourse(): Degrees {
        return Avionics.Utils.clampAngle(Avionics.Utils.computeGreatCircleHeading(this.center, this.to.infos.coordinates) + (this.clockwise ? 90 : -90));
    }

    public get distance(): NauticalMiles {
        return this.mDistance;
    }

    get speedConstraint(): SpeedConstraint | undefined {
        return getSpeedConstraintFromWaypoint(this.to);
    }

    get altitudeConstraint(): AltitudeConstraint | undefined {
        return getAltitudeConstraintFromWaypoint(this.to);
    }

    get initialLocation(): LatLongData {
        return this.from.infos.coordinates;
    }

    getPseudoWaypointLocation(distanceBeforeTerminator: NauticalMiles): LatLongData {
        return pointOnArc(distanceBeforeTerminator, this.to.infos.coordinates, this.center, this.clockwise, this.radius, this.angle, this.distance);
    }

    // basically straight from type 1 transition... willl need refinement
    getGuidanceParameters(ppos: LatLongAlt, trueTrack: number): GuidanceParameters | null {
        // FIXME should be defined in terms of to fix
        return arcGuidance(ppos, trueTrack, this.from.infos.coordinates, this.center, this.clockwise ? this.angle : -this.angle);
    }

    getNominalRollAngle(gs): Degrees {
        return (this.clockwise ? 1 : -1) * Math.atan((gs ** 2) / (this.radius * 1852 * 9.81)) * (180 / Math.PI);
    }

    /**
     * Calculates directed DTG parameter
     *
     * @param ppos {LatLong} the current position of the aircraft
     */
    getDistanceToGo(ppos: LatLongData): NauticalMiles {
        // FIXME geometry should be defined in terms of to...
        return arcDistanceToGo(ppos, this.from.infos.coordinates, this.center, this.clockwise ? this.angle : -this.angle);
    }

    isAbeam(ppos: LatLongData): boolean {
        const bearingPpos = Avionics.Utils.computeGreatCircleHeading(
            this.center,
            ppos,
        );

        const bearingFrom = Avionics.Utils.computeGreatCircleHeading(
            this.center,
            this.from.infos.coordinates,
        );

        const trackAngleError = this.clockwise ? Avionics.Utils.diffAngle(bearingFrom, bearingPpos) : Avionics.Utils.diffAngle(bearingPpos, bearingFrom);

        return trackAngleError >= 0;
    }

    toString(): string {
        return `<RFLeg radius=${this.radius} to=${this.to}>`;
    }

    get repr(): string {
        return `RF(${this.radius.toFixed(1)}NM. ${this.angle.toFixed(1)}°) TO ${this.to.ident}`;
    }
}
