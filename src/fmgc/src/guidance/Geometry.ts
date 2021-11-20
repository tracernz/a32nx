import { VMLeg } from '@fmgc/guidance/lnav/legs/VM';
import { Transition } from '@fmgc/guidance/lnav/Transition';
import { Type1Transition } from '@fmgc/guidance/lnav/transitions/Type1';
import { TFLeg } from '@fmgc/guidance/lnav/legs/TF';
import { GeoMath } from '@fmgc/flightplanning/GeoMath';
import { MathUtils } from '@shared/MathUtils';
import { Coordinates } from '@fmgc/flightplanning/data/geo';
import { SegmentType } from '@fmgc/flightplanning/FlightPlanSegment';
import { Leg } from '@fmgc/guidance/lnav/legs/Leg';
import { Guidable } from '@fmgc/guidance/Guidable';
import { XFLeg } from '@fmgc/guidance/lnav/legs/XF';
import { GuidanceParameters } from './ControlLaws';

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

    private listener = RegisterViewListener('JS_LISTENER_SIMVARS');

    constructor(transitions: Map<number, Transition>, legs: Map<number, Leg>) {
        this.transitions = transitions;
        this.legs = legs;
    }

    public isComputed = false;

    /**
     * Recomputes the guidable using new parameters
     *
     * @param tas             predicted true airspeed speed of the current leg (for a leg) or the next leg (for a transition) in knots
     * @param gs              predicted ground speed of the current leg
     * @param ppos            present position coordinates
     * @param activeLegIdx    current active leg index
     * @param activeTransIdx  current active transition index
     */
    recomputeWithParameters(tas: Knots, gs: MetresPerSecond, ppos: Coordinates, activeLegIdx: number, activeTransIdx: number) {
        if (DEBUG) {
            console.log(`[FMS/Geometry] Recomputing geometry with current_tas: ${tas}kts`);
            console.time('geometry_recompute');
        }

        for (const [index, leg] of this.legs.entries()) {
            const prevLeg = this.legs.get(index - 1);

            const predictWithCurrentSpeed = index === activeLegIdx;

            const currentSpeedPredictedTas = Math.max(tas, 150);
            const predictedLegTas = predictWithCurrentSpeed ? currentSpeedPredictedTas : (Geometry.getLegPredictedTas(leg) ?? currentSpeedPredictedTas);
            const predictedLegGs = 250; // FIXME temporary

            if (DEBUG) {
                console.log(`[FMS/Geometry] Predicted leg (${leg.repr}) with tas: ${predictedLegTas}kts`);
            }

            if (!(prevLeg instanceof XFLeg)) {
                this.recomputeFloatingPath(index - 1, tas, predictedLegGs, ppos, activeLegIdx, activeTransIdx);
            } else {
                const legInbound = this.transitions.get(index - 1) ?? this.legs.get(index - 1);
                const legOutbound = this.transitions.get(index) ?? this.legs.get(index + 1);
                const nextLeg = this.legs.get(index + 1);

                // FIXME the order is not necessarily right here
                // Need to figure out the order we want to recompute those (dependencies)
                leg.recomputeWithParameters(
                    activeLegIdx === index || activeLegIdx === leg.indexInFullPath,
                    predictedLegTas,
                    predictedLegGs,
                    ppos,
                    legInbound,
                    legOutbound,
                );

                // FIXME, this causes legs to be recomputed with themselves as nextLeg => borked predicted path
                // Will this compute the inbound transition of the active leg ? (if prev leg remains)
                /*legOutbound?.recomputeWithParameters(
                    activeTransIdx === index || activeTransIdx === leg.indexInFullPath,
                    predictedLegTas,
                    predictedLegGs,
                    ppos,
                    leg,
                    nextLeg,
                );*/
            }
        }

        if (DEBUG) {
            console.timeEnd('geometry_recompute');
        }

        this.isComputed = true;
    }

    recomputeFloatingPath(fromIndex: number, tas: Knots, gs: MetresPerSecond, ppos: Coordinates, activeLegIdx: number, activeTransIdx: number): void {
        let firstXFLegIndex;
        for (let i = fromIndex; i > 0; i--) {
            const leg = this.legs.get(i);

            if (leg instanceof XFLeg) {
                firstXFLegIndex = i;
            }
        }

        // Compute all non-XF legs and their transitions after this
        for (let i = firstXFLegIndex; i < this.legs.size; i++) {
            const leg = this.legs.get(i);

            const inboundGuidable = this.transitions.get(i - 1) ?? this.legs.get(i - 1);
            const inboundGuidableInboundGuidable = inboundGuidable instanceof Transition ? this.legs.get(i - 1) : (this.transitions.get(i - 2) ?? this.legs.get(i - 2));
            const outboundGuidable = this.transitions.get(i) ?? this.legs.get(i + 1);

            inboundGuidable?.recomputeWithParameters(
                inboundGuidable instanceof Transition ? activeTransIdx === i : activeLegIdx === i,
                tas,
                gs,
                ppos,
                inboundGuidableInboundGuidable,
                leg,
            );

            leg.recomputeWithParameters(activeLegIdx === i, tas, gs, ppos, inboundGuidable, outboundGuidable);
        }
    }

    static getLegPredictedTas(leg: Leg) {
        if (leg instanceof TFLeg) {
            return leg.to?.additionalData?.predictedSpeed;
        }

        return undefined;
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

        let currGuidable: Guidable | null = null;
        let radGudiable: Guidable | null = null;
        let radValue: NauticalMiles | null = null;

        let paramsToReturn: GuidanceParameters | null = null;

        // first, check if we're abeam with one of the transitions (start or end)
        const fromTransition = this.transitions.get(0);
        if (fromTransition && !fromTransition.isNull && fromTransition.isAbeam(ppos)) {
            if (fromTransition instanceof Type1Transition && !fromTransition.isFrozen) {
                fromTransition.isFrozen = true;
            }

            if (DEBUG) {
                radGudiable = fromTransition;
            }

            const rad = this.getGuidableRollAnticipationDistance(gs, fromTransition, activeLeg);
            const dtg = fromTransition.getDistanceToGo(ppos);
            SimVar.SetSimVarValue('L:A32NX_FG_RAD', 'number', rad ?? 0);
            SimVar.SetSimVarValue('L:A32NX_FG_DTG', 'number', dtg ?? 0);
            if (dtg <= rad) {
                if (DEBUG) {
                    radGudiable = activeLeg;
                    radValue = rad;
                }

                const params = fromTransition.getGuidanceParameters(ppos, trueTrack);
                const toParams = activeLeg.getGuidanceParameters(ppos, trueTrack);
                params.phiCommand = toParams?.phiCommand ?? 0;

                paramsToReturn = params;
            }

            if (DEBUG) {
                currGuidable = fromTransition;
            }

            paramsToReturn = fromTransition.getGuidanceParameters(ppos, trueTrack);
        }

        const toTransition = this.transitions.get(1);
        if (toTransition && !toTransition.isNull) {
            if (toTransition.isAbeam(ppos)) {
                if (toTransition instanceof Type1Transition && !toTransition.isFrozen) {
                    toTransition.isFrozen = true;
                }

                const rad = this.getGuidableRollAnticipationDistance(gs, toTransition, nextLeg);
                const dtg = toTransition.getDistanceToGo(ppos);
                SimVar.SetSimVarValue('L:A32NX_FG_RAD', 'number', rad ?? 0);
                SimVar.SetSimVarValue('L:A32NX_FG_DTG', 'number', dtg ?? 0);
                if (dtg <= rad) {
                    if (DEBUG) {
                        radGudiable = nextLeg;
                        radValue = rad;
                    }

                    const params = toTransition.getGuidanceParameters(ppos, trueTrack);
                    const toParams = nextLeg.getGuidanceParameters(ppos, trueTrack);
                    params.phiCommand = toParams?.phiCommand ?? 0;

                    paramsToReturn = params;
                }

                if (DEBUG) {
                    currGuidable = toTransition;
                }

                paramsToReturn = toTransition.getGuidanceParameters(ppos, trueTrack);
            }

            if (activeLeg) {
                const [itp] = toTransition.getTurningPoints();
                // TODO this should be tidied up somewhere else
                const unTravelled = Avionics.Utils.computeGreatCircleDistance(itp, activeLeg.getPathEndPoint());
                const rad = this.getGuidableRollAnticipationDistance(gs, activeLeg, toTransition);
                const dtg = activeLeg.getDistanceToGo(ppos) - unTravelled;
                SimVar.SetSimVarValue('L:A32NX_FG_RAD', 'number', rad ?? 0);
                SimVar.SetSimVarValue('L:A32NX_FG_DTG', 'number', dtg ?? 0);
                if (dtg <= rad) {
                    if (DEBUG) {
                        radGudiable = toTransition;
                        radValue = rad;
                    }

                    const params = activeLeg.getGuidanceParameters(ppos, trueTrack);
                    const toParams = toTransition.getGuidanceParameters(ppos, trueTrack);
                    params.phiCommand = toParams?.phiCommand ?? 0;

                    paramsToReturn = params;
                }
            }
        }

        if (activeLeg) {
            const dtg = activeLeg.getDistanceToGo(ppos);
            SimVar.SetSimVarValue('L:A32NX_FG_DTG', 'number', dtg ?? 0);
            if (nextLeg) {
                const rad = this.getGuidableRollAnticipationDistance(gs, activeLeg, nextLeg);
                SimVar.SetSimVarValue('L:A32NX_FG_RAD', 'number', rad ?? 0);
                if (dtg <= rad) {
                    if (DEBUG) {
                        radGudiable = nextLeg;
                        radValue = rad;
                    }

                    // console.log(`RAD for next leg ${rad}`);
                    const params = activeLeg.getGuidanceParameters(ppos, trueTrack);
                    const toParams = nextLeg.getGuidanceParameters(ppos, trueTrack);
                    params.phiCommand = toParams?.phiCommand ?? 0;

                    paramsToReturn = params;
                }
            }

            if (DEBUG) {
                currGuidable = activeLeg;
            }

            // otherwise perform straight point-to-point guidance for the first leg
            paramsToReturn = activeLeg.getGuidanceParameters(ppos, trueTrack);
        }

        if (true) {
            this.listener.triggerToAllSubscribers('A32NX_FM_DEBUG_LNAV_STATUS',
                'A32NX FMS LNAV STATUS\n'
                + `XTE            ${SimVar.GetSimVarValue('L:A32NX_FG_CROSS_TRACK_ERROR', 'number').toFixed(3)}\n`
                + `TAE            ${SimVar.GetSimVarValue('L:A32NX_FG_TRACK_ANGLE_ERROR', 'number').toFixed(3)}\n`
                + `PHI COMMAND    ${SimVar.GetSimVarValue('L:A32NX_FG_PHI_COMMAND', 'number').toFixed(5)}\n`
                + '---\n'
                + `CURR GUIDABLE  ${currGuidable?.repr ?? '---'}\n`
                + '---\n'
                + `RAD GUIDABLE   ${radGudiable?.repr ?? '---'}\n`
                + `RAD DISTANCE   ${radValue?.toFixed(3) ?? '---'}`);
        }

        return paramsToReturn;
    }

    getGuidableRollAnticipationDistance(gs, from: Leg | Transition, to: Leg | Transition) {
        if (!from.isCircularArc && !to.isCircularArc) {
            return 0;
        }

        // convert ground speed to m/s
        const groundSpeedMeterPerSecond = gs * (463 / 900);

        // get nominal phi from previous and next leg
        const phiNominalFrom = from.getNominalRollAngle(groundSpeedMeterPerSecond);
        const phiNominalTo = to.getNominalRollAngle(groundSpeedMeterPerSecond);

        // TODO consider case where RAD > transition distance

        return Geometry.getRollAnticipationDistance(gs, phiNominalFrom, phiNominalTo);
    }

    static getRollAnticipationDistance(gs: Knots, bankA: Degrees, bankB: Degrees): NauticalMiles {
        // calculate delta phi
        const deltaPhi = Math.abs(bankA - bankB);

        const gsMs = gs * 463 / 900;

        // calculate RAD
        const maxRollRate = 5; // deg / s, TODO picked off the wind
        const k2 = 0.0076;
        const rad = gsMs / 3600 * (Math.sqrt(1 + 2 * k2 * 9.81 * deltaPhi / maxRollRate) - 1) / (k2 * 9.81);

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
        outbound?: Transition,
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
        outbound?: Transition,
    ): [number, number, number] {
        let inboundLength = 0;
        let legPartLength = 0;
        let outboundLength = 0;

        if (outbound) {
            if (outbound instanceof Type1Transition) {
                // Type I transitions are split between the prev and next legs
                outboundLength = outbound.distance / 2;
            }
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
