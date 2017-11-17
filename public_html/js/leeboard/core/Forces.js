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

define(['lbphysics', 'lbgeometry', 'lbutil', 'lbvolume'],
function(LBPhysics, LBGeometry, LBUtil, LBVolume) {
    
    'use strict';

/**
 * The forces module contains stuff for calculating and applying forces to {@link LBPhysics.RigidBody} objects.
 * Forces are calculated and applied by force generators, an example is {@link LBForces.Spring}.
 * Force generators have an update() method, and can be added to a {@link LBPhysicsLink.Link} implementation,
 * which will handle calling the update() method from its update() method.
 * @exports   LBForces
 */
var LBForces = LBForces || {};


/**
 * The force generator interface.
 * @interface
 * @returns {module:LBForces.Generator}
 */
LBForces.Generator = function() {
};

/**
 * The generator update method, this calculates and applies the forces as necessary.
 * @param {Number} dt   The time step.
 * @returns {undefined}
 */
LBForces.Generator.prototype.update = function(dt) {
};


var _workingPos = new LBGeometry.Vector3();


/**
 * A ForceContact is a simple object that has a getContactPoint function and an
 * optional applyResultantForce function.
 * @constructor
 * @param {Function} getContactPoint    The function for retrieving the force contact point
 * in world coordinates, this takes one optional arg, an {@link module:LBGeometry.Vector3} 
 * to be set to the contact point, and returns the contact point.
 * @example
 *  getContactPoint = function(pos) {
 *      pos = LBUtil.copyOrClone(pos, LBGeometry.Vector3.ORIGIN);
 *      // Transform local to world...
 *      return pos;
 *  }
 *  
 * @param {Function} [applyResultant]   The optional function for applying a resultant force.
 * @example
 *  applyResultant = function(resultant) {
 *      rigidBody.applyWorldResultant(resultant);
 *  }
 * @returns {module:LBForces.ForceContact}
 */
LBForces.ForceContact = function(getContactPoint, applyResultant) {
    this.getContactPoint = getContactPoint;
    this.applyResult = applyResultant;
};

LBForces.ForceContact.prototype = {
    constructor: LBForces.ForceContact
};


/**
 * Creates a {@link module:LBForces.ForceContact} object that serves as a fixed anchor point.
 * @param {module:LBGeometry.Vector3} [vec=LBGeometry.Vector3.ORIGIN]  The anchor point.
 * @return {module:LBForces.ForceContact}   The force contact.
 */
LBForces.forceContactFromVector3 = function(vec) {
    vec = vec || LBGeometry.Vector3.ORIGIN;
    return new LBForces.ForceContact(function(pos) {
            return LBUtil.copyOrClone(pos, vec);
        }
    );
};

/**
 * Creates a {@link module:LBForces.ForceContact} object attached to a point on a rigid body.
 * @param {module:LBPhysics.RigidBody} rigidBody    The rigid body.
 * @param {module:LBGeometry.Vector3} [localPos=module:LBGeometry.Vector3.ORIGIN]   The point
 * in the rigid body's local coordinates where the force is applied.
 * @return {module:LBForces.ForceContact}   The force contact.
 */
LBForces.forceContactFromRigidBody = function(rigidBody, localPos) {
    localPos = localPos || LBGeometry.Vector3.ORIGIN;
    return new LBForces.ForceContact(
        function(pos) {
            return rigidBody.coordSystem.vector3ToLocal(localPos, pos);
        },
        function(resultant) {
            rigidBody.addWorldResultant(resultant);
        }
    );
};

/**
 * Creates a {@link module:LBForces.ForceContact} object attached to a point on an
 * {@link module:LBGeometry.Object3D}. No force is applied to the object.
 * @param {module:LBGeometry.Object3D} object3D The 3D object.
 * @param {module:LBGeometry.Vector3} [localPos=module:LBGeometry.Vector3.ORIGIN]   The point
 * in the 3D object's local coordinates where the force is anchored.
 * @return {module:LBForces.ForceContact}   The force contact.
 */
LBForces.forceContactFromObject3D = function(object3D, localPos) {
    localPos = localPos || LBGeometry.Vector3.ORIGIN;
    return new LBForces.ForceContact(
        function(pos) {
            pos = LBUtil.copyOrClone(pos, localPos);
            return object3D.localToWorld(pos);
        }
    );
};

/**
 * Helper for creating a {@link module:LBForces.ForceContact} given some object. The
 * type of the object is attempted to be determined from the properties of the object.
 * @param {Object} data The data object.
 * @param {module:LBForces.ForceContact} [defForceContact]  If defined the default force contact
 * object to serve as a template for the object to be returned if data could not be converted
 * to a force contact object.
 * @returns {module:LBForces.ForceContact}  The force contact object, undefined if data
 * could not be converted and defForceContact was undefined.
 */
LBForces.createForceContactFromData = function(data, defForceContact) {
    if (data) {
        if (data.x !== undefined) {
            return LBForces.forceContactFromVector3(data);
        }
        if (data.coordSystem && data.addWorldResultant) {
            return LBForces.forceContactFromRigidBody(data);
        }
        if (data.rigidBody) {
            return LBForces.forceContactFromRigidBody(data.rigidBody, data.applPoint);
        }
        if (data.isObject && data.localToWorld) {
            return LBForces.forceContactFromObject3D(data);
        }
        console.log('Unrecognized data arg passed to LBForces.createForceContactFromData.');
    }
    
    if (defForceContact) {
        return new LBForces.ForceContact(defForceContact.getContactPoint,
                defForceContact.applyResultantForce);
    }
    
    return undefined;
};

/**
 * A basic linear translational spring force. {@link LBForces.Spring#calcForceMagFromExtension}
 * can be overridden to provide variable spring constants.
 * @constructor
 * @param {Object} options  Object containing the spring's parameters.
 * @return {module:LBForces.Spring}
 */
LBForces.SpringForce = function(options) {
    options = options || {};
    
    /**
     * The length at which force begins to be applied.
     * @member {Number}
     */
    this.minForceLength = options.minForceLength || 0;
    
    /**
     * The length beyond which force ceases to be applied. At this point the spring breaks.
     * @member {Number}
     */
    this.maxForceLength = options.maxForceLength || Number.MAX_VALUE;
    
    /**
     * The rate or spring constant.
     * @member {Number}
     */
    this.springConstant = options.springConstant || 1;
};

LBForces.SpringForce.prototype = {
    /**
     * @return {Boolean}    true if the spring has exceeded its maximum length and is now broken.
     */
    isBroken: function() {
        return this.minForceLength === Number.MAX_VALUE;
    },
    
    /**
     * Calculates the spring's force for a given extension.
     * @param {Number} extension    The amount of extension. This must exceed 
     * {@link LBForces.TranslationalSpring#minForceLength} for any force to be generated.
     * @return {Number} The force.
     */
    calcForceMagFromExtension: function(extension) {
        if (extension < this.minForceLength) {
            return 0;
        }
        else if (extension > this.maxForceLength) {
            // Broken...
            this.minForceLength = Number.MAX_VALUE;
            return 0;
        }
        
        return (extension - this.minForceLength) * this.springConstant;
    },
    
    /**
     * Calculates the resultant force exerted on bodyPosition if the spring were extended from basePosition
     * to bodyPositon.
     * @param {module:LBGeometry.Vector3} bodyPosition The position of extension, where the resultant force is computed
     * from.
     * @param {module:LBGeometry.Vector3} [basePosition=LBGeometry.Vector3.ORIGIN] The base position
     * @param {module:LBPhysics.Resultant3D} [resultant]   If defined the object to receive the resultant.
     * @return {module:LBPhysics.Resultant3D}  The resultant force.
     */
    calcResultantForce: function(bodyPosition, basePosition, resultant) {
        basePosition = basePosition || LBGeometry.Vector3.ORIGIN;
        resultant = resultant || new LBPhysics.Resultant3D();
        
        _workingPos.copy(basePosition)
                .sub(bodyPosition);
        var length = _workingPos.length();
        var forceMag = this.calcForceMagFromExtension(length);
        if (!forceMag) {
            resultant.zero();
        }
        else {
            _workingPos.multiplyScalar(forceMag / length);
            resultant.force.copy(_workingPos);
            resultant.applPoint.copy(bodyPosition);
        }
        
        return resultant;
    },
    
    constructor: LBForces.SpringForce
};


/**
 * A translational spring force generator.
 * @constructor
 * @implements {module:LBForces.Generator}
 * @param {Object} endA An object compatible with {@link module:LBForces.createForceContactFromData}
 * that defines one end of the spring.
 * @param {Object} [endB]   An object compatible with {@link module:LBForces.createForceContactFromData}
 * that defines the other end of the spring.
 * @param {Object} [options]    Options compatible with {@link module:LBForces.SpringForce}, unless
 * the object has a property named 'springForce', in which case the object referred to by that
 * property is the spring and is assigned to the spring property.
 * @returns {LBForces.Spring}
 */
LBForces.Spring = function(endA, endB, options) {
    /**
     * The force contact point for one end of the spring.
     * @member {module:LBForces.ForceContact}
     */
    this.endA = LBForces.createForceContactFromData(endA);

    /**
     * The force contact point for the other end of the spring.
     * @member {module:LBForces.ForceContact}
     */
    this.endB = LBForces.createForceContactFromData(endB);
    
    /**
     * The spring force calculator.
     * @member {module:LBForces.SpringForce}
     */
    this.springForce = (options && options.springForce) ? options.springForce : new LBForces.SpringForce(options);
    
    /**
     * If false {@link LBForces.Spring#update} does nothing.
     * @member {Boolean}
     */
    this.isEnabled = false;
    
    if (this.endA && this.endB) {
        if (this.endA.applyResultantForce || this.endB.applyResultantForce) {
            // Only enable if there's someone that will receive the force...
            this.isEnabled = true;
        }
    }
};


var _workingEndAPos;
var _workingEndBPos;
var _workingResultant;

LBForces.Spring.prototype = {
    /**
     * The generator update method, this calculates and applies the forces as necessary.
     * @param {Number} dt   The time step.
     * @returns {undefined}
     */
    update: function(dt) {
        if (!this.isEnabled) {
            return;
        }
        
        _workingEndAPos = this.forceContactA.getContactPoint(_workingEndAPos);
        _workingEndBPos = this.forceContactB.getContactPoint(_workingEndBPos);
        
        if (this.endA.applyResultantForce) {
            _workingResultant = this.springForce.calcResultantForce(_workingEndAPos, _workingEndBPos, _workingResultant);
            this.endA.applyResultantForce(_workingResultant);
            
            if (this.endB.applyResultantForce) {
                // Just reverse the force direction and change the application point.
                _workingResultant.force.negate();
                _workingResultant.applPoint.copy(_workingEndBPos);
                this.endB.applyResultantForce(_workingResultant);
            }
        }
        else {
            _workingResultant = this.springForce.calcResultantForce(_workingEndBPos, _workingEndAPos, _workingResultant);
            this.endB.applyResultantForce(_workingResultant);
        }
    },
    
    constructor: LBForces.Spring
};



LBForces.Buoyancy = function(options) {
    options = options || {};
    
    this.density = options.density || 1000;
    this.gravity = options.gravit || 9.81;
    this.fluidZ = options.fluidZ || Number.MAX_VALUE;
    
    this.plane = LBGeometry.XY_PLANE.clone();
    
    this.rigidBodies = [];
    
    this.isEnabled = true;
};

LBForces.Buoyancy.prototype = {
    
    addRigidBody: function(rigidBody) {
        this.rigidBodies.push(rigidBody);
    },
    
    removeRigidBody: function(rigidBody) {
        var index = this.rigidBodies.indexOf(rigidBody);
        if (index >= 0) {
            this.rigidBodies.splice(index, 1);
            return true;
        }
        return false;
    },
    
    update: function(dt) {
        if (!this.isEnabled) {
            return;
        }
        
        var me = this;
        this.rigidBodies.forEach(function(body) {
            me._calcAndApplyBuoyancy(body, dt);
        });
    },
    
    _calcAndApplyBuoyancy: function(body, dt) {
        if (!body.isEnabled) {
            return;
        }
        
        // Need the volume and center of volume based on the surface plane.
        _workingResultant = _workingResultant || new LBPhysics.Resultant3D();
        _workingResultant.zero();

        var totalVolume;
        var centerOfVolume = _workingResultant.applPoint;
        if (this.fluidZ !== Number.MAX_VALUE) {
            // Gotta do this the hard way...
            this.plane.constant = this.fluidZ;
            totalVolume = LBVolume.Volume.volumesOnSideOfPlane(body.volumes, this.plane, false, centerOfVolume);
        }
        else {
            totalVolume = LBVolume.totalVolume(body.volumes, centerOfVolume);
        }
        
        _workingResultant.force.set(0, 0, totalVolume * this.density * this.gravity);
    },
    
    constructor: LBForces.Buoyancy
};


// TO ADD:
// Gravity?
//  - Would be two kinds, a gravity field, and gravity between bodies, which is actually
//      a spring like force (nonlinear, but applied between two bodies).

return LBForces;
    
});

