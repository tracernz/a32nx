import { SegmentType } from '@fmgc/flightplanning/FlightPlanSegment';
import { Coordinates } from '@fmgc/flightplanning/data/geo';
import { AltitudeConstraint, SpeedConstraint } from '@fmgc/guidance/lnav/legs/index';
import { Guidable } from '@fmgc/guidance/Guidable';

export abstract class Leg extends Guidable {
    segment: SegmentType;

    indexInFullPath: number;

    abstract get inboundCourse(): Degrees | undefined;

    abstract get outboundCourse(): Degrees | undefined;

    abstract get distance(): NauticalMiles | undefined;

    abstract get ident(): string

    eta(ppos: Coordinates, gs: Knots): string {
        // FIXME use a more accurate estimate, calculate in predictions

        const UTC_SECONDS = Math.floor(SimVar.GetGlobalVarValue('ZULU TIME', 'seconds'));
        const hours = Math.floor(UTC_SECONDS / 3600) || 0;
        const minutes = Math.floor(UTC_SECONDS % 3600 / 60) || 0;

        const nauticalMilesToGo = this.getDistanceToGo(ppos);
        const secondsToGo = (nauticalMilesToGo / Math.max(180, gs)) * 3600;

        const hoursToGo = Math.floor(secondsToGo / 3600) || 0;
        const minutesToGo = Math.floor(secondsToGo % 3600 / 60) || 0;

        const newHours = (hours + hoursToGo) % 24;
        const newMinutes = minutes + minutesToGo;

        return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
    }

    abstract get speedConstraint(): SpeedConstraint | undefined;

    abstract get altitudeConstraint(): AltitudeConstraint | undefined;

    get disableAutomaticSequencing(): boolean {
        return false;
    }

    /** @inheritDoc */
    recomputeWithParameters(_isActive: boolean, _tas: Knots, _gs: Knots, _ppos: Coordinates, _previousGuidable: Guidable, _nextGuidable: Guidable): void {
        // Default impl.
    }
}
