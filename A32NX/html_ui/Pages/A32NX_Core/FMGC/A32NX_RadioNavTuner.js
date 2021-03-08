
const TYPE_VORDME = 2;
const TYPE_DME = 3;
const TYPE_TACAN = 4;
const TYPE_VORTAC = 5;
const TYPE_ILS = 6;

const CLASS_TERMINAL = 1;
const CLASS_LOW_ALT = 2;
const CLASS_HIGH_ALT = 3;
const CLASS_ILS = 4;

const TYPES = {
    TYPE_VORDME: "VOR/DME",
    TYPE_DME: "DME",
    TYPE_TACAN: "TACAN",
    TYPE_VORTAC: "VOR/TAC",
    TYPE_ILS: "ILS"
}

class A32NX_RadioNavTuner {
    constructor(mcdu) {
        this.mcdu = mcdu;
    }

    init() {
        this.updateThrottler = new UpdateThrottler(5000); // TODO dme updated every 10 seconds, candidates updated every 3 minutes

        this.dme = [];
        this.ils = [];

        this.deselected = [];

        this.selectedDisplayVor = undefined;
        this.selectedIls = undefined;
        this.selectedIlsRwyIdent = undefined;
        this.selectedVorDme = undefined;
        this.selectedDme1 = undefined;
        this.selectedDme2 = undefined;
    }

    updateNavaids() {
        const batch = new SimVar.SimVarBatch("C:fs9gps:NearestVorItemsNumber", "C:fs9gps:NearestVorCurrentLine");
        batch.add("C:fs9gps:NearestVorCurrentIdent", "string");
        batch.add("C:fs9gps:NearestVorCurrentFrequency", "number", "number");
        batch.add("C:fs9gps:NearestVorCurrentType", "enum", "number");
        batch.add("C:fs9gps:NearestVorCurrentDistance", "nautical miles", "number");
        batch.add("C:fs9gps:NearestVorCurrentTrueBearing", "degrees", "number");
        batch.add("C:fs9gps:NearestVorSelectedVorLatitude", "degree latitude", "number");
        batch.add("C:fs9gps:NearestVorSelectedVorLongitude", "degree longitude", "number");
        batch.add("C:fs9gps:NearestVorCurrentICAO", "string", "string");

        const lat = SimVar.GetSimVarValue("PLANE LATITUDE", "degree latitude");
        const lon = SimVar.GetSimVarValue("PLANE LONGITUDE", "degree longitude");
        const alt = SimVar.GetSimVarValue("PLANE ALTITUDE", "feet");
        const planeLocation = new LatLongAlt(lat, lon, alt);
        SimVar.SetSimVarValue("C:fs9gps:NearestVorCurrentLatitude", "degree latitude", lat, "a320-neo-cdu-main-display-tuner-vor");
        SimVar.SetSimVarValue("C:fs9gps:NearestVorCurrentLongitude", "degree longitude", lon, "a320-neo-cdu-main-display-tuner-vor");
        SimVar.SetSimVarValue("C:fs9gps:NearestVorMaximumItems", "number", 40, "a320-neo-cdu-main-display-tuner-vor"); // max candidates is 20, but some might be discarded
        SimVar.SetSimVarValue("C:fs9gps:NearestVorMaximumDistance", "nautical miles", 381, "a320-neo-cdu-main-display-tuner-vor");
        SimVar.SetSimVarValue("C:fs9gps:NearestVorCurrentFilter", "enum", 255, "a320-neo-cdu-main-display-tuner-vor"); // doesn't seem to work

        const isDeselected = (navaid) => {
            return this.deselected.find((element) => {
                return element.ident === navaid.ident && element.frequency === navaid.frequency; // TODO fuzzy compare
            }) != undefined;
        };

        const isAvailable = (navaid) => {
            // TODO check if below horizon
            if (alt > 12000 && navaid.class === CLASS_TERMINAL) {
                return false;
            }
            if (alt > 18000 && navaid.class === CLASS_LOW_ALT) {
                return false;
            }
            // TODO check if below min ground range (1-9 Nm depending on EPE)
            // TODO duplicate freq. check
            const coneOfConfusionRadius = alt * Math.tan(30/180 * Math.PI) * 0.000164579;
            return navaid.fom !== undefined && navaid.distance > coneOfConfusionRadius;
        };

        const calcFom = (navaid) => {
            const distance = Avionics.Utils.computeGreatCircleDistance(navaid.location, planeLocation);
            if (alt <= 12000 && distance <= 40) {
                return 0;
            }
            if (alt <= 18000 && distance <= 70) {
                return 1;
            }
            if (navaid.distance <= 130) {
                return 2;
            }
            if (navaid.distance <= 250) {
                return 3;
            }
        };

        const addToList = (navaid, list) => {
            if (isDeselected(navaid) || !isAvailable(navaid)) {
                return;
            }
            for (let i = 0; i < list.length; i++) {
                if (list[i].ident == navaid.ident && list[i].frequency == navaid.frequency) { // TODO fuzzy compare
                    list[i].cyclesSinceVisible = 0;
                    list[i].bearing = navaid.bearing;
                    list[i].distance = navaid.distance;
                    list[i].location = navaid.location;
                    list[i].fom = calcFom(list[i]);
                    return;
                }
            }
            list.push(navaid);
        }

        SimVar.GetSimVarArrayValues(batch, (values) => {
            console.log(`Results: ${values.length}`);
            if (values.length < 1) {
                return;
            }
            for (let i = 0; i < values.length; i++) {
                const [ident, frequency, typ, distance, bearing, vorLat, vorLon, icao] = values[i];
                this.mcdu.dataManager.GetWaypointsByIdentAndType(icao.substring(1), icao[0]).then((data) => {
                    console.log(data);
                });
                //console.log(`Result ${i + 1}: ${ident} ${typ} ${distance.toFixed(1)} ${(frequency / 1000000).toFixed(2)}`);
                const navaid = {
                    ident: ident,
                    frequency: frequency / 1000000,
                    type: typ,
                    typeStr: TYPES[typ] || "UNKNOWN",
                    distance: distance,
                    bearing: bearing,
                    location: new LatLong(vorLat, vorLon),
                    cyclesSinceVisible: 0,
                    class: CLASS_HIGH_ALT // TODO impl
                };
                navaid.fom = calcFom(navaid);
                if (typ == TYPE_VORDME || typ == TYPE_DME || typ == TYPE_TACAN || typ == TYPE_VORTAC) {
                    addToList(navaid, this.dme);
                }
                if (typ == TYPE_ILS) {
                    addToList(navaid, this.ils);
                }
            }
        }, "a320-neo-cdu-main-display-tuner-vor");

        const cleanList = (list, check) => {
            list.sort((a, b) => {
                return a.distance < b.distance ? -1 : a.distance > b.distance ? 1 : 0;
            });
            for(let i = list.length - 1; i >= 0; i--) {
                if (list[i].cyclesSinceVisible > 2 || (check instanceof Function && check(list[i]))) {
                    list.splice(i, 1);
                }
            }
            if (list.length > 20) {
                list.splice(20);
            }
        };
        cleanList(this.dme, (navaid) => {
            return isDeselected(navaid) || !isAvailable(navaid);
        });
        cleanList(this.ils);
    }

    selectDisplayVor() {
        // Priority (highest to lowest)
        // 1 manually tuned (done in FMC radio nav logic)
        // 2 procedure specified TODO
        // 3 reference navaid (closest VOR/DME or VORTAC with 5 Nm of dest runway, aircraft is within 51 Nm of navaid, and no DME pair) TODO
        // 4 closest VOR/DME, and no DME pair TODO
        // 5 route navaid (any of next 5 TO waypoints within FoM) TODO
        // 6 closest VOR/DME within FoM
        for (let i = 0; i < this.dme.length; i++) {
            if (this.dme[i].type == TYPE_VORDME) {
                this.selectedDisplayVor = this.dme[i];
                return;
            }
        }

        // None available!
        this.selectedDisplayVor = undefined;
    }

    selectPositioningVor() {
        this.selectedVorDme = this.selectedDisplayVor; // TODO impl.
    }

    selectDme() {
        const alt = SimVar.GetSimVarValue("PLANE ALTITUDE", "feet");
        const pairs = [];
        for (let i = 0; i < this.dme.length - 1; i++) {
            for (let j = i + 1; j < this.dme.length; j++) {
                const angle = (360 + this.dme[i].bearing - this.dme[j].bearing) % 360;
                if (angle > 30 && angle < 150) {
                    pairs.push({
                        dme1: this.dme[i],
                        dme2: this.dme[j],
                        delta: Math.abs(angle - 90)
                    });
                }
            }
        }
        if (this.selectedDme1 && this.selectedDme2) {
            // The FMS looks for a new DME pair if any of the following occur:
            // - TODO The navaid tuned by the FMS is not identified by the received data.
            // - TODO There is a change in the navaid eligibility criteria previously listed.
            // - TODO The data has not been received or is unstable for 10 seconds.
            // - The angle formed between the DME pair and the aircraft goes outside 70° and 110° and another DME pair is available having a geometry at least 10° closer to the ideal 90° geometry.
            const angle = (360 + this.selectedDme1.bearing - this.selectedDme2.bearing) % 360;
            if (angle < 70 || angle > 110) {
                const minDelta = pairs.reduce((a, c) => a > c.delta ? c.delta : a);
                if ((Math.abs(angle - 90) - minDelta) < 10) {
                    return;
                }
                // fall through and select a new pair
            }
        }
        if (pairs.length < 1) {
            this.selectedDme1 = undefined;
            this.selectedDme2 = undefined;
            return;
        }
        if (alt < 12000) {
            // first pair are the closest, select them
            this.selectedDme1 = pairs[0].dme1;
            this.selectedDme2 = pairs[0].dme2;
        } else {
            // closest pair to 90 degrees wins
            pairs.sort((a, b) => {
                a.delta <= b.delta ? -1 : 1;
            });
            this.selectedDme1 = pairs[0].dme1;
            this.selectedDme2 = pairs[0].dme2;
        }
    }

    selectAdf() {
        // when NDB approach selected and a fix in approach is TO waypoint
        /*if (this.flightPlanManager.currentFlightPlanWaypointIndex >= this.flightPlanManager.getLastIndexBeforeApproach()) {
        }*/
    }

    updateILS(location) {
        // TODO update ILS search filter only on rising trigger for runway changed?

        console.log('updating ils...');
        const batch = new SimVar.SimVarBatch("C:fs9gps:NearestVorItemsNumber", "C:fs9gps:NearestVorCurrentLine");
        batch.add("C:fs9gps:NearestVorCurrentIdent", "string");
        batch.add("C:fs9gps:NearestVorCurrentFrequency", "number", "number");
        batch.add("C:fs9gps:NearestVorCurrentType", "enum", "number");
        batch.add("C:fs9gps:NearestVorCurrentDistance", "nautical miles", "number");
        batch.add("C:fs9gps:NearestVorCurrentTrueBearing", "degrees", "number");
        batch.add("C:fs9gps:NearestVorSelectedVorLatitude", "degree latitude", "number");
        batch.add("C:fs9gps:NearestVorSelectedVorLongitude", "degree longitude", "number");

        SimVar.SetSimVarValue("C:fs9gps:NearestVorCurrentFilter", "enum", 1 << TYPE_ILS, "FMCG-ILS"); // doesn't seem to work
        SimVar.SetSimVarValue("C:fs9gps:NearestVorCurrentLatitude", "degree latitude", location.lat, "FMCG-ILS");
        SimVar.SetSimVarValue("C:fs9gps:NearestVorCurrentLongitude", "degree longitude", location.long, "FMCG-ILS");
        SimVar.SetSimVarValue("C:fs9gps:NearestVorMaximumItems", "number", 40, "FMCG-ILS"); // TODO narrow down to end of runway
        SimVar.SetSimVarValue("C:fs9gps:NearestVorMaximumDistance", "nautical miles", 381, "FMCG-ILS");

        SimVar.GetSimVarArrayValues(batch, (values) => {
            console.log(`ILS Results: ${values.length}`);
            if (values.length < 1) {
                return;
            }
            for (let i = 0; i < values.length; i++) {
                const [ident, frequency, typ, distance, bearing, vorLat, vorLon] = values[i];
                console.log(`ILS Result ${i + 1}: ${ident} ${typ} ${distance.toFixed(1)} ${(frequency / 1000000).toFixed(2)}`);
            }
        }, "FMCG-ILS");

        // TODO pick ILS by distance and heading
    }

    guessIlsForRunway(rwy) {
        //console.log(JSON.stringify(rwy));

        const batch = new SimVar.SimVarBatch("C:fs9gps:NearestVorItemsNumber", "C:fs9gps:NearestVorCurrentLine");
        batch.add("C:fs9gps:NearestVorCurrentIdent", "string");
        batch.add("C:fs9gps:NearestVorCurrentFrequency", "number", "number");
        batch.add("C:fs9gps:NearestVorCurrentType", "enum", "number");
        batch.add("C:fs9gps:NearestVorCurrentDistance", "nautical miles", "number");
        batch.add("C:fs9gps:NearestVorCurrentTrueBearing", "degrees", "number");

        SimVar.SetSimVarValue("C:fs9gps:NearestVorCurrentLatitude", "degree latitude", rwy.latitude);
        SimVar.SetSimVarValue("C:fs9gps:NearestVorCurrentLongitude", "degree longitude", rwy.longitude);
        SimVar.SetSimVarValue("C:fs9gps:NearestVorMaximumItems", "number", 10);
        SimVar.SetSimVarValue("C:fs9gps:NearestVorMaximumDistance", "nautical miles", 1);
        SimVar.SetSimVarValue("C:fs9gps:NearestVorCurrentFilter", "enum", 1 << TYPE_ILS);

        return new Promise((resolve, reject) => {
            SimVar.GetSimVarArrayValues(batch, (values) => {
                console.log(`ILS Results: ${values.length}`);
                if (values.length < 1) {
                    return;
                }
                for (let i = 0; i < values.length; i++) {
                    const [ident, frequency, typ, distance, bearing] = values[i];
                    if (typ !== TYPE_ILS) {
                        console.warn(`guessIlsForRunway: discard ${ident}`);
                        continue;
                    }
                    const bearingDiff = (360 + bearing - rwy.direction) % 360;
                    const distDiff = Math.abs(rwy.length / 2 - distance * 1852);
                    if (bearingDiff < 1 && distDiff < 500) {
                        return resolve({
                            ident: ident,
                            frequency: frequency / 1000000
                        });
                    }
                }
                reject();
            });
        });
    }

    resetIls() {
        this.selectedIls = undefined;
        this.selectedIlsRwyIdent = undefined;
    }

    selectIls() {
        // in preflight or takeoff, when the TO runway has ILS
        // in climb, cruise, descent, approach, or go-around when type of approach is ILS

        // TODO try FPM first

        let freq, rwy, airport;

        if (this.mcdu.currentFlightPhase === FmgcFlightPhases.PREFLIGHT || this.mcdu.currentFlightPhase === FmgcFlightPhases.TAKEOFF) {
            freq = this.mcdu.flightPlanManager.getDepartureRunwayIlsFrequency();
            rwy = this.mcdu.flightPlanManager.getDepartureRunway();
            airport = this.mcdu.flightPlanManager.getOrigin();
        } else if ( // TODO within 300 nm of dest
            this.mcdu.currentFlightPhase == FmgcFlightPhases.CLIMB ||
            this.mcdu.currentFlightPhase == FmgcFlightPhases.CRUISE ||
            this.mcdu.currentFlightPhase == FmgcFlightPhases.DESCENT ||
            this.mcdu.currentFlightPhase == FmgcFlightPhases.APPROACH ||
            this.mcdu.currentFlightPhase == FmgcFlightPhases.GOAROUND
        ) {
            freq = this.mcdu.flightPlanManager.getApproachNavFrequency();
            rwy = this.mcdu.flightPlanManager.getApproachRunway();
            airport = this.mcdu.flightPlanManager.getDestination();
        }

        if (rwy) {
            this.updateILS(new LatLong(rwy.latitude, rwy.longitude));
        }
        return;

        if (isFinite(freq)) {
            console.log(`FPM ILS ${freq}`);
            this.selectedIls = {
                frequency: freq
            };
        } else if (rwy && airport) {
            const rwyIdent = airport.ident + rwy.designation;
            if (rwyIdent !== this.selectedIlsRwyIdent) {
                this.guessIlsForRunway(rwy).then((ils) => {
                    this.selectedIls = ils;
                    this.selectedIlsRwyIdent = rwyIdent;
                    console.log(`Select ILS ${ils.ident} ${ils.frequency.toFixed(2)} for ${this.selectedIlsRwyIdent}`);
                }, () => {
                    console.log(`No ILS for ${this.selectedIlsRwyIdent}`);
                    this.resetIls();
                });
            }
        } else if(this.selectedIls) {
            this.resetIls();
        }
    }

    update(_deltaTime, _core) {
        if (this.updateThrottler.canUpdate(_deltaTime) !== -1) {
            this.updateNavaids();
            const adirs_aligned = true; // TODO
            if (adirs_aligned) {
                this.selectDisplayVor();
                this.selectPositioningVor();
                this.selectDme();
                this.selectAdf();
                this.selectIls();

                /*console.log(`Selected display VOR/DME: ${JSON.stringify(this.selectedDisplayVor)}`);
                console.log(`Selected DME pair 1: ${JSON.stringify(this.selectedDme1)}`);
                console.log(`Selected DME pair 2: ${JSON.stringify(this.selectedDme2)}`);
                console.log(`Selected ILS: ${JSON.stringify(this.selectedIls)}`);*/
            }
        }
    }
}
