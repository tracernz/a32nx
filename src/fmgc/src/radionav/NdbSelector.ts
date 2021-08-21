import { NdbNavaid } from "@fmgc/database/Types";
import { KiloHertz } from "@typings/types";
import { AdfTuner } from "@fmgc/radionav/Tuner";
import { NavDataManager } from "@fmgc/database/NavDataManager";
import { TuningMode } from "@fmgc/radionav/NavRadioManager";
import { LatLongData } from "@typings/fs-base-ui";

export class NdbSelector {
    private displayNdb: NdbNavaid;

    /**
     * Used when tuned by ident
     * TODO fmgcs tune their onside ADF only when split
     */
    private pilotNdb: NdbNavaid[];
    /**
     * Used when tuned by frequency (reduced functions)
     */
    private pilotFrequency: KiloHertz[];

    private displayTuners: AdfTuner[];

    private fpUpdateThrottler = new UpdateThrottler(10000);

    constructor(displayTuners: AdfTuner[]) {
        this.displayTuners = displayTuners;

        this.pilotFrequency = new Array(this.displayTuners.length);
        this.pilotNdb = new Array(this.displayTuners.length);
    }

    init(): void {
    }

    update(deltaTime: number): void {
        if (this.fpUpdateThrottler.canUpdate(deltaTime) === -1) {
            return;
        }

        // select display ndb from f-pln
        this.updateDisplayNdb();
    }

    public setPilotFrequency(ndb: 1 | 2, frequency: KiloHertz): boolean {
        // todo validate frequency
        this.pilotNdb[ndb - 1] = undefined;
        this.pilotFrequency[ndb - 1] = frequency;

        return true;
    }

    public setPilotNdb(ndb: 1 | 2, navaid: NdbNavaid): boolean {
        this.pilotFrequency[ndb - 1] = undefined;
        this.pilotNdb[ndb - 1] = navaid;
        return true;
    }

    public getFmsTuned(ndb: 1 | 2): object {
        let freq;
        if (this.pilotFrequency[ndb - 1]) {
            freq = this.pilotFrequency[ndb - 1];
        } else if (this.pilotNdb[ndb - 1]) {
            freq = this.pilotNdb[ndb - 1].frequency;
        } else if (this.displayNdb) {
            freq = this.displayNdb.frequency;
        }
        // TODO check plain JS de-structuring from object
        return [
            freq,
            this.pilotFrequency[ndb - 1] !== undefined,
            this.pilotFrequency[ndb - 1] ? undefined : (this.pilotNdb[ndb - 1]?.ident ?? this.displayNdb?.ident ?? undefined),
            this.pilotNdb[ndb - 1] !== undefined,
        ];
    }

    private updateDisplayNdb(): void {
        // TODO actually figure out which one to autotune from f-pln

        this.displayNdb = null;

        // TODO only tune when something changed
        // TODO detect remote tuning?
        for (let i = 0; i < this.displayTuners.length; i++) {
            const tuner = this.displayTuners[i];
            if (this.pilotFrequency[i]) {
                tuner.tune(this.pilotFrequency[i]);
                SimVar.SetSimVarValue(`L:A32NX_FMGC_RADIONAV_ADF${i + 1}_TUNING_MODE`, 'enum', TuningMode.Manual);
            } else if (this.pilotNdb[i]) {
                tuner.tune(this.pilotNdb[i].frequency);
                SimVar.SetSimVarValue(`L:A32NX_FMGC_RADIONAV_ADF${i + 1}_TUNING_MODE`, 'enum', TuningMode.Manual);
            } else if (this.displayNdb) {
                tuner.tune(this.displayNdb.frequency);
                SimVar.SetSimVarValue(`L:A32NX_FMGC_RADIONAV_ADF${i + 1}_TUNING_MODE`, 'enum', TuningMode.Auto);
            }
        }
    }

    public tunedNavaids(): NdbNavaid[] {
        if (this.displayNdb) {
            return [this.displayNdb];
        }
        return [];
    }
}
