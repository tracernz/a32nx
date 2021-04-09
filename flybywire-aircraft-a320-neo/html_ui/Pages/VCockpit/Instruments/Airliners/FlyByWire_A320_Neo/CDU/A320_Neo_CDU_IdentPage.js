class CDUIdentPage {
    static ShowPage(mcdu) {
        const date = mcdu.getNavDataDateRange();
        mcdu.clearDisplay();
        mcdu.page.Current = mcdu.page.IdentPage;
        mcdu.activeSystem = 'FMGC';
        mcdu.setTemplate([
            ["A320-200"],//This aircraft code is correct and does not include the engine type.
            ["\xa0ENG"],
            ["LEAP-1A26[color]green"],
            ["\xa0ACTIVE NAV DATA BASE"],
            ["\xa0" + mcdu.airacCycleInfo.dateRangeString + "[color]cyan", mcdu.airacCycleInfo.databaseName + "[s-text][color]green"],
            ["\xa0SECOND NAV DATA BASE"],
            ["{small}{" + mcdu.airacCycleInfo.previousDateRangeString + "{end}[color]inop"],
            ["", ""],
            ["", ""],
            ["CHG CODE", ""],
            ["{small}[  ]{end}[color]inop", ""],
            ["IDLE/PERF", "SOFTWARE"],
            ["+0.0/+0.0[color]green", "STATUS/XLOAD>[color]inop"]
        ]);
    }
}
