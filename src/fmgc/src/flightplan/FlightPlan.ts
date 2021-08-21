import { Airport } from "@fmgc/database/Types";
import { Leg } from "../guidance/lnav/legs";

enum FlightPlanSegment {
    DepartureRunway,
    DepartureEnroute,
    Enroute,
    ArrivalEnroute,
    Arrival,
    ArrivalApproach,
    Approach,
    MissedApproach,
}

type Procedure = object; // TODO

export class FlightPlan {
    public name: string;
    public hasTemporary: boolean;

    private origin: Airport = null;
    private destination: Airport = null;
    private legs: Record<FlightPlanSegment, Leg[]>; // Leg has procedure info stored in it...

    constructor(name: string, hasTemporary: boolean) {
        this.name = name;
        this.hasTemporary = hasTemporary;

        for (let i = FlightPlanSegment.DepartureRunway; i <= FlightPlanSegment.MissedApproach; i++) {
            this.legs[i] = [];
        }
    }

    public setOrigin(origin: Airport): void {
        this.origin = origin;
        this.clearDeparture();
    }

    public setDestination(destination: Airport): void {
        this.destination = destination;
        this.clearArrival();
        this.clearApproach();
    }

    public clear(): void {
        this.origin = null;
        this.destination = null;
        this.clearDeparture();
        this.clearEnroute();
        this.clearArrival();
        this.clearApproach();
    }

    public setDepartureRunway(runwayProcedure: Procedure): void {
        this.clearDeparture();
        //this.loadProcedure(runwayProcedure, FlightPlanSegment.DepartureRunway);
    }

    private clearDeparture(): void {
        this.legs[FlightPlanSegment.DepartureRunway].length = 0;
        this.legs[FlightPlanSegment.DepartureEnroute].length = 0;
        // TODO check if we need to insert an IF into enroute
    }

    private clearEnroute(): void {
        this.legs[FlightPlanSegment.Enroute].length = 0;
        // TODO check if we need to insert an IF into arrival
    }

    private clearArrival(): void {
        this.legs[FlightPlanSegment.ArrivalEnroute].length = 0;
        this.legs[FlightPlanSegment.Arrival].length = 0;
        this.legs[FlightPlanSegment.ArrivalApproach].length = 0;
        // TODO check if we need to insert an IF into approach
    }

    private clearApproach(): void {
        this.legs[FlightPlanSegment.Approach].length = 0;
        this.legs[FlightPlanSegment.MissedApproach].length = 0;
    }
}
