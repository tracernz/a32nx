import { Coordinates } from '@fmgc/flightplanning/data/geo';
import { MathUtils } from '@shared/MathUtils';
import { Constants } from '@shared/Constants';
import { Convert } from '@shared/Convert';

/**
 * Compute the remaining distance around an arc
 * This is only valid once past the itp
 * @param ppos
 * @param itp
 * @param centrePoint
 * @param sweepAngle
 * @returns
 */
export function arcDistanceToGo(ppos: Coordinates, itp: Coordinates, centrePoint: Coordinates, sweepAngle: Degrees) {
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
