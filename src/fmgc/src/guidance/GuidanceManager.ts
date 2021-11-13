import { RFLeg } from '@fmgc/guidance/lnav/legs/RF';
import { TFLeg } from '@fmgc/guidance/lnav/legs/TF';
import { VMLeg } from '@fmgc/guidance/lnav/legs/VM';
import { Transition } from '@fmgc/guidance/lnav/Transition';
import { SegmentType } from '@fmgc/wtsdk';
import { Coordinates } from '@fmgc/flightplanning/data/geo';
import { Leg } from '@fmgc/guidance/lnav/legs/Leg';
import { CALeg } from '@fmgc/guidance/lnav/legs/CA';
import { LegType } from '@fmgc/types/fstypes/FSEnums';
import { TransitionPicker } from '@fmgc/guidance/lnav/TransitionPicker';
import { IFLeg } from '@fmgc/guidance/lnav/legs/IF';
import { Geometry } from './Geometry';
import { FlightPlanManager } from '../flightplanning/FlightPlanManager';

/**
 * This class will guide the aircraft by predicting a flight path and
 * calculating the autopilot inputs to follow the predicted flight path.
 */
export class GuidanceManager {
    private lastTransition?: number;

    public flightPlanManager: FlightPlanManager;

    constructor(flightPlanManager: FlightPlanManager) {
        this.flightPlanManager = flightPlanManager;
    }

    private static ifLeg(fix: WayPoint, segment: SegmentType, indexInFullPath: number) {
        return new IFLeg(fix, segment, indexInFullPath);
    }

    private static tfBetween(from: WayPoint, to: WayPoint, segment: SegmentType, indexInFullPath: number) {
        return new TFLeg(from, to, segment, indexInFullPath);
    }

    private static vmWithHeading(heading: Degrees, initialPosition: Coordinates, initialCourse: Degrees, segment: SegmentType, indexInFullPath: number) {
        return new VMLeg(heading, initialPosition, initialCourse, segment, indexInFullPath);
    }

    private static rfLeg(from: WayPoint, to: WayPoint, center: LatLongData, segment: SegmentType, indexInFullPath: number) {
        return new RFLeg(from, to, center, segment, indexInFullPath);
    }

    private static caLeg(course: DegreesTrue, altitude: Feet, segment: SegmentType, indexInFullPath: number) {
        return new CALeg(course, altitude, segment, indexInFullPath);
    }

    /**
     * Returns a {@link Leg} from two {@link WayPoint} objects. Only for fpm v1.
     *
     * @param from      the FROM waypoint
     * @param to        the TO waypoint
     * @param toIndex   index of the TO waypoint
     * @param segment   flight plan segment
     *
     * @private
     */
    // TODO remove for fpm v2
    private static legFromWaypoints(from: WayPoint, to: WayPoint, toIndex: number, segment: SegmentType): Leg {
        if (to?.additionalData?.legType === LegType.IF) {
            return GuidanceManager.ifLeg(to, segment, toIndex);
        }

        if (!from || !to) {
            return null;
        }

        if (from.endsInDiscontinuity) {
            return null;
        }

        if (to.additionalData) {
            if (to.additionalData.legType === LegType.RF) {
                return GuidanceManager.rfLeg(from, to, to.additionalData.center, segment, toIndex);
            }
            if (to.additionalData.legType === LegType.CA) {
                const course = to.additionalData.vectorsCourse;
                const altitude = to.additionalData.vectorsAltitude;

                return GuidanceManager.caLeg(course, altitude, segment, toIndex);
            }
        }

        if (to.isVectors) {
            return GuidanceManager.vmWithHeading(to.additionalData.vectorsHeading, to.infos.coordinates, to.additionalData.vectorsCourse, segment, toIndex);
        }

        return GuidanceManager.tfBetween(from, to, segment, toIndex);
    }

    getPreviousLeg(): Leg | null {
        const activeIndex = this.flightPlanManager.getActiveWaypointIndex(false, false, 0);

        const from = this.flightPlanManager.getWaypoint(activeIndex - 2, 0);
        const to = this.flightPlanManager.getWaypoint(activeIndex - 1, 0);
        const segment = this.flightPlanManager.getSegmentFromWaypoint(to, 0).type;

        return GuidanceManager.legFromWaypoints(from, to, segment, activeIndex - 1);
    }

    getActiveLeg(): Leg | null {
        const activeIndex = this.flightPlanManager.getActiveWaypointIndex(false, false, 0);

        const from = this.flightPlanManager.getWaypoint(activeIndex - 1, 0);
        const to = this.flightPlanManager.getWaypoint(activeIndex, 0);
        const segment = this.flightPlanManager.getSegmentFromWaypoint(to, 0).type;

        return GuidanceManager.legFromWaypoints(from, to, segment, activeIndex);
    }

    getNextLeg(): Leg | null {
        const activeIndex = this.flightPlanManager.getActiveWaypointIndex(false, false, 0);

        const from = this.flightPlanManager.getWaypoint(activeIndex, 0);
        const to = this.flightPlanManager.getWaypoint(activeIndex + 1, 0);
        const segment = this.flightPlanManager.getSegmentFromWaypoint(to, 0).type;

        return GuidanceManager.legFromWaypoints(from, to, segment, activeIndex + 1);
    }

    getLeg(index: number): Leg | null {
        const from = this.flightPlanManager.getWaypoint(index - 1, 0);
        const to = this.flightPlanManager.getWaypoint(index, 0);
        const segment = this.flightPlanManager.getSegmentFromWaypoint(to, 0).type;

        return GuidanceManager.legFromWaypoints(from, to, segment, index);
    }

    /**
     * The active leg path geometry, used for immediate autoflight.
     */
    getActiveLegPathGeometry(): Geometry | null {
        const prevLeg = this.getPreviousLeg();
        const activeLeg = this.getActiveLeg();
        const nextLeg = this.getNextLeg();

        if (!activeLeg) {
            return null;
        }

        const legs = new Map<number, Leg>([[1, activeLeg]]);
        const transitions = new Map<number, Transition>();

        if (prevLeg) {
            const transition = TransitionPicker.forLegs(prevLeg, activeLeg);

            if (transition) {
                transitions.set(0, transition);
            }

            legs.set(0, prevLeg);
        }

        // TODO generalise selection of transitions
        if (nextLeg) {
            const transition = TransitionPicker.forLegs(activeLeg, nextLeg);

            if (transition) {
                transitions.set(1, transition);
            }

            legs.set(2, nextLeg);
        }

        return new Geometry(transitions, legs);
    }

    /**
     * The full leg path geometry, used for the ND and predictions on the F-PLN page.
     */
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
            // Leg
            const currentLeg = this.getLeg(i);

            if (currentLeg) {
                legs.set(i, currentLeg);
            }

            const nextLeg = legs.get(i + 1);

            // Transition
            const transition = TransitionPicker.forLegs(currentLeg, nextLeg);

            if (transition) {
                transitions.set(1, transition);
            }
        }

        return new Geometry(transitions, legs);
    }
}
