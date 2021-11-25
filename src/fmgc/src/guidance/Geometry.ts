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
import { LnavConfig } from '@fmgc/guidance/LnavConfig';
import { Type3Transition } from '@fmgc/guidance/lnav/transitions/Type3';
import { Type4GuidanceState, Type4Transition } from '@fmgc/guidance/lnav/transitions/Type4';
import { PathVector } from '@fmgc/guidance/lnav/PathVector';
import { CALeg } from '@fmgc/guidance/lnav/legs/CA';
import { ControlLaw, GuidanceParameters, LateralPathGuidance } from './ControlLaws';

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

    public getAllPathVectors(): PathVector[] {
        const ret = [];

        for (const [index, leg] of this.legs.entries()) {
            const legInboundTransition = this.transitions.get(index - 1);

            if (legInboundTransition) {
                ret.push(...legInboundTransition.predictedPath);
            }

            ret.push(...leg.predictedPath);
        }

        return ret;
    }

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

            const legInbound = this.transitions.get(index - 1) ?? this.legs.get(index - 1);
            const legOutbound = this.transitions.get(index) ?? this.legs.get(index + 1);
            const nextLeg = this.legs.get(index + 1);

            // If the inbound guidable is not fix referenced, we can't recompute the current leg without first computing that one, which
            // potentially has other dependencies of the sort.
            //
            // We solve this by instead computing forwards to the next (from our backwards point of view) XF leg up to this one. This allows us
            // to have the inbound guidable computed properly so we can compute our leg.
            if (prevLeg && (!(prevLeg instanceof XFLeg) || (legInbound instanceof Type3Transition || legInbound instanceof Type4Transition))) {
                if (LnavConfig.DEBUG_GUIDABLE_RECOMPUTATION) {
                    console.log('[FMS/Geometry] Starting floating path.');
                }

                this.recomputeFloatingPath(index - 1, tas, predictedLegGs, ppos, activeLegIdx, activeTransIdx);

                if (LnavConfig.DEBUG_GUIDABLE_RECOMPUTATION) {
                    console.log('[FMS/Geometry] Done with floating path.');
                }
            } else {
                if (LnavConfig.DEBUG_GUIDABLE_RECOMPUTATION) {
                    console.log(`[FMS/Geometry Recomputing leg '${leg.repr}'`);
                }

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

                if (LnavConfig.DEBUG_GUIDABLE_RECOMPUTATION) {
                    console.log(`[FMS/Geometry Recomputing inbound guidable '${legInbound?.repr ?? '<unknown>'}' for leg '${leg.repr}'`);
                }

                // Will this compute the inbound transition of the active leg ? (if prev leg remains)
                legOutbound?.recomputeWithParameters(
                    activeTransIdx === index || activeTransIdx === leg.indexInFullPath,
                    predictedLegTas,
                    predictedLegGs,
                    ppos,
                    leg,
                    nextLeg,
                );
            }
        }

        if (DEBUG) {
            console.timeEnd('geometry_recompute');
        }

        this.isComputed = true;
    }

    recomputeFloatingPath(fromIndex: number, tas: Knots, gs: MetresPerSecond, ppos: Coordinates, activeLegIdx: number, activeTransIdx: number) {
        let firstXFLegIndex;
        for (let i = fromIndex; i >= 0; i--) {
            const leg = this.legs.get(i);
            const legInbound = this.transitions.get(i - 1) ?? this.legs.get(i - 1);

            // Find first leg which is an XFLeg and has a fixed transition
            if (leg instanceof XFLeg && !(legInbound instanceof Type3Transition) && !(legInbound instanceof Type4Transition)) {
                firstXFLegIndex = i;
                break;
            }
        }

        // In an active leg path geometry, we might not have a fix-referenced path at index 0.
        // In this case, assume the first one knows its starting position from PPOS or has it frozen.
        if (firstXFLegIndex === undefined) {
            for (let i = 0; i <= fromIndex; i++) {
                firstXFLegIndex = i;
                if (this.legs.get(i)) {
                    break;
                }
            }

            if (LnavConfig.DEBUG_GUIDABLE_RECOMPUTATION && activeLegIdx !== 0) {
                console.warn('[FMS/Geometry] Geometry has no fix-referenced path for forwards computation and leg at index 0 is not active. Something may be broken.');
            }
        }

        // Compute all non-XF legs and their transitions after this, up to the leg we started with
        for (let i = firstXFLegIndex; i <= fromIndex + 1; i++) {
            const leg = this.legs.get(i);

            const inboundGuidable = this.transitions.get(i - 1) ?? this.legs.get(i - 1);
            const inboundGuidableInboundGuidable = inboundGuidable instanceof Transition ? this.legs.get(i - 1) : (this.transitions.get(i - 2) ?? this.legs.get(i - 2));
            const outboundGuidable = this.transitions.get(i) ?? this.legs.get(i + 1);

            if (LnavConfig.DEBUG_GUIDABLE_RECOMPUTATION) {
                console.log(`[FMS/Geometry] Recomputing inbound guidable '${inboundGuidable?.repr ?? '<unknown>'}' for leg '${leg.repr}'`);
            }

            inboundGuidable?.recomputeWithParameters(
                inboundGuidable instanceof Transition ? activeTransIdx === leg.indexInFullPath - 1 : activeLegIdx === leg.indexInFullPath,
                tas,
                gs,
                ppos,
                inboundGuidableInboundGuidable,
                leg,
            );

            if (LnavConfig.DEBUG_GUIDABLE_RECOMPUTATION) {
                console.log(`[FMS/Geometry] Recomputing leg '${leg.repr}'`);
            }

            leg.recomputeWithParameters(activeLegIdx === leg.indexInFullPath, tas, gs, ppos, inboundGuidable, outboundGuidable);
        }
    }

    static getLegPredictedTas(leg: Leg) {
        if (leg instanceof TFLeg) {
            return leg.to?.additionalData?.predictedSpeed;
        }

        return undefined;
    }

    /**
     * @param activeLegIdx
     * @param ppos
     * @param trueTrack
     * @param gs
     */
    getGuidanceParameters(activeLegIdx: number, ppos: Coordinates, trueTrack: DegreesTrue, gs: Knots) {
        const activeLeg = this.legs.get(activeLegIdx);
        const nextLeg = this.legs.get(activeLegIdx + 1);

        let activeGuidable: Guidable | null = null;
        let nextGuidable: Guidable | null = null;

        // first, check if we're abeam with one of the transitions (start or end)
        const fromTransition = this.transitions.get(activeLegIdx - 1);
        const toTransition = this.transitions.get(activeLegIdx);
        if (fromTransition && !fromTransition.isNull && fromTransition.isAbeam(ppos)) {
            if (fromTransition instanceof Type1Transition && !fromTransition.isFrozen) {
                fromTransition.freeze();
            }

            // Since CA leg Type3 inbound starts at PPOS, we always consider the CA leg as the active guidable
            if (fromTransition instanceof Type3Transition && activeLeg instanceof CALeg) {
                activeGuidable = activeLeg;
                nextGuidable = toTransition;
            } else {
                activeGuidable = fromTransition;
                nextGuidable = activeLeg;
            }
        } else if (toTransition && !toTransition.isNull) {
            if (toTransition.isAbeam(ppos)) {
                if (toTransition instanceof Type1Transition && !toTransition.isFrozen) {
                    toTransition.freeze();
                }

                activeGuidable = toTransition;
                nextGuidable = nextLeg;
            } else if (activeLeg) {
                activeGuidable = activeLeg;
                nextGuidable = toTransition;
            }
        } else if (activeLeg) {
            activeGuidable = activeLeg;
            if (nextLeg) {
                nextGuidable = nextLeg;
            }
        }

        // figure out guidance params and roll anticipation
        let guidanceParams: GuidanceParameters;
        let rad;
        let dtg;
        if (activeGuidable) {
            guidanceParams = activeGuidable.getGuidanceParameters(ppos, trueTrack);
            dtg = activeGuidable.getDistanceToGo(ppos);

            if (activeGuidable && nextGuidable) {
                rad = this.getGuidableRollAnticipationDistance(gs, activeGuidable, nextGuidable);
                if (rad > 0 && dtg <= rad) {
                    const nextGuidanceParams = nextGuidable.getGuidanceParameters(ppos, trueTrack);

                    if (nextGuidanceParams.law === ControlLaw.LATERAL_PATH) {
                        (guidanceParams as LateralPathGuidance).phiCommand = nextGuidanceParams?.phiCommand ?? 0;
                    }
                }
            }
        }

        SimVar.SetSimVarValue('L:A32NX_FG_DTG', 'number', dtg ?? -1);
        SimVar.SetSimVarValue('L:A32NX_FG_RAD', 'number', rad ?? -1);

        if (LnavConfig.DEBUG_GUIDANCE) {
            this.listener.triggerToAllSubscribers('A32NX_FM_DEBUG_LNAV_STATUS',
                // eslint-disable-next-line prefer-template
                'A32NX FMS LNAV STATUS\n'
                + `XTE ${(guidanceParams as LateralPathGuidance).crossTrackError?.toFixed(3) ?? '(NO DATA)'}\n`
                + `TAE ${(guidanceParams as LateralPathGuidance).trackAngleError?.toFixed(3) ?? '(NO DATA)'}\n`
                + `PHI ${(guidanceParams as LateralPathGuidance).phiCommand?.toFixed(5) ?? '(NO DATA)'}\n`
                + '---\n'
                + `CURR GUIDABLE ${activeGuidable?.repr ?? '---'}\n`
                + `CURR GUIDABLE DTG ${dtg.toFixed(3)}\n`
                + ((activeGuidable instanceof Type4Transition) ? `TYPE4 STATE ${Type4GuidanceState[(activeGuidable as Type4Transition).state]}\n` : '')
                + '---\n'
                + `RAD GUIDABLE ${nextGuidable?.repr ?? '---'}\n`
                + `RAD DISTANCE ${rad?.toFixed(3) ?? '---'}\n`
                + '---\n'
                + `L0 ${this.legs.get(activeLegIdx - 1)?.repr ?? '---'}\n`
                + `T0 ${this.transitions.get(activeLegIdx - 1)?.repr ?? '---'}\n`
                + `L1 ${this.legs.get(activeLegIdx)?.repr ?? '---'}\n`
                + `T1 ${this.transitions.get(activeLegIdx)?.repr ?? '---'}\n`
                + `L2 ${this.legs.get(activeLegIdx + 1)?.repr ?? '---'}\n`);
        }

        return guidanceParams;
    }

    getGuidableRollAnticipationDistance(gs: Knots, from: Guidable, to: Guidable) {
        if (!from.isCircularArc && !to.isCircularArc) {
            return 0;
        }

        // convert ground speed to m/s
        const groundSpeedMeterPerSecond = gs * (463 / 900);

        // get nominal phi from previous and next leg
        const phiNominalFrom = from.isCircularArc ? from.getNominalRollAngle(groundSpeedMeterPerSecond) : 0;
        const phiNominalTo = to.isCircularArc ? to.getNominalRollAngle(groundSpeedMeterPerSecond) : 0;

        // TODO consider case where RAD > transition distance

        return Geometry.getRollAnticipationDistance(gs, phiNominalFrom, phiNominalTo);
    }

    static getRollAnticipationDistance(gs: Knots, bankA: Degrees, bankB: Degrees): NauticalMiles {
        // calculate delta phi
        const deltaPhi = Math.abs(bankA - bankB);

        // calculate RAD
        const maxRollRate = 5; // deg / s, TODO picked off the wind
        const k2 = 0.0038;
        const rad = gs / 3600 * (Math.sqrt(1 + 2 * k2 * 9.81 * deltaPhi / maxRollRate) - 1) / (k2 * 9.81);

        return rad;
    }

    getDistanceToGo(ppos): number | null {
        const activeLeg = this.legs.get(1);
        if (activeLeg) {
            return activeLeg.getDistanceToGo(ppos);
        }

        return null;
    }

    shouldSequenceLeg(activeLegIdx: number, ppos: LatLongAlt): boolean {
        const activeLeg = this.legs.get(activeLegIdx);
        const outboundTransition = this.transitions.get(activeLegIdx);

        if (activeLeg instanceof TFLeg && outboundTransition instanceof Type1Transition) {
            // Sequence at ITP
            const [transItp] = outboundTransition.getTurningPoints();

            const legBearing = activeLeg.outboundCourse;
            const bearingToTransItp = Avionics.Utils.computeGreatCircleHeading(ppos, transItp);
            const innerAngleWithTransItp = MathUtils.smallCrossingAngle(legBearing, bearingToTransItp);

            const directedDtgToTransItp = GeoMath.directedDistanceToGo(ppos, transItp, innerAngleWithTransItp);

            return directedDtgToTransItp < 0;
        } if (outboundTransition instanceof Type3Transition || outboundTransition instanceof Type4Transition) {
            const dtg = activeLeg.getDistanceToGo(ppos);

            if (dtg < 0) {
                return true;
            }
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
