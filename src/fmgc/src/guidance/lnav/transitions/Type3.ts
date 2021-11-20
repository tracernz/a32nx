import { MathUtils } from '@shared/MathUtils';
import { CALeg } from '@fmgc/guidance/lnav/legs/CA';
import { DFLeg } from '@fmgc/guidance/lnav/legs/DF';
import { HALeg, HFLeg, HMLeg } from '@fmgc/guidance/lnav/legs/HX';
import { RFLeg } from '@fmgc/guidance/lnav/legs/RF';
import { TFLeg } from '@fmgc/guidance/lnav/legs/TF';
import { VMLeg } from '@fmgc/guidance/lnav/legs/VM';
import { Transition } from '@fmgc/guidance/lnav/Transition';
import { ControlLaw, GuidanceParameters } from '@fmgc/guidance/ControlLaws';
import { Coordinates } from '@fmgc/flightplanning/data/geo';
import { Constants } from '@shared/Constants';
import { GuidanceConstants } from '@fmgc/guidance/GuidanceConstants';
import { Geo } from '@fmgc/utils/Geo';
import { arcDistanceToGo } from '../CommonGeometry';

export type Type3PreviousLeg = /* AFLeg | */ CALeg | /* CDLeg | CFLeg | CRLeg | */ DFLeg | /* | FALeg | FMLeg |*/ HALeg | HFLeg | HMLeg |  RFLeg | TFLeg | /* VALeg | VDLeg | */ VMLeg;
export type Type3NextLeg = CALeg | /* CDLeg | CILeg | CRLeg | VALeg | VDLeg | VILeg | */ VMLeg;

const mod = (x: number, n: number) => x - Math.floor(x / n) * n;
const tan = (input: Degrees) => Math.tan(input * (Math.PI / 180));

/**
 * A type I transition uses a fixed turn radius between two fix-referenced legs.
 */
export class Type3Transition extends Transition {
    public previousLeg: Type3PreviousLeg;

    public nextLeg: Type3NextLeg | TFLeg; // FIXME temporary

    constructor(
        previousLeg: Type3PreviousLeg,
        nextLeg: Type3NextLeg | TFLeg, // FIXME temporary
    ) {
        super();
        this.previousLeg = previousLeg;
        this.nextLeg = nextLeg;
    }

    private terminator: Coordinates | undefined;

    getPathStartPoint(): Coordinates | undefined {
        return this.previousLeg.getPathEndPoint();
    }

    getPathEndPoint(): Coordinates | undefined {
        return this.terminator;
    }

    get turnDirection(): Degrees {
        return Math.sign(this.deltaTrack);
    }

    get deltaTrack(): Degrees {
        return MathUtils.fastToFixedNum(MathUtils.diffAngle(this.previousLeg.outboundCourse, this.nextLeg.inboundCourse), 1);
    }

    get courseVariation(): Degrees {
        // TODO reverse turn direction
        return this.deltaTrack;
    }

    public isArc: boolean;

    public startPoint: Coordinates;

    public endPoint: Coordinates;

    public center: Coordinates;

    public sweepAngle: Degrees;

    public radius: NauticalMiles;

    public clockwise: boolean;

    recomputeWithParameters(isActive: boolean, tas: Knots, gs: Knots, ppos: Coordinates) {
        const termFix = this.previousLeg.getPathEndPoint();

        let courseChange;
        let initialTurningPoint;
        if (isActive) {
            if (this.courseVariation <= 90) {
                courseChange = this.deltaTrack;
            } else if (Math.sign(this.courseVariation) === this.turnDirection) {
                courseChange = this.deltaTrack;
            } else {
                courseChange = Math.sign(this.courseVariation) * 2 * Math.PI + this.deltaTrack;
            }
            initialTurningPoint = ppos;
        } else {
            courseChange = this.courseVariation;
            initialTurningPoint = termFix;
        }

        // Course change and delta track?
        const radius = (gs ** 2 / (Constants.G * tan(Math.abs(GuidanceConstants.maxRollAngle)))) / 6080.2;
        const turnCenter = Geo.computeDestinationPoint(initialTurningPoint, radius, this.previousLeg.outboundCourse + 90 * Math.sign(courseChange));
        const finalTurningPoint = Geo.computeDestinationPoint(turnCenter, radius, this.previousLeg.outboundCourse - 90 * Math.sign(courseChange) + courseChange);

        this.radius = radius;

        // Turn direction
        this.clockwise = courseChange >= 0;

        // FIXME PATH MODEL!!!!!!!!
        if (courseChange === 0) {
            this.isArc = false;
            this.startPoint = this.previousLeg.getPathEndPoint();
            this.endPoint = this.previousLeg.getPathEndPoint();

            this.terminator = this.endPoint;

            this.isComputed = true;

            return;
        }

        this.isArc = true;
        this.startPoint = initialTurningPoint;
        this.center = turnCenter;
        this.endPoint = finalTurningPoint;
        this.sweepAngle = courseChange;

        this.terminator = this.endPoint;

        this.isComputed = true;
    }

    get isCircularArc(): boolean {
        return this.isArc;
    }

    get angle(): Degrees {
        return this.sweepAngle;
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

    getTurningPoints(): [Coordinates, Coordinates] {
        return [this.startPoint, this.endPoint];
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

        const groundSpeed = SimVar.GetSimVarValue('GPS GROUND SPEED', 'knots');
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

    getNominalRollAngle(gs: Knots): Degrees {
        const gsMs = gs * (463 / 900);
        return (this.clockwise ? 1 : -1) * Math.atan((gsMs ** 2) / (this.radius * 1852 * 9.81)) * (180 / Math.PI);
    }

    get repr(): string {
        return `TYPE1(${this.previousLeg.repr} TO ${this.nextLeg.repr})`;
    }
}
