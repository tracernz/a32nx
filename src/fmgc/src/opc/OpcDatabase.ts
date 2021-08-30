import { NXDataStore } from "@shared/persistence";
import { NauticalMiles } from "../../shared/types/Common";

export class OpcDatabase {
    static get takeoffRnp(): NauticalMiles {
        return parseFloat(NXDataStore.get('OPC_RNP_TAKEOFF', '1')) ?? 1;
    }

    static get terminalRnp(): NauticalMiles {
        return parseFloat(NXDataStore.get('OPC_RNP_TERMINAL', '1')) ?? 1;
    }

    static get enrouteRnp(): NauticalMiles {
        return parseFloat(NXDataStore.get('OPC_RNP_ENROUTE', '2')) ?? 2;
    }

    static get OceanicRnp(): NauticalMiles {
        return parseFloat(NXDataStore.get('OPC_RNP_OCEANIC', '2')) ?? 2;
    }

    static get vorApproachRnp(): NauticalMiles {
        return parseFloat(NXDataStore.get('OPC_RNP_APPROACH_VOR', '0.5')) ?? 0.5;
    }

    static get gpsApproachRnp(): NauticalMiles {
        return parseFloat(NXDataStore.get('OPC_RNP_APPROACH_GPS', '0.3')) ?? 0.3;
    }

    static get precisionApproachRnp(): NauticalMiles {
        return parseFloat(NXDataStore.get('OPC_RNP_APPROACH_PRECISION', '0.5')) ?? 0.5;
    }

    static get nonPrecisionApproachRnp(): NauticalMiles {
        return parseFloat(NXDataStore.get('OPC_RNP_APPROACH_NON_PRECISION', '0.5')) ?? 0.5;
    }
}
