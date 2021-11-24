import { GuidanceController } from '@fmgc/guidance/GuidanceController';
import { EfisSide, NdFlightPlan } from '@shared/NavigationDisplay';
import { PathVector } from '@fmgc/guidance/lnav/PathVector';
import { LnavConfig } from '@fmgc/guidance/LnavConfig';

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

        this.transmit(activeVectors, NdFlightPlan.ACTIVE, 'L');
        this.transmit(activeVectors, NdFlightPlan.ACTIVE, 'R');

        if (LnavConfig.DEBUG_PERF) {
            console.timeEnd('vectors transmit');
        }

        // make sure we don't run too often
        this.blockUpdate = true;
        setTimeout(() => {
            this.blockUpdate = false;
        }, 5_000);
    }

    private transmit(vectors: PathVector[], group: NdFlightPlan, side: EfisSide): void {
        this.listener.triggerToAllSubscribers(`A32NX_EFIS_VECTORS_${side}_${NdFlightPlan[group]}`, vectors);
    }
}
