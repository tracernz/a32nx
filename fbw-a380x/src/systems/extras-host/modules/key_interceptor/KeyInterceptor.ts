// Copyright (c) 2022 FlyByWire Simulations
// SPDX-License-Identifier: GPL-3.0

import { EventBus, KeyEvents, KeyEventManager, KeyEventData } from '@microsoft/msfs-sdk';
import { NotificationManager, NotificationType, PopUpDialog } from '@flybywiresim/fbw-sdk';
import { AircraftPresetsList } from '../common/AircraftPresetsList';

/**
 * This class is used to intercept the key events for the engine auto start and engine auto shutdown.
 *
 * Additional key events can be added in the registerIntercepts() method.
 */
export class KeyInterceptor {
  private readonly keys: Record<string, { handler: (data: KeyEventData) => void; passThrough?: true; log?: true }> = {
    ENGINE_AUTO_START: { handler: this.engineAutoStartAction.bind(this), log: true },
    ENGINE_AUTO_SHUTDOWN: { handler: this.engineAutoStopAction.bind(this), log: true },
  };

  private eventBus: EventBus;

  private keyInterceptManager: KeyEventManager;

  private dialogVisible = false;

  constructor(
    private readonly bus: EventBus,
    private readonly notification: NotificationManager,
  ) {
    this.eventBus = bus;
    KeyEventManager.getManager(this.eventBus).then((manager) => {
      this.keyInterceptManager = manager;
      this.registerIntercepts();
    });
    console.log('KeyInterceptor: Created');
  }

  public startPublish(): void {
    console.log('KeyInterceptor: startPublish()');
  }

  private registerIntercepts() {
    for (const [key, config] of Object.entries(this.keys)) {
      this.keyInterceptManager.interceptKey(key, !!config.passThrough);
    }

    const subscriber = this.eventBus.getSubscriber<KeyEvents>();
    subscriber.on('key_intercept').handle(this.onKeyIntercepted.bind(this));
  }

  private onKeyIntercepted(data: KeyEventData): void {
    const config = this.keys[data.key];
    if (!config) {
      return;
    }

    if (config.log) {
      console.log(`KeyInterceptor: ${data.key}`);
    }

    config.handler(data);
  }

  private engineAutoStartAction() {
    if (!this.dialogVisible) {
      // If loading already in progress show a notification and return
      if (this.isAlreadyLoading()) return;
      // Show a dialog to ask user to load a preset or cancel
      this.dialogVisible = true;
      const dialog = new PopUpDialog();
      const presetID = 4; // "Ready for Taxi"
      dialog.showPopUp(
        'Ctrl+E Not supported',
        `<div style="font-size: 120%; text-align: left;">
                           Engine Auto Start is not supported by the A380X.<br/>
                           <br/>
                           Do you want to you use the flyPad's Aircraft Presets to set the aircraft to
                           <strong>"${AircraftPresetsList.getPresetName(presetID)}"</strong>?
                         </div>`,
        'small',
        () => this.loadPreset(presetID),
        () => (this.dialogVisible = false),
      );
    }
  }

  private engineAutoStopAction() {
    if (this.isAlreadyLoading()) return;
    // If engines are running show a dialog to ask user to load a preset or cancel
    if (!this.dialogVisible && this.isOneEngineRunning()) {
      this.dialogVisible = true;
      const dialog = new PopUpDialog();
      const presetID = 2;
      dialog.showPopUp(
        'Shift+Ctrl+E Not supported',
        `<div style="font-size: 120%; text-align: left;">
                               Engine Auto Shutdown is not supported by the A380X.<br/>
                               <br/>
                               Do you want to you use the flyPad's Aircraft Presets to set the aircraft to
                               <strong>"${AircraftPresetsList.getPresetName(presetID)}"</strong>?
                             </div>`,
        'small',
        () => this.loadPreset(presetID),
        () => (this.dialogVisible = false),
      );
    }
  }

  private isAlreadyLoading() {
    const loadingInProgress = SimVar.GetSimVarValue('L:A32NX_AIRCRAFT_PRESET_LOAD', 'Number');
    if (loadingInProgress > 0) {
      this.notification.showNotification({
        title: 'Aircraft Presets',
        message: `Loading Preset is already in progress "${AircraftPresetsList.getPresetName(loadingInProgress)}"`,
        type: NotificationType.Message,
        timeout: 1500,
      });
      return true;
    }
    return false;
  }

  private isOneEngineRunning() {
    const engine1N1 = SimVar.GetSimVarValue('L:A32NX_ENGINE_N1:1', 'Number');
    const engine2N1 = SimVar.GetSimVarValue('L:A32NX_ENGINE_N1:2', 'Number');
    return engine1N1 > 0.1 || engine2N1 > 0.1;
  }

  private loadPreset(presetID: number) {
    console.log(`Setting aircraft preset to ${AircraftPresetsList.getPresetName(presetID)}`);
    SimVar.SetSimVarValue('L:A32NX_AIRCRAFT_PRESET_LOAD', 'Number', presetID);
    this.dialogVisible = false;
  }
}
