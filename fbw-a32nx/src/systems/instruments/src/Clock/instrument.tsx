import { ClockPublisher, EventBus, FSComponent, HEventPublisher } from '@microsoft/msfs-sdk';
import { ClockSimvarPublisher } from './shared/ClockSimvarPublisher';
import { ClockRoot } from './Clock';

// eslint-disable-next-line camelcase
class A32NX_Clock extends BaseInstrument {
    private readonly bus = new EventBus();

    private readonly hEventPublisher = new HEventPublisher(this.bus);

    private readonly simVarPublisher = new ClockSimvarPublisher(this.bus);

    private readonly clockPublisher = new ClockPublisher(this.bus);

    /**
     * "mainmenu" = 0
     * "loading" = 1
     * "briefing" = 2
     * "ingame" = 3
     */
    private gameState = 0;

    get templateID(): string {
        return 'A32NX_Clock';
    }

    public onInteractionEvent(args: string[]): void {
        this.hEventPublisher.dispatchHEvent(args[0]);
    }

    public connectedCallback(): void {
        super.connectedCallback();

        this.hEventPublisher.startPublish();

        FSComponent.render(<ClockRoot bus={this.bus} />, document.getElementById('Clock_CONTENT'));

        // Remove "instrument didn't load" text
        document.getElementById('Clock_CONTENT').querySelector(':scope > h1').remove();
    }

    public Update(): void {
        super.Update();

        if (this.gameState !== 3) {
            const gamestate = this.getGameState();
            if (gamestate === 3) {
                this.simVarPublisher.startPublish();
                this.clockPublisher.startPublish();
            }
            this.gameState = gamestate;
        } else {
            this.simVarPublisher.onUpdate();
            this.clockPublisher.onUpdate();
        }
    }
}

registerInstrument('a32nx-clock', A32NX_Clock);
