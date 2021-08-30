import { NdbNavaid, VhfNavaid } from "@fmgc/database/Types";
import { NdbSelector } from "./NdbSelector";
import { VorTuner, IlsTuner, DmeChannel, AdfTuner, SimDmeChannel, FakeDmeChannel } from "./Tuner";
import { VorDmeSelector } from "./VorDmeSelector";

export enum TuningMode {
    Auto = 0,
    Manual,
    Remote
}

/**
 * This is a placeholder for the new radio nav tuning logic... coming soon to an A32NX near you
 */
export class NavRadioManager {
    private static _instance: NavRadioManager;

    tuningMode1: TuningMode = TuningMode.Auto;
    tuningMode2: TuningMode = TuningMode.Auto;
    tuningMode3: TuningMode = TuningMode.Auto;

    vorTuners: VorTuner[] = [];
    ilsTuners: IlsTuner[] = [];
    dmeTuners: DmeChannel[] = [];
    adfTuners: AdfTuner[] = [];

    vhfSelector: VorDmeSelector;
    ndbSelector: NdbSelector;

    public static get instance(): NavRadioManager {
        if (!this._instance) {
            this._instance = new NavRadioManager();
        }
        return this._instance;
    }

    /* private ctor for singleton */
    private constructor() {
    }

    public init() {
        const vor1 = new VorTuner({
            name: 'VOR1',
            electricalBus: 'AC_ESS',
            relativeBearingSimvar: 'NAV RELATIVE BEARING TO STATION:1',
            availableSimvar: 'NAV HAS NAV:1',
            identSimvar: 'NAV IDENT:1',
            getFrequencySimvar: 'NAV ACTIVE FREQUENCY:1',
            setFrequencySimvar: 'K:NAV1_RADIO_SET_HZ',
        });
        vor1.init();
        this.vorTuners.push(vor1);

        const vor2 = new VorTuner({
            name: 'VOR2',
            electricalBus: 'AC_2',
            relativeBearingSimvar: 'NAV RELATIVE BEARING TO STATION:2',
            availableSimvar: 'NAV HAS NAV:2',
            identSimvar: 'NAV IDENT:2',
            getFrequencySimvar: 'NAV ACTIVE FREQUENCY:2',
            setFrequencySimvar: 'K:NAV2_RADIO_SET_HZ',
        });
        vor2.init();
        this.vorTuners.push(vor2);

        const ils1 = new IlsTuner({
            name: 'ILS1',
            electricalBus: 'AC_ESS',
            relativeBearingSimvar: 'NAV RELATIVE BEARING TO STATION:3',
            availableSimvar: 'NAV HAS LOCALIZER:3',
            identSimvar: 'NAV IDENT:3',
            getFrequencySimvar: 'NAV ACTIVE FREQUENCY:3',
            setFrequencySimvar: 'K:NAV3_RADIO_SET_HZ',
        });
        ils1.init();
        this.ilsTuners.push(ils1);

        const ils2 = new IlsTuner({
            name: 'ILS2',
            electricalBus: 'AC_2',
            relativeBearingSimvar: 'NAV RELATIVE BEARING TO STATION:4',
            availableSimvar: 'NAV HAS LOCALIZER:4',
            identSimvar: 'NAV IDENT:4',
            getFrequencySimvar: 'NAV ACTIVE FREQUENCY:4',
            setFrequencySimvar: 'K:NAV4_RADIO_SET_HZ',
        });
        ils2.init();
        this.ilsTuners.push(ils2);

        const adf1 = new AdfTuner({
            name: 'ADF1',
            electricalBus: 'AC_ESS_SHED',
            relativeBearingSimvar: 'ADF RADIAL:1',
            availableSimvar: 'ADF SIGNAL:1',
            identSimvar: 'ADF IDENT:1',
            getFrequencySimvar: 'ADF ACTIVE FREQUENCY:1',
            setFrequencySimvar: 'K:ADF_ACTIVE_SET',
        });
        adf1.init();
        this.adfTuners.push(adf1);

        const adf2 = new AdfTuner({
            name: 'ADF2',
            electricalBus: 'AC_2',
            relativeBearingSimvar: 'ADF RADIAL:2',
            availableSimvar: 'ADF SIGNAL:2',
            identSimvar: 'ADF IDENT:2',
            getFrequencySimvar: 'ADF ACTIVE FREQUENCY:2',
            setFrequencySimvar: 'K:ADF2_ACTIVE_SET',
        });
        adf2.init();
        this.adfTuners.push(adf2);

        // slaved to VOR1
        const dme11 = new SimDmeChannel({
            name: 'DME1.1',
            electricalBus: 'AC_1',
            availableSimvar: 'NAV HAS DME:1',
            identSimvar: 'NAV IDENT:1',
            getFrequencySimvar: '',
        });
        dme11.init();
        this.dmeTuners.push(dme11);

        // slaved to VOR2
        const dme12 = new SimDmeChannel({
            name: 'DME1.2',
            electricalBus: 'AC_1',
            availableSimvar: 'NAV HAS DME:2',
            identSimvar: 'NAV IDENT:2',
            getFrequencySimvar: '',
        });
        dme12.init();
        this.dmeTuners.push(dme12);

        // slaved to ILS1
        const dme13 = new SimDmeChannel({
            name: 'DME1.3',
            electricalBus: 'AC_1',
            availableSimvar: 'NAV HAS DME:3',
            identSimvar: 'NAV IDENT:3',
            getFrequencySimvar: '',
        });
        dme13.init();
        this.dmeTuners.push(dme13);

        // fake DME for positioning
        const dme14 = new FakeDmeChannel('DME1.4', 'AC_1');
        dme14.init();
        this.dmeTuners.push(dme14);

        // fake DME for positioning
        const dme15 = new FakeDmeChannel('DME1.5', 'AC_1');
        dme15.init();
        this.dmeTuners.push(dme15);

        // slaved to VOR1
        const dme21 = new SimDmeChannel({
            name: 'DME2.1',
            electricalBus: 'AC_2',
            availableSimvar: 'NAV HAS DME:1',
            identSimvar: 'NAV IDENT:1',
            getFrequencySimvar: '',
        });
        dme21.init();
        this.dmeTuners.push(dme21);

        // slaved to VOR2
        const dme22 = new SimDmeChannel({
            name: 'DME2.2',
            electricalBus: 'AC_2',
            availableSimvar: 'NAV HAS DME:2',
            identSimvar: 'NAV IDENT:2',
            getFrequencySimvar: '',
        });
        dme22.init();
        this.dmeTuners.push(dme22);

        // slaved to ILS2
        const dme23 = new SimDmeChannel({
            name: 'DME2.3',
            electricalBus: 'AC_2',
            availableSimvar: 'NAV HAS DME:4',
            identSimvar: 'NAV IDENT:4',
            getFrequencySimvar: '',
        });
        dme23.init();
        this.dmeTuners.push(dme23);

        // fake DME for positioning
        const dme24 = new FakeDmeChannel('DME2.4', 'AC_2');
        dme24.init();
        this.dmeTuners.push(dme24);

        // fake DME for positioning
        const dme25 = new FakeDmeChannel('DME2.5', 'AC_2');
        dme25.init();
        this.dmeTuners.push(dme25);

        this.vhfSelector = new VorDmeSelector([vor1, vor2], [dme14, dme15, dme24, dme25]);
        this.vhfSelector.init();

        this.ndbSelector = new NdbSelector([adf1, adf2]);
        this.ndbSelector.init();
    }


    public update(deltaTime: number): void {
        this.vhfSelector.update(deltaTime);
        this.ndbSelector.update(deltaTime);
        this.vorTuners.forEach((tuner) => tuner.update(deltaTime));
        this.ilsTuners.forEach((tuner) => tuner.update(deltaTime));
        this.adfTuners.forEach((tuner) => tuner.update(deltaTime));
        this.dmeTuners.forEach((tuner) => tuner.update(deltaTime));
    }

    public tunedVhfNavaids(): VhfNavaid[] {
        return this.vhfSelector.tunedNavaids();
    }

    public tunedNdbNavaids(): NdbNavaid[] {
        return this.ndbSelector.tunedNavaids();
    }
}
