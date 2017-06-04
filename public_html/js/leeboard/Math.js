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
    
/* global Leeboard */


Leeboard.defZeroTolerance = 1e-10;

/**
 * Determines if a number should be treated as zero (usually for avoiding divide by zero)
 * @param {number} x  The number.
 * @param {number} tolerance    The optional tolerance.
 * @returns {Boolean}   True if x can be considered zero.
 */
Leeboard.isLikeZero = function(x, tolerance) {
    tolerance = tolerance || Leeboard.defZeroTolerance;
    return x < tolerance && x > -tolerance;
}

/**
 * Determines if two numbers are approximately equal.
 * @param {number} a    The first number.
 * @param {number} b    The second number.
 * @param {number} tolerance    The optional tolerance.
 * @returns {Boolean}   True if the numbers can be considered equal.
 */
Leeboard.isNearEqual = function(a, b, tolerance) {
    tolerance = tolerance || Leeboard.defZeroTolerance;
    
    if (Leeboard.isLikeZero(a)) {
        return Leeboard.isLikeZero(b);
    }
    else if (Leeboard.isLikeZero(b)) {
        return false;
    }
    
    var scale = Math.pow(10., -Math.log10(Math.abs(a)));
    var scaledA = a * scale;
    var scaledB = b * scale;
    return (Math.abs(scaledA - scaledB) <= tolerance);
}

/**
 * Third order smoothstep function per https://en.wikipedia.org/wiki/Smoothstep
 * s(x) = -2*x^3 + 3*x^2
 * @param {Number} x The x value.
 * @returns {Number} The smoothstep value, which is 0 if x &le; 0 and 1 if x &ge; 1.
 */
Leeboard.smoothstep3 = function(x) {
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
Leeboard.smoothstep5 = function(x) {
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
Leeboard.smoothstep7 = function(x) {
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
Leeboard.transition = function(x, ya, yb, smoothFunc) {
    var s = smoothFunc(x);
    return ya * (1 - s) + yb * s;
};


/**
 * Cubic spline interpolator.
 * @constructor
 * @returns {Leeboard.CSpline}
 */
Leeboard.CSpline = function() {
};

Leeboard.CSpline.prototype = {
    constructor: Leeboard.CSpline,
    
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
        return Leeboard.bsearch(this.xs, x);
    },

    /**
     * Interpolates a y value given an x value.
     * @param {Number} x  The x value to interpolate.
     * @param {Number} lowIn If not undefined, the smallest index in this.xs such that this.xs[lowIn] &le; x,
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
