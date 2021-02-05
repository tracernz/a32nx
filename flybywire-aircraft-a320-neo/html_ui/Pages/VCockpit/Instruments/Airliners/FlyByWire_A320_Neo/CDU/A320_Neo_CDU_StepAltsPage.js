/*
 * A32NX
 * Copyright (C) 2020-2021 FlyByWire Simulations and its contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

class CDUStepAltsPage {

    static Return() {}

    static ShowPage(mcdu) {
        mcdu.clearDisplay();
        mcdu.page.Current = mcdu.page.StepAlts;

        const template = ([
            [`STEP ALTS {small}FROM{end} {green}FL${mcdu.cruiseFlightLevel.toFixed(0).padStart(3, "0")}{end}`],
            ["\xa0ALT\xa0/\xa0WPT", "DIST\xa0TIME"],
            ["", ""],
            ["", ""],
            ["", ""],
            ["", ""],
            ["", ""],
            ["", ""],
            ["", ""],
            ["", ""],
            ["", ""],
            ["", ""],
            ["<RETURN", ""],
        ]);

        mcdu.setTemplate(CDUStepAltsPage.ShowSteps(template, mcdu));

        mcdu.onLeftInput[5] = () => {
            CDUStepAltsPage.Return();
        };

        CDUStepAltsPage._timer = 0;
        mcdu.pageUpdate = () => {
            CDUStepAltsPage._timer++;
            if (CDUStepAltsPage._timer >= 15) {
                CDUStepAltsPage.ShowPage(mcdu);
            }
        };
    }

    static ShowSteps(rows, mcdu) {
        const maxSteps = 4;

        for (let i = 0; i < mcdu.stepClimbs.length && i < maxSteps; i++) {
            let at = "";
            if (isFinite(mcdu.stepClimbs[i].ete) && isFinite(mcdu.stepClimbs[i].dist)) {
                at = `{small}{green}${mcdu.stepClimbs[i].dist.toFixed(0).padStart(4, " ")}\xa0${FMCMainDisplay.secondsTohhmm(mcdu.stepClimbs[i].ete)}{end}{end}`;
            }
            rows[2 + i * 2] = [`{cyan}FL${mcdu.stepClimbs[i].level.toFixed(0).padStart(3, "0")}/${mcdu.stepClimbs[i].waypoint}{end}`, at];
            mcdu.onLeftInput[i] = (input) => {
                mcdu.tryUpdateStepClimb(i, input);
                CDUStepAltsPage.ShowPage(mcdu);
            };
        }

        if (mcdu.stepClimbs.length < maxSteps) {
            rows[2 + mcdu.stepClimbs.length * 2] = ["{cyan}[\xa0\xa0\xa0]/[\xa0\xa0\xa0\xa0\xa0]", ""];
            mcdu.onLeftInput[mcdu.stepClimbs.length] = (input) => {
                mcdu.tryAddStepClimb(input);
                CDUStepAltsPage.ShowPage(mcdu);
            };
        }
        // TODO opt step prompt/calculation

        return rows;
    }
}
