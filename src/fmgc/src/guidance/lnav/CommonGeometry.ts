import { Coordinates } from '@fmgc/flightplanning/data/geo';
import { ControlLaw, GuidanceParameters } from '@fmgc/guidance/ControlLaws';
import { MathUtils } from '@shared/MathUtils';
import { Constants } from '@shared/Constants';
import { Convert } from '@shared/Convert';

/**
 * Compute the remaining distance around an arc
 * This is only valid once past the itp
 * @param ppos       current aircraft position
 * @param itp        current aircraft track
 * @param centreFix  centre of the arc
 * @param sweepAngle angle swept around the arc, +ve for clockwise
 * @returns
 */
export function arcDistanceToGo(ppos: Coordinates, itp: Coordinates, centreFix: Coordinates, sweepAngle: Degrees) {
    const itpBearing = Avionics.Utils.computeGreatCircleHeading(centreFix, itp);
    const pposBearing = Avionics.Utils.computeGreatCircleHeading(centreFix, ppos);
    const radius = Avionics.Utils.computeGreatCircleDistance(centreFix, itp);

    const refFrameOffset = Avionics.Utils.diffAngle(0, itpBearing);
    const pposAngle = sweepAngle < 0 ? Avionics.Utils.clampAngle(refFrameOffset - pposBearing) : Avionics.Utils.clampAngle(pposBearing - refFrameOffset);

    if (pposAngle >= Math.abs(sweepAngle)) {
        return 0;
    }

    return radius * Math.PI * (Math.abs(sweepAngle) - pposAngle) / 180;
}

/**
 * Compute guidance parameters for an arc path
 * @param ppos       current aircraft position
 * @param trueTrack  current aircraft track
 * @param itp        initial turning point for the arc
 * @param centreFix  centre of the arc
 * @param sweepAngle angle swept around the arc, +ve for clockwise
 * @returns {GuidanceParameters} lateral path law params
 */
export function arcGuidance(ppos: Coordinates, trueTrack: Degrees, itp: Coordinates, centreFix: Coordinates, sweepAngle: Degrees): GuidanceParameters {
    const bearingPpos = Avionics.Utils.computeGreatCircleHeading(
        centreFix,
        ppos,
    );

    const desiredTrack = sweepAngle > 0 ? Avionics.Utils.clampAngle(bearingPpos + 90) : Avionics.Utils.clampAngle(bearingPpos - 90);
    const trackAngleError = Avionics.Utils.diffAngle(trueTrack, desiredTrack);

    const radius = Avionics.Utils.computeGreatCircleDistance(centreFix, itp);
    const distanceFromCenter = Avionics.Utils.computeGreatCircleDistance(centreFix, ppos);

    const crossTrackError = sweepAngle > 0
        ? distanceFromCenter - radius
        : radius - distanceFromCenter;

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

/**
 * Computes a point along an arc at a distance before its termination
 *
 * @param distanceFromFtp distance before end of arc
 * @param ftp             arc exit point
 * @param centrePoint     arc centre point
 * @param clockwise       whether the arc goes clockwise
 * @param radius          arc radius
 * @param sweepAngle      arc sweep angle
 * @param distance        arc distance
 */
export function pointOnArc(
    distanceFromFtp: NauticalMiles,
    ftp: Coordinates,
    centrePoint: Coordinates,
    clockwise: boolean,
    radius: NauticalMiles,
    sweepAngle: Degrees,
    distance: NauticalMiles,
): Coordinates {
    const distanceRatio = distanceFromFtp / distance;
    const angleFromTerminator = distanceRatio * sweepAngle;

    const centerToTerminationBearing = Avionics.Utils.computeGreatCircleHeading(centrePoint, ftp);

    return Avionics.Utils.bearingDistanceToCoordinates(
        Avionics.Utils.clampAngle(centerToTerminationBearing + (clockwise ? -angleFromTerminator : angleFromTerminator)),
        radius,
        centrePoint.lat,
        centrePoint.long,
    );
}

/**
 * Returns the nominal roll for an arc
 *
 * @param gs     ground speed
 * @param radius arc radius
 */
export function arcNominalRoll(gs: Knots, radius: NauticalMiles): Degrees {
    return (this.clockwise ? 1 : -1) * Math.atan((gs ** 2) / (radius * Convert.NM_TO_M * Constants.G)) * MathUtils.RADIANS_TO_DEGREES;
}
