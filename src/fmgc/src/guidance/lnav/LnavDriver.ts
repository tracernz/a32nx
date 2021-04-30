import { GuidanceComponent } from '../GuidanceComponent';
import { ControlLaw } from '../ControlLaws';
import { Leg, TFLeg } from '../Geometry';
import { GuidanceController } from '../GuidanceController';

export class LnavDriver implements GuidanceComponent {
    private guidanceController: GuidanceController;

    private lastAvail: boolean;

    private lastXTE: number;

    private lastTAE: number;

    private lastPhi: number;

    constructor(guidanceController: GuidanceController) {
        this.guidanceController = guidanceController;
        this.lastAvail = null;
        this.lastXTE = null;
        this.lastTAE = null;
        this.lastPhi = null;
    }

    init(): void {
        console.log('[FMGC/Guidance] LnavDriver initialized!');
    }

    update(_deltaTime: number): void {
        let available = false;

        const geometry = this.guidanceController.guidanceManager.getActiveLegPathGeometry();

        if (geometry !== null) {
            const ppos = new LatLongAlt(
                SimVar.GetSimVarValue('PLANE LATITUDE', 'degree latitude'),
                SimVar.GetSimVarValue('PLANE LONGITUDE', 'degree longitude'),
                0,
            );

            const trueTrack = SimVar.GetSimVarValue('GPS GROUND TRUE TRACK', 'degree');

            const params = geometry.getGuidanceParameters(ppos, trueTrack);

            if (params) {
                switch (params.law) {
                case ControlLaw.LATERAL_PATH:
                    const {
                        crossTrackError,
                        trackAngleError,
                        phiCommand,
                    } = params;
                    if (!this.lastAvail) {
                        SimVar.SetSimVarValue('L:A32NX_FG_AVAIL', 'Bool', true);
                        this.lastAvail = true;
                    }
                    if (crossTrackError !== this.lastXTE) {
                        SimVar.SetSimVarValue('L:A32NX_FG_CROSS_TRACK_ERROR', 'nautical miles', crossTrackError);
                        this.lastXTE = crossTrackError;
                    }
                    if (trackAngleError !== this.lastTAE) {
                        SimVar.SetSimVarValue('L:A32NX_FG_TRACK_ANGLE_ERROR', 'degree', trackAngleError);
                        this.lastTAE = trackAngleError;
                    }
                    if (phiCommand !== this.lastPhi) {
                        SimVar.SetSimVarValue('L:A32NX_FG_PHI_COMMAND', 'degree', phiCommand);
                        this.lastPhi = phiCommand;
                    }
                    /* console.log(
                                `XTE=${crossTrackError} TAE=${trackAngleError} phi=${phiCommand}`
                            ); */
                    break;
                default:
                    throw new Error(`Invalid control law: ${params.law}`);
                }

                available = true;
            }

            if (geometry.shouldSequenceLeg(ppos)) {
                const currentLeg = geometry.legs.get(1);

                if (currentLeg instanceof TFLeg && currentLeg.to.endsInDiscontinuity) {
                    this.sequenceDiscontinuity(currentLeg);
                } else {
                    this.sequenceLeg(currentLeg);
                }
            }
        }

        if (!available && this.lastAvail !== false) {
            SimVar.SetSimVarValue('L:A32NX_FG_AVAIL', 'Bool', false);
            SimVar.SetSimVarValue('L:A32NX_FG_CROSS_TRACK_ERROR', 'nautical miles', 0);
            SimVar.SetSimVarValue('L:A32NX_FG_TRACK_ANGLE_ERROR', 'degree', 0);
            SimVar.SetSimVarValue('L:A32NX_FG_PHI_COMMAND', 'degree', 0);
            this.lastAvail = false;
            this.lastTAE = null;
            this.lastXTE = null;
            this.lastPhi = null;
        }
    }

    sequenceLeg(_leg?: Leg): void {
        console.log('[FMGC/Guidance] LNAV - sequencing leg');

        let wpIndex = this.guidanceController.flightPlanManager.getActiveWaypointIndex();

        this.guidanceController.flightPlanManager.setActiveWaypointIndex(++wpIndex);
    }

    sequenceDiscontinuity(_leg?: Leg): void {
        console.log('[FMGC/Guidance] LNAV - sequencing discontinuity');

        // TODO make this actually handle discontinuities properly

        if (_leg instanceof TFLeg) {
            _leg.to.endsInDiscontinuity = false;
            _leg.to.discontinuityCanBeCleared = undefined;
        }

        this.sequenceLeg(_leg);
    }

    sequenceManual(_leg?: Leg): void {
        console.log('[FMGC/Guidance] LNAV - sequencing MANUAL');
    }
}
