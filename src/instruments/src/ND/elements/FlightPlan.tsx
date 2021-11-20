//  Copyright (c) 2021 FlyByWire Simulations
//  SPDX-License-Identifier: GPL-3.0

import React, { FC, memo, useCallback, useEffect, useState } from 'react';
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
import { Transition } from '@fmgc/guidance/lnav/Transition';
import { NdSymbol, NdSymbolTypeFlags } from '@shared/NavigationDisplay';
import { useCurrentFlightPlan } from '@instruments/common/flightplan';
import { Leg } from '@fmgc/guidance/lnav/legs/Leg';
import { Type3Transition } from '@fmgc/guidance/lnav/transitions/Type3';
import { Coordinates } from '@fmgc/flightplanning/data/geo';
import { IFLeg } from '@fmgc/guidance/lnav/legs/IF';
import { Type4Transition } from '@fmgc/guidance/lnav/transitions/Type4';
import { Guidable } from '@fmgc/guidance/Guidable';
import { PathVector, PathVectorType } from '@fmgc/guidance/lnav/PathVector';
import { HALeg, HFLeg, HMLeg, HxLegGuidanceState } from '@fmgc/guidance/lnav/legs/HX';
import { MapParameters } from '../utils/MapParameters';

export enum FlightPlanType {
    Nav,
    Dashed,
    Temp
}

export type FlightPathProps = {
    x?: number,
    y?: number,
    symbols: NdSymbol[],
    flightPlanManager: FlightPlanManager,
    mapParams: MapParameters,
    debug: boolean,
    type: FlightPlanType,
}

export const FlightPlan: FC<FlightPathProps> = memo(({ x = 0, y = 0, symbols, flightPlanManager, mapParams, debug = false, type = FlightPlanType.Nav }) => {
    const [guidanceManager] = useState(() => new GuidanceManager(flightPlanManager));
    const [flightPlanVersion] = useSimVar(FlightPlanManager.FlightPlanVersionKey, 'number', 1_000);
    const [tempGeometry, setTempGeometry] = useState(() => guidanceManager.getMultipleLegGeometry(true));
    const [activeGeometry, setActiveGeometry] = useState(() => guidanceManager.getMultipleLegGeometry());

    const [geometry, setGeometry] = type === FlightPlanType.Temp
        ? [tempGeometry, setTempGeometry]
        : [activeGeometry, setActiveGeometry];

    const recomputeGeometry = useCallback(() => {
        const tas = SimVar.GetSimVarValue('AIRSPEED TRUE', 'Knots');
        const gs = SimVar.GetSimVarValue('GPS GROUND SPEED', 'Knots');

        const ppos = {
            lat: SimVar.GetSimVarValue('PLANE LATITUDE', 'Degrees') ?? 0,
            long: SimVar.GetSimVarValue('PLANE LONGITUDE', 'Degrees') ?? 0,
        };

        const activeIdx = type === FlightPlanType.Temp
            ? flightPlanManager.getFlightPlan(1).activeWaypointIndex
            : flightPlanManager.getCurrentFlightPlan().activeWaypointIndex;

        if (tas !== null && gs !== null) {
            geometry?.recomputeWithParameters(tas, gs, ppos, activeIdx, 0);
        }
    }, [type, flightPlanManager, geometry]);

    // Create new geometry for new flight plan versions
    useEffect(() => {
        if (type === FlightPlanType.Temp) {
            setGeometry(guidanceManager.getMultipleLegGeometry(true));
        } else {
            setGeometry(guidanceManager.getMultipleLegGeometry());
        }

        recomputeGeometry();
    }, [flightPlanVersion]);

    // Recompute geometry every 5 seconds
    useInterval(() => recomputeGeometry(), 5_000, { additionalDeps: [type, flightPlanManager, geometry] });

    useCurrentFlightPlan();

    const [flightPath, setFlightPath] = useState<string>();

    useEffect(() => {
        if (geometry && geometry.isComputed && mapParams.valid) {
            setFlightPath(makePathFromGeometry(geometry, mapParams));
        }
    });

    if (!mapParams.valid) {
        return null;
    }

    const constraintFlags = NdSymbolTypeFlags.ConstraintMet | NdSymbolTypeFlags.ConstraintMissed | NdSymbolTypeFlags.ConstraintUnknown;

    return (
        <Layer x={x} y={y}>
            { /* constraint circles need to be drawn under the flight path */ }
            {symbols.filter((symbol) => (symbol.type & constraintFlags) > 0).map((symbol) => {
                const position = mapParams.coordinatesToXYy(symbol.location);

                return (
                    <ConstraintMarker
                        key={symbol.databaseId}
                        x={Number(MathUtils.fastToFixed(position[0], 1))}
                        y={Number(MathUtils.fastToFixed(position[1], 1))}
                        type={symbol.type}
                        mapParams={mapParams}
                    />
                );
            })}
            <g id="flight-path">
                <path d={flightPath} className="shadow" strokeWidth={2.5} fill="none" strokeDasharray="15 10" />
                <path d={flightPath} className={type === FlightPlanType.Temp ? 'Yellow' : 'Green'} strokeWidth={2} fill="none" strokeDasharray={type === FlightPlanType.Nav ? '' : '15 10'} />
            </g>
            {symbols.map((symbol) => {
                const position = mapParams.coordinatesToXYy(symbol.location);

                return (
                    <SymbolMarker
                        key={symbol.databaseId}
                        ident={symbol.ident}
                        x={Number(MathUtils.fastToFixed(position[0], 1))}
                        y={Number(MathUtils.fastToFixed(position[1], 1))}
                        type={symbol.type}
                        length={symbol.length}
                        direction={symbol.direction}
                        constraints={symbol.constraints}
                        radials={symbol.radials}
                        radii={symbol.radii}
                        mapParams={mapParams}
                    />
                );
            })}
            {debug && !!geometry && (
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
});

const VorMarker: FC<{ colour: string }> = ({ colour }) => (
    <>
        <line x1={0} x2={0} y1={-15} y2={15} className="shadow" strokeWidth={2.5} />
        <line x1={-15} x2={15} y1={0} y2={0} className="shadow" strokeWidth={2.5} />
        <line x1={0} x2={0} y1={-15} y2={15} className={colour} strokeWidth={2} />
        <line x1={-15} x2={15} y1={0} y2={0} className={colour} strokeWidth={2} />
    </>
);

const VorDmeMarker: FC<{ colour: string }> = ({ colour }) => (
    <>
        <circle r={7} className="shadow" strokeWidth={2.5} />
        <line x1={0} x2={0} y1={-15} y2={-7} className="shadow" strokeWidth={2.5} />
        <line x1={0} x2={0} y1={15} y2={7} className="shadow" strokeWidth={2.5} />
        <line x1={-15} x2={-7} y1={0} y2={0} className="shadow" strokeWidth={2.5} />
        <line x1={15} x2={7} y1={0} y2={0} className="shadow" strokeWidth={2.5} />
        <circle r={7} className={colour} strokeWidth={2} />
        <line x1={0} x2={0} y1={-15} y2={-7} className={colour} strokeWidth={2} />
        <line x1={0} x2={0} y1={15} y2={7} className={colour} strokeWidth={2} />
        <line x1={-15} x2={-7} y1={0} y2={0} className={colour} strokeWidth={2} />
        <line x1={15} x2={7} y1={0} y2={0} className={colour} strokeWidth={2} />
    </>
);

const DmeMarker: FC<{ colour: string }> = ({ colour }) => (
    <>
        <circle r={7} className="shadow" strokeWidth={2.5} />
        <circle r={7} className={colour} strokeWidth={2} />
    </>
);

const NdbMarker: FC<{ colour: string }> = ({ colour }) => (
    <>
        <path d="M-10,10 L0,-10 L10,10 L-10,10" className="shadow" strokeWidth={2.5} />
        <path d="M-10,10 L0,-10 L10,10 L-10,10" className={colour} strokeWidth={2} />
    </>
);

const WaypointMarker: FC<{ colour: string }> = ({ colour }) => (
    <>
        <rect x={-4.5} y={-4.5} width={9} height={9} className="shadow" strokeWidth={2.5} transform="rotate(45 0 0)" />
        <rect x={-4.5} y={-4.5} width={9} height={9} className={colour} strokeWidth={2} transform="rotate(45 0 0)" />
    </>
);

const AirportMarker: FC<{ colour: string }> = ({ colour }) => (
    <>
        <line x1={0} x2={0} y1={-15} y2={15} className="shadow" strokeWidth={2.5} />
        <line x1={0} x2={0} y1={-15} y2={15} className="shadow" strokeWidth={2.5} transform="rotate(45)" />
        <line x1={-15} x2={15} y1={0} y2={0} className="shadow" strokeWidth={2.5} />
        <line x1={-15} x2={15} y1={0} y2={0} className="shadow" strokeWidth={2.5} transform="rotate(45)" />
        <line x1={0} x2={0} y1={-15} y2={15} className={colour} strokeWidth={2} />
        <line x1={0} x2={0} y1={-15} y2={15} className={colour} strokeWidth={2} transform="rotate(45)" />
        <line x1={-15} x2={15} y1={0} y2={0} className={colour} strokeWidth={2} />
        <line x1={-15} x2={15} y1={0} y2={0} className={colour} strokeWidth={2} transform="rotate(45)" />
    </>
);

const RunwayIdent: FC<{ ident: string, rotation: number }> = ({ ident, rotation }) => {
    const airportIdent = ident.substring(0, 4);
    const runwayIdent = ident.substring(4);

    return (
        <g transform={`rotate(${-rotation} 40 -20)`}>
            <text x={40} y={-30} fontSize={20} className="shadow" textAnchor="middle" alignmentBaseline="central">
                {airportIdent}
            </text>
            <text x={40} y={-10} fontSize={20} className="shadow" textAnchor="middle" alignmentBaseline="central">
                {runwayIdent.padEnd(4, '\xa0')}
            </text>
        </g>
    );
};

interface RunwayMarkerProps {
    ident: string,
    mapParams: MapParameters,
    direction: number,
    lengthPx: number,
}

const RunwayMarkerClose: FC<RunwayMarkerProps> = memo(({ ident, mapParams, direction, lengthPx }) => {
    useSimVar('PLANE HEADING DEGREES TRUE', 'number');

    const rotation = mapParams.rotation(direction);

    return (
        <g transform={`rotate(${rotation})`} className="White">
            <line x1={-5} x2={-5} y1={0} y2={-lengthPx} className="shadow" strokeWidth={2.5} />
            <line x1={5} x2={5} y1={0} y2={-lengthPx} className="shadow" strokeWidth={2.5} />
            <line x1={-5} x2={-5} y1={0} y2={-lengthPx} strokeWidth={2} />
            <line x1={5} x2={5} y1={0} y2={-lengthPx} strokeWidth={2} />
            <RunwayIdent ident={ident} rotation={rotation} />
        </g>
    );
});

const RunwayMarkerFar: FC<Omit<RunwayMarkerProps, 'lengthPx'>> = memo(({ ident, mapParams, direction }) => {
    useSimVar('PLANE HEADING DEGREES TRUE', 'number');

    const rotation = mapParams.rotation(direction);

    return (
        <g transform={`rotate(${rotation})`} className="White">
            <rect x={-5} y={-25} width={10} height={25} className="shadow" strokeWidth={2.5} />
            <rect x={-5} y={-25} width={10} height={25} strokeWidth={2} />
            <RunwayIdent ident={ident} rotation={rotation} />
        </g>
    );
});

interface SymbolMarkerProps {
    ident: string,
    x: number,
    y: number,
    type: NdSymbolTypeFlags,
    constraints?: string[],
    length?: number,
    direction?: number,
    radials?: number[],
    radii?: number[],
    mapParams: MapParameters,
}

const SymbolMarker: FC<SymbolMarkerProps> = memo(({ ident, x, y, type, constraints, length, direction, radials, radii, mapParams }) => {
    let colour = 'White';
    let shadow = true;
    // todo airport as well if in flightplan
    if (type & NdSymbolTypeFlags.Runway) {
        colour = 'White';
    } else if (type & NdSymbolTypeFlags.ActiveLegTermination) {
        colour = 'White';
    } else if (type & NdSymbolTypeFlags.Tuned) {
        colour = 'Cyan';
    } else if (type & (NdSymbolTypeFlags.FlightPlan | NdSymbolTypeFlags.FixInfo)) {
        colour = 'Green';
    } else if (type & NdSymbolTypeFlags.EfisOption) {
        colour = 'Magenta';
        shadow = false;
    }

    const elements: JSX.Element[] = [];

    if (type & NdSymbolTypeFlags.FixInfo) {
        if (radii !== undefined) {
            for (const radius of radii) {
                const radiusPx = radius * mapParams.nmToPx;
                elements.push(
                    <path
                        d={`m-${radiusPx},0 a${radiusPx},${radiusPx} 0 1,0 ${radiusPx * 2},0 a${radiusPx},${radiusPx} 0 1,0 -${radiusPx * 2},0`}
                        strokeWidth={2.5}
                        className="shadow"
                        strokeDasharray="15 10"
                    />,
                );
                elements.push(
                    <path
                        d={`m-${radiusPx},0 a${radiusPx},${radiusPx} 0 1,0 ${radiusPx * 2},0 a${radiusPx},${radiusPx} 0 1,0 -${radiusPx * 2},0`}
                        strokeWidth={2}
                        className="Cyan"
                        strokeDasharray="15 10"
                    />,
                );
            }
        }
        if (radials !== undefined) {
            for (const bearing of radials) {
                const rotation = mapParams.rotation(bearing) * Math.PI / 180;
                // TODO how long should a piece of string be?
                const x2 = Math.sin(rotation) * 9000;
                const y2 = -Math.cos(rotation) * 9000;
                elements.push(<line x2={x2} y2={y2} strokeWidth={2.5} className="shadow" strokeDasharray="15 10" />);
                elements.push(<line x2={x2} y2={y2} strokeWidth={2} className="Cyan" strokeDasharray="15 10" />);
            }
        }
    }

    if (constraints) {
        let constraintY = -6;
        elements.push(...constraints.map((t) => (
            <text x={15} y={constraintY += 20} className="Magenta shadow" fontSize={20}>{t}</text>
        )));
    }

    let showIdent = false;
    if (type & NdSymbolTypeFlags.VorDme) {
        elements.push(<VorDmeMarker colour={colour} />);
        showIdent = true;
    } else if (type & NdSymbolTypeFlags.Vor) {
        elements.push(<VorMarker colour={colour} />);
        showIdent = true;
    } else if (type & NdSymbolTypeFlags.Dme) {
        elements.push(<DmeMarker colour={colour} />);
        showIdent = true;
    } else if (type & NdSymbolTypeFlags.Ndb) {
        elements.push(<NdbMarker colour={colour} />);
        showIdent = true;
    } else if (type & NdSymbolTypeFlags.Runway) {
        if (mapParams.nmRadius >= 40) {
            elements.push(<RunwayMarkerFar
                ident={ident}
                mapParams={mapParams}
                direction={direction!}
            />);
        } else {
            elements.push(<RunwayMarkerClose
                ident={ident}
                mapParams={mapParams}
                direction={direction!}
                lengthPx={mapParams.nmToPx * length!}
            />);
        }
    } else if (type & NdSymbolTypeFlags.Airport) {
        showIdent = true;
        elements.push(<AirportMarker colour={colour} />);
    } else if (type & (NdSymbolTypeFlags.Waypoint | NdSymbolTypeFlags.FlightPlan | NdSymbolTypeFlags.FixInfo)) {
        showIdent = true;
        elements.push(<WaypointMarker colour={colour} />);
    } else if (type & (NdSymbolTypeFlags.PwpTopOfDescent)) {
        showIdent = false;
        elements.push(
            <>
                <path d="M 0, 0.5 h 15.5 l 12, 12 m -4, 0 l 4, 0 l 0, -4" strokeWidth={1.8} className="shadow" />

                <path d="M 0, 0.5 h 15.5 l 12, 12 m -4, 0 l 4, 0 l 0, -4" strokeWidth={1.5} className="White" />
            </>,
        );
    } else if (type & (NdSymbolTypeFlags.PwpCdaFlap1)) {
        showIdent = false;
        elements.push(
            <>
                <circle cx={0} cy={0} r={12} strokeWidth={1.8} className="shadow" />
                <circle cx={0} cy={0} r={12} strokeWidth={1.5} className="White" />

                <text x={2.5} y={2} className="White shadow" textAnchor="middle" dominantBaseline="middle" fontSize={21}>1</text>
            </>,
        );
    } else if (type & (NdSymbolTypeFlags.PwpCdaFlap2)) {
        showIdent = false;
        elements.push(
            <>
                <circle cx={0} cy={0} r={12} strokeWidth={1.8} className="shadow" />
                <circle cx={0} cy={0} r={12} strokeWidth={1.5} className="White" />

                <text x={1} y={2} className="White shadow" textAnchor="middle" dominantBaseline="middle" fontSize={21}>2</text>
            </>,
        );
    } else if (type & (NdSymbolTypeFlags.PwpDecel)) {
        showIdent = false;
        elements.push(
            <>
                <circle cx={0} cy={0} r={13} strokeWidth={1.6} className="shadow" />
                <circle cx={0} cy={0} r={12} strokeWidth={1.5} className="Magenta" />

                <text x={1.5} y={2} className="Magenta shadow" strokeWidth={1} textAnchor="middle" dominantBaseline="middle" fontSize={22}>D</text>
            </>,
        );
    }

    if (showIdent) {
        elements.push(
            <text x={15} y={-6} fontSize={20} className={`${colour}${shadow ? ' shadow' : ''}`}>
                {ident}
            </text>,
        );
    }

    return (
        <Layer x={x} y={y}>
            {elements}
        </Layer>
    );
});

interface ConstraintMarkerProps {
    x: number,
    y: number,
    type: NdSymbolTypeFlags,
}

const ConstraintMarker: FC<ConstraintMarkerProps> = memo(({ x, y, type }) => {
    if (type & NdSymbolTypeFlags.ConstraintMet) {
        return (
            <Layer x={x} y={y}>
                <circle r={12} className="shadow" strokeWidth={2.5} />
                <circle r={12} className="Magenta" strokeWidth={2} />
            </Layer>
        );
    }

    if (type & NdSymbolTypeFlags.ConstraintMissed) {
        return (
            <Layer x={x} y={y}>
                <circle r={12} className="shadow" strokeWidth={2.5} />
                <circle r={12} className="Amber" strokeWidth={2} />
            </Layer>
        );
    }

    return (
        <Layer x={x} y={y}>
            <circle r={12} className="shadow" strokeWidth={2.5} />
            <circle r={12} className="White" strokeWidth={2} />
        </Layer>
    );
});

export type DebugLegProps<TLeg extends Leg> = {
    leg: TLeg,
    mapParams: MapParameters,
};

const DebugLeg: FC<DebugLegProps<Leg>> = ({ leg, mapParams }) => {
    if (leg instanceof TFLeg) {
        return <DebugTFLeg leg={leg} mapParams={mapParams} />;
    } if (leg instanceof VMLeg) {
        return <DebugVMLeg leg={leg} mapParams={mapParams} />;
    } if (leg instanceof HALeg || leg instanceof HFLeg || leg instanceof HMLeg) {
        return <DebugHXLeg leg={leg} mapParams={mapParams} />;
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
                {MathUtils.fastToFixed(leg.inboundCourse, 1)}
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

const DebugHXLeg: FC<DebugLegProps<HALeg | HFLeg | HMLeg>> = ({ leg, mapParams }) => {
    const legType = leg.constructor.name.substr(0, 2);

    const [fromX, fromY] = mapParams.coordinatesToXYy(leg.to.infos.coordinates);

    const [infoX, infoY] = [fromX, fromY - 150];

    return (
        <>
            <text fill="#ff4444" x={infoX} y={infoY} fontSize={16}>
                {HxLegGuidanceState[leg.state]}
                {' - r='}
                {leg.radius.toFixed(1)}
                {' NM'}
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
        const inbound = geometry.transitions.get(i - 1) ?? geometry.legs.get(i - 1);
        const outbound = geometry.transitions.get(i) ?? geometry.legs.get(i + 1);

        if (!inbound) {
            if (DEBUG) {
                console.error(`[FMS/Geometry] No inbound guidable for leg '${leg.repr}'.`);
            }
            break;
        }

        if (inbound instanceof Transition) {
            const pathVectors = inbound.predictedPath;
            if (pathVectors instanceof Array) {
                path.push(...drawPathVectors(mapParams, pathVectors));
            } else {
                // TODO replace with path vectors on all transition types
                //path.push(...drawTransition(mapParams, inbound));
            }
        }

        const legPathVectors = leg.predictedPath;
        // TODO remove special case... maybe need special path vector endpoint for infinite legs
        if (leg instanceof VMLeg) {
            if (inbound) {
                const fromLla = inbound.getPathEndPoint()!;

                const farAwayPoint = Avionics.Utils.bearingDistanceToCoordinates(
                    leg.inboundCourse,
                    mapParams.nmRadius + 2,
                    fromLla.lat,
                    fromLla.long,
                );

                path.push(...drawLine(
                    mapParams,
                    fromLla,
                    farAwayPoint,
                ));
            }
        } else if (legPathVectors instanceof Array) {
            path.push(...drawPathVectors(mapParams, legPathVectors));
        } else {
            //path.push(...drawLeg(mapParams, leg, inbound, outbound));
        }
    }

    return path.join(' ');
}

/**
 *
 * @param mapParams ND map parameters for scaling etc.
 * @param pathVectors predicted path from the guidables to draw
 * @returns
 */
function drawPathVectors(mapParams: MapParameters, pathVectors: PathVector[]): string[] {
    const path: string[] = [];

    for (const vector of pathVectors) {
        const [inX, inY] = mapParams.coordinatesToXYy(vector.startPoint);
        let x = MathUtils.fastToFixed(inX, 1);
        let y = MathUtils.fastToFixed(inY, 1);
        path.push(`M ${x} ${y}`);

        const inOutOfBounds = Math.abs(inX) > 1000 || Math.abs(inY) > 1000;

        switch (vector.type) {
        case PathVectorType.Line: {
            const [outX, outY] = mapParams.coordinatesToXYy(vector.endPoint!);
            if (inOutOfBounds && (Math.abs(outX) > 1000 || Math.abs(outY) > 1000)) {
                continue;
            }
            x = MathUtils.fastToFixed(outX, 1);
            y = MathUtils.fastToFixed(outY, 1);
            path.push(`L ${x} ${y}`);
            break;
        }
        case PathVectorType.Arc: {
            const r = Avionics.Utils.computeGreatCircleDistance(vector.centrePoint!, vector.startPoint) * mapParams.nmToPx;
            const [outX, outY] = mapParams.coordinatesToXYy(vector.endPoint!);
            if (inOutOfBounds && (Math.abs(outX) > 1000 || Math.abs(outY) > 1000)) {
                continue;
            }
            x = MathUtils.fastToFixed(outX, 1);
            y = MathUtils.fastToFixed(outY, 1);
            path.push(`A ${r} ${r} 0 ${Math.abs(vector.sweepAngle!) >= 180 ? 1 : 0} ${vector.sweepAngle! > 0 ? 1 : 0} ${x} ${y}`);
            break;
        }
        case PathVectorType.DebugPoint: {
            path.push('m-10,0 l20,0 m-10,-10 l0,20');
            break;
        }
        default:
        }
    }

    return path;
}

/**
 * @deprecated Use path vectors
 */
function drawLeg(mapParams: MapParameters, leg: Leg, inbound: Guidable, outbound?: Guidable) {
    const path: string[] = [];

    if (leg instanceof RFLeg) {
        path.push(...drawArc(
            mapParams,
            leg.from.infos.coordinates,
            leg.to.infos.coordinates,
            leg.radius,
            leg.angle,
            leg.clockwise,
        ));
    } else if (leg instanceof IFLeg) {
        // Do nothing
    } else {
        // Draw the orthodromic path of the leg

        path.push(...drawLine(
            mapParams,
            inbound.getPathEndPoint()!,
            outbound instanceof Type1Transition ? outbound.getTurningPoints()[0] : leg.getPathEndPoint()!,
        ));
    }

    return path;
}

/**
 * @deprecated Use path vectors
 */
function drawTransition(mapParams: MapParameters, transition: Transition): string[] {
    const path: string[] = [];

    const [itp, ftp] = transition.getTurningPoints();

    if (transition instanceof Type3Transition && !transition.isArc) {
        // TODO draw line
        return [];
    }

    if (transition instanceof Type1Transition || transition instanceof Type3Transition) {
        path.push(...drawArc(
            mapParams,
            itp,
            ftp,
            transition.radius,
            transition.angle,
            transition.clockwise,
        ));
    }

    if (transition instanceof Type4Transition) {
        if (transition.hasArc) {
            if (DEBUG) {
                path.push(...drawDebugPoint(mapParams, itp));
                path.push(...drawDebugPoint(mapParams, transition.arcCentrePoint));
                path.push(...drawDebugPoint(mapParams, ftp));
            }

            path.push(...drawArc(
                mapParams,
                itp,
                ftp,
                transition.radius,
                transition.arcSweepAngle,
                transition.clockwise,
            ));
        }

        path.push(...drawLine(mapParams, transition.lineStartPoint, transition.lineEndPoint));
    }

    return path;
}

/**
 * @deprecated Use path vectors
 */
function drawArc(mapParams: MapParameters, itp: Coordinates, ftp: Coordinates, radius: NauticalMiles, sweepAngle: Degrees, clockwise: boolean): string[] {
    const path: string[] = [];

    let x;
    let y;

    // Move to inbound point
    const [inX, inY] = mapParams.coordinatesToXYy(itp);
    x = MathUtils.fastToFixed(inX, 1);
    y = MathUtils.fastToFixed(inY, 1);

    path.push(`M ${x} ${y}`);

    const r = MathUtils.fastToFixed(radius * mapParams.nmToPx, 2);

    // Draw arc to outbound point
    const [outX, outY] = mapParams.coordinatesToXYy(ftp);
    x = MathUtils.fastToFixed(outX, 1);
    y = MathUtils.fastToFixed(outY, 1);
    const cw = clockwise;

    path.push(`A ${r} ${r} 0 ${sweepAngle >= 180 ? 1 : 0} ${cw ? 1 : 0} ${x} ${y}`);

    return path;
}

/**
 * @deprecated Use path vectors
 */
function drawLine(mapParams: MapParameters, start: Coordinates, end: Coordinates): string[] {
    const path: string[] = [];

    let x;
    let y;

    // Move to start point
    const [fromX, fromY] = mapParams.coordinatesToXYy(start);

    x = MathUtils.fastToFixed(fromX, 1);
    y = MathUtils.fastToFixed(fromY, 1);

    path.push(`M ${x} ${y}`);

    // Move to end point
    const [toX, toY] = mapParams.coordinatesToXYy(end);

    x = MathUtils.fastToFixed(toX, 1);
    y = MathUtils.fastToFixed(toY, 1);

    path.push(`L ${x} ${y}`);

    return path;
}

/**
 * @deprecated Use path vectors
 */
function drawDebugPoint(mapParams: MapParameters, point: Coordinates): string[] {
    const path: string[] = [];

    // Move to point
    const [pX, pY] = mapParams.coordinatesToXYy(point);
    const x = MathUtils.fastToFixed(pX, 1);
    const y = MathUtils.fastToFixed(pY, 1);

    path.push(`M ${x} ${y}`);

    // Draw cross
    path.push('m 0 -10');
    path.push('v 20');
    path.push('m -10 -10');
    path.push('h 20');

    return path;
}
