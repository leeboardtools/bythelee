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


define(['lbsailsim', 'lbcannon'], function(LBSailSim, LBCannon) {
    

/**
 * An implementation of {@link LBSailSim.Env} for use with {@link Phaser.Physics.P2} or Cannon physics.
 * This pretty much just ties together the physics link and the sailing environment.
 * @constructor
 * @param {LBSailSim.SailEnvTHREE.CANNON_PHYSICS} physicsType  The physics engine to use.
 * @param {LBApp3D} app3d   The app calling this.
 * @returns {LBSailSim.SailEnvTHREE}
 */
LBSailSim.SailEnvTHREE = function(app3d, physicsType) {
    LBSailSim.Env.call(this);
    
    this.app3d = app3d;
    this.physicsType = physicsType;
    
    switch (physicsType) {
        case LBSailSim.SailEnvTHREE.CANNON_PHYSICS :
        case undefined :
            this.physicsLink = new LBCannon.CannonPhysicsLink();
            break;
    }
};


/**
 * Value to pass to {@link LBSailSim.SailEnvTHREE}'s contructor to use the Cannon JS physics engine.
 * @constant
 * @type Number
 */
LBSailSim.SailEnvTHREE.CANNON_PHYSICS = 0;

LBSailSim.SailEnvTHREE.prototype = Object.create(LBSailSim.Env.prototype);
LBSailSim.SailEnvTHREE.prototype.constructor = LBSailSim.SailEnvTHREE;


LBSailSim.SailEnvTHREE.prototype._boatCheckedOut = function(boat, data) {
    this.physicsLink.addRigidBody(boat, data);
    LBSailSim.Env.prototype._boatCheckedOut.call(this, boat, data);
};

LBSailSim.SailEnvTHREE.prototype._boatReturned = function(boat) {
    LBSailSim.Env.prototype._boatReturned.call(this, boat);
    this.physicsLink.removeRigidBody(boat);
};

/**
 * The main simulation update method, call from the {@link LBUI3d.App3D}'s update() method.
 * @returns {undefined}
 */
LBSailSim.SailEnvTHREE.prototype.update = function() {
    var dt = this.physicsLink.timeStep();
    LBSailSim.Env.prototype.update.call(this, dt);
    
    this.physicsLink.update(dt);
    
    this.physicsLink.updateDisplayObjects();
};

return LBSailSim;
});