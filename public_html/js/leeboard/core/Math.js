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
    

/**
 * 
 * @namespace LBMath
 */
var LBMath = LBMath || {};

/**
 * @property {Number} DEG_TO_RAD    Degrees to radians scale.
 */
LBMath.DEG_TO_RAD = Math.PI / 180;

/**
 * @property {Number} RAD_TO_DEG    Radians to degrees scale.
 */
LBMath.RAD_TO_DEG = 180 / Math.PI;

/**
 * @property {Number} TWO_PI    2 * PI
 */
LBMath.TWO_PI = Math.PI * 2;

/**
 * @property {Number} PI_2    PI / 2
 */
LBMath.PI_2 = Math.PI / 2;

/**
 * @property {Number} The default zero tolerance used by {@link LBMath.isLikeZero} and {@link LBMath.isNearEqual}.
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
 * Converts a value to zero if it is considered like zero by {@link LBMath.isLikeZero}.
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
 * Subtracts b from a in degrees, wrapping the result such that |b - a| &le; 180.
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
 * @param {type} x  The transition value to pass to smoothFunc
 * @param {type} ya The output for x &le; 0.
 * @param {type} yb The output for x &ge; 1.
 * @param {type} smoothFunc The smoothing function, should smoothly transition
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
 * @param {Array} [ys]    Optional array of y values corresponding to the xs.
 * @returns {LBMath.CSpline}
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
     * @param {Array} xs    The array of x values, this must be sorted such that xs[i] &lt; xs[i+1].
     * @param {Array} ys    The array of y values corresponding to the xs.
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
 * The maximum number of terms supported by {@link LBMath.finiteDiffBackFirst}.
 * @type Number
 */
LBMath.finiteDiffBackFirst.MAX_TERMS = 5;

return LBMath;
});
