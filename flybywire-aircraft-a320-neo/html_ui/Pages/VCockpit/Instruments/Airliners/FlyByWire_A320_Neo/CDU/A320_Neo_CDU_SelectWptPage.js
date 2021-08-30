class A320_Neo_CDU_SelectWptPage {
    static ShowPage(mcdu, waypoints, callback, page = 0) {
        mcdu.clearDisplay();
        mcdu.page.Current = mcdu.page.SelectWptPage;
        const rows = [
            ["", 'FREQ', 'LAT/LONG'],
            [""],
            [""],
            [""],
            [""],
            [""],
            [""],
            [""],
            [""],
            [""],
            [""],
            ["<RETURN"]
        ];

        function calculateDistance(location) {
            return Avionics.Utils.computeGreatCircleDistance(mcdu.ppos, location);
        }

        //const orderedWaypoints = [...waypoints].sort((a, b) => calculateDistance(a) - calculateDistance(b));
        const orderedWaypoints = waypoints;

        for (let i = 0; i < 5; i++) {
            const w = orderedWaypoints[i + 5 * page];
            if (w) {
                let t = "";
                let freq = 0;
                /*if (w.icao[0] === "V") {
                    t = " VOR";
                    freq = (w.infos.frequencyMHz) ? fastToFixed(w.infos.frequencyMHz, 3).toString() : " ";
                } else if (w.icao[0] === "N") {
                    t = " NDB";
                    freq = (w.infos.frequencyMHz) ? fastToFixed(w.infos.frequencyMHz, 3).toString() : " ";
                } else if (w.icao[0] === "A") {
                    t = " AIRPORT";
                    freq = " ";
                }*/

                const location = w.location || w.vorLocation || w.dmeLocation;

                const latString = (location.lat.toFixed(0) >= 0) ? `${location.lat.toFixed(0).toString().padStart(2, "0")}N` : `${Math.abs(location.lat.toFixed(0)).toString().padStart(2, "0")}S`;
                const longString = (location.long.toFixed(0) >= 0) ? `${location.long.toFixed(0).toString().padStart(3, "0")}E` : `${Math.abs(location.long.toFixed(0)).toString().padStart(3, "0")}W`;

                const dist = Math.min(calculateDistance(location), 9999);

                rows[2 * i].splice(0, 1, "{green}" + dist.toFixed(0) + "{end}NM");
                rows[2 * i + 1] = ["*" + w.ident + "[color]cyan", freq + "[color]green", `${latString}/${longString}[color]green`];
                mcdu.onLeftInput[i] = () => {
                    callback(w);
                };
                mcdu.onRightInput[i] = () => {
                    callback(w);
                };
                mcdu.onLeftInput[5] = () => {
                    if (mcdu.returnPageCallback) {
                        mcdu.returnPageCallback();
                    } else {
                        console.error("A return page callback was expected but not declared. Add a returnPageCallback to page: " + mcdu.page.Current);
                    }
                };
            }
        }
        mcdu.setTemplate([
            ["DUPLICATE NAMES", (page + 1).toFixed(0), Math.ceil(orderedWaypoints.length / 5).toFixed(0)],
            ...rows,
            [""]
        ]);
        mcdu.onPrevPage = () => {
            if (page > 0) {
                A320_Neo_CDU_SelectWptPage.ShowPage(mcdu, orderedWaypoints, callback, page - 1);
            }
        };
        mcdu.onNextPage = () => {
            if (page < Math.floor(waypoints.length / 5)) {
                A320_Neo_CDU_SelectWptPage.ShowPage(mcdu, orderedWaypoints, callback, page + 1);
            }
        };
    }
}
