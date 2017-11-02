/* 
 * Copyright 2017 albert.
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
 * The wind manager.
 * @constructor
 * @returns {LBSailSim.Wind}
 */
LBSailSim.Wind = function() {
    /**
     * The density.
     * @member {Number}
     */
    this.density = 1.204;
    
    /**
     * The kinematic viscosity.
     * @member {Number}
     */
    this.kViscosity = 1.48e-5;
    
    /**
     * The average wind speed in m/s.
     * @member {Number}
     */
    this.averageMPS;
    
    /**
     * The average direction the wind is blowing from in degrees.
     * @member {Number}
     */
    this.averageFromDeg = 0;
    
    this.setAverageForce(3);
};

LBSailSim.Wind.BEAUFORT_UPPER_BOUNDARY_KTS = [
    1.5,    // 0
    3.5,
    6.5,
    10.5,   // 3
    16.5,
    21.5,
    27.5,   // 6
    33.5,
    40.5,
    47.5,   // 9
    55.5,
    63.5
];

LBSailSim.Wind.MAX_BEAUFORT_FORCE = 12;

/**
 * Converts a wind speed in knots to Beaufort force.
 * @param {Number} knots    The speed in knots.
 * @returns {Number}    The Beaufort force number.
 */
LBSailSim.Wind.getForceForKnots = function(knots) {
    for (var i = 0; i < LBSailSim.Wind.MAX_BEAUFORT_FORCE; ++i) {
        if (knots < LBSailSim.Wind.BEAUFORT_UPPER_BOUNDARY_KTS[i]) {
            return i;
        }
    }
    return i;
};

LBSailSim.Wind.prototype = {
    constructor: LBSailSim.Wind,
    
    /**
     * Sets the average speed of the wind using a Beaufort force value.
     * The average speed is set to the mid-value of the speeds for the force value.
     * @param {Number} force    The force on the Beaufort wind scale.
     * @returns {LBSailSim.Wind.prototype}  this.
     */
    setAverageForce: function(force) {
        if (force < 0) {
            force = 0;
        }
        else if (force > LBSailSim.Wind.MAX_BEAUFORT_FORCE) {
            force = LBSailSim.Wind.MAX_BEAUFORT_FORCE;
        }
        
        var minKts = (force > 0) ? LBSailSim.Wind.BEAUFORT_UPPER_BOUNDARY_KTS[force - 1] : 0;
        var maxKts;
        if (force === LBSailSim.Wind.MAX_BEAUFORT_FORCE) {
            maxKts = 2 * LBSailSim.Wind.BEAUFORT_UPPER_BOUNDARY_KTS[force] - LBSailSim.Wind.BEAUFORT_UPPER_BOUNDARY_KTS[force - 1];
        }
        else {
            maxKts = LBSailSim.Wind.BEAUFORT_UPPER_BOUNDARY_KTS[force];
        }
        
        this.averageMPS = LBUtil.kt2mps(0.5 * (minKts + maxKts));
        
        return this;
    },
    
    /**
     * Sets the average heading angle from which the wind is blowing.
     * @param {Number} deg  
     * @returns {LBSailSim.Wind.prototype}  this.
     */
    setAverageFromDeg: function(deg) {
        deg = LBMath.wrapDegrees(deg);
        if (deg !== this.averageFromDeg) {
            this.averageFromDeg = deg;
        }
        
        return this;
    },
    
    
    /**
     * Retrieves the wind velocity at a given point
     * @param {Number} x    The x coordinate.
     * @param {Number} y    The y coordinate.
     * @param {Number} z    The z coordinate.
     * @param {object} vel  The object to receive the velocity.
     * @returns {object}    The object containing the velocity.
     */
    getFlowVelocity: function(x, y, z, vel) {
        var speed = this.averageMPS;
        var headingRad = (270 - this.averageFromDeg) * LBMath.DEG_TO_RAD;
        var vx = speed * Math.cos(headingRad);
        var vy = speed * Math.sin(headingRad);
        
        if (!vel) {
            return new LBGeometry.Vector3(vx, vy);
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
     * Called to update the state of the wind.
     * @param {Number} dt   The simulation time step.
     * @returns {LBSailSim.Wind}    this.
     */
    update: function(dt) {
        return this;
    }
};


/**
 * Represents a puff of wind. A puff of wind is represented as an isosceles trapezoid (two
 * sides parallel - the bases, the other two the same length - the legs) with the bases
 * representing the leading and trailing edges of the puff. The puff moves along at the
 * average velocity of the wind within the puff. The velocity direction profile within the puff
 * is currently fairly constant fore and aft, but follows a very simple x/y interpolation
 * between the velocity direction at the centerline and the velocity direction at the legs. 
 * The velocity direction at the legs is simply the direction of the legs.
 * The wind speed is constant within the main portion of the puff and tapers towards
 * the edges of the quadrilateral. The speed changes according to the change in volume
 * represented by the quadrilateral. If the quadrilateral is expanding (the leadingWidth is
 * larger than the trailingWidth) then the speed decreases.
 * @constructor
 * @param {LBGeometry.Vector2} leadingPosition  The position of the center of the leading edge of the puff.
 * @param {LBGeometry.Vector2} velocity The velocity the puff is traveling.
 * @param {Number} [depth=10]   The distance between the leading edge and the trailing edge.
 * @param {Number} [leadingWidth=30]    The length of the leading edge of the puff.
 * @param {Number} [trailingWidth=leadingWidth] The length of the trailing edge of the puff. This 
 * should normally be &le; leadingWidth.
 * @param {Number} [distanceToTravel=1000]  The maximum distance the puff will travel. Beyond this distance
 * the puff's speed becomes zero.
 * @returns {LBSailSim.WindPuff}
 */
LBSailSim.WindPuff = function(leadingPosition, velocity, depth, leadingWidth, trailingWidth, distanceToTravel) {
    this.setupPuff(leadingPosition, velocity, depth, leadingWidth, trailingWidth, distanceToTravel);
    
    this.leadingTaperSStart = 0.1;
    this.trailingTaperSStart = 0.5;
    this.taperTStart = 0.1;
};

LBSailSim.WindPuff.MIN_PUFF_SPEED_CUTOFF = 0.1;

var _deltaPosition = new LBGeometry.Vector2();

LBSailSim.WindPuff.prototype = {
    /**
     * Sets up the puff.
     * @param {LBGeometry.Vector2} leadingPosition  The position of the center of the leading edge of the puff.
     * @param {LBGeometry.Vector2} velocity The velocity the puff is traveling.
     * @param {Number} [depth=10]   The distance between the leading edge and the trailing edge.
     * @param {Number} [leadingWidth=30]    The length of the leading edge of the puff.
     * @param {Number} [trailingWidth=leadingWidth] The length of the trailing edge of the puff. This 
     * should normally be &le; leadingWidth.
     * @param {Number} [distanceToTravel=1000]  The maximum distance the puff will travel. Beyond this distance
     * the puff's speed becomes zero.
     * @returns {LBSailSim.WindPuff}
     */
    setupPuff: function(leadingPosition, velocity, depth, leadingWidth, trailingWidth, distanceToTravel) {
        this.leadingPosition = LBUtil.copyOrClone(this.leadingPosition, leadingPosition || new LBGeometry.Vector2());
        this.velocity = LBUtil.copyOrClone(this.velocity, velocity || new LBGeometry.Vector2());
        this.depth = depth || 10;
        this.leadingWidth = leadingWidth || 30;
        this.trailingWidth = trailingWidth || this.leadingWidth;
        this.distanceToTravel = (distanceToTravel > 0) ? distanceToTravel : 1000;
        
        this.speed = this.velocity.length();
        if (this.speed <= LBSailSim.WindPuff.MIN_PUFF_SPEED_CUTOFF) {
            this.speed = 0;
            this.timeDuration = 0;
        }
        else {
            // What do we need for the efficient calculation?
            this.velocityDir = this.velocityDir || new LBGeometry.Vector2();
            this.velocityDir.copy(this.velocity).normalize();
            
            this.depthSq = depth * depth;
            
            this._updateLeadingTrailingEdges();
            
            this.edgeVelocityDirAngle = Math.atan2((leadingWidth - trailingWidth) / 2, depth);            
            this.edgeExpansionSpeed = Math.sin(this.edgeVelocityDirAngle) * this.speed;
            
            // The main speed deceleration rate is based on the premise that the
            // mass flow represented by the puff volume should stay the same. Therefore,
            // if the volume is expanding (i.e. the leading edge is wider than the
            // trailing edge, and the depth stays the same) then the velocity needs
            // to slow down in order to keep the mass flow constant.
            // Volume at T0 for a unit height = depth * (leadingWidth + trailingWidth)/2
            // Volume at T0 + dt = depth * (leadingWidth + edgeExpSpeed * dt * 2 + trailingWidth + edgeExpSpeed * dt * 2) / 2
            // dV = expSpeed * dt * 2
            this.deceleration = 2 * this.edgeExpansionSpeed;
            
            // Throw in a little friction...
            this.deceleration += 0.01 * this.speed;
        }
        
        return this;
    },
    
    _updateLeadingTrailingEdges: function() {
        this.leadingEdge = this._updateEdge(this.leadingEdge, this.leadingPosition.x, this.leadingPosition.y, this.leadingWidth);

        var dir = this.velocityDir;
        var tx = this.leadingPosition.x - dir.x * this.depth;
        var ty = this.leadingPosition.y - dir.y * this.depth;
        this.trailingEdge = this._updateEdge(this.trailingEdge, tx, ty, this.trailingWidth);
        
        // Update the height taper point.
        if (!LBMath.isLikeZero(this.speed)) {
            this.heightTaperPoint = 20 / this.speed;
        }
        else {
            this.heightTaperPoint = 1;
        }
    },
    
    _updateEdge: function(edge, cx, cy, edgeWidth) {
        edge = edge || {
            centerPosition: new LBGeometry.Vector2(),
            segment: new LBGeometry.Line2()
        };
        edge.centerPosition.set(cx, cy);
        edge.edgeWidth = edgeWidth;
        
        var halfWidth = 0.5 * edgeWidth;
        edge.halfWidthSq = halfWidth * halfWidth;
        var dir = this.velocityDir;
        var dx = dir.x * halfWidth;
        var dy = dir.y * halfWidth;
        edge.segment.start.set(cx - dy, cy + dx);
        edge.segment.end.set(cx + dy, cy - dx);
        
        return edge;
    },
    
    _calcParametricProjection: function(x, y, base, end, lengthSq) {
        var dx = x - base.x;
        var dy = y - base.y;
        var segX = end.x - base.x;
        var segY = end.y - base.y;
        return (dx * segX + dy * segY) / lengthSq;
    },
    
    
    /**
     * Retrieves the flow velocity due to the puff at a given point.
     * @param {Number} x    The x coordinate of the point.
     * @param {Number} y    THe y coordinate of the point.
     * @param {Number} [z=10]   The z coordinate of the point. If this is &le; 0 the velocity will be 0.
     * @param {LBGeometry.Vector3} [vel]    If defined the object to receive the velocity.
     * @returns {LBGeometry.Vector3}    The velocity.
     */
    getFlowVelocity: function(x, y, z, vel) {
        vel = vel ? vel.set(0, 0, 0) : new LBGeometry.Vector3();
        if (!this.speed || (z <= 0)) {
            return vel;
        }
        
        z = (z === undefined) ? 10 : z;
        
        // Project the point onto the segment leadingPosition to trailingPosition, to obtain s.
        // If ahead of leadingPosition or behind trailingPosition do nothing.
        var s = this._calcParametricProjection(x, y, this.leadingEdge.centerPosition, this.trailingEdge.centerPosition, this.depthSq);
        if ((s <= 0) || (s >= 1.0)) {
            return vel;
        }
        
        // Project the point onto the leading edge and onto the trailing edge, the parameters
        // will be tLeading and tTrailing, respectively.
        // Since we're parametizing relative to the center position, we use the half width for normalization.
        var tLeading = this._calcParametricProjection(x, y, this.leadingEdge.centerPosition, this.leadingEdge.segment.start, this.leadingEdge.halfWidthSq);
        var tTrailing = this._calcParametricProjection(x, y, this.trailingEdge.centerPosition, this.trailingEdge.segment.start, this.trailingEdge.halfWidthSq);
        var t = tLeading + s * (tTrailing - tLeading);
        if ((t <= -1) || (t >= 1)) {
            return vel;
        }
        
        var velAngle = this.edgeVelocityDirAngle * t;
        var cosAngle = Math.cos(velAngle);
        var sinAngle = Math.sin(velAngle);
        vel.set(this.velocityDir.x * cosAngle - this.velocityDir.y * sinAngle, 
                this.velocityDir.x * sinAngle + this.velocityDir.y * cosAngle,
                0);
        
        // Apply the smoothing functions along s and t to the speed.
        // We're going to ignore the speed variation along the depth of the puff, theoretically
        // it should decrease towards the wider edge.
        var speed = this.speed;
        speed *= LBMath.smoothstep(0, this.leadingTaperSStart, s);
        speed *= LBMath.smoothstep(0, this.trailingTaperSStart, 1-s);
        speed *= LBMath.smoothstep(0, this.taperTStart, Math.abs(1 - t));
        
        // For height, we'll just make it a smoothstep whose mid-point (i.e. 0.5) is at z = 0,
        // and whose edge point is inversely related to the wind speed (i.e. the faster the wind
        // speed, the lower the height at which the step is 1.
        speed *= LBMath.smoothstep3(z / this.heightTaperPoint + 0.5);
        
        vel.multiplyScalar(speed);
        
        return vel;
    },
    
    /**
     * Advances the puff's state for a given time.
     * @param {Number} dt   The time step.
     * @returns {undefined}
     */
    update: function(dt) {
        if (this.speed <= 0) {
            return;
        }
        
        this.distanceToTravel -= this.speed * dt;
        if (this.distanceToTravel <= 0) {
            this.speed = 0;
            this.distanceToTravel = 0;
            return;
        }
        
        _deltaPosition.copy(this.velocity).multiplyScalar(dt);
        this.leadingPosition.add(_deltaPosition);
        
        var deltaWidth = 2 * this.edgeExpansionSpeed * dt;
        this.leadingWidth += deltaWidth;
        this.trailingWidth += deltaWidth;
        
        this._updateLeadingTrailingEdges();
        
        this.speed -= this.deceleration * dt;
    },
    
    constructor: LBSailSim.WindPuff
};
    
    return LBSailSim;
});