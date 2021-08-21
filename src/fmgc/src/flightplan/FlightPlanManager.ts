import { FlightPlan } from "./FlightPlan";

class FlightPlanManager {
    private flightPlans = {
        primary: new FlightPlan('Primary', true),
        alternate: new FlightPlan('Alternate', false),
        secondary: new FlightPlan('Secondary', false),
    };

    constructor() {
        this.setupNZWN();
    }

    private setupNZWN(): void {
        this.flightPlans.primary.setDepartureRunway()
    }
}
