import React, {FC} from 'react';
import { EfisOption, RangeSetting } from '..';
import { useSimVar } from '@instruments/common/simVars';

export interface MoraIndicatorProps {
    rangeSetting: RangeSetting,
    efisOption: EfisOption,
}

export const MoraIndicator: FC<MoraIndicatorProps> = (rangeSetting, efisOption) => {
    const [mora] = useSimVar(`L:A32NX_FMGC1_MORA`, 'number', 1000);

    if (mora < 0 || rangeSetting < 40 || efisOption !== EfisOption.Constraints) {
        return null;
    }

    return (
        <g id="mora">
            <text x={20} y={378} fontSize={22} className="Magenta">MORA</text>
            <text x={20} y={400} fontSize={22} className="Magenta">{mora.toFixed(0).padStart(3, "0")}</text>
        </g>
    );
};
