import React, { FC, useState } from 'react';
import { Geometry } from '@fmgc/guidance/Geometry';
import { Type1Transition } from '@fmgc/guidance/lnav/transitions/Type1';
import { GuidanceManager } from '@fmgc/guidance/GuidanceManager';
import { MathUtils } from '@shared/MathUtils';
import { Layer } from '@instruments/common/utils';
import { useSimVar } from '@instruments/common/simVars';
import useInterval from '@instruments/common/useInterval';
import { FlightPlanManager } from '@fmgc/flightplanning/FlightPlanManager';
import { RFLeg } from '@fmgc/guidance/lnav/legs/RF';
import { TFLeg } from '@fmgc/guidance/lnav/legs/TF';
import { VMLeg } from '@fmgc/guidance/lnav/legs/VM';
import { AltitudeConstraint, Leg, SpeedConstraint } from '@fmgc/guidance/lnav/legs';
import { Transition } from '@fmgc/guidance/lnav/transitions';
import { Xy } from '@fmgc/flightplanning/data/geo';
import { useCurrentFlightPlan, useTemporaryFlightPlan } from '@instruments/common/flightplan';
import { MapParameters } from '../utils/MapParameters';
import { CALeg } from '@fmgc/guidance/lnav/legs/CA';
import { EfisSide } from '..';
import { NdSymbol, NdSymbolTypeFlags } from "@shared/NdSymbols";
import { useCoherentEvent } from '@instruments/common/hooks';

export type FlightPathProps = {
    x?: number,
    y?: number,
    flightPlanManager: FlightPlanManager,
    mapParams: MapParameters,
    constraints: boolean,
    side: EfisSide,
    debug: boolean,
    temp: boolean,
}

export const FlightPlan: FC<FlightPathProps> = ({ x = 0, y = 0, flightPlanManager, mapParams, constraints, side, debug = false, temp = false }) => {
    const [guidanceManager] = useState(() => new GuidanceManager(flightPlanManager));
    const [tempGeometry, setTempGeometry] = useState(() => guidanceManager.getMultipleLegGeometry(true));
    const [activeGeometry, setActiveGeometry] = useState(() => guidanceManager.getMultipleLegGeometry());
    const temporaryFlightPlan = useTemporaryFlightPlan();
    const currentFlightPlan = useCurrentFlightPlan();

    const [symbols, setSymbols] = useState<NdSymbol[]>([]);

    useCoherentEvent(`A32NX_EFIS_${side}_SYMBOLS`, (symbols) => {
        setSymbols(symbols);
    });

    const [geometry, setGeometry] = temp
        ? [tempGeometry, setTempGeometry]
        : [activeGeometry, setActiveGeometry];
    const flightPlan = temp ? temporaryFlightPlan : currentFlightPlan;

    useInterval(() => {
        if (temp) {
            setGeometry(guidanceManager.getMultipleLegGeometry(true));
        } else {
            setGeometry(guidanceManager.getMultipleLegGeometry());
        }
    }, 2_000);

    // TODO don't only display map if flight plan exists...
    if (geometry) {
        let legs = Array.from(geometry.legs.values());

        let flightPath;

        if (temp) {
            flightPath = <path d={makePathFromGeometry(geometry, mapParams)} className="Yellow" strokeWidth={3} fill="none" strokeDasharray="15 10" />;
        } else {
            flightPath = <path d={makePathFromGeometry(geometry, mapParams)} stroke="#00ff00" strokeWidth={2} fill="none" />;
        }

        return (
            <Layer x={x} y={y}>
                {flightPath}
                {symbols.map((symbol) => (
                    <SymbolMarker
                        ident={symbol.ident}
                        position={mapParams.coordinatesToXYy({ lat: symbol.location.lat, long: symbol.location.lon })}
                        type={symbol.type}
                        constraints={symbol.constraints}
                        fixInfoRadius={symbol.fixInfoRadius}
                        fixInfoRadials={symbol.fixInfoRadials}
                        mapParams={mapParams}
                    />
                ))}
                {debug && (
                    <>
                        {
                            Array.from(geometry.legs.values()).map((leg) => (
                                <DebugLeg leg={leg} mapParams={mapParams} />
                            ))
                        }
                        {
                            Array.from(geometry.transitions.values()).map((transition) => (
                                <DebugTransition transition={transition} mapParams={mapParams} />
                            ))
                        }
                    </>

                )}
            </Layer>
        );
    }

    return null;
};

const VorMarker: FC<{ colour: string }> = ({ colour }) => {
    return (<>
        <line x1={0} x2={0} y1={-16} y2={16} className={colour} strokeWidth={2} />
        <line x1={-16} x2={16} y1={0} y2={0} className={colour} strokeWidth={2} />
    </>);
};

const VorDmeMarker: FC<{ colour: string }> = ({ colour }) => {
    return (<>
        <circle r={8} className={colour} strokeWidth={2} />
        <line x1={0} x2={0} y1={-16} y2={-8} className={colour} strokeWidth={2} />
        <line x1={0} x2={0} y1={16} y2={8} className={colour} strokeWidth={2} />
        <line x1={-16} x2={-8} y1={0} y2={0} className={colour} strokeWidth={2} />
        <line x1={16} x2={8} y1={0} y2={0} className={colour} strokeWidth={2} />
    </>);
};

const DmeMarker: FC<{ colour: string }> = ({ colour }) => {
    return (<>
        <circle r={8} className={colour} strokeWidth={2} />
    </>);
};

const NdbMarker: FC<{ colour: string }> = ({ colour }) => {
    return (<>
        <path d="M-10,10 L0,-10 L10,10 L-10,10" className={colour} strokeWidth={2} />
    </>);
};

const WaypointMarker: FC<{ colour: string }> = ({ colour }) => {
    return (<>
        <rect x={0} y={0} width={10} height={10} transform='rotate(45)' className={colour} strokeWidth={2} />
    </>);
};

const AirportMarker: FC = () => {
    return (<>
        <line x1={0} x2={0} y1={-16} y2={16} className={'White'} strokeWidth={2} />
        <line x1={0} x2={0} y1={-16} y2={16} className={'White'} strokeWidth={2} transform="rotate(45)" />
        <line x1={-16} x2={16} y1={0} y2={0} className={'White'} strokeWidth={2} />
        <line x1={-16} x2={16} y1={0} y2={0} className={'White'} strokeWidth={2} transform="rotate(45)" />
    </>);
};

const RunwayMarkerClose: FC = () => {
    // TODO
    return <AirportMarker />;
}

const RunwayMarkerFar: FC = () => {
    // TODO
    return <AirportMarker />;
}

interface SymbolMarkerProps {
    ident: string,
    position: Xy,
    type: NdSymbolTypeFlags,
    constraints?: string[],
    fixInfoRadius?: number,
    fixInfoRadials?: number[],
    mapParams: MapParameters,
}

const SymbolMarker: FC<SymbolMarkerProps> = ({ ident, position, type, constraints, fixInfoRadius, fixInfoRadials, mapParams }) => {
    let colour = "White";
    if (type & NdSymbolTypeFlags.ActiveLegTermination) {
        colour = "White";
    } else if ((type & NdSymbolTypeFlags.Tuned) || (type & NdSymbolTypeFlags.FixInfo)) {
        colour = "Cyan";
    } else if (type & NdSymbolTypeFlags.Waypoint) {
        colour = "Green";
    } else if (type & NdSymbolTypeFlags.EfisOption) {
        colour = "Magenta";
    }

    let constraintPrediction;
    if (type & NdSymbolTypeFlags.ConstraintMet) {
        constraintPrediction = "Magenta";
    } else if (type & NdSymbolTypeFlags.ConstraintMissed) {
        constraintPrediction = "Amber";
    } else if (type & NdSymbolTypeFlags.ConstraintUnknown) {
        constraintPrediction = "White";
    }

    let symbol;
    if (type & NdSymbolTypeFlags.VorDme) {
        symbol = <VorDmeMarker colour={colour} />;
    } else if (type & NdSymbolTypeFlags.Vor) {
        symbol = <VorMarker colour={colour} />;
    } else if (type & NdSymbolTypeFlags.Dme) {
        symbol = <DmeMarker colour={colour} />;
    } else if (type & NdSymbolTypeFlags.Ndb) {
        symbol = <NdbMarker colour={colour} />;
    } else if (type & NdSymbolTypeFlags.Airport) {
        symbol = <AirportMarker />;
    } else {
        symbol = <WaypointMarker colour={colour} />;
    }


    let fixInfo: JSX.Element[] = [];
    if (type & NdSymbolTypeFlags.FixInfo) {
        if (fixInfoRadius) {
            const r = mapParams.nmToPx * fixInfoRadius;
            fixInfo.push(<path d={`M${-r},0 a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 ${-r * 2},0`} className="Cyan" strokeWidth={2} strokeDasharray="10 10" />);
        }
        // TODO calculate radial infinite line, maybe in fmgc?
        /*if (fixInfoRadials) {
            fixInfoRadials.forEach((radial) => {
                const distantPoint =
            });
        }*/
        debugger;
    }

    let constraintY = -6;

    return (
        <Layer x={position[0]} y={position[1]}>
            {symbol}
            <text x={15} y={-6} fontSize={20} className={colour}>
                {ident}
            </text>
            {constraints && (
                constraints.map((t) => (
                    <text x={15} y={constraintY += 20} className="Magenta" fontSize={20}>{t}</text>
                ))
            )}
            {constraintPrediction && (
                <circle r={12} className={constraintPrediction} strokeWidth={2} />
            )}
            {fixInfo}
        </Layer>
    );
};

export type DebugLegProps<TLeg extends Leg> = {
    leg: TLeg,
    mapParams: MapParameters,
}

const DebugLeg: FC<DebugLegProps<Leg>> = ({ leg, mapParams }) => {
    if (leg instanceof TFLeg) {
        return <DebugTFLeg leg={leg} mapParams={mapParams} />;
    } if (leg instanceof VMLeg) {
        return <DebugVMLeg leg={leg} mapParams={mapParams} />;
    }

    return null;
};

const DebugTFLeg: FC<DebugLegProps<TFLeg>> = ({ leg, mapParams }) => {
    const legType = 'TF';

    const [lat] = useSimVar('PLANE LATITUDE', 'degrees', 250);
    const [long] = useSimVar('PLANE LONGITUDE', 'degrees', 250);

    const [fromX, fromY] = mapParams.coordinatesToXYy(leg.from.infos.coordinates);
    const [toX, toY] = mapParams.coordinatesToXYy(leg.to.infos.coordinates);

    const [infoX, infoY] = [
        Math.round(Math.min(fromX, toX) + (Math.abs(toX - fromX) / 2) + 5),
        Math.round(Math.min(fromY, toY) + (Math.abs(toY - fromY) / 2)),
    ];

    return (
        <>
            <text fill="#ff4444" x={infoX} y={infoY} fontSize={16}>
                {leg.from.ident}
                {' '}
                -&gt;
                {' '}
                {leg.to.ident}
            </text>
            <text fill="#ff4444" x={infoX} y={infoY + 20} fontSize={16}>{legType}</text>
            <text fill="#ff4444" x={infoX} y={infoY + 40} fontSize={16}>
                Tl:
                {' '}
                {MathUtils.fastToFixed(leg.bearing, 1)}
            </text>
            <text fill="#ff4444" x={infoX + 100} y={infoY + 40} fontSize={16}>
                tA:
                {' '}
                {MathUtils.fastToFixed(leg.getAircraftToLegBearing({ lat, long }), 1)}
            </text>
            <text fill="#ff4444" x={infoX} y={infoY + 60} fontSize={16}>
                DTG:
                {' '}
                {MathUtils.fastToFixed(leg.getDistanceToGo({ lat, long }), 3)}
            </text>
        </>
    );
};

const DebugVMLeg: FC<DebugLegProps<VMLeg>> = ({ leg, mapParams }) => {
    const legType = 'VM';

    const [lat] = useSimVar('PLANE LATITUDE', 'degrees', 250);
    const [long] = useSimVar('PLANE LONGITUDE', 'degrees', 250);

    const [fromX, fromY] = mapParams.coordinatesToXYy({ lat, long });

    const [infoX, infoY] = [fromX, fromY - 150];

    return (
        <>
            <text fill="#ff4444" x={infoX} y={infoY} fontSize={16}>
                {leg.heading}
                &deg;
            </text>
            <text fill="#ff4444" x={infoX} y={infoY + 20} fontSize={16}>{legType}</text>
        </>
    );
};

export type DebugTransitionProps = {
    transition: Transition,
    mapParams: MapParameters,
}

const DebugTransition: FC<DebugTransitionProps> = ({ transition, mapParams }) => {
    if (!(transition instanceof Type1Transition)) {
        return null;
    }

    const inbound = transition.getTurningPoints()[0];
    const outbound = transition.getTurningPoints()[1];

    const [fromX, fromY] = mapParams.coordinatesToXYy(inbound);
    const [toX, toY] = mapParams.coordinatesToXYy(outbound);

    const [infoX, infoY] = [
        Math.round(Math.min(fromX, toX) + (Math.abs(toX - fromX) / 2) + 5),
        Math.round(Math.min(fromY, toY) + (Math.abs(toY - fromY) / 2)),
    ];

    let transitionType;
    if (transition instanceof Type1Transition) {
        transitionType = 'Type 1';
    }

    return (
        <>
            <text fill="yellow" x={infoX} y={infoY} fontSize={16}>
                {transitionType}
            </text>
        </>
    );
};

/**
 *
 * @param geometry {Geometry}
 * @param mapParams {MapParameters}
 */
function makePathFromGeometry(geometry: Geometry, mapParams: MapParameters): string {
    const path: string[] = [];

    for (const [i, leg] of geometry.legs.entries()) {
        const transitionBefore = geometry.transitions.get(i - 1);
        const transition = geometry.transitions.get(i);

        let x;
        let y;

        if (leg instanceof TFLeg) {
            if (transition) {
                // This is the transition after this leg - so since we are going in reverse order, draw it first
                if (transition instanceof Type1Transition) {
                    const [inLla, outLla] = transition.getTurningPoints();

                    // Move to inbound point
                    const [inX, inY] = mapParams.coordinatesToXYy(inLla);
                    x = MathUtils.fastToFixed(inX, 1);
                    y = MathUtils.fastToFixed(inY, 1);

                    path.push(`M ${x} ${y}`);

                    const r = MathUtils.fastToFixed(transition.radius * mapParams.nmToPx, 0);

                    // Draw arc to outbound point
                    const [outX, outY] = mapParams.coordinatesToXYy(outLla);
                    x = MathUtils.fastToFixed(outX, 1);
                    y = MathUtils.fastToFixed(outY, 1);
                    const cw = transition.clockwise;

                    path.push(`A ${r} ${r} 0 ${transition.angle >= 180 ? 1 : 0} ${cw ? 1 : 0} ${x} ${y}`);
                }
            }

            // Draw the orthodromic path of the TF leg

            // If we have a transition *before*, we need to go to the inbound turning point of it, not to the TO fix
            let fromLla;
            if (transitionBefore) {
                if (transitionBefore instanceof Type1Transition) {
                    fromLla = transitionBefore.getTurningPoints()[1];
                }
            } else {
                fromLla = leg.from.infos.coordinates;
            }

            const [fromX, fromY] = mapParams.coordinatesToXYy(fromLla);

            x = MathUtils.fastToFixed(fromX, 1);
            y = MathUtils.fastToFixed(fromY, 1);

            path.push(`M ${x} ${y}`);

            // If we have a transition *after*, we need to go to the inbound turning point of it, not to the TO fix
            let toLla;
            if (transition) {
                if (transition instanceof Type1Transition) {
                    toLla = transition.getTurningPoints()[0];
                }
            } else {
                toLla = leg.to.infos.coordinates;
            }

            const [toX, toY] = mapParams.coordinatesToXYy(toLla);
            x = MathUtils.fastToFixed(toX, 1);
            y = MathUtils.fastToFixed(toY, 1);

            path.push(`L ${x} ${y}`);
        } else if (leg instanceof VMLeg) {
            if (transitionBefore && transitionBefore instanceof Type1Transition) {
                const fromLla = transitionBefore.getTurningPoints()[1];

                const [fromX, fromY] = mapParams.coordinatesToXYy(fromLla);

                x = MathUtils.fastToFixed(fromX, 1);
                y = MathUtils.fastToFixed(fromY, 1);

                path.push(`M ${x} ${y}`);

                const farAway = mapParams.nmRadius + 2;
                const farAwayPoint = Avionics.Utils.bearingDistanceToCoordinates(
                    leg.bearing,
                    farAway,
                    fromLla.lat,
                    fromLla.long,
                );

                const [toX, toY] = mapParams.coordinatesToXYy(farAwayPoint);

                x = MathUtils.fastToFixed(toX, 1);
                y = MathUtils.fastToFixed(toY, 1);

                path.push(`L ${x} ${y}`);
            }
        } else if (leg instanceof RFLeg) {
            // Move to inbound point
            const [inX, inY] = mapParams.coordinatesToXYy(leg.from.infos.coordinates);
            x = MathUtils.fastToFixed(inX, 1);
            y = MathUtils.fastToFixed(inY, 1);

            path.push(`M ${x} ${y}`);

            const r = MathUtils.fastToFixed(leg.radius * mapParams.nmToPx, 0);

            // Draw arc to outbound point
            const [outX, outY] = mapParams.coordinatesToXYy(leg.to.infos.coordinates);
            x = MathUtils.fastToFixed(outX, 1);
            y = MathUtils.fastToFixed(outY, 1);
            const cw = leg.clockwise;

            path.push(`A ${r} ${r} 0 ${leg.angle >= 180 ? 1 : 0} ${cw ? 1 : 0} ${x} ${y}`);
        } // TODO CALeg
    }

    return path.join(' ');
}
