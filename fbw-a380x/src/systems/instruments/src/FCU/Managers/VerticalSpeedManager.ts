// Copyright (c) 2023-2024 FlyByWire Simulations
// SPDX-License-Identifier: GPL-3.0

import { EventBus, Instrument } from '@microsoft/msfs-sdk';
import { TemporaryHax } from './TemporaryHax';

enum A320_Neo_FCU_VSpeed_State {
  Idle = 0,
  Zeroing = 1,
  Selecting = 2,
  Flying = 3,
}

export class VerticalSpeedManager extends TemporaryHax implements Instrument {
  constructor(private readonly bus: EventBus) {
    super(bus, document.getElementById('VerticalSpeed')!);
    this.forceUpdate = true;
    this.ABS_MINMAX_FPA = 9.9;
    this.ABS_MINMAX_VS = 6000;
    this.backToIdleTimeout = 45000;
    this.previousVerticalMode = 0;
    this.init();
    this.onUpdate();
  }

  get currentState() {
    return this._currentState;
  }

  set currentState(v) {
    this._currentState = v;
    SimVar.SetSimVarValue('L:A320_NE0_FCU_STATE', 'number', this.currentState);
  }

  init() {
    this.textVS = this.getTextElement('VS');
    this.textFPA = this.getTextElement('FPA');
    this.isActive = false;
    this.isFPAMode = false;
    this._enterIdleState();
    this.selectedVs = 0;
    this.selectedFpa = 0;
    this.refresh(false, false, 0, 0, true);
  }

  onPush() {
    const mode = SimVar.GetSimVarValue('L:A32NX_FMA_VERTICAL_MODE', 'Number');
    if (mode >= 32 && mode <= 34) {
      return;
    }
    clearTimeout(this._resetSelectionTimeout);
    this.forceUpdate = true;

    this.currentState = A320_Neo_FCU_VSpeed_State.Zeroing;

    this.selectedVs = 0;
    this.selectedFpa = 0;

    SimVar.SetSimVarValue('K:A32NX.FCU_TO_AP_VS_PUSH', 'number', 0);
  }

  onRotate() {
    if (this.currentState === A320_Neo_FCU_VSpeed_State.Idle || this.currentState === A320_Neo_FCU_VSpeed_State.Selecting) {
      clearTimeout(this._resetSelectionTimeout);
      this.forceUpdate = true;

      if (this.currentState === A320_Neo_FCU_VSpeed_State.Idle) {
        this.selectedVs = this.getCurrentVerticalSpeed();
        this.selectedFpa = this.getCurrentFlightPathAngle();
      }

      this.currentState = A320_Neo_FCU_VSpeed_State.Selecting;

      this._resetSelectionTimeout = setTimeout(() => {
        this.selectedVs = 0;
        this.selectedFpa = 0;
        this.currentState = A320_Neo_FCU_VSpeed_State.Idle;
        this.forceUpdate = true;
      }, this.backToIdleTimeout);
    } else if (this.currentState === A320_Neo_FCU_VSpeed_State.Zeroing) {
      this.currentState = A320_Neo_FCU_VSpeed_State.Flying;
      this.forceUpdate = true;
    }
  }

  onPull() {
    clearTimeout(this._resetSelectionTimeout);
    this.forceUpdate = true;

    if (this.currentState === A320_Neo_FCU_VSpeed_State.Idle) {
      if (this.isFPAMode) {
        this.selectedFpa = this.getCurrentFlightPathAngle();
      } else {
        this.selectedVs = this.getCurrentVerticalSpeed();
      }
    }

    SimVar.SetSimVarValue('K:A32NX.FCU_TO_AP_VS_PULL', 'number', 0);
  }

  getCurrentFlightPathAngle() {
    return this.calculateAngleForVerticalSpeed(Simplane.getVerticalSpeed());
  }

  getCurrentVerticalSpeed() {
    return Utils.Clamp(Math.round(Simplane.getVerticalSpeed() / 100) * 100, -this.ABS_MINMAX_VS, this.ABS_MINMAX_VS);
  }

  _enterIdleState(idleVSpeed) {
    this.selectedVs = 0;
    this.selectedFpa = 0;
    this.currentState = A320_Neo_FCU_VSpeed_State.Idle;
    this.forceUpdate = true;
  }

  onUpdate() {
    const lightsTest = SimVar.GetSimVarValue('L:A32NX_OVHD_INTLT_ANN', 'number') == 0;
    const isFPAMode = SimVar.GetSimVarValue('L:A32NX_TRK_FPA_MODE_ACTIVE', 'Bool');
    const verticalMode = SimVar.GetSimVarValue('L:A32NX_FMA_VERTICAL_MODE', 'Number');

    if ((this.previousVerticalMode != verticalMode)
      && (verticalMode !== 14 && verticalMode !== 15)) {
      clearTimeout(this._resetSelectionTimeout);
      this._enterIdleState();
    }

    if (this.currentState !== A320_Neo_FCU_VSpeed_State.Flying
      && this.currentState !== A320_Neo_FCU_VSpeed_State.Zeroing
      && (verticalMode === 14 || verticalMode === 15)) {
        clearTimeout(this._resetSelectionTimeout);
        this.forceUpdate = true;
        const isModeReversion = SimVar.GetSimVarValue('L:A32NX_FCU_MODE_REVERSION_ACTIVE', 'Number');
        const modeReversionTargetFpm = SimVar.GetSimVarValue('L:A32NX_FCU_MODE_REVERSION_TARGET_FPM', 'Number');
        if (isFPAMode) {
          if (isModeReversion === 1) {
            this.currentState = A320_Neo_FCU_VSpeed_State.Flying;
            const modeReversionTargetFpa = this.calculateAngleForVerticalSpeed(modeReversionTargetFpm);
            this.selectedFpa = Utils.Clamp(Math.round(modeReversionTargetFpa * 10) / 10, -this.ABS_MINMAX_FPA, this.ABS_MINMAX_FPA);
          } else if (this.selectedFpa !== 0) {
            this.currentState = A320_Neo_FCU_VSpeed_State.Flying;
          } else {
            this.currentState = A320_Neo_FCU_VSpeed_State.Zeroing;
          }
        } else if (isModeReversion === 1) {
          this.currentState = A320_Neo_FCU_VSpeed_State.Flying;
          this.selectedVs = Utils.Clamp(Math.round(modeReversionTargetFpm / 100) * 100, -this.ABS_MINMAX_VS, this.ABS_MINMAX_VS);
        } else if (this.currentVs !== 0) {
          this.currentState = A320_Neo_FCU_VSpeed_State.Flying;
        } else {
          this.currentState = A320_Neo_FCU_VSpeed_State.Zeroing;
        }
      }

      if (isFPAMode) {
        this.refresh(true, true, this.selectedFpa, lightsTest, this.forceUpdate);
      } else {
        this.refresh(true, false, this.selectedVs, lightsTest, this.forceUpdate);
      }

      this.forceUpdate = false;
      this.previousVerticalMode = verticalMode;
    }

    refresh(_isActive, _isFPAMode, _value, _lightsTest, _force = false) {
      if ((_isActive != this.isActive) || (_isFPAMode != this.isFPAMode) || (_value != this.currentValue) || (_lightsTest !== this.lightsTest) || _force) {
        if (this.isFPAMode != _isFPAMode) {
          this.onFPAModeChanged(_isFPAMode);
        }
        if (this.currentValue !== _value) {
          if (_isFPAMode) {
            SimVar.SetSimVarValue('L:A32NX_AUTOPILOT_FPA_SELECTED', 'Degree', this.selectedFpa);
            SimVar.SetSimVarValue('L:A32NX_AUTOPILOT_VS_SELECTED', 'feet per minute', 0);
          } else {
            SimVar.SetSimVarValue('L:A32NX_AUTOPILOT_FPA_SELECTED', 'Degree', 0);
            SimVar.SetSimVarValue('L:A32NX_AUTOPILOT_VS_SELECTED', 'feet per minute', this.selectedVs);
          }
        }
        this.isActive = _isActive;
        this.isFPAMode = _isFPAMode;
        this.currentValue = _value;
        this.lightsTest = _lightsTest;
        if (this.lightsTest) {
          this.setTextElementActive(this.textVS, true);
          this.setTextElementActive(this.textFPA, true);
          this.textValueContent = '+8.888';
          return;
        }
        this.setTextElementActive(this.textVS, !this.isFPAMode);
        this.setTextElementActive(this.textFPA, this.isFPAMode);
        if (this.isActive && this.currentState != A320_Neo_FCU_VSpeed_State.Idle) {
          const sign = (this.currentValue < 0) ? '-' : '+';
          if (this.isFPAMode) {
            let value = Math.abs(this.currentValue);
            value = Math.round(value * 10).toString().padStart(2, '0');
            value = `${value.substring(0, 1)}.${value.substring(1)}`;
            this.textValueContent = sign + value;
          } else if (this.currentState === A320_Neo_FCU_VSpeed_State.Zeroing) {
            this.textValueContent = ('~00oo');
          } else {
            let value = Math.floor(this.currentValue);
            value = Math.abs(value);
            this.textValueContent = `${sign + (Math.floor(value * 0.01).toString().padStart(2, '0'))}oo`;
          }
          SimVar.SetSimVarValue('L:A32NX_FCU_VS_MANAGED', 'boolean', false);
        } else {
          this.textValueContent = '~----';
          SimVar.SetSimVarValue('L:A32NX_FCU_VS_MANAGED', 'boolean', true);
        }
      }
    }

    onEvent(_event) {
      if (_event === 'VS_INC_VS') {
        this.selectedVs = Utils.Clamp(Math.round(this.selectedVs + 100), -this.ABS_MINMAX_VS, this.ABS_MINMAX_VS);
        this.onRotate();
      } else if (_event === 'VS_DEC_VS') {
        this.selectedVs = Utils.Clamp(Math.round(this.selectedVs - 100), -this.ABS_MINMAX_VS, this.ABS_MINMAX_VS);
        this.onRotate();
      } else if (_event === 'VS_INC_FPA') {
        this.selectedFpa = Utils.Clamp(Math.round((this.selectedFpa + 0.1) * 10) / 10, -this.ABS_MINMAX_FPA, this.ABS_MINMAX_FPA);
        this.onRotate();
      } else if (_event === 'VS_DEC_FPA') {
        this.selectedFpa = Utils.Clamp(Math.round((this.selectedFpa - 0.1) * 10) / 10, -this.ABS_MINMAX_FPA, this.ABS_MINMAX_FPA);
        this.onRotate();
      } else if (_event === 'VS_PUSH') {
        this.onPush();
      } else if (_event === 'VS_PULL') {
        this.onPull();
      } else if (_event === 'VS_SET') {
        const value = SimVar.GetSimVarValue('L:A320_Neo_FCU_VS_SET_DATA', 'number');
        if (this.isFPAMode) {
          if (Math.abs(value) < 100 || value == 0) {
            this.selectedFpa = Utils.Clamp(Math.round(value) / 10, -this.ABS_MINMAX_FPA, this.ABS_MINMAX_FPA);
            this.currentState = A320_Neo_FCU_VSpeed_State.Selecting;
            this.onRotate();
          }
        } else if (Math.abs(value) >= 100 || value == 0) {
          this.selectedVs = Utils.Clamp(Math.round(value), -this.ABS_MINMAX_VS, this.ABS_MINMAX_VS);
          this.currentState = A320_Neo_FCU_VSpeed_State.Selecting;
          this.onRotate();
        }
      }
    }

    onFPAModeChanged(_newValue) {
      if (_newValue) {
        this.selectedFpa = this.calculateAngleForVerticalSpeed(this.selectedVs);
      } else {
        this.selectedVs = this.calculateVerticalSpeedForAngle(this.selectedFpa);
      }
    }

    /**
    * Calculates the vertical speed needed to fly a flight path angle at the current ground speed.
    * @param {number} _angle The flight path angle in degrees.
    * @returns {number} The corresponding vertical speed in feet per minute.
    */
    calculateVerticalSpeedForAngle(_angle) {
      if (_angle == 0) {
        return 0;
      }
      const _groundSpeed = SimVar.GetSimVarValue('GPS GROUND SPEED', 'Meters per second');
      const groundSpeed = _groundSpeed * 3.28084 * 60; // Now in feet per minute.
      const angle = _angle * Math.PI / 180; // Now in radians.
      const verticalSpeed = Math.tan(angle) * groundSpeed;
      return Utils.Clamp(Math.round(verticalSpeed / 100) * 100, -this.ABS_MINMAX_VS, this.ABS_MINMAX_VS);
    }

    /**
    * Calculates the flight path angle for a given vertical speed, assuming it is flown at the current ground speed.
    * @param {number} verticalSpeed The flight path angle in feet per minute.
    * @returns {number} The corresponding flight path angle in degrees.
    */
    calculateAngleForVerticalSpeed(verticalSpeed) {
      if (Math.abs(verticalSpeed) < 10) {
        return 0;
      }
      const _groundSpeed = SimVar.GetSimVarValue('GPS GROUND SPEED', 'Meters per second');
      const groundSpeed = _groundSpeed * 3.28084 * 60; // Now in feet per minute.
      const angle = Math.atan(verticalSpeed / groundSpeed);
      const _angle = angle * 180 / Math.PI;
      return Utils.Clamp(Math.round(_angle * 10) / 10, -this.ABS_MINMAX_FPA, this.ABS_MINMAX_FPA);
    }
  }
