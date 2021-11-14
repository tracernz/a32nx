import { MathUtils } from '@shared/MathUtils';
import { CALeg } from '@fmgc/guidance/lnav/legs/CA';
import { DFLeg } from '@fmgc/guidance/lnav/legs/DF';
import { HALeg, HFLeg, HMLeg } from '@fmgc/guidance/lnav/legs/HX';
import { TFLeg } from '@fmgc/guidance/lnav/legs/TF';
import { VMLeg } from '@fmgc/guidance/lnav/legs/VM';
import { Transition } from '@fmgc/guidance/lnav/Transition';
import { ControlLaw, GuidanceParameters } from '@fmgc/guidance/ControlLaws';
import { Coordinates } from '@fmgc/flightplanning/data/geo';
import { Geo } from '@fmgc/utils/Geo';
import { GuidanceConstants } from '@fmgc/guidance/GuidanceConstants';
import { Constants } from '@shared/Constants';
import { arcDistanceToGo } from '../CommonGeometry';

export type Type4PreviousLeg = CALeg | /* CDLeg | CFLeg | CILeg | CRLeg | */ DFLeg | /* FALeg | FMLeg |*/ HALeg | HFLeg | HMLeg | TFLeg | /* VALeg | VILeg | VDLeg | */ VMLeg; /* | VRLeg */
export type Type4NextLeg = DFLeg /* | FALeg | FMLeg */

const mod = (x: number, n: number) => x - Math.floor(x / n) * n;
const tan = (input: Degrees) => Math.tan(input * (Math.PI / 180));
const acos = (input: Degrees) => Math.acos(input) * (180 / Math.PI);

/**
 * A type I transition uses a fixed turn radius between two fix-referenced legs.
 */
export class Type4Transition extends Transition {
    public previousLeg: Type4PreviousLeg;

    public nextLeg: Type4NextLeg;

    constructor(
        previousLeg: Type4PreviousLeg,
        nextLeg: Type4NextLeg,
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

    public center: Coordinates;

    public radius: NauticalMiles;

    public clockwise: boolean;

    public revertedTransition: Transition | null = null;

    public lineStartPoint: Coordinates;

    public lineEndPoint: Coordinates;

    public hasArc: boolean;

    public arcStartPoint: Coordinates;

    public arcCentrePoint: Coordinates;

    public arcEndPoint: Coordinates;

    public arcSweepAngle: Degrees;

    rollAnticipationDistance(gs: MetresPerSecond, rollAngleChange: Degrees): NauticalMiles {
        return (gs / 3600) * ((Math.sqrt(1 + (2 * GuidanceConstants.k2 * Constants.G * rollAngleChange) / GuidanceConstants.maxRollRate) - 1) / (GuidanceConstants.k2 * Constants.G));
    }

    recomputeWithParameters(isActive: boolean, tas: Knots, gs: MetresPerSecond, _ppos: Coordinates) {
        const termFix = this.previousLeg.getPathEndPoint();

        // TODO revert to type 1 for CI/VI legs

        // FIXME fix for FX legs
        const nextFix = this.nextLeg.fix.infos.coordinates;

        this.radius = gs ** 2 / (Constants.G * tan(GuidanceConstants.maxRollAngle)) / 6080.2;

        let trackChange = MathUtils.diffAngle(this.previousLeg.outboundCourse, Geo.getGreatCircleBearing(this.previousLeg.getPathEndPoint(), nextFix));
        if (Math.abs(trackChange) < 3) {
            this.revertedTransition = null;
        }

        const turnDirection = trackChange > 0 ? 1 : -1;
        const currentRollAngle = 0; // TODO: if active leg, current aircraft roll, else 0
        const rollAngleChange = Math.abs(turnDirection * GuidanceConstants.maxRollAngle - currentRollAngle);
        const rollAnticipationDistance = this.rollAnticipationDistance(gs, rollAngleChange);

        const itp = rollAnticipationDistance < 0.05 ? termFix
            : Geo.computeDestinationPoint(termFix, rollAnticipationDistance, this.previousLeg.outboundCourse);
        const turnCentre = Geo.computeDestinationPoint(itp, this.radius, this.previousLeg.outboundCourse + turnDirection * 90);

        const distanceToFix = Geo.getDistance(turnCentre, nextFix);

        if (distanceToFix < this.radius) {
            if (Math.abs(MathUtils.diffAngle(this.previousLeg.outboundCourse, Geo.getGreatCircleBearing(termFix, nextFix))) < 60) {
                this.revertedTransition = null;

                this.hasArc = false;
                this.lineStartPoint = termFix;
                this.lineEndPoint = termFix;
                this.terminator = this.lineEndPoint;

                this.isComputed = true;

                return;
            }

            // TODO: delayed turn, recalc RAD
            if (DEBUG) {
                console.error(['[FMS/Geometry] Type4 should be calculated with delayed turn.']);
            }
        }

        const a2 = Geo.getGreatCircleBearing(turnCentre, itp);
        const a3 = Geo.getGreatCircleBearing(turnCentre, nextFix);
        const a5 = acos(this.radius / distanceToFix);

        trackChange = MathUtils.diffAngle(a2, MathUtils.diffAngle(turnDirection * a5, a3));

        const ftp = Geo.computeDestinationPoint(turnCentre, this.radius, this.previousLeg.outboundCourse + trackChange - 90 * turnDirection);

        this.lineStartPoint = this.previousLeg.getPathEndPoint();
        this.lineEndPoint = itp;
        this.hasArc = true;
        this.arcStartPoint = itp;
        this.arcCentrePoint = turnCentre;
        this.arcEndPoint = ftp;
        this.arcSweepAngle = trackChange;

        this.terminator = this.arcEndPoint;

        this.isComputed = true;
    }

    get isCircularArc(): boolean {
        return this.isArc;
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
        return [this.arcStartPoint, this.arcEndPoint];
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
