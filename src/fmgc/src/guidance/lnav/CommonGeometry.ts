import { Coordinates } from '@fmgc/flightplanning/data/geo';
import { ControlLaw } from '@shared/autopilot';
import { GuidanceParameters } from '../ControlLaws';

/**
 * Compute the remaining distance around an arc
 * This is only valid once past the itp
 * @param ppos
 * @param itp
 * @param centrePoint
 * @param sweepAngle
 * @returns
 */
export function arcDistanceToGo(ppos: Coordinates, itp: Coordinates, centrePoint: Coordinates, sweepAngle: Degrees): NauticalMiles {
    const itpBearing = Avionics.Utils.computeGreatCircleHeading(centrePoint, itp);
    const pposBearing = Avionics.Utils.computeGreatCircleHeading(centrePoint, ppos);
    const radius = Avionics.Utils.computeGreatCircleDistance(centrePoint, itp);

    const refFrameOffset = Avionics.Utils.diffAngle(0, itpBearing);
    const pposAngle = sweepAngle < 0 ? Avionics.Utils.clampAngle(refFrameOffset - pposBearing) : Avionics.Utils.clampAngle(pposBearing - refFrameOffset);

    if (pposAngle >= Math.abs(sweepAngle)) {
        return 0;
    }

    return radius * Math.PI * (Math.abs(sweepAngle) - pposAngle) / 180;
}

export function arcGuidance(ppos: Coordinates, trueTrack: Degrees, itp: Coordinates, centreFix: Coordinates, sweepAngle: Degrees): GuidanceParameters {
    const bearingPpos = Avionics.Utils.computeGreatCircleHeading(
        centreFix,
        ppos,
    );

    const desiredTrack = sweepAngle > 0 ? Avionics.Utils.clampAngle(bearingPpos + 90) : Avionics.Utils.clampAngle(bearingPpos - 90);
    const trackAngleError = Avionics.Utils.diffAngle(desiredTrack, trueTrack);

    const radius = Avionics.Utils.computeGreatCircleDistance(centreFix, itp);
    const distanceFromCenter = Avionics.Utils.computeGreatCircleDistance(centreFix, ppos);

    const crossTrackError = distanceFromCenter - radius;

    const groundSpeed = SimVar.GetSimVarValue('GPS GROUND SPEED', 'meters per second');
    const radiusInMetre = radius * 1852;
    const phiCommand = (sweepAngle > 0 ? 1 : -1) * Math.atan((groundSpeed * groundSpeed) / (radiusInMetre * 9.81)) * (180 / Math.PI);

    return {
        law: ControlLaw.LATERAL_PATH,
        trackAngleError,
        crossTrackError,
        phiCommand,
    };
}

export function courseToFixAbeamPoint(ppos: Coordinates, course: Degrees, fix: Coordinates): Coordinates {
    const alongTrackDist = courseToFixDistanceToGo(ppos, course, fix);
    return Avionics.Utils.bearingDistanceToCoordinates(course + 180 % 360, alongTrackDist, fix.lat, fix.long);
}

export function courseToFixDistanceToGo(ppos: Coordinates, course: Degrees, fix: Coordinates): NauticalMiles {
    // TODO check if this needs diffAngle
    const fixToPposAngle = Avionics.Utils.computeGreatCircleHeading(fix, ppos) - course;
    const fixToPposDist = Avionics.Utils.computeGreatCircleDistance(fix, ppos);

    return Math.max(0, fixToPposDist * Math.sin(fixToPposAngle * Math.PI / 180));
}

export function courseToFixGuidance(ppos: Coordinates, trueTrack: Degrees, course: Degrees, fix: Coordinates): GuidanceParameters {
    const abeamPoint = courseToFixAbeamPoint(ppos, course, fix);
    const crossTrackError = Avionics.Utils.computeGreatCircleDistance(ppos, abeamPoint);
    const trackAngleError = Avionics.Utils.diffAngle(course, trueTrack);

    return {
        law: ControlLaw.LATERAL_PATH,
        trackAngleError,
        crossTrackError,
        phiCommand: 0,
    };
}
