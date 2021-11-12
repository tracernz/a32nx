import { VMLeg } from '@fmgc/guidance/lnav/legs/VM';
import { Transition } from '@fmgc/guidance/lnav/transitions';
import { Type1Transition } from '@fmgc/guidance/lnav/transitions/Type1';
import { Leg } from '@fmgc/guidance/lnav/legs';
import { TFLeg } from '@fmgc/guidance/lnav/legs/TF';
import { GeoMath } from '@fmgc/flightplanning/GeoMath';
import { MathUtils } from '@shared/MathUtils';
import { Coordinates } from '@fmgc/flightplanning/data/geo';
import { SegmentType } from '@fmgc/flightplanning/FlightPlanSegment';
import { RFLeg } from '@fmgc/guidance/lnav/legs/RF';
import { GuidanceParameters } from './ControlLaws';

export const EARTH_RADIUS_NM = 3440.1;

export interface Guidable {
    /**
     * Recomputes the guidable using new parameters
     *
     * @param tas Predicted true airspeed speed of the current leg (for a leg) or the next leg (for a transition) in knots
     */
    recomputeWithParameters(tas: Knots): void;

    getGuidanceParameters(ppos: Coordinates, trueTrack: Degrees): GuidanceParameters | null;

    getDistanceToGo(ppos: Coordinates): NauticalMiles;

    isAbeam(ppos: Coordinates): boolean;

    getPseudoWaypointLocation(distanceBeforeTerminator: NauticalMiles): LatLongData | undefined;
}

export class Geometry {
    /**
     * The list of transitions between legs.
     * - entry n: transition after leg n
     */
    public transitions: Map<number, Transition>;

    /**
     * The list of legs in this geometry, possibly connected through transitions:
     * - entry n: nth leg, before transition n
     */
    public legs: Map<number, Leg>;

    constructor(transitions: Map<number, Transition>, legs: Map<number, Leg>) {
        this.transitions = transitions;
        this.legs = legs;
    }

    /**
     * Recomputes the guidable using new parameters
     *
     * @param tas           Predicted true airspeed speed of the current leg (for a leg) or the next leg (for a transition) in knots
     * @param activeLegIdx  Current active leg index
     */
    recomputeWithParameters(tas: Knots, activeLegIdx: number) {
        if (DEBUG) {
            console.log(`[FMS/Geometry] Recomputing geometry with current_tas: ${tas}kts`);
            console.time('geometry_recompute');
        }

        for (const [index, leg] of this.legs.entries()) {
            const predictWithCurrentSpeed = index === activeLegIdx;

            let predictedLegTas: Knots;
            // TODO remove this hack when VNAV can provide a proper prediction
            if (!predictWithCurrentSpeed && leg instanceof TFLeg && leg.to.additionalData.predictedSpeed) {
                predictedLegTas = leg.to.additionalData.predictedSpeed;
            } else {
                predictedLegTas = Math.max(tas, 150); // knots, i.e. nautical miles per hour
            }

            if (DEBUG) {
                let legString;
                if (leg instanceof TFLeg) {
                    legString = `TF(${leg.from.ident} -> ${leg.to.ident})`;
                } else if (leg instanceof RFLeg) {
                    legString = `RF(${leg.from.ident} -- ${leg.radius}° -> ${leg.to.ident})`;
                } else if (leg instanceof VMLeg) {
                    legString = `VM(${leg.bearing.toFixed(1)}°>`;
                } else {
                    legString = 'unknown()';
                }

                console.log(`[FMS/Geometry] Predicted leg ${legString} with tas: ${predictedLegTas}kts`);
            }

            leg.recomputeWithParameters(predictedLegTas);
            this.transitions.get(index + 1)?.recomputeWithParameters(predictedLegTas);
        }

        if (DEBUG) {
            console.timeEnd('geometry_recompute');
        }
    }

    /**
     *
     * @param ppos
     * @param trueTrack
     * @example
     * const a = SimVar.GetSimVarValue("PLANE LATITUDE", "degree latitude"),
     * const b = SimVar.GetSimVarValue("PLANE LONGITUDE", "degree longitude")
     * const ppos = new LatLongAlt(a, b);
     * const trueTrack = SimVar.GetSimVarValue("GPS GROUND TRUE TRACK", "degree");
     * const gs = SimVar.GetSimVarValue('GPS GROUND SPEED', 'knots');
     * getGuidanceParameters(ppos, trueTrack, gs);
     */
    getGuidanceParameters(ppos, trueTrack, gs) {
        const activeLeg = this.legs.get(1);
        const nextLeg = this.legs.get(2);

        // first, check if we're abeam with one of the transitions (start or end)
        const fromTransition = this.transitions.get(0);
        if (fromTransition && fromTransition.isAbeam(ppos)) {
            if (fromTransition instanceof Type1Transition && !fromTransition.isFrozen) {
                fromTransition.isFrozen = true;
            }

            const rad = this.getRollAnticipationDistance(gs, fromTransition, activeLeg);
            const dtg = fromTransition.getDistanceToGo(ppos);
            SimVar.SetSimVarValue('L:A32NX_FG_RAD', 'number', rad);
            SimVar.SetSimVarValue('L:A32NX_FG_DTG', 'number', dtg);
            if (dtg <= rad) {
                // console.log(`RAD for transition ${rad}`);
                const params = fromTransition.getGuidanceParameters(ppos, trueTrack);
                const toParams = activeLeg.getGuidanceParameters(ppos, trueTrack);
                params.phiCommand = toParams.phiCommand ?? 0;
                return params;
            }
            return fromTransition.getGuidanceParameters(ppos, trueTrack);
        }

        const toTransition = this.transitions.get(1);
        if (toTransition) {
            if (toTransition.isAbeam(ppos)) {
                if (toTransition instanceof Type1Transition && !toTransition.isFrozen) {
                    toTransition.isFrozen = true;
                }

                const rad = this.getRollAnticipationDistance(gs, toTransition, nextLeg);
                const dtg = toTransition.getDistanceToGo(ppos);
                SimVar.SetSimVarValue('L:A32NX_FG_RAD', 'number', rad);
                SimVar.SetSimVarValue('L:A32NX_FG_DTG', 'number', dtg);
                if (dtg <= rad) {
                    // console.log(`RAD for transition ${rad}`);
                    const params = toTransition.getGuidanceParameters(ppos, trueTrack);
                    const toParams = nextLeg.getGuidanceParameters(ppos, trueTrack);
                    params.phiCommand = toParams.phiCommand ?? 0;
                    return params;
                }
                return toTransition.getGuidanceParameters(ppos, trueTrack);
            }

            if (activeLeg) {
                const [itp] = toTransition.getTurningPoints();
                // TODO this should be tidied up somewhere else
                const unTravelled = Avionics.Utils.computeGreatCircleDistance(itp, activeLeg.terminatorLocation);
                const rad = this.getRollAnticipationDistance(gs, activeLeg, toTransition);
                const dtg = activeLeg.getDistanceToGo(ppos) - unTravelled;
                SimVar.SetSimVarValue('L:A32NX_FG_RAD', 'number', rad);
                SimVar.SetSimVarValue('L:A32NX_FG_DTG', 'number', dtg);
                if (dtg <= rad) {
                    // console.log(`RAD for transition ${rad}`);
                    const params = activeLeg.getGuidanceParameters(ppos, trueTrack);
                    const toParams = toTransition.getGuidanceParameters(ppos, trueTrack);
                    params.phiCommand = toParams.phiCommand ?? 0;
                    return params;
                }
            }
        }

        if (activeLeg) {
            const dtg = activeLeg.getDistanceToGo(ppos);
            SimVar.SetSimVarValue('L:A32NX_FG_DTG', 'number', dtg);
            if (nextLeg) {
                const rad = this.getRollAnticipationDistance(gs, activeLeg, nextLeg);
                SimVar.SetSimVarValue('L:A32NX_FG_RAD', 'number', rad);
                if (dtg <= rad) {
                    // console.log(`RAD for next leg ${rad}`);
                    const params = activeLeg.getGuidanceParameters(ppos, trueTrack);
                    const toParams = nextLeg.getGuidanceParameters(ppos, trueTrack);
                    params.phiCommand = toParams.phiCommand ?? 0;
                    return params;
                }
            }

            // otherwise perform straight point-to-point guidance for the first leg
            return activeLeg.getGuidanceParameters(ppos, trueTrack);
        }

        return null;
    }

    getRollAnticipationDistance(gs, from: Leg | Transition, to: Leg | Transition) {
        if (!from.isCircularArc && !to.isCircularArc) {
            return 0;
        }

        // convert ground speed to m/s
        const groundSpeedMeterPerSecond = gs * (463 / 900);

        // get nominal phi from previous and next leg
        const phiNominalFrom = from.getNominalRollAngle(groundSpeedMeterPerSecond);
        const phiNominalTo = to.getNominalRollAngle(groundSpeedMeterPerSecond);

        // calculate delta phi
        const deltaPhi = Math.abs(phiNominalTo - phiNominalFrom);

        // calculate RAD
        const maxRollRate = 5; // deg / s, TODO picked off the wind
        const k2 = 0.0038;
        const rad = gs / 3600 * (Math.sqrt(1 + 2 * k2 * 9.81 * deltaPhi / maxRollRate) - 1) / (k2 * 9.81);

        // TODO consider case where RAD > transition distance

        return rad;
    }

    getDistanceToGo(ppos): number | null {
        const activeLeg = this.legs.get(1);
        if (activeLeg) {
            return activeLeg.getDistanceToGo(ppos);
        }

        return null;
    }

    shouldSequenceLeg(ppos: LatLongAlt): boolean {
        const activeLeg = this.legs.get(1);

        // VM legs do not connect to anything and do not have a transition after them - we never sequence them
        if (activeLeg instanceof VMLeg) {
            return false;
        }

        const transitionAfterActiveLeg = this.transitions.get(1);
        if (activeLeg instanceof TFLeg && transitionAfterActiveLeg instanceof Type1Transition) {
            // Sequence at ITP
            const [transItp] = transitionAfterActiveLeg.getTurningPoints();

            const legBearing = activeLeg.bearing;
            const bearingToTransItp = Avionics.Utils.computeGreatCircleHeading(ppos, transItp);
            const innerAngleWithTransItp = MathUtils.smallCrossingAngle(legBearing, bearingToTransItp);

            const directedDtgToTransItp = GeoMath.directedDistanceToGo(ppos, transItp, innerAngleWithTransItp);

            return directedDtgToTransItp < 0;
        }

        if (activeLeg) {
            return activeLeg.getDistanceToGo(ppos) < 0.001;
        }

        return false;
    }

    legsInSegment(segmentType: SegmentType): Map<number, Leg> {
        const newMap = new Map<number, Leg>();

        for (const entry of this.legs.entries()) {
            if (entry[1].segment === segmentType) {
                newMap.set(...entry);
            }
        }

        return newMap;
    }

    /**
     * Returns DTG for a complete leg path, taking into account transitions (including split Type 1)
     *
     * @param ppos      present position
     * @param leg       the leg guidable
     * @param inbound   the inbound transition guidable, if present
     * @param outbound  the outbound transition guidable, if present
     */
    static completeLegPathDistanceToGo(
        ppos: LatLongData,
        leg: Leg,
        inbound?: Transition,
        outbound?: Type1Transition,
    ) {
        const [, legPartLength, outboundTransLength] = Geometry.completeLegPathLengths(
            leg,
            inbound,
            outbound,
        );

        if (outbound && outbound.isAbeam(ppos)) {
            return outbound.getDistanceToGo(ppos) - outbound.distance / 2; // Remove half of the transition length, since it is split (Type I)
        }

        if (inbound && inbound.isAbeam(ppos)) {
            return inbound.getDistanceToGo(ppos) + legPartLength + outboundTransLength;
        }

        return (leg.getDistanceToGo(ppos) - (outbound && outbound instanceof Type1Transition ? outbound.unflownDistance : 0)) + outboundTransLength;
    }

    /**
     * Returns lengths of the different segments of a leg, taking into account transitions (including split Type 1)
     *
     * @param leg       the leg guidable
     * @param inbound   the inbound transition guidable, if present
     * @param outbound  the outbound transition guidable, if present
     */
    static completeLegPathLengths(
        leg: Leg,
        inbound?: Transition,
        outbound?: Type1Transition,
    ): [number, number, number] {
        let inboundLength = 0;
        let legPartLength = 0;
        let outboundLength = 0;

        if (outbound && outbound instanceof Type1Transition) {
            // Type I transitions are split between the prev and next legs
            outboundLength = outbound.distance / 2;
        }

        if (inbound) {
            if (inbound instanceof Type1Transition) {
                // Type I transitions are split between the prev and next legs
                inboundLength = inbound.distance / 2;
            } else {
                inboundLength = inbound.distance;
            }
        }

        legPartLength = leg.distance - (inbound instanceof Type1Transition ? inbound.unflownDistance : inboundLength) - (outbound instanceof Type1Transition ? outbound.unflownDistance : 0);

        return [inboundLength, legPartLength, outboundLength];
    }
}
