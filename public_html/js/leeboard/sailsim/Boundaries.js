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

define(['lbsailsimbase', 'lbgeometry'], 
function(LBSailSim, LBGeometry) {

    'use strict';

/**
 * Defines the sailing environment's boundary lines, that is, where boats are allowed to sail.
 * <p>
 * At present there's only one type of boundary, a 'no sail' boundary.
 * The boundary isn't actually a hard boundary, what it defines are points beyond which the
 * wind and current start the work against the motion of the boat, getting stronger the further
 * past the boundary the vessel goes.
 * <p>
 * The no sail boundary consists of what is essentially a polyline, the area to the left of the
 * polyline is the OK to sail zone, the area to the right is the no sail zone.
 * @constructor
 * @param {LBSailSim.SailEnv} sailEnv   The sailing environment to which this belongs.
 * @returns {LBSailSim.Boundaries}
 */
LBSailSim.Boundaries = function(sailEnv) {
    this.sailEnv = sailEnv;
    
    /**
     * The amount by which to multiply the distance over the boundary to obtain the
     * resisting wind.
     * @member {Number}
     */
    this.windVelDistanceScale = 1;
    
    /**
     * The amount by which to multiply the distance over the boundary to obtain the
     * resisting current.
     * @member {Number}
     */
    this.currentDistanceScale = 0.1;
    
    /**
     * The no sail sections. Each individual section is an object composed of connected segments.
     * @member {Object[]}
     */
    this.noSailSections = [];
    
    /**
     * This is used to pass back information from {@link LBSailSim.Boundaries#_findBoundsInfo}.
     * @private
     */
    this._boundsInfo = {
        type: 0,
        direction: new LBGeometry.Vector2(),
        distanceIn: 0
    };
    
    
    /**
     * These are used to cache the last position passed to {@link LBSailSim.Boundaries#_findBoundsInfo},
     * and are reset each time {@link LBSailSim.Boundaries#update} is called.
     */
    this._lastX = Number.MAX_VALUE;
    this._lastY = Number.MAX_VALUE;
    this._lastFindResult = false;
};

LBSailSim.Boundaries.TYPE_NONE              = 0;
LBSailSim.Boundaries.TYPE_NO_SAIL           = 1;

var _workingPos = new LBGeometry.Vector2();
var _workingDelta = new LBGeometry.Vector2();
var _workingT;

LBSailSim.Boundaries.prototype = {
    /**
     * Loads the boundaries from properties in a data file.
     * @param {Object} data The data file.
     * @returns {LBSailSim.Boundaries}  this.
     */
    load: function(data) {
        this.noSailSections.length = 0;
        if (data.noSailSections) {
            this._loadNoSailSections(data.noSailSections);
        }
        
        this.windVelDistanceScale = data.windVelDistanceScale || this.windVelDistanceScale;
        this.currentDistanceScale = data.currentDistanceScale || this.currentDistanceScale;
        
        return this;
    },
    
    _loadNoSailSections: function(data) {
        var segCount = data.length;
        for (var i = 0; i < segCount; ++i) {
            var section = this._loadNoSailSection(data[i]);
            if (section) {
                this.noSailSections.push(section);
            }
        }
    },
    
    _loadNoSailSection: function(data) {
        if (data.vertices) {
            var vertices = data.vertices;
            var vertexCount = vertices.length / 2;
            if (vertexCount > 1) {
                var section = {
                    vertices: [],
                    segments: []
                };
                
                var coordScale = data.coordScale || 1;
                
                var index = 2;
                section.vertices.push(new LBGeometry.Vector2(vertices[0] * coordScale, vertices[1] * coordScale));
                for (var i = 1; i < vertexCount; ++i, index += 2) {
                    section.vertices.push(new LBGeometry.Vector2(vertices[index] * coordScale, vertices[index + 1] * coordScale));
                    var segment = {
                        start: section.vertices[i - 1],
                        end: section.vertices[i]
                    };
                    segment.dir = segment.end.clone()
                            .sub(segment.start);
                    segment.length = segment.dir.length();
                    segment.dir.divideScalar(segment.length);
                    
                    section.segments.push(segment);
                }
                
                if (data.floatingObject) {
                    var floatingObjectData = Object.create(data.floatingObject);
                    floatingObjectData.pos = new LBGeometry.Vector3();
                    
                    for (var i = 0; i < vertexCount; ++i) {
                        floatingObjectData.name = "Boundary_Post_" + i;
                        floatingObjectData.pos.set(section.vertices[i].x, section.vertices[i].y, 0);
                        this.sailEnv.loadFloatingObject(floatingObjectData);
                    }
                }
                
                return section;
            }
        }
        
        return undefined;
    },
    
    /**
     * Locates the boundary influencing a given x,y position.
     * @param {Number} x    The x coordinate.
     * @param {Number} y    The y coordinate.
     * @returns {Boolean}   true if an influencing boundary was found, the info is in
     * {@link LBSailSim.Boundaries#_boundsInfo}.
     */
    _findBoundsInfo: function(x, y) {
        if ((x === this.lastX) && (y === this.lastY)) {
            return this.lastFindResult;
        }
        
        this.lastX = x;
        this.lastY = y;
        
        _workingPos.set(x, y);
        var minDistanceSq = Number.MAX_VALUE;
        var closestSegment = undefined;
        var closestSegmentT;
        
        var me = this;
        this.noSailSections.forEach(function(section) {
            section.segments.forEach(function(segment) {
                var distanceSq = me._distanceSqToSegment(_workingPos, segment);
                if (distanceSq < minDistanceSq) {
                    minDistanceSq = distanceSq;
                    closestSegment = segment;
                    closestSegmentT = _workingT;
                }
            });
        });
        
        if (closestSegment) {
            // Now we need the cross product to determine which side of the segment we're on.
            _workingDelta.copy(_workingPos)
                    .sub(closestSegment.start);
            var cross = _workingDelta.x * closestSegment.dir.y - _workingDelta.y * closestSegment.dir.x;
            if (cross > 0) {
                // The right side, we're good to go. Almost.
                // We need to figure out the actual direction we want the wind blowing. While
                // the point is projected onto the segment we can just use the normal to the segment,
                // but if it is beyond the ends then we want the direction to point to the
                // appropriate closest end.
                this._boundsInfo.type = LBSailSim.Boundaries.TYPE_NO_SAIL;
                if (closestSegmentT < 0) {
                    this._boundsInfo.direction.copy(closestSegment.start)
                            .sub(_workingPos)
                            .normalize();
                }
                else if (closestSegmentT > closestSegment.length) {
                    this._boundsInfo.direction.copy(closestSegment.end)
                            .sub(_workingPos)
                            .normalize();
                }
                else {
                    this._boundsInfo.direction.set(-closestSegment.dir.y, closestSegment.dir.x);
                }
                
                this._boundsInfo.distanceIn = Math.sqrt(minDistanceSq);
                this._lastFindResult = true;
                return true;
            }
        }
        
        this._lastFindResult = false;
        return false;
    },
    
    _distanceSqToSegment: function(pos, segment) {
        _workingDelta.copy(pos)
                .sub(segment.start);
        var t = _workingDelta.dot(segment.dir);
        _workingT = t;
        if (t <= 0) {
            return pos.distanceToSquared(segment.start);
        }
        else if (t >= segment.length) {
            return pos.distanceToSquared(segment.end);
        }
        
        // _workingDelta is relative to segment.start, so we can use segment.dir...
        var dx = _workingDelta.x - t * segment.dir.x;
        var dy = _workingDelta.y - t * segment.dir.y;
        return dx * dx + dy * dy;
    },
    
    _handleNoSailVel: function(velDistanceScale, vel) {
        if (this._boundsInfo.type === LBSailSim.Boundaries.TYPE_NO_SAIL) {
            vel.copy(this._boundsInfo.direction)
                    .multiplyScalar(this._boundsInfo.distanceIn * velDistanceScale);
            return true;
        }
        return false;
    },
    
    /**
     * Obtains an influencing boundary wind velocity for a point, if any.
     * @param {Number} x    The x coordinate.
     * @param {Number} y    The y coordinate.
     * @param {LBGeometry.Vector2} windVel  Object set to the influencing boundary wind velocity, must be defined.
     * @returns {Boolean}   true if there is an influencing boundary.
     */
    getBoundaryWindVel: function(x, y, windVel) {
        if (this._findBoundsInfo(x, y)) {
            if (this._handleNoSailVel(this.windVelDistanceScale, windVel)) {
                return true;
            }
        }
        return false;
    },
    
    
    /**
     * Obtains an influencing boundary current for a point, if any.
     * @param {Number} x    The x coordinate.
     * @param {Number} y    The y coordinate.
     * @param {LBGeometry.Vector2} current  Object set to the influencing boundary current, must be defined.
     * @returns {Boolean}   true if there is an influencing boundary.
     */
    getBoundaryCurrent: function(x, y, current) {
        if (this._findBoundsInfo(x, y)) {
            if (this._handleNoSailVel(this.currentDistanceScale, current)) {
                return true;
            }
        }
        return false;
    },
    
    
    /**
     * Placeholder, will be used to define the crossing of an exit boundary, such as going into another scene.
     * @param {Number} x    The x coordinate.
     * @param {Number} y    The y coordinate.
     * @returns {undefined}
     */
    getExitBoundary: function(x, y) {
        return undefined;
    },
    
    
    /**
     * The update method...
     * @param {Number} dt   The time step.
     */
    update: function(dt) {
        this._lastX = Number.MAX_VALUE;
        this._lastY = Number.MAX_VALUE;
    },
    
    constructor: LBSailSim.Boundaries
};

/**
 * Creates an {@link LBSailSim.Boundaries} object and loads it from properties in a data object.
 * @param {LBSailSim.SailEnv} sailEnv   The sailing environment to which this belongs.
 * @param {Object} data The data object.
 * @returns {LBSailSim.Boundaries}  The created/loaded boundaries object.
 */
LBSailSim.Boundaries.createFromData = function(sailEnv, data) {
    var boundaries = new LBSailSim.Boundaries(sailEnv);
    
    boundaries.load(data);
    
    return boundaries;
};

return LBSailSim;
});
