// Copyright (c) 2021-2026 FlyByWire Simulations
// SPDX-License-Identifier: GPL-3.0

import { Arinc429Register, MathUtils } from '@flybywiresim/fbw-sdk';
import {
  ConsumerValue,
  DebounceTimer,
  EventBus,
  SimVarValueType,
  Subject,
  Subscribable,
  UnitType,
} from '@microsoft/msfs-sdk';
import { FmgcFlightPhase } from '../../../../../shared/src/flightphase';
import { NavigationEvents } from '../../../navigation/Navigation';
import { RequestedVerticalMode } from '../../ControlLaws';
import { AtmosphericConditions } from '../AtmosphericConditions';
import { NavGeometryProfile, VerticalCheckpointReason } from '../profile/NavGeometryProfile';
import { VerticalProfileComputationParametersObserver } from '../VerticalProfileComputationParameters';
import { DescentVerticalGuidanceState, VerticalGuidanceParameters } from '../VerticalGuidanceParameters';
import { AircraftToDescentProfileRelation } from './AircraftToProfileRelation';

const FINAL_CAPTURE_DEVIATION = 150;
const FINAL_PROFILE_CAPTURE_LOOKAHEAD = 1.5;
/** Nominal and maximum vertical acceleration for level-off capture, in feet per second squared. */
const FINAL_LEVEL_OFF_ACCELERATION_FEET_PER_SECOND_SQUARED = UnitType.FPS_PER_SEC.convertFrom(
  0.05,
  UnitType.G_ACCEL,
);
const FINAL_LEVEL_OFF_MAX_ACCELERATION_FEET_PER_SECOND_SQUARED = UnitType.FPS_PER_SEC.convertFrom(
  0.1,
  UnitType.G_ACCEL,
);
const FINAL_LEVEL_ALTITUDE_TOLERANCE = 1;
const FINAL_LEVEL_OFF_SLOPE_TOLERANCE = 1;

enum FinalGuidanceSource {
  None,
  DescentProfile,
  CodedFpa,
}

interface FinalGuidanceTarget {
  pressureAltitude: number;
  verticalSpeed: number;
  vdev: number;
}

interface ArmedDescentProfileGuidance {
  target: FinalGuidanceTarget;
  segmentStartDistanceFromStart: NauticalMiles;
}

interface DescentToLevelTransition {
  descentStartDistanceFromStart: NauticalMiles;
  levelStartDistanceFromStart: NauticalMiles;
  levelEndDistanceFromStart: NauticalMiles;
  levelAltitude: Feet;
  pathAngle: Degrees;
}

interface LevelOffCapture {
  startDistanceFromStart: NauticalMiles;
  endDistanceFromStart: NauticalMiles;
  startAltitude: Feet;
  levelAltitude: Feet;
  initialVerticalSpeedFeetPerMinute: FeetPerMinute;
  accelerationFeetPerSecondSquared: number;
  groundSpeedFeetPerSecond: number;
  durationSeconds: Seconds;
}

/** Computes FINAL APP guidance without updating normal DES guidance, managed speed, or PFD descent state. */
export class FinalDescentGuidance {
  private readonly aircraftToDescentProfileRelation: AircraftToDescentProfileRelation;

  /** Ground speed in knots, or null if invalid. */
  private readonly groundSpeed = ConsumerValue.create<number | null>(
    this.bus.getSubscriber<NavigationEvents>().on('fms_nav_ground_speed'),
    null,
  );

  /** RNP in nautical miles, or null if invalid. */
  private readonly rnp = ConsumerValue.create<number | null>(
    this.bus.getSubscriber<NavigationEvents>().on('fms_nav_rnp'),
    null,
  );

  /** Whether the FINAL mode can engage, for the FG. */
  private readonly _finalCanEngage = Subject.create(false);
  public readonly finalCanEngage: Subscribable<boolean> = this._finalCanEngage;

  /** Whether to allow FINAL/APP NAV arming, for the FG. */
  private readonly _finalAppSelected = Subject.create(false);
  public readonly finalAppSelected: Subscribable<boolean> = this._finalAppSelected;

  private readonly finalArmedDebounceTimer = new DebounceTimer();
  private readonly finalArmed = Subject.create(false);
  private finalArmedDebounced = false;
  private finalActive = false;

  private guidanceSource = FinalGuidanceSource.None;
  private targetPressureAltitude = 0;
  private targetVerticalSpeed = 0;
  private targetVdev: number | null = null;
  private isTargetValid = false;
  private capturedProfileSegmentStartDistance: NauticalMiles | null = null;
  private levelOffCapture: LevelOffCapture | null = null;

  // FIXME use the selected FMGC once the FMS instances are split.
  private readonly discreteWord1 = Arinc429Register.empty();
  private readonly discreteWord3 = Arinc429Register.empty();

  public constructor(
    private readonly bus: EventBus,
    private readonly observer: VerticalProfileComputationParametersObserver,
    private readonly atmosphericConditions: AtmosphericConditions,
  ) {
    this.aircraftToDescentProfileRelation = new AircraftToDescentProfileRelation(observer);

    this.finalArmed.sub((armed) => {
      if (armed) {
        this.finalArmedDebounceTimer.clear();
        this.finalArmedDebounced = true;
      } else {
        this.finalArmedDebounceTimer.schedule(this.resetFinalArmed, 500);
      }
    });
  }

  private resetFinalArmed = (): void => {
    this.finalArmedDebounced = false;
  };

  /** Updates the profile used only by FINAL APP, retaining an active capture across recomputation. */
  public updateProfile(profile: NavGeometryProfile): void {
    this.aircraftToDescentProfileRelation.updateProfile(profile);
    this.levelOffCapture = null;
    if (!this.finalActive) {
      this.resetCapturedGuidance();
    }
  }

  private isBasicFinalConditionMet(): boolean {
    const parameters = this.observer.get();
    const profile = this.aircraftToDescentProfileRelation.currentProfile;
    if (
      !profile ||
      parameters.altitude === null ||
      this.aircraftToDescentProfileRelation.currentDistanceToEnd <= 0 ||
      (!this.finalArmedDebounced && !this.finalActive) ||
      parameters.flightPhase !== FmgcFlightPhase.Approach
    ) {
      return false;
    }

    // FIXME get a better way, and consider invalid state
    const xtk = SimVar.GetSimVarValue('L:A32NX_FG_CROSS_TRACK_ERROR', SimVarValueType.NM);
    const rnp = this.rnp.get();
    const xtkOkay = rnp === null || Math.abs(xtk) <= rnp;

    const mda = parameters.approachBaroMinimum;
    const aboveMdaMinus50 = mda === null || (parameters.altitude !== null && parameters.altitude > mda - 50);

    // TODO ap engaged?

    return xtkOkay && aboveMdaMinus50;
  }

  /** Gets the vertical deviation from the coded final FPA in feet. +ve = above coded FPA. */
  private getCodedFpaVdev(): number | null {
    const profile = this.aircraftToDescentProfileRelation.currentProfile;
    const mapCheckpoint = profile?.findVerticalCheckpoint(VerticalCheckpointReason.Landing);
    if (!profile || !mapCheckpoint || this.aircraftToDescentProfileRelation.currentDistanceToEnd <= 0) {
      return null;
    }

    const dtg = this.aircraftToDescentProfileRelation.currentDistanceToEnd;
    const desiredAlt =
      UnitType.FOOT.convertFrom(Math.tan((-profile.finalDescentAngle * Math.PI) / 180), UnitType.NMILE) * dtg +
      mapCheckpoint.altitude;
    const actualAlt = this.observer.get().altitude;
    if (actualAlt === null) {
      return null;
    }

    const vdev = actualAlt - desiredAlt;

    return Number.isFinite(vdev) ? vdev : null;
  }

  private getCodedFpaGuidance(): FinalGuidanceTarget | null {
    const profile = this.aircraftToDescentProfileRelation.currentProfile;
    const vdev = this.getCodedFpaVdev();
    const pressureAltitude = this.atmosphericConditions.currentPressureAltitude;
    const groundSpeed = this.groundSpeed.get();

    if (!profile || vdev === null || groundSpeed === null) {
      return null;
    }

    const target: FinalGuidanceTarget = {
      pressureAltitude: pressureAltitude - vdev,
      verticalSpeed: UnitType.FPM.convertFrom(
        Math.tan((profile.finalDescentAngle * Math.PI) / 180) * groundSpeed,
        UnitType.KNOT,
      ),
      vdev,
    };

    return this.isGuidanceTargetValid(target) ? target : null;
  }

  private getDescentProfileGuidance(): FinalGuidanceTarget | null {
    if (
      this.observer.get().altitude === null ||
      !this.aircraftToDescentProfileRelation.isValid ||
      this.aircraftToDescentProfileRelation.currentDistanceToEnd <= 0
    ) {
      return null;
    }

    const pressureAltitude = this.atmosphericConditions.currentPressureAltitude;
    const groundSpeed = this.groundSpeed.get();
    if (groundSpeed === null) {
      return null;
    }

    const levelOffGuidance = this.getLevelOffGuidance(groundSpeed);
    if (levelOffGuidance !== null) {
      return this.isGuidanceTargetValid(levelOffGuidance) ? levelOffGuidance : null;
    }

    const vdev = this.aircraftToDescentProfileRelation.computeLinearDeviation();
    const pathAngle = this.aircraftToDescentProfileRelation.currentTargetPathAngle();

    const target: FinalGuidanceTarget = {
      pressureAltitude: pressureAltitude - vdev,
      verticalSpeed: UnitType.FPM.convertFrom(
        Math.tan(pathAngle * MathUtils.DEGREES_TO_RADIANS) * groundSpeed,
        UnitType.KNOT,
      ),
      vdev,
    };

    return this.isGuidanceTargetValid(target) ? target : null;
  }

  private getLevelOffGuidance(groundSpeed: Knots): FinalGuidanceTarget | null {
    const actualAltitude = this.observer.get().altitude;
    if (actualAltitude === null || !Number.isFinite(groundSpeed) || groundSpeed <= 0) {
      this.levelOffCapture = null;
      return null;
    }

    const distanceFromStart = this.aircraftToDescentProfileRelation.distanceFromStart;
    if (this.levelOffCapture !== null && distanceFromStart > this.levelOffCapture.endDistanceFromStart) {
      this.levelOffCapture = null;
    }

    if (this.levelOffCapture === null) {
      const transition = this.findDescentToLevelTransition();
      if (transition === null) {
        return null;
      }

      const capture = this.createLevelOffCapture(transition, groundSpeed);
      if (
        capture === null ||
        distanceFromStart < capture.startDistanceFromStart ||
        distanceFromStart > capture.endDistanceFromStart
      ) {
        return null;
      }

      this.levelOffCapture = capture;
    }

    const capture = this.levelOffCapture;
    const distanceThroughCapture = MathUtils.clamp(
      distanceFromStart - capture.startDistanceFromStart,
      0,
      capture.endDistanceFromStart - capture.startDistanceFromStart,
    );
    const elapsed = Math.min(
      capture.durationSeconds,
      UnitType.FOOT.convertFrom(distanceThroughCapture, UnitType.NMILE) / capture.groundSpeedFeetPerSecond,
    );
    const initialVerticalSpeedFeetPerSecond = UnitType.FPS.convertFrom(
      capture.initialVerticalSpeedFeetPerMinute,
      UnitType.FPM,
    );
    const unclampedTargetAltitude =
      capture.startAltitude +
      initialVerticalSpeedFeetPerSecond * elapsed +
      0.5 * capture.accelerationFeetPerSecondSquared * elapsed * elapsed;
    const isAtLevelAltitude = unclampedTargetAltitude <= capture.levelAltitude;
    const targetAltitude = Math.max(capture.levelAltitude, unclampedTargetAltitude);
    const targetVerticalSpeed = isAtLevelAltitude
      ? 0
      : Math.min(
          0,
          UnitType.FPM.convertFrom(
            initialVerticalSpeedFeetPerSecond + capture.accelerationFeetPerSecondSquared * elapsed,
            UnitType.FPS,
          ),
        );
    const vdev = actualAltitude - targetAltitude;

    return {
      pressureAltitude: this.atmosphericConditions.currentPressureAltitude - vdev,
      verticalSpeed: targetVerticalSpeed,
      vdev,
    };
  }

  private findDescentToLevelTransition(): DescentToLevelTransition | null {
    const profile = this.aircraftToDescentProfileRelation.currentProfile;
    if (!profile) {
      return null;
    }

    const checkpoints = profile.checkpoints;
    const distanceFromStart = this.aircraftToDescentProfileRelation.distanceFromStart;
    for (let descentIndex = 0; descentIndex < checkpoints.length - 1; descentIndex++) {
      const descentStart = checkpoints[descentIndex];
      const descentEnd = checkpoints[descentIndex + 1];
      const descentDistance = descentEnd.distanceFromStart - descentStart.distanceFromStart;
      const descentAltitude = descentEnd.altitude - descentStart.altitude;
      if (descentDistance <= 0 || descentAltitude >= -FINAL_LEVEL_ALTITUDE_TOLERANCE) {
        continue;
      }

      let levelIndex = descentIndex + 1;
      let hasDiscontinuousAltitude = false;
      while (
        levelIndex < checkpoints.length - 1 &&
        checkpoints[levelIndex + 1].distanceFromStart - checkpoints[levelIndex].distanceFromStart <= 0
      ) {
        if (
          Math.abs(checkpoints[levelIndex + 1].altitude - checkpoints[levelIndex].altitude) >
          FINAL_LEVEL_ALTITUDE_TOLERANCE
        ) {
          hasDiscontinuousAltitude = true;
          break;
        }
        levelIndex++;
      }
      if (hasDiscontinuousAltitude || levelIndex >= checkpoints.length - 1) {
        continue;
      }

      const levelStart = checkpoints[levelIndex];
      const levelEnd = checkpoints[levelIndex + 1];
      if (
        Math.abs(levelStart.altitude - descentEnd.altitude) > FINAL_LEVEL_ALTITUDE_TOLERANCE ||
        Math.abs(levelEnd.altitude - levelStart.altitude) > FINAL_LEVEL_ALTITUDE_TOLERANCE
      ) {
        continue;
      }

      const descentSlope = descentAltitude / descentDistance;
      let descentRunStartDistance = descentStart.distanceFromStart;
      for (let previousIndex = descentIndex - 1; previousIndex >= 0; previousIndex--) {
        const previousStart = checkpoints[previousIndex];
        const previousEnd = checkpoints[previousIndex + 1];
        const previousDistance = previousEnd.distanceFromStart - previousStart.distanceFromStart;
        if (previousDistance <= 0) {
          if (Math.abs(previousEnd.altitude - previousStart.altitude) > FINAL_LEVEL_ALTITUDE_TOLERANCE) {
            break;
          }
          continue;
        }

        const previousSlope = (previousEnd.altitude - previousStart.altitude) / previousDistance;
        if (
          previousSlope >= 0 ||
          Math.abs(previousSlope - descentSlope) > FINAL_LEVEL_OFF_SLOPE_TOLERANCE
        ) {
          break;
        }

        descentRunStartDistance = previousStart.distanceFromStart;
      }

      let levelRunEndDistance = levelEnd.distanceFromStart;
      for (let nextIndex = levelIndex + 1; nextIndex < checkpoints.length - 1; nextIndex++) {
        const nextStart = checkpoints[nextIndex];
        const nextEnd = checkpoints[nextIndex + 1];
        const nextDistance = nextEnd.distanceFromStart - nextStart.distanceFromStart;
        if (nextDistance <= 0) {
          if (Math.abs(nextEnd.altitude - nextStart.altitude) > FINAL_LEVEL_ALTITUDE_TOLERANCE) {
            break;
          }
          continue;
        }
        if (
          Math.abs(nextStart.altitude - levelStart.altitude) > FINAL_LEVEL_ALTITUDE_TOLERANCE ||
          Math.abs(nextEnd.altitude - levelStart.altitude) > FINAL_LEVEL_ALTITUDE_TOLERANCE
        ) {
          break;
        }

        levelRunEndDistance = nextEnd.distanceFromStart;
      }

      if (distanceFromStart < descentRunStartDistance || distanceFromStart > levelRunEndDistance) {
        continue;
      }

      return {
        descentStartDistanceFromStart: descentRunStartDistance,
        levelStartDistanceFromStart: levelStart.distanceFromStart,
        levelEndDistanceFromStart: levelRunEndDistance,
        levelAltitude: levelStart.altitude,
        pathAngle: UnitType.DEGREE.convertFrom(
          Math.atan(UnitType.NMILE.convertFrom(descentSlope, UnitType.FOOT)),
          UnitType.RADIAN,
        ),
      };
    }

    return null;
  }

  private createLevelOffCapture(transition: DescentToLevelTransition, groundSpeed: Knots): LevelOffCapture | null {
    const groundSpeedFeetPerSecond = UnitType.FPS.convertFrom(groundSpeed, UnitType.KNOT);
    const initialVerticalSpeed = UnitType.FPM.convertFrom(
      Math.tan(UnitType.RADIAN.convertFrom(transition.pathAngle, UnitType.DEGREE)) * groundSpeed,
      UnitType.KNOT,
    );
    const initialVerticalSpeedFeetPerSecond = UnitType.FPS.convertFrom(initialVerticalSpeed, UnitType.FPM);
    // Start the capture early enough to avoid crossing the level altitude. A short level segment must not prevent the
    // capture from starting; if the next descent begins before the capture is complete, guidance resumes on that leg.
    const availableDescentDistanceNauticalMiles =
      transition.levelStartDistanceFromStart - transition.descentStartDistanceFromStart;
    if (initialVerticalSpeedFeetPerSecond >= 0 || availableDescentDistanceNauticalMiles <= 0) {
      return null;
    }

    const requiredAccelerationFeetPerSecondSquared =
      (groundSpeedFeetPerSecond * Math.abs(initialVerticalSpeedFeetPerSecond)) /
      (2 * UnitType.FOOT.convertFrom(availableDescentDistanceNauticalMiles, UnitType.NMILE));
    const accelerationFeetPerSecondSquared = Math.min(
      FINAL_LEVEL_OFF_MAX_ACCELERATION_FEET_PER_SECOND_SQUARED,
      Math.max(
        FINAL_LEVEL_OFF_ACCELERATION_FEET_PER_SECOND_SQUARED,
        requiredAccelerationFeetPerSecondSquared,
      ),
    );

    const durationSeconds = Math.abs(initialVerticalSpeedFeetPerSecond) / accelerationFeetPerSecondSquared;
    const idealDistanceToStartNauticalMiles = UnitType.NMILE.convertFrom(
      (groundSpeedFeetPerSecond * durationSeconds) / 2,
      UnitType.FOOT,
    );
    const startDistanceFromStart = Math.max(
      transition.levelStartDistanceFromStart - idealDistanceToStartNauticalMiles,
      transition.descentStartDistanceFromStart,
    );
    const timeFromStartToLevelSeconds =
      UnitType.FOOT.convertFrom(transition.levelStartDistanceFromStart - startDistanceFromStart, UnitType.NMILE) /
      groundSpeedFeetPerSecond;
    const startAltitude =
      transition.levelAltitude - initialVerticalSpeedFeetPerSecond * timeFromStartToLevelSeconds;
    const naturalCaptureDistanceNauticalMiles = UnitType.NMILE.convertFrom(
      groundSpeedFeetPerSecond * durationSeconds,
      UnitType.FOOT,
    );

    return {
      startDistanceFromStart,
      endDistanceFromStart: Math.min(
        startDistanceFromStart + naturalCaptureDistanceNauticalMiles,
        transition.levelEndDistanceFromStart,
      ),
      startAltitude,
      levelAltitude: transition.levelAltitude,
      initialVerticalSpeedFeetPerMinute: initialVerticalSpeed,
      accelerationFeetPerSecondSquared,
      groundSpeedFeetPerSecond,
      durationSeconds,
    };
  }

  private getArmedDescentProfileGuidance(): ArmedDescentProfileGuidance | null {
    if (
      !this.aircraftToDescentProfileRelation.isValid ||
      this.aircraftToDescentProfileRelation.currentDistanceToEnd <= 0
    ) {
      return null;
    }

    const segmentGuidance = this.aircraftToDescentProfileRelation.getNextDescentSegmentGuidanceAtOrAfterIaf(
      FINAL_PROFILE_CAPTURE_LOOKAHEAD,
    );
    const pressureAltitude = this.atmosphericConditions.currentPressureAltitude;
    const groundSpeed = this.groundSpeed.get();
    if (segmentGuidance === null || groundSpeed === null) {
      return null;
    }

    const target: FinalGuidanceTarget = {
      pressureAltitude: pressureAltitude - segmentGuidance.vdev,
      verticalSpeed: UnitType.FPM.convertFrom(
        Math.tan(segmentGuidance.pathAngle * MathUtils.DEGREES_TO_RADIANS) * groundSpeed,
        UnitType.KNOT,
      ),
      vdev: segmentGuidance.vdev,
    };

    return this.isGuidanceTargetValid(target)
      ? {
          target,
          segmentStartDistanceFromStart: segmentGuidance.segmentStartDistanceFromStart,
        }
      : null;
  }

  private isGuidanceTargetValid(target: FinalGuidanceTarget): boolean {
    return (
      Number.isFinite(target.pressureAltitude) && Number.isFinite(target.verticalSpeed) && Number.isFinite(target.vdev)
    );
  }

  private canCapture(target: FinalGuidanceTarget | null): target is FinalGuidanceTarget {
    return target !== null && Math.abs(target.vdev) < FINAL_CAPTURE_DEVIATION;
  }

  private canCaptureDescentProfile(target: FinalGuidanceTarget | null): target is FinalGuidanceTarget {
    // An active FINAL must be able to reacquire the recomputed profile; the descent-only restriction applies to
    // initial capture while armed.
    if (this.finalActive) {
      return target !== null;
    }

    return this.canCapture(target) && this.finalArmed.get();
  }

  private applyGuidance(target: FinalGuidanceTarget): void {
    this.targetPressureAltitude = target.pressureAltitude;
    this.targetVerticalSpeed = target.verticalSpeed;
    this.targetVdev = target.vdev;
    this.isTargetValid = true;
    this._finalCanEngage.set(true);
  }

  private updateCapturedGuidance(): void {
    const codedFpaGuidance = this.getCodedFpaGuidance();

    // The coded final slope has priority and may replace a previously captured descent profile.
    if (this.guidanceSource !== FinalGuidanceSource.CodedFpa && this.canCapture(codedFpaGuidance)) {
      this.guidanceSource = FinalGuidanceSource.CodedFpa;
      this.capturedProfileSegmentStartDistance = null;
      this.levelOffCapture = null;
    }

    if (this.guidanceSource === FinalGuidanceSource.CodedFpa) {
      if (codedFpaGuidance !== null) {
        this.applyGuidance(codedFpaGuidance);
        return;
      }

      this.guidanceSource = FinalGuidanceSource.None;
    }

    const isBeforeCapturedProfileSegment =
      this.capturedProfileSegmentStartDistance !== null &&
      this.aircraftToDescentProfileRelation.distanceFromStart <= this.capturedProfileSegmentStartDistance;
    const armedDescentProfileGuidance =
      !this.finalActive || isBeforeCapturedProfileSegment ? this.getArmedDescentProfileGuidance() : null;
    const descentProfileGuidance =
      armedDescentProfileGuidance?.target ?? (this.finalActive ? this.getDescentProfileGuidance() : null);
    if (this.guidanceSource === FinalGuidanceSource.None && this.canCaptureDescentProfile(descentProfileGuidance)) {
      this.guidanceSource = FinalGuidanceSource.DescentProfile;
      this.capturedProfileSegmentStartDistance =
        armedDescentProfileGuidance?.segmentStartDistanceFromStart ?? null;
    }

    if (this.guidanceSource === FinalGuidanceSource.DescentProfile && descentProfileGuidance !== null) {
      if (armedDescentProfileGuidance !== null) {
        this.capturedProfileSegmentStartDistance = armedDescentProfileGuidance.segmentStartDistanceFromStart;
      }
      this.applyGuidance(descentProfileGuidance);
      return;
    }

    this.guidanceSource = FinalGuidanceSource.None;
    this.levelOffCapture = null;
    this.outputInvalidGuidance();
  }

  public getState(): DescentVerticalGuidanceState {
    if (this.finalActive) {
      return DescentVerticalGuidanceState.ProvidingGuidance;
    }
    if (this._finalAppSelected.get() && this.finalArmedDebounced) {
      return DescentVerticalGuidanceState.Observing;
    }
    return DescentVerticalGuidanceState.InvalidProfile;
  }

  /** Updates FINAL APP state without updating any normal DES guidance state. */
  public update(distanceToEnd: number): void {
    try {
      const parameters = this.observer.get();
      const finalAppArmingAllowed =
        parameters.isFinalAppSelected === true && parameters.flightPhase === FmgcFlightPhase.Approach;
      this._finalAppSelected.set(finalAppArmingAllowed);

      // FIXME use the selected FMGC once the FMS instances are split.
      const discrete1 = this.discreteWord1.setFromSimVar('L:A32NX_FMGC_1_DISCRETE_WORD_1');
      const discrete3 = this.discreteWord3.setFromSimVar('L:A32NX_FMGC_1_DISCRETE_WORD_3');
      this.finalArmed.set(discrete3.bitValueOr(23, false));
      this.finalActive = discrete1.bitValueOr(23, false);

      this.aircraftToDescentProfileRelation.update(distanceToEnd);

      if (!finalAppArmingAllowed || !this.isBasicFinalConditionMet()) {
        this.resetCapturedGuidance();
        return;
      }

      this.updateCapturedGuidance();
    } catch (e) {
      console.error('[FMS] Failed to calculate final descent!', e, (e as Error).stack);
      this._finalAppSelected.set(false);
      this.resetCapturedGuidance();
    }
  }

  public reset(): void {
    this.finalArmedDebounceTimer.clear();
    this.finalArmed.set(false);
    this.finalArmedDebounced = false;
    this.finalActive = false;
    this._finalAppSelected.set(false);
    this.aircraftToDescentProfileRelation.reset();
    this.resetCapturedGuidance();
  }

  private resetCapturedGuidance(): void {
    this.guidanceSource = FinalGuidanceSource.None;
    this.capturedProfileSegmentStartDistance = null;
    this.levelOffCapture = null;
    this.outputInvalidGuidance();
  }

  private outputInvalidGuidance(): void {
    this._finalCanEngage.set(false);
    this.targetPressureAltitude = 0;
    this.targetVerticalSpeed = 0;
    this.targetVdev = null;
    this.isTargetValid = false;
  }

  public getGuidanceParameters(out: VerticalGuidanceParameters): boolean {
    if ((!this.finalArmedDebounced && !this.finalActive) || !this.isTargetValid) {
      return false;
    }

    out.requestedVerticalMode = RequestedVerticalMode.VpathSpeed;
    out.targetPressureAltitude = this.targetPressureAltitude;
    out.targetVerticalSpeed = this.targetVerticalSpeed;

    return true;
  }

  public isArmedOrActive(): boolean {
    return this._finalAppSelected.get() && (this.finalArmedDebounced || this.finalActive);
  }

  public getVDev(): number | null {
    if (this.observer.get().altitude === null) {
      return null;
    }

    let vdev: number | null;
    if (this.guidanceSource !== FinalGuidanceSource.None) {
      vdev = this.targetVdev;
    } else if (this.finalActive) {
      vdev = this.aircraftToDescentProfileRelation.isValid
        ? this.aircraftToDescentProfileRelation.computeLinearDeviation()
        : this.getCodedFpaVdev();
    } else {
      vdev = this.aircraftToDescentProfileRelation.computeLinearDeviationToNextDescent() ?? this.getCodedFpaVdev();
    }

    return vdev === null ? null : MathUtils.lerp(vdev, -200, 200, -1, 1, true, true);
  }
}
