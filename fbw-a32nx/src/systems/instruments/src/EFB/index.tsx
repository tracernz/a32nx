// Copyright (c) 2023-2024 FlyByWire Simulations
// SPDX-License-Identifier: GPL-3.0

import React from 'react';

import { render } from '@instruments/common/index';
import { EfbWrapper, PerformanceCalculatorContext } from '@flybywiresim/flypad';
import { A320FailureDefinitions } from '@failures';
import { A320251NLandingCalculator } from '@shared/performance/a32nx_landing';
import { A320251NTakeoffPerformanceCalculator } from '@shared/performance/a32nx_takeoff';

// TODO: Move failure definition into VFS
render(
  <PerformanceCalculatorContext.Provider
    value={{ takeoff: new A320251NTakeoffPerformanceCalculator(), landing: new A320251NLandingCalculator() }}
  >
    <EfbWrapper failures={A320FailureDefinitions} />
  </PerformanceCalculatorContext.Provider>,
  true,
  true,
);
