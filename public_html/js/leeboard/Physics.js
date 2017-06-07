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

/* global Leeboard */

/**
 * Calculates the moment about the origin of a force applied at a position.
 * @param {type} force  The force.
 * @param {type} position   The application point of the force.
 * @returns {object} Vector representing the moment about the origin from 
 * force being applied at position.
 */
Leeboard.calcMoment = function(force, position) {
    if (!Leeboard.isVar(force.z)) {
        return Leeboard.crossVectors2(position, force);
    }
    return Leeboard.crossVectors3(position, force);
};

/**
 * A 3D resultant force, which is a force vector, a moment vector, and an application point.
 * @param {type} force  The force vector.
 * @param {type} moment The moment vector.
 * @param {type} position   The application point.
 * @returns {Leeboard.Resultant3D}  The resultant.
 */
Leeboard.Resultant3D = function(force, moment, position) {
    this.force = Leeboard.copyCommonProperties(Leeboard.createVector3(), force);
    this.moment = Leeboard.copyCommonProperties(Leeboard.createVector3(), moment);
    this.applPoint = Leeboard.copyCommonProperties(Leeboard.createVector3(), position);
};

Leeboard.Resultant3D.prototype = {
    /**
     * Creates a copy of the resultant.
     * @returns {Leeboard.Resultant3D}
     */
    clone: function() {
        return new Leeboard.Resultant3D(this.force, this.moment, this.applPoint);
    },
    
    
    /**
     * Sets this resultant to match the settings of another.
     * @param {object} toCopy   The resultant to copy.
     * @returns {Leeboard.Resultant3D}  this.
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
     * @param {object} force  The force to add.
     * @param {object} position   The position at which the force is added.
     * @returns {Leeboard.Resultant3D} this.
     */
    addForce: function(force, position) {
        if (!this.applPoint.equals(position)) {
            var arm = Leeboard.subVectors3(position, this.applPoint);
            var moment = Leeboard.calcMoment(force, arm);
            this.moment.add(moment);
        }
        
        this.force.add(force);
        return this;
    },
    
    /**
     * Adds a resultant to this resultant. The application point of this resultant is
     * not changed.
     * @param {object} other    The resultant to be added.
     * @returns {Leeboard.Resultant3D} this.
     */
    addResultant: function(other) {
        var deltaPos = Leeboard.subVectors3(other.applPoint, this.applPoint);
        var moment = Leeboard.calcMoment(other.force, deltaPos);
        moment.add(other.moment);
        
        this.moment.add(moment);
        this.force.add(other.force);
        return this;
    },
    
    /**
     * Moves the application point of the resultant, the moment is adjusted accordingly.
     * @param {type} position   The new application point.
     * @returns {Leeboard.Resultant3D} this.
     */
    moveApplPoint: function(position) {
        if (!this.applPoint.equals(position)) {
            var r = Leeboard.subVectors3(this.applPoint, position);
            var moment = Leeboard.calcMoment(this.force, r);
            this.moment.add(moment);
            this.applPoint.copy(position);
        }
        
        return this;
    },
    
    /**
     * Moves the application point such that the moment vector is parallel to the
     * force vector. The application point and moment may be modified, the force vector is not.
     * @returns {Leeboard.Resultant3D}  this.
     */
    convertToWrench: function() {
        var forceMagSq = this.force.lengthSq();
        if (Leeboard.isLikeZero(forceMagSq)) {
            return this;
        }
        
        // Find the parallel moment.
        var normScale = 1./Math.sqrt(forceMagSq);
        var forceDir = Leeboard.createVector3(this.force.x * normScale, this.force.y * normScale, this.force.z * normScale);        
        var pMoment = forceDir.multiplyScalar(this.moment.dot(forceDir));

        // And then the perpendicular moment, which is moment - parallel moment.
        var moment = Leeboard.subVectors3(this.moment, pMoment);
        if (Leeboard.isVectors3LikeZero(moment)) {
            // Already a wrench...
            return this;
        }
        
        var r = Leeboard.crossVectors3(moment, this.force);
        r.multiplyScalar(-1./forceMagSq);
        
        this.applPoint.add(r);
        this.moment.copy(pMoment);
        
        return this;
    },
    
    
    /**
     * Rotates the force and moment vectors by applying a quaternion.
     * @param {object} quaternion The quaternion defining the rotation.
     * @returns {Leeboard.Resultant3D}  this.
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
     * @param {object} mat  The 4x4 matrix to apply.
     * @returns {Leeboard.Resultant3D}  this.
     */
    applyMatrix4: function(mat) {
        this.force.applyMatrix4Rotation(mat);
        this.moment.applyMatrix4Rotation(mat);
        this.applPoint.applyMatrix4(mat);
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
     * @returns {Leeboard.Resultant3D}  this.
     */
    zero: function() {
        this.force.zero();
        this.moment.zero();
        this.applPoint.zero();
        return this;
    }
};


/**
 * This is used to track the transforms for converting between a world coordinate
 * system and a local coordinate system. It can also keep track of the previous transforms
 * so it may calculate the world and local velocities of points in either coordinate
 * system.
 * @returns {Leeboard.coordSystemState}
 */
Leeboard.CoordSystemState = function() {
    this.worldXfrm = Leeboard.createMatrix4();
    this.localXfrm = Leeboard.createMatrix4();
    this.prevWorldXfrm = Leeboard.createMatrix4();
    this.prevLocalXfrm = Leeboard.createMatrix4();
    this.dt = 0;
    
    this.workingPos = Leeboard.createVector3();
    this.workingPrevPos = Leeboard.createVector3();
    this.workingWorldVel = Leeboard.createVector3();
    this.workingLocalVel = Leeboard.createVector3();
};

Leeboard.CoordSystemState.prototype = {
    /**
     * Sets the world and local transforms, saving the previous transforms in the
     * process. If either Xfrm matrix is not defined it is obtained by inverting the
     * other matrix, if both are not defined then the matrices are set to the identity
     * matrix.
     * @param {object} worldXfrm    If defined, the 4x4 matrix for transforming from local to world coordinaes.
     * @param {number} dt   The simulation time change from the last call to this, used
     * to compute velocity.
     * @param {object} localXfrm    If defined, the 4x4 matrix for transforming from world to local coordinates.
     * @returns {Leeboard.CoordSystemState} this.
     */
    setXfrms: function(worldXfrm, dt, localXfrm) {
        if (Leeboard.isVar(dt) && (dt > 0)) {
            // Save the current transforms...
            this.dt = dt;
            this.prevWorldXfrm.copy(this.worldXfrm);
            this.prevLocalXfrm.copy(this.localXfrm);
        }
        else {
            this.dt = 0;
        }
        
        if (!Leeboard.isVar(localXfrm)) {
            if (!Leeboard.isVar(worldXfrm)) {
                // Presume they're both going to be identity...
                this.worldXfrm.identity();
                this.localXfrm.identity();
            }
            else {
                this.localXfrm.getInverse(worldXfrm);
                this.worldXfrm.copy(worldXfrm);
            }
        }
        else if (!Leeboard.isVar(worldXfrm)) {
            this.localXfrm.copy(localXfrm);
            this.worldXfrm.getInverse(localXfrm);
        }
        else {
            this.localXfrm.copy(localXfrm);
            this.worldXfrm.copy(worldXfrm);
        }
        
        if (this.dt === 0) {
            // No time change, make the previous transforms match the current transforms.
            this.prevWorldXfrm.copy(this.worldXfrm);
            this.prevLocalXfrm.copy(this.localXfrm);
        }
        
        return this;
    },
    
    
    /**
     * Calculates world position, world velocity, and local velocity for a given local
     * point.
     * @param {object} localPos The local coordinates of the point of interest.
     * @param {object} results  The object to receive the results. Results are stored
     * in keys, and are only computed if the key exists:
     *      worldPos: The world coordinates of localPos.
     *      worldVel:   The velocity of localPos in world coordinates.
     *      localVel:   The velocity of localPos in local coordinates.
     * @param {object} prevLocalPos If defined, the previous local position, used for velocity calculation,
     * if not defined then the previous position is presumed to be localPos.
     * @returns {Leeboard.CoordSystemState} this.
     */
    calcVectorLocalToWorld: function(localPos, results, prevLocalPos) {
        var worldPos = Leeboard.isVar(results.worldPos) ? results.worldPos : this.workingPos;
        worldPos.copy(localPos);
        worldPos.applyMatrix4(this.worldXfrm);

        var isWorldVel = Leeboard.isVar(results.worldVel);
        var isLocalVel = Leeboard.isVar(results.localVel);
        if (isWorldVel || isLocalVel) {
            if (this.dt <= 0) {
                // No time change, no velocity.
                if (isWorldVel) {
                    results.worldVel.zero();
                }
                if (isLocalVel) {
                    results.localVel.zero();
                }
            }
            else {
                prevLocalPos = prevLocalPos || localPos;
                this.workingPrevPos.copy(prevLocalPos);
                this.workingPrevPos.applyMatrix4(this.prevWorldXfrm);
                
                var worldVel = (isWorldVel) ? results.worldVel : this.workingWorldVel;
                worldVel.subVectors(worldPos, this.workingPrevPos).multiplyScalar(1/this.dt);
                
                if (isLocalVel) {
                    results.localVel.copy(worldVel);
                    results.localVel.applyMatrix4Rotation(this.localXfrm);
                }
            }
        }
        
        return this;
    },
    
    constructor: Leeboard.CoordSystemState
};


/**
 * A rigid body for purposes of force calculations. A rigid body has mass, a position
 * and orientation, and may have additional rigid body parts attached to it.
 * @constructor
 * @param {object} obj3D    The object defining the location and orientation of the
 * rigid body, a reference to this object is kept, the object is expected to change
 * position and orientation during a simulation. This presumes that the object's world
 * reference frame is the same as the base's world reference frame.
 * @param {number} mass The mass of the body.
 * @param {object} centerOfMass The center of mass relative to the local reference 
 * frame, if not defined it will be set to {0,0,0}.
 * @param {object} momentInertia    The moment of inertia tensor, not yet fully supported.
 * @param {object} base If defined, the rigid body to which this is attached, and which
 * is the base of this rigid body. The coordinates of this rigid body are then in the
 * local coordinates of the base.
 */
Leeboard.RigidBody = function(obj3D, mass, centerOfMass, momentInertia, base) {
    this.mass = mass;
    this.momentInertia = momentInertia || Leeboard.createMatrix3();
    this.centerOfMass = centerOfMass || Leeboard.createVector3();
    
    this.obj3D = obj3D || Leeboard.createObject3D();
    this.coords = new Leeboard.CoordSystemState();
    
    this.resultant = new Leeboard.Resultant3D();

    this.parts = [];
    if (Leeboard.isVar(base)) {
        base.addPart(this);
    }
    
    this.isEnabled = true;
    
    this.physicalPropertiesDirty = true;
    this.totalMass = 0;
    this.totalMomentInertia = Leeboard.createVector3();
    this.totalCenterOfMass = Leeboard.createVector3();
    
    if (Leeboard.isVar(obj3D)) {
        this.updateCoords(0);
    }
};

Leeboard.RigidBody.prototype = {
    /**
     * Adds a part to the rigid body. If the part is part of another rigid
     * body it is removed from that other rigid body.
     * @param {object} part The part to add.
     * @returns {Leeboard.RigidBody} this.
     */
    addPart: function(part) {
        if (Leeboard.isVar(part.base)) {
            part.base.removePart(part);
        }
        
        this.parts.push(part);
        part.base = this;
        this.physicalPropertiesDirty = true;
        
        return this;
    },
    
    /**
     * Removes a part from the rigid body if it is part of the rigid body.
     * @param {object} part The part to remove.
     * @returns {Leeboard.RigidBody}    this.
     */
    removePart: function(part) {
        if (part.base === this) {
            var index = this.parts.indexOf(part);
            if (index >= 0) {
                this.parts.splice(index, 1);
            }
            part.base = undefined;
            this.physicalPropertiesDirty = true;
        }
        return this;
    },

    /**
     * Zeros the resultant of this rigid body and of all rigid bodies that are
     * part of it.
     * @returns {Leeboard.RigidBody}    this.
     */
    clearForces: function() {
        this.resultant.zero();
        for (var i = 0; i < this.parts.length; ++i) {
            this.parts[i].clearForces();
        }
        return this;
    },
    
    /**
     * Use to update the rigid body's coordinate system from the current position
     * and orientation of the object3D. This also updates the coordinate systems
     * of parts of this rigid body.
     * @param {number} dt   The simulation time since the last time the coordinates
     * was updated, passed to the coordinate system state.
     * @returns {Leeboard.RigidBody}    this.
     */
    updateCoords: function(dt) {
        this.physicalPropertiesDirty = true;

        this.coords.setXfrms(this.obj3D.matrixWorld, dt);
        
        // Don't forget the parts...
        for (var i = 0; i < this.parts.length; ++i) {
            this.parts[i].updateCoords(dt);
        }
        return this;
    },
    
    /**
     * Adds a force in world coordinates to the rigid body's resultant.
     * @param {object} force    The force to add.
     * @param {object} worldPos The position on the rigid body where the force is
     * applied.
     * @returns {Leeboard.RigidBody}    this.
     */
    addWorldForce: function(force, worldPos) {
        this.resultant.addForce(force, worldPos);
        return this;
    },
    
    /**
     * Adds a resultant in world coordinates to the rigid body's resultant.
     * @param {object} resultant The resultant to add, in world coordinates.
     * @returns {Leeboard.RigidBody}    this.
     */
    addWorldResultant: function(resultant) {
        this.resultant.addResultant(resultant);
        return this;
    },
    
    /**
     * Retrieves the resultant in world coordinates.
     * @returns {Leeboard.Resultant3D} The resultant in world coordinates.
     */
    getResultant: function() {
        for (var i = 0; i < this.parts.length; ++i) {
            this.resultant.addResultant(this.parts[i].getResultant());
        }
        this.resultant.moveApplPoint(getTotalCenterOfMass());
        return this.resultant;
    },
    
    /**
     * Internal method that recalculates the overall physical properties of the
     * body.
     * @private
     * @returns {Leeboard.RigidBody}    this.
     */
    updatePhysicalProperties: function() {
        if (this.physicalPropertiesDirty) {
            this.totalMass = this.mass;
            
            this.totalCenterOfMass.copy(this.centerOfMass);
            this.totalCenterOfMass.applyMatrix4(this.coords.worldXfrm);            
            this.totalCenterOfMass.multiplyScalar(this.mass);
            
            this.totalMomentInertia.copy(this.momentInertia);
            
            for (var i = 0; i < this.parts.length; ++i) {
                var part = this.parts[i];
                if (!part.isEnabled) {
                    continue;
                }
                var partMass = part.getTotalMass();
                this.totalMass += partMass;
                
                var partCenterOfMass = part.getTotalCenterOfMass();
                this.totalCenterOfMass.addScaledVector(partCenterOfMass, partMass);
            }
            
            if (!Leeboard.isLikeZero(this.totalMass)) {
                this.totalCenterOfMass.divideScalar(this.totalMass);
            }
            
            this.physicalPropertiesDirty = false;
        }
        return this;
    },
    
    getTotalMass: function() {
        this.updatePhysicalProperties();
        return this.totalMass;
    },
    
    getTotalCenterOfMass: function() {
        this.updatePhysicalProperties();
        return this.totalCenterOfMass;
    },
/*    
    getTotalMomentInertia: function() {
        this.updatePhysicalProperties();
        return this.totalMomentInertia;
    },
*/    
    
    constructor: Leeboard.RigidBody
};

