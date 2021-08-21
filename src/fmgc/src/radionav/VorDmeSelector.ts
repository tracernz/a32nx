import { VhfNavaid, VhfNavaidType } from "@fmgc/database/Types";
import { MegaHertz } from "@typings/types";
import { VorTuner, DmeChannel } from "@fmgc/radionav/Tuner";
import { NavDataManager } from "@fmgc/database/NavDataManager";
import { TuningMode } from "@fmgc/radionav/NavRadioManager";
import { LatLongData } from "@typings/fs-base-ui";

export class VorDmeSelector {
    private candidates: VhfNavaid[] = [];
    private displayVor: VhfNavaid;
    private dmePair: VhfNavaid[];

    /**
     * Used when tuned by ident
     * TODO fmgcs tune their onside VOR only when split
     */
    private pilotVor: VhfNavaid[];
    /**
     * Used when tuned by frequency (reduced functions)
     */
    private pilotFrequency: MegaHertz[];

    private displayTuners: VorTuner[];
    private dmePairChannels: DmeChannel[];

    private candidateUpdateThrottler = new UpdateThrottler(10000);

    constructor(displayTuners: VorTuner[], dmePairChannels: DmeChannel[]) {
        this.displayTuners = displayTuners;
        this.dmePairChannels = dmePairChannels;

        this.pilotFrequency = new Array(this.displayTuners.length);
        this.pilotVor = new Array(this.displayTuners.length);
    }

    init(): void {
        // TODO use FMGC position
        const ppos = {
            lat: SimVar.GetSimVarValue('PLANE LATITUDE', 'degree latitude'),
            long: SimVar.GetSimVarValue('PLANE LONGITUDE', 'degree longitude'),
        };
        this.updateCandidates(ppos);
    }

    update(deltaTime: number): void {
        // TODO use FMGC position
        const ppos = {
            lat: SimVar.GetSimVarValue('PLANE LATITUDE', 'degree latitude'),
            long: SimVar.GetSimVarValue('PLANE LONGITUDE', 'degree longitude'),
        };

        // TODO trigger this on update of navdatamanager's list
        if (this.candidateUpdateThrottler.canUpdate(deltaTime) !== -1) {
            // TODO should update at power-on, position update (takeoff or manual), and every 3 minutes
            this.updateCandidates(ppos);
        }

        // select display vor
        this.updateDisplayVor();

        // select dme pair if needed
    }

    public setPilotFrequency(vor: 1 | 2, frequency: MegaHertz): boolean {
        // todo validate frequency
        this.pilotVor[vor - 1] = undefined;
        this.pilotFrequency[vor - 1] = frequency;

        return true;
    }

    public setPilotVor(vor: 1 | 2, navaid: VhfNavaid): boolean {
        this.pilotFrequency[vor - 1] = undefined;
        this.pilotVor[vor - 1] = navaid;
        return true;
    }

    private updateDisplayVor(): void {
        // TODO actually figure out which one to autotune

        if (this.candidates.length > 0) {
            this.displayVor = this.candidates[0];
        }

        // TODO only tune when something changed
        // TODO detect remote tuning?
        for (let i = 0; i < this.displayTuners.length; i++) {
            const tuner = this.displayTuners[i];
            if (this.pilotFrequency[i]) {
                tuner.tune(this.pilotFrequency[i]);
                SimVar.SetSimVarValue(`L:A32NX_FMGC_RADIONAV_VOR${i + 1}_TUNING_MODE`, 'enum', TuningMode.Manual);
            } else if (this.pilotVor[i]) {
                tuner.tune(this.pilotVor[i].frequency);
                SimVar.SetSimVarValue(`L:A32NX_FMGC_RADIONAV_VOR${i + 1}_TUNING_MODE`, 'enum', TuningMode.Manual);
            } else if (this.displayVor) {
                tuner.tune(this.displayVor.frequency);
                SimVar.SetSimVarValue(`L:A32NX_FMGC_RADIONAV_VOR${i + 1}_TUNING_MODE`, 'enum', TuningMode.Auto);
            }
        }
    }

    private updateDmePair(deltaTime: number): void {

    }

    private async updateCandidates(ppos: LatLongData): Promise<void> {
        this.candidates.length = 0;
        for (let i = 0; i < NavDataManager.instance.nearbyVhfNavaids.length && this.candidates.length < 20; i++) {
            const vor = NavDataManager.instance.nearbyVhfNavaids[i];
            // TODO which types should be considered?
            if (vor.type === VhfNavaidType.VorDme || vor.type === VhfNavaidType.Dme) {
                this.candidates.push(vor);
            }
        }
        this.candidates.sort((a, b) => Avionics.Utils.computeGreatCircleDistance(ppos, a.vorLocation) - Avionics.Utils.computeGreatCircleDistance(ppos, b.vorLocation));
    }

    public tunedNavaids(): VhfNavaid[] {
        // TODO DME pair too?
        if (this.displayVor) {
            return [this.displayVor];
        }
        return [];
    }
}
