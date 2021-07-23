class CDU_AIDS_MainMenu {
    static ShowPage(fmc, mcdu) {
        mcdu.setCurrentPage(null, 'AIDS');

        mcdu.setTemplate([
            ["AIDS"],
            ["CALL-UP[color]inop"],
            ["<PARAM[color]inop", "LOAD STATUS>[color]inop"],
            [""],
            ["<PROGRAMMING[color]inop"],
            ["", "LIST OF[color]inop"],
            ["<SAR[color]inop", "PREV REP>[color]inop"],
            ["", "STORED[color]inop"],
            ["", "REPORTS>[color]inop"],
            ["ASSIGNMENT[color]inop", "MAN REQST[color]inop"],
            ["<REMOTE PRINT[color]inop", "REPORTS>[color]inop"],
            ["", "POST[color]cyan"],
            ["DAR = RUNNING[color]green", "STOP*[color]cyan"]
        ]);

        mcdu.rightInputDelay[5] = () => {
            return mcdu.getDelaySwitchPage();
        };
        mcdu.onRightInput[5] = () => {
            mcdu.addNewMessage(NXFictionalMessages.notYetImplemented);
        };
    }
}
