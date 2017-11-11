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

define(['lbutil', 'lbmath', 'lbgeometry', 'lbvolume'],
function(LBUtil, LBMath, LBGeometry, LBVolume) {

    'use strict';
    

/**
 * This module contains various physics related classes and helpers.
 * @exports   LBPhysics
 */
var LBPhysics = LBPhysics || {};

/**
 * Calculates the moment about the origin of a force applied at a position.
 * @param {module:LBGeometry.Vector3} force  The force.
 * @param {module:LBGeometry.Vector3} position   The application point of the force.
 * @param {module:LBGeometry.Vector3} [store]  If defined the 3D vector to receive the cross product.
 * @returns {module:LBGeometry.Vector3} Vector representing the moment about the origin from 
 * force being applied at position.
 */
LBPhysics.calcMoment = function(force, position, store) {
    // Need to use LBUtil.isVar() because z is numeric.
    if (!LBUtil.isVar(force.z)) {
        return LBGeometry.crossVectors2(position, force, store);
    }
    return LBGeometry.crossVectors3(position, force, store);
};

/**
 * A 3D resultant force, which is a force vector, a moment vector, and an application point.
 * @constructor
 * @param {module:LBGeometry.Vector3} force  The force vector.
 * @param {module:LBGeometry.Vector3} moment The moment vector.
 * @param {module:LBGeometry.Vector3} position   The application point.
 * @returns {module:LBPhysics.Resultant3D}  The resultant.
 */
LBPhysics.Resultant3D = function(force, moment, position) {
    /**
     * The force vector.
     * @member {module:LBGeometry.Vector3}
     */
    this.force = LBUtil.copyCommonProperties(new LBGeometry.Vector3(), force);

    /**
     * The moment vector.
     * @member {module:LBGeometry.Vector3}
     */
    this.moment = LBUtil.copyCommonProperties(new LBGeometry.Vector3(), moment);

    /**
     * The force application point.
     * @member {module:LBGeometry.Vector3}
     */
    this.applPoint = LBUtil.copyCommonProperties(new LBGeometry.Vector3(), position);
};

LBPhysics.Resultant3D._workingLine3 = new LBGeometry.Line3();
LBPhysics.Resultant3D._workingPos = new LBGeometry.Vector3();

LBPhysics.Resultant3D.prototype = {
    /**
     * Creates a copy of the resultant.
     * @returns {module:LBPhysics.Resultant3D}
     */
    clone: function() {
        return new LBPhysics.Resultant3D(this.force, this.moment, this.applPoint);
    },
    
    
    /**
     * Sets this resultant to match the settings of another.
     * @param {module:LBPhysics.Resultant3D} toCopy   The resultant to copy.
     * @returns {module:LBPhysics.Resultant3D}  this.
     */
    copy: function(toCopy) {
        if (this !== toCopy) {
            this.force.copy(toCopy.force);
            this.moment.copy(toCopy.moment);
            this.applPoint.copy(toCopy.applPoint);
        }
        return this;
    },
    
    /**
     * Adds a force applied at a position to the resultant. The application point of the
     * resultant is not changed.
     * @param {module:LBGeometry.Vector3} force  The force to add.
     * @param {module:LBGeometry.Vector3} position   The position at which the force is added.
     * @returns {module:LBPhysics.Resultant3D} this.
     */
    addForce: function(force, position) {
        if (!this.applPoint.equals(position)) {
            var arm = LBGeometry.subVectors3(position, this.applPoint);
            var moment = LBPhysics.calcMoment(force, arm);
            this.moment.add(moment);
        }
        
        this.force.add(force);
        return this;
    },
    
    /**
     * Adds a resultant to this resultant. The application point of this resultant is
     * not changed.
     * @param {module:LBPhysics.Resultant3D} other    The resultant to be added.
     * @returns {module:LBPhysics.Resultant3D} this.
     */
    addResultant: function(other) {
        var deltaPos = LBGeometry.subVectors3(other.applPoint, this.applPoint);
        var moment = LBPhysics.calcMoment(other.force, deltaPos);
        moment.add(other.moment);
        
        this.moment.add(moment);
        this.force.add(other.force);
        return this;
    },
    
    /**
     * Moves the application point of the resultant, the moment is adjusted accordingly.
     * @param {module:LBGeometry.Vector3} position   The new application point.
     * @returns {module:LBPhysics.Resultant3D} this.
     */
    moveApplPoint: function(position) {
        if (!this.applPoint.equals(position)) {
            var r = LBGeometry.subVectors3(this.applPoint, position);
            var moment = LBPhysics.calcMoment(this.force, r);
            this.moment.add(moment);
            this.applPoint.copy(position);
        }
        
        return this;
    },
    
    /**
     * Moves the application point such that the moment vector is parallel to the
     * force vector. The application point and moment may be modified, the force vector is not.
     * @param {module:LBGeometry.Plane} [plane] If defined the plane where the application point
     * should be in, if possible.
     * @param {module:LBGeometry.Sphere} [planeBoundsSphere] If both this and plane are defined, this
     * is a sphere within which the plane application point must be for the application point
     * to be moved to the plane. This prevents the application point from shooting far away
     * when the force direction is near the same direction as the plane.
     * @param {module:LBGeometry.Plane} [secondaryPlane]   If defined, a secondary plane, which is
     * used instead of plane if the intersection point is outside of planeBoundSphere.
     * planeBoundSphere must be defined for this to be used. This should be orthogonal
     * to plane.
     * @returns {module:LBPhysics.Resultant3D}  this.
     */
    convertToWrench: function(plane, planeBoundsSphere, secondaryPlane) {
        var forceMagSq = this.force.lengthSq();
        if (LBMath.isLikeZero(forceMagSq)) {
            return this;
        }
        
        // Find the parallel moment.
        var normScale = 1./Math.sqrt(forceMagSq);
        var forceDir = new LBGeometry.Vector3(this.force.x * normScale, this.force.y * normScale, this.force.z * normScale);        
        var pMoment = forceDir.multiplyScalar(this.moment.dot(forceDir));

        // And then the perpendicular moment, which is moment - parallel moment.
        var moment = LBGeometry.subVectors3(this.moment, pMoment);
        if (LBGeometry.isVectorLikeZero(moment)) {
            // Already a wrench...
            return this;
        }
        
        var r = LBGeometry.crossVectors3(moment, this.force);
        r.multiplyScalar(-1./forceMagSq);
        
        this.applPoint.add(r);
        this.moment.copy(pMoment);
        
        if (plane) {
            var line = LBPhysics.Resultant3D._workingLine3;
            line.start.copy(this.applPoint);
            line.end.copy(this.applPoint).add(this.force);
            var isMoved = false;
            var pos = LBGeometry.getLinePlaneIntersection(plane, line, LBPhysics.Resultant3D._workingPos);
            if (pos) {
                if (!planeBoundsSphere || planeBoundsSphere.containsPoint(pos)) {
                    this.applPoint.copy(pos);
                    isMoved = true;
                }
            }
            
            if (!isMoved && planeBoundsSphere && secondaryPlane) {
                pos = LBGeometry.getLinePlaneIntersection(secondaryPlane, line, LBPhysics.Resultant3D._workingPos);
                if (pos && planeBoundsSphere.containsPoint(pos)) {
                    this.applPoint.copy(pos);
                }
            }
        }
        
        return this;
    },
    
    
    /**
     * Rotates the force and moment vectors by applying a quaternion.
     * @param {module:LBGeometery.Quaternion} quaternion The quaternion defining the rotation.
     * @returns {module:LBPhysics.Resultant3D}  this.
     */
    applyQuaternion: function(quaternion) {
        this.force.applyQuaternion(quaternion);
        this.moment.applyQuaternion(quaternion);
        return this;
    },
    
    
    /**
     * Applies a 4x4 matrix represnting a transformation to the resultant. The
     * force and monent vectors are rotated, while the application point is tranlsated
     * and rotated.
     * @param {module:LBGeometry.Matrix4} mat  The 4x4 matrix to apply.
     * @returns {module:LBPhysics.Resultant3D}  this.
     */
    applyMatrix4: function(mat) {
        this.force.applyMatrix4Rotation(mat);
        this.moment.applyMatrix4Rotation(mat);
        this.applPoint.applyMatrix4(mat);
        return this;
    },
    
    
    /**
     * Applies a scale to all the distance related components of the resultant,
     * used for changing distance units.
     * @param {Number} scale    The scale to apply.
     * @returns {module:LBPhysics.Resultant3D} this.
     */
    applyDistanceScale: function(scale) {
        this.force.multiplyScalar(scale);
        this.moment.multiplyScalar(scale);
        this.applPoint.multiplyScalar(scale);
        return this;
    },
    
    
    /**
     * Determines if the resultant does not apply a force or moment.
     * @returns {Boolean}   True if both the force and moment are zero.
     */
    isZero: function() {
        return this.force.isZero() && this.moment.isZero();
    },
    
    
    /**
     * Sets all the terms of the resultant to all zeroes.
     * @returns {module:LBPhysics.Resultant3D}  this.
     */
    zero: function() {
        this.force.zero();
        this.moment.zero();
        this.applPoint.zero();
        return this;
    },
    
    
    /**
     * Call when done with the object to have it release any internal references
     * to other objects to help with garbage collection.
     * @returns {undefined}
     */
    destroy: function() {
        this.force = null;
        this.moment = null;
        this.applPoint = null;
    }
};


LBPhysics._calcVector3VelocityWorkingArray = [];
/**
 * Given an array of positions, calculates the velocity using backward finite difference.
 * @param {Number} dt   The time step.
 * @param {module:LBGeometry.Vector3[]} positions  The array of positions, positions[0] is the latest,
 *  positions[1] is at t - dt, positions[2] is at t - 2*dt, etc.
 * @param {module:LBGeometry.Vector3} store    If defined the vector to store the velocity into.
 * @param {Number} [positionCount]  If defined the number of positions in positions to use, otherwise
 *  all the positions are considered.
 * @returns {module:LBGeometry.Vector3}    The velocity vector.
 */
LBPhysics.calcVector3Velocity = function(dt, positions, store, positionCount) {
    store = store || new LBGeometry.Vector3();    
    
    positionCount = positionCount || positions.length;
    positionCount = Math.min(positionCount, LBMath.finiteDiffBackFirst.MAX_TERMS);
    
    var args = LBPhysics._calcVector3VelocityWorkingArray;
    args[0] = dt;
    
    args.length = 1;
    for (var i = 0; i < positionCount; ++i) {
        args[i+1] = positions[i].x;
    }    
    store.x = LBMath.finiteDiffBackFirst(args);
        
    args.length = 1;
    for (var i = 0; i < positionCount; ++i) {
        args[i+1] = positions[i].y;
    }    
    store.y = LBMath.finiteDiffBackFirst(args);
        
    args.length = 1;
    for (var i = 0; i < positionCount; ++i) {
        args[i+1] = positions[i].z;
    }    
    store.z = LBMath.finiteDiffBackFirst(args);
    
    return store;
};

/**
 * Holds a pair of transforms for converting between a world coordinate system and a
 * local coordinate system. Used by [@link module:LBPhysics.CoordSystemState}.
 * @constructor
 * @returns {module:LBPhysics.CoordTransforms}
 */
LBPhysics.CoordTransforms = function() {
    /**
     * The matrix transforming from local to world coordinates.
     * @member {module:LBGeometry.Matrix4}
     */
    this.worldXfrm = new LBGeometry.Matrix4();

    /**
     * The matrix transforming from world to local coordinates.
     * @member {module:LBGeometry.Matrix4}
     */
    this.localXfrm = new LBGeometry.Matrix4();
};

LBPhysics.CoordTransforms.prototype = {
    /**
     * Sets the world and local transforms. If either Xfrm matrix is not defined it is obtained by inverting the
     * other matrix, if both are not defined then the matrices are set to the identity
     * matrix.
     * @param {module:LBGeometry.Matrix4} [worldXfrm]    If defined, the 4x4 matrix for transforming from local to world coordinaes.
     * @param {module:LBGeometry.Matrix4} [localXfrm]    If defined, the 4x4 matrix for transforming from world to local coordinates.
     * @returns {module:LBPhysics.CoordTransforms} this.
     */
    setXfrms: function(worldXfrm, localXfrm) {        
        if (!localXfrm){
            if (!worldXfrm) {
                // Presume they're both going to be identity...
                this.worldXfrm.identity();
                this.localXfrm.identity();
            }
            else {
                this.localXfrm.getInverse(worldXfrm);
                this.worldXfrm.copy(worldXfrm);
            }
        }
        else if (!worldXfrm) {
            this.localXfrm.copy(localXfrm);
            this.worldXfrm.getInverse(localXfrm);
        }
        else {
            this.localXfrm.copy(localXfrm);
            this.worldXfrm.copy(worldXfrm);
        }
        
        return this;
    },
    
    /**
     * Sets this to match another.
     * @param {module:LBPhysics.CoordTransforms} other The transforms to be copied.
     * @returns {module:LBPhysics.CoordTransforms} this.
     */
    copy: function(other) {
        this.worldXfrm.copy(other.worldXfrm);
        this.localXfrm.copy(other.localxXfrm);
        
        return this;
    },
    
    /**
     * Converts a vector from local to world coordinates.
     * @param {module:LBGeometry.Vector3} vector   The vector in local coordinates to be transformed.
     * @param {module:LBGeometry.Vector3} [store]  If defined, the vector to store the world coordinates into,
     * may be the same as vector.
     * @returns {module:LBGeometry.Vector3}    The vector containing the world coordinates.
     */
    vector3ToWorld: function(vector, store) {
        if (!store) {
            store = vector.clone();
        }
        else if (store !== vector) {
            store.copy(vector);
        }
        
        store.applyMatrix4(this.worldXfrm);
        return store;
    },
    
    /**
     * Converts a vector from world to local coordinates.
     * @param {module:LBGeometry.Vector3} vector   The vector in world coordinates to be transformed.
     * @param {module:LBGeometry.Vector3} [store]  If defined, the vector to store the local coordinates into,
     * may be the same as vector.
     * @returns {module:LBGeometry.Vector3}    The vector containing the local coordinates.
     */
    vector3ToLocal: function(vector, store) {
        if (!store) {
            store = vector.clone();
        }
        else if (store !== vector) {
            store.copy(vector);
        }
        
        store.applyMatrix4(this.localXfrm);
        return store;
    },
    
    /**
     * Applies the local to world rotation to a vector.
     * @param {module:LBGeometry.Vector3} vector   The vector in local coordinates to be transformed.
     * @param {module:LBGeometry.Vector3} [store]  If defined, the vector to store the world coordinates into,
     * may be the same as vector.
     * @returns {module:LBGeometry.Vector3}    The vector containing the world coordinates.
     */
    vector3ToWorldRotation: function(vector, store) {
        if (!store) {
            store = vector.clone();
        }
        else if (store !== vector) {
            store.copy(vector);
        }
        
        store.applyMatrix4Rotation(this.worldXfrm);
        return store;
    },
    
    /**
     * Applies the world to local rotation to a vector.
     * @param {module:LBGeometry.Vector3} vector   The vector in world coordinates to be transformed.
     * @param {module:LBGeometry.Vector3} [store]  If defined, the vector to store the local coordinates into,
     * may be the same as vector.
     * @returns {module:LBGeometry.Vector3}    The vector containing the local coordinates.
     */
    vector3ToLocalRotation: function(vector, store) {
        if (!store) {
            store = vector.clone();
        }
        else if (store !== vector) {
            store.copy(vector);
        }
        
        store.applyMatrix4Rotation(this.localXfrm);
        return store;
    },
    
    /**
     * Call when done with the object to have it release any internal references
     * to other objects to help with garbage collection.
     * @returns {undefined}
     */
    destroy: function() {
        this.localXfrm = null;
        this.worldXfrm = null;
        
    },
    
    constructor: LBPhysics.CoordTransforms
};


/**
 * This is used to track the transforms for converting between a world coordinate
 * system and a local coordinate system. It can also keep track of the previous transforms
 * so it may calculate the world and local velocities of points in either coordinate
 * system.
 * @constructor
 * @param {Number} [velTerms=2]   The number of terms to use for the finite difference
 * velocity calculation, must be at least 2.
 * @returns {module:LBPhysics.CoordSystemState}
 */
LBPhysics.CoordSystemState = function(velTerms) {
    if (velTerms === undefined) {
        velTerms = 2;
    }
    if (velTerms <= 0) {
        velTerms = 2;
    }
    else if (velTerms > LBMath.finiteDiffBackFirst.MAX_TERMS) {
        velTerms = LBMath.finiteDiffBackFirst.MAX_TERMS;
    }

    /**
     * The array of coordinate transforms
     */
    this.xfrmsBuffer = new LBUtil.RollingBuffer(velTerms);
    
    /**
     * The time step passed to {@link module:LBPhysics.CoordSystemState#setXfrms}.
     * @member {Number}
     */
    this.dt = 0;
  
};

LBPhysics.CoordSystemState._workingPosA = new LBGeometry.Vector3();
LBPhysics.CoordSystemState._workingPosB = new LBGeometry.Vector3();
LBPhysics.CoordSystemState._workingPosC = new LBGeometry.Vector3();
LBPhysics.CoordSystemState._workingPosD = new LBGeometry.Vector3();
LBPhysics.CoordSystemState._workingPlane = new LBGeometry.Plane();
LBPhysics.CoordSystemState._workingPositions = [];

LBPhysics.CoordSystemState.prototype = {
    /**
     * Sets the world and local transforms, saving the previous transforms in the
     * process. If either Xfrm matrix is not defined it is obtained by inverting the
     * other matrix, if both are not defined then the matrices are set to the identity
     * matrix.
     * @param {module:LBGeometry.Matrix4} [worldXfrm]    If defined, the 4x4 matrix for transforming from local to world coordinaes.
     * @param {Number} [dt]   The simulation time change from the last call to this, used
     * to compute velocity.
     * @param {module:LBGeometry.Matrix4} [localXfrm]    If defined, the 4x4 matrix for transforming from world to local coordinates.
     * @returns {module:LBPhysics.CoordSystemState} this.
     */
    setXfrms: function(worldXfrm, dt, localXfrm) {
        // Need to use LBUtil.isVar() because dt is numeric.
        if ((dt === undefined) || dt <= 0) {
            this.xfrmsBuffer.clear();
        }
        this.dt = dt;
        
        if (!this.xfrmsBuffer.isFull()) {
            // If we're not full we need to create a new xfrms object.
            this.xfrmsBuffer.push(new LBPhysics.CoordTransforms());
        }
        else {
            // We'll just push the oldest xfrms object back to the front...
            this.xfrmsBuffer.push(this.xfrmsBuffer.getOldest());
        }
        this.xfrmsBuffer.getNewest().setXfrms(worldXfrm, localXfrm);
        
        this.worldXfrm = this.xfrmsBuffer.getNewest().worldXfrm;
        this.localXfrm = this.xfrmsBuffer.getNewest().localXfrm;
        
        return this;
    },
    
    /**
     * Retrieves the number of positions used for computing velocity.
     */
    getVelocityTerms: function() {
        return this.xfrmsBuffer.getMaxSize();
    },
    
    /**
     * Converts a vector from local to world coordinates.
     * @param {module:LBGeometry.Vector3} vector   The vector in local coordinates to be transformed.
     * @param {module:LBGeometry.Vector3} [store]  If defined, the vector to store the world coordinates into,
     * may be the same as vector.
     * @returns {module:LBGeometry.Vector3}    The vector containing the world coordinates.
     */
    vector3ToWorld: function(vector, store) {
        return this.xfrmsBuffer.getNewest().vector3ToWorld(vector, store);
    },
    
    /**
     * Converts a vector from world to local coordinates.
     * @param {module:LBGeometry.Vector3} vector   The vector in world coordinates to be transformed.
     * @param {module:LBGeometry.Vector3} [store]  If defined, the vector to store the local coordinates into,
     * may be the same as vector.
     * @returns {module:LBGeometry.Vector3}    The vector containing the local coordinates.
     */
    vector3ToLocal: function(vector, store) {
        return this.xfrmsBuffer.getNewest().vector3ToLocal(vector, store);
    },

    
    /**
     * Marks the coordinate transforms as invalid so the initial transforms are not
     * saved for velocity calculations.
     */
    reset: function() {
        this.xfrmsBuffer.clear();
    },
    
    
    /**
     * Calculates world position, world velocity, and local velocity for a given local
     * point.
     * @param {module:LBGeometry.Vector3} localPos The local coordinates of the point of interest.
     * @param {object} results  The object to receive the results. Results are stored
     * in keys, and are only computed if the key exists:
     *      <li>worldPos: The world coordinates of localPos.
     *      <li>worldVel:   The velocity of localPos in world coordinates.
     *      <li>localVel:   The velocity of localPos in local coordinates. Note that this is
     *      the world velocity rotated into local coordinates, it is not the velocity
     *      of the position relative to the local coordinate system (if that were the case
     *      then this would always be 0 if prevLocalPos were not defined).
     * @param {module:LBGeometry.Vector3} [prevLocalPos] If defined, the previous local position, used for velocity calculation,
     * if not defined then the previous position is presumed to be localPos.
     * @returns {module:LBPhysics.CoordSystemState} this.
     */
    calcVectorLocalToWorld: function(localPos, results, prevLocalPos) {
        var worldPos = results.worldPos || LBPhysics.CoordSystemState._workingPosA;
        if (!this.xfrmsBuffer.getCurrentSize()) {
            worldPos.copy(localPos);
            if (results.worldVel) {
                results.worldVel.zero();
            }
            if (results.localVel) {
                results.localVel.zero();
            }
            return this;
        }
        
        this.xfrmsBuffer.getNewest().vector3ToWorld(localPos, worldPos);

        var worldVel = results.worldVel;
        var localVel = results.localVel;
        if (worldVel || localVel) {
            if (this.xfrmsBuffer.getCurrentSize() <= 1) {
                // No time change, no velocity.
                if (worldVel) {
                    worldVel.zero();
                }
                if (localVel) {
                    localVel.zero();
                }
            }
            else {                
                var positionCount;
                var prevLocalPosArray = undefined;
                if (prevLocalPos) {
                    if (Array.isArray(prevLocalPos)) {
                        prevLocalPosArray = prevLocalPos;
                        positionCount = prevLocalPosArray.length + 1;
                    }
                    else {
                        positionCount = 2;
                    }
                }
                else {
                    positionCount = Math.min(this.xfrmsBuffer.getCurrentSize(), LBMath.finiteDiffBackFirst.MAX_TERMS);
                }
                
                var positions = LBPhysics.CoordSystemState._workingPositions;
                for (var i = positions.length; i < positionCount; ++i) {
                    positions[i] = new LBGeometry.Vector3();
                }

                // We already computed the world position of localPos, which is positions[0],
                // so don't have to do a transform.
                positions[0].copy(worldPos);
                
                if (prevLocalPos) {
                    if (prevLocalPosArray) {
                        for (var i = 1; i < positionCount; ++i) {
                            positions[i].copy(prevLocalPosArray[i - 1]);
                        }
                    }
                    else {
                        positions[1].copy(prevLocalPos);
                    }
                }
                else {
                    for (var i = 1; i < positionCount; ++i) {
                        positions[i].copy(localPos);
                    }
                }

                var base = positionCount - 1;
                for (var i = 1; i < positionCount; ++i) {
                    this.xfrmsBuffer.get(base - i).vector3ToWorld(positions[i], positions[i]);
                }
                
                worldVel = worldVel || LBPhysics.CoordSystemState._workingPosC;
                LBPhysics.calcVector3Velocity(this.dt, positions, worldVel, positionCount);
                
                if (localVel) {
                    results.localVel.copy(worldVel);
                    results.localVel.applyMatrix4Rotation(this.localXfrm);
                }
            }
        }
        
        return this;
    },
    
    /**
     * Calculates the angular velocity about an axis in the local coordinate system
     * based upon the current and past transforms.
     * @param {module:LBGeometry.Vector3} rotAxis   The axis, this must be normalized.
     * @returns {Number}    The angular velocity in radians/sec.
     */
    calcAngularVelocityAboutLocalAxis: function(rotAxis) {
        if (this.xfrmsBuffer.getCurrentSize() <= 1) {
            return 0;
        }
        
        var prevPos = LBPhysics.CoordSystemState._workingPosA;
        this.xfrmsBuffer.getNewest().vector3ToWorldRotation(rotAxis, prevPos);
        
        // refPlane is the plane perpendicular to rotAxis in world coordinates.
        var refPlane = LBPhysics.CoordSystemState._workingPlane;        
        refPlane.set(prevPos, 0);

        // What we want to do is take a reference point in the local coordinate frame,
        // get its projection onto the reference plane from the previous time step
        // and its projection onto the reference plane from the current time step,
        // the angle between those two points is the change in angle relative to rotAxis.
        LBGeometry.makeOrthogonal(rotAxis, prevPos);
        var currentPos = LBPhysics.CoordSystemState._workingPosB;
        currentPos.copy(prevPos);
        this.xfrmsBuffer.get(this.xfrmsBuffer.getCurrentSize() - 2).vector3ToWorldRotation(prevPos, prevPos);        
        this.xfrmsBuffer.getNewest().vector3ToWorldRotation(currentPos, currentPos);
        
        var prevProj = LBPhysics.CoordSystemState._workingPosC;
        refPlane.projectPoint(prevPos, prevProj);
        
        var currentProj = LBPhysics.CoordSystemState._workingPosD;
        refPlane.projectPoint(currentPos, currentProj);
        
        var angle = prevProj.angleTo(currentProj);
        
        // Which direction?
        prevPos.copy(prevProj);
        prevPos.cross(currentProj);
        if (prevPos.dot(rotAxis) < 0) {
            angle = -angle;
        }
        
        return angle / this.dt;
    },
    
    
    /**
     * Call when done with the object to have it release any internal references
     * to other objects to help with garbage collection.
     * @returns {undefined}
     */
    destroy: function() {
        if (this.xfrmsBuffer) {
            this.xfrmsBuffer.destroy();
            this.xfrmsBuffer = null;
        }
        
        this.worldXfrm = null;
        this.localXfrm = null;
    },
    
    constructor: LBPhysics.CoordSystemState
};

/**
 * Loads a moment of inertia tensor from properties in a data object
 * @param {object} data The data object to load from.
 * @param {module:LBGeometry.Matrix3} [store]  If defined the object to load the tensor into.
 * @returns {module:LBGeometry.Matrix3}    The moment of inertia tensor.
 */
LBPhysics.loadMomentInertia = function(data, store) {
    store = store || new LBGeometry.Matrix3();
    
    var xx = data.xx || 0;
    var xy = data.xy || 0;
    var xz = data.xz || 0;
    var yy = data.yy || 0;
    var yz = data.yz || 0;
    var zz = data.zz || 0;
    store.set(xx, xy, xz, xy, yy, yz, xz, yz, zz);
    return store;
};

/**
 * Returns the Ixx term of an inertia tensor.
 * @param {module:LBGeometry.Matrix3} inertia The inertia tensor.
 * @returns {Number}    The Ixx term.
 */
LBPhysics.getInertiaXX = function(inertia) {
    return inertia.elements[0];
};

/**
 * Returns the Ixy term of an inertia tensor.
 * @param {module:LBGeometry.Matrix3} inertia The inertia tensor.
 * @returns {Number}    The Ixy term.
 */
LBPhysics.getInertiaXY = function(inertia) {
    return inertia.elements[1];
};

/**
 * Returns the Ixz term of an inertia tensor.
 * @param {module:LBGeometry.Matrix3} inertia The inertia tensor.
 * @returns {Number}    The Ixz term.
 */
LBPhysics.getInertiaXZ = function(inertia) {
    return inertia.elements[1];
};

/**
 * Returns the Iyy term of an inertia tensor.
 * @param {module:LBGeometry.Matrix3} inertia The inertia tensor.
 * @returns {Number}    The Iyy term.
 */
LBPhysics.getInertiaYY = function(inertia) {
    return inertia.elements[4];
};

/**
 * Returns the Iyz term of an inertia tensor.
 * @param {module:LBGeometry.Matrix3} inertia The inertia tensor.
 * @returns {Number}    The Iyz term.
 */
LBPhysics.getInertiaYZ = function(inertia) {
    return inertia.elements[1];
};

/**
 * Returns the Izz term of an inertia tensor.
 * @param {module:LBGeometry.Matrix3} inertia The inertia tensor.
 * @returns {Number}    The Izz term.
 */
LBPhysics.getInertiaZZ = function(inertia) {
    return inertia.elements[8];
};

/**
 * A rigid body for purposes of force calculations. A rigid body has mass, a position
 * and orientation, and may have additional rigid body parts attached to it.
 * @constructor
 * @param {module:LBGeometry.Object3D} [obj3D]    The object defining the location and orientation of the
 * rigid body, a reference to this object is kept, the object is expected to change
 * position and orientation during a simulation. This presumes that the object's world
 * reference frame is the same as the base's world reference frame.
 * @param {Number} [mass] The mass of the body, may be 0.
 * @param {module:LBGeometry.Vector3} [centerOfMass] The center of mass relative to the local reference 
 * frame, if not defined it will be set to {0,0,0}.
 * @param {module:LBGeometry.Matrix3} [momentInertia]    The moment of inertia tensor, not yet fully supported.
 * @param {module:LBPhysics.RigidBody} [base] If defined, the rigid body to which this is attached, and which
 * is the base of this rigid body. The coordinates of this rigid body are then in the
 * local coordinates of the base.
 */
LBPhysics.RigidBody = function(obj3D, mass, centerOfMass, momentInertia, base) {
    /**
     * A name for the rigid body.
     * @member {String}
     */
    this.name = "";
    
    /**
     * The mass.
     * @member {number}
     */
    this.mass = mass;
    
    /**
     * The moment of inertia tensor.
     * @member {module:LBGeometry.Matrix3}
     */
    this.momentInertia = new LBGeometry.Matrix3();
    if (momentInertia) {
        this.momentInertia.copy(momentInertia);
    }
    else {
        this.momentInertia.identity().multiplyScalar(this.mass);
    }
    
    /**
     * The center of mass in local coordinates relative to the origin.
     * @member {module:LBGeometry.Vector3}
     */
    this.centerOfMass = centerOfMass || new LBGeometry.Vector3();
    
    /**
     * A radius associated with the mass, used as essentially a region of interest
     * around the center of mass.
     * @member {number}
     */
    this.massRadius = 0;
    
    /**
     * The Object3D used to define the 3D properties of the body.
     * @member {module:LBGeometry.Object3D}
     */
    this.obj3D = obj3D || new LBGeometry.Object3D();
    
    /**
     * Array of {@link module:LBVolume.Tetra}s that define the volume of the body.
     * @member {module:LBVolume.Tetra}
     */
    this.volumes = [];
    
    /**
     * Dampling to apply to the linear velocity, 0 &le; damping &ge; 1
     * @member {Number}
     */
    this.linearDamping = 0.01;
    
    /**
     * Dampling to apply to the angular velocity, 0 &le; damping &ge; 1
     * @member {Number}
     */
    this.angularDamping = 0.01;
    
    /**
     * The coordinate system state used to track changes in the location of the
     * local coordinate system in the world space. Primarily used to track velocity.
     * @member {module:LBPhysics.CoordSystemState}
     */
    this.coordSystem = new LBPhysics.CoordSystemState();
    this.coordSystemResults = {
        "worldVel": new LBGeometry.Vector3(),
        "localVel": new LBGeometry.Vector3()
    };
    
    /**
     * The current linear velocity of the body in the world coordinate system.
     * @member {module:LBGeometry.Vector3}
     */
    this.worldLinearVelocity = this.coordSystemResults.worldVel;

    /**
     * The current linear velocity of the body in the local coordinate system.
     * @member {module:LBGeometry.Vector3}
     */
    this.localLinearVelocity = this.coordSystemResults.localVel;
    
    this.resultant = new LBPhysics.Resultant3D();

    /**
     * An array contianing the rigid bodies that are part of this rigid body. The
     * parts have their local coordinate systems specified relative to this rigid
     * body's local coordinate system.
     * <p>
     * Parts should be added and removed using {@link module:LBPhysics.RigidBody#addPart} and
     * {@link module:LBPhysics.RigidBody#removePart}.
     * @member {module:LBPhysics.RigidBody[]}
     */
    this.parts = [];
    if (base) {
        base.addPart(this);
    }
    
    this.isAddPartObj3DsAsChildren = true;
    
    this.isEnabled = true;
    
    this.physicalPropertiesDirty = true;
    this.totalMass = 0;
    this.totalMomentInertia = new LBGeometry.Matrix3().identity();
    this.totalInvMomentInertia = new LBGeometry.Matrix3().identity();
    this.totalCenterOfMass = new LBGeometry.Vector3();
    this.totalResultant = new LBPhysics.Resultant3D();
    
    if (obj3D) {
        this.updateCoords(0);
    }
    
    /**
     * If defined this is the object from which the rigid body was loaded, the object
     * passed to {@link module:LBPhysics.RigidBody#load} ({@link module:LBPhysics.RigidBody#loadBase} really).
     * @member {Object}
     */
    this.loadData = undefined;
};

LBPhysics.RigidBody._workingResultant = new LBPhysics.Resultant3D();
LBPhysics.RigidBody._workingMoment = new LBGeometry.Vector3();
LBPhysics.RigidBody._workingPos = new LBGeometry.Vector3();
LBPhysics.RigidBody._workingEuler = new LBGeometry.Euler();

LBPhysics.RigidBody.prototype = {
    /**
     * Loads the rigid body's properties from the properties in a data object.
     * This currently does not load the parts of the rigid body, though it may in
     * the future.
     * @param {object} data The data object to load from.
     * @returns {module:LBPhysics.RigidBody}    this.
     */
    load: function(data) {
        this.loadBase(data);
        
        if (data.obj3D) {
            this.obj3D = LBGeometry.createObject3DFromData(data.obj3D);
        }
        return this;
    },
    
    /**
     * Loads only the basic settings of the rigid body from a data object. The 3D
     * object and the parts are not loaded.
     * @param {object} data The data object to load from.
     * @returns {module:LBPhysics.RigidBody}    this.
     */
    loadBase: function(data) {
        this.name = data.name || this.name;
        this.mass = data.mass || this.mass;
        LBGeometry.loadVector3(data.centerOfMass, this.centerOfMass);
        this.massRadius = data.massRadius || this.massRadius;
        
        this.volumes.length = 0;
        if (data.volume) {
            var volume = LBVolume.loadStandardVolumeFromData(data.volume);
            if (volume) {
                this.volumes.push(volume);
            }
        }
        else if (data.volumes) {
            var vertices = LBGeometry.loadVector3ArrayFromCoordArray(data.volumes.vertices);
            
            LBVolume.Volume.loadVolumesFromData(data.volumes, vertices, this.volumes);
            
            this.xyOutline = LBVolume.Volume.loadXYOutlineFromData(data.volumes, vertices);            
        }
        
        if (this.volumes.length > 0) {
            if (data.mass) {
                LBVolume.Volume.allocateMassToVolumes(this.volumes, data.mass);
            }
            
            var comResult = LBVolume.Volume.totalCenterOfMass(this.volumes);
            if (comResult && (comResult.mass > 0)) {
                this.centerOfMass.copy(comResult.position);
            }
        }
        
        if (data.momentInertia) {
            LBPhysics.loadMomentInertia(data.momentInertia, this.momentInertia);
        }
        else if (this.volumes.length > 0) {
            LBVolume.Volume.overallInertiaTensor(this.volumes, this.momentInertia);
        }
        else {
            this.momentInertia.identity().multiplyScalar(this.mass);
        }
        
        if (typeof(data.linearDamping) === 'number') {
            this.linearDamping = data.linearDamping;
        }
        if (typeof(data.angularDampling) === 'number') {
            this.angularDamping = data.angularDamping;
        }
        
        if (data.velocityTerms) {
            if (data.velocityTerms !== this.coordSystem.getVelocityTerms()) {
                this.coordSystem = new LBPhysics.CoordSystemState(data.velocityTerms);
            }
        }
        
        this.physicalPropertiesDirty = true;
        
        this.loadData = data;
        return this;
    },
    
    /**
     * Adds a part to the rigid body. If the part is part of another rigid
     * body it is removed from that other rigid body.
     * @param {module:LBPhysics.RigidBody} part The part to add.
     * @returns {module:LBPhysics.RigidBody} this.
     */
    addPart: function(part) {
        if (part.base) {
            part.base.removePart(part);
        }
        
        this.parts.push(part);
        part.base = this;
        this.physicalPropertiesDirty = true;
        
        if (this.isAddPartObj3DsAsChildren) {
            this.obj3D.add(part.obj3D);
        }
        
        return this;
    },
    
    /**
     * Removes a part from the rigid body if it is part of the rigid body.
     * @param {module:LBPhysics.RigidBody} part The part to remove.
     * @returns {module:LBPhysics.RigidBody}    this.
     */
    removePart: function(part) {
        if (part.base === this) {
            var index = this.parts.indexOf(part);
            if (index >= 0) {
                this.parts.splice(index, 1);
                if (this.isAddPartObj3DsAsChildren) {
                    this.obj3D.remove(part.obj3D);
                }
            }
            part.base = undefined;
            this.physicalPropertiesDirty = true;
        }
        return this;
    },
    
    /**
     * Retrieves a part or part of a part given the names of the parts of interest.
     * @param {String|String[]} names   The name of the part if only a part of this
     * rigid body is desired, or an array of the names of the parts, with the
     * name of the part of this rigid body at index startIndex, and the name of the part of that
     * part at startIndex + 1, and so forth.
     * @param {Number} [startIndex=0]   The index of the first name in names if names is
     * an array of strings.
     * @returns {undefined|LBPhysics.RigidBody} The part, undefined if not found.
     */
    getPart: function(names, startIndex) {
        if (!Array.isArray(names)) {
            return this.getPartWithName(names);
        }
        
        startIndex = startIndex || 0;
        
        var name = names[startIndex];
        var part = this.getPartWithName(names[startIndex]);
        if (part) {
            if (startIndex + 1 < names.length) {
                return part.getPart(names, startIndex + 1);
            }
        }
        
        return part;
    },
    
    /**
     * Retrieves a part of this rigid body by name.
     * @param {String} name The name of the part.
     * @returns {module:LBPhysics.RigidBody|undefined} The part, undefined if not found.
     */
    getPartWithName: function(name) {
        for (var i = 0; i < this.parts.length; ++i) {
            if (this.parts[i].name === name) {
                return this.parts[i];
            }
        }
        return undefined;
    },
    
    /**
     * Sets both the position and the rotation of the rigid body, using a quaternion for
     * the rotation.
     * @param {module:LBGeometry.Vector3} pos  The position.
     * @param {module:LBGeometry.Quaternion} quaternion    The quaternion.
     * @returns {module:LBPhysics.RigidBody}   this.
     */
    setPositionAndQuaternion: function(pos, quaternion) {
        this.obj3D.position.copy(pos);
        this.obj3D.quaternion.copy(quaternion);

        this.obj3D.updateMatrixWorld(true);
        return this;
    },
    
    /**
     * Sets the position of the rigid body.
     * @param {Number} x    The x-coordinate.
     * @param {Number} y    The y-coordinate.
     * @param {Number} z    The z-coordinate.
     * @returns {module:LBPhysics.RigidBody}    this.
     */
    setXYZ: function(x, y, z) {
        this.obj3D.position.set(x, y, z);
        return this;
    },
    
    /**
     * Sets the rotation of the rigid body about the z-axis, in radians.
     * @param {Number} rad  The rotation about the z-axis, in radians. The rotation
     * is absolute with respect to the base's coordinate system.
     * @param {Boolean} [keepOtherRotations=false]  If true the rotations about the
     * x and y axes are kept.
     * @returns {module:LBPhysics.RigidBody}   this.
     */
    setZRotationRad: function(rad, keepOtherRotations) {
        if (keepOtherRotations) {
            var euler = LBPhysics.RigidBody._workingEuler.setFromRotationMatrix(this.obj3D.matrixWorld, "ZXY");
            euler.z = rad;
            this.obj3D.setRotationFromEuler(euler, "ZXY");
        }
        else {
            this.obj3D.setRotationFromEuler(LBGeometry.createEulerRad(0, 0, rad));
        }
        this.obj3D.updateMatrixWorld();
        return this;
    },
    
    /**
     * Sets the rotation of the rigid body about the z-axis, in degrees.
     * @param {Number} deg  The rotation about the z-axis, in degrees. The rotation
     * is absolute with respect to the base's coordinate system.
     * @param {Boolean} [keepOtherRotations=false]  If true the rotations about the
     * x and y axes are kept.
     * @returns {module:LBPhysics.RigidBody}   this.
     */
    setZRotationDeg: function(deg, keepOtherRotations) {
        return this.setZRotationRad(deg * LBMath.DEG_TO_RAD, keepOtherRotations);
    },

    /**
     * Zeros the resultant of this rigid body and of all rigid bodies that are
     * part of it.
     * @returns {module:LBPhysics.RigidBody}    this.
     */
    clearForces: function() {
        this.resultant.zero();
        this.totalResultant.zero();
        for (var i = 0; i < this.parts.length; ++i) {
            this.parts[i].clearForces();
        }
        return this;
    },
    
    /**
     * Use to update the rigid body's coordinate system from the current position
     * and orientation of the object3D. This also updates the coordinate systems
     * of parts of this rigid body.
     * @param {Number} dt   The simulation time since the last time the coordinates
     * was updated, passed to the coordinate system state.
     * @returns {module:LBPhysics.RigidBody}    this.
     */
    updateCoords: function(dt) {
        this.physicalPropertiesDirty = true;

        this.coordSystem.setXfrms(this.obj3D.matrixWorld, dt);
        this.coordSystem.calcVectorLocalToWorld(this.centerOfMass, this.coordSystemResults);
        
        // Don't forget the parts...
        for (var i = 0; i < this.parts.length; ++i) {
            this.parts[i].updateCoords(dt);
        }
        return this;
    },
    
    /**
     * Adds a force in world coordinates to the rigid body's resultant.
     * @param {module:LBGeometry.Vector3} force    The force to add.
     * @param {module:LBGeometry.Vector3} worldPos The position on the rigid body where the force is
     * applied.
     * @returns {module:LBPhysics.RigidBody}    this.
     */
    addWorldForce: function(force, worldPos) {
        this.resultant.addForce(force, worldPos);
        return this;
    },
    
    /**
     * Adds a resultant in world coordinates to the rigid body's resultant.
     * @param {module:LBPhysics.RigidBody} resultant The resultant to add, in world coordinates.
     * @returns {module:LBPhysics.RigidBody}    this.
     */
    addWorldResultant: function(resultant) {
        this.resultant.addResultant(resultant);
        return this;
    },
    
    /**
     * Retrieves the resultant in world coordinates.
     * @param {Boolean} convertToWrench If true the resultant is converted to a wrench,
     * otherwise its application point is set to the total center of mass.
     * @param {module:LBGeometry.Plane} [wrenchPlane]    If convertToWrench is true, this is the
     * optional plane passed to {@link module:LBPhysics.Resultant3D.convertToWrench}.
     * @param {module:LBGeometry.Sphere} [wrenchBounds]  If convertToWrench is true and
     * wrenchPlane is specified, this is a bounding sphere within which the application
     * point transfered to the wrenchPlane must lie for it to actually be transferred.
     * @param {module:LBGeometry.Plane} [secondaryWrenchPlane] If convertToWrench is true and
     * both wrenchPlane and wrenchBounds are specified, this is a secondary plane to use
     * if the wrench force is not within wrenchBounds.
     * @returns {module:LBPhysics.Resultant3D} The resultant in world coordinates.
     */
    getResultant: function(convertToWrench, wrenchPlane, wrenchBounds, secondaryWrenchPlane) {
        this.totalResultant.copy(this.resultant);
        for (var i = 0; i < this.parts.length; ++i) {
            this.totalResultant.addResultant(this.parts[i].getResultant());
        }
        if (convertToWrench) {
            this.totalResultant.convertToWrench(wrenchPlane, wrenchBounds, secondaryWrenchPlane);
        }
        else {
            this.totalResultant.moveApplPoint(this.getTotalCenterOfMass());
        }
        return this.totalResultant;
    },
    
    /**
     * Internal method that recalculates the overall physical properties of the
     * body.
     * @private
     * @returns {module:LBPhysics.RigidBody}    this.
     */
    _updatePhysicalProperties: function() {
        if (this.physicalPropertiesDirty) {
            this.totalMass = this.mass;
            
            this.totalCenterOfMass.copy(this.centerOfMass);
            this.totalCenterOfMass.applyMatrix4(this.coordSystem.worldXfrm);            
            this.totalCenterOfMass.multiplyScalar(this.mass);
            
            this.totalMomentInertia.copy(this.momentInertia);
            
            for (var i = 0; i < this.parts.length; ++i) {
                var part = this.parts[i];
                if (!part.isEnabled) {
                    continue;
                }
                var partMass = part.getTotalMass();
                if (!partMass) {
                    continue;
                }
                this.totalMass += partMass;
                
                var partCenterOfMass = part.getTotalCenterOfMass();
                this.totalCenterOfMass.addScaledVector(partCenterOfMass, partMass);
                
                // TODO:
                // Need to handle the total moment of inertia...
            }
            
            if (!LBMath.isLikeZero(this.totalMass)) {
                this.totalCenterOfMass.divideScalar(this.totalMass);
            }
            
            if (LBMath.isLikeZero(this.totalMomentInertia.elements[0])
             && LBMath.isLikeZero(this.totalMomentInertia.elements[4])
             && LBMath.isLikeZero(this.totalMomentInertia.elements[8])) {
                this.totalInvMomentInertia.zero();
            }
            else {
                this.totalInvMomentInertia.getInverse(this.totalMomentInertia);
            }
            
            this.physicalPropertiesDirty = false;
        }
        return this;
    },
    
    /**
     * Retrieves the total mass of the rigid body and all its parts.
     * @returns {Number}    The total mass.
     */
    getTotalMass: function() {
        this._updatePhysicalProperties();
        return this.totalMass;
    },
    
    /**
     * Retrieves the composite center of mass of the rigid body and all its parts,
     * in world coordinates.
     * @returns {module:LBGeometry.Vector3}    The center of mass in world coordinates.
     */
    getTotalCenterOfMass: function() {
        this._updatePhysicalProperties();
        return this.totalCenterOfMass;
    },

    /**
     * Retrieves the composite moment of inertia tensor.
     * @returns {module:LBGeometry.Matrix3} The matrix tensor.
     */
    getTotalMomentInertia: function() {
        this._updatePhysicalProperties();
        return this.totalMomentInertia;
    },

    /**
     * Retrieves the composite inverse moment of inertia tensor.
     * @returns {module:LBGeometry.Matrix3} The inverse matrix tensor.
     */
    getTotalInvMomentInertia: function() {
        this._updatePhysicalProperties();
        return this.totalInvMomentInertia;
    },
    

    /**
     * This integrates the current resultant against the local rotation of the rigid
     * body around a given axis, rotating the body and reducing the resultant appropriately.
     * @param {module:LBGeometry.Vector3} axisOrigin A point defining the location of the axis, in
     * local coordinates.
     * @param {module:LBGeometry.Vector3} axis The axis of rotation in local coordinates, this must be normalized.
     * @param {Number} currentDeg    The current angular rotation about the axis in degrees.
     * @param {function} [constrainer]  Optional function called to enforce any constraints
     * on the rotation angle. The function signature is:
     *  constrainer = function(newDeg, currentDeg, dt) {
     *      return constrainedDeg;
     *  }
     * @param {module:LBPhysics.Resultant3D} [resultantToUse=this.resultant] If defined the resultant to use.
     * @returns {undefined}
     */
    integrateForceForRotation: function(axisOrigin, axis, currentDeg, constrainer, resultantToUse) {
        if ((this.coordSystem.dt === 0) || LBMath.isLikeZero(this.mass)) {
            return;
        }
        
        // Move the resultant to the axis origin, then convert it to local coordinates.
        var resultant = LBPhysics.RigidBody._workingResultant.copy(resultantToUse || this.resultant);

        resultant.applyMatrix4(this.coordSystem.localXfrm);
        resultant.moveApplPoint(axisOrigin);
        
        // We only want the moment that is along the axis of rotation.
        var momentMag = resultant.moment.dot(axis);
        
        var moment = LBPhysics.RigidBody._workingMoment.copy(axis).multiplyScalar(momentMag);
        var invInertia = this.getTotalInvMomentInertia();
        var angularAccel = moment.applyMatrix3(invInertia).dot(axis);
        
        // Integrate the new rotation - first we'll need the local angular velocity.
        var angularVelocity = this.coordSystem.calcAngularVelocityAboutLocalAxis(axis);
        angularVelocity += angularAccel * this.coordSystem.dt;
        
        var deg = currentDeg + angularVelocity * this.coordSystem.dt * LBMath.RAD_TO_DEG;
        if (constrainer) {
            deg = constrainer.call(this, deg, currentDeg, this.coordSystem.dt);
        }
        
        if (deg !== currentDeg) {
            this.obj3D.rotateOnAxis(axis, (deg - currentDeg) * LBMath.DEG_TO_RAD);
        }
    },
    
    /**
     * Call when done with the object to have it release any internal references
     * to other objects to help with garbage collection.
     * @returns {undefined}
     */
    destroy: function() {
        if (this.obj3D) {
            this.obj3D = null;

            this.centerOfMass = null;
            this.coordSystem = this.coordSystem.destroy();
            
            this.coordSystemResults.localVel = null;
            this.coordSystemResults.worldVel = null;
            this.coordSystemResults = null;
            
            this.invMomentInertia = null;
            this.loadData = null;
            this.localLinearVelocity = null;
            this.momentInertia = null;
            this.name = null;
            
            this.parts.forEach(function(part) {
                part.destroy();
            });
            this.parts.length = 0;
            this.parts = null;
            
            this.resultant = this.resultant.destroy();
            
            this.totalCenterOfMass = null;
            this.totalInvMomentInertia = null;
            this.totalMomentInertia = null;
            this.totalResultant = this.totalResultant.destroy();
            
            this.worldLinearVelocity = null;

            if (this.volumes) {
                this.volumes.forEach(function(vol) {
                    vol.destroy();
                });
                this.volumes.length = 0;
                this.volumes = null;
            }
            
            if (this.xyOutline) {
                this.xyOutline.length = 0;
                this.xyOutline = null;
            }
        }
    },
    
    constructor: LBPhysics.RigidBody
};


/**
 * Helper that creates and loads a rigid body from a data object. If the data object contains
 * a 'className' property, the value of that property is passed directly to LBUtil.stringToNewClassInstance()
 * along with the optional 'constructorArgs' property to create
 * the rigid body object, otherwise if defCreatorFunc is defined it is called to create
 * the rigid body object, otherwise {@link module:LBPhysics.RigidBody} is used.
 * @param {object} data The data to load from.
 * @param {Function} [defCreatorFunc] If defined the function used to create the rigid body if the
 * data object does not contain a construct property, or data is not defined. The argument
 * passed to this function is the data argument.
 * @returns {module:LBPhysics.RigidBody}    The rigid body object, undefined if both data and defCreatorFunc are not defined.
 */
LBPhysics.RigidBody.createFromData = function(data, defCreatorFunc) {
    if (!data) {
        if (defCreatorFunc) {
            return defCreatorFunc();
        }
        return undefined;
    }
    
    var rigidBody;
    if (data.className) {
        rigidBody = LBUtil.newClassInstanceFromData(data);
    }
    else {
        if (defCreatorFunc) {
            rigidBody = defCreatorFunc(data);
        }
        else {
            rigidBody = new LBPhysics.RigidBody();
        }
    }
    
    return rigidBody.load(data);
};


/**
 * Helper that retrieves all the rigid bodies in an array of rigid bodies that have
 * a given name.
 * @param {module:LBPhysics.RigidBody[]} rigidBodies   The array of rigid bodies.
 * @param {String} name The name of interest.
 * @param {module:LBPhysics.RigidBody[]} [store]   If defined the array to store the results into.
 * @returns {module:LBPhysics.RigidBody[]} The array containing the found rigid bodies.
 */
LBPhysics.RigidBody.getRigidBodiesWithName = function(rigidBodies, name, store) {
    store = store || [];
    store.length = 0;
    
    rigidBodies.forEach(function(rigidBody) {
        if (rigidBody.name === name) {
            store.push(rigidBody);
        }
    });
    
    return store;
};

return LBPhysics;
});
