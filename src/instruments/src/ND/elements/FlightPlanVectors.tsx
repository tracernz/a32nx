import React, { FC, useCallback, useMemo, useState } from 'react';
import { Layer } from '@instruments/common/utils';
import { PathVector, PathVectorType } from '@fmgc/guidance/lnav/PathVector';
import { LnavConfig } from '@fmgc/guidance/LnavConfig';
import { EfisSide, NdFlightPlan } from '@shared/NavigationDisplay';
import { Geo } from '@fmgc/utils/Geo';
import { useCoherentEvent } from '@instruments/common/hooks';
import { MapParameters } from '../utils/MapParameters';

export interface FlightPlanVectorsProps {
    x: number,
    y: number,
    mapParams: MapParameters,
    mapParamsVersion: number,
    side: EfisSide,
    group: NdFlightPlan,
}

export const FlightPlanVectors: FC<FlightPlanVectorsProps> = ({ x, y, mapParams, side, group }) => {
    const [vectors, setVectors] = useState<PathVector[]>([]);

    const lineStyle = useMemo<React.SVGAttributes<SVGPathElement>>(() => {
        switch (group) {
        case NdFlightPlan.ACTIVE:
            return { stroke: '#0f0' };
        case NdFlightPlan.DASHED:
            return { stroke: '#0f0', strokeDasharray: '15 12' };
        case NdFlightPlan.TEMPORARY:
            return { stroke: '#ff0', strokeDasharray: '15 12' };
        case NdFlightPlan.SECONDARY:
            return { stroke: '#888' };
        case NdFlightPlan.SECONDARY_DASHED:
            return { stroke: '#888', strokeDasharray: '15 12' };
        case NdFlightPlan.MISSED:
            return { stroke: '#0ff' };
        case NdFlightPlan.ALTERNATE:
            return { stroke: '#0ff', strokeDasharray: '15 12' };
        case NdFlightPlan.ACTIVE_EOSID:
            return { stroke: '#ff0' };
        default:
            return { stroke: '#f00' };
        }
    }, [group]);

    const vectorsCallback = useCallback((vectors: PathVector[]) => {
        if (vectors) {
            setVectors(vectors);
        } else if (LnavConfig.DEBUG_PATH_DRAWING) {
            console.warn(`[ND/Vectors] Received falsy vectors on event '${NdFlightPlan[group]}'.`);
        }
    }, [group]);

    useCoherentEvent(`A32NX_EFIS_VECTORS_${side}_${NdFlightPlan[group]}`, vectorsCallback);

    return (
        <Layer x={x} y={y}>
            {vectors.map((vector) => {
                switch (vector.type) {
                case PathVectorType.Line:
                    const [sx, sy] = mapParams.coordinatesToXYy(vector.startPoint);
                    const [ex, ey] = mapParams.coordinatesToXYy(vector.endPoint);

                    return (
                        <line
                            {...lineStyle}
                            fill="none"
                            strokeWidth={2}
                            x1={sx}
                            y1={sy}
                            x2={ex}
                            y2={ey}
                        />
                    );
                case PathVectorType.Arc:
                    const [ix, iy] = mapParams.coordinatesToXYy(vector.startPoint);
                    const [fx, fy] = mapParams.coordinatesToXYy(vector.endPoint);

                    const radius = Geo.getDistance(vector.centrePoint, vector.endPoint) * mapParams.nmToPx;

                    return (
                        <path
                            {...lineStyle}
                            fill="none"
                            strokeWidth={2}
                            d={`M ${ix} ${iy} A ${radius} ${radius} 0 ${Math.abs(vector.sweepAngle) > 180 ? 1 : 0} ${vector.sweepAngle > 0 ? 1 : 0} ${fx} ${fy}`}
                        />
                    );
                case PathVectorType.DebugPoint:
                    const [x, y] = mapParams.coordinatesToXYy(vector.startPoint);

                    return (
                        <path
                            fill="none"
                            strokeWidth={2}
                            d={`M ${x} ${y} h -5 h 10 l -5 -5 v 10`}
                        />
                    );
                default:
                    return null;
                }
            })}
        </Layer>
    );
};
