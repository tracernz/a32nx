import { Leg } from '@fmgc/guidance/lnav/legs/Leg';
import { TFLeg } from '@fmgc/guidance/lnav/legs/TF';
import { Type1Transition } from '@fmgc/guidance/lnav/transitions';
import { VMLeg } from '@fmgc/guidance/lnav/legs/VM';
import { CALeg } from '@fmgc/guidance/lnav/legs/CA';
import { Type3Transition } from '@fmgc/guidance/lnav/transitions/Type3';
import { DFLeg } from '@fmgc/guidance/lnav/legs/DF';
import { Type4Transition } from '@fmgc/guidance/lnav/transitions/Type4';
import { Transition } from './Transition';

export class TransitionPicker {
    static forLegs(from: Leg, to: Leg): Transition | null {
        if (from instanceof CALeg) {
            return TransitionPicker.fromCA(from, to);
        }
        if (from instanceof DFLeg) {
            return TransitionPicker.fromDF(from, to);
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

    private static fromDF(from: DFLeg, to: Leg): Transition | null {
        if (to instanceof DFLeg) {
            return new Type4Transition(from, to);
        }
        if (to instanceof TFLeg) {
            return new Type1Transition(from, to);
        }
        if (to instanceof VMLeg) {
            return new Type3Transition(from, to);
        }
        if (to instanceof CALeg) {
            return new Type3Transition(from, to);
        }

        return null;
    }

    private static fromTF(from: TFLeg, to: Leg): Transition | null {
        if (to instanceof DFLeg) {
            return new Type4Transition(from, to);
        }
        if (to instanceof TFLeg) {
            return new Type1Transition(from, to);
        }
        if (to instanceof VMLeg) {
            return new Type3Transition(from, to);
        }
        if (to instanceof CALeg) {
            return new Type3Transition(from, to);
        }

        return null;
    }

    private static fromCA(from: CALeg, to: Leg): Transition | null {
        if (to instanceof TFLeg) {
            return new Type3Transition(from, to);
        }
        if (to instanceof DFLeg) {
            return new Type4Transition(from, to);
        }
        if (to instanceof VMLeg) {
            return new Type3Transition(from, to);
        }
        if (to instanceof CALeg) {
            return new Type3Transition(from, to);
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

        return null;
    }
}
