const A32NX_Util = {};

A32NX_Util.createDeltaTimeCalculator = (startTime = Date.now()) => {
    let lastTime = startTime;

    return () => {
        const nowTime = Date.now();
        const deltaTime = nowTime - lastTime;
        lastTime = nowTime;

        return deltaTime;
    };
};

A32NX_Util.createFrameCounter = (interval = 5) => {
    let count = 0;
    return () => {
        const c = count++;
        if (c == interval) {
            count = 0;
        }
        return c;
    };
};

A32NX_Util.createMachine = (machineDef) => {
    const machine = {
        value: machineDef.init,
        action(event) {
            const currStateDef = machineDef[machine.value];
            const destTransition = currStateDef.transitions[event];
            if (!destTransition) {
                return;
            }
            const destState = destTransition.target;

            machine.value = destState;
        },
        setState(newState) {
            const valid = machineDef[newState];
            if (valid) {
                machine.value = newState;
            }
        }
    };
    return machine;
};

/**
 * Utility class to throttle instrument updates
 */
class UpdateThrottler {

    /**
     * @param {number} intervalMs Interval between updates, in milliseconds
     */
    constructor(intervalMs) {
        this.intervalMs = intervalMs;
        this.currentTime = 0;
        this.lastUpdateTime = 0;

        // Take a random offset to space out updates from different instruments among different
        // frames as much as possible.
        this.refreshOffset = Math.floor(Math.random() * intervalMs);
        this.refreshNumber = 0;
    }

    /**
     * Checks whether the instrument should be updated in the current frame according to the
     * configured update interval.
     *
     * @param {*} deltaTime
     * @returns -1 if the instrument should not update, or the time elapsed since the last
     *          update in milliseconds
     */
    canUpdate(deltaTime) {
        this.currentTime += deltaTime;
        const number = Math.floor((this.currentTime + this.refreshOffset) / this.intervalMs);
        const update = number > this.refreshNumber;
        this.refreshNumber = number;
        if (update) {
            const accumulatedDelta = this.currentTime - this.lastUpdateTime;
            this.lastUpdateTime = this.currentTime;
            return accumulatedDelta;
        } else {
            return -1;
        }
    }

    /**
     * Notifies the throttler that we just force updated the instrument and that it can wait for a
     * full interval to update again.
     */
    notifyForceUpdated() {
        this.currentTime = (this.refreshNumber - 1) * this.intervalMs - this.refreshOffset;
    }
}

A32NX_Util.monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

class AiracCycleInfo {
    constructor() {
        this._start = new Date();
        this._end = new Date();
        this._provider = "NON";
        this._cycleNumber = 1;
    }

    _daysBetween(date1, date2) {
        return Math.round((date2 - date1)/(1000*60*60*24));
    }

    _dayOfYear(d) {
        return this._daysBetween(new Date(Date.UTC(d.getUTCFullYear(), 0)), d);
    }

    _addDays(d, days) {
        const ret = new Date(d);
        ret.setDate(d.getDate() + days);
        return ret;
    }

    _checkForNavigraph() {
        const xhr = new XMLHttpRequest();
        xhr.onreadystatechange = () => {
            if (xhr.readyState === xhr.DONE && xhr.status !== 404) {
                this._provider = "JEP";
            }
        };
        xhr.open("HEAD", "/VFS/scenery/fs-base-jep/scenery/world/AIRACCycle.bgl" + "?id=" + new Date().getTime().toString());
        xhr.send();
    }

    _formatDate(d) {
        return d.getUTCDate().toString().padStart(2, "0") + A32NX_Util.monthNames[d.getUTCMonth()]
    }

    loadMsfsCycle() {
        const cycle = SimVar.GetGameVarValue("FLIGHT NAVDATA DATE RANGE", "string");
        console.log(cycle);
        const now = new Date();
        const m = cycle.match(/^([A-Z]{3})([0-9]{2})([A-Z]{3})([0-9]{2})\/([0-9]{2})$/);
        if (m !== null) {
            let [, effMonth, effDay,] = m;
            effDay = parseInt(effDay);
            effMonth = A32NX_Util.monthNames.indexOf(effMonth);
            let effYear = now.getUTCFullYear();
            if (now.getUTCMonth() < 6 && effMonth >= 6) {
                effYear -= 1;
            } else if (now.getUTCMonth() >= 6 && effMonth < 6) {
                effYear += 1;
            }

            this._start = new Date(Date.UTC(effYear, effMonth, effDay, 0, 0, 0));
            this._end = this._addDays(this._start, 27);
            this._end.setUTCHours(23, 59, 59, 999);

            const days = this._dayOfYear(this._start);
            this._cycleNumber = Math.floor(days / 28) + 1;
        }
        this._provider = "ASO";
        this._checkForNavigraph();
    }

    get dateRangeString() {
        return this._formatDate(this._start) + "-" + this._formatDate(this._end);
    }

    // TODO create a function to get an offset AiracCycleInfo
    get previousDateRangeString() {
        const effDate = this._addDays(this._start, -28);
        const endDate = this._addDays(effDate, 27);
        return this._formatDate(effDate) + "-" + this._formatDate(endDate);
    }

    get cycleString() {
        return this._start.getUTCFullYear().toString().slice(-2) + this._cycleNumber.toString().padStart(2, "0");
    }

    get databaseName() {
        return this._provider + this.cycleString + "01";
    }
}
