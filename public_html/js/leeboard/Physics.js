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

/* global Leeboard, LBGeometry, LBMath */

/**
 * @namespace   LBPhysics
 */
var LBPhysics = LBPhysics || {};

/**
 * Calculates the moment about the origin of a force applied at a position.
 * @param {type} force  The force.
 * @param {type} position   The application point of the force.
 * @returns {object} Vector representing the moment about the origin from 
 * force being applied at position.
 */
LBPhysics.calcMoment = function(force, position) {
    // Need to use Leeboard.isVar() because z is numeric.
    if (!Leeboard.isVar(force.z)) {
        return LBGeometry.crossVectors2(position, force);
    }
    return LBGeometry.crossVectors3(position, force);
};

/**
 * A 3D resultant force, which is a force vector, a moment vector, and an application point.
 * @constructor
 * @param {type} force  The force vector.
 * @param {type} moment The moment vector.
 * @param {type} position   The application point.
 * @returns {LBPhysics.Resultant3D}  The resultant.
 */
LBPhysics.Resultant3D = function(force, moment, position) {
    /**
     * The force vector.
     * @member {LBGeometry.Vector3}
     */
    this.force = Leeboard.copyCommonProperties(new LBGeometry.Vector3(), force);

    /**
     * The moment vector.
     * @member {LBGeometry.Vector3}
     */
    this.moment = Leeboard.copyCommonProperties(new LBGeometry.Vector3(), moment);

    /**
     * The force application point.
     * @member {LBGeometry.Vector3}
     */
    this.applPoint = Leeboard.copyCommonProperties(new LBGeometry.Vector3(), position);
};

LBPhysics.Resultant3D._workingLine3 = new LBGeometry.Line3();
LBPhysics.Resultant3D._workingPos = new LBGeometry.Vector3();

LBPhysics.Resultant3D.prototype = {
    /**
     * Creates a copy of the resultant.
     * @returns {LBPhysics.Resultant3D}
     */
    clone: function() {
        return new LBPhysics.Resultant3D(this.force, this.moment, this.applPoint);
    },
    
    
    /**
     * Sets this resultant to match the settings of another.
     * @param {object} toCopy   The resultant to copy.
     * @returns {LBPhysics.Resultant3D}  this.
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
     * @returns {LBPhysics.Resultant3D} this.
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
     * @param {object} other    The resultant to be added.
     * @returns {LBPhysics.Resultant3D} this.
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
     * @param {type} position   The new application point.
     * @returns {LBPhysics.Resultant3D} this.
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
     * @param {LBGeometry.Plane} [plane] If defined the plane where the application point
     * should be in, if possible.
     * @param {LBGeometry.Sphere} [planeBoundsSphere] If both this and plane are defined, this
     * is a sphere within which the plane application point must be for the application point
     * to be moved to the plane. This prevents the application point from shooting far away
     * when the force direction is near the same direction as the plane.
     * @returns {LBPhysics.Resultant3D}  this.
     */
    convertToWrench: function(plane, planeBoundsSphere) {
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
            var pos = LBGeometry.getLinePlaneIntersection(plane, line, LBPhysics.Resultant3D._workingPos);
            if (pos) {
                if (!planeBoundsSphere || planeBoundsSphere.containsPoint(pos)) {
                    this.applPoint.copy(pos);
                }
            }
        }
        
        return this;
    },
    
    
    /**
     * Rotates the force and moment vectors by applying a quaternion.
     * @param {object} quaternion The quaternion defining the rotation.
     * @returns {LBPhysics.Resultant3D}  this.
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
     * @returns {LBPhysics.Resultant3D}  this.
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
     * @param {number} scale    The scale to apply.
     * @returns {LBPhysics.Resultant3D} this.
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
     * @returns {LBPhysics.Resultant3D}  this.
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
 * @constructor
 * @returns {LBPhysics.CoordSystemState}
 */
LBPhysics.CoordSystemState = function() {
    /**
     * The matrix transforming from local to world coordinates.
     * @member {LBGeometry.Matrix4}
     */
    this.worldXfrm = new LBGeometry.Matrix4();

    /**
     * The matrix transforming from world to local coordinates.
     * @member {LBGeometry.Matrix4}
     */
    this.localXfrm = new LBGeometry.Matrix4();
    
    /**
     * The matrix transforming from local to world coordinates from the previous time step.
     * @member {LBGeometry.Matrix4}
     */    
    this.prevWorldXfrm = new LBGeometry.Matrix4();
    
    /**
     * The matrix transforming from world to local coordinates from the previous time step.
     * @member {LBGeometry.Matrix4}
     */    
    this.prevLocalXfrm = new LBGeometry.Matrix4();
    
    /**
     * The last time step.
     * @member {number}
     */
    this.dt = 0;
    
    
    this.isXfrmsValid = false;
  
};

LBPhysics.CoordSystemState._workingPosA = new LBGeometry.Vector3();
LBPhysics.CoordSystemState._workingPosB = new LBGeometry.Vector3();
LBPhysics.CoordSystemState._workingPosC = new LBGeometry.Vector3();
LBPhysics.CoordSystemState._workingPosD = new LBGeometry.Vector3();
LBPhysics.CoordSystemState._workingPlane = new LBGeometry.Plane();

LBPhysics.CoordSystemState.prototype = {
    /**
     * Sets the world and local transforms, saving the previous transforms in the
     * process. If either Xfrm matrix is not defined it is obtained by inverting the
     * other matrix, if both are not defined then the matrices are set to the identity
     * matrix.
     * @param {object} [worldXfrm]    If defined, the 4x4 matrix for transforming from local to world coordinaes.
     * @param {number} [dt]   The simulation time change from the last call to this, used
     * to compute velocity.
     * @param {object} [localXfrm]    If defined, the 4x4 matrix for transforming from world to local coordinates.
     * @returns {LBPhysics.CoordSystemState} this.
     */
    setXfrms: function(worldXfrm, dt, localXfrm) {
        // Need to use Leeboard.isVar() because dt is numeric.
        if (Leeboard.isVar(dt) && (dt > 0)) {
            // Save the current transforms...
            this.dt = dt;
            this.prevWorldXfrm.copy(this.worldXfrm);
            this.prevLocalXfrm.copy(this.localXfrm);
        }
        else {
            this.dt = 0;
        }
        
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
        
        if ((this.dt === 0) || !this.isXfrmsValid) {
            // No time change, make the previous transforms match the current transforms.
            this.prevWorldXfrm.copy(this.worldXfrm);
            this.prevLocalXfrm.copy(this.localXfrm);
        }
        this.isXfrmsValid = true;
        
        return this;
    },
    
    /**
     * Marks the coordinate transforms as invalid so the initial transforms are not
     * saved for velocity calculations.
     */
    reset: function() {
        this.isXfrmsValid = false;
    },
    
    
    /**
     * Calculates world position, world velocity, and local velocity for a given local
     * point.
     * @param {object} localPos The local coordinates of the point of interest.
     * @param {object} results  The object to receive the results. Results are stored
     * in keys, and are only computed if the key exists:
     *      <li>worldPos: The world coordinates of localPos.
     *      <li>worldVel:   The velocity of localPos in world coordinates.
     *      <li>localVel:   The velocity of localPos in local coordinates.
     * @param {object} [prevLocalPos] If defined, the previous local position, used for velocity calculation,
     * if not defined then the previous position is presumed to be localPos.
     * @returns {LBPhysics.CoordSystemState} this.
     */
    calcVectorLocalToWorld: function(localPos, results, prevLocalPos) {
        var worldPos = results.worldPos || LBPhysics.CoordSystemState._workingPosA;
        worldPos.copy(localPos);
        worldPos.applyMatrix4(this.worldXfrm);

        var isWorldVel = results.worldVel;
        var isLocalVel = results.localVel;
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
                var prevPos = LBPhysics.CoordSystemState._workingPosB;
                prevPos.copy(prevLocalPos);
                prevPos.applyMatrix4(this.prevWorldXfrm);
                
                var worldVel = (isWorldVel) ? results.worldVel : LBPhysics.CoordSystemState._workingPosC;
                worldVel.subVectors(worldPos, prevPos).multiplyScalar(1/this.dt);
                
                if (isLocalVel) {
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
     * @param {LBGeometry.Vector3} rotAxis   The axis, this must be normalized.
     * @returns {number}    The angular velocity in radians/sec.
     */
    calcAngularVelocityAboutLocalAxis: function(rotAxis) {
        if (this.dt === 0) {
            return 0;
        }
        
        var prevPos = LBPhysics.CoordSystemState._workingPosA;
        prevPos.copy(rotAxis);
        prevPos.applyMatrix4Rotation(this.worldXfrm);
        
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
        
        prevPos.applyMatrix4Rotation(this.prevWorldXfrm);
        currentPos.applyMatrix4Rotation(this.worldXfrm);
        
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
    
    constructor: LBPhysics.CoordSystemState
};

/**
 * Loads a moment of inertia tensor from properties in a data object
 * @param {object} data The data object to load from.
 * @param {object} [store]  If defined the object to load the tensor into.
 * @returns {object}    The moment of inertia tensor.
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
 * @param {object} inertia The inertia tensor.
 * @returns {number}    The Ixx term.
 */
LBPhysics.getInertiaXX = function(inertia) {
    return inertia.elements[0];
};

/**
 * Returns the Ixy term of an inertia tensor.
 * @param {object} inertia The inertia tensor.
 * @returns {number}    The Ixy term.
 */
LBPhysics.getInertiaXY = function(inertia) {
    return inertia.elements[1];
};

/**
 * Returns the Ixz term of an inertia tensor.
 * @param {object} inertia The inertia tensor.
 * @returns {number}    The Ixz term.
 */
LBPhysics.getInertiaXZ = function(inertia) {
    return inertia.elements[1];
};

/**
 * Returns the Iyy term of an inertia tensor.
 * @param {object} inertia The inertia tensor.
 * @returns {number}    The Iyy term.
 */
LBPhysics.getInertiaYY = function(inertia) {
    return inertia.elements[4];
};

/**
 * Returns the Iyz term of an inertia tensor.
 * @param {object} inertia The inertia tensor.
 * @returns {number}    The Iyz term.
 */
LBPhysics.getInertiaYZ = function(inertia) {
    return inertia.elements[1];
};

/**
 * Returns the Izz term of an inertia tensor.
 * @param {object} inertia The inertia tensor.
 * @returns {number}    The Izz term.
 */
LBPhysics.getInertiaZZ = function(inertia) {
    return inertia.elements[8];
};

/**
 * A rigid body for purposes of force calculations. A rigid body has mass, a position
 * and orientation, and may have additional rigid body parts attached to it.
 * @constructor
 * @param {object} [obj3D]    The object defining the location and orientation of the
 * rigid body, a reference to this object is kept, the object is expected to change
 * position and orientation during a simulation. This presumes that the object's world
 * reference frame is the same as the base's world reference frame.
 * @param {number} [mass] The mass of the body, may be 0.
 * @param {object} [centerOfMass] The center of mass relative to the local reference 
 * frame, if not defined it will be set to {0,0,0}.
 * @param {object} [momentInertia]    The moment of inertia tensor, not yet fully supported.
 * @param {object} [base] If defined, the rigid body to which this is attached, and which
 * is the base of this rigid body. The coordinates of this rigid body are then in the
 * local coordinates of the base.
 */
LBPhysics.RigidBody = function(obj3D, mass, centerOfMass, momentInertia, base) {
    /**
     * A name for the rigid body.
     * @type String
     */
    this.name = "";
    
    /**
     * The mass.
     * @type number
     */
    this.mass = mass;
    
    /**
     * The moment of inertia tensor.
     * @type LBGeometry.Matrix3
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
     * @type LBGeometry.Vector3
     */
    this.centerOfMass = centerOfMass || new LBGeometry.Vector3();
    
    /**
     * A radius associated with the mass, used as essentially a region of interest
     * around the center of mass.
     * @type number
     */
    this.massRadius = 0;
    
    /**
     * The Object3D used to define the 3D properties of the body.
     * @type LBGeometry.Object3D
     */
    this.obj3D = obj3D || new LBGeometry.Object3D();
    
    /**
     * The coordinate system state used to track changes in the location of the
     * local coordinate system in the world space. Primarily used to track velocity.
     * @type LBPhysics.CoordSystemState
     */
    this.coordSystem = new LBPhysics.CoordSystemState();
    this.coordSystemResults = {
        "worldVel": new LBGeometry.Vector3(),
        "localVel": new LBGeometry.Vector3()
    };
    
    /**
     * The current linear velocity of the body in the world coordinate system.
     * @type LBGeometry.Vector3
     */
    this.worldLinearVelocity = this.coordSystemResults.worldVel;

    /**
     * The current linear velocity of the body in the local coordinate system.
     * @type LBGeometry.Vector3
     */
    this.localLinearVelocity = this.coordSystemResults.localVel;
    
    this.resultant = new LBPhysics.Resultant3D();

    /**
     * An array contianing the rigid bodies that are part of this rigid body. The
     * parts have their local coordinate systems specified relative to this rigid
     * body's local coordinate system.
     * <p>
     * Parts should be added and removed using {@link LBPhysics.RigidBody#addPart} and
     * {@link LBPhysics.RigidBody#removePart}.
     * @type LBPhysics.RigidBody[]
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
};

LBPhysics.RigidBody._workingResultant = new LBPhysics.Resultant3D();
LBPhysics.RigidBody._workingMoment = new LBGeometry.Vector3();
LBPhysics.RigidBody._workingPos = new LBGeometry.Vector3();

LBPhysics.RigidBody.prototype = {
    /**
     * Loads the rigid body's properties from the properties in a data object.
     * This currently does not load the parts of the rigid body, though it may in
     * the future.
     * @param {object} data The data object to load from.
     * @returns {object}    this.
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
     * @returns {object}    this.
     */
    loadBase: function(data) {
        this.name = data.name || this.name;
        this.mass = data.mass || this.mass;
        LBGeometry.loadVector3(data.centerOfMass, this.centerOfMass);
        this.massRadius = data.massRadius || this.massRadius;
        
        if (data.momentInertia) {
            LBPhysics.loadMomentInertia(data.momentInertia, this.momentInertia);
        }
        else {
            this.momentInertia.identity().multiplyScalar(this.mass);
        }
        
        this.physicalPropertiesDirty = true;
        return this;
    },
    
    /**
     * Adds a part to the rigid body. If the part is part of another rigid
     * body it is removed from that other rigid body.
     * @param {object} part The part to add.
     * @returns {LBPhysics.RigidBody} this.
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
     * @param {object} part The part to remove.
     * @returns {LBPhysics.RigidBody}    this.
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
     * Sets the position of the rigid body.
     * @param {number} x    The x-coordinate.
     * @param {number} y    The y-coordinate.
     * @param {number} z    The z-coordinate.
     * @returns {LBPhysics.RigidBody}    this.
     */
    setXYZ: function(x, y, z) {
        this.obj3D.position.set(x, y, z);
        return this;
    },
    
    /**
     * Sets the rotation of the rigid body about the z-axis, in radians.
     * @param {number} rad  The rotation about the z-axis, in radians. The rotation
     * is absolute with respect to the base's coordinate system.
     * @returns {LBPhysics.RigidBody}   this.
     */
    setZRotationRad: function(rad) {
        this.obj3D.setRotationFromEuler(LBGeometry.createEulerRad(0, 0, rad));
        return this;
    },
    
    /**
     * Sets the rotation of the rigid body about the z-axis, in degrees.
     * @param {number} deg  The rotation about the z-axis, in degrees. The rotation
     * is absolute with respect to the base's coordinate system.
     * @returns {LBPhysics.RigidBody}   this.
     */
    setZRotationDeg: function(deg) {
        return this.setZRotationRad(deg * LBMath.DEG_TO_RAD);
    },

    /**
     * Zeros the resultant of this rigid body and of all rigid bodies that are
     * part of it.
     * @returns {LBPhysics.RigidBody}    this.
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
     * @param {number} dt   The simulation time since the last time the coordinates
     * was updated, passed to the coordinate system state.
     * @returns {LBPhysics.RigidBody}    this.
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
     * @param {object} force    The force to add.
     * @param {object} worldPos The position on the rigid body where the force is
     * applied.
     * @returns {LBPhysics.RigidBody}    this.
     */
    addWorldForce: function(force, worldPos) {
        this.resultant.addForce(force, worldPos);
        return this;
    },
    
    /**
     * Adds a resultant in world coordinates to the rigid body's resultant.
     * @param {object} resultant The resultant to add, in world coordinates.
     * @returns {LBPhysics.RigidBody}    this.
     */
    addWorldResultant: function(resultant) {
        this.resultant.addResultant(resultant);
        return this;
    },
    
    /**
     * Retrieves the resultant in world coordinates.
     * @param {Boolean} convertToWrench If true the resultant is converted to a wrench,
     * otherwise its application point is set to the total center of mass.
     * @param {LBGeometry.Plane} [wrenchPlane]    If convertToWrench is true, this is the
     * optional plane passed to {@link LBPhysics.Resultant3D.convertToWrench}.
     * @param {LBGeometry.Sphere} [wrenchBounds]  If convertToWrench is true and
     * wrenchPlane is specified, this is a bounding sphere within which the application
     * point transfered to the wrenchPlane must lie for it to actually be transferred.
     * @returns {LBPhysics.Resultant3D} The resultant in world coordinates.
     */
    getResultant: function(convertToWrench, wrenchPlane, wrenchBounds) {
        this.totalResultant.copy(this.resultant);
        for (var i = 0; i < this.parts.length; ++i) {
            this.totalResultant.addResultant(this.parts[i].getResultant());
        }
        if (convertToWrench) {
            this.totalResultant.convertToWrench(wrenchPlane, wrenchBounds);
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
     * @returns {LBPhysics.RigidBody}    this.
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
     * @returns {object}    The center of mass in world coordinates.
     */
    getTotalCenterOfMass: function() {
        this._updatePhysicalProperties();
        return this.totalCenterOfMass;
    },

    /**
     * Retrieves the composite moment of inertia tensor.
     * @returns {LBGeometry.Matrix3} The matrix tensor.
     */
    getTotalMomentInertia: function() {
        this._updatePhysicalProperties();
        return this.totalMomentInertia;
    },

    /**
     * Retrieves the composite inverse moment of inertia tensor.
     * @returns {LBGeometry.Matrix3} The inverse matrix tensor.
     */
    getTotalInvMomentInertia: function() {
        this._updatePhysicalProperties();
        return this.totalInvMomentInertia;
    },
    

    /**
     * This integrates the current resultant against the local rotation of the rigid
     * body around a given axis, rotating the body and reducing the resultant appropriately.
     * @param {LBGeometry.Vector3} axisOrigin A point defining the location of the axis, in
     * local coordinates.
     * @param {LBGeometry.Vector3} axis The axis of rotation in local coordinates, this must be normalized.
     * @param {number} currentDeg    The current angular rotation about the axis in degrees.
     * @param {function} [constrainer]  Optional function called to enforce any constraints
     * on the rotation angle. The function signature is:
     *  constrainer = function(deltaDeg) {
     *      return constrainedDeg;
     *  }
     * @returns {undefined}
     */
    integrateForceForRotation: function(axisOrigin, axis, currentDeg, constrainer) {
        if ((this.coordSystem.dt === 0) || LBMath.isLikeZero(this.mass)) {
            return;
        }
        
        // Move the resultant to the axis origin, then convert it to local coordinates.
        var resultant = LBPhysics.RigidBody._workingResultant.copy(this.resultant);

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
            deg = constrainer.call(this, deg);
        }
        
        if (deg !== currentDeg) {
            this.obj3D.rotateOnAxis(axis, (deg - currentDeg) * LBMath.DEG_TO_RAD);
        }
    },
    
    constructor: LBPhysics.RigidBody
};


/**
 * Helper that creates and loads a rigid body from a data object. If the data object contains
 * a 'className' property, the value of that property is passed directly to Leeboard.stringToNewClassInstance()
 * along with the optional 'constructorArgs' property to create
 * the rigid body object, otherwise if defCreatorFunc is defined it is called to create
 * the rigid body object, otherwise {@link LBPhysics.RigidBody} is used.
 * @param {object} data The data to load from.
 * @param {object} [defCreatorFunc] If defined the function used to create the rigid body if the
 * data object does not contain a construct property, or data is not defined. The argument
 * passed to this function is the data argument.
 * @returns {object}    The foil object, undefined if both data and defCreatorFunc are not defined.
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
        rigidBody = Leeboard.newClassInstanceFromData(data);
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
