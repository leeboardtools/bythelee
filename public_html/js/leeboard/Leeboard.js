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

/**
 * @namespace Leeboard
 */
var Leeboard = Leeboard || {};

/**
* Convert p2 physics value (meters) to pixel scale, overloads Phaser.Physics.P2#mpx.
* @param {number} v - The value to convert.
* @return {number} The scaled value.
*/
Leeboard.mpx = function (v) {
    return v *= 20;
};

/**
* Convert pixel value to p2 physics scale (meters), overloads Phaser.Physics.P2#pxm
* @param {number} v - The value to convert.
* @return {number} The scaled value.
*/
Leeboard.pxm = function (v) {
    return v * 0.05;
};

/**
* Convert p2 physics value (meters) to pixel scale and inverses it, overloads Phaser.Physics.P2#mpxi
* @param {number} v - The value to convert.
* @return {number} The scaled value.
*/
Leeboard.mpxi = function (v) {
    return v *= -20;
};

/**
* Convert pixel value to p2 physics scale (meters) and inverses it, overloads Phaser.Physics.P2#pxmi.
* @param {number} v - The value to convert.
* @return {number} The scaled value.
*/
Leeboard.pxmi = function (v) {
    return v * -0.05;
};


/**
 * Converts meters per second to knots.
 * @param {type} mps    The meters/sec to convert.
 * @returns {Number} The value in knots.
 */
Leeboard.mps2kt = function(mps) {
    return mps * 1.94384;
};

/**
 * Converts knots to meters per second.
 * @param {type} knots  The knots to convert.
 * @returns {Number} The value in meters/sec.
 */
Leeboard.kt2mps = function(knots) {
    return knots / 1.94384;
};


/**
 * Simple binary search of a sorted array.
 * @param {Array} array The sorted array in increasing order, array[i] &lt; array[i+1].
 * No check is made.
 * @param {Number} value    The value to locate.
 * @returns {Number}    The index of the first element in array that is &le; value, if
 * value is &lt array[0] then -1 is returned.
 */
Leeboard.bsearch = function(array, value) {
    var lastIndex = array.length - 1;
    if (value < array[0]) {
        return -1;
    }
    else if (value >= array[lastIndex]) {
        return lastIndex;
    }

    var low = 0;
    var high = lastIndex;
    while ((high - low) > 1) {
        var mid = (low + high) >> 1;
        if (value < array[mid]) {
            high = mid;
        }
        else {
            low = mid;
        }
    }

    return low;
};


/**
 * Copies properties that are common to two objects from one object to another.
 * @param {object} dst  The object to copy to.
 * @param {object} src  The obejct to copyf from.
 * @param {object} [filter] If defined, a filter function that should return true
 * if a property should be copied. The function has the call signature of
 * func(propName, dst, src).
 * @returns {object}    dst.
 */
Leeboard.copyCommonProperties = function(dst, src, filter) {
    if (!Leeboard.isVar(src)) {
        return dst;
    }
    if (Leeboard.isVar(filter)) {
        Object.getOwnPropertyNames(dst).forEach(
                function(val, idx, array) {
                    if (src[val] !== undefined) {
                        if (filter(val, dst, src)) {
                            dst[val] = src[val];
                        }
                    }
                }
        );
    }
    else {
        Object.getOwnPropertyNames(dst).forEach(
                function(val, idx, array) {
                    if (src[val] !== undefined) {
                        dst[val] = src[val];
                    }
                }
        );
    }
    return dst;
};


/**
 * Determines if a value is both defined and not null.
 * @param {type} v  The value to check.
 * @returns {Boolean}   true if v is defined and not null.
 */
Leeboard.isVar = function(v) {
    return (v !== undefined) && (v !== null);
};


