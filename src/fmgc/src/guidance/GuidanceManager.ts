import { WayPoint } from '@fmgc/types/fstypes/FSTypes';
import { Degrees, Feet } from '@typings/types';
import { CALeg } from '@fmgc/guidance/lnav/legs/CA';
import { DFLeg } from '@fmgc/guidance/lnav/legs/DF';
import { RFLeg } from '@fmgc/guidance/lnav/legs/RF';
import { TFLeg } from '@fmgc/guidance/lnav/legs/TF';
import { VMLeg } from '@fmgc/guidance/lnav/legs/VM';
import { Leg } from '@fmgc/guidance/lnav/legs';
import { Transition } from '@fmgc/guidance/lnav/transitions';
import { LatLongData } from '@typings/fs-base-ui/html_ui/JS/Types';
import { SegmentType } from '@fmgc/wtsdk';
import { Coordinates } from '@fmgc/flightplanning/data/geo';
import { Geometry } from './Geometry';
import { FlightPlanManager } from '../flightplanning/FlightPlanManager';
import { Type1NextLeg, Type1PreviousLeg, Type1Transition } from '@fmgc/guidance/lnav/transitions/Type1';
import { Type2NextLeg, Type2PreviousLeg, Type2Transition } from '@fmgc/guidance/lnav/transitions/Type2';
import { Type3NextLeg, Type3PreviousLeg, Type3Transition } from '@fmgc/guidance/lnav/transitions/Type3';
import { Type4NextLeg, Type4PreviousLeg, Type4Transition } from '@fmgc/guidance/lnav/transitions/Type4';
import { LegType } from '@fmgc/types/fstypes/FSEnums';

/**
 * This class will guide the aircraft by predicting a flight path and
 * calculating the autopilot inputs to follow the predicted flight path.
 */
export class GuidanceManager {
    public flightPlanManager: FlightPlanManager;

    constructor(flightPlanManager: FlightPlanManager) {
        this.flightPlanManager = flightPlanManager;
    }

    private static tfBetween(from: WayPoint, to: WayPoint, segment: SegmentType) {
        return new TFLeg(from, to, segment);
    }

    private static vmWithHeading(heading: Degrees, initialPosition: Coordinates, initialCourse: Degrees, segment: SegmentType) {
        return new VMLeg(heading, initialPosition, initialCourse, segment);
    }

    private static rfLeg(from: WayPoint, to: WayPoint, center: LatLongData, segment: SegmentType) {
        return new RFLeg(from, to, center, segment);
    }

    private static caLeg(from: WayPoint, course: Degrees, altitude: Feet, active: boolean, segment: SegmentType) {
        return new CALeg(from, course, altitude, active, segment);
    }

    private static dfLeg(from: Type4Transition, to: WayPoint, segment: SegmentType): DFLeg {
        // TODO remove from
        return new DFLeg(from, to, segment);
    }

    getActiveLeg(): CALeg | DFLeg | RFLeg | TFLeg | VMLeg | null {
        const activeIndex = this.flightPlanManager.getActiveWaypointIndex(false, false, 0);

        const from = this.flightPlanManager.getWaypoint(activeIndex - 1, 0);
        const to = this.flightPlanManager.getWaypoint(activeIndex, 0);
        const segment = this.flightPlanManager.getSegmentFromWaypoint(to, 0).type;

        if (!from || !to) {
            return null;
        }

        if (from.endsInDiscontinuity) {
            return null;
        }

        switch (to.additionalData.legType) {
        case LegType.CA:
            return GuidanceManager.caLeg(from, to.additionalData.course, to.additionalData.altitude, true, segment);
        case LegType.DF:
            return GuidanceManager.dfLeg(this.lastTransition as Type4Transition, to, segment);
        case LegType.RF:
            return GuidanceManager.rfLeg(from, to, to.additionalData.center, segment);
        case LegType.TF:
            return GuidanceManager.tfBetween(from, to, segment);

        // not yet implemented (please move into order above when done)
        case LegType.AF:
        case LegType.CD:
        case LegType.CF:
        case LegType.CI:
        case LegType.CR:
        case LegType.FA:
        case LegType.FM:
        case LegType.HA:
        case LegType.HF:
        case LegType.HM:
        case LegType.IF:
        case LegType.PI:
        case LegType.VA:
        case LegType.VI:
        case LegType.VD:
        case LegType.VM:
        case LegType.VR:
            return GuidanceManager.tfBetween(from, to, segment);
        default:
            throw new Error(`Unknown leg type ${to.additionalData.legType}`);
        }
    }

    getNextLeg(): CALeg | DFLeg | RFLeg | TFLeg | VMLeg | null {
        const activeIndex = this.flightPlanManager.getActiveWaypointIndex(false, false, 0);

        const from = this.flightPlanManager.getWaypoint(activeIndex, 0);
        const to = this.flightPlanManager.getWaypoint(activeIndex + 1, 0);
        const segment = this.flightPlanManager.getSegmentFromWaypoint(to, 0).type;

        if (!from || !to) {
            return null;
        }

        if (from.endsInDiscontinuity) {
            return null;
        }

        switch (to.additionalData.legType) {
        case LegType.CA:
            return GuidanceManager.caLeg(from, to.additionalData.course, to.additionalData.altitude, false, segment);
        case LegType.DF:
            const transition = this.getTransition(this.getActiveLeg(), nextLeg);
            return GuidanceManager.dfLeg(, to, segment);
        case LegType.RF:
            return GuidanceManager.rfLeg(from, to, to.additionalData.center, segment);
        case LegType.TF:
            return GuidanceManager.tfBetween(from, to, segment);

        // not yet implemented (please move into order above when done)
        case LegType.AF:
        case LegType.CD:
        case LegType.CF:
        case LegType.CI:
        case LegType.CR:
        case LegType.FA:
        case LegType.FM:
        case LegType.HA:
        case LegType.HF:
        case LegType.HM:
        case LegType.IF:
        case LegType.PI:
        case LegType.VA:
        case LegType.VI:
        case LegType.VD:
        case LegType.VM:
        case LegType.VR:
            return GuidanceManager.tfBetween(from, to, segment);
        default:
            throw new Error(`Unknown leg type ${to.additionalData.legType}`);
        }
    }

    /**
     * The active leg path geometry, used for immediate autoflight.
     */
    // TODO Extract leg and transition building
    getActiveLegPathGeometry(): Geometry | null {
        const activeLeg = this.getActiveLeg();
        const nextLeg = this.getNextLeg();

        if (!activeLeg) {
            return null;
        }

        const legs = new Map<number, Leg>([[1, activeLeg]]);
        const transitions = new Map<number, Transition>();

        // TODO generalise selection of transitions
        if (nextLeg) {
            legs.set(2, nextLeg);
            const transition = this.getTransition(activeLeg, nextLeg);
            if (transition) {
                transitions.set(2, transition);
            }
        }

        return new Geometry(transitions, legs);
    }

    /**
     * The full leg path geometry, used for the ND and predictions on the F-PLN page.
     */
    // TODO Extract leg and transition building
    getMultipleLegGeometry(temp? : boolean): Geometry | null {
        if (temp) {
            if (this.flightPlanManager.getFlightPlan(1) === undefined) {
                return undefined;
            }
        }
        const activeIdx = temp
            ? this.flightPlanManager.getFlightPlan(1).activeWaypointIndex
            : this.flightPlanManager.getCurrentFlightPlan().activeWaypointIndex;
        const legs = new Map<number, Leg>();
        const transitions = new Map<number, Transition>();

        // We go in reverse order here, since transitions often need info about the next leg
        const wpCount = temp
            ? this.flightPlanManager.getFlightPlan(1).length
            : this.flightPlanManager.getCurrentFlightPlan().length;
        for (let i = wpCount - 1; (i >= activeIdx - 1); i--) {
            const nextLeg = legs.get(i + 1);

            const from = temp
                ? this.flightPlanManager.getWaypoint(i - 1, 1)
                : this.flightPlanManager.getWaypoint(i - 1);
            const to = temp
                ? this.flightPlanManager.getWaypoint(i, 1)
                : this.flightPlanManager.getWaypoint(i);
            const segment = temp
                ? this.flightPlanManager.getSegmentFromWaypoint(to, 1).type
                : this.flightPlanManager.getSegmentFromWaypoint(to).type;

            // Reached the end or start of the flight plan
            if (!from || !to) {
                continue;
            }

            // TODO check this...
            // If FROM ends in a discontinuity there is no leg "FROM -> TO"
            if (from.endsInDiscontinuity) {
                continue;
            }

            let currentLeg;
            switch (to.additionalData.legType) {
            case LegType.CA:
                currentLeg = GuidanceManager.caLeg(from, to.additionalData.course, to.additionalData.altitude, i === activeIdx, segment);
                break;
            case LegType.DF:
                currentLeg = GuidanceManager.dfLeg(from, to, transitions.get(i - 1), segment);
            case LegType.RF:
                currentLeg = GuidanceManager.rfLeg(from, to, to.additionalData.center, segment);
                break;
            case LegType.TF:
                currentLeg = GuidanceManager.tfBetween(from, to, segment);
                break;

            // not yet implemented (please move into order above when done)
            case LegType.AF:
            case LegType.CD:
            case LegType.CF:
            case LegType.CI:
            case LegType.CR:
            case LegType.FA:
            case LegType.FM:
            case LegType.HA:
            case LegType.HF:
            case LegType.HM:
            case LegType.IF:
            case LegType.PI:
            case LegType.VA:
            case LegType.VI:
            case LegType.VD:
            case LegType.VM:
            case LegType.VR:
                currentLeg = GuidanceManager.tfBetween(from, to, segment);
                break;
            default:
                throw new Error(`Unknown leg type ${to.additionalData.legType}`);
            }

            legs.set(i, currentLeg);

            if (nextLeg) {
                const transition = this.getTransition(currentLeg, nextLeg);
                if (transition) {
                    transitions.set(i, transition);
                }
            }
        }

        return new Geometry(transitions, legs);
    }

    getTransition(from: Leg, to: Leg): Transition {
        switch (from.constructor) {
        case CALeg:
            return this.getTransitionFromCA(from, to);
        case DFLeg:
            return this.getTransitionFromDF(from, to);
        case RFLeg:
            return this.getTransitionFromRF(from, to);
        case TFLeg:
            return this.getTransitionFromTF(from, to);
        case VMLeg:
            return this.getTransitionFromVM(from, to);
        default:
            throw new Error(`Unknown leg sequence ${from} -> ${to}`);
        }
    }

    getTransitionFromCA(from: Leg, to: Leg): Transition {
        switch (to.constructor) {
        case DFLeg:
            if (Math.abs(Avionics.Utils.diffAngle(from.bearing, to.bearing)) < 3) {
                return null;
            }
            // TODO can't just pass true here
            return new Type4Transition(from as Type4PreviousLeg, to as Type4NextLeg, true);
        case CALeg:
        /*case CDLeg:
        case CILeg:
        case CRLeg:
        case VALeg:
        case VDLeg:
        case VILeg:*/
        case VMLeg:
        /*case VRLeg:*/
            return new Type3Transition(from as Type3PreviousLeg, to as Type3NextLeg);
        /*case CFLeg:
        case FALeg:
        case FMLeg:
            return new Type2Transition(from, to, turnDirection);*/
        default: // TODO not legal...
            return new Type1Transition(from as Type1PreviousLeg, to as Type1NextLeg);
        }
    }

    getTransitionFromDF(from: Leg, to: Leg): Transition {
        switch (to.constructor) {
        case RFLeg:
            return null;
        /*case AFLeg:
            return new Type6Transition(from, to);
        case HALeg:
        case HFLeg:
        case HMLeg:
            return new Type5Transition(from, to);*/
        case DFLeg:
            if (Math.abs(Avionics.Utils.diffAngle(from.bearing, to.bearing)) < 3) {
                return null;
            }
            // TODO can't just pass true here
            return new Type4Transition(from as Type4PreviousLeg, to as Type4NextLeg, true);
        case CALeg:
        /*case CDLeg:
        case CILeg:
        case CRLeg:
        case VALeg:
        case VDLeg:
        case VILeg:*/
        case VMLeg:
        /*case VRLeg:*/
            return new Type3Transition(from as Type3PreviousLeg, to as Type3NextLeg);
        /*case CFLeg:
        case FALeg:
        case FMLeg:
        case PILeg:*/
        case TFLeg:
            return new Type1Transition(from as Type1PreviousLeg, to as Type1NextLeg);
        }
    }

    getTransitionFromRF(from: Leg, to: Leg): Transition {
        switch (to.constructor) {
        /*case AFLeg:
        case CFLeg:*/
        case RFLeg:
        case TFLeg:
            // no transition (i.e. not needed)
            return null;
        /*case HALeg:
        case HFLeg:
        case HMLeg:
            return new Type5Transition(from, to);*/
        case DFLeg:
            if (Math.abs(Avionics.Utils.diffAngle(from.bearing, to.bearing)) < 3) {
                return null;
            }
            // TODO can't just pass true here
            return new Type4Transition(from as Type4PreviousLeg, to as Type4NextLeg, true);
        case CALeg:
        /*case CDLeg:
        case CILeg:
        case CRLeg:*/
            return new Type3Transition(from as Type3PreviousLeg, to as Type3NextLeg);
        /*case FALeg:
        case FMLeg:
            return new Type2Transition(from, to, turnDirection);*/
        default:
            throw new Error(`Unknown leg sequence ${from} -> ${to}`);
        }
    }

    getTransitionFromTF(from: Leg, to: Leg): Transition {
        switch (to.constructor) {
        case RFLeg:
            // no transition (i.e. not needed)
            return null;
        /*case AFLeg:
            return new Type6Transition(from, to);
        case HALeg:
        case HFLeg:
        case HMLeg:
            return new Type5Transition(from, to);*/
        case DFLeg:
            if (Math.abs(Avionics.Utils.diffAngle(from.bearing, to.bearing)) < 3) {
                return null;
            }
            // TODO can't just pass true here
            return new Type4Transition(from as Type4PreviousLeg, to as Type4NextLeg, true);
        case CALeg:
        /*case CDLeg:
        case CILeg:
        case CRLeg:
        case VALeg:
        case VDLeg:
        case VILeg:*/
        case VMLeg:
        /*case VRLeg:*/
            return new Type3Transition(from as Type3PreviousLeg, to as Type3NextLeg);
        /*case CFLeg:
        case FALeg:
        case FMLeg:
        case PILeg:*/
        case TFLeg:
            return new Type1Transition(from as Type1PreviousLeg, to as Type1NextLeg);
        default:
            throw new Error(`Unknown leg sequence ${from} -> ${to}`);
        }
    }

    getTransitionFromVM(from: Leg, to: Leg): Transition {
        switch (from.constructor) {
        /*case CFLeg:
        case FALeg:
        case FMLeg:
            return null;*/
        case DFLeg:
            if (Math.abs(Avionics.Utils.diffAngle(from.bearing, to.bearing)) < 3) {
                return null;
            }
            // TODO can't just pass true here
            return new Type4Transition(from as Type4PreviousLeg, to as Type4NextLeg, true);
        case CALeg:
        /*case CDLeg:
        case CILeg:
        case CRLeg:
        case VALeg:
        case VDLeg:
        case VILeg:*/
        case VMLeg:
        /*case VRLeg:*/
            return new Type3Transition(from as Type3PreviousLeg, to as Type3NextLeg);
        default:
            throw new Error(`Unknown leg sequence ${from} -> ${to}`);
        }
    }
}
