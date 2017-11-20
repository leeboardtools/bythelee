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

define(['lbphysics', 'lbgeometry', 'lbutil', 'lbvolume', 'lbmath'],
function(LBPhysics, LBGeometry, LBUtil, LBVolume, LBMath) {
    
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
 * <pre><code>
 *  getContactPoint = function(pos) {
 *      pos = LBUtil.copyOrClone(pos, LBGeometry.ORIGIN);
 *      // Transform local to world...
 *      return pos;
 *  }
 * </code></pre>
 * @param {Function} [applyResultantForce]   The optional function for applying a resultant force.
 * <pre><code>
 *  applyResultantForce = function(resultant) {
 *      rigidBody.applyWorldResultant(resultant);
 *  }
 * </code></pre>
 * @returns {module:LBForces.ForceContact}
 */
LBForces.ForceContact = function(getContactPoint, applyResultantForce) {
    this.getContactPoint = getContactPoint;
    this.applyResultantForce = applyResultantForce;
};

LBForces.ForceContact.prototype = {
    constructor: LBForces.ForceContact
};


/**
 * Creates a {@link module:LBForces.ForceContact} object that serves as a fixed anchor point.
 * @param {module:LBGeometry.Vector3} [vec=LBGeometry.ORIGIN]  The anchor point.
 * @return {module:LBForces.ForceContact}   The force contact.
 */
LBForces.forceContactFromVector3 = function(vec) {
    vec = vec || LBGeometry.ORIGIN;
    return new LBForces.ForceContact(function(pos) {
            return LBUtil.copyOrClone(pos, vec);
        }
    );
};

/**
 * Creates a {@link module:LBForces.ForceContact} object attached to a point on a rigid body.
 * @param {module:LBPhysics.RigidBody} rigidBody    The rigid body.
 * @param {module:LBGeometry.Vector3} [localPos=module:LBGeometry.ORIGIN]   The point
 * in the rigid body's local coordinates where the force is applied.
 * @return {module:LBForces.ForceContact}   The force contact.
 */
LBForces.forceContactFromRigidBody = function(rigidBody, localPos) {
    localPos = localPos || LBGeometry.ORIGIN;
    return new LBForces.ForceContact(
        function(pos) {
            return rigidBody.coordSystem.vector3ToWorld(localPos, pos);
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
 * @param {module:LBGeometry.Vector3} [localPos=module:LBGeometry.ORIGIN]   The point
 * in the 3D object's local coordinates where the force is anchored.
 * @return {module:LBForces.ForceContact}   The force contact.
 */
LBForces.forceContactFromObject3D = function(object3D, localPos) {
    localPos = localPos || LBGeometry.ORIGIN;
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
 * @param {Object} options  Object containing the spring's parameters. Options include:
 * <pre><code>
 *      minForceLength: 0   // The length at which force begins to be applied.
 *      maxForceLength: Number.MAX_VALUE    // The length beyond which force ceases to be applied.
 *      springConstant: 1  // The spring constant.
 * </code></pre>
 * 
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
     * @param {module:LBGeometry.Vector3} [basePosition=LBGeometry.ORIGIN] The base position
     * @param {module:LBPhysics.Resultant3D} [resultant]   If defined the object to receive the resultant.
     * @return {module:LBPhysics.Resultant3D}  The resultant force.
     */
    calcResultantForce: function(bodyPosition, basePosition, resultant) {
        basePosition = basePosition || LBGeometry.ORIGIN;
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
 * <pre><code>
 *      springForce:    Object  // If defined an object compatible with {@link module:LBForces.SpringForce} to use to calculate the spring force.
 *      // Otherwise, options is passed directly to {@link module:LBForces.SpringForce}'s constructor.
 * </code></pre>
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
     * @override
     * @param {Number} dt   The time step.
     * @returns {undefined}
     */
    update: function(dt) {
        if (!this.isEnabled) {
            return;
        }
        
        _workingEndAPos = this.endA.getContactPoint(_workingEndAPos);
        _workingEndBPos = this.endB.getContactPoint(_workingEndBPos);
        
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


LBForces.MultiGenerator = function() {
    LBForces.Generator.call(this);
    this.rigidBodies = [];
    
    this.isEnabled = true;
};

LBForces.MultiGenerator.prototype = Object.create(LBForces.Generator.prototype);

/**
 * Adds a rigid body to the generator.
 * @param {module:LBPhysics.RigidBody} rigidBody    The rigid body.
 * @returns {module:LBForces.Buoyancy}  this
 */
LBForces.MultiGenerator.prototype.addRigidBody = function(rigidBody) {
    this.rigidBodies.push(rigidBody);
    return this;
};
    
/**
 * Removes a rigid body from the generator.
 * @param {module:LBPhysics.RigidBody} rigidBody    The rigid body.
 * @returns {Boolean}   true if the rigid body was in the generator and was removed.
 */
LBForces.MultiGenerator.prototype.removeRigidBody = function(rigidBody) {
    var index = this.rigidBodies.indexOf(rigidBody);
    if (index >= 0) {
        this.rigidBodies.splice(index, 1);
        return true;
    }
    return false;
};

/**
 * The generator update method, this calculates and applies the forces as necessary.
 * @override
 * @param {Number} dt   The time step.
 * @returns {undefined}
 */
LBForces.MultiGenerator.prototype.update = function(dt) {
    if (!this.isEnabled) {
        return;
    }

    var me = this;
    this.rigidBodies.forEach(function(body) {
        if (body.isEnabled) {
            me.generateForcesForBody(body, dt);
        }
    });
};


/**
 * A buoyancy force generator. This is designed to compute the buoyancy forces on many objects,
 * so only a single generator is typically needed for any given body of fluid.
 * @constructor
 * @param {Object} [options]  The options, which include:
 * <pre><code>
 *      density: 1000   // The density of the fluid.
 *      gravity: 9.81   // The acceleration of gravity.
 *      applyGravity:   false   // If true gravity due to the rigid body is also applied.
 *      fluidZ: Number.MAX_VALUE    // The z world coordinate of the fluid's surface.
 * </code></pre>
 * @returns {LBForces.Buoyancy}
 */
LBForces.Buoyancy = function(options) {
    options = options || {};
    LBForces.MultiGenerator.call(this, options);
    
    this.density = options.density || 1000;
    this.gravity = options.gravity || 9.81;
    this.applyGravity = options.applyGravity;
    
    this.fluidZ = !LBUtil.isVar(options.fluidZ) ? Number.MAX_VALUE : options.fluidZ;
    
    this.plane = LBGeometry.XY_PLANE.clone();
    
};


LBForces.Buoyancy.prototype = Object.create(LBForces.MultiGenerator.prototype);
LBForces.Buoyancy.prototype.constructor = LBForces.Buoyancy;

/**
 * The main buoyancy calculation routine for individual rigid bodies.
 * @param {module:LBPhysics.RigidBody} body The rigid body.
 * @param {Number} dt   The time step.
 * @returns {undefined}
 */
LBForces.Buoyancy.prototype.generateForcesForBody = function(body, dt) {

    // Need the volume and center of volume based on the surface plane.
    _workingResultant = _workingResultant || new LBPhysics.Resultant3D();
    _workingResultant.zero();

    var totalVolume;
    var centerOfVolume = _workingResultant.applPoint;
    if (this.fluidZ !== Number.MAX_VALUE) {
        // Gotta do this the hard way...
        this.plane.normal.copy(LBGeometry.Z_AXIS);
        this.plane.constant = this.fluidZ;
        if (body.coordSystem.localXfrm) {
            this.plane.applyMatrix4(body.coordSystem.localXfrm);
        }
        totalVolume = LBVolume.Volume.volumesOnSideOfPlane(body.volumes, this.plane, false, centerOfVolume);
        if (body.coordSystem.worldXfrm) {
            body.coordSystem.vector3ToWorld(centerOfVolume, centerOfVolume);
        }
    }
    else {
        totalVolume = LBVolume.Volume.totalVolume(body.volumes, centerOfVolume);
    }

    var force = totalVolume * this.density * this.gravity;
    if (body.buoyancyDamping) {
        // We have a separate buoyancy damping because it simply works better with one...
        
        // Based on the linear damping used in cannon/bullet, which is:
        //      vNew = v * (1 - damping)^(dt)
        // Since we work in forces, we want to generate a force that has a similar effect.
        // Working backwards:
        //      F = mass * accel
        //      accel = deltaV / dt
        //      deltaV = vNew - v
        // We get:
        //      deltaV = v * (1 - damping)^(dt) - v
        var deltaV = body.worldLinearVelocity.z * (Math.pow(1 - body.buoyancyDamping, dt) - 1);
        var accel = -deltaV / dt;
        force -= accel * body.getTotalMass();
    }
    _workingResultant.force.set(0, 0, force);

    if (this.applyGravity) {
        force = -body.getTotalMass() * this.gravity;
        _workingResultant.addForce(_workingPos.set(0, 0, force), body.getTotalCenterOfMass());
    }

    body.addWorldResultant(_workingResultant);
};
    

/**
 * Helper for loading the settings specific to the buoyancy generator into a rigid body.
 * @param {module:LBPhysics.RigidBody} rigidBody    The rigid body.
 * @param {Object} data The data object to load from. Settings include:
 * <pre><code>
 *      buoyancyDamping: 0  // The damping factor to apply to the buoyancy force, should be between 0 and 1.
 * </code></pre>
 * @returns {undefined}
 */
LBForces.Buoyancy.loadRigidBodySettings = function(rigidBody, data) {
    rigidBody.buoyancyDamping = data.buoyancyDamping || 0;
};


/**
 * A damping force generator. Damping is computed as a force that's a function of the object's
 * velocity. The damping coefficient is a value between 0 and 1, and generates a force F based upon
 * the damping used in cannon.js and Bullet:
 * <pre><code>
 *      vNew = v * (1 - damping)^(dt)
 * </code></pre>
 * <p>
 * <pre><code>
 *      F = mass * accel
 *      accel = deltaV / dt
 *      deltaV = vNew - v
 *      deltaV = v * (1 - damping)^(dt) - v
 * </code></pre>
 * <p> 
 * This is designed to compute the damping forces on many objects,
 * so only a single generator is typically needed.
 * @constructor
 * @param {Object} [options]    The options:
 * <pre><code>
 *      defaultDamping: undefined   // If defined, the damping coefficient to use when an
 *          object does not define one. If both this and the object do not define a damping
 *          coefficient then no damping is performed.
 * </code></pre>
 * @returns {Forces_L18.LBForces.Damping}
 */
LBForces.Damping = function(options) {
    options = options || {};
    LBForces.MultiGenerator.call(this, options);
    
    this.defaultDamping = options.defaultDamping;
    
    // To add: different damping zones.
};

LBForces.Damping.prototype = Object.create(LBForces.MultiGenerator.prototype);
LBForces.Damping.prototype.constructor = LBForces.Damping;


/**
 * The main damping calculation routine for individual rigid bodies.
 * @param {module:LBPhysics.RigidBody} body The rigid body.
 * @param {Number} dt   The time step.
 * @returns {undefined}
 */
LBForces.Damping.prototype.generateForcesForBody = function(body, dt) {
    var damping = LBUtil.isVar(body.forceDamping) ? body.forceDamping : this.defaultDamping;
    if (!damping) {
        return;
    }
    
    // Based on the linear damping used in cannon/bullet, which is:
    //      vNew = v * (1 - damping)^(dt)
    //      
    // Since we work in forces, we want to generate a force that has a similar effect.
    // Working backwards:
    //      F = mass * accel
    //      accel = deltaV / dt
    //      deltaV = vNew - v
    // We get:
    //      deltaV = v * (1 - damping)^(dt) - v
    var v = body.worldLinearVelocity.length();
    if ((v > 0) && !LBMath.isLikeZero(v)) {
        var deltaV = v * (Math.pow(1 - damping, dt) - 1);
        var accel = deltaV / dt;
        var force = accel * body.getTotalMass();
        _workingPos.copy(body.worldLinearVelocity);
        _workingPos.multiplyScalar(force / v);
        
        _workingResultant.addForce(_workingPos, body.getTotalCenterOfMass());
        body.addWorldResultant(_workingResultant);
    }
};
    

/**
 * Helper for loading the settings specific to the buoyancy generator into a rigid body.
 * @param {module:LBPhysics.RigidBody} rigidBody    The rigid body.
 * @param {Object} data The data object to load from. Settings include:
 * <pre><code>
 *      buoyancyDamping: 0  // The damping factor to apply to the buoyancy force, should be between 0 and 1.
 * </code></pre>
 * @returns {undefined}
 */
LBForces.Damping.loadRigidBodySettings = function(rigidBody, data) {
    rigidBody.forceDamping = data.forceDamping;
};

// TO ADD:
// Gravity?
//  - Would be two kinds, a gravity field, and gravity between bodies, which is actually
//      a spring like force (nonlinear, but applied between two bodies).
//


return LBForces;
    
});

