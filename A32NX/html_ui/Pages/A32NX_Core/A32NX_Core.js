class A32NX_Core {
    constructor(mcdu) {
        this.modules = [
            new A32NX_ADIRS(),
            new A32NX_APU(),
            new A32NX_BaroSelector(),
            new A32NX_BrakeTemp(),
            new A32NX_Refuel(),
            new A32NX_Electricity(),
            new A32NX_LocalVarUpdater(),
            new A32NX_FADEC(1),
            new A32NX_FADEC(2),
            new A32NX_FWC(),
            new A32NX_GPWS(this),
            new A32NX_GroundReference(),
            new A32NX_Speeds()
        ];

        this.soundManager = new A32NX_SoundManager();
        this.radioNavTuner = new A32NX_RadioNavTuner(mcdu);
    }

    init(startTime) {
        this.ACPowerStateChange = false;
        this.getDeltaTime = A32NX_Util.createDeltaTimeCalculator(startTime);
        this.modules.forEach(module => {
            if (typeof module.init === "function") {
                module.init();
            }
        });
        this.radioNavTuner.init();
        this.isInit = true;
    }

    update() {
        if (!this.isInit) {
            return;
        }

        this.updateACPowerStateChange();

        const deltaTime = this.getDeltaTime();

        this.soundManager.update(deltaTime);
        this.radioNavTuner.update(deltaTime, this);
        this.modules.forEach(module => {
            module.update(deltaTime, this);
        });
    }
    updateACPowerStateChange() {
        const engineOn = Simplane.getEngineActive(0) || Simplane.getEngineActive(1);
        const externalPowerOn = SimVar.GetSimVarValue("EXTERNAL POWER AVAILABLE:1", "Bool") === 1 && SimVar.GetSimVarValue("EXTERNAL POWER ON", "Bool") === 1;
        const apuOn = SimVar.GetSimVarValue("L:APU_GEN_ONLINE", "bool");
        const isACPowerAvailable = engineOn || apuOn || externalPowerOn;
        this.ACPowerStateChange = (isACPowerAvailable != this.ACPowerLastState);
    }
}
