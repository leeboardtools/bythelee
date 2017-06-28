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
                            dst[val] = Leeboard.copyObject(dst[val], src[val]);
                        }
                    }
                }
        );
    }
    else {
        Object.getOwnPropertyNames(dst).forEach(
                function(val, idx, array) {
                    if (src[val] !== undefined) {
                        dst[val] = Leeboard.copyObject(dst[val], src[val]);
                    }
                }
        );
    }
    return dst;
};

Leeboard.copyObject = function(dst, src) {
    if (typeof dst === "object") {
        if (typeof dst.copy === "function") {
            dst.copy(src);
            return dst;
        }
    }
    return src;
};


/**
 * Determines if a value is both defined and not null.
 * @param {type} v  The value to check.
 * @returns {Boolean}   true if v is defined and not null.
 */
Leeboard.isVar = function(v) {
    return (v !== undefined) && (v !== null);
};


/**
 * Looks through the elements of an array for the first one with a property called 'name'
 * whose value matches a given name.
 * @param {object} array    The array to search.
 * @param {object} name The name to look for.
 * @param {object} [defValue=undefined]   The value to return if an element is not found.
 * @returns {object}    The object, defValue if no element found.
 */
Leeboard.findArrayElementWithName = function(array, name, defValue) {
    for (var i = 0; i < array.length; ++i) {
        if (array[i].name === name) {
            return array[i];
        }
    }
    return defValue;
};

/**
 * Copies the contents of an array, followed by the same contents except in reverse order,
 * into a new array.
 * @param {Array} array    The array to be copied and mirrored.
 * @returns {Array} The new array, undefined/null if array is undefined/null.
 */
Leeboard.copyAndMirrorArray = function(array) {
    if (!array) {
        return array;
    }
    
    var newArray = array.slice();
    for (var i = array.length - 1; i >= 0; --i) {
        newArray.push(array[i]);
    }
    return newArray;
};


/**
 * Retrieves the function in the global scope with a given name.
 * @param {string} str  The name of the function.
 * @returns {function}  The function object.
 * @throws {Error} An error is throw if str could not be resolved to a function object.
 */
Leeboard.stringToFunction = function(str) {
    var arr = str.split(".");
    var fn = window || this;
    for (var i = 0, len = arr.length; i < len; i++) {
        fn = fn[arr[i]];
    }
    if (typeof fn !== 'function') {
        throw new Error("Function " + str + " not found!");
    }
    return fn;
};


/**
 * Creates a new instance of a class object based on properties of a data object.
 * This looks specifically for a 'className' property, which is the name of the class,
 * and an optional 'constructorArgs' property, which is passed as the argument to the
 * class constructor.
 * @param {object} data The data object.
 * @returns {object|undefined}  A new instance of the class or undefined if either data
 * or 'className' is undefined.
 */
Leeboard.newClassInstanceFromData = function(data) {
    if (!data || !data.className) {
        return undefined;
    }
    
    var fn = Leeboard.stringToFunction(data.className);
    return new fn(data.constructorArgs);
};