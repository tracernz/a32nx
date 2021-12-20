import { Leg } from '@fmgc/guidance/lnav/legs/Leg';
import { TurnDirection } from '@fmgc/types/fstypes/FSEnums';

export abstract class XFLeg extends Leg {
    fix: WayPoint;

    get terminationWaypoint(): WayPoint {
        return this.fix;
    }

    get ident(): string {
        return this.fix.ident;
    }

    get forcedTurnDirection(): TurnDirection {
        return this.fix.turnDirection ?? TurnDirection.Either;
    }

    get overflyTermFix(): boolean {
        return this.fix.additionalData.overfly ?? false;
    }

    get distanceToTermFix(): NauticalMiles {
        return Avionics.Utils.computeGreatCircleDistance(this.getPathStartPoint(), this.fix.infos.coordinates);
    }
}
