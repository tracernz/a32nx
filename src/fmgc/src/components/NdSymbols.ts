import { NavDataManager } from "@fmgc/database/NavDataManager";
import { VhfNavaid, VhfNavaidType, VorClass } from "@fmgc/database/Types";
import { FlightPlanManager } from "@fmgc/flightplanning/FlightPlanManager";
import { FmgcComponent } from "@fmgc/lib/FmgcComponent";
import { NavRadioManager } from "@fmgc/radionav/NavRadioManager";
import { NdSymbol, NdSymbolTypeFlags } from "@shared/NdSymbols";
import { LatLongData } from "@typings/fs-base-ui";
import { Degrees, NauticalMiles } from "../../../../typings";


// TODO share
export type RangeSetting = 10 | 20 | 40 | 80 | 160 | 320;
export const rangeSettings: RangeSetting[] = [10, 20, 40, 80, 160, 320];

export enum Mode {
    ROSE_ILS,
    ROSE_VOR,
    ROSE_NAV,
    ARC,
    PLAN,
}

export enum EfisOption {
    None = 0,
    Constraints = 1,
    VorDmes = 2,
    Waypoints = 3,
    Ndbs = 4,
    Airports = 5,
}

interface FixInfo {
    fix: VhfNavaid,
    radius?: NauticalMiles,
    radials?: Degrees[], // magnetic
}

export class NdSymbols implements FmgcComponent {
    // TODO check time
    private updateThrottler;
    private listener = RegisterViewListener('JS_LISTENER_SIMVARS');

    private static sides = ['L', 'R'];
    private lastMode = { L: 0, R: 0 };
    private lastRange = { L: 10, R: 10 };
    private lastEfisOption = { L: 0, R: 0 };
    private lastPpos: LatLongData = { lat: 0, long: 0 };

    // TODO temp
    private fixInfos: FixInfo[] = [];

    constructor() {
    }

    init(): void {
        this.updateThrottler = new UpdateThrottler(10000);

        this.fixInfos.push({
            fix: {
                databaseId: 'VNZ    WN',
                ident: 'WN',
                frequency: 112.3,
                figureOfMerit: 3,
                stationDeclination: -22,
                vorLocation: new LatLongAlt(-41.3372078, 174.8169722),
                dmeLocation: new LatLongAlt(-41.3372078, 174.8169722),
                type: VhfNavaidType.VorDme,
                class: VorClass.HighAlt,
            },
            radius: 7,
            radials: [160, 190],
        });
    }

    update(deltaTime: number): void {
        // TODO gotta respond faster than this
        /*if (this.updateThrottler.canUpdate(deltaTime) === -1) {
            return;
        }*/

        // TODO use FMGC position
        const ppos = {
            lat: SimVar.GetSimVarValue('PLANE LATITUDE', 'degree latitude'),
            long: SimVar.GetSimVarValue('PLANE LONGITUDE', 'degree longitude'),
        };
        const pposChanged = Avionics.Utils.computeDistance(this.lastPpos, ppos) > 2;
        this.lastPpos = ppos;
        const trueHeading = SimVar.GetSimVarValue('PLANE HEADING DEGREES TRUE', 'radians');

        if (pposChanged) {
            this.updateMora();
        }

        const flightPlanManager = FlightPlanManager.DEBUG_INSTANCE; // TODO hmmm
        const activeFp = flightPlanManager.getCurrentFlightPlan();

        NdSymbols.sides.forEach((side) => {
            const range = rangeSettings[SimVar.GetSimVarValue(`L:A32NX_EFIS_${side}_ND_RANGE`, 'number')];
            const mode: Mode = SimVar.GetSimVarValue(`L:A32NX_EFIS_${side}_ND_MODE`, 'number');
            const efisOption = SimVar.GetSimVarValue(`L:A32NX_EFIS_${side}_OPTION`, 'enum');

            const rangeChange = this.lastRange[side] !== range;
            this.lastRange[side] = range;
            const modeChange = this.lastMode[side] !== mode;
            this.lastMode[side] = mode;
            const efisOptionChange = this.lastEfisOption[side] !== efisOption;
            this.lastEfisOption[side] = efisOption;

            // TODO tuned navaids changed, fp changed, ???

            // TODO navdata changed? flightplan changed?
            if (!pposChanged && !rangeChange && !modeChange && !efisOptionChange) {
                return;
            }

            console.log(`updating symbols ${side} range mode efis ppos`, rangeChange, modeChange, efisOptionChange, pposChanged);

            const [editAhead, editBehind, editBeside] = this.calculateEditArea(range, mode);

            const symbols: NdSymbol[] = new Array();

            if (efisOption === EfisOption.VorDmes) {
                for (let i = 0; i < NavDataManager.instance.nearbyVhfNavaids.length; i++) {
                    const vor = NavDataManager.instance.nearbyVhfNavaids[i];
                    if (vor.type !== VhfNavaidType.Vor && vor.type !== VhfNavaidType.VorDme && vor.type !== VhfNavaidType.Dme) {
                        continue;
                    }
                    const dist = Avionics.Utils.computeGreatCircleDistance(ppos, vor.vorLocation);
                    const bearing = Avionics.Utils.computeGreatCircleDistance(ppos, vor.vorLocation) * Math.PI / 180;
                    const dx = dist * Math.cos(bearing - trueHeading);
                    const dy = -dist * Math.sin(bearing - trueHeading);
                    if (Math.abs(dx) < editBeside && dy > -editBehind && dy < editAhead) {
                        const symbol: NdSymbol = {
                            databaseId: vor.databaseId,
                            ident: vor.ident,
                            location: vor.vorLocation ?? vor.dmeLocation,
                            type: this.vorDmeTypeFlag(vor) | NdSymbolTypeFlags.EfisOption,
                        };
                        symbols.push(symbol);
                    }
                }
            } else if (efisOption === EfisOption.Ndbs) {
                for (let i = 0; i < NavDataManager.instance.nearbyNdbNavaids.length; i++) {
                    const ndb = NavDataManager.instance.nearbyNdbNavaids[i];

                    const dist = Avionics.Utils.computeGreatCircleDistance(ppos, ndb.location);
                    const bearing = Avionics.Utils.computeGreatCircleDistance(ppos, ndb.location) * Math.PI / 180;
                    const dx = dist * Math.cos(bearing - trueHeading);
                    const dy = -dist * Math.sin(bearing - trueHeading);
                    if (Math.abs(dx) < editBeside && dy > -editBehind && dy < editAhead) {
                        const symbol: NdSymbol = {
                            databaseId: ndb.databaseId,
                            ident: ndb.ident,
                            location: ndb.location,
                            type: NdSymbolTypeFlags.Ndb | NdSymbolTypeFlags.EfisOption,
                        };
                        symbols.push(symbol);
                    }
                }
            }

            NavRadioManager.instance.tunedVhfNavaids().forEach(vor => {
                const symbol = symbols.find((sym) => sym.databaseId === vor.databaseId);
                if (symbol) {
                    symbol.type |= NdSymbolTypeFlags.Tuned;
                } else {
                    symbols.push({
                        databaseId: vor.databaseId,
                        ident: vor.ident,
                        location: vor.vorLocation ?? vor.dmeLocation,
                        type: this.vorDmeTypeFlag(vor) | NdSymbolTypeFlags.Tuned,
                    });
                }
            });

            NavRadioManager.instance.tunedNdbNavaids().forEach(ndb => {
                const symbol = symbols.find((sym) => sym.databaseId === ndb.databaseId);
                if (symbol) {
                    symbol.type |= NdSymbolTypeFlags.Tuned;
                } else {
                    symbols.push({
                        databaseId: ndb.databaseId,
                        ident: ndb.ident,
                        location: ndb.location,
                        type: NdSymbolTypeFlags.Ndb | NdSymbolTypeFlags.Tuned,
                    });
                }
            });

            const formatConstraintAlt = (alt: number, prefix: string = '') => {
                const transAlt = 13000;
                const transFl = 150;
                // TODO transFl
                if (alt >= transAlt) {
                    return `${prefix}FL${Math.floor(alt / 100)}`;
                }
                return `${prefix}${Math.floor(alt)}`;
            }

            const formatConstraintSpeed = (speed: number, prefix: string = '') => {
                return `${prefix}${Math.floor(speed)} KT`;
            }

            for (let i = 0; i < activeFp.length; i++) {
                const wp = activeFp.getWaypoint(i);
                // TODO check if already in symbols list and update if so
                let type = 0;
                let constraints = [];

                // TODO skip old ones

                // TODO if range >= 160, don't include terminal procs

                if (wp.type === 'A') {
                    type = NdSymbolTypeFlags.Airport;
                    // TODO runway if selected
                } else {
                    type = NdSymbolTypeFlags.Waypoint;
                }

                if (wp.legAltitudeDescription !== 0) {
                    // TODO vnav to predict
                    type |= NdSymbolTypeFlags.ConstraintUnknown;
                }

                if (efisOption === EfisOption.Constraints && wp.type !== 'A') {
                    switch (wp.legAltitudeDescription) {
                        case 1:
                            constraints.push(formatConstraintAlt(wp.legAltitude1));
                            break;
                        case 2:
                            constraints.push(formatConstraintAlt(wp.legAltitude1, '+'));
                            break;
                        case 3:
                            constraints.push(formatConstraintAlt(wp.legAltitude1, '-'));
                            break;
                        case 4:
                            constraints.push(formatConstraintAlt(wp.legAltitude1, '-'));
                            constraints.push(formatConstraintAlt(wp.legAltitude2, '+'));
                            break;
                    }

                    if (wp.speedConstraint > 0) {
                        constraints.push(formatConstraintSpeed(wp.speedConstraint));
                    }
                }

                const symbol: NdSymbol = {
                    databaseId: wp.databaseId,
                    ident: wp.ident,
                    location: wp.infos.coordinates,
                    type: type,
                };
                if (constraints.length > 0) {
                    symbol.constraints = constraints;
                }

                symbols.push(symbol);
            }

            this.fixInfos.forEach((fix) => {
                symbols.push({
                    databaseId: fix.fix.databaseId,
                    ident: fix.fix.ident,
                    location: fix.fix.vorLocation ?? fix.fix.dmeLocation,
                    type: NdSymbolTypeFlags.VorDme | NdSymbolTypeFlags.FixInfo,
                });
            });

            // TODO limit to 640 words => map partly displayed

            setTimeout(() => {
                this.listener.triggerToAllSubscribers(`A32NX_EFIS_${side}_SYMBOLS`, symbols);
            }, 400);
        });
    }

    private async updateMora(): Promise<void> {
        const bottomLeft = Avionics.Utils.bearingDistanceToCoordinates(225, 40, ppos.lat, ppos.long);
        const topRight = Avionics.Utils.bearingDistanceToCoordinates(45, 40, ppos.lat, ppos.long);
        const minLat = Math.floor(bottomLeft.lat);
        const maxLat = Math.ceil(topRight.lat);
        const minLon = Math.floor(bottomLeft.long);
        const maxLon = Math.ceil(topRight.long);
        const latRange = (maxLat - minLat) % 90;
        const lonRange = (maxLon - minLon) % 180;
        const grids = new Array();
        for (let lat = 0; lat < latRange; lat++) {
            for (let lon = 0; lon < lonRange; lon++) {
                grids.push([(minLat + lat) % 90, (minLon + lon) % 180]);
            }
        }
        NavDataManager.instance.database.getMora(grids).then((moras) => {
            let mora = -1;
            if (Object.keys(moras).length > 0) {
                mora = Object.values(moras).reduce((mora, candidate) => Math.max(mora, candidate));
                console.log(mora);
            }
            SimVar.SetSimVarValue(`L:A32NX_FMGC1_MORA`, 'number', mora);
            SimVar.SetSimVarValue(`L:A32NX_FMGC2_MORA`, 'number', mora);
        });
    }

    private vorDmeTypeFlag(vor: VhfNavaid): NdSymbolTypeFlags {
        switch (vor.type) {
        case VhfNavaidType.VorDme:
        case VhfNavaidType.Vortac:
            return NdSymbolTypeFlags.VorDme;
        case VhfNavaidType.Vor:
            return NdSymbolTypeFlags.Vor;
        case VhfNavaidType.Dme:
        case VhfNavaidType.Tacan:
            return NdSymbolTypeFlags.Dme;
        default:
            return 0;
        }
    }

    private calculateEditArea(range: RangeSetting, mode: Mode): [number, number, number] {
        switch (mode) {
        case Mode.ARC:
            if (range <= 10) {
                return [10.5, 3.5, 8.3];
            } else if (range <= 20) {
                return [20.5, 7, 16.6];
            } else if (range <= 40) {
                return [40.5, 14, 33.2];
            } else if (range <= 80) {
                return [80.5, 28, 66.4];
            } else if (range <= 160) {
                return [160.5, 56, 132.8];
            } else {
                return [320.5, 112, 265.6];
            }
        case Mode.ROSE_NAV:
            if (range <= 10) {
                return [7.6, 7.1, 7.1];
            } else if (range <= 20) {
                return [14.7, 14.2, 14.2];
            } else if (range <= 40) {
                return [28.9, 28.4, 28.4];
            } else if (range <= 80) {
                return [57.3, 56.8, 56.8];
            } else if (range <= 160) {
                return [114.1, 113.6, 113.6];
            } else {
                return [227.7, 227.2, 227.2];
            }
        case Mode.PLAN:
            if (range <= 10) {
                return [7, 7, 7];
            } else if (range <= 20) {
                return [14, 14, 14];
            } else if (range <= 40) {
                return [28, 28, 28];
            } else if (range <= 80) {
                return [56, 56, 56];
            } else if (range <= 160) {
                return [112, 112, 112];
            } else {
                return [224, 224, 224];
            }
        default:
            return [0, 0, 0];
        }
    }
}
