import { Arinc429Register } from '@shared/arinc429';
import { ClockEvents, EventBus, DisplayComponent, FSComponent, Subject, VNode } from 'msfssdk';
import { EwdSimvars } from './shared/EwdSimvarPublisher';

interface IdleProps {
    bus: EventBus;
}
export class Idle extends DisplayComponent<IdleProps> {
    private textClass = Subject.create('');

    private visibility = Subject.create('hidden');

    private readonly ecu1ADiscrete3 = Arinc429Register.empty();

    private readonly ecu1BDiscrete3 = Arinc429Register.empty();

    private readonly ecu2ADiscrete3 = Arinc429Register.empty();

    private readonly ecu2BDiscrete3 = Arinc429Register.empty();

    private fwcFlightPhase: number = 0;

    private autoThrustStatus: number = 0;

    private lastVisibleState: boolean = false;

    private flashTimer;

    onAfterRender(node: VNode): void {
        super.onAfterRender(node);

        const sub = this.props.bus.getSubscriber<ClockEvents & EwdSimvars>();

        sub.on('ecu1ADiscrete3').whenChanged().handle((d) => this.ecu1ADiscrete3.set(d));
        sub.on('ecu1BDiscrete3').whenChanged().handle((d) => this.ecu1BDiscrete3.set(d));
        sub.on('ecu2ADiscrete3').whenChanged().handle((d) => this.ecu2ADiscrete3.set(d));
        sub.on('ecu2BDiscrete3').whenChanged().handle((d) => this.ecu2BDiscrete3.set(d));

        sub.on('fwcFlightPhase').whenChanged().handle((p) => {
            this.fwcFlightPhase = p;
        });

        sub.on('autoThrustStatus').whenChanged().handle((s) => {
            this.autoThrustStatus = s;
        });

        sub.on('realTime').atFrequency(2).handle((_t) => {
            const engine1Idle = this.ecu1ADiscrete3.bitValueOr(29, false) || this.ecu1BDiscrete3.bitValueOr(29, false);
            const engine2Idle = this.ecu2ADiscrete3.bitValueOr(29, false) || this.ecu2BDiscrete3.bitValueOr(29, false);

            const showIdle = engine1Idle && engine2Idle && this.fwcFlightPhase >= 5 && this.fwcFlightPhase <= 7 && this.autoThrustStatus !== 0;

            this.visibility.set(showIdle ? 'visible' : 'hidden');

            const flash = showIdle && showIdle !== this.lastVisibleState;
            this.lastVisibleState = showIdle;

            if (flash) {
                this.textClass.set('Large Center GreenTextPulse');
                this.flashTimer = setTimeout(() => {
                    this.textClass.set('Large Center Green');
                }, 10 * 1000);
            } else if (!showIdle) {
                clearTimeout(this.flashTimer);
            }
        });
    }

    render(): VNode {
        return (
            <text class={this.textClass} x={374} y={55} visibility={this.visibility}>IDLE</text>
        );
    }
}
