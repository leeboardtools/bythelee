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


define(['lbcannonutil', 'lbgeometry', 'lbphysics', 'cannon', 'lbphysicslink'],
function(LBCannonUtil, LBGeometry, LBPhysics, CANNON, LBPhysicsLink) {

    'use strict';

/**
 * An implementation of {@link module:LBPhysicsLink.Link} for working with the 
 * {@link http://schteppe.github.io/cannon.js|cannon.js} physics engine.
 * @exports LBCannonPhysicsLink
 */
var LBCannonPhysicsLink = LBCannonPhysicsLink || {};

/**
 * Manages linking a {@link http://schteppe.github.io/cannon.js/docs/classes/Body.html|CANNON.Body}
 * with a {@link module:LBPhysics.RigidBody}.
 * @constructor
 * @extends module:LBPhysicsLink.Link
 * @returns {module:LBCannonPhysicsLink.Link}
 */
LBCannonPhysicsLink.Link = function() {
    LBPhysicsLink.Link.call(this);
    
    this.cWorld = new CANNON.World();
    this.cWorld.broadphase = new CANNON.NaiveBroadphase();
    this.cWorld.defaultContactMaterial.restitution = 0.01;
    this.cWorld.defaultContactMaterial.contactEquationStiffness = 1e4;
    this.cWorld.defaultContactMaterial.contactEquationRelaxation = 3;
    
    this.dt = 1/60;
};

LBCannonPhysicsLink.Link._workingVec3 = new CANNON.Vec3();
LBCannonPhysicsLink.Link._workingVector3 = new LBGeometry.Vector3();

LBCannonPhysicsLink.Link.prototype = Object.create(LBPhysicsLink.Link.prototype);
LBCannonPhysicsLink.Link.prototype.constructor = LBCannonPhysicsLink.Link;


// @inheritdoc..
LBCannonPhysicsLink.Link.prototype.addFixedObject = function(rigidBody) {
    return this._addCannonRigidBody(rigidBody, CANNON.Body.STATIC);
};

// @inheritdoc...
LBCannonPhysicsLink.Link.prototype._rigidBodyAdded = function(rigidBody, data) {
    return this._addCannonRigidBody(rigidBody, CANNON.Body.DYNAMIC);
};

LBCannonPhysicsLink.Link.prototype._addCannonRigidBody = function(rigidBody, cannonType) {
    var body = new CANNON.Body();
    body.type = cannonType;
    
    LBCannonUtil.addRigidBodyVolumesToBody(body, rigidBody);
    
    this.cWorld.add(body);
    
    rigidBody._lbCannonBody = body;
    
    var pos = LBCannonPhysicsLink.Link._workingVector3.copy(rigidBody.centerOfMass);
    pos.applyMatrix4(rigidBody.obj3D.matrixWorld);
    
    body.position.copy(pos);
    body.quaternion.copy(rigidBody.obj3D.quaternion);

    return this;
};


// @inheritdoc..
LBCannonPhysicsLink.Link.prototype._rigidBodyRemoved = function(rigidBody) {
    if (rigidBody._lbCannonBody) {
        this.cWorld.removeBody(rigidBody._lbCannonBody);
        rigidBody._lbCannonBody = undefined;
    }
};

// @inheritdoc..
LBCannonPhysicsLink.Link.prototype.timeStep = function() {
    return this.dt;
};

// @inheritdoc..
LBCannonPhysicsLink.Link.prototype.update = function(dt) {
    if (this.updateCount === 0) {
        // Gotta sync up first time through...
        this.rigidBodies.forEach(this._updateFromSimStep, this);
        this.dtCurrent = 0;
    }
    else {
        this.dtCurrent = this.dt;
    }
    
    // Generate the forces...
    this.rigidBodies.forEach(this._applyRigidBodyForces, this);
    
    this.cWorld.step(dt);
    
    // Update the rigid body objects.
    this.rigidBodies.forEach(this._updateFromSimStep, this);
    
    ++this.updateCount;
};

/**
 * Called by {@link module:LBCannonPhysicsLink.Link#update} for each rigid body to let the rigid body
 * update the forces applied to it and then assign them to the Cannon body.
 * @param {module:LBPhysics.RigidBody} rigidBody   The rigid body.
 * @returns {undefined}
 */
LBCannonPhysicsLink.Link.prototype._applyRigidBodyForces = function(rigidBody) {
    var body = rigidBody._lbCannonBody;
    if (!body) {
        return;
    }

    LBCannonUtil.updateBodyFromRigidBodyVolumes(body, rigidBody);
    
    if (rigidBody.updateForces) {
        rigidBody.updateForces(this.dtCurrent);

        var resultant = rigidBody.getResultant(true);
    
    // TEST!!!
/*    resultant.applPoint.z = body.position.z;
    resultant.force.z = 0;
    resultant.moment.x = resultant.moment.y = 0;
  */ 
    
        body.applyForce(resultant.force, LBCannonPhysicsLink.Link._workingVec3.copy(resultant.applPoint));
        body.torque.vadd(resultant.moment, body.torque);
    }
};

/**
 * Called by {@link module:LBCannonPhysicsLink.Link#update} for each rigid body after the physics have
 * been stepped, this updates the rigid body from the Cannon body's position and orientation
 * and also updates the Phaser drawing object associated with the rigid body, if any.
 * @param {module:LBPhysics.RigidBody} rigidBody   The rigid body.
 * @returns {undefined}
 */
LBCannonPhysicsLink.Link.prototype._updateFromSimStep = function(rigidBody) {
    var body = rigidBody._lbCannonBody;
    if (!body) {
        return;
    }
    
    var pos = LBCannonPhysicsLink.Link._workingVec3.copy(rigidBody.centerOfMass);
    pos.negate(pos);
    body.pointToWorldFrame(pos, pos);
    
    rigidBody.setPositionAndQuaternion(pos, body.quaternion);
    rigidBody.obj3D.position.copy(pos);
    rigidBody.obj3D.quaternion.copy(body.quaternion);
    
    rigidBody.obj3D.updateMatrixWorld(true);
};

LBCannonPhysicsLink.Link.getCannonBody = function(rigidBody) {
    return rigidBody._lbCannonBody;
};

return LBCannonPhysicsLink;
});