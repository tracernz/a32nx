import { LatLongData } from "@typings/fs-base-ui";

export function calculateFmsPosition(): LatLongData {
    // TODO calculate fms pos from gpirs/irs/dme/vor
    const ppos = {
        lat: SimVar.GetSimVarValue('PLANE LATITUDE', 'degree latitude'),
        long: SimVar.GetSimVarValue('PLANE LONGITUDE', 'degree longitude'),
        alt: SimVar.GetSimVarValue('PLANE ALTITUDE', 'feet'),
    };
    return ppos;
}
