//  Copyright (c) 2021 FlyByWire Simulations
//  SPDX-License-Identifier: GPL-3.0

import { Transition } from '@fmgc/guidance/lnav/transitions';
import { RFLeg } from '@fmgc/guidance/lnav/legs/RF';
import { TFLeg } from '@fmgc/guidance/lnav/legs/TF';
import { HALeg, HFLeg, HMLeg } from '@fmgc/guidance/lnav/legs/HX';
import { Coordinates } from '@fmgc/flightplanning/data/geo';
import { TurnDirection } from '@fmgc/types/fstypes/FSEnums';
import { GuidanceParameters } from '@fmgc/guidance/ControlLaws';
import { ControlLaw } from '@shared/autopilot';
import { PathVector, PathVectorType } from '../PathVector';

Include.addScript('/Pages/A32NX_Core/math.js');
Include.addScript('/JS/A32NX_Util.js');

enum EntryType {
    Null,
    Teardrop,
    Parallel,
    DirectOutbound,
    DirectTurn,
}

export class Type5Transition extends Transition {
    private entry = EntryType.Null;

    private computedPath: PathVector[] = [];

    // hax
    private wasAbeam = false;

    constructor(
        private previousLeg: /* AFLeg | CFLeg | DFLeg | */ RFLeg | TFLeg,
        private nextLeg: HALeg | HFLeg | HMLeg,
        predictWithCurrentSpeed: boolean = true,
    ) {
        super();
    }

    get isNull(): boolean {
        return this.entry === EntryType.Null;
    }

    getDistanceToGo(_ppos: LatLongData): NauticalMiles {
        if (this.entry === EntryType.Null) {
            return 0;
        }
        // TODO
        return 0;
    }

    getGuidanceParameters(_ppos: LatLongAlt, _trueTrack: Degrees): GuidanceParameters {
        return {
            law: ControlLaw.LATERAL_PATH,
            crossTrackError: 0,
            trackAngleError: 0,
            phiCommand: 0,
        };
    }

    public getNominalRollAngle(_gs: Knots): Degrees {
        return 0;
    }

    getTurningPoints(): [LatLongAlt, LatLongAlt] {
        // TODO ftp... this is only correct for null entry
        return [this.nextLeg.to.infos.coordinates, this.nextLeg.to.infos.coordinates];
    }

    isAbeam(ppos: Coordinates) {
        // major hack
        if (!this.wasAbeam && this.previousLeg.getDistanceToGo(ppos) <= 0) {
            this.wasAbeam = true;
            return true;
        }
        return false;
    }

    get isCircularArc(): boolean {
        return true;
    }

    get inboundCourse(): Degrees {
        return this.previousLeg.outboundCourse;
    }

    get outboundCourse(): Degrees {
        return this.nextLeg.inboundCourse;
    }

    get predictedPath(): PathVector[] {
        if (this.entry === EntryType.Null) {
            return [];
        }
        return this.computedPath;
    }

    computeNullEntry() {
        this.entry = EntryType.Null;
        this.computedPath.length = 0;
    }

    computeDirectOutboundEntry() {
        // this.entry = EntryType.DirectOutbound;
    }

    computeDirectTurnEntry() {
        // this.entry = EntryType.DirectTurn;
    }

    computeTeardropEntry() {
        this.entry = EntryType.Teardrop;
        const radius = this.nextLeg.radius;

        const itp1 = this.nextLeg.to.infos.coordinates;
        const arcCentre1 = Avionics.Utils.bearingDistanceToCoordinates(this.inboundCourse + (this.nextLeg.to.turnDirection === TurnDirection.Right ? -90 : 90), radius, itp1.lat, itp1.long);
        const sweepAngle1 = Avionics.Utils.diffAngle(this.inboundCourse, this.outboundCourse + 150);
        const bearing1 = Avionics.Utils.clampAngle(this.inboundCourse + (this.nextLeg.to.turnDirection === TurnDirection.Right ? sweepAngle1 + 90 : -sweepAngle1 - 90));
        const ftp1 = Avionics.Utils.bearingDistanceToCoordinates(bearing1, radius, arcCentre1.lat, arcCentre1.long);

        this.predictedPath.length = 0;
        this.predictedPath.push({
            type: PathVectorType.Arc,
            startPoint: itp1,
            endPoint: ftp1,
            centrePoint: arcCentre1,
            sweepAngle: sweepAngle1,
        });

        // TODO distance...
        const itp2 = Avionics.Utils.bearingDistanceToCoordinates(this.outboundCourse + 150, this.nextLeg.distance / 6, ftp1.lat, ftp1.long);
        this.predictedPath.push({
            type: PathVectorType.Line,
            startPoint: ftp1,
            endPoint: itp2,
        });

        const arcCentre2 = Avionics.Utils.bearingDistanceToCoordinates(this.outboundCourse + (this.nextLeg.to.turnDirection === TurnDirection.Right ? -120 : 120), radius, itp2.lat, itp2.long);
        const ftp2 = Avionics.Utils.bearingDistanceToCoordinates(this.outboundCourse - 45, radius, arcCentre2.lat, arcCentre2.long);

        this.predictedPath.push({
            type: PathVectorType.Arc,
            startPoint: itp2,
            endPoint: ftp2,
            centrePoint: arcCentre2,
            sweepAngle: this.nextLeg.to.turnDirection === TurnDirection.Right ? 285 : -285,
        });

        const finalIntercept = A32NX_Util.greatCircleIntersection(
            ftp2,
            Avionics.Utils.clampAngle(this.outboundCourse + 45),
            this.nextLeg.to.infos.coordinates,
            this.outboundCourse + 180 % 360,
        );

        this.predictedPath.push({
            type: PathVectorType.Line,
            startPoint: ftp2,
            endPoint: finalIntercept,
        });
    }

    computeParallelEntry() {
        this.entry = EntryType.Parallel;
        const radius = this.nextLeg.radius;

        const itp1 = this.nextLeg.to.infos.coordinates;
        const arcCentre1 = Avionics.Utils.bearingDistanceToCoordinates(this.inboundCourse + (this.nextLeg.to.turnDirection === TurnDirection.Right ? -90 : 90), radius, itp1.lat, itp1.long);
        const sweepAngle1 = Avionics.Utils.diffAngle(this.inboundCourse, this.outboundCourse + 180);
        const bearing1 = Avionics.Utils.clampAngle(this.inboundCourse + (this.nextLeg.to.turnDirection === TurnDirection.Right ? sweepAngle1 + 90 : -sweepAngle1 - 90));
        const ftp1 = Avionics.Utils.bearingDistanceToCoordinates(bearing1, radius, arcCentre1.lat, arcCentre1.long);

        this.predictedPath.length = 0;
        this.predictedPath.push({
            type: PathVectorType.Arc,
            startPoint: itp1,
            endPoint: ftp1,
            centrePoint: arcCentre1,
            sweepAngle: sweepAngle1,
        });

        const itp2 = Avionics.Utils.bearingDistanceToCoordinates(this.outboundCourse + 180, this.nextLeg.distance / 4, ftp1.lat, ftp1.long);
        this.predictedPath.push({
            type: PathVectorType.Line,
            startPoint: ftp1,
            endPoint: itp2,
        });

        const arcCentre2 = Avionics.Utils.bearingDistanceToCoordinates(this.outboundCourse + (this.nextLeg.to.turnDirection === TurnDirection.Right ? 90 : -90), radius, itp2.lat, itp2.long);
        const ftp2 = Avionics.Utils.bearingDistanceToCoordinates(this.outboundCourse + 45, radius, arcCentre2.lat, arcCentre2.long);

        this.predictedPath.push({
            type: PathVectorType.Arc,
            startPoint: itp2,
            endPoint: ftp2,
            centrePoint: arcCentre2,
            sweepAngle: this.nextLeg.to.turnDirection === TurnDirection.Right ? -225 : 255,
        });

        const finalIntercept = A32NX_Util.greatCircleIntersection(
            ftp2,
            Avionics.Utils.clampAngle(this.outboundCourse - 45),
            this.nextLeg.to.infos.coordinates,
            this.outboundCourse + 180 % 360,
        );

        this.predictedPath.push({
            type: PathVectorType.Line,
            startPoint: ftp2,
            endPoint: finalIntercept,
        });
    }

    recomputeWithParameters(_tas: Knots): void {
        const hxInbound = this.outboundCourse;
        const entryAngle = Avionics.Utils.diffAngle(this.inboundCourse, hxInbound);

        if (entryAngle >= -3 && entryAngle <= 3) {
            this.computeNullEntry();
            return;
        }

        if (this.nextLeg.to.turnDirection === TurnDirection.Left) {
            if (entryAngle > 110 && entryAngle < 177) {
                this.computeTeardropEntry();
            } else if ((entryAngle >= 177 && entryAngle <= 180) || (entryAngle > -180 && entryAngle < -70)) {
                this.computeParallelEntry();
            } else if (entryAngle >= -70 && entryAngle < -3) {
                this.computeDirectTurnEntry();
            } else {
                this.computeDirectOutboundEntry();
            }
        } else if (this.nextLeg.to.turnDirection === TurnDirection.Right) {
            if (entryAngle > -177 && entryAngle < -110) {
                this.computeTeardropEntry();
            } else if ((entryAngle > 70 && entryAngle <= 180) || (entryAngle > -180 && entryAngle <= -177)) {
                this.computeParallelEntry();
            } else if (entryAngle > 3 && entryAngle <= 70) {
                this.computeDirectTurnEntry();
            } else {
                this.computeDirectOutboundEntry();
            }
        }
    }
}
