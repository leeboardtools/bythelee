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

//
// TODO:

/**
 * The wind manager.
 * @constructor
 * @param {LBSailSim.SailEnv} sailEnv The sailing environment this belongs to.
 * @returns {LBSailSim.Wind}
 */
LBSailSim.Wind = function(sailEnv) {
    this.sailEnv = sailEnv;
    
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
     * @member {module:LBGeometry.Vector2}
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
    
    this._nextPuffTimeRNG = new LBRandom.NormalGenerator();
    this._positionRNG = new LBRandom.UniformGenerator();
    this._speedRNG = new LBRandom.NormalGenerator();
    this._dirDegRNG = new LBRandom.NormalGenerator();
    this._depthRNG = new LBRandom.NormalGenerator();
    this._leadingWidthRNG = new LBRandom.NormalGenerator();
    this._expansionDegRNG = new LBRandom.NormalGenerator();
    this._timeToLiveRNG = new LBRandom.NormalGenerator();
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

        this._speedRNG.stdev = this.averageMPS * this.gustFactor * 0.6667;
        this.baseMPS = this.averageMPS - this._speedRNG.stdev;
        this._speedRNG.mean = this.averageMPS - this.baseMPS;
        
        // The lighter the wind speed, the more angular deviation...
        this._dirDegRNG.mean = this.averageFromDeg;
        this._dirDegRNG.stdev = 180 * this.gustFactor / (2 * this.averageMPS + 1);
        
        this._depthRNG.mean = 20;
        this._depthRNG.stdev = 10;
        
        this._leadingWidthRNG.mean = 30;
        this._leadingWidthRNG.stdev = 10;
        
        this._expansionDegRNG.mean = 2;
        this._expansionDegRNG.stdev = 5;
        
        this._timeToLiveRNG.mean = 30;
        this._timeToLiveRNG.stdev = 15;
        
        this._nextPuffTimeRNG.mean = 10;
        
        // TEST!!!
        this._nextPuffTimeRNG.mean = 5;
        
        this._nextPuffTimeRNG.stdev = this._nextPuffTimeRNG.mean / 3;
        
        this._calcNextPuffTime();
    },
    
    _calcNextPuffTime: function() {
        var deltaTime = this._nextPuffTimeRNG.nextValue();
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
        
        var span = this.maxActivePosition.distanceTo(this.minActivePosition) + this.activeMargin;
        var cx = 0.5 * (this.minActivePosition.x + this.maxActivePosition.x);
        var cy = 0.5 * (this.minActivePosition.y + this.maxActivePosition.y);
        
        var halfSpan = 0.5 * span;
        this._positionRNG.lower = -halfSpan;
        this._positionRNG.upper = halfSpan;
        var px = this._positionRNG.nextValue();
        var py = this._positionRNG.nextValue();
        var x = this.averageToDir.x * px - this.averageToDir.y * py;
        var y = this.averageToDir.y * px + this.averageToDir.x * py;
        _workingPos.set(cx - x, cy - y);
        
        var speed = this._speedRNG.nextValue();
        var fromDeg = this._dirDegRNG.nextValue();
        var headingRad = this.fromDegToHeadingRad(fromDeg);
        _workingVel.set(speed * Math.cos(headingRad), speed * Math.sin(headingRad), 0);

        this.puffOptions = this.puffOptions || {};
        this.puffOptions.depth = Math.max(this._depthRNG.nextValue(), 1);
        this.puffOptions.leadingWidth = Math.max(this._leadingWidthRNG.nextValue(), 10);
        this.puffOptions.expansionDeg = Math.max(this._expansionDegRNG.nextValue(), 1);
        this.puffOptions.timeToLive = Math.max(this._timeToLiveRNG.nextValue(), 5);
        
        puff.setupPuff(_workingPos, _workingVel, this.puffOptions);
    },
    
    fromDegToHeadingRad: function(deg) {
        return (270 - deg) * LBMath.DEG_TO_RAD;
    },
    
    
    /**
     * Calls a function for each active puff.
     * @param {Function} callback   The callback function, it takes one argument, the puff.
     */
    forEachPuff: function(callback) {
        var puff = this.firstPuff;
        while (puff) {
            callback(puff);
            puff = puff.nextPuff;
        }
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
        vel = vel || new LBGeometry.Vector3();
        
        var speed = this.baseMPS;
        vel.x = speed * this.averageToDir.x;
        vel.y = speed * this.averageToDir.y;
        vel.z = 0;
        
        if (this.sailEnv && this.sailEnv.boundaries) {
            if (this.sailEnv.boundaries.getBoundaryWindVel(x, y, _workingVel)) {
                vel.add(_workingVel);
            }
        }
        
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
    },
    
    
    constructor: LBSailSim.Wind
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
 * @param {module:LBGeometry.Vector2} leadingPosition  The position of the center of the leading edge of the puff.
 * @param {module:LBGeometry.Vector2} velocity The velocity the puff is traveling.
 * @param {Object} [options] If defined the options such as depth, leadingWidth, expansionDeg, and timeToLive.
 * the puff's speed becomes zero.
 * @returns {LBSailSim.WindPuff}
 */
LBSailSim.WindPuff = function(leadingPosition, velocity, options) {
    /**
     * The position of the center of the leading edge.
     * @readonly
     * @member {module:LBGeometry.Vector2}
     */
    this.leadingPosition = new LBGeometry.Vector2();
    
    /**
     * The direction the puff is moving in.
     * @readonly
     * @member {module:LBGeometry.Vector2}
     */
    this.velDir = new LBGeometry.Vector2();
    
    /**
     * The current untapered speed of the leading edge.
     * @readonly
     * @member {Number}
     */
    this.speedLeading = 0;
    
    /**
     * The speed originally passed to {@link LBSailSim.WindPuff#setupPuff}.
     * @readonly
     * @member {Number}
     */
    this.refSpeed = 0;
    
    /**
     * The angle, in degrees, defining the arc at which the puff is expanding.
     * @readonly
     * @member {Number}
     */
    this.expansionDeg = 0;
    
    /**
     * The current distance from {@link LBSailSim.WindPuff#centerPos} to the leading edge.
     * @readonly
     * @member {Number}
     */
    this.rLeading = 0;

    /**
     * The current distance from {@link LBSailSim.WindPuff#centerPos} to the trailing edge.
     * @readonly
     * @member {Number}
     */
    this.rTrailing = 0;
    
    /**
     * The distance between {@link LBSailSim.WindPuff#rLeading} and {@link LBSailSim.WindPuff#rTrailing}.
     * @readonly
     * @member {Number}
     */
    this.depth = 0;
    
    /**
     * The center of where the puff is theoretically flowing from.
     * @readonly
     * @member {module:LBGeometry.Vector2}
     */
    this.centerPos = new LBGeometry.Vector2();
    
    /**
     * The total time the puff is to live.
     * @readonly
     * @member {Number}
     */
    this.totalTimeToLive = 0;
    
    /**
     * The total time the puff has been alive.
     * @readonly
     * @member {Number}
     */
    this.timeAlive = 0;
    
    
    /**
     * A rectangle fully enclosing the puff, used for quick bounds checking.
     * @readonly
     * @member {module:LBGeometry.Rect}
     */
    this.boundsRect = new LBGeometry.Rect();
    
    /**
     * The fraction of the radial distance from the leading edge, relative to 
     * the difference between the leading and trailing radii at which to start 
     * the tapering of the speed to 0 at the leading edge.
     * @member {Number}
     */
    this.taperRadialStartLeading = 0.1;

    /**
     * The fraction of the radial distance from the trailing edge, relative to 
     * the difference between the leading and trailing radii at which to start 
     * the tapering of the speed to 0 at the leading edge.
     * @member {Number}
     */
    this.taperRadialStartTrailing = 0.5;
    
    /**
     * The fraction of the arc angle from the arc edges, relative to the expansion 
     * degrees, at which to start the tapering of the speed to 0 at the arc edges.
     * @member {Number}
     */
    this.taperArcStart = 0.1;
    
    /**
     * The fraction of the total time to live at which the startup taper ends.
     * @member {Number}
     */
    this.taperStartupTime = 0.05;
    
    /**
     * The fraction of the total time to live, measured from the end time, at which
     * the shutdown taper ends.
     * @member {Number}
     */
    this.taperShutdownTime = 0.05;
    
    /**
     * The current amount to attenuate the speed to account for the puff starting and shutting down.
     * @readonly
     * @member {Number}
     */
    this.speedAttenuationForTime = 1;
    
    this.setupPuff(leadingPosition, velocity, options);
};

LBSailSim.WindPuff.MIN_EXPANSION_DEG = 0.1;
LBSailSim.WindPuff.MIN_PUFF_SPEED_CUTOFF = 0.1;

LBSailSim.WindPuff.nextPuffId = 0;
//LBSailSim.WindPuff.debugOutput = true;
LBSailSim.WindPuff.debugOutput = false;

LBSailSim.WindPuff.prototype = {
    /**
     * Sets up the puff.
     * @param {module:LBGeometry.Vector2} leadingPosition  The position of the center of the leading edge of the puff.
     * @param {module:LBGeometry.Vector2} velocity The velocity the puff is traveling.
     * @param {Object} [options] If defined the options such as depth, leadingWidth, expansionDeg, and timeToLive.
     * @returns {LBSailSim.WindPuff}
     */
    setupPuff: function(leadingPosition, velocity, options) {
        this.leadingPosition.copy(leadingPosition || LBGeometry.ORIGIN);
        velocity = velocity || LBGeometry.ORIGIN;
        
        options = options || {};
        var depth = options.depth || 10;
        var leadingWidth = options.leadingWidth || 30;
        var expansionDeg = (options.expansionDeg === undefined) || (options.expansionDeg === null)
                ? LBSailSim.WindPuff.MIN_EXPANSION_DEG : options.expansionDeg;
        var timeToLive = ((options.timeToLive === undefined) || (options.timeToLive === null)) ? 30 : options.timeToLive;;
        
        this.depth = depth;
        this.expansionDeg = expansionDeg = Math.max(LBSailSim.WindPuff.MIN_EXPANSION_DEG, expansionDeg);
        this.totalTimeToLive = timeToLive = Math.max(0, timeToLive);
        
        this.timeRemaining = this.totalTimeToLive;
        this.timeAlive = 0;
        this.timeStartupTaper = timeToLive * this.taperStartupTime;
        this.timeShutdownTaper = timeToLive * (1 - this.taperShutdownTime);
        
        this.speedLeading = velocity.length();
        this.refSpeed = this.speedLeading;
        if ((this.speedLeading <= LBSailSim.WindPuff.MIN_PUFF_SPEED_CUTOFF) || !this.timeRemaining) {
            this.speedLeading = 0;
        }
        else {
            this.puffId = LBSailSim.WindPuff.nextPuffId++;
        
            this.velDir.set(velocity.x / this.speedLeading, velocity.y / this.speedLeading);
            
            // Need to figure out the center point.
            // Since leadingWidth is arc-length, expansionDeg is the angular equivalent of arc-length,
            // and we have:
            //  leadingWidth / (2*PI * r) = expansionDeg / 360
            this.rLeading = leadingWidth * 360 / (LBMath.TWO_PI * expansionDeg);
            this.rTrailing = this.rLeading - this.depth;
            
            // The center is just the leadingPosition moved in the negative velocity direction
            // by the radius.
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
            this.edge0Deg = edge0Rad * LBMath.RAD_TO_DEG;
            this.edge1Deg = this.edge0Deg + expansionDeg;
            
            this.edge0Rad = edge0Rad;
            this.edge1Rad = this.edge1Deg * LBMath.DEG_TO_RAD;

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

            if (LBSailSim.WindPuff.debugOutput) {
                console.log("New Puff: " + this.puffId + "  speed: " + this.speedLeading + "  dir: " + 0.5*(this.edge0Deg + this.edge1Deg)
                        + "  leadingEdge: " + this.leadingPosition.x + "," + this.leadingPosition.y);
            }
        }
        
        return this;
    },
    
    _leadingEdgeRadiusUpdated: function() {
        this.rLeadingSq = this.rLeading * this.rLeading;
        this.rTrailing = Math.sqrt(this.rLeadingSq - this.volConst);        
        this.rTrailingSq = this.rTrailing * this.rTrailing;
        
        this.depth = this.rLeading - this.rTrailing;
        
        this.heightTaperPoint = 30 / this.speedLeading;
        
        // Figure out the boundary rectangle.
        // If the edges of the outside of the puff cross the 0, 90, 180 or 270
        // degree points, the outer limit is defined by the radius.
        // this.edge0Deg is >= -180, and this.edge1Deg is >= this.edge0Deg.
        var edge1Rad = this.edge1Deg * LBMath.DEG_TO_RAD;
        var cosEdge1 = Math.cos(edge1Rad);
        var sinEdge1 = Math.sin(edge1Rad);
        
        var edge0LeadingX = this.cosEdge0 * this.rLeading;
        var edge0LeadingY = this.sinEdge0 * this.rLeading;
        var edge0TrailingX = this.cosEdge0 * this.rTrailing;
        var edge0TrailingY = this.sinEdge0 * this.rTrailing;
        var edge1LeadingX = cosEdge1 * this.rLeading;
        var edge1LeadingY = sinEdge1 * this.rLeading;
        var edge1TrailingX = cosEdge1 * this.rTrailing;
        var edge1TrailingY = sinEdge1 * this.rTrailing;
        
        this.boundsRect.makeEmpty();
        this.boundsRect.extendToPoint(edge0LeadingX, edge0LeadingY);
        this.boundsRect.extendToPoint(edge0TrailingX, edge0TrailingY);
        this.boundsRect.extendToPoint(edge1LeadingX, edge1LeadingY);
        this.boundsRect.extendToPoint(edge1TrailingX, edge1TrailingY);
        
        // Now handle any crossings of the axes...
        if ((this.edge0Deg < -90) && (this.edge1Deg > -90)) {
            this.boundsRect.minY = -this.rLeading;
        }
        if ((this.edge0Deg < 0) && (this.edge1Deg > 0)) {
            this.boundsRect.maxX = this.rLeading;
        }
        if ((this.edge0Deg < 90) && (this.edge1Deg > 90)) {
            this.boundsRect.maxY = this.rLeading;
        }
        if (this.edge1Deg > 180) {
            this.boundsRect.minX = -this.rLeading;
        }
        
        this.boundsRect.offset(this.centerPos.x, this.centerPos.y);
    },

    
    /**
     * Determines if an x,y world coordinate is in the puff.
     * @param {Number} x    The x coordinate of the point.
     * @param {Number} y    The y coordinate of the point.
     * @returns {Boolean}   true if the point is in the puff.
     */
    isPointInPuff: function(x, y) {
        if ((this.speedLeading <= 0) || !this.boundsRect.containsPoint(x, y)) {
            return false;
        }
       
        // First check, radius...
        var dx = x - this.centerPos.x;
        var dy = y - this.centerPos.y;
        var rSq = dx * dx + dy * dy;
        if ((rSq < this.rTrailingSq) || (rSq > this.rLeadingSq)) {
            return false;
        }
        
        // Next check, angular bounds.
        // First we need to rotate to our coordinates.
        var localX = dx * this.cosEdge0 + dy * this.sinEdge0;
        var localY = -dx * this.sinEdge0 + dy * this.cosEdge0;
        var tanTheta = localY / localX;
        if ((tanTheta < 0) || (tanTheta > this.maxTanTheta)) {
            return false;
        }
        
        return true;
    },
    
    
    /**
     * Retrieves the flow velocity due to the puff at a given point.
     * @param {Number} x    The x coordinate of the point.
     * @param {Number} y    The y coordinate of the point.
     * @param {Number} [z=10]   The z coordinate of the point. If this is &le; 0 the velocity will be 0.
     * @param {module:LBGeometry.Vector3} [vel]    If defined the object to receive the velocity.
     * @returns {module:LBGeometry.Vector3}    The velocity.
     */
    getFlowVelocity: function(x, y, z, vel) {
        vel = vel ? vel.set(0, 0, 0) : new LBGeometry.Vector3();
        z = (z === null) ? undefined : z;
        if ((this.speedLeading <= 0) || ((z !== undefined) && (z <= 0))) {
            return vel;
        }
        if (!this.boundsRect.containsPoint(x, y)) {
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
        
        speed *= this.speedAttenuationForTime;
        
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
        
        this.timeRemaining -= dt;
        if (this.timeRemaining <= 0) {
            if (LBSailSim.WindPuff.debugOutput) {
                console.log("Puff ended: " + this.puffId);
            }
            this.speedLeading = 0;
            return;
        }
        
        this.timeAlive += dt;
        var timeAliveFraction = this.timeAlive / this.totalTimeToLive;
        if (timeAliveFraction < this.taperStartupTime) {
            this.speedAttenuationForTime = LBMath.smoothstep(0, this.taperStartupTime, timeAliveFraction);
        }
        else {
            this.speedAttenuationForTime = LBMath.smoothstep(0, this.taperShutdownTime, 1 - timeAliveFraction);
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