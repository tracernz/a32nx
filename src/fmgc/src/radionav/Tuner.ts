import { KiloHertz, MegaHertz } from "@typings/types";

// TODO move
export enum ArincBusStatus {
    None = 0, // no transmission e.g. system died
    NCD,
    Normal,
}

// TODO course
export interface TunerConfig {
    /**
     * VOR1, ADF1, ILS1 etc.
     */
    name: string;

    /**
     * Electrical bus
     */
    electricalBus: string;

    /**
     * SimVar to check if the station is received
     */
    availableSimvar: string;

    /**
     * SimVar to retrieve the station ident
     */
    identSimvar: string;

    /**
     * Get frequency SimVar
     */
    getFrequencySimvar: string;

    /**
     * Set frequency SimVar
     */
    setFrequencySimvar?: string;

    /**
     * SimVar to get the relative bearing from PPOS to the station
     */
    relativeBearingSimvar?: string;

    /**
     * SimVar to get the distance from PPOS to the station
     */
    distanceSimvar?: string;
}

export abstract class Tuner {
    protected config: TunerConfig;
    public name: string;
    private elecSimvar: string;

    private status: ArincBusStatus = ArincBusStatus.None;
    private bearing: number = 0;
    private smoothedBearing: number = 0;
    private unavailableFor: number = 0; // ms
    private ident: string = '';

    constructor(config: TunerConfig) {
        this.config = config;
        this.name = this.config.name;
        this.elecSimvar = `L:A32NX_ELEC_${this.config.electricalBus}_BUS_IS_POWERED`;
    }

    init(): void {
        SimVar.SetSimVarValue(`L:A32NX_NAVRADIO_${this.name}_STATUS`, 'enum', this.status);
    }

    update(deltaTime: number): void {
        const powered = SimVar.GetSimVarValue(this.elecSimvar, 'bool');
        if (!powered) {
            this.setStatus(ArincBusStatus.None);
            return;
        }

        const available = SimVar.GetSimVarValue(this.config.availableSimvar, 'boolean');
        if (available) {
            const ident = SimVar.GetSimVarValue(this.config.identSimvar, 'string');
            if (this.ident != ident) {
                SimVar.SetSimVarValue(`L:A32NX_NAVRADIO_${this.name}_IDENT`, 'number', Tuner.packIdent(ident));
            }
            this.ident = ident;

            if (this.setStatus(ArincBusStatus.Normal)) {
                this.unavailableFor = 0;
            }

            if (this.config.relativeBearingSimvar) {
                this.bearing = SimVar.GetSimVarValue(this.config.relativeBearingSimvar, 'degrees');
            }
        } else if (this.status !== ArincBusStatus.NCD) {
            this.unavailableFor += deltaTime;
            if (this.unavailableFor > 2000) {
                this.ident = '';
                SimVar.SetSimVarValue(`L:A32NX_NAVRADIO_${this.name}_IDENT`, 'number', Tuner.packIdent(this.ident));
                this.setStatus(ArincBusStatus.NCD);
            }
        }

        if (Math.abs(Avionics.Utils.diffAngle(this.smoothedBearing, this.bearing)) > 0.05) {
            // slew at a max rate of 180 degrees per second TODO check this calc
            this.smoothedBearing = Avionics.Utils.clampAngle(this.smoothedBearing + deltaTime / 1000 * Avionics.Utils.diffAngle(this.smoothedBearing, this.bearing));
            SimVar.SetSimVarValue(`L:A32NX_NAVRADIO_${this.name}_SMOOTHED_BEARING`, 'degrees', this.smoothedBearing);
        }
    }

    private setStatus(newStatus: ArincBusStatus): boolean {
        if (this.status !== newStatus) {
            this.status = newStatus;
            SimVar.SetSimVarValue(`L:A32NX_NAVRADIO_${this.name}_STATUS`, 'enum', this.status);
            return true;
        }
        return false;
    }

    /**
     * Packs a radio ident into a number for transmission through a SimVar
     */
    public static packIdent(ident: string): number {
        let packed = 0;
        for (let i = 0; i < ident.length; i++) {
            packed |= ident.charCodeAt(i) << (i * 8);
        }
        return packed;
    }

    /**
     * Unpacks a radio ident from a number SimVar
     */
    public static unpackIdent(packed: number): string {
        let ident = '';
        for (let i = 0; i < 4; i++) {
            const charCode = (packed >> (i * 8)) & 0xff;
            if (charCode > 0) {
                ident += String.fromCharCode(charCode);
            } else {
                break;
            }
        }
        return ident;
    }
}

export class VorTuner extends Tuner {
    public tune(frequency: MegaHertz): boolean {
        if (!this.config.setFrequencySimvar) {
            return false;
        }
        SimVar.SetSimVarValue(this.config.setFrequencySimvar, 'hertz', frequency * 1000000);
        return true;
    }
}

export class IlsTuner extends Tuner {
    public tune(frequency: MegaHertz): boolean {
        if (!this.config.setFrequencySimvar) {
            return false;
        }
        SimVar.SetSimVarValue(this.config.setFrequencySimvar, 'hertz', frequency * 1000000);
        return true;
    }
}

export class AdfTuner extends Tuner {
    public tune(frequency: KiloHertz): boolean {
        if (!this.config.setFrequencySimvar) {
            return false;
        }
        SimVar.SetSimVarValue(this.config.setFrequencySimvar, "Frequency ADF BCD32", Avionics.Utils.make_adf_bcd32(frequency * 1000));
        return true;
    }
}

export interface DmeChannel {
    init(): void;
    update(deltaTime: number): void;
}

export class SimDmeChannel extends Tuner implements DmeChannel {
    public tune(frequency: MegaHertz): boolean {
        return false; // the sim DME channels are slaved to VOR 1 & 2
    }
}

/**
 * The sim does not allow us to have more than 4 DME tuners,
 * and it is not feasible to multiplex as in the real equivalent,
 * so we fake the additional tuners
 */
export class FakeDmeChannel implements DmeChannel {
    public name: string;
    private elecSimvar: string;
    private status: ArincBusStatus = ArincBusStatus.None;

    constructor(name: string, electricalBus: string) {
        this.name = name;
        this.elecSimvar = `A32NX_ELEC_${electricalBus}_BUS_IS_POWERED`;
    }

    public init(): void {
        SimVar.SetSimVarValue(`L:A32NX_NAVRADIO_${this.name}_STATUS`, 'enum', this.status);
    }

    public update(deltaTime: number): void {
        const powered = SimVar.GetSimVarValue(this.elecSimvar, 'boolean');
        if (!powered) {
            this.setStatus(ArincBusStatus.None);
            return;
        }

        this.setStatus(ArincBusStatus.NCD);
    }

    private setStatus(newStatus: ArincBusStatus): boolean {
        if (this.status !== newStatus) {
            this.status = newStatus;
            SimVar.SetSimVarValue(`L:A32NX_NAVRADIO_${this.name}_STATUS`, 'enum', this.status);
            return true;
        }
        return false;
    }
}
