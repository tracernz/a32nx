import React, { useEffect, useState } from 'react';
import { useSimVar } from '@instruments/common/simVars';
import { TuningMode, Tuner } from '@fmgc/radionav';
import { EfisSide } from '../index';

// TODO move
enum ArincBusStatus {
    None = 0, // no transmission e.g. system died
    NCD,
    Normal,
}

export enum NavAidMode {
    Off = 0,
    ADF,
    VOR,
}

export type RadioNavInfoProps = { index: 1 | 2, side: EfisSide }

const VorTuningModeIndicator: React.FC<{ index: 1 | 2, frequency: number }> = ({ index, frequency }) => {
    const [tuningMode] = useSimVar(`L:A32NX_FMGC_RADIONAV_VOR${index}_TUNING_MODE`, 'enum');

    return (
        frequency > 1 && tuningMode !== TuningMode.Auto && (
            <text x={index === 1 ? 138 : 616} y={720} fontSize={20} textDecoration="underline" fill="#ffffff">{tuningMode === TuningMode.Manual ? 'M' : 'R'}</text>
        ) || null
    );
};

const AdfTuningModeIndicator: React.FC<{ index: 1 | 2, frequency: number }> = ({ index, frequency }) => {
    const [tuningMode] = useSimVar(`L:A32NX_FMGC_RADIONAV_ADF${index}_TUNING_MODE`, 'enum');

    return (
        frequency > 1 && tuningMode !== TuningMode.Auto && (
            <text x={index === 1 ? 138 : 616} y={720} fontSize={20} textDecoration="underline" fill="#ffffff">{tuningMode === TuningMode.Manual ? 'M' : 'R'}</text>
        ) || null
    );
};

const VorInfo: React.FC<{index: 1 | 2}> = ({ index }) => {
    const [vorIdent, setVorIdent] = useState('');
    const [dmeIdent, setDmeIdent] = useState('');
    const [packedVorIdent] = useSimVar(`L:A32NX_NAVRADIO_VOR${index}_IDENT`, 'number');
    const [packedDmeIdent] = useSimVar(`L:A32NX_NAVRADIO_DME${index}.1_IDENT`, 'number');
    const [vorFrequency] = useSimVar(`NAV ACTIVE FREQUENCY:${index}`, 'megahertz');
    const [dmeDistance] = useSimVar(`NAV DME:${index}`, 'nautical miles');
    const [vorStatus] = useSimVar(`L:A32NX_NAVRADIO_VOR${index}_STATUS`, 'boolean');
    const [dmeStatus] = useSimVar(`L:A32NX_NAVRADIO_DME${index}.1_STATUS`, 'boolean');

    useEffect(() => {
        setVorIdent(Tuner.unpackIdent(packedVorIdent));
    }, [packedVorIdent]);

    useEffect(() => {
        setDmeIdent(Tuner.unpackIdent(packedDmeIdent));
    }, [packedDmeIdent]);

    const x = index === 1 ? 37 : 668;

    const bigLittle = (value: number, digits: number) => {
        const [intPart, decimalPart] = value.toFixed(digits).split('.', 2);
        return (
            <>
                {intPart}
                <tspan fontSize={20}>
                    .
                    {decimalPart}
                </tspan>
            </>
        );
    };

    // FIXME: Use actual JSX syntax for this
    const freqText = bigLittle(vorFrequency, 2);
    let dmeText = '---';
    if (dmeStatus === ArincBusStatus.Normal && dmeDistance > 0) {
        if (dmeDistance > 20) {
            dmeText = dmeDistance.toFixed(0);
        } else {
            dmeText = bigLittle(dmeDistance, 1);
        }
    }

    const path = index === 1 ? 'M25,675 L25,680 L37,696 L13,696 L25,680 M25,696 L25,719' : 'M749,719 L749,696 L755,696 L743,680 L731,696 L737,696 L737,719 M743,680 L743,675';

    // TODO red for bus dead
    return (
        <g className="GtLayer">
            <path
                d={path}
                strokeWidth={2.6}
                className="White"
                strokeLinejoin="round"
                strokeLinecap="round"
            />
            <text x={x} y={692} fontSize={24} className={vorStatus === ArincBusStatus.None ? "Red Blink9Seconds" : "White"}>
                VOR
                {index}
            </text>
            {(vorStatus === ArincBusStatus.Normal && vorIdent.length > 0) && (
                <text x={x} y={722} fontSize={24} className="White">{vorIdent}</text>
            )}
            {((vorStatus !== ArincBusStatus.Normal || vorIdent.length < 1) && dmeStatus === ArincBusStatus.Normal && dmeIdent.length > 0) && (
                <text x={x} y={722} fontSize={24} className="White">{vorIdent}</text>
            )}
            {(vorStatus === ArincBusStatus.Normal && vorIdent.length < 1 && dmeStatus === ArincBusStatus.Normal && dmeIdent.length < 1) && (
                <text x={index === 2 ? x - 26 : x} y={722} fontSize={24} className="White">{freqText}</text>
            )}
            {(dmeStatus !== ArincBusStatus.None) && (
                <g transform={`translate(${index === 1 ? -16 : 0})`}>
                    <text x={dmeDistance > 20 ? x + 46 : x + 58} y={759} fontSize={24} fill="#00ff00" textAnchor="end">{dmeText}</text>
                    <text x={x + 66} y={759} fontSize={20} fill="#00ffff">NM</text>
                </g>
            )}
            {(dmeStatus === ArincBusStatus.None) && (
                <text x={x} y={759} fontSize={24} className="Red Blink9Seconds">DME{index}</text>
            )}
            {(vorStatus !== ArincBusStatus.None || dmeStatus !== ArincBusStatus.None) && (
                <VorTuningModeIndicator index={index} frequency={vorFrequency} />
            )}
        </g>
    );
};

const AdfInfo: React.FC<{index: 1 | 2}> = ({ index }) => {
    const [ident, setIdent] = useState('');
    const [packedIdent] = useSimVar(`L:A32NX_NAVRADIO_ADF${index}_IDENT`, 'number');
    const [adfFrequency] = useSimVar(`ADF ACTIVE FREQUENCY:${index}`, 'kilohertz');
    const [status] = useSimVar(`L:A32NX_NAVRADIO_ADF${index}_STATUS`, 'boolean');

    useEffect(() => {
        setIdent(Tuner.unpackIdent(packedIdent));
    }, [packedIdent]);

    const x = index === 1 ? 37 : 668;

    const path = index === 1 ? 'M31,686 L25,680 L19,686 M25,680 L25,719' : 'M749,719 L749,696 L743,690 L737,696 L737,719 M743,690 L743,675';

    // TODO red for bus dead
    return (
        <g className="GtLayer">
            <path
                d={path}
                strokeWidth={2.6}
                className="Green"
                strokeLinejoin="round"
                strokeLinecap="round"
            />
            <text x={x} y={692} fontSize={24} className="Green">
                ADF
                {index}
            </text>
            <text x={x} y={722} fontSize={24} className="Green"></text>
            {status !== ArincBusStatus.None && (
                <text x={x} y={722} fontSize={24} className="Green">{ident.length > 0 ? ident : (adfFrequency > 0 ? adfFrequency.toFixed(0) : '')}</text>
            )}
            <AdfTuningModeIndicator index={index} frequency={adfFrequency} />
        </g>
    );
};

export const RadioNavInfo: React.FC<RadioNavInfoProps> = ({ index, side }) => {
    const [mode] = useSimVar(`L:A32NX_EFIS_${side}_NAVAID_${index}_MODE`, 'enum');

    if (mode === NavAidMode.VOR) {
        return <VorInfo index={index} />;
    }
    if (mode === NavAidMode.ADF) {
        return <AdfInfo index={index} />;
    }
    return <></>;
};
