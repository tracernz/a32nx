import { MathUtils } from '@shared/MathUtils';
import { TFLeg } from '@fmgc/guidance/lnav/legs/TF';
import { DFLeg } from '@fmgc/guidance/lnav/legs/DF';
import { Transition } from '@fmgc/guidance/lnav/Transition';
import { ControlLaw, GuidanceParameters } from '@fmgc/guidance/ControlLaws';
import { Coordinates } from '@fmgc/flightplanning/data/geo';
import { Guidable } from '@fmgc/guidance/Guidable';
import { arcDistanceToGo } from '../CommonGeometry';

export type Type1PreviousLeg = /* CFLeg | */ DFLeg | TFLeg;
export type Type1NextLeg = /* CFLeg | FALeg | FMLeg | PILeg | */ TFLeg;

const mod = (x: number, n: number) => x - Math.floor(x / n) * n;

/**
 * A type I transition uses a fixed turn radius between two fix-referenced legs.
 */
export class Type1Transition extends Transition {
    public previousLeg: Type1PreviousLeg;

    public nextLeg: Type1NextLeg;

    public radius: NauticalMiles;

    public clockwise: boolean;

    public isFrozen: boolean = false;

    constructor(
        previousLeg: Type1PreviousLeg, // FIXME temporary
        nextLeg: Type1NextLeg, // FIXME temporary
    ) {
        super();
        this.previousLeg = previousLeg;
        this.nextLeg = nextLeg;
    }

    private terminator: Coordinates | undefined;

    getTerminator(): Coordinates | undefined {
        return this.terminator;
    }

    recomputeWithParameters(_isActive:boolean, tas: Knots, _gs:Knots, _ppos:Coordinates, _previousGuidable: Guidable, _nextGuidable: Guidable) {
        if (this.isFrozen) {
            if (DEBUG) {
                console.log('[FMS/Geometry] Not recomputing Type I transition as it is frozen.');
            }
            return;
        }

        const courseChange = mod(this.nextLeg.inboundCourse - this.previousLeg.outboundCourse + 180, 360) - 180;

        // Always at least 5 degrees turn
        const minBankAngle = 5;

        // Start with half the track change
        const bankAngle = Math.abs(courseChange) / 2;

        // Bank angle limits, always assume limit 2 for now @ 25 degrees between 150 and 300 knots
        let maxBankAngle = 25;
        if (tas < 150) {
            maxBankAngle = 15 + Math.min(tas / 150, 1) * (25 - 15);
        } else if (tas > 300) {
            maxBankAngle = 25 - Math.min((tas - 300) / 150, 1) * (25 - 19);
        }

        const finalBankAngle = Math.max(Math.min(bankAngle, maxBankAngle), minBankAngle);

        // Turn radius
        this.radius = (tas ** 2 / (9.81 * Math.tan(finalBankAngle * Avionics.Utils.DEG2RAD))) / 6080.2;

        // Turn direction
        this.clockwise = courseChange >= 0;

        // Turning points
        this.turningPoints = this.computeTurningPoints();

        this.terminator = this.turningPoints[1];

        this.isComputed = true;
    }

    get isCircularArc(): boolean {
        return true;
    }

    get angle(): Degrees {
        const bearingFrom = this.previousLeg.outboundCourse;
        const bearingTo = this.nextLeg.inboundCourse;
        return Math.abs(MathUtils.diffAngle(bearingFrom, bearingTo));
    }

    /**
     * Returns the center of the turning circle, with radius distance from both
     * legs, i.e. min_distance(previous, center) = min_distance(next, center) = radius.
     */
    get center(): LatLongAlt {
        const bisecting = (180 - this.angle) / 2;
        const distanceCenterToWaypoint = this.radius / Math.sin(bisecting * Avionics.Utils.DEG2RAD);

        const { lat, long } = this.previousLeg.getTerminator();

        const inboundReciprocal = mod(this.previousLeg.outboundCourse + 180, 360);

        return Avionics.Utils.bearingDistanceToCoordinates(
            mod(inboundReciprocal + (this.clockwise ? -bisecting : bisecting), 360),
            distanceCenterToWaypoint,
            lat,
            long,
        );
    }

    isAbeam(ppos: LatLongData): boolean {
        const [inbound, outbound] = this.getTurningPoints();

        const inBearingAc = Avionics.Utils.computeGreatCircleHeading(inbound, ppos);
        const inHeadingAc = Math.abs(MathUtils.diffAngle(this.previousLeg.outboundCourse, inBearingAc));

        const outBearingAc = Avionics.Utils.computeGreatCircleHeading(outbound, ppos);
        const outHeadingAc = Math.abs(MathUtils.diffAngle(this.nextLeg.inboundCourse, outBearingAc));

        return inHeadingAc <= 90 && outHeadingAc >= 90;
    }

    get distance(): NauticalMiles {
        const circumference = 2 * Math.PI * this.radius;
        return circumference / 360 * this.angle;
    }

    /**
     * Returns the distance between the inbound turning point and the reference fix
     */
    get unflownDistance() {
        return Avionics.Utils.computeGreatCircleDistance(
            this.previousLeg.getTerminator(),
            this.getTurningPoints()[0],
        );
    }

    private turningPoints;

    private computeTurningPoints(): [LatLongAlt, LatLongAlt] {
        const bisecting = (180 - this.angle) / 2;
        const distanceTurningPointToWaypoint = this.radius / Math.tan(bisecting * Avionics.Utils.DEG2RAD);

        const { lat, long } = this.previousLeg.fix.infos.coordinates;

        const inbound = Avionics.Utils.bearingDistanceToCoordinates(
            mod(this.previousLeg.outboundCourse + 180, 360),
            distanceTurningPointToWaypoint,
            lat,
            long,
        );
        const outbound = Avionics.Utils.bearingDistanceToCoordinates(
            this.nextLeg.inboundCourse,
            distanceTurningPointToWaypoint,
            lat,
            long,
        );

        return [inbound, outbound];
    }

    getTurningPoints(): [LatLongAlt, LatLongAlt] {
        return this.turningPoints;
    }

    /**
     * Returns the distance to the termination point
     *
     * @param _ppos
     */
    getDistanceToGo(ppos: LatLongData): NauticalMiles {
        const [itp] = this.getTurningPoints();
        return arcDistanceToGo(ppos, itp, this.center, this.clockwise ? this.angle : -this.angle);
    }

    getGuidanceParameters(ppos: LatLongAlt, trueTrack: number): GuidanceParameters | null {
        const { center } = this;

        const bearingPpos = Avionics.Utils.computeGreatCircleHeading(
            center,
            ppos,
        );

        const desiredTrack = mod(
            this.clockwise ? bearingPpos + 90 : bearingPpos - 90,
            360,
        );
        const trackAngleError = mod(desiredTrack - trueTrack + 180, 360) - 180;

        const distanceFromCenter = Avionics.Utils.computeGreatCircleDistance(
            center,
            ppos,
        );
        const crossTrackError = this.clockwise
            ? distanceFromCenter - this.radius
            : this.radius - distanceFromCenter;

        const groundSpeed = SimVar.GetSimVarValue('GPS GROUND SPEED', 'meters per second');
        const phiCommand = this.angle > 3 ? this.getNominalRollAngle(groundSpeed) : 0;

        return {
            law: ControlLaw.LATERAL_PATH,
            trackAngleError,
            crossTrackError,
            phiCommand,
        };
    }

    getPseudoWaypointLocation(distanceBeforeTerminator: NauticalMiles): LatLongData | undefined {
        const distanceRatio = distanceBeforeTerminator / this.distance;
        const angleFromTerminator = distanceRatio * this.angle;

        const centerToTerminationBearing = Avionics.Utils.computeGreatCircleHeading(this.center, this.getTurningPoints()[1]);

        return Avionics.Utils.bearingDistanceToCoordinates(
            Avionics.Utils.clampAngle(centerToTerminationBearing + (this.clockwise ? -angleFromTerminator : angleFromTerminator)),
            this.radius,
            this.center.lat,
            this.center.long,
        );
    }

    getNominalRollAngle(gs): Degrees {
        return (this.clockwise ? 1 : -1) * Math.atan((gs ** 2) / (this.radius * 1852 * 9.81)) * (180 / Math.PI);
    }

    get repr(): string {
        return `TYPE1(${this.previousLeg.repr} TO ${this.nextLeg.repr})`;
    }
}
