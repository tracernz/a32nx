// Copyright (c) 2026 FlyByWire Simulations
// SPDX-License-Identifier: GPL-3.0

import { RequestedVerticalMode } from '../ControlLaws';

export interface VerticalGuidanceParameters {
  /** The desired vertical law. */
  requestedVerticalMode: RequestedVerticalMode;

  /** The target pressure altitude in feet. */
  targetPressureAltitude: number;

  /** The target vertical speed in feet per minute. */
  targetVerticalSpeed: number;
}

export enum DescentVerticalGuidanceState {
  InvalidProfile,
  ProvidingGuidance,
  Observing,
}
