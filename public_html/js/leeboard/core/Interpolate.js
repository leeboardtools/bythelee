/* 
 * Copyright 2017 Albert Santos.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


define(['lbmath', 'lbutil'],
function(LBMath, LBUtil) {
    'use strict';

/**
 * The interpolation module...
 * @exports LBInterpolate
 */
var LBInterpolate = LBInterpolate || {};


/**
 * The interface used to provide different spline interpolation schemes. The goal
 * is to provide a single setup point for any given t value to pre-compute anything
 * necessary for computing multiple dimensions of the point for the given t.
 * @interface
 * @returns {module:LBInterpolate.Calculator}
 */
LBInterpolate.SplineCalculator = function() {
    
};

LBInterpolate.SplineCalculator.prototype = {
    
    /**
     * Sets up the calculator using t values from an array.
     * @param {Number} t    The t of interest, it should be &ge; tValues[tBaseIndex] and &lt; tValues[tBaseIndex + 1].
     * @param {Number[]} tValues    The array containing the t values, sorted in ascending order.
     * @param {Number} tBaseIndex   The index of the first value in tValues to use.
     * @returns {module:LBInterpolate.SplineCalculator}    this.
     */
    setTsFromArray: function(t, tValues, tBaseIndex) {
        throw "setTsFromArray not yet implemented!";
    },
    
    /**
     * Use with {@link module:LBInterpolate.SplineCalculator#setTsFromArray} to calculate the value given the set of P values in an array.
     * @param {Number[]} pValues    The array of pValues.
     * @returns {Number}    The interpolated value.
     */
    calcFromArray: function(pValues) {
        throw "calcFromArray not yet implemented!";
    },
    
    constructor: LBInterpolate.SplineCalculator
};


LBInterpolate.LinearCalculator = function() {
    LBInterpolate.SplineCalculator.call(this);
};

LBInterpolate.LinearCalculator.prototype = Object.create(LBInterpolate.SplineCalculator.prototype);
LBInterpolate.LinearCalculator.prototype.constructor = LBInterpolate.LinearCalculator;

/**
 * Sets up the calculator for a given t and two points. The following must be true:
 * t0 &lt; t1
 * @param {Number} t    The t of interest, it should be &ge; t0 and &le; t1.
 * @param {Number} t0   The t at the first point.
 * @param {Number} t1   The t at the second point.
 * @returns {module:LBInterpolate.LinearCalculator}    this.
 */
LBInterpolate.LinearCalculator.prototype.setTs = function(t, t0, t1) {
    this.p0A1 = (t1 - t) / (t1 - t0);
    this.p1A1 = (t - t0) / (t1 - t0);
    return this;
};

/**
 * Evaluates the curve for a given set of values at the t specified in the last
 * call to {@link module:LBInterpolate.CatmullRomCalculator#setTs2}.
 * @param {Number} p0
 * @param {Number} p1
 * @returns {Number}    The interpolated value.
 */
LBInterpolate.LinearCalculator.prototype.calc = function(p0, p1) {
    return this.p0A1 * p0 + this.p1A1 * p1;
};

/**
 * Sets up the calculator using t values from an array.
 * @param {Number} t    The t of interest, it should be &ge; tValues[tBaseIndex] and &lt; tValues[tBaseIndex + 1].
 * @param {Number[]} tValues    The array containing the t values, sorted in ascending order.
 * @param {Number} tBaseIndex   The index of the first value in tValues to use.
 * @returns {module:LBInterpolate.LinearCalculator}    this.
 */
LBInterpolate.LinearCalculator.prototype.setTsFromArray = function(t, tValues, tBaseIndex) {
    this._tBaseIndex = tBaseIndex;
    return this.setTs(t, tValues[tBaseIndex], tValues[tBaseIndex + 1]);
};
    
/**
 * Use with {@link module:LBInterpolate.SplineCalculator#setTsFromArray} to calculate the value given the set of P values in an array.
 * @param {Number[]} pValues    The array of pValues.
 * @returns {Number}    The interpolated value.
 */
LBInterpolate.LinearCalculator.prototype.calcFromArray = function(pValues) {
    return this.calc(pValues[this._tBaseIndex], pValues[this._tBaseIndex + 1]);
};


/**
 * A helper class that can be used to apply Catmull-Rom spline interpolation to multiple values
 * for a given t. This really just implements the Barry and Goldman's pyramidal formulation as
 * illustrated in {@link https://en.wikipedia.org/wiki/Centripetal_Catmull%E2%80%93Rom_spline}.
 * @todo Add linear extrapolation. Need to figure out the derivatives at the ends.
 * @constructor
 * @returns {module:LBInterpolate.CatmullRomCalculator}
 */
LBInterpolate.CatmullRomCalculator = function() {
    LBInterpolate.SplineCalculator.call(this);
};

LBInterpolate.CatmullRomCalculator.prototype = Object.create(LBInterpolate.SplineCalculator.prototype);
LBInterpolate.CatmullRomCalculator.prototype.constructor = LBInterpolate.CatmullRomCalculator;

/**
 * Sets up the calculator for a given t and four points. The following must be true:
 * t0 &lt; t1 &lt; t2 &lt; t3
 * @param {Number} t    The t of interest, it should be &ge; t0 and &le; t3.
 * @param {Number} t0   The t at the first point.
 * @param {Number} t1   The t at the second point.
 * @param {Number} t2   The t at the third point.
 * @param {Number} t3   The t at the fourth point.
 * @returns {module:LBInterpolate.CatmullRomCalculator}    this.
 */
LBInterpolate.CatmullRomCalculator.prototype.setTs = function(t, t0, t1, t2, t3) {
    this.p0A1 = (t1 - t) / (t1 - t0);
    this.p1A1 = (t - t0) / (t1 - t0);
    this.p1A2 = (t2 - t) / (t2 - t1);
    this.p2A2 = (t - t1) / (t2 - t1);
    this.p2A3 = (t3 - t) / (t3 - t2);
    this.p3A3 = (t - t2) / (t3 - t2);
    this.a1B1 = (t2 - t) / (t2 - t0);
    this.a2B1 = (t - t0) / (t2 - t0);
    this.a2B2 = (t3 - t) / (t3 - t1);
    this.a3B2 = (t - t1) / (t3 - t1);
    this.b1C = (t2 - t) / (t2 - t1);
    this.b2C = (t - t1) / (t2 - t1);
    return this;
};

/**
 * Evaluates the curve for a given set of values at the t specified in the last
 * call to {@link module:LBInterpolate.CatmullRomCalculator#setTs}.
 * @param {Number} p0
 * @param {Number} p1
 * @param {Number} p2
 * @param {Number} p3
 * @returns {Number}    The interpolated value.
 */
LBInterpolate.CatmullRomCalculator.prototype.calc = function(p0, p1, p2, p3) {
    var a1 = this.p0A1 * p0 + this.p1A1 * p1;
    var a2 = this.p1A2 * p1 + this.p2A2 * p2;
    var a3 = this.p2A3 * p2 + this.p3A3 * p3;
    var b1 = this.a1B1 * a1 + this.a2B1 * a2;
    var b2 = this.a2B2 * a2 + this.a3B2 * a3;
    return this.b1C * b1 + this.b2C * b2;
};


/**
 * Sets up the calculator for a given t and three points. The following must be true:
 * t0 &lt; t1 &lt; t2
 * @param {Number} t    The t of interest, it should be &ge; t0 and &le; t2.
 * @param {Number} t0   The t at the first point.
 * @param {Number} t1   The t at the second point.
 * @param {Number} t2   The t at the third point.
 * @returns {module:LBInterpolate.CatmullRomCalculator}    this.
 */
LBInterpolate.CatmullRomCalculator.prototype.setTs3 = function(t, t0, t1, t2) {
    this.p0A1 = (t1 - t) / (t1 - t0);
    this.p1A1 = (t - t0) / (t1 - t0);
    this.p1A2 = (t2 - t) / (t2 - t1);
    this.p2A2 = (t - t1) / (t2 - t1);
    this.a1B1 = (t2 - t) / (t2 - t0);
    this.a2B1 = (t - t0) / (t2 - t0);
    return this;
};

/**
 * Evaluates the curve for a given set of values at the t specified in the last
 * call to {@link module:LBInterpolate.CatmullRomCalculator#setTs3}.
 * @param {Number} p0
 * @param {Number} p1
 * @param {Number} p2
 * @returns {Number}    The interpolated value.
 */
LBInterpolate.CatmullRomCalculator.prototype.calc3 = function(p0, p1, p2) {
    var a1 = this.p0A1 * p0 + this.p1A1 * p1;
    var a2 = this.p1A2 * p1 + this.p2A2 * p2;
    return this.a1B1 * a1 + this.a2B1 * a2;
};


/**
 * Sets up the calculator for a given t and two points. The following must be true:
 * t0 &lt; t1
 * @param {Number} t    The t of interest, it should be &ge; t0 and &le; t1.
 * @param {Number} t0   The t at the first point.
 * @param {Number} t1   The t at the second point.
 * @returns {module:LBInterpolate.CatmullRomCalculator}    this.
 */
LBInterpolate.CatmullRomCalculator.prototype.setTs2 = function(t, t0, t1) {
    this.p0A1 = (t1 - t) / (t1 - t0);
    this.p1A1 = (t - t0) / (t1 - t0);
    return this;
};


/**
 * Evaluates the curve for a given set of values at the t specified in the last
 * call to {@link module:LBInterpolate.CatmullRomCalculator#setTs2}.
 * @param {Number} p0
 * @param {Number} p1
 * @returns {Number}    The interpolated value.
 */
LBInterpolate.CatmullRomCalculator.prototype.calc2 = function(p0, p1) {
    return this.p0A1 * p0 + this.p1A1 * p1;
};

/**
 * Sets up the calculator using t values from an array. Use this when the caller doesn't
 * know how many points are used.
 * @param {Number} t    The t of interest, it should be &ge; tValues[tBaseIndex] and &lt; tValues[tBaseIndex + 1].
 * @param {Number[]} tValues    The array containing the t values, sorted in ascending order.
 * @param {Number} tBaseIndex   The index of the first value in tValues to use.
 * @returns {module:LBInterpolate.CatmullRomCalculator}    this.
 */
LBInterpolate.CatmullRomCalculator.prototype.setTsFromArray = function(t, tValues, tBaseIndex) {
    // Special cases...
    if (tValues.length === 2) {
        this.setTs2(t, tValues[0], tValues[1]);
        this._arrayCalc = this.calc2;
        this._tBaseIndex = 0;
        return this;
    }
    else if (tValues.length === 3) {
        this.setTs3(t, tValues[0], tValues[1], tValues[2]);
        this._arrayCalc = this.calc3;
        this._tBaseIndex = 0;
        return this;
    }
    else if (tBaseIndex === 0) {
        // TODO: Fix this! Need to figure out what to do when we're out of points...
        this.setTs3(t, tValues[0], tValues[1], tValues[2]);
        this._arrayCalc = this.calc3;
        this._tBaseIndex = 0;
        return this;
    }
    else if ((tBaseIndex + 2) >= tValues.length) {
        // TODO: Fix this! Need to figure out what to do when we're out of points...
        this.setTs3(t, tValues[tValues.length - 3], tValues[tValues.length - 2], tValues[tValues.length - 1]);
        this._arrayCalc = this.calc3;
        this._tBaseIndex = tValues.length - 3;
        return this;
    }
    else {
        this._arrayCalc = this.calc;
        
        if ((tBaseIndex + 3) >= tValues.length) {
            tBaseIndex = tValues.length - 4;
        }
        else if (tBaseIndex > 0) {
            --tBaseIndex;
        }

        this.setTs(t, tValues[tBaseIndex], tValues[tBaseIndex + 1], tValues[tBaseIndex + 2], tValues[tBaseIndex + 3]);
        this._tBaseIndex = tBaseIndex;
    }
    return this;
};

/**
 * Use with {@link module:LBInterpolate.CatmullRomCalculator#setTsFromArray} to calculate the value given the set of P values in an array.
 * @param {Number[]} pValues    The array of pValues.
 * @returns {Number}
 */
LBInterpolate.CatmullRomCalculator.prototype.calcFromArray = function(pValues) {
    var tBaseIndex = this._tBaseIndex;
    return this._arrayCalc(pValues[tBaseIndex], pValues[tBaseIndex+1], pValues[tBaseIndex+2], pValues[tBaseIndex+3]);
};
    



/**
 * A multi-dimensional interpolator. This means that for a given t, it can interpolate more
 * than one value.
 * @constructor
 * @param {Object} [options]  The optional options. If defined it may have the following
 * optional properties (the default values are shown):
 * <pre><code>
 *      pinToLower: true,       // If true, values for t less than the first t value are evaluated with
 *                              // t as the first t value.
 *      pinToUpper: true,       // If true, values for t greater than the last t value are evaluated with
 *                              // t as the last t value.
 *      calculator: new LBInterpolate.LinearCalculator(),  // The calculator to use, it should be compatible
 *                              // with the array based methods of {@link module:LBInterpolate.SplineCalculator}.
 *      tValues: Number[],      // The t values, sorted in ascending order. If used pValues and optionally numDimsInPValues
 *                              // must also be specified.
 *      pValues: Number[][],    // pValues is used with tValues, and can either be an array of
 *      pValues: Number[],      // arrays, or a single array where the p values are listed in order.
 *                              // If it is an array of arrays, the outer array's length is the
 *                              // number of dimensions, and each inner array are the P values for
 *                              // that particular dimension. If it is a single array, it
 *                              // contains the values for each dimension sequentially before
 *                              // proceeding to the values for the next t value, i.e. something like:
 *                              // P_t0_d0, P_t0_d1, P_t0_d2, P_t1_d0, P_t1_d1, P_t1_d2...
 *      values: Number[],       // An array containing all the values, starting with the t value
 *                              // and followed by the corresponding P value for each dimension.
 *                              // numPDims must also be specified.
 *      numPDims: Number,       // If values is specified, this must also be specified and
 *                              // is the number of dimensions. values.length must therefore
 *                              // be a multiple of numPDims+1 
 * </code></pre>
 * @returns {Interpolate_L19.LBInterpolate.MultiDim}
 */
LBInterpolate.MultiDim = function(options) {
    options = options || {};
    
    this.pinToLower = LBUtil.isVar(options.pinToLower) ? options.pinToLower : true;
    this.pinToUpper = LBUtil.isVar(options.pinToUpper) ? options.pinToUpper : true;
    
    this.calculator = options.calculator || new LBInterpolate.LinearCalculator();
    
    this.tValues = [];
    this.pValues = [];
    
    if (options.tValues) {
        this.setFromTsAndPs(options.tValues, options.pValues);
    }
    else if (options.values && options.numDims) {
        this.setFromSingleArray(options.values, options.numPDims);
    }
};

LBInterpolate.MultiDim.prototype = {
    /**
     * @returns {Number}    The number of dimensions in the interpolator.
     */
    getPDimCount: function() {
        return this.pValues.length;
    },
    
    /**
     * Sets the interpolator points from an array of t values and an array of p values.
     * @param {Number[]} tValues    The t values, this must be sorted.
     * @param {Number[]|Number[][]} pValues The P values, this may either be an array of arrays, or
     * a single array. If an array of arrays, the pValues array's length is the number dimensions, 
     * and each internal array contains the values for that dimension. If a single array, the 
     * values for each dimension appear sequentially for a given t value before the next t value.
     * @returns {undefined}
     */
    setFromTsAndPs: function(tValues, pValues) {
        this.tValues.length = 0;
        this.pValues.length = 0;
        var tCount = tValues.length;
        if (!Array.isArray(pValues[0])) {
            var numDimsInPValues = pValues.length / tCount;
            for (var i = 0; i < numDimsInPValues; ++i) {
                this.pValues[i] = [];
            }
            
            var valuesIndex = 0;
            for (var it = 0; it < tCount; ++it) {
                this.tValues[it] = tValues[it];
                for (var ip = 0; ip < numDimsInPValues; ++ip) {
                    this.pValues[ip][it] = pValues[valuesIndex++];
                }
            }
        }
        else {
            var pCount = pValues.length;
            for (var it = 0; it < tCount; ++it) {
                this.tValues[it] = tValues[it];
                for (var ip = 0; ip < pCount; ++ip) {
                    this.pValues[ip][it] = pValues[ip][it];
                }
            }
        }
    },
    
    /**
     * Sets up the interpolator data points from an array containing all the data values.
     * The data values are ordered as (here numPDims = 3):
     * <pre><code>
     *      t0, p_t0_d0, p_t0_d1, p_t0_d2, 
     *      t1, p_t1_d0, p_t1_d1, p_t1_d2,
     * </code></pre>
     * @param {Number[]} values The array of values.
     * @param {Number} numPDims The number of dimensions.
     * @returns {undefined}
     */
    setFromSingleArray: function(values, numPDims) {
        this.tValues.length = 0;
        this.pValues.length = numPDims;
        for (var i = 0; i < numPDims; ++i) {
            this.pValues[i] = [];
        }
        
        var tCount = values.length / (numPDims + 1);
        var valuesIndex = 0;
        for (var it = 0; it < tCount; ++it) {
            this.tValues[it] = values[valuesIndex++];
            for (var ip = 0; ip < numPDims; ++ip) {
                this.pValues[ip][it] = values[valuesIndex++];
            }
        }
    },
    
    /**
     * Calculates the value for each dimensions for a given t.
     * @param {Number} t    The t value of interest.
     * @param {Number[]} [store]    If defined the array to receive the values.
     * @returns {Number[]}  The array containing the interpolated values for t.
     */
    calcValue: function(t, store) {
        store = store || [];
        store.length = 0;
        
        var tIndex = LBUtil.bsearch(this.tValues, t);
        if (tIndex < 0) {
            if (this.pinToLower) {
                this._copyPValues(0, store);
                return store;
            }
            tIndex = 0;
        }
        else if (tIndex >= (this.tValues.length - 1)) {
            if (this.pinToUpper) {
                this._copyPValues(tIndex, store);
                return store;
            }
            tIndex = this.tValues.length - 1;
        }
        else if (this.tValues[tIndex] === t) {
            this._copyPValues(tIndex, store);
            return store;
        }
        
        tIndex = this.calculator.setTsFromArray(t, this.tValues, tIndex);
        
        var pDimCount = this.pValues.length;
        for (var i = 0; i < pDimCount; ++i) {
            store[i] = this.calculator.calcFromArray(this.pValues[i], tIndex);
        }
        
        return store;
    },
    
    _copyPValues: function(index, store) {
        var pDimCount = this.pValues.length;
        for (var i = 0; i < pDimCount; ++i) {
            store[i] = this.pValues[i][index];
        }
    },
    
    /**
     * Removes the interpolator from use.
     * @returns {undefined}
     */
    destroy: function() {
        if (this.tValues) {
            this.tValues = null;
            this.pValues = null;
            this.calculator.destroy();
            this.calculator = null;
        }
    },
    
    constructor: LBInterpolate.MultiDim
};

return LBInterpolate;
    
});