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
 * This is the catch-all file that loads all the LBSailSim dependencies.
 */

define(['lbsailsimbase', 'lbutil', 'lbdelft', 'lbfoilinstance', 'lbhull', 'lbpropulsor', 'lbsail', 'lbsailenv', 'lbvessel'], 
function(LBSailSim, LBUtil) {

LBUtil.registerNamespace('LBSailSim', LBSailSim);

/**
 * Converts an angle in degrees to a compass format (0 &le; angle &lt; 360).
 * @param {Number} degrees  The degrees to convert.
 * @returns {Number}    The degrees in compass format.
 */
LBSailSim.compassDegrees = function(degrees) {
    degrees %= 360;
    if (degrees < 0) {
        degrees += 360;
    }
    return (degrees === 360) ? 0 : degrees;
};

/**
 * Converts an angle from a right-hand x-y coordinate system to compass degrees.
 * <p>The right-hand x-y coordinate system has 0 degrees along the +x direction and
 * 90 degrees along the +y direction.
 * <p>The compass degrees has 0 degrees along the +y direction and 90 degrees along the +x
 * direction. The compass degrees returned is such that 0 &le; angle &lt; 360.
 * @param {Number} degrees  The degrees to convert.
 * @returns {Number}    The degrees in compass format.
 */
LBSailSim.compassDegreesXY = function(degrees) {
    return LBSailSim.compassDegrees(-degrees);
};

return LBSailSim;
});
