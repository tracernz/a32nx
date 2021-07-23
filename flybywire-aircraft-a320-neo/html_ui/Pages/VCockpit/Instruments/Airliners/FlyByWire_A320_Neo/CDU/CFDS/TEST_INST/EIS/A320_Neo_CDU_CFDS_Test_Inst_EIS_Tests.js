class CDU_CFDS_Test_Inst_EIS_Tests {
    static ShowPage(fmc, mcdu, eisIndex) {
        mcdu.setCurrentPage(() => {
            CDU_CFDS_Test_Inst_EIS_Tests.ShowPage(fmc, mcdu, eisIndex);
        });
        SimVar.SetSimVarValue(`L:A32NX_DMC_DISPLAYTEST:${eisIndex}`, "Enum", 1);
        const title = "EIS ( DMC " + eisIndex + " )";
        mcdu.setTemplate([
            [title],
            ["", "", "TEST"],
            [""],
            [""],
            ["<SYSTEM TEST[color]inop"],
            [""],
            ["<DISPLAY TEST"],
            [""],
            ["<I/P TEST[color]inop"],
            [""],
            ["<SYSTEM TEST RESULT[color]inop"],
            [""],
            ["<RETURN[color]cyan"]
        ]);

        mcdu.leftInputDelay[2] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[2] = () => {
            CDU_CFDS_Test_Inst_EIS_Tests_Display.ShowPage(fmc, mcdu, eisIndex);
        };
        mcdu.leftInputDelay[5] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onLeftInput[5] = () => {
            CDU_CFDS_Test_Inst_EIS_Menu.ShowPage(fmc, mcdu, eisIndex);
        };

        // FIXME pages should not override these
        // Button key overrides
        mcdu.onDir = () => {
            SimVar.SetSimVarValue(`L:A32NX_DMC_DISPLAYTEST:${eisIndex}`, "Enum", 0);
            CDUDirectToPage.ShowPage(fmc, mcdu);
        };
        mcdu.onProg = () => {
            SimVar.SetSimVarValue(`L:A32NX_DMC_DISPLAYTEST:${eisIndex}`, "Enum", 0);
            CDUProgressPage.ShowPage(fmc, mcdu);
        };
        mcdu.onPerf = () => {
            SimVar.SetSimVarValue(`L:A32NX_DMC_DISPLAYTEST:${eisIndex}`, "Enum", 0);
            CDUPerformancePage.ShowPage(fmc, mcdu);
        };
        mcdu.onInit = () => {
            SimVar.SetSimVarValue(`L:A32NX_DMC_DISPLAYTEST:${eisIndex}`, "Enum", 0);
            CDUInitPage.ShowPage1(fmc, mcdu);
        };
        mcdu.onData = () => {
            SimVar.SetSimVarValue(`L:A32NX_DMC_DISPLAYTEST:${eisIndex}`, "Enum", 0);
            CDUDataIndexPage.ShowPage1(fmc, mcdu);
        };
        mcdu.onFpln = () => {
            SimVar.SetSimVarValue(`L:A32NX_DMC_DISPLAYTEST:${eisIndex}`, "Enum", 0);
            CDUFlightPlanPage.ShowPage(fmc, mcdu);
        };
        mcdu.onRad = () => {
            SimVar.SetSimVarValue(`L:A32NX_DMC_DISPLAYTEST:${eisIndex}`, "Enum", 0);
            CDUNavRadioPage.ShowPage(fmc, mcdu);
        };
        mcdu.onFuel = () => {
            SimVar.SetSimVarValue(`L:A32NX_DMC_DISPLAYTEST:${eisIndex}`, "Enum", 0);
            CDUFuelPredPage.ShowPage(fmc, mcdu);
        };
        mcdu.onMenu = () => {
            SimVar.SetSimVarValue(`L:A32NX_DMC_DISPLAYTEST:${eisIndex}`, "Enum", 0);
            CDUMenuPage.ShowPage(fmc, mcdu);
        };
    }
}
