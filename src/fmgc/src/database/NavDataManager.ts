import { FmgcComponent } from "@fmgc/lib/FmgcComponent";
import { RemoteDatabase } from "./backend/Remote";
import { NavDatabase } from "./NavDatabase";
import { Airport, NdbNavaid, VhfNavaid, Waypoint } from "./Types";

export class NavDataManager implements FmgcComponent {
    private static _instance: NavDataManager;
    public database: NavDatabase;

    public nearbyVhfNavaids: VhfNavaid[] = [];
    private nearbyVhfNavaidThrottler;
    public nearbyAirports: Airport[] = [];
    private nearbyAirportThrottler
    public nearbyNdbNavaids: NdbNavaid[] = [];
    private nearbyNdbNavaidThrottler;
    public nearbyWaypoints: Waypoint[] = [];
    private nearbyWaypointThrottler;

    public static get instance(): NavDataManager {
        if (!this._instance) {
            this._instance = new NavDataManager();
        }
        return this._instance;
    }

    /* private ctor for singleton */
    private constructor() {
        this.database = RemoteDatabase.instance;
    }

    public init(): void {
        // creating separate throttlers will give them different random offsets
        this.nearbyVhfNavaidThrottler = new UpdateThrottler(3 * 60000);
        this.nearbyAirportThrottler = new UpdateThrottler(3 * 60000);
        this.nearbyNdbNavaidThrottler = new UpdateThrottler(3 * 60000);
        this.nearbyWaypointThrottler = new UpdateThrottler(3 * 60000);

        this.updateVhfNavaids();
        this.updateNdbNavaids();
        this.updateWaypoints();
        this.updateAirports();
    }

    public update(deltaTime: number): void {
        if (this.nearbyVhfNavaidThrottler.canUpdate(deltaTime) !== -1) {
            this.updateVhfNavaids();
        }
        if (this.nearbyNdbNavaidThrottler.canUpdate(deltaTime) !== -1) {
            this.updateNdbNavaids();
        }
        if (this.nearbyWaypointThrottler.canUpdate(deltaTime) !== -1) {
            this.updateWaypoints();
        }
        if (this.nearbyAirportThrottler.canUpdate(deltaTime) !== -1) {
            this.updateAirports();
        }
    }

    private async updateVhfNavaids(): Promise<void> {
        this.nearbyVhfNavaids = await this.database.getNearbyVors(381);
    }

    private async updateNdbNavaids(): Promise<void> {
        this.nearbyNdbNavaids = await this.database.getNearbyNdbs(381);
    }

    private async updateWaypoints(): Promise<void> {
        this.nearbyWaypoints = await this.database.getNearbyWaypoints(381);
    }

    private async updateAirports(): Promise<void> {
        this.nearbyAirports = await this.database.getNearbyAirports(381);
    }
}
