//  Copyright (c) 2021 FlyByWire Simulations
//  SPDX-License-Identifier: GPL-3.0

import { Geometry } from '@fmgc/guidance/Geometry';
import { PseudoWaypoint } from '@fmgc/guidance/PsuedoWaypoint';
import { PseudoWaypoints } from '@fmgc/guidance/lnav/PseudoWaypoints';
import { EfisVectors } from '@fmgc/efis/EfisVectors';
import { Coordinates } from '@fmgc/flightplanning/data/geo';
import { LnavDriver } from './lnav/LnavDriver';
import { FlightPlanManager } from '../flightplanning/FlightPlanManager';
import { GuidanceManager } from './GuidanceManager';
import { VnavDriver } from './vnav/VnavDriver';

// How often the (milliseconds)
const GEOMETRY_RECOMPUTATION_TIMER = 5_000;

export class GuidanceController {
    public flightPlanManager: FlightPlanManager;

    public guidanceManager: GuidanceManager;

    public lnavDriver: LnavDriver;

    public vnavDriver: VnavDriver;

    public pseudoWaypoints: PseudoWaypoints;

    public efisVectors: EfisVectors;

    public currentMultipleLegGeometry: Geometry | null;

    public activeLegIndex: number;

    public activeTransIndex: number;

    public activeLegDtg: NauticalMiles;

    public activeLegCompleteLegPathDtg: NauticalMiles;

    public displayActiveLegCompleteLegPathDtg: NauticalMiles;

    public focusedWaypointCoordinates: Coordinates = { lat: 0, long: 0 };

    public currentPseudoWaypoints: PseudoWaypoint[] = [];

    public automaticSequencing: boolean = true;

    private taskQueue: (() => Generator)[] = [];

    constructor(flightPlanManager: FlightPlanManager, guidanceManager: GuidanceManager) {
        this.flightPlanManager = flightPlanManager;
        this.guidanceManager = guidanceManager;

        this.lnavDriver = new LnavDriver(this);
        this.vnavDriver = new VnavDriver(this);
        this.pseudoWaypoints = new PseudoWaypoints(this);
        this.efisVectors = new EfisVectors(this);
    }

    init() {
        console.log('[FMGC/Guidance] GuidanceController initialized!');

        this.lnavDriver.ppos.lat = SimVar.GetSimVarValue('PLANE LATITUDE', 'degree latitude');
        this.lnavDriver.ppos.long = SimVar.GetSimVarValue('PLANE LONGITUDE', 'degree longitude');

        this.generateNewGeometry(this.flightPlanManager.getActiveWaypointIndex(), this.flightPlanManager.getWaypoints().length);

        this.lnavDriver.init();
        this.vnavDriver.init();
        this.pseudoWaypoints.init();
    }

    private lastFlightPlanVersion = SimVar.GetSimVarValue(FlightPlanManager.FlightPlanVersionKey, 'number');

    private geometryRecomputationTimer = GEOMETRY_RECOMPUTATION_TIMER + 1;

    update(deltaTime: number) {
        this.geometryRecomputationTimer += deltaTime;

        this.activeLegIndex = this.flightPlanManager.getActiveWaypointIndex();

        try {
            // Generate new geometry when flight plan changes
            const newFlightPlanVersion = this.flightPlanManager.currentFlightPlanVersion;
            if (newFlightPlanVersion !== this.lastFlightPlanVersion) {
                this.lastFlightPlanVersion = newFlightPlanVersion;

                this.generateNewGeometry(this.flightPlanManager.getActiveWaypointIndex(), this.flightPlanManager.getWaypoints().length);
                this.geometryRecomputationTimer = 0;
            }

            if (this.geometryRecomputationTimer > GEOMETRY_RECOMPUTATION_TIMER) {
                this.geometryRecomputationTimer = 0;

                this.recomputeGeometry();

                if (this.currentMultipleLegGeometry) {
                    this.vnavDriver.acceptMultipleLegGeometry(this.currentMultipleLegGeometry);
                    this.pseudoWaypoints.acceptMultipleLegGeometry(this.currentMultipleLegGeometry);
                }
            }

            // PLAN mode center

            const focusedWpIndex = SimVar.GetSimVarValue('L:A32NX_SELECTED_WAYPOINT', 'number');
            const focusedWp = this.flightPlanManager.getWaypoint(focusedWpIndex);

            if (focusedWp) {
                this.focusedWaypointCoordinates.lat = focusedWp.infos.coordinates.lat;
                this.focusedWaypointCoordinates.long = focusedWp.infos.coordinates.long;

                SimVar.SetSimVarValue('L:A32NX_SELECTED_WAYPOINT_LAT', 'Degrees', this.focusedWaypointCoordinates.lat);
                SimVar.SetSimVarValue('L:A32NX_SELECTED_WAYPOINT_LONG', 'Degrees', this.focusedWaypointCoordinates.long);
            }

            // Main loop

            this.lnavDriver.update(deltaTime);
            this.vnavDriver.update(deltaTime);
            this.pseudoWaypoints.update(deltaTime);
            this.efisVectors.update(deltaTime);

            this.updateTasks();
        } catch (e) {
            console.error('[FMS] Error during tick. See exception below.');
            console.error(e);
        }
    }

    private currentTask: Generator = null;

    private updateTasks() {
        if (!this.currentTask && this.taskQueue.length > 0) {
            const nextTaskExecutor = this.taskQueue.shift();

            if (nextTaskExecutor) {
                this.currentTask = nextTaskExecutor();
            }
        }

        if (this.currentTask) {
            const done = this.currentTask.next().done;

            if (done) {
                this.currentTask = null;
            }
        }
    }

    /**
     * Called when the lateral flight plan is changed
     */
    generateNewGeometry(activeIdx: number, wptCount: number) {
        if (this.currentMultipleLegGeometry) {
            this.guidanceManager.updateGeometry(this.currentMultipleLegGeometry, activeIdx, wptCount);
        } else {
            this.currentMultipleLegGeometry = this.guidanceManager.getMultipleLegGeometry();
        }

        this.recomputeGeometry();

        this.geometryRecomputationTimer = 0;
        this.vnavDriver.acceptMultipleLegGeometry(this.currentMultipleLegGeometry);
        this.pseudoWaypoints.acceptMultipleLegGeometry(this.currentMultipleLegGeometry);
    }

    recomputeGeometry() {
        const tas = SimVar.GetSimVarValue('AIRSPEED TRUE', 'Knots');
        const gs = SimVar.GetSimVarValue('GPS GROUND SPEED', 'meters per second');

        if (this.currentMultipleLegGeometry) {
            this.currentMultipleLegGeometry.recomputeWithParameters(tas, gs, this.lnavDriver.ppos, this.activeLegIndex, this.activeTransIndex);
        }
    }

    public runStepTask(executor: () => Generator) {
        this.taskQueue.push(executor);
    }

    /**
     * Notifies the FMS that a pseudo waypoint must be sequenced.
     *
     * This is to be sued by {@link LnavDriver} only.
     *
     * @param pseudoWaypoint the {@link PseudoWaypoint} to sequence.
     */
    public sequencePseudoWaypoint(pseudoWaypoint: PseudoWaypoint): void {
        this.pseudoWaypoints.sequencePseudoWaypoint(pseudoWaypoint);
    }
}
