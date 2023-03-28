import { SimVarDefinition, SimVarValueType } from '@microsoft/msfs-sdk';

export interface DisplayVars {
    elec: number;
    elecFo: number;
    potentiometerCaptain: number;
    potentiometerFo: number;
}

export interface AdirsSimVars {
    pitch: number;
    roll: number;
    magHeadingRaw: number;
    baroCorrectedAltitude: number;
    speed: number;
    vsInert: number;
    vsBaro: number;
    magTrackRaw: number;
    groundSpeed: number;
    trueAirSpeed: number;
    windDirection: number;
    windSpeed: number;
    fpaRaw: number;
    daRaw: number;
    mach: number;
    latitude: number;
    longitude: number;
    latAccRaw: number;
    irMaintWordRaw: number;
    trueHeadingRaw: number;
    trueTrackRaw: number;
}

export enum AdirsVars {
    pitch = 'L:A32NX_ADIRS_IR_1_PITCH',
    roll = 'L:A32NX_ADIRS_IR_1_ROLL',
    magHeadingRaw = 'L:A32NX_ADIRS_IR_1_HEADING',
    trueHeadingRaw = 'L:A32NX_ADIRS_IR_1_TRUE_HEADING',
    baroCorrectedAltitude1 = 'L:A32NX_ADIRS_ADR_1_BARO_CORRECTED_ALTITUDE_1',
    speed = 'L:A32NX_ADIRS_ADR_1_COMPUTED_AIRSPEED',
    vsInert = 'L:A32NX_ADIRS_IR_1_VERTICAL_SPEED',
    vsBaro = 'L:A32NX_ADIRS_ADR_1_BAROMETRIC_VERTICAL_SPEED',
    magTrackRaw = 'L:A32NX_ADIRS_IR_1_TRACK',
    trueTrackRaw = 'L:A32NX_ADIRS_IR_1_TRUE_TRACK',
    groundSpeed = 'L:A32NX_ADIRS_IR_1_GROUND_SPEED',
    trueAirSpeed = 'L:A32NX_ADIRS_ADR_1_TRUE_AIRSPEED',
    windDirection = 'L:A32NX_ADIRS_IR_1_WIND_DIRECTION_BNR',
    windSpeed = 'L:A32NX_ADIRS_IR_1_WIND_SPEED_BNR',
    fpaRaw = 'L:A32NX_ADIRS_IR_1_FLIGHT_PATH_ANGLE',
    daRaw = 'L:A32NX_ADIRS_IR_1_DRIFT_ANGLE',
    mach = 'L:A32NX_ADIRS_ADR_1_MACH',
    latitude = 'L:A32NX_ADIRS_IR_1_LATITUDE',
    longitude = 'L:A32NX_ADIRS_IR_1_LONGITUDE',
}

export const AdirsSimVarDefinitions = new Map<keyof AdirsSimVars, SimVarDefinition>([
    ['pitch', { name: AdirsVars.pitch, type: SimVarValueType.Number }],
    ['roll', { name: AdirsVars.roll, type: SimVarValueType.Number }],
    ['magHeadingRaw', { name: AdirsVars.magHeadingRaw, type: SimVarValueType.Number }],
    ['trueHeadingRaw', { name: AdirsVars.trueHeadingRaw, type: SimVarValueType.Number }],
    ['baroCorrectedAltitude', { name: AdirsVars.baroCorrectedAltitude1, type: SimVarValueType.Number }],
    ['speed', { name: AdirsVars.speed, type: SimVarValueType.Number }],
    ['magTrackRaw', { name: AdirsVars.magTrackRaw, type: SimVarValueType.Number }],
    ['trueTrackRaw', { name: AdirsVars.trueTrackRaw, type: SimVarValueType.Number }],
    ['groundSpeed', { name: AdirsVars.groundSpeed, type: SimVarValueType.Number }],
    ['trueAirSpeed', { name: AdirsVars.trueAirSpeed, type: SimVarValueType.Number }],
    ['windDirection', { name: AdirsVars.windDirection, type: SimVarValueType.Number }],
    ['windSpeed', { name: AdirsVars.windSpeed, type: SimVarValueType.Number }],
    ['fpaRaw', { name: AdirsVars.fpaRaw, type: SimVarValueType.Number }],
    ['daRaw', { name: AdirsVars.daRaw, type: SimVarValueType.Number }],
    ['mach', { name: AdirsVars.mach, type: SimVarValueType.Number }],
    ['latitude', { name: AdirsVars.latitude, type: SimVarValueType.Number }],
    ['longitude', { name: AdirsVars.longitude, type: SimVarValueType.Number }],
]);

export interface SwitchingPanelVSimVars {
    attHdgKnob: number;
    airKnob: number;
}

export enum SwitchingPanelVars {
    attHdgKnob = 'L:A32NX_ATT_HDG_SWITCHING_KNOB',
    airKnob = 'L:A32NX_AIR_DATA_SWITCHING_KNOB',
}

export const SwitchingPanelSimVarsDefinitions = new Map<keyof SwitchingPanelVSimVars, SimVarDefinition>([
    ['attHdgKnob', { name: SwitchingPanelVars.attHdgKnob, type: SimVarValueType.Enum }],
    ['airKnob', { name: SwitchingPanelVars.airKnob, type: SimVarValueType.Enum }],
]);
