import { Coordinates } from '@fmgc/flightplanning/data/geo';
import { GuidanceParameters } from '@fmgc/guidance/ControlLaws';

export abstract class Guidable {
    protected constructor() {
    }

    abstract getTerminator(): Coordinates | undefined;

    isComputed = false;

    /**
     * Recomputes the guidable using new parameters
     *
     * @param isActive          whether the guidable is being flown
     * @param tas               predicted true airspeed speed of the current leg (for a leg) or the next leg (for a transition) in knots
     * @param gs                predicted ground speed of the current leg
     * @param ppos              present position coordinates
     * @param previousGuidable  previous guidable before leg
     * @param nextGuidable      next guidable after leg
     */
    abstract recomputeWithParameters(isActive: boolean, tas: Knots, gs: Knots, ppos: Coordinates, previousGuidable: Guidable, nextGuidable: Guidable): void;

    abstract getGuidanceParameters(ppos: Coordinates, trueTrack: Degrees): GuidanceParameters | undefined;

    /**
     * Calculates directed DTG parameter
     *
     * @param ppos {LatLong} the current position of the aircraft
     */
    abstract getDistanceToGo(ppos: Coordinates): NauticalMiles | undefined;

    abstract isAbeam(ppos: Coordinates): boolean;

    /**
     * Obtains the location of a pseudo-waypoint on the guidable (does NOT include inbound or outbound
     * transitions for legs; see {@link PseudoWaypoints.pointFromEndOfPath} for a function that includes those).
     *
     * @param distanceBeforeTerminator
     */
    abstract getPseudoWaypointLocation(distanceBeforeTerminator: NauticalMiles): Coordinates | undefined;

    abstract get repr(): string;
}
