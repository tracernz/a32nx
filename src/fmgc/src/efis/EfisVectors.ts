import { GuidanceController } from '@fmgc/guidance/GuidanceController';
import { EfisSide, EfisVectorsGroup, Mode, rangeSettings } from '@shared/NavigationDisplay';
import { ArcPathVector, LinePathVector, PathVector } from '@fmgc/guidance/lnav/PathVector';
import { LnavConfig } from '@fmgc/guidance/LnavConfig';
import { LateralMode } from '@shared/autopilot';
import { withinEditArea } from '@fmgc/efis/EfisCommon';

const TRANSMIT_GROUP_SIZE = 4;

export class EfisVectors {
    private listener = RegisterViewListener('JS_LISTENER_SIMVARS');

    private blockUpdate = false;

    constructor(
        private guidanceController: GuidanceController,
    ) {
    }

    private currentActiveVectors = [];

    private currentDashedVectors = [];

    public update(_deltaTime: number): void {
        if (this.blockUpdate) {
            return;
        }

        if (LnavConfig.DEBUG_PERF) {
            console.time('vectors transmit');
        }

        const activeFlightPlanVectors = this.guidanceController.currentMultipleLegGeometry.getAllPathVectors()
            .filter((vector) => this.vectorWithinCurrentEditArea(vector, 'L') || this.vectorWithinCurrentEditArea(vector, 'R'));

        // ACTIVE

        const engagedLateralMode = SimVar.GetSimVarValue('L:A32NX_FMA_LATERAL_MODE', 'Number') as LateralMode;
        const armedLateralMode = SimVar.GetSimVarValue('L:A32NX_FMA_LATERAL_ARMED', 'Enum');
        const navArmed = (armedLateralMode >> 0) & 1;

        const transmitActive = engagedLateralMode === LateralMode.NAV || navArmed;
        const clearActive = !transmitActive && this.currentActiveVectors.length > 0;

        if (transmitActive) {
            this.currentActiveVectors = activeFlightPlanVectors;

            this.transmitCurrentActive();
        }

        if (clearActive) {
            this.currentActiveVectors = [];

            this.transmitCurrentActive();
        }

        // DASHED

        const transmitDashed = !transmitActive; // TODO offset consideration
        const clearDashed = !transmitDashed && this.currentDashedVectors.length > 0;

        if (transmitDashed) {
            this.currentDashedVectors = activeFlightPlanVectors;

            this.transmitCurrentDashed();
        }

        if (clearDashed) {
            this.currentDashedVectors = [];

            this.transmitCurrentDashed();
        }

        if (LnavConfig.DEBUG_PERF) {
            console.timeEnd('vectors transmit');
        }

        // make sure we don't run too often
        this.blockUpdate = true;
        setTimeout(() => {
            this.blockUpdate = false;
        }, 5_000);
    }

    private vectorWithinCurrentEditArea(vector: PathVector, efisSide: EfisSide): boolean {
        const range = rangeSettings[SimVar.GetSimVarValue(`L:A32NX_EFIS_${efisSide}_ND_RANGE`, 'number')];
        const mode: Mode = SimVar.GetSimVarValue(`L:A32NX_EFIS_${efisSide}_ND_MODE`, 'number');

        const ppos = this.guidanceController.lnavDriver.ppos;
        const planCentre = this.guidanceController.focusedWaypointCoordinates;

        const trueHeading = SimVar.GetSimVarValue('PLANE HEADING DEGREES TRUE', 'degrees');

        const startWithin = withinEditArea(vector.startPoint, range, mode, mode === Mode.PLAN ? planCentre : ppos, trueHeading);

        if ((vector as any).endPoint) {
            const endWithin = withinEditArea((vector as (LinePathVector | ArcPathVector)).endPoint ?? { lat: 0, long: 0 }, range, mode, mode === Mode.PLAN ? planCentre : ppos, trueHeading);

            return startWithin || endWithin;
        }

        return startWithin;
    }

    private transmitCurrentActive(): void {
        this.transmit(this.currentActiveVectors, EfisVectorsGroup.ACTIVE, 'L');
        this.transmit(this.currentActiveVectors, EfisVectorsGroup.ACTIVE, 'R');
    }

    private transmitCurrentDashed(): void {
        this.transmit(this.currentDashedVectors, EfisVectorsGroup.DASHED, 'L');
        this.transmit(this.currentDashedVectors, EfisVectorsGroup.DASHED, 'R');
    }

    private transmit(vectors: PathVector[], vectorsGroup: EfisVectorsGroup, side: EfisSide): void {
        this.guidanceController.runStepTask(function* task() {
            const numGroups = Math.floor(vectors.length / TRANSMIT_GROUP_SIZE);

            if (LnavConfig.DEBUG_PATH_DRAWING) {
                console.log(`[FMS/Vectors/Transmit] Starting transmit: numVectors=${vectors.length} groupSize=${TRANSMIT_GROUP_SIZE} numGroups=${numGroups}`);
            }

            for (let i = 0; i < numGroups; i++) {
                this.listener.triggerToAllSubscribers(
                    `A32NX_EFIS_VECTORS_${side}_${EfisVectorsGroup[vectorsGroup]}`,
                    vectors.slice(i * TRANSMIT_GROUP_SIZE, (i + 1) * TRANSMIT_GROUP_SIZE),
                    i * TRANSMIT_GROUP_SIZE,
                );
                if (LnavConfig.DEBUG_PATH_DRAWING) {
                    console.log(`[FMS/Vectors/Transmit] Transmitted group #${i}...`);
                }
                yield;
            }

            const lastStartIndex = numGroups * TRANSMIT_GROUP_SIZE;

            this.listener.triggerToAllSubscribers(
                `A32NX_EFIS_VECTORS_${side}_${EfisVectorsGroup[vectorsGroup]}`,
                vectors.slice(lastStartIndex, vectors.length),
                lastStartIndex,
            );

            if (LnavConfig.DEBUG_PATH_DRAWING) {
                console.log('[FMS/Vectors/Transmit] Done with transmit.');
            }
        }.bind(this));
    }
}
