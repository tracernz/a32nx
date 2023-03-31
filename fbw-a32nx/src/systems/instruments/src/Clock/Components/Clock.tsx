import { ComponentProps, DisplayComponent, FSComponent, EventBus, VNode, Subject, ConsumerSubject, ClockEvents, MappedSubject, Subscription } from '@microsoft/msfs-sdk';
import { ClockSimvars } from '../shared/ClockSimvarPublisher';

interface ClockProps extends ComponentProps {
    bus: EventBus;
}

export class Clock extends DisplayComponent<ClockProps> {
    private static readonly dateCache = new Date(0);

    private readonly sub = this.props.bus.getSubscriber<ClockEvents & ClockSimvars>();

    private readonly clockPowered = ConsumerSubject.create(null, false);

    /** Toggles date mode, or activates the digit test function while held when ANN LT TEST is active */
    private readonly datePushbutton = ConsumerSubject.create(null, false);

    /** Date mode shows the date as MM:DD:YY in place of the clock */
    private readonly dateMode = Subject.create(false);

    /** The large sized clock text, format = HH:MM in normal mode, MM:DD in date mode, or NN:NN in ANN LT TEST */
    private readonly clockTextBig = Subject.create('');

    /** The small sized clock text, format = SS in normal mode or YY in date mode, or NN in ANN LT TEST */
    private readonly clockTextSmall = Subject.create('');

    /** current sim time in milliseconds since the Unix epoch (JS timestamp) */
    private readonly simTime = ConsumerSubject.create(null, 0);

    /** Annunciator Light switch position on the overhead
     * - 0: ANN LT TEST
     * - 1: Bright
     * - 2: Dim
     */
    private readonly annunciatorLightSwitchPosition = ConsumerSubject.create(null, 1);

    // FIXME extract light test electrical logic out of here
    private readonly lightTestPowered = ConsumerSubject.create(null, false);

    /** True when the ANN LT TEST is in the test position and all power sources required for the signal are available */
    private readonly lightTestActive = MappedSubject.create(
        ([annPosition, testPowered, clockPowered]) => annPosition === 0 && testPowered && clockPowered,
        this.annunciatorLightSwitchPosition,
        this.lightTestPowered,
        this.clockPowered,
    )

    /** True when the ANN LT TEST is ON and the DATE button is held; the digits are tested in sequence from 0-9 */
    private readonly digitTestActive = MappedSubject.create(
        ([lightTest, datePushbutton]) => lightTest && datePushbutton,
        this.lightTestActive,
        this.datePushbutton,
    );

    /** The N digit shown in each segment during ANN LT TEST */
    private readonly lightTestDigit = Subject.create(8);

    /** Paused when in ANN LT test mode */
    private timeUpdateTickSub?: Subscription;

    /** Paused unless digit test is active */
    private digitTestTickSub?: Subscription;

    public onAfterRender(node: VNode): void {
        super.onAfterRender(node);

        this.clockPowered.setConsumer(this.sub.on('dcHot1IsPowered'));

        this.simTime.setConsumer(this.sub.on('simTime').atFrequency(1)).pause();

        this.datePushbutton.setConsumer(this.sub.on('datePushbutton'));
        this.datePushbutton.sub((on) => on && this.dateMode.set(!this.dateMode.get()));

        this.timeUpdateTickSub = this.simTime.sub(this.timeUpdateTick.bind(this));
        this.dateMode.sub(() => !this.lightTestActive.get() && this.timeUpdateTick());

        this.lightTestPowered.setConsumer(this.sub.on('dc2IsPowered'));
        this.annunciatorLightSwitchPosition.setConsumer(this.sub.on('ltsTest'));

        // This counts the test digit up when the digit test is active
        this.digitTestTickSub = this.sub.on('simTime').atFrequency(2).handle(this.onDigitTestTick.bind(this), true);
        this.digitTestActive.sub(this.onDigitTestStateChanged.bind(this));

        this.lightTestActive.sub(this.onLightTestStateChanged.bind(this));

        this.lightTestDigit.sub(this.onLightTestDigitUpdated.bind(this));

        this.clockPowered.sub(this.onPowerStateChanged.bind(this), true);
    }

    private onPowerStateChanged(on: boolean): void {
        if (on) {
            this.simTime.resume();
        } else {
            this.simTime.pause();
        }
    }

    private timeUpdateTick(): void {
        Clock.dateCache.setTime(this.simTime.get());
        if (this.dateMode.get()) {
            this.clockTextBig.set(`${(Clock.dateCache.getUTCMonth() + 1).toString().padStart(2, '0')}:${Clock.dateCache.getUTCDate().toString().padStart(2, '0')}`);
            this.clockTextSmall.set(`${(Clock.dateCache.getUTCFullYear() - 2000).toString().padStart(2, '0')}`);
        } else {
            this.clockTextBig.set(`${Clock.dateCache.getUTCHours().toString().padStart(2, '0')}:${Clock.dateCache.getUTCMinutes().toString().padStart(2, '0')}`);
            this.clockTextSmall.set(`${Clock.dateCache.getUTCSeconds().toString().padStart(2, '0')}`);
        }
    }

    private onLightTestStateChanged(on: boolean): void {
        if (on) {
            this.timeUpdateTickSub.pause();
            this.lightTestDigit.set(8);
            this.onLightTestDigitUpdated();
        } else {
            this.timeUpdateTickSub.resume(true);
        }
    }

    private onDigitTestStateChanged(on: boolean): void {
        if (on) {
            // we set -1 here to ensure we see 0 for a little bit, like the real thing
            this.lightTestDigit.set(-1);
            this.digitTestTickSub.resume();
        } else {
            this.digitTestTickSub.pause();
            this.lightTestDigit.set(8);
        }
    }

    private onDigitTestTick(): void {
        this.lightTestDigit.set((this.lightTestDigit.get() + 1) % 10);
    }

    private onLightTestDigitUpdated(): void {
        const count = Math.max(0, this.lightTestDigit.get());
        this.clockTextBig.set(`${count}${count}:${count}${count}`);
        this.clockTextSmall.set(`${count}${count}`);
    }

    public render(): VNode {
        return (
            <>
                <g visibility={this.clockPowered.map((on) => (on ? 'inherit' : 'hidden'))}>
                    <text x="6" y="153" class="fontBig">{this.clockTextBig}</text>
                    <text x="190" y="147" class="fontSmall">{this.clockTextSmall}</text>
                </g>
            </>
        );
    }
}
