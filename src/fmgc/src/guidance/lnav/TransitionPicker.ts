import { Leg } from '@fmgc/guidance/lnav/legs/Leg';
import { CALeg } from '@fmgc/guidance/lnav/legs/CA';
import { DFLeg } from '@fmgc/guidance/lnav/legs/DF';
import { HALeg, HFLeg, HMLeg } from '@fmgc/guidance/lnav/legs/HX';
import { RFLeg } from '@fmgc/guidance/lnav/legs/RF';
import { TFLeg } from '@fmgc/guidance/lnav/legs/TF';
import { VMLeg } from '@fmgc/guidance/lnav/legs/VM';
import { Transition } from '@fmgc/guidance/lnav/transition';
import { Type1Transition } from '@fmgc/guidance/lnav/transitions';
import { Type3Transition } from '@fmgc/guidance/lnav/transitions/Type3';
import { Type4Transition } from '@fmgc/guidance/lnav/transitions/Type4';
import { Type5Transition } from '@fmgc/guidance/lnav/transitions/Type5';

export class TransitionPicker {
    static forLegs(from: Leg, to: Leg): Transition | null {
        if (from instanceof CALeg) {
            return TransitionPicker.fromCA(from, to);
        }
        if (from instanceof DFLeg) {
            return TransitionPicker.fromDF(from, to);
        }
        if (from instanceof HALeg || from instanceof HFLeg || from instanceof HMLeg) {
            return TransitionPicker.fromHX(from, to);
        }
        if (from instanceof RFLeg) {
            return TransitionPicker.fromRF(from, to);
        }
        if (from instanceof TFLeg) {
            return TransitionPicker.fromTF(from, to);
        }
        if (from instanceof VMLeg) {
            return TransitionPicker.fromVM(from, to);
        }

        if (DEBUG) {
            console.error(`[FMS/Geometry] Could not pick transition between '${from.repr}' and '${to.repr}'.`);
        }

        return null;
    }

    private static fromCA(from: CALeg, to: Leg): Transition | null {
        if (to instanceof CALeg) {
            return new Type3Transition(from, to);
        }
        if (to instanceof DFLeg) {
            return new Type4Transition(from, to);
        }
        if (to instanceof TFLeg) {
            return new Type3Transition(from, to);
        }
        if (to instanceof VMLeg) {
            return new Type3Transition(from, to);
        }

        if (DEBUG) {
            console.error(`Illegal sequence CALeg -> ${to.constructor.name}`);
        }

        return null;
    }

    private static fromDF(from: DFLeg, to: Leg): Transition | null {
        if (to instanceof CALeg) {
            return new Type3Transition(from, to);
        }
        if (to instanceof DFLeg) {
            return new Type4Transition(from, to);
        }
        if (to instanceof HALeg || to instanceof HFLeg || to instanceof HMLeg) {
            return new Type5Transition(from, to);
        }
        if (to instanceof TFLeg) {
            return new Type1Transition(from, to);
        }
        if (to instanceof VMLeg) {
            return new Type3Transition(from, to);
        }

        if (DEBUG && !(to instanceof RFLeg)) {
            console.error(`Illegal sequence DFLeg -> ${to.constructor.name}`);
        }

        return null;
    }

    private static fromHX(from: HALeg | HFLeg |HMLeg, to: Leg): Transition | null {
        if (to instanceof CALeg) {
            return new Type3Transition(from, to);
        }
        if (to instanceof DFLeg) {
            return new Type4Transition(from, to);
        }
        /*if (to instanceof TFLeg) {
            return new Type2Transition(from, to);
        }*/
        if (to instanceof VMLeg) {
            return new Type3Transition(from, to);
        }

        if (DEBUG && !(to instanceof RFLeg)) {
            console.error(`Illegal sequence DFLeg -> ${to.constructor.name}`);
        }

        return null;
    }

    private static fromRF(from: RFLeg, to: Leg): Transition | null {
        if (to instanceof CALeg) {
            return new Type3Transition(from, to);
        }
        if (to instanceof HALeg || to instanceof HFLeg || to instanceof HMLeg) {
            return new Type5Transition(from, to);
        }

        if (DEBUG && !(to instanceof RFLeg) && !(to instanceof TFLeg)) {
            console.error(`Illegal sequence RFLeg -> ${to.constructor.name}`);
        }
    }

    private static fromTF(from: TFLeg, to: Leg): Transition | null {
        if (to instanceof CALeg) {
            return new Type3Transition(from, to);
        }
        if (to instanceof DFLeg) {
            return new Type4Transition(from, to);
        }
        if (to instanceof HALeg || to instanceof HFLeg || to instanceof HMLeg) {
            return new Type5Transition(from, to);
        }
        if (to instanceof TFLeg) {
            return new Type1Transition(from, to);
        }
        if (to instanceof VMLeg) {
            return new Type3Transition(from, to);
        }

        if (DEBUG && !(to instanceof RFLeg)) {
            console.error(`Illegal sequence TFLeg -> ${to.constructor.name}`);
        }

        return null;
    }

    private static fromVM(from: VMLeg, to: Leg): Transition | null {
        if (to instanceof CALeg) {
            return new Type3Transition(from, to);
        }
        if (to instanceof DFLeg) {
            return new Type4Transition(from, to);
        }

        if (DEBUG) {
            console.error(`Illegal sequence VMLeg -> ${to.constructor.name}`);
        }

        return null;
    }
}
