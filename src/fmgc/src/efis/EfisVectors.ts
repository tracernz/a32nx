import { GuidanceController } from '@fmgc/guidance/GuidanceController';
import { EfisSide, EfisVectorsGroup } from '@shared/NavigationDisplay';
import { PathVector } from '@fmgc/guidance/lnav/PathVector';
import { LnavConfig } from '@fmgc/guidance/LnavConfig';
import { LateralMode } from '@shared/autopilot';

export class EfisVectors {
    private listener = RegisterViewListener('JS_LISTENER_SIMVARS');

    private blockUpdate = false;

    constructor(
        private guidanceController: GuidanceController,
    ) {
    }

    public update(_deltaTime: number): void {
        if (this.blockUpdate) {
            return;
        }

        if (LnavConfig.DEBUG_PERF) {
            console.time('vectors transmit');
        }

        const activeVectors = this.guidanceController.currentMultipleLegGeometry.getAllPathVectors();

        const lateralMode = SimVar.GetSimVarValue('L:A32NX_FMA_LATERAL_MODE', 'Number') as LateralMode;

        const vectorsGroup = lateralMode === LateralMode.NAV ? EfisVectorsGroup.ACTIVE : EfisVectorsGroup.DASHED;

        this.transmit(activeVectors, vectorsGroup, 'L');
        this.transmit(activeVectors, vectorsGroup, 'R');

        if (LnavConfig.DEBUG_PERF) {
            console.timeEnd('vectors transmit');
        }

        // make sure we don't run too often
        this.blockUpdate = true;
        setTimeout(() => {
            this.blockUpdate = false;
        }, 5_000);
    }

    private transmit(vectors: PathVector[], group: EfisVectorsGroup, side: EfisSide): void {
        this.listener.triggerToAllSubscribers(`A32NX_EFIS_VECTORS_${side}_${EfisVectorsGroup[group]}`, vectors);
    }
}
