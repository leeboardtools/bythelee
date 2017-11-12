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
    
define(['lbutil'],
function(LBUtil) {

    'use strict';
    

/**
 * The math module...
 * @exports LBMath
 */
var LBMath = LBMath || {};

/**
 * Degrees to radians scale.
 * @constant
 * @type {Number}
 * @default
 */
LBMath.DEG_TO_RAD = Math.PI / 180;

/**
 * Radians to degrees scale.
 * @constant
 * @type {Number}
 * @default
 */
LBMath.RAD_TO_DEG = 180 / Math.PI;

/**
 * 2 * PI
 * @constant
 * @type {Number}
 * @default
 */
LBMath.TWO_PI = Math.PI * 2;

/**
 * PI / 2
 * @constant
 * @type {Number}
 * @default
 */
LBMath.PI_2 = Math.PI / 2;

/**
 * @property {Number} The default zero tolerance used by {@link module:LBMath.isLikeZero} and {@link module:LBMath.isNearEqual}.
 */
LBMath.defZeroTolerance = 1e-10;

/**
 * Determines if a number should be treated as zero (usually for avoiding divide by zero)
 * @param {Number} x  The number.
 * @param {Number} [tolerance=LBMath.defZeroTolerance]  The optional tolerance.
 * @returns {Boolean}   True if x can be considered zero.
 */
LBMath.isLikeZero = function(x, tolerance) {
    tolerance = tolerance || LBMath.defZeroTolerance;
    return x < tolerance && x > -tolerance;
};

/**
 * Determines if two numbers are approximately equal.
 * @param {Number} a    The first number.
 * @param {Number} b    The second number.
 * @param {Number} [tolerance=LBMath.defZeroTolerance]  The optional tolerance.
 * @returns {Boolean}   True if the numbers can be considered equal.
 */
LBMath.isNearEqual = function(a, b, tolerance) {
    tolerance = tolerance || LBMath.defZeroTolerance;
    
    if (LBMath.isLikeZero(a)) {
        return LBMath.isLikeZero(b);
    }
    else if (LBMath.isLikeZero(b)) {
        return false;
    }
    
    var scale = Math.pow(10., -Math.log10(Math.abs(a)));
    var scaledA = a * scale;
    var scaledB = b * scale;
    return (Math.abs(scaledA - scaledB) <= tolerance);
};

/**
 * Converts a value to zero if it is considered like zero by {@link module:LBMath.isLikeZero}.
 * @param {Number} x    The value.
 * @param {Number} [tolerance=LBMath.defZeroTolerance]  The optional tolerance.
 * @returns {Number}    x or 0.
 */
LBMath.cleanNearZero = function(x, tolerance) {
    return LBMath.isLikeZero(x, tolerance) ? 0 : x;
};

/**
 * Adjusts a value as necessary to ensure it is between two limits.
 * @param {Number} val  The value to clamp if necessary.
 * @param {Number} limitA  One of the limits.
 * @param {Number} limitB The other limit.
 * @returns {Number} The value clamped to the limits.
 */
LBMath.clamp = function(val, limitA, limitB) {
    return (limitA < limitB) ? Math.min(Math.max(val, limitA), limitB) : Math.min(Math.max(val, limitB), limitA);
};

/**
 * Maps a value within a range so it has the same relative position to a new range.
 * @param {Number} val  The value to be mapped.
 * @param {Number} lowerOld The value in the old range corresponding to lowerNew.
 * @param {Number} upperOld The value in the old range corresponding to upperNew.
 * @param {Number} lowerNew One point in the upper range.
 * @param {Number} upperNew Another point in the upper range.
 * @returns {Number}    The mapped value.
 */
LBMath.mapInRange = function(val, lowerOld, upperOld, lowerNew, upperNew) {
    return (val - lowerOld) * (upperNew - lowerNew) / (upperOld - lowerOld) + lowerNew;
};

/**
 * Adjusts an angle in degrees so it satisfies -180 &lt; degrees &ge; 180.
 * @param {Number} degrees  The anngle in degrees to wrap.
 * @returns {Number}    degrees wrapped to -180 &lt; degrees &ge; 180.
 */
LBMath.wrapDegrees = function(degrees) {
    degrees %= 360;
    if (degrees <= -180) {
        degrees += 360;
    }
    else if (degrees > 180) {
        degrees -= 360;
    }

    return degrees;
};

/**
 * Determines if two angles in degrees represent the same angle (i.e. wrapping is taken
 * into account).
 * @param {Number} a    The first angle.
 * @param {Number} b    The second angle.
 * @returns {Boolean}   true if a and b represent the same angle.
 */
LBMath.degreesEqual = function(a, b) {
    if (a === b) {
        return true;
    }
    return LBMath.wrapDegrees(a) === LBMath.wrapDegrees(b);
},

/**
 * Subtracts b from a in degrees, wrapping the result such that |a - b| &le; 180.
 * @param {Number} a    The degrees to subtract from.
 * @param {Number} b    The degress to subtract.
 * @returns {Number}    The subtraction, wrapped.
 */
LBMath.subDegrees = function(a, b) {
    a = LBMath.wrapDegrees(a);
    b = LBMath.wrapDegrees(b);
    return LBMath.wrapDegrees(a - b);
};


/**
 * Defines a range in degrees against which angles can be tested.
 * @constructor
 * @param {Number} baseDeg  The base angle in degrees.
 * @param {Number} range    The range from baseDeg, in degrees. This may be negative.
 * @returns {module:LBMath.DegRange}
 */
LBMath.DegRange = function(baseDeg, range) {
    this.setRange(baseDeg, range);
};

LBMath.DegRange.prototype = {
    /**
     * Sets the range from a base angle and the range from the base angle.
     * @param {Number} baseDeg  The base angle in degrees.
     * @param {Number} range    The range from baseDeg, in degrees. This may be negative.
     * @returns {module:LBMath.DegRange}   this.
     */
    setRange: function(baseDeg, range) {
        if (range < 0) {
            baseDeg = LBMath.wrapDegrees(baseDeg + range);
            range = -range;
        }

        this.minDeg = LBMath.wrapDegrees(baseDeg);
        this.maxDeg = this.minDeg + range;
        if (this.maxDeg > 180) {
            this.maxDeg2 = this.maxDeg - 360;
            this.maxDeg = 180;
        }
        else {
            // We can use -180 because {@link module:LBMath.wrapDegrees} returns angles &gt; -180.
            this.maxDeg2 = -180;
        }
        return this;
    },
    
    /**
     * Sets the range from a lower and an upper limit.
     * @param {Number} limitA
     * @param {Number} limitB
     * @returns {module:LBMath.DegRange}   this.
     */
    setRangeFromLimits: function(limitA, limitB) {
        return this.setRange(limitA, limitB - limitA);
    },
    
    /**
     * Determines if an angle in degrees is within the range.
     * @param {Number} deg  The angle to test, in degrees.
     * @returns {Boolean}   true if the angle is within the range.
     */
    isInRange:function(deg) {
        deg = LBMath.wrapDegrees(deg);
        if (deg < this.minDeg) {
            return deg <= this.maxDeg2;
        }
        return deg <= this.maxDeg;
    },
    
    /**
     * Adjusts an angle in degrees to fall the the closes edge of the range if it is outside the range.
     * @param {Number} deg  The angle to clamp, in degrees.
     * @returns {Number}    Either deg if deg is within the range, or the edge angle closest angularly to deg if it is not.
     */
    clampToRange: function(deg) {
        deg = LBMath.wrapDegrees(deg);
        if (deg < this.minDeg) {
            if (deg > this.maxDeg2) {
                return ((deg - this.maxDeg2) < (this.minDeg - deg)) ? this.maxDeg2 : this.minDeg;
            }
        }
        else if (deg > this.maxDeg) {
            // Are we closer to maxDeg or minDeg?
            return ((deg - this.maxDeg) < Math.abs(deg - 360 - this.minDeg)) ? this.maxDeg : this.minDeg;
        }
        return deg;
    },
    
    constructor: LBMath.DegRange
};


/**
 * Rounds a value to a certain number of decimal places.
 * @param {Number} val  The value to be rounded.
 * @param {Number} [decimalPlaces]  The number of decimal places, less than zero rounds
 * above the decimal place.
 * @returns {Number}    The rounded value.
 */
LBMath.round = function(val, decimalPlaces) {
    if (decimalPlaces) {
        var scale = Math.pow(10, decimalPlaces);
        return Math.round(val * scale) / scale;
    }
    return Math.round(val);
};

/**
 * Rounds a value down to a certain number of decimal places.
 * @param {Number} val  The value to be rounded downward.
 * @param {Number} [decimalPlaces]  The number of decimal places, less than zero rounds
 * above the decimal place.
 * @returns {Number}    The rounded value.
 */
LBMath.roundDown = function(val, decimalPlaces) {
    if (decimalPlaces) {
        var scale = Math.pow(10, decimalPlaces);
        return Math.floor(val * scale) / scale;
    }
    return Math.floor(val);
};


/**
 * Returns the angle in radians between sides a and b of a triangle, given the lengths
 * of the sides of the triangle.
 * @param {Number} a    The length of one side of the vertex of interest.
 * @param {Number} b    The length of the other side of the vertex of interest.
 * @param {Number} c    The length of the side opposite the vertex of interest.
 * @returns {Number}    The angle between sides a and b in radians.
 */
LBMath.radFromThreeSides = function(a, b, c) {
    var den = 2 * a * b;
    if (LBMath.isLikeZero(den)) {
        return 0;
    }
    
    var cosC = (a * a + b * b - c * c) / den;
    return Math.acos(cosC);
};


/**
 * Third order smoothstep function taking a lower edge and an upper edge. Returns
 * 0 if x &le; edge0, 1 if x &ge; edge1.
 * @param {Number} edge0    The lower edge value.
 * @param {Number} edge1    The upper edge value.
 * @param {Number} x    The x value.
 * @returns {Number}    The smoothstep value, which is 0 if x &le; edge0 and 1 if x &ge; edge1.
 */
LBMath.smoothstep = function(edge0, edge1, x) {
    if (x <= edge0) {
        return 0;
    }
    else if (x >= edge1) {
        return 1;
    }
    
    x = (x - edge0) / (edge1 - edge0);
    return (-2 * x + 3) * x * x;
};


/**
 * Third order smoothstep function per https://en.wikipedia.org/wiki/Smoothstep
 * s(x) = -2*x^3 + 3*x^2
 * @param {Number} x The x value.
 * @returns {Number} The smoothstep value, which is 0 if x &le; 0 and 1 if x &ge; 1.
 */
LBMath.smoothstep3 = function(x) {
    if (x < 0) {
        return 0;
    }
    else if (x > 1) {
        return 1;
    }
    return (-2 * x + 3) * x * x;
};

/**
 * Fifth order smoothstep function per https://en.wikipedia.org/wiki/Smoothstep
 * s(x) = 6*x^5 - 15*x^4 + 10*x^3
 * @param {Number} x The x value.
 * @returns {Number} The smoothstep value, which is 0 if x &le; 0 and 1 if x &ge; 1.
 */
LBMath.smoothstep5 = function(x) {
    if (x < 0) {
        return 0;
    }
    else if (x > 1) {
        return 1;
    }
    return ((6 * x - 15) * x + 10) * x * x * x;
};

/**
 * Seventh order smoothstep function, https://en.wikipedia.org/wiki/Smoothstep
 * s(x) = -20*x^7 + 70*x^5 - 84*x^4 +35*x^3
 * @param {Number} x The x value.
 * @returns {Number} The smoothstep value, which is 0 if x &le; 0 and 1 if x &ge; 1.
 */
LBMath.smoothstep7 = function(x) {
    if (x < 0) {
        return 0;
    }
    else if (x > 1) {
        return 1;
    }
    return (((-20 * x + 70) * x - 84) * x + 35) * x * x * x;
};

/**
 * Transitions between two values by applying a function.
 * @param {Number} x  The transition value to pass to smoothFunc
 * @param {Number} ya The output for x &le; 0.
 * @param {Number} yb The output for x &ge; 1.
 * @param {Number} smoothFunc The smoothing function, should smoothly transition
 * between 0 when x is 0 and 1 when x is 1, see one of the smoothstep functions.
 * @returns {Number}    The y value smoothly transitioning between ya and yb.
 */
LBMath.transition = function(x, ya, yb, smoothFunc) {
    var s = smoothFunc(x);
    return ya * (1 - s) + yb * s;
};


/**
 * Cubic spline interpolator.
 * @constructor
 * @param {Array|object} [xs]    Optional array of x values, this must be sorted such that xs[i] &lt; xs[i+1].
 * May also be an object with two properties, 'xs' and 'ys', that are both arrays.
 * @param {Number[]} [ys]    Optional array of y values corresponding to the xs.
 * @returns {module:LBMath.CSpline}
 */
LBMath.CSpline = function(xs, ys) {
    if (xs && !ys) {
        if (xs.xs && xs.ys) {
            ys = xs.ys;
            xs = xs.xs;
        }
    }
    
    if (xs && ys) {
        this.setup(xs, ys);
    }
};

LBMath.CSpline.prototype = {
    /**
     * Call when done with the object to have it release any internal references
     * to other objects to help with garbage collection.
     * @returns {undefined}
     */
    destroy: function() {
        this.xs = null;
        this.y2s = null;
        this.ys = null;
    },

    constructor: LBMath.CSpline,
    
    /**
     * Sets up the interpolator with the values ot interpolate.
     * @param {Number[]} xs    The array of x values, this must be sorted such that xs[i] &lt; xs[i+1].
     * @param {Number[]} ys    The array of y values corresponding to the xs.
     */
    setup: function(xs, ys) {
        this.xs = xs;
        this.ys = ys;
        
        var end = xs.length - 1;
        var u = [];
        u[0] = 0;
        u[end] = 0;
        
        this.y2s = [];
        this.y2s[0] = 0;
        this.y2s[end] = 0;
        
        var i;
        for (i = 1; i < end; ++i) {
            var sig = (xs[i] - xs[i - 1]) / (xs[i + 1] - xs[i - 1]);
            var p = sig * this.y2s[i - 1] + 2;
            this.y2s[i] = (sig - 1) / p;
            u[i] = (ys[i + 1] - ys[i]) / (xs[i+1] - xs[i]) - (ys[i] - ys[i - 1]) / (xs[i] - xs[i - 1]);
            u[i] = (6 * u[i]/(xs[i + 1] - xs[i - 1]) - sig * u[i - 1]) / p;
        }
        
        for (i = end - 1; i >= 0; --i) {
            this.y2s[i] = this.y2s[i] * this.y2s[i + 1] +  u[i];
        }
    },
        
    
    /**
     * Helper to finding the lower index in this.xs bounding a value. Use for caching
     * the index for calls to interpolate() for multi-dimensional data.
     * @param {Number} x    The x value to look for.
     * @returns {Number} The smallest index in this.xs such that this.xs[index] &le; x,
     * -1 if x &lt; this.xs[0].
     */
    findLowIndex: function(x) {
        return LBUtil.bsearch(this.xs, x);
    },

    /**
     * Interpolates a y value given an x value.
     * @param {Number} x  The x value to interpolate.
     * @param {Number} [lowIn] If not undefined, the smallest index in this.xs such that this.xs[lowIn] &le; x,
     * used to avoid the binary search for multiple dimensions.
     * @returns {Number}    The interpolated value.
     */
    interpolate: function(x, lowIn) {
        var low = lowIn || this.findLowIndex(x);               
        var high = low + 1;
        if (low < 0) {
            low = 0;
            high = 1;
        }
        else if (high >= this.xs.length) {
            high = this.xs.length - 1;
            low = high - 1;
        }
        
        var delta = this.xs[high] - this.xs[low];
        var a = (this.xs[high] - x) / delta;
        var b = (x - this.xs[low]) / delta;
        var y = a * this.ys[low] + b * this.ys[high] + ((a*a*a - a) * this.y2s[low] + (b * b * b - b) * this.y2s[high]) * (delta * delta) / 6.;
        return y;
    }
};


/**
 * First order backward finite difference with two terms. Equations from:
 * https://en.wikipedia.org/wiki/Finite_difference_coefficient
 * @param {Number} dt   The time step.
 * @param {Number} f0   The latest value.
 * @param {Number} fm1  The value at time -dt
 * @returns {Number}    The finite difference.
 */
LBMath.finiteDiffBackFirst_2 = function(dt, f0, fm1) {
    return (f0 - fm1) / dt;
};

/**
 * First order backward finite difference with three terms. Equations from:
 * https://en.wikipedia.org/wiki/Finite_difference_coefficient
 * @param {Number} dt   The time step.
 * @param {Number} f0   The latest value.
 * @param {Number} fm1  The value at time -dt
 * @param {Number} fm2  The value at time -2*dt
 * @returns {Number}    The finite difference.
 */
LBMath.finiteDiffBackFirst_3 = function(dt, f0, fm1, fm2) {
    return (1.5*f0 - 2*fm1 + 0.5*fm2) / dt;
};

/**
 * First order backward finite difference with four terms. Equations from:
 * https://en.wikipedia.org/wiki/Finite_difference_coefficient
 * @param {Number} dt   The time step.
 * @param {Number} f0   The latest value.
 * @param {Number} fm1  The value at time -dt
 * @param {Number} fm2  The value at time -2*dt
 * @param {Number} fm3  The value at time -3*dt
 * @returns {Number}    The finite difference.
 */
LBMath.finiteDiffBackFirst_4 = function(dt, f0, fm1, fm2, fm3) {
    return (11/6*f0 - 3*fm1 + 1.5*fm2 - fm3/3) / dt;
};

/**
 * First order backward finite difference with five terms. Equations from:
 * https://en.wikipedia.org/wiki/Finite_difference_coefficient
 * @param {Number} dt   The time step.
 * @param {Number} f0   The latest value.
 * @param {Number} fm1  The value at time -dt
 * @param {Number} fm2  The value at time -2*dt
 * @param {Number} fm3  The value at time -3*dt
 * @param {Number} fm4  The value at time -4*dt
 * @returns {Number}    The finite difference.
 */
LBMath.finiteDiffBackFirst_5 = function(dt, f0, fm1, fm2, fm3, fm4) {
    return (25/12*f0 - 4*fm1 + 3*fm2 -4*fm3/3 + 0.25*fm4) / dt;
};

/**
 * First order backward finite difference that adapts to the number of values
 * passed in.
 * @param {Number|Number[]} dt   The time step if a single value, if an array then the array
 * contains the arguments described below, including the dt.
 * @param {Number} [f0]   The latest value.
 * @param {Number} [fm1]  The value at time -dt
 * @param {Number} [fm2]  The value at time -2*dt
 * @param {Number} [fm3]  The value at time -3*dt
 * @param {Number} [fm4]  The value at time -4*dt
 * @returns {Number}    The finite difference.
 */
LBMath.finiteDiffBackFirst = function(dt, f0, fm1, fm2, fm3, fm4) {
    var args = (Array.isArray(dt)) ? dt : arguments;
    if (args.length === 3) {
        return LBMath.finiteDiffBackFirst_2(args[0], args[1], args[2]);
    }
    if (args.length === 4) {
        return LBMath.finiteDiffBackFirst_3(args[0], args[1], args[2], args[3]);
    }
    if (args.length === 5) {
        return LBMath.finiteDiffBackFirst_4(args[0], args[1], args[2], args[3], args[4]);
    }
    
    return LBMath.finiteDiffBackFirst_5(args[0], args[1], args[2], args[3], args[4], args[5]);
};

/**
 * The maximum number of terms supported by {@link module:LBMath.finiteDiffBackFirst}.
 * @type {Number}
 */
LBMath.finiteDiffBackFirst.MAX_TERMS = 5;

return LBMath;
});
