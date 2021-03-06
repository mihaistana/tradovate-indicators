// Created by @paidtofade in 2020
//
// If you find this indicator helpful, give me some love on twitter @paidtofade
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// 
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// 
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

const predef = require("./tools/predef");
const meta = require("./tools/meta");
const SMA = require("./tools/SMA");
const medianPrice = require('./tools/medianPrice');
const p = require("./tools/plotting");

class p2fHurstBands {
    init() {
        this.priceOffset = Math.floor(this.props.period / 2) + 1;
        this.lookForward = !!this.props.useNonStandardLookForward;
        if (this.lookForward) {
            this.priceOffset = -Math.floor(this.props.period / 2) + 1;
        }
        
        // Add option for averaging method?
        this.sma = SMA(this.props.period);
        this.smaHistory = [];
        
        // Choose what price type we're using
        switch (this.props.priceType) {
            case 'high':
                this.getPriceVal = (d) => d.high();
                break;
            case 'low':
                this.getPriceVal = (d) => d.low();
                break;
            case 'open':
                this.getPriceVal = (d) => d.open();
                break;
            case 'close':
                this.getPriceVal = (d) => d.close();
                break;
            case 'hl2':
            default:
                this.getPriceVal = (d) => medianPrice(d);
        }
    }

    map(d, i, history) {
        if (i < this.priceOffset) {
            return;
        }
        
        var midLine = null;    
        
        // Extrapolate midLine when lookForward = true and we're looking forward
        if (this.lookForward && history.back(this.priceOffset) === undefined) {
            const smaHist = this.smaHistory;
            const len = smaHist.length;
            midLine = smaHist[len - 1] + (smaHist[len - 1] - smaHist[len - 2]);
        } else {
            midLine = this.sma(this.getPriceVal(history.back(this.priceOffset)));
        }
        
        this.smaHistory.push(midLine);
        
        const innerOffset = midLine * (this.props.innerValue / 100.0);
        const outerOffset = midLine * (this.props.outerValue / 100.0);
        const extremeOffset = midLine * (this.props.extremeValue / 100.0);

        return { 
            middle: midLine,
            innerUpper: midLine + innerOffset,
            innerLower: midLine - innerOffset,
            outerUpper: midLine + outerOffset,
            outerLower: midLine - outerOffset,
            extremeUpper: midLine + extremeOffset,
            extremeLower: midLine - extremeOffset
        };
    }
    
    filter(d, i) {
        return i > this.priceOffset + 1;
    }
}

function cloudPlotter(canvas, indicatorInstance, history) {
    
    if (!indicatorInstance.props.drawCloud) {
        return;
    }
    
    for(let i = 0; i < history.data.length; i++) {
        const item = history.get(i);

        if (item.innerUpper !== undefined 
                && item.outerUpper !== undefined) {

            const x = p.x.get(item);
            
            canvas.drawLine(
                p.offset(x, item.innerUpper),
                p.offset(x, item.outerUpper),
                {
                    color: "red",
                    relativeWidth: 0.8,
                    opacity: 0.4
                });
                
            canvas.drawLine(
                p.offset(x, item.innerLower),
                p.offset(x, item.outerLower),
                {
                    color: "green",
                    relativeWidth: 0.8,
                    opacity: 0.4
                });
        }
    }
}

module.exports = {
    name: "p2fHurstBands",
    description: "p2f - Hurst Bands",
    calculator: p2fHurstBands,
    inputType: meta.InputType.BARS,
    params: {
        priceType: predef.paramSpecs.enum({
            high: 'High', 
            low: 'Low', 
            open: 'Open', 
            close: 'Close', 
            hl2: '(H+L)/2'
        }, 'hl2'),
        period: predef.paramSpecs.period(10),
        innerValue: predef.paramSpecs.number(1.6, 0.1, 0),
        outerValue: predef.paramSpecs.number(2.6, 0.1, 0),
        extremeValue: predef.paramSpecs.number(4.2, 0.1, 0),
        drawCloud: predef.paramSpecs.bool(true),
        useNonStandardLookForward: predef.paramSpecs.bool(false)
    },
    plots: {
        middle: { title: "Middle" },
        innerUpper: { title: "Inner Upper" },
        innerLower: { title: "Inner Lower" },
        outerUpper: { title: "Outer Upper" },
        outerLower: { title: "Outer Lower" },
        extremeUpper: { title: "Extreme Upper" },
        extremeLower: { title: "Extreme Lower" }
    },
    plotter: [
        predef.plotters.singleline("middle"),
        predef.plotters.singleline("innerUpper"),
        predef.plotters.singleline("innerLower"),
        predef.plotters.singleline("outerUpper"),
        predef.plotters.singleline("outerLower"),
        predef.plotters.singleline("extremeUpper"),
        predef.plotters.singleline("extremeLower"),
        predef.plotters.custom(cloudPlotter)
    ],
    schemeStyles: {
        dark: {
            middle: predef.styles.plot({
                color: "#00FFFF",
                lineWidth: 2
            }),
            innerUpper: predef.styles.plot({
                color: "red",
                lineStyle: 3
            }),
            outerUpper: predef.styles.plot({
                color: "red",
                lineWidth: 2
            }),
            innerLower: predef.styles.plot({
                color: "green",
                lineStyle: 3
            }),
            outerLower: predef.styles.plot({
                color: "green",
                lineWidth: 2
            })
        }
    },
    tags: ['paidtofade']
};
