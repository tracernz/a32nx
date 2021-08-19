import React, { FC, useEffect, useState } from 'react';
import { LatLongData } from '@typings/fs-base-ui/html_ui/JS/Types';
import { useFlightPlanManager } from '@instruments/common/flightplan';
import { MathUtils } from '@shared/MathUtils';
import { useSimVar } from '@instruments/common/simVars';
import { ToWaypointIndicator } from '../elements/ToWaypointIndicator';
import { FlightPlan } from '../elements/FlightPlan';
import { MapParameters } from '../utils/MapParameters';
import { EfisOption } from '../index';

export interface PlanModeProps {
    rangeSetting: number,
    ppos: LatLongData,
    efisOption: EfisOption,
}

export const PlanMode: FC<PlanModeProps> = ({ rangeSetting, ppos, efisOption }) => {
    const flightPlanManager = useFlightPlanManager();

    const [selectedWaypointIndex] = useSimVar('L:A32NX_SELECTED_WAYPOINT', 'number', 50);
    const [selectedWaypoint, setSelectedWaypoint] = useState<WayPoint>();

    useEffect(() => {
        setSelectedWaypoint(flightPlanManager.getCurrentFlightPlan().waypoints[selectedWaypointIndex]);
    }, [selectedWaypointIndex]);

    const [mapParams] = useState(() => {
        const params = new MapParameters();
        params.compute(selectedWaypoint?.infos.coordinates ?? ppos, rangeSetting / 2, 250, 0);

        return params;
    });

    useEffect(() => {
        if (selectedWaypoint) {
            mapParams.compute(selectedWaypoint.infos.coordinates, rangeSetting / 2, 250, 0);
        }
    }, [selectedWaypoint?.infos.coordinates.lat, selectedWaypoint?.infos.coordinates.long, rangeSetting].map((n) => MathUtils.fastToFixed(n, 6)));

    return (
        <>
            <g id="map" clipPath="url(#plan-mode-map-clip)">
                <FlightPlan
                    x={384}
                    y={384}
                    flightPlanManager={flightPlanManager}
                    mapParams={mapParams}
                    constraints={efisOption === EfisOption.Constraints}
                    debug={false}
                />
            </g>

            <Overlay rangeSetting={rangeSetting} />

            <ToWaypointIndicator info={flightPlanManager.getCurrentFlightPlan().computeActiveWaypointStatistics(ppos)} />
        </>
    );
};

interface OverlayProps {
    rangeSetting: number,
}

const Overlay: FC<OverlayProps> = ({ rangeSetting }) => (
    <>
        <clipPath id="plan-mode-map-clip">
            <polygon points="45,112 140,112 280,56 488,56 628,112 723,112 723,720 114,720 114,633 45,633" />
        </clipPath>
        <g className="White" strokeWidth={3}>
            <circle cx={384} cy={384} r={250} />

            <path d="M259,384a125,125 0 1,0 250,0a125,125 0 1,0 -250,0" strokeDasharray="14 13" />

            <text x={310} y={474} className="Cyan" fontSize={22}>{rangeSetting / 4}</text>
            <text x={212} y={556} className="Cyan" fontSize={22}>{rangeSetting / 2}</text>

            <text x={384} y={170} className="White" fontSize={25} textAnchor="middle" alignmentBaseline="central">N</text>
            <path d="M384,141.5 L390,151 L378,151 L384,141.5" fill="white" stroke="none" />

            <text x={598} y={384} className="White" fontSize={25} textAnchor="middle" alignmentBaseline="central">E</text>
            <path d="M626.2,384 L617,390 L617,378 L626.5,384" fill="white" stroke="none" />

            <text x={384} y={598} className="White" fontSize={25} textAnchor="middle" alignmentBaseline="central">S</text>
            <path d="M384,626.5 L390,617 L378,617 L384,626.5" fill="white" stroke="none" />

            <text x={170} y={384} className="White" fontSize={25} textAnchor="middle" alignmentBaseline="central">W</text>
            <path d="M141.5,384 L151,390 L151,378 L141.5,384" fill="white" stroke="none" />
        </g>
    </>
);
