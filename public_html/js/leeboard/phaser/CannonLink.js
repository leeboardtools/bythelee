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


/* global LBPhaser, CANNON, LBCannon, LBVolume, LBGeometry */

/**
 * Manages linking a {@link http://schteppe.github.io/cannon.js/docs/classes/Body.html|CANNON.Body}
 * with a {@link LBPhysics.RigidBody}, along with updating Phaser drawing objects.
 * @constructor
 * @extends LBPhaser.PhysicsLink
 * @param {LBPhaser.PhaserEnv} phaserEnv    The Phaser environment we're running under.
 * @returns {LBPhaser.CannonLink}
 */
LBPhaser.CannonLink = function(phaserEnv) {
    LBPhaser.PhysicsLink.call(this, phaserEnv);
    
    this.cWorld = new CANNON.World();
    this.cWorld.broadphase = new CANNON.NaiveBroadphase();
    this.cWorld.defaultContactMaterial.restitution = 0;
    
   this.dt = 1/60;
};

LBPhaser.CannonLink._workingVec3 = new CANNON.Vec3();
LBPhaser.CannonLink._workingVector3 = new LBGeometry.Vector3();

LBPhaser.CannonLink.prototype = Object.create(LBPhaser.PhysicsLink.prototype);
LBPhaser.CannonLink.prototype.constructor = LBPhaser.CannonLink;


// @inheritdoc..
LBPhaser.CannonLink.prototype.addFixedObject = function(object) {
    var body = new CANNON.Body();
    body.type = CANNON.Body.STATIC;
    var width = Math.abs(this.phaserEnv.fromPixelsX(object.width / 2));
    var height = Math.abs(this.phaserEnv.fromPixelsY(object.height / 2));
    var box = new CANNON.Box(new CANNON.Vec3(width, height, 0.5));
    body.addShape(box);
    body.position.x = this.phaserEnv.fromPixelsX(object.position.x);
    body.position.y = this.phaserEnv.fromPixelsY(object.position.y);
    
    this.cWorld.add(body);
    
    object._lbCannonBody = body;
    
    return this;
};

// @inheritdoc...
LBPhaser.CannonLink.prototype._rigidBodyAdded = function(rigidBody, data) {
    var body = new CANNON.Body();
    body.type = CANNON.Body.DYNAMIC;
    
    LBCannon.addRigidBodyVolumesToBody(body, rigidBody);
    
    this.cWorld.add(body);
    
    rigidBody._lbCannonBody = body;
    
    var pos = LBPhaser.CannonLink._workingVector3.copy(rigidBody.centerOfMass);
    pos.applyMatrix4(rigidBody.obj3D.matrixWorld);
    
    body.position.copy(pos);
    body.quaternion.copy(rigidBody.obj3D.quaternion);

    return this;
};


// @inheritdoc..
LBPhaser.CannonLink.prototype._rigidBodyRemoved = function(rigidBody) {
    if (rigidBody._lbCannonBody) {
        this.cWorld.removeBody(rigidBody._lbCannonBody);
        rigidBody._lbCannonBody = undefined;
    }
};

// @inheritdoc..
LBPhaser.CannonLink.prototype.timeStep = function() {
    return this.dt;
};

// @inheritdoc..
LBPhaser.CannonLink.prototype.update = function(dt) {
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
 * Called by {@link LBPhaser.CannonLink#update} for each rigid body to let the rigid body
 * update the forces applied to it and then assign them to the Cannon body.
 * @param {LBPhysics.RigidBody} rigidBody   The rigid body.
 * @returns {undefined}
 */
LBPhaser.CannonLink.prototype._applyRigidBodyForces = function(rigidBody) {
    var body = rigidBody._lbCannonBody;
    if (!body) {
        return;
    }

    LBCannon.updateBodyFromRigidBodyVolumes(body, rigidBody);
    
    rigidBody.updateForces(this.dtCurrent);

    var resultant = rigidBody.getResultant(true);
    
    // TEST!!!
/*    resultant.applPoint.z = body.position.z;
    resultant.force.z = 0;
    resultant.moment.x = resultant.moment.y = 0;
  */ 
    
    body.applyForce(resultant.force, LBPhaser.CannonLink._workingVec3.copy(resultant.applPoint));
    body.torque.vadd(resultant.moment, body.torque);
};

/**
 * Called by {@link LBPhaser.CannonLink#update} for each rigid body after the physics have
 * been stepped, this updates the rigid body from the Cannon body's position and orientation
 * and also updates the Phaser drawing object associated with the rigid body, if any.
 * @param {LBPhysics.RigidBody} rigidBody   The rigid body.
 * @returns {undefined}
 */
LBPhaser.CannonLink.prototype._updateFromSimStep = function(rigidBody) {
    var body = rigidBody._lbCannonBody;
    if (!body) {
        return;
    }
    
    var pos = LBPhaser.CannonLink._workingVec3.copy(rigidBody.centerOfMass);
    pos.negate(pos);
    body.pointToWorldFrame(pos, pos);
    
    rigidBody.setPositionAndQuaternion(pos, body.quaternion);
    rigidBody.obj3D.position.copy(pos);
    rigidBody.obj3D.quaternion.copy(body.quaternion);
    
    rigidBody.obj3D.updateMatrixWorld(true);
};

LBPhaser.CannonLink.getCannonBody = function(rigidBody) {
    return rigidBody._lbCannonBody;
};
