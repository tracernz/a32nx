// @ts-strict-ignore
// Copyright (c) 2021-2026 FlyByWire Simulations
//
// SPDX-License-Identifier: GPL-3.0

import {
  NavGeometryProfile,
  VerticalCheckpoint,
  VerticalCheckpointReason,
} from '@fmgc/guidance/vnav/profile/NavGeometryProfile';
import { VerticalProfileComputationParametersObserver } from '@fmgc/guidance/vnav/VerticalProfileComputationParameters';
import { VnavConfig } from '@fmgc/guidance/vnav/VnavConfig';
import { MathUtils } from '@flybywiresim/fbw-sdk';

export class AircraftToDescentProfileRelation {
  public isValid: boolean = false;

  public currentProfile?: NavGeometryProfile;

  private topOfDescent?: VerticalCheckpoint;

  private geometricPathStart?: VerticalCheckpoint;

  private distanceToEnd: NauticalMiles = 0;

  public totalFlightPlanDistance: number = 0;

  get distanceFromStart(): NauticalMiles {
    return this.totalFlightPlanDistance - this.distanceToEnd;
  }

  get currentDistanceToEnd(): NauticalMiles {
    return this.distanceToEnd;
  }

  constructor(private observer: VerticalProfileComputationParametersObserver) {}

  reset() {
    this.isValid = false;
    this.currentProfile = undefined;
    this.topOfDescent = undefined;
    this.geometricPathStart = undefined;
    this.distanceToEnd = 0;
    this.totalFlightPlanDistance = 0;
  }

  updateProfile(profile: NavGeometryProfile) {
    const topOfDescent = profile?.findVerticalCheckpoint(VerticalCheckpointReason.TopOfDescent);
    const geometricPathStart = profile?.findVerticalCheckpoint(VerticalCheckpointReason.GeometricPathStart);

    const isProfileValid = !!topOfDescent && !!geometricPathStart;

    if (!isProfileValid) {
      this.invalidate();

      // If the profile is empty, we don't bother logging that it's invalid, because it probably just hasn't been computed yet.
      if (VnavConfig.DEBUG_PROFILE && profile.checkpoints.length >= 0) {
        console.warn('[FMS/VNAV] Invalid profile');
      }

      return;
    }

    this.isValid = isProfileValid;

    this.topOfDescent = topOfDescent;
    this.geometricPathStart = geometricPathStart;

    this.currentProfile = profile;
    this.totalFlightPlanDistance = profile.totalFlightPlanDistance;

    this.distanceToEnd = profile.totalFlightPlanDistance - profile.distanceToPresentPosition;
  }

  private invalidate() {
    this.isValid = false;
    this.currentProfile = undefined;
    this.topOfDescent = undefined;
  }

  update(distanceToEnd: number) {
    if (!this.isValid) {
      return;
    }

    if (!Number.isFinite(distanceToEnd)) {
      this.invalidate();
      return;
    }

    this.distanceToEnd = distanceToEnd;
  }

  isPastTopOfDescent(): boolean {
    return this.distanceToTopOfDescent() < 0;
  }

  distanceToTopOfDescent(): number | null {
    if (this.topOfDescent) {
      return this.topOfDescent.distanceFromStart - this.distanceFromStart;
    }

    return null;
  }

  isOnGeometricPath(): boolean {
    return this.distanceFromStart > this.geometricPathStart.distanceFromStart;
  }

  computeLinearDeviation(): Feet {
    const altitude = this.observer.get().altitude;
    const targetAltitude = this.currentTargetAltitude();

    return altitude - targetAltitude;
  }

  /**
   * Computes deviation from the next descending profile segment, extrapolating that segment back to the aircraft.
   * This is used to display V/DEV while FINAL is armed without treating an intervening level segment as capturable.
   */
  computeLinearDeviationToNextDescent(): Feet | null {
    const altitude = this.observer.get().altitude;
    const checkpoints = this.currentProfile?.checkpoints;
    if (altitude === null || !checkpoints) {
      return null;
    }

    for (let i = 0; i < checkpoints.length - 1; i++) {
      const start = checkpoints[i];
      const end = checkpoints[i + 1];
      const distance = end.distanceFromStart - start.distanceFromStart;

      if (end.distanceFromStart < this.distanceFromStart || distance <= 0 || end.altitude >= start.altitude) {
        continue;
      }

      const targetAltitude = MathUtils.lerp(
        this.distanceFromStart,
        start.distanceFromStart,
        end.distanceFromStart,
        start.altitude,
        end.altitude,
        false,
        false,
      );

      return altitude - targetAltitude;
    }

    return null;
  }

  /**
   * Gets guidance to the next descending segment at or after the IAF, extrapolated back to the aircraft.
   * @param maximumDistanceToStart Maximum along-track distance to the start of the segment.
   */
  getNextDescentSegmentGuidanceAtOrAfterIaf(
    maximumDistanceToStart: NauticalMiles,
  ): { vdev: Feet; pathAngle: Degrees; segmentStartDistanceFromStart: NauticalMiles } | null {
    const altitude = this.observer.get().altitude;
    const profile = this.currentProfile;
    if (altitude === null || !profile) {
      return null;
    }

    const iafDistanceFromStart = profile.totalFlightPlanDistance - profile.iafDistanceToEnd;
    for (let i = 0; i < profile.checkpoints.length - 1; i++) {
      const start = profile.checkpoints[i];
      const end = profile.checkpoints[i + 1];
      const distance = end.distanceFromStart - start.distanceFromStart;

      if (
        end.distanceFromStart < this.distanceFromStart ||
        end.distanceFromStart < iafDistanceFromStart ||
        distance <= 0 ||
        end.altitude >= start.altitude
      ) {
        continue;
      }

      if (start.distanceFromStart - this.distanceFromStart > maximumDistanceToStart) {
        return null;
      }

      const targetAltitude = MathUtils.lerp(
        this.distanceFromStart,
        start.distanceFromStart,
        end.distanceFromStart,
        start.altitude,
        end.altitude,
        false,
        false,
      );
      const pathAngle =
        MathUtils.RADIANS_TO_DEGREES * Math.atan((end.altitude - start.altitude) / distance / 6076.12);

      return {
        vdev: altitude - targetAltitude,
        pathAngle,
        segmentStartDistanceFromStart: start.distanceFromStart,
      };
    }

    return null;
  }

  currentTargetAltitude(): Feet {
    return this.currentProfile.interpolateAltitudeAtDistance(this.distanceFromStart);
  }

  currentTargetPathAngle(): Degrees {
    return this.currentProfile.interpolatePathAngleAtDistance(this.distanceFromStart);
  }

  currentTargetVerticalSpeed(): FeetPerMinute {
    const groundSpeed = SimVar.GetSimVarValue('GPS GROUND SPEED', 'Knots');

    const knotsToFeetPerMinute = 101.269;
    return knotsToFeetPerMinute * groundSpeed * Math.tan(this.currentTargetPathAngle() * MathUtils.DEGREES_TO_RADIANS);
  }

  isAboveSpeedLimitAltitude(): boolean {
    const { altitude, descentSpeedLimit } = this.observer.get();

    return altitude > descentSpeedLimit?.underAltitude;
  }

  isCloseToAirfieldElevation(): boolean {
    const { altitude, destinationElevation } = this.observer.get();

    return altitude < destinationElevation + 5000;
  }
}
