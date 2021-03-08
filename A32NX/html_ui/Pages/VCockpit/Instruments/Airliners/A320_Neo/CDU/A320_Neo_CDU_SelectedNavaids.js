class CDUSelectedNavaids {
    static ShowPage(mcdu) {
        mcdu.clearDisplay();
        mcdu.page.Current = mcdu.page.SelectedNavaids;

        const template = [
            ["\xa0SELECTED NAVAIDS"],
            ["\xa0VOR/", "DESELECT", ""],
            ["", "[\xa0\xa0\xa0]{small}*{end}[color]cyan", ""],
            ["\xa0DME", "", ""],
            ["", "", ""],
            ["\xa0DME", "", ""],
            ["", "", ""],
            ["\xa0ILS", "", ""],
            ["", "", ""],
            ["\xa0RADIONAV SELECTED[color]cyan"],
            ["{DESELECT[color]inop"],
            ["\xa0GPS SELECTED[color]cyan"],
            ["{DESELECT[color]inop", "RETURN>"]
        ];

        if (mcdu.vor1Frequency) {
            template[2][2] = `{green}{small}${mcdu.vor1Frequency.toFixed(2)}{end}{end}\xa0\xa0`;
            if (mcdu.vor1FreqIsPilotEntered || mcdu.vor1IdIsPilotEntered) {
                template[1][0] = "VOR/?"
                template[1][2] = "MAN";
                // TODO ident
            } else if (mcdu.A32NXCore.radioNavTuner.selectedDisplayVor) {
                template[1][0] = mcdu.A32NXCore.radioNavTuner.selectedDisplayVor.typeStr;
                template[1][2] = "AUTO";
                template[2][0] = `{cyan}<${mcdu.A32NXCore.radioNavTuner.selectedDisplayVor.ident}{end}`;
            }
        }

        if (mcdu.A32NXCore.radioNavTuner.selectedDme1) {
            template[3][2] = "AUTO";
            template[4][2] = `{green}{small}${mcdu.A32NXCore.radioNavTuner.selectedDme1.frequency.toFixed(2)}{end}{end}\xa0\xa0`;
            template[4][0] = `{cyan}<${mcdu.A32NXCore.radioNavTuner.selectedDme1.ident}{end}`;
        }

        if (mcdu.A32NXCore.radioNavTuner.selectedDme2) {
            template[5][2] = "AUTO";
            template[6][2] = `{green}{small}${mcdu.A32NXCore.radioNavTuner.selectedDme2.frequency.toFixed(2)}{end}{end}\xa0\xa0`;
            template[6][0] = `{cyan}<${mcdu.A32NXCore.radioNavTuner.selectedDme2.ident}{end}`;
        }

        if (mcdu.ilsFrequency) {
            template[7][2] = mcdu._ilsFreqIsPilotEntered ? "MAN" : "AUTO";
            template[8][2] = `{green}{small}${mcdu.ilsFrequency.toFixed(2)}{end}{end}\xa0\xa0`;
            if (mcdu.ilsSelectedIdent) {
                template[8][0] = `{cyan}<${mcdu.ilsSelectedIdent}{end}`;
            }
        }

        mcdu.setTemplate(template);

        mcdu.rightInputDelay[5] = () => {
            return mcdu.getDelaySwitchPage();
        };

        mcdu.onRightInput[5] = () => {
            CDUDataIndexPage.ShowPage1(mcdu);
        };

        // TODO auto refresh page
    }
}
