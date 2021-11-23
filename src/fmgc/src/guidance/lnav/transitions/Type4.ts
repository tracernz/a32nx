import { MathUtils } from '@shared/MathUtils';
import { CALeg } from '@fmgc/guidance/lnav/legs/CA';
import { DFLeg } from '@fmgc/guidance/lnav/legs/DF';
import { HALeg, HFLeg, HMLeg } from '@fmgc/guidance/lnav/legs/HX';
import { TFLeg } from '@fmgc/guidance/lnav/legs/TF';
import { VMLeg } from '@fmgc/guidance/lnav/legs/VM';
import { Transition } from '@fmgc/guidance/lnav/Transition';
import { GuidanceParameters, LateralPathGuidance } from '@fmgc/guidance/ControlLaws';
import { Coordinates } from '@fmgc/flightplanning/data/geo';
import { Geo } from '@fmgc/utils/Geo';
import { GuidanceConstants } from '@fmgc/guidance/GuidanceConstants';
import { Constants } from '@shared/Constants';
import { Geometry } from '@fmgc/guidance/Geometry';
import { PathVector, PathVectorType } from '@fmgc/guidance/lnav/PathVector';
import { LnavConfig } from '@fmgc/guidance/LnavConfig';
import { arcDistanceToGo, arcGuidance, courseToFixDistanceToGo, courseToFixGuidance, maxBank } from '../CommonGeometry';

export type Type4PreviousLeg = CALeg | /* CDLeg | CFLeg | CILeg | CRLeg | */ DFLeg | /* FALeg | FMLeg | */ HALeg | HFLeg | HMLeg | TFLeg | /* VALeg | VILeg | VDLeg | */ VMLeg; /* | VRLeg */
export type Type4NextLeg = DFLeg /* | FALeg | FMLeg */

const tan = (input: Degrees) => Math.tan(input * (Math.PI / 180));
const acos = (input: Degrees) => Math.acos(input) * (180 / Math.PI);

export enum Type4GuidanceState {
    Rad,
    Turn,
}

/**
 * A type I transition uses a fixed turn radius between two fix-referenced legs.
 */
export class Type4Transition extends Transition {
    public state = Type4GuidanceState.Rad;

    private straightCourse: Degrees;

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

    public hasArc: boolean;

    public center: Coordinates;

    public radius: NauticalMiles;

    public clockwise: boolean;

    public revertedTransition: Transition | null = null;

    public lineStartPoint: Coordinates;

    public lineEndPoint: Coordinates;

    public arcStartPoint: Coordinates;

    public arcCentrePoint: Coordinates;

    public arcEndPoint: Coordinates;

    public arcSweepAngle: Degrees;

    rollAnticipationDistance(gs: MetresPerSecond, rollAngleChange: Degrees): NauticalMiles {
        return (gs / 3600) * ((Math.sqrt(1 + (2 * GuidanceConstants.k2 * Constants.G * rollAngleChange) / GuidanceConstants.maxRollRate) - 1) / (GuidanceConstants.k2 * Constants.G));
    }

    private computedPath: PathVector[] = [];

    get predictedPath(): PathVector[] {
        return this.computedPath;
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
        const rollAnticipationDistance = Geometry.getRollAnticipationDistance(tas, 0, rollAngleChange);

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

                this.predictedPath.length = 0;
                this.predictedPath.push({
                    type: PathVectorType.Line,
                    startPoint: this.lineStartPoint,
                    endPoint: this.lineEndPoint,
                });

                if (LnavConfig.DEBUG_PREDICTED_PATH) {
                    this.predictedPath.push(...this.getPathDebugPoints());
                }

                this.straightCourse = Geo.getGreatCircleBearing(this.lineStartPoint, this.lineEndPoint);

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

        this.predictedPath.length = 0;
        this.predictedPath.push({
            type: PathVectorType.Line,
            startPoint: this.lineStartPoint,
            endPoint: this.lineEndPoint,
        });

        this.predictedPath.push({
            type: PathVectorType.Arc,
            startPoint: this.arcStartPoint,
            centrePoint: this.arcCentrePoint,
            endPoint: this.arcEndPoint,
            sweepAngle: this.arcSweepAngle,
        });

        if (LnavConfig.DEBUG_PREDICTED_PATH) {
            this.predictedPath.push(...this.getPathDebugPoints());
        }

        this.straightCourse = Geo.getGreatCircleBearing(this.lineStartPoint, this.lineEndPoint);

        this.isComputed = true;
    }

    private getPathDebugPoints(): PathVector[] {
        const points: PathVector[] = [];

        points.push(
            {
                type: PathVectorType.DebugPoint,
                startPoint: this.lineStartPoint,
                annotation: 'T4 RAD START',
            },
            {
                type: PathVectorType.DebugPoint,
                startPoint: this.lineEndPoint,
                annotation: 'T4 RAD END',
            },
        );

        if (this.hasArc) {
            points.push(
                {
                    type: PathVectorType.DebugPoint,
                    startPoint: this.arcStartPoint,
                    annotation: 'T4 ARC START',
                },
                {
                    type: PathVectorType.DebugPoint,
                    startPoint: this.arcCentrePoint,
                },
                {
                    type: PathVectorType.DebugPoint,
                    startPoint: this.arcEndPoint,
                    annotation: 'T4 ARC END',
                },
            );
        }

        return points;
    }

    get isCircularArc(): boolean {
        return this.hasArc;
    }

    isAbeam(ppos: LatLongData): boolean {
        if (this.state === Type4GuidanceState.Rad) {
            const radDtg = courseToFixDistanceToGo(ppos, this.straightCourse, this.lineEndPoint);

            return radDtg >= -0.05 && radDtg <= Geo.getDistance(this.lineStartPoint, this.lineEndPoint);
        } if (this.state === Type4GuidanceState.Turn) {
            const arcDtg = arcDistanceToGo(ppos, this.arcStartPoint, this.arcCentrePoint, this.arcSweepAngle);

            return arcDtg > 0;
        }

        if (LnavConfig.DEBUG_GUIDANCE) {
            console.error('[FMS/Guidance/Type4] Not in either Rad or Turn state');
        }

        return false;
    }

    get distance(): NauticalMiles {
        const radDistance = Geo.getDistance(this.lineStartPoint, this.lineEndPoint);

        if (this.hasArc) {
            const circumference = 2 * Math.PI * this.radius;

            return radDistance + (circumference / 360 * this.arcSweepAngle);
        }

        return radDistance;
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
        let radDtg = 0;
        if (this.state === Type4GuidanceState.Rad) {
            radDtg = courseToFixDistanceToGo(ppos, this.straightCourse, this.lineEndPoint);
        }

        return radDtg + arcDistanceToGo(ppos, this.arcStartPoint, this.arcCentrePoint, this.arcSweepAngle);
    }

    getGuidanceParameters(ppos: Coordinates, trueTrack: number): GuidanceParameters | null {
        let dtg: NauticalMiles;
        let params: LateralPathGuidance;

        const tas = SimVar.GetSimVarValue('AIRSPEED TRUE', 'knots');

        // State machine & DTG

        switch (this.state) {
        case Type4GuidanceState.Rad:
            dtg = courseToFixDistanceToGo(ppos, this.straightCourse, this.lineEndPoint);
            if (dtg <= 0 && this.hasArc) {
                this.state = Type4GuidanceState.Turn;
            }
            break;
        case Type4GuidanceState.Turn:
            dtg = arcDistanceToGo(ppos, this.arcStartPoint, this.arcCentrePoint, this.arcSweepAngle);
            break;
        default:
        }

        // Guidance

        switch (this.state) {
        case Type4GuidanceState.Rad:
            params = courseToFixGuidance(ppos, trueTrack, this.straightCourse, this.lineEndPoint);

            let bankNext: DegreesTrue = 0;

            if (this.hasArc) {
                bankNext = this.arcSweepAngle > 0 ? maxBank(tas, true) : -maxBank(tas, false);
            }

            params.phiCommand = bankNext;
            break;
        case Type4GuidanceState.Turn:
            params = arcGuidance(ppos, trueTrack, this.arcStartPoint, this.arcCentrePoint, this.arcSweepAngle);
            // TODO next leg RAD
            break;
        default:
        }
        return params;
    }

    getPseudoWaypointLocation(distanceBeforeTerminator: NauticalMiles): LatLongData | undefined {
        const distanceRatio = distanceBeforeTerminator / this.distance;
        const angleFromTerminator = distanceRatio * this.arcSweepAngle;

        const centerToTerminationBearing = Avionics.Utils.computeGreatCircleHeading(this.arcCentrePoint, this.getTurningPoints()[1]);

        return Avionics.Utils.bearingDistanceToCoordinates(
            Avionics.Utils.clampAngle(centerToTerminationBearing + (this.clockwise ? -angleFromTerminator : angleFromTerminator)),
            this.radius,
            this.arcCentrePoint.lat,
            this.arcCentrePoint.long,
        );
    }

    getNominalRollAngle(gs: Knots): Degrees {
        const gsMs = gs * (463 / 900);
        return (this.clockwise ? 1 : -1) * Math.atan((gsMs ** 2) / (this.radius * 1852 * 9.81)) * (180 / Math.PI);
    }

    get repr(): string {
        return `TYPE4(${this.previousLeg.repr} TO ${this.nextLeg.repr})`;
    }
}
