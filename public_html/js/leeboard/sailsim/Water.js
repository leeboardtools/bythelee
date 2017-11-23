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


define(['lbsailsimbase', 'lbutil', 'lbmath', 'lbgeometry'],
function(LBSailSim, LBUtil, LBMath, LBGeometry) {

'use strict';

/**
 * The water manager, its primary responsibility is water currents.
 * @constructor
 * @param {LBSailSim.SailEnv} sailEnv The sailing environment this belongs to.
 * @returns {LBSailSim.Water}
 */
LBSailSim.Water = function(sailEnv) {
    this.sailEnv = sailEnv;
    
    /**
     * Density of the water, fresh water is ~1000, salt water is ~1025 kg/m^3
     */
    this.density = 1025;
    
    /**
     * Kinematic viscosity of the water, salt water is ~1e-6 m^2/s
     */
    this.kViscosity = 1e-6;
};

var _workingVel = new LBGeometry.Vector2();

LBSailSim.Water.prototype = {
    constructor: LBSailSim.Water,
    
    /**
     * Retrieves the water current velocity at a given point
     * @param {Number} x    The x coordinate.
     * @param {Number} y    The y coordinate.
     * @param {Number} z    The z coordinate.
     * @param {object} [vel]  If defined the object to receive the velocity.
     * @returns {object}    The object containing the velocity.
     */
    getFlowVelocity: function(x, y, z, vel) {
        var vx = 0;
        var vy = 0;
        //vy = 0.1;
        //vx = 0.4;
        //vx = -0.5;
        if (this.sailEnv && this.sailEnv.boundaries) {
            if (this.sailEnv.boundaries.getBoundaryCurrent(_workingVel)) {
                vx = _workingVel.x;
                vy = _workingVel.y;
            }
        }

        if (!vel) {
            return new LBGeometry.Vector3(vx, vy, 0);
        }
        vel.x = vx;
        vel.y = vy;
        vel.z = 0;
        return vel;
    },
    
    /**
     * Calculates a Reynolds number.
     * @param {Number} vel  The speed.
     * @param {Number} len  The length.
     * @returns {Number}    The Reynolds number.
     */
    calcRe: function(vel, len) {
        return vel * len / this.kViscosity; 
    },
    
    /**
     * Called to update the state of the water.
     * @param {Number} dt   The simulation time step.
     * @returns {LBSailSim.Water}    this.
     */
    update: function(dt) {
        return this;
    }
};

return LBSailSim;
});
