/**
 * Copyright 2021, FlyByWire Simulations, Synaptic Simulations
 * SPDX-License-Identifier: GPL-3.0
 */
/* eslint-disable max-classes-per-file */

import { Coordinates } from '@fmgc/flightplanning/data/geo';
import { GuidanceParameters } from '@fmgc/guidance/ControlLaws';
import { AltitudeDescriptor, TurnDirection } from '@fmgc/types/fstypes/FSEnums';
import { SegmentType } from '@fmgc/wtsdk';
import { Leg } from '.';
import { arcDistanceToGo, arcGuidance, courseToFixDistanceToGo, courseToFixGuidance } from '../CommonGeometry';
import { PathVector, PathVectorType } from '../PathVector';

interface Geometry {
    fixA: LatLongAlt,
    fixB: LatLongAlt,
    fixC: LatLongAlt,
    arcCentreFix1: LatLongAlt,
    arcCentreFix2: LatLongAlt,
    sweepAngle: Degrees,
}

enum HxLegGuidanceState {
    Inbound,
    Arc1,
    Outbound,
    Arc2,
}

export class HMLeg extends Leg {
    // TODO consider different entries for initial state...
    protected state: HxLegGuidanceState = HxLegGuidanceState.Inbound;

    protected termConditionMet: boolean = false;

    protected inboundLegCourse: Degrees;

    protected outboundLegCourse: Degrees;

    constructor(public to: WayPoint, public segment: SegmentType, public indexInFullPath: number) {
        super();

        this.inboundLegCourse = this.to.additionalData.course;
        this.outboundLegCourse = (this.inboundLegCourse + 180) % 360;
    }

    // TODO temp until vnav can give this
    protected targetSpeed(): Knots {
        // TODO unhax, need altitude => speed from vnav if not coded
        const alt = this.to.legAltitude1;
        let groundSpeed = 220; // TODO green dot
        if (this.to.speedConstraint > 100) {
            groundSpeed = Math.min(groundSpeed, this.to.speedConstraint);
        }
        // apply icao limits
        if (alt < 14000) {
            groundSpeed = Math.min(230, groundSpeed);
        } else if (alt < 20000) {
            groundSpeed = Math.min(240, groundSpeed);
        } else if (alt < 34000) {
            groundSpeed = Math.min(265, groundSpeed);
        } else {
            // TODO mach 0.83
            groundSpeed = Math.min(240, groundSpeed);
        }
        // TODO apply speed limit/alt
        return groundSpeed;
    }

    protected computeLegDistance(_groundSpeed?: Knots): NauticalMiles {
        // is distance in NM?
        if (this.to.additionalData.distance > 0) {
            return this.to.additionalData.distance;
        }

        // distance is in time then...
        // default should be 1 minute <= 14k ft, otherwise 1.5 minutes
        const groundSpeed = this.targetSpeed();
        return (this.to.additionalData.distanceInMinutes > 0 ? this.to.additionalData.distanceInMinutes : 1) * groundSpeed / 60;
    }

    protected computeGeometry(_groundSpeed?: Knots): Geometry {
        /*
         * We define some fixes at the turning points around the hippodrome like so (mirror vertically for left turn):
         *         A          B
         *         *----------*
         *       /              \
         * arc1 |  *          *  | arc2
         *       \              /
         *         *<---------*
         *      hold fix      C
         */

        // TODO calculate IMM EXIT shortened leg if necessary

        const distance = this.computeLegDistance();
        const radius = this.radius;
        const leftTurn = this.to.turnDirection === TurnDirection.Left;

        const fixA = Avionics.Utils.bearingDistanceToCoordinates(this.inboundLegCourse + (leftTurn ? -90 : 90), radius * 2, this.to.infos.coordinates.lat, this.to.infos.coordinates.long);
        const fixB = Avionics.Utils.bearingDistanceToCoordinates(this.outboundLegCourse, distance, fixA.lat, fixA.long);
        const fixC = Avionics.Utils.bearingDistanceToCoordinates(this.outboundLegCourse, distance, this.to.infos.coordinates.lat, this.to.infos.coordinates.long);

        const arcCentreFix1 = Avionics.Utils.bearingDistanceToCoordinates(this.inboundLegCourse + (leftTurn ? -90 : 90), radius, this.to.infos.coordinates.lat, this.to.infos.coordinates.long);
        const arcCentreFix2 = Avionics.Utils.bearingDistanceToCoordinates(this.inboundLegCourse + (leftTurn ? -90 : 90), radius, fixC.lat, fixC.long);

        return {
            fixA,
            fixB,
            fixC,
            arcCentreFix1,
            arcCentreFix2,
            sweepAngle: leftTurn ? -180 : 180,
        };
    }

    get radius(): NauticalMiles {
        // TODO should be proper max bank
        const maxBank = 35;
        const gsMs = this.targetSpeed() / 1.94384;
        const radius = gsMs ** 2 / (9.81 * Math.tan(maxBank * Math.PI / 180)) / 1852;

        return radius;
    }

    get terminationPoint(): LatLongAlt {
        return this.to.infos.coordinates;
    }

    get distance(): NauticalMiles {
        // TODO get hold speed/predicted speed
        const groundSpeed = SimVar.GetSimVarValue('GPS GROUND SPEED', 'knots');

        return this.computeLegDistance(groundSpeed) * 4;
    }

    get inboundCourse(): Degrees {
        return this.inboundLegCourse;
    }

    get outboundCourse(): Degrees {
        return this.inboundLegCourse;
    }

    public getNominalRollAngle(_gs: Knots): Degrees {
        // TODO
        return 0;
    }

    protected getDistanceToGoThisOrbit(ppos: LatLongData): NauticalMiles {
        // TODO get hold speed/predicted speed
        const groundSpeed = SimVar.GetSimVarValue('GPS GROUND SPEED', 'knots');

        const { fixB, arcCentreFix1, arcCentreFix2, sweepAngle } = this.computeGeometry(groundSpeed);

        switch (this.state) {
        case HxLegGuidanceState.Inbound:
            return courseToFixDistanceToGo(ppos, this.inboundLegCourse, this.to.infos.coordinates);
        case HxLegGuidanceState.Arc1:
            return arcDistanceToGo(ppos, this.to.infos.coordinates, arcCentreFix1, sweepAngle) + this.computeLegDistance(groundSpeed) * 2 + this.radius * Math.PI;
        case HxLegGuidanceState.Outbound:
            return courseToFixDistanceToGo(ppos, this.outboundLegCourse, fixB) + this.computeLegDistance(groundSpeed) + this.radius * Math.PI;
        case HxLegGuidanceState.Arc2:
            return arcDistanceToGo(ppos, fixB, arcCentreFix2, sweepAngle) + this.computeLegDistance(groundSpeed);
        default:
        }

        return 1;
    }

    getDistanceToGo(ppos: LatLongData): NauticalMiles {
        if (this.termConditionMet /* IMM EXIT */) {
            return this.getDistanceToGoThisOrbit(ppos);
        }
        return this.computeLegDistance() * 2 + 2 * this.radius * Math.PI;
    }

    get predictedPath(): PathVector[] {
        // TODO get hold speed/predicted speed
        const groundSpeed = SimVar.GetSimVarValue('GPS GROUND SPEED', 'knots');
        const { fixA, fixB, fixC, arcCentreFix1, arcCentreFix2, sweepAngle } = this.computeGeometry(groundSpeed);

        return [
            {
                type: PathVectorType.Arc,
                startPoint: this.to.infos.coordinates,
                centrePoint: arcCentreFix1,
                endPoint: fixA,
                sweepAngle,
            },
            {
                type: PathVectorType.Line,
                startPoint: fixA,
                endPoint: fixB,
            },
            {
                type: PathVectorType.Arc,
                startPoint: fixB,
                centrePoint: arcCentreFix2,
                endPoint: fixC,
                sweepAngle,
            },
            {
                type: PathVectorType.Line,
                startPoint: fixC,
                endPoint: this.to.infos.coordinates,
            },
        ];
    }

    updateState(ppos: LatLongAlt, geometry: Geometry): void {
        let dtg: NauticalMiles;
        switch (this.state) {
        case HxLegGuidanceState.Inbound:
            dtg = courseToFixDistanceToGo(ppos, this.inboundLegCourse, this.to.infos.coordinates);
            break;
        case HxLegGuidanceState.Arc1:
            dtg = arcDistanceToGo(ppos, this.to.infos.coordinates, geometry.arcCentreFix1, geometry.sweepAngle);
            break;
        case HxLegGuidanceState.Outbound:
            dtg = courseToFixDistanceToGo(ppos, this.outboundLegCourse, geometry.fixB);
            break;
        case HxLegGuidanceState.Arc2:
            dtg = arcDistanceToGo(ppos, geometry.fixB, geometry.arcCentreFix2, geometry.sweepAngle);
            break;
        default:
            throw new Error(`Bad HxLeg state ${this.state}`);
        }

        if (dtg <= 0) {
            this.state = (this.state + 1) % HxLegGuidanceState.Arc2;
        }
    }

    getGuidanceParameters(ppos: LatLongAlt, trueTrack: Degrees): GuidanceParameters {
        // TODO get hold speed/predicted speed
        const groundSpeed = SimVar.GetSimVarValue('GPS GROUND SPEED', 'knots');
        const geometry = this.computeGeometry(groundSpeed);
        const { fixB, arcCentreFix1, arcCentreFix2, sweepAngle } = geometry;

        this.updateState(ppos, geometry);

        switch (this.state) {
        case HxLegGuidanceState.Inbound:
            return courseToFixGuidance(ppos, trueTrack, this.inboundLegCourse, this.to.infos.coordinates);
        case HxLegGuidanceState.Arc1:
            return arcGuidance(ppos, trueTrack, this.to.infos.coordinates, arcCentreFix1, sweepAngle);
        case HxLegGuidanceState.Outbound:
            return courseToFixGuidance(ppos, trueTrack, this.outboundLegCourse, fixB);
        case HxLegGuidanceState.Arc2:
            return arcGuidance(ppos, trueTrack, fixB, arcCentreFix2, sweepAngle);
        default:
            throw new Error(`Bad HxLeg state ${this.state}`);
        }
    }

    recomputeWithParameters(_tas: Knots): void {
        // TODO store IMM EXIT point and termConditionMet flag, consider changes to hold params
        console.log(this.predictedPath);
    }

    getPseudoWaypointLocation(_distanceBeforeTerminator: NauticalMiles): LatLongData | undefined {
        return undefined;
    }

    // TODO are we even using this? What exactly should it tell us?
    isAbeam(_ppos: Coordinates) {
        return false;
    }
}

export class HALeg extends HMLeg {
    private targetAltitude: Feet;

    constructor(public to: WayPoint, public segment: SegmentType, public indexInFullPath: number) {
        super(to, segment, indexInFullPath);

        // the term altitude is guaranteed to be at or above, and in field altitude1, by ARINC424 coding rules
        if (this.to.legAltitudeDescription !== AltitudeDescriptor.AtOrAbove) {
            console.warn(`HALeg invalid altitude descriptor ${this.to.legAltitudeDescription}, must be ${AltitudeDescriptor.AtOrAbove}`);
        }
        this.targetAltitude = this.to.legAltitude1;
    }

    getGuidanceParameters(ppos: LatLongAlt, trueTrack: Degrees): GuidanceParameters {
        // TODO get altitude, check for at or above our target
        // TODO do we need to force at least one circuit if already at the term altitude on entry? honeywell doc covers this..

        return super.getGuidanceParameters(ppos, trueTrack);
    }

    getDistanceToGo(ppos: LatLongData): NauticalMiles {
        if (this.termConditionMet) {
            return this.getDistanceToGoThisOrbit(ppos);
        }
        // TODO compute distance until alt (vnav) + remainder of last orbit
        return 42;
    }
}

export class HFLeg extends HMLeg {
    getGuidanceParameters(ppos: LatLongAlt, trueTrack: Degrees): GuidanceParameters {
        if (this.state !== HxLegGuidanceState.Inbound) {
            this.termConditionMet = true;
        }
        return super.getGuidanceParameters(ppos, trueTrack);
    }
}
