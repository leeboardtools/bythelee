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


define(['lbsailsimbase', 'lbutil', 'lbmath', 'lbgeometry', 'lbrandom'],
function(LBSailSim, LBUtil, LBMath, LBGeometry, LBRandom) {
    
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
    
    /**
     * The direction the wind is blowing towards in vector form.
     * @member {LBGeometry.Vector2}
     */
    this.averageToDir = new LBGeometry.Vector2(-1, 0);
    
    /**
     * How gusty the wind puffs should be, a value of 0 means a constant wind,
     * while a value of 1 means very gusty.
     * @member {Number}
     */
    this.gustFactor = 0.5;
    
    this.elapsedTime = 0;
    this.nextPuffTime = Number.MAX_VALUE;
    
    // minActivePosition and maxActivePosition are updated based on the calls
    // to getFlowVelocity(), they are reset each time through update().
    // update() uses the last active range to figure out the active area where puffs
    // are to be generated.
    this.minActivePosition = new LBGeometry.Vector2(Number.MAX_VALUE, Number.MAX_VALUE);
    this.maxActivePosition = new LBGeometry.Vector2(-Number.MAX_VALUE, Number.MAX_VALUE);
    
    /**
     * The area beyond the active boundary to also include in the puff generation.
     */
    this.activeMargin = 200;
    
    /**
     * The first puff in the puff linked list.
     * @member {LBSailSim.WindPuff}
     */
    this.firstPuff = null;
    
    this._firstFreePuff = null;
    
    this._positionRNG = new LBRandom.UniformGenerator();
    this._speedRNG = new LBRandom.NormalGenerator();
    this._dirRNG = new LBRandom.NormalGenerator();
    this._timeRNG = new LBRandom.NormalGenerator();
    
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


var _workingPos = new LBGeometry.Vector2();
var _workingVel = new LBGeometry.Vector3();

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
        
        var averageMPS = LBUtil.kt2mps(0.5 * (minKts + maxKts));
        this.setAverageMPS(averageMPS);
        
        return this;
    },
    
    /**
     * Sets the average wind speed in m/s.
     * @param {Number} averageMPS   The average wind speed in m/s
     * @returns {LBSailSim.Wind}    this.
     */
    setAverageMPS: function(averageMPS) {
        if (this.averageMPS !== averageMPS) {
            this.averageMPS = averageMPS;
            this._updatePuffGeneration();
        }
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
            
            this._updatePuffGeneration();
        }
        
        return this;
    },
    
    /**
     * Sets how gusty the puffs are.
     * @param {Number} gustFactor   The gust factor, a factor of 0 means minimal, 
     * a factor of 1 means very gusty.
     * @returns {LBSailSim.Wind}    this.
     */
    setGustFactor: function(gustFactor) {
        gustFactor = LBMath.clamp(gustFactor, 0, 1);
        if (gustFactor !== this.gustFactor) {
            this.gustFactor = gustFactor;
            this._updatePuffGeneration();
        }
        
        return this;
    },
    
    _updatePuffGeneration: function() {            
        var headingRad = this.fromDegToHeadingRad(this.averageFromDeg);
        this.averageToDir.set(Math.cos(headingRad), Math.sin(headingRad));

        this._speedRNG.mean = this.averageMPS;
        this._speedRNG.stdev = this.averageMPS * this.gustFactor;
        this.baseMPS = this.averageMPS - this._speedRNG.stdev;
        
        // The lighter the wind speed, the more angular deviation...
        this._dirRNG.mean = this.averageFromDeg;
        this._dirRNG.stdev = 180 * this.gustFactor / (this.averageMPS + 1)
        
        this._timeRNG.mean = 10;
        
        // TEST!!!
        this._timeRNG.mean = 5;
        this._timeRNG.stdev = this._timeRNG.mean / 3;
        
        this._calcNextPuffTime();
    },
    
    _calcNextPuffTime: function() {
        var deltaTime = this._timeRNG.nextValue();
        this.nextPuffTime = this.elapsedTime + deltaTime;
    },
    
    _generatePuff: function() {
        // Where is the puff generated?
        // We need a baseline upwind from the center of the active position.
        // We then need the following:
        //  - Wind direction - normal distribution
        //  - Wind speed - normal distribution
        //  - Wind location - uniform distributino
        var puff;
        if (this._firstFreePuff) {
            puff = this._firstFreePuff;
            this._firstFreePuff = puff.nextPuff;
            puff.nextPuff = null;
        }
        else {
            puff = new LBSailSim.WindPuff();
        }
        
        puff.nextPuff = this.firstPuff;
        this.firstPuff = puff;
        
        var span = this.maxActivePosition.distanceTo(this.minActivePosition);
        var cx = 0.5 * (this.minActivePosition.x + this.maxActivePosition.x);
        var cy = 0.5 * (this.minActivePosition.y + this.maxActivePosition.y);
        
        var halfSpan = 0.5 * span;
        this._positionRNG.lower = -halfSpan;
        this._positionRNG.upper = halfSpan;
        var px = this._positionRNG.nextValue();
        var py = this._positionRNG.nextValue();
        _workingPos.set(cx - this.averageToDir.x * px, cy - this.averageToDir.y * py);
        
        var speed = this._speedRNG.nextValue();
        var fromDeg = this._dirRNG.nextValue();
        var headingRad = this.fromDegToHeadingRad(fromDeg);
        _workingVel.set(speed * Math.cos(headingRad), speed * Math.sin(headingRad), 0);
        
        puff.setupPuff(_workingPos, _workingVel);
        //setupPuff: function(leadingPosition, velocity, depth, leadingWidth, expansionDeg, distanceToTravel) {
    },
    
    fromDegToHeadingRad: function(deg) {
        return (270 - deg) * LBMath.DEG_TO_RAD;
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
        var speed = this.baseMPS;
        var vx = speed * this.averageToDir.x;
        var vy = speed * this.averageToDir.y;
        
        if (!vel) {
            return new LBGeometry.Vector3(vx, vy);
        }
        vel.x = vx;
        vel.y = vy;
        vel.z = 0;
        
        if (x < this.minActivePosition.x) {
            this.minActivePosition.x = x;
        }
        if (y < this.minActivePosition.y) {
            this.minActivePosition.y = y;
        }
        if (x > this.maxActivePosition.x) {
            this.maxActivePosition.x = x;
        }
        if (y > this.maxActivePosition.y) {
            this.maxActivePosition.y = y;
        }

        var puff = this.firstPuff;
        while (puff) {
            _workingVel = puff.getFlowVelocity(x, y, z, _workingVel);
            vel.add(_workingVel);
            
            puff = puff.nextPuff;
        }

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
        this.elapsedTime += dt;
        
        var prevPuff = null;
        var puff = this.firstPuff;
        while (puff) {
            puff.update(dt);
            
            if (puff.speedLeading <= 0) {
                var nextPuff = puff.nextPuff;
                if (prevPuff) {
                    prevPuff.nextPuff = puff.nextPuff;
                }
                else {
                    this.firstPuff = puff.nextPuff;
                }
                
                puff.nextPuff = this._firstFreePuff;
                this._firstFreePuff = puff;
                
                puff = nextPuff;
            }
            else {
                prevPuff = puff;
                puff = puff.nextPuff;
            }
        }
        
        // Time for a new puff?
        if (this.elapsedTime >= this.nextPuffTime) {
            this._generatePuff();
            this._calcNextPuffTime();
        }
        
        this.minActivePosition.set(Number.MAX_VALUE, Number.MAX_VALUE);
        this.maxActivePosition.set(-Number.MAX_VALUE, -Number.MAX_VALUE);
        
        return this;
    }
};


/**
 * Represents a puff of wind. A puff of wind is represented as a segment of an annulus, or ring,
 * with the velocity flowing outward from the center of the ring. The edge at the outer radius
 * is the leading edge, the edge at the inner radius is the trailing edge.
 * <p>
 * The ideal velocity decreases with distance from the center point to maintain consevervation of mass.
 * The speed towards the edges of the ring is tapered with a smoothstep function. Also by
 * default there is more tapering applied towards the trailing edge.
 * 
 * @constructor
 * @param {LBGeometry.Vector2} leadingPosition  The position of the center of the leading edge of the puff.
 * @param {LBGeometry.Vector2} velocity The velocity the puff is traveling.
 * @param {Number} [depth=10]   The distance between the leading edge and the trailing edge.
 * @param {Number} [leadingWidth=30]    The arc length of the leading edge of the puff, this is meters.
 * @param {Number} [expansionDeg=10] The angular range by which the leading edge expands, in degrees, this must be &gt; 0.
 * @param {Number} [distanceToTravel=1000]  The maximum distance the puff will travel. Beyond this distance
 * the puff's speed becomes zero.
 * @returns {LBSailSim.WindPuff}
 */
LBSailSim.WindPuff = function(leadingPosition, velocity, depth, leadingWidth, expansionDeg, distanceToTravel) {
    this.setupPuff(leadingPosition, velocity, depth, leadingWidth, expansionDeg, distanceToTravel);
    
    this.taperRadialStartLeading = 0.1;
    this.taperRadialStartTrailing = 0.5;
    this.taperArcStart = 0.1;
};

LBSailSim.WindPuff.MIN_PUFF_SPEED_CUTOFF = 0.1;

LBSailSim.WindPuff.prototype = {
    /**
     * Sets up the puff.
     * @param {LBGeometry.Vector2} leadingPosition  The position of the center of the leading edge of the puff.
     * @param {LBGeometry.Vector2} velocity The velocity the puff is traveling.
     * @param {Number} [depth=10]   The distance between the leading edge and the trailing edge.
     * @param {Number} [leadingWidth=30]    The arc length of the leading edge of the puff, this is meters.
     * @param {Number} [expansionDeg=10] The angular range by which the leading edge expands, in degrees, this must be &gt; 0.
     * @param {Number} [distanceToTravel=1000]  The maximum distance the puff will travel. Beyond this distance
     * the puff's speed becomes zero.
     * @returns {LBSailSim.WindPuff}
     */
    setupPuff: function(leadingPosition, velocity, depth, leadingWidth, expansionDeg, distanceToTravel) {
        this.leadingPosition = LBUtil.copyOrClone(this.leadingPosition, leadingPosition || new LBGeometry.Vector2());
        this.velocity = LBUtil.copyOrClone(this.velocity, velocity || new LBGeometry.Vector2());
        this.depth = depth = depth || 10;
        leadingWidth = leadingWidth || 30;
        this.expansionDeg = expansionDeg = expansionDeg || 10;
        this.distanceToTravel = distanceToTravel = (distanceToTravel > 0) ? distanceToTravel : 1000;
        
        this.speedLeading = this.velocity.length();
        if (this.speedLeading <= LBSailSim.WindPuff.MIN_PUFF_SPEED_CUTOFF) {
            this.speedLeading = 0;
            this.timeDuration = 0;
        }
        else {
            this.velDir = this.velDir || new LBGeometry.Vector2();
            this.velDir.set(this.velocity.x / this.speedLeading, this.velocity.y / this.speedLeading);
            
            // Need to figure out the center point.
            // Since leadingWidth is arc-length, expansionDeg is the angular equivalent of arc-length,
            // and we have:
            //  leadingWidth / (2*PI * r) = expansionDeg / 360
            this.rLeading = leadingWidth * 360 / (LBMath.TWO_PI * expansionDeg);
            this.rTrailing = this.rLeading - this.depth;
            
            // The center is just the leadingPosition moved in the negative velocity direction
            // by the radius.
            this.centerPos = this.centerPos || new LBGeometry.Vector2();
            this.centerPos.copy(this.velDir)
                    .multiplyScalar(-this.rLeading)
                    .add(this.leadingPosition);
            
            // To figure out the velocity at a given point, we'll be transforming that point
            // such that the coordinate frame is rotated to have one edge of the puff at x = 0
            // and the other edge with y &gt; 0.
            var expansionRad = expansionDeg * LBMath.DEG_TO_RAD;
            var edge0Rad = Math.atan2(this.velDir.y, this.velDir.x) - 0.5 * expansionRad;
            this.cosEdge0 = Math.cos(edge0Rad);
            this.sinEdge0 = Math.sin(edge0Rad);            

            // We can then do a quick angular bounds check, the point will be in the
            // puff if rTrailing &le; r &le; rLeading and
            // pt.y / pt.x = tan(thetaPt) is &ge; 0 and &le; tan(expansionRad).
            this.maxTanTheta = Math.tan(expansionRad);            
            
            // We want to maintain a constant mass transfer rate. The mass is moving
            // radially, so for a unit height the mass transfer rate is proportional
            // to the velocity times the arc length.
            //  massTransferRate = speed * arcLength
            //  
            // The arc length is related to the radius based on the arc fraction of the circumference
            // at the radius:
            //  arcLength = expansionRad / (2*PI) * 2*PI*r = expansionRad * radius.
            // 
            // or:
            //  massTransferRate = speed * expansionRad * radius
            //  
            // Since the expansion radians is constant, we can wrap that into massTransferRate:
            //  speedRadiusConst = massTransferRate / expansionRad
            //  speed * radius = speedRadiusConst
            this.speedRadiusConst = this.speedLeading * this.rLeading;
            
            //
            // At the trailing edge we then have:
            //  speedTrailing = speedRadiusConst / rTrailing
            //
            // As rLeading expands outward, rTrailing must also expand at a rate that
            // maintains the same volume. We have the initial volume:
            //  vol = (PI*rLeading^2 - PI*rTrailing^2) * expansionRad / (2*PI())
            //  vol = (rLeading^2 - rTrailing^2) * expansionRad / 2
            // Or, since expansionRad is constant,
            //  volConst = vol * 2 / expansionRad = rLeading^2 - rTraiing^2
            // and:
            //  rTrailing = sqrt(rLeading^2 - volConst)
            this.volConst = (this.rLeading * this.rLeading - this.rTrailing * this.rTrailing);
            
            // Optional deceleration for friction, etc.
            this.speedDecel = 0;
            
            this._leadingEdgeRadiusUpdated();
        }
        
        return this;
    },
    
    _leadingEdgeRadiusUpdated: function() {
        this.rLeadingSq = this.rLeading * this.rLeading;
        this.rTrailing = Math.sqrt(this.rLeadingSq - this.volConst);        
        this.rTrailingSq = this.rTrailing * this.rTrailing;
        
        this.depth = this.rLeading - this.rTrailing;
        
        this.heightTaperPoint = 30 / this.speedLeading;
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
        z = (z === null) ? undefined : z;
        if ((this.speedLeading <= 0) || ((z !== undefined) && (z <= 0))) {
            return vel;
        }
        
        // First check, radius...
        var dx = x - this.centerPos.x;
        var dy = y - this.centerPos.y;
        var rSq = dx * dx + dy * dy;
        if ((rSq < this.rTrailingSq) || (rSq > this.rLeadingSq)) {
            return vel;
        }
        
        // Next check, angular bounds.
        // First we need to rotate to our coordinates.
        var localX = dx * this.cosEdge0 + dy * this.sinEdge0;
        var localY = -dx * this.sinEdge0 + dy * this.cosEdge0;
        var tanTheta = localY / localX;
        if ((tanTheta < 0) || (tanTheta > this.maxTanTheta)) {
            return vel;
        }
        
        // OK, now we're in bounds.
        // The velocity direction goes out radially, which simplifies things ALOT!
        var r = Math.sqrt(rSq);
        vel.set(dx / r, dy / r, 0);
        
        var speed = this.speedRadiusConst / r;
        var radial = (this.rLeading - r) / this.depth;
        var arc = 2 * (tanTheta - this.maxTanTheta/2) / this.maxTanTheta;
        speed *= LBMath.smoothstep(0, this.taperRadialStartLeading, radial);
        speed *= LBMath.smoothstep(0, this.taperRadialStartTrailing, 1 - radial);
        speed *= LBMath.smoothstep(0, this.taperArcStart, Math.abs(1 - arc));
        
        // For height, we'll just make it a smoothstep whose mid-point (i.e. 0.5) is at z = 0,
        // and whose edge point is inversely related to the wind speed (i.e. the faster the wind
        // speed, the lower the height at which the step is 1.
        if (z) {
            speed *= LBMath.smoothstep3(z / this.heightTaperPoint + 0.5);
        }
        
        vel.multiplyScalar(speed);
        
        return vel;
    },
    
    /**
     * Advances the puff's state for a given time step.
     * @param {Number} dt   The time step.
     * @returns {undefined}
     */
    update: function(dt) {
        if (this.speedLeading <= 0) {
            return;
        }
        
        // The radial speed is really a function of the radius, since
        // speed = speedRadiusConst / radius
        // deltaR = integral(speed, 0 to dt)
        // But we also potentially have the frictional deceleration.
        // Since I'm terrible at integrating, I'm just going to do a 4 point
        // trapezoidal type integration.
        var dtInteg = 0.25 * dt;
        var newSpeed = this.speedLeading;
        var newR = this.rLeading + dtInteg * newSpeed;
        newSpeed = this.speedRadiusConst / newR - this.speedDecel * dtInteg;
        newR += dtInteg * newSpeed;
        newSpeed = this.speedRadiusConst / newR - this.speedDecel * dtInteg;
        newR += dtInteg * newSpeed;
        newSpeed = this.speedRadiusConst / newR - this.speedDecel * dtInteg;
        newR += dtInteg * newSpeed;
        newSpeed = this.speedRadiusConst / newR - this.speedDecel * dtInteg;

        var deltaRLeading = Math.max(newR - this.rLeading, 0);
        newSpeed = Math.max(newSpeed, 0);
        
        this.distanceToTravel -= deltaRLeading;
        if (this.distanceToTravel <= 0) {
            this.speedLeading = 0;
            this.distanceToTravel = 0;
            return;
        }        
        
        this.rLeading += deltaRLeading;        
        this.speedLeading = newSpeed;
        this.speedRadiusConst = this.speedLeading * this.rLeading;
        
        this.leadingPosition.set(this.centerPos.x + this.rLeading * this.velDir.x,
                this.centerPos.y + this.rLeading * this.velDir.y);
        
        this._leadingEdgeRadiusUpdated();
    },
    
    constructor: LBSailSim.WindPuff
};
    
    return LBSailSim;
});