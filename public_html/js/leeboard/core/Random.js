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

define(['lbmath'],
function(LBMath) {
    'use strict';

/**
 * Some simple random number and statistical based functions.
 * @exports LBRandom
 */
var LBRandom = {};


/**
 * Generator of uniformly distributed random numbers within a range.
 * @constructor
 * @param {Number} lower    The lower value of the range, whether or not this is inclusive
 * depends upon rngFunction.
 * @param {Number} upper    The upper value of the range, whether or not this is inclusive
 * depends upon rngFunction.
 * @param {Function} [rngFunction=Math.random]  The random number generator function, this
 * should return a value between 0 and 1.
 * @returns {module:LBRandom.UniformGenerator}
 */
LBRandom.UniformGenerator = function(lower, upper, rngFunction) {
    this.lower = lower || 0;
    this.upper = (upper === undefined) && (upper === null) ? 1 : upper;
    this.rngFunction = rngFunction || Math.random;
};

LBRandom.UniformGenerator.prototype = {
    /**
     * Returns the next generated number.
     * @returns {Number}
     */
    nextValue: function() {
        return this.rngFunction() * (this.upper - this.lower) + this.lower;
    },

    constructor: LBRandom.UniformGenerator
};

/**
 * Generator for normal (Gaussian) distributions, this uses the Box-Muller transform {@link https://en.wikipedia.org/wiki/Box-Muller_transform}.
 * @constructor
 * @param {Number} mean The mean to generate around.
 * @param {Number} stdev    The standard deviation for the distribution.
 * @param {Function} [rngFunction=Math.random]  The random number generator function, this
 * should return a value between 0 and 1.
 * @returns {module:LBRandom.NormalGenerator}
 */
LBRandom.NormalGenerator = function(mean, stdev, rngFunction) {
    this.mean = mean || 0;
    this.stdev = stdev || 1;
    this.rngFunction = rngFunction || Math.random;
};

LBRandom.NormalGenerator.prototype = {
    /**
     * Returns the next generated number.
     * @returns {Number}
     */
    nextValue: function() {
        var value;
        if (this._nextValue !== undefined) {
            var value = this._nextValue;
            this._nextValue = undefined;
        }
        else {

            // Box-Muller transform: https://en.wikipedia.org/wiki/Box%E2%80%93Muller_transform
            var u1 = this.rngFunction() || Number.MIN_VALUE;            
            var u2 = this.rngFunction();

            var sqrtTerm = Math.sqrt(-2 * Math.log(u1));
            var angle = u2 * LBMath.TWO_PI;
            value = sqrtTerm * Math.cos(angle);
            this._nextValue = sqrtTerm * Math.sin(angle);
        }

        return value * this.stdev + this.mean;
    },

    constructor: LBRandom.NormalGenerator
};


/**
 * Calclates the mean of an array of values.
 * @param {Number[]} values The array of values.
 * @returns {Number}    The mean.
 */
LBRandom.mean = function(values) {
    var sum = 0;
    values.forEach(function(value) {
        sum += value;
    });

    return sum / values.length;
};

/**
 * Calculates the variance of an array of values.
 * @param {Number[]} values The array of values.
 * @param {Number} [mean]   If defined and not null the mean to use, otherwise
 * it is calculated from values.
 * @returns {Number}    The variance.
 */
LBRandom.variance = function(values, mean) {
    if ((mean === undefined) || (mean === null)) {
        mean = LBRandom.mean(values);
    }

    var sum = 0;
    values.forEach(function(value) {
        var delta = value - mean;
        sum += delta * delta;
    });

    return sum / values.length;
};

/**
 * Calculates the standard deviation of an array of values.
 * @param {Number[]} values The array of values.
 * @param {Number} [mean]   If defined and not null the mean to use, otherwise
 * it is calculated from values.
 * @returns {Number}    The standard deviation.
 */
LBRandom.stdev = function(values, mean) {
    return Math.sqrt(LBRandom.variance(values, mean));
};
    
return LBRandom;
});
