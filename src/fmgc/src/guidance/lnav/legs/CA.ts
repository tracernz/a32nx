import { Degrees, Feet, NauticalMiles, Track } from '@typings/types';
import { ControlLaw, GuidanceParameters } from '@fmgc/guidance/ControlLaws';
import { LatLongData } from '@typings/fs-base-ui/html_ui/JS/Types';
import {
    Leg,
    AltitudeConstraint,
    SpeedConstraint,
    getAltitudeConstraintFromWaypoint,
    getSpeedConstraintFromWaypoint,
    waypointToLocation,
} from '@fmgc/guidance/lnav/legs';
import { SegmentType } from '@fmgc/wtsdk';
import { WayPoint } from '@fmgc/types/fstypes/FSTypes';

export class CALeg implements Leg {
    public from: WayPoint;

    public course: Degrees;
    public altitude: Feet;
    public active: boolean;
    public ident: string;

    public segment: SegmentType;

    constructor(from: WayPoint, course: Degrees, altitude: Feet, active: boolean, segment: SegmentType) {
        this.from = from;
        this.course = course;
        this.altitude = altitude;
        this.active = active;
        this.segment = segment;

        this.ident = Math.round(this.altitude).toFixed(0);
    }

    get isCircularArc(): boolean {
        return false;
    }

    get bearing(): Degrees {
        return this.course;
    }

    get distance(): NauticalMiles {
        // TODO calc prediction... need previous leg term alt

        if (this.segment === SegmentType.Departure) {
            // assuming starting at 0 feet, yikes
            const dt = this.altitude / 1500;
            return dt * 150;
        }

        return 2;
    }

    // TODO this is bogus... constraints are associated with the leg, not waypoints
    get speedConstraint(): SpeedConstraint | undefined {
        return getSpeedConstraintFromWaypoint(this.from);
    }

    get altitudeConstraint(): AltitudeConstraint | undefined {
        return getAltitudeConstraintFromWaypoint(this.from);
    }

    // TODO: refactor
    get initialSpeedConstraint(): SpeedConstraint | undefined {
        return getSpeedConstraintFromWaypoint(this.from);
    }

    // TODO: refactor
    get initialAltitudeConstraint(): AltitudeConstraint | undefined {
        return getAltitudeConstraintFromWaypoint(this.from);
    }

    get initialLocation(): LatLongData {
        return waypointToLocation(this.from);
    }

    get terminatorLocation(): LatLongData {
        // TODO calculate
        if (this.active) {
            const ppos = {
                lat: SimVar.GetSimVarValue('PLANE LATITUDE', 'degree latitude'),
                long: SimVar.GetSimVarValue('PLANE LONGITUDE', 'degree longitude'),
            };
            const dtg = this.getDistanceToGo(ppos);
            return Avionics.Utils.bearingDistanceToCoordinates(this.course, dtg, ppos.lat, ppos.long);
        }
        return Avionics.Utils.bearingDistanceToCoordinates(this.course, this.distance, this.from.infos.coordinates.lat, this.from.infos.coordinates.long);
    }

    getPseudoWaypointLocation(_distanceBeforeTerminator: NauticalMiles): undefined {
        // TODO
        return undefined;
    }

    getGuidanceParameters(_ppos: LatLongData, _trueTrack: Track): GuidanceParameters | null {
        return {
            law: ControlLaw.TRACK,
            course: this.course,
        };
    }

    getNominalRollAngle(gs): Degrees {
        return 0;
    }

    getDistanceToGo(_ppos: LatLongData): NauticalMiles {
        // TODO all this stuff should come from FMGC
        const alt = SimVar.GetSimVarValue('PLANE ALTITUDE', 'feet');
        const vs = SimVar.GetSimVarValue('VERTICAL SPEED', 'feet per second');
        const gs = SimVar.GetSimVarValue('GPS GROUND SPEED', 'knots');

        if (this.segment === SegmentType.Departure) {
            if (alt >= this.altitude) {
                return 0;
            }
            const dt = (this.altitude - alt) / vs;
            return dt * gs;
        } else {
            if (alt <= this.altitude) {
                return 0;
            }
            const dt = (alt - this.altitude) / vs;
            return dt * gs;
        }
    }

    isAbeam(_ppos: LatLongAlt): boolean {
        // TODO
        return true;
    }

    toString(): string {
        return `<CALeg course=${this.course}>`;
    }
}
