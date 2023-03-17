// Copyright (c) 2022-2023 FlyByWire Simulations
// SPDX-License-Identifier: GPL-3.0

import { FlightPlanManager } from '@fmgc/index';
import { LandingSystemSelectionManager } from '@fmgc/navigation/LandingSystemSelectionManager';
import { NavaidSelectionManager } from '@fmgc/navigation/NavaidSelectionManager';
import { NavaidTuner } from '@fmgc/navigation/NavaidTuner';
import { NavigationProvider } from '@fmgc/navigation/NavigationProvider';
import { NearbyFacilities } from '@fmgc/navigation/NearbyFacilities';
import { RequiredPerformance } from '@fmgc/navigation/RequiredPerformance';
import { VorType } from '@fmgc/types/fstypes/FSEnums';
import { Arinc429Register } from '@shared/arinc429';
import { Coordinates } from 'msfs-geo';

export enum SelectedNavaidType {
    None,
    Dme,
    Vor,
    VorDme,
    VorTac,
    Tacan,
    Ils,
    Gls,
    Mls,
}

export enum SelectedNavaidMode {
    Auto,
    Manual,
    Rmp,
}

export interface SelectedNavaid {
    type: SelectedNavaidType,
    mode: SelectedNavaidMode,
    ident: string,
    frequency: number,
    facility: RawVor | null,
}

export class Navigation implements NavigationProvider {
    private static readonly adiruOrder = [1, 3, 2];

    private static readonly arincWordCache = Arinc429Register.empty();

    requiredPerformance: RequiredPerformance;

    currentPerformance: number | undefined;

    accuracyHigh: boolean = false;

    ppos: Coordinates = { lat: 0, long: 0 };

    groundSpeed: Knots = 0;

    private radioHeight: number | null = null;

    private static readonly radioAltimeterVars = Array.from({ length: 2 }, (_, i) => `L:A32NX_RA_${i + 1}_RADIO_ALTITUDE`);

    private baroAltitude: number | null = null;

    private static readonly baroAltitudeVars = Array.from({ length: 3 }, (_, i) => `L:A32NX_ADIRS_ADR_${i + 1}_BARO_CORRECTED_ALTITUDE_1`);

    private pressureAltitude: number | null = null;

    private static readonly pressureAltitudeVars = Array.from({ length: 3 }, (_, i) => `L:A32NX_ADIRS_ADR_${i + 1}_ALTITUDE`);

    private readonly navaidSelectionManager: NavaidSelectionManager;

    private readonly landingSystemSelectionManager: LandingSystemSelectionManager;

    private readonly navaidTuner: NavaidTuner;

    private readonly selectedNavaids = Array.from({ length: 4 }, () => ({
        type: SelectedNavaidType.None,
        mode: SelectedNavaidMode.Auto,
        ident: '',
        frequency: 0,
        facility: null,
    }));

    constructor(private flightPlanManager: FlightPlanManager, private readonly facLoader: FacilityLoader) {
        this.requiredPerformance = new RequiredPerformance(this.flightPlanManager);
        this.navaidSelectionManager = new NavaidSelectionManager(this, this.flightPlanManager);
        this.landingSystemSelectionManager = new LandingSystemSelectionManager(this, this.flightPlanManager, this.facLoader);
        this.navaidTuner = new NavaidTuner(this, this.navaidSelectionManager, this.landingSystemSelectionManager);
    }

    init(): void {
        this.navaidTuner.init();
    }

    update(deltaTime: number): void {
        this.requiredPerformance.update(deltaTime);

        this.updateCurrentPerformance();

        this.updatePosition();
        this.updateRadioHeight();
        this.updateBaroAltitude();
        this.updatePressureAltitude();

        NearbyFacilities.getInstance().update(deltaTime);

        this.navaidSelectionManager.update(deltaTime);
        this.landingSystemSelectionManager.update(deltaTime);

        this.navaidTuner.update(deltaTime);
    }

    private getAdiruValue(simVars: string[]): number | null {
        for (const adiru of Navigation.adiruOrder) {
            const simVar = simVars[adiru - 1];
            Navigation.arincWordCache.setFromSimVar(simVar);
            if (Navigation.arincWordCache.isNormalOperation()) {
                return Navigation.arincWordCache.value;
            }
        }
        return null;
    }

    private updateCurrentPerformance(): void {
        const gs = SimVar.GetSimVarValue('GPS GROUND SPEED', 'knots');

        // FIXME fake it until we make it :D
        const estimate = 0.03 + Math.random() * 0.02 + gs * 0.00015;
        // basic IIR filter
        this.currentPerformance = this.currentPerformance === undefined ? estimate : this.currentPerformance * 0.9 + estimate * 0.1;

        const accuracyHigh = this.currentPerformance <= this.requiredPerformance.activeRnp;
        if (accuracyHigh !== this.accuracyHigh) {
            this.accuracyHigh = accuracyHigh;
            SimVar.SetSimVarValue('L:A32NX_FMGC_L_NAV_ACCURACY_HIGH', 'bool', this.accuracyHigh);
            SimVar.SetSimVarValue('L:A32NX_FMGC_R_NAV_ACCURACY_HIGH', 'bool', this.accuracyHigh);
        }
    }

    private updateRadioHeight(): void {
        for (const simVar of Navigation.radioAltimeterVars) {
            Navigation.arincWordCache.setFromSimVar(simVar);
            if (Navigation.arincWordCache.isNormalOperation()) {
                this.radioHeight = Navigation.arincWordCache.value;
                return;
            }
        }
        this.radioHeight = null;
    }

    private updateBaroAltitude(): void {
        this.baroAltitude = this.getAdiruValue(Navigation.baroAltitudeVars);
    }

    private updatePressureAltitude(): void {
        this.pressureAltitude = this.getAdiruValue(Navigation.pressureAltitudeVars);
    }

    private updatePosition(): void {
        this.ppos.lat = SimVar.GetSimVarValue('PLANE LATITUDE', 'degree latitude');
        this.ppos.long = SimVar.GetSimVarValue('PLANE LONGITUDE', 'degree longitude');
        this.groundSpeed = SimVar.GetSimVarValue('GPS GROUND SPEED', 'knots');

        // pass to submodules
        NearbyFacilities.getInstance().setPpos(this.ppos);
    }

    public getBaroCorrectedAltitude(): number | null {
        return this.baroAltitude;
    }

    public getEpe(): number {
        return this.currentPerformance ?? Infinity;
    }

    public getPpos(): Coordinates | null {
        // TODO return null when fms pos invalid
        return this.ppos;
    }

    public getPressureAltitude(): number | null {
        return this.pressureAltitude;
    }

    public getRadioHeight(): number | null {
        return this.radioHeight;
    }

    public getNavaidTuner(): NavaidTuner {
        return this.navaidTuner;
    }

    public getSelectedNavaids(cdu: 1 | 2 = 1): SelectedNavaid[] {
        let i = 0;
        if (this.navaidTuner.rmpTuningActive) {
            for (; i < 2; i++) {
                const selected = this.selectedNavaids[i];
                selected.type = i === 1 ? SelectedNavaidType.Ils : SelectedNavaidType.None;
                selected.mode = SelectedNavaidMode.Rmp;
                selected.ident = '';
                selected.frequency = SimVar.GetSimVarValue(`NAV FREQUENCY:${i = 0 ? 1 : 3}`, 'mhz');
                selected.facility = null;
            }
        } else {
            const vorStatus = this.navaidTuner.getVorRadioTuningStatus(cdu);
            if (vorStatus.frequency !== null) {
                const selected = this.selectedNavaids[i];
                selected.type = this.getSelectedNavaidType(vorStatus.facility);
                selected.mode = vorStatus.manual ? SelectedNavaidMode.Manual : SelectedNavaidMode.Auto;
                selected.ident = vorStatus.ident;
                selected.frequency = vorStatus.frequency;
                selected.facility = vorStatus.facility ?? null;
                i++;
            }
            const dmePair = this.navaidSelectionManager.dmePair;
            if (dmePair !== null) {
                for (const dme of dmePair) {
                    const selected = this.selectedNavaids[i];
                    selected.type = this.getSelectedNavaidType(dme);
                    selected.mode = SelectedNavaidMode.Auto;
                    selected.ident = WayPoint.formatIdentFromIcao(dme.icao);
                    selected.frequency = dme.freqMHz;
                    selected.facility = dme;
                    i++;
                }
            }
            const mmrStatus = this.navaidTuner.getMmrRadioTuningStatus(1);
            if (mmrStatus.frequency !== null) {
                const selected = this.selectedNavaids[i];
                selected.type = this.getSelectedNavaidType(mmrStatus.facility);
                selected.mode = mmrStatus.manual ? SelectedNavaidMode.Manual : SelectedNavaidMode.Auto;
                selected.ident = mmrStatus.ident;
                selected.frequency = mmrStatus.frequency;
                selected.facility = mmrStatus.facility ?? null;
                i++;
            }
        }

        for (; i < this.selectedNavaids.length; i++) {
            const selected = this.selectedNavaids[i];
            selected.type = SelectedNavaidType.None;
            selected.mode = SelectedNavaidMode.Auto;
            selected.ident = '';
            selected.frequency = 0;
            selected.facility = null;
        }

        return this.selectedNavaids;
    }

    private getSelectedNavaidType(facility: RawVor | null): SelectedNavaidType {
        if (facility === null) {
            return SelectedNavaidType.None;
        }
        switch (facility.type) {
        case VorType.DME:
            return SelectedNavaidType.Dme;
        case VorType.VOR:
            return SelectedNavaidType.Vor;
        case VorType.VORDME:
            return SelectedNavaidType.VorDme;
        case VorType.VORTAC:
            return SelectedNavaidType.VorTac;
        case VorType.TACAN:
            return SelectedNavaidType.Tacan;
        case VorType.ILS:
            return SelectedNavaidType.Ils;
        default:
            return SelectedNavaidType.None;
        }
    }

    // TODO:
    ///  NOTE : When FMC internal position will be coded, there needs to be a way to make the FMC lose its position in flight when switching database in the A320_Neo_CDU_IdentPage.js
}
