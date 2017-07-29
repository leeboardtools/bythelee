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


/* global LBSailSim, LBUtil, LBMath, LBPhaser, LBGeometry, LBCamera */


/**
 * An implementation of {@link LBSailSim.Env} for use with {@link Phaser.Physics.P2} or Cannon physics.
 * This pretty much just ties together the physics link and the sailing environment.
 * @constructor
 * @param {Phaser.Game} game    The Phaser game object.
 * @param {LBSailSim.PhaserSailEnv.P2_PHYSICS|LBSailSim.PhaserSailEnv.CANNON_PHYSICS} physicsType  The physics engine to use.
 * @returns {LBSailSim.PhaserSailEnv}
 */
LBSailSim.PhaserSailEnv = function(game, physicsType) {
    LBSailSim.Env.call(this);
    this.game = game;
    this.phaserEnv = new LBPhaser.Env(game);
    
    // Less confusing for the math if the y axis is pointing up.
    this.phaserEnv.ySign = -1;
    
    switch (physicsType) {
        case LBSailSim.PhaserSailEnv.P2_PHYSICS :
        default :
            physicsType = LBSailSim.PhaserSailEnv.P2_PHYSICS;
            this.physicsLink = new LBPhaser.P2Link(this.phaserEnv);
            break;
        
        case LBSailSim.PhaserSailEnv.CANNON_PHYSICS :
            this.physicsLink = new LBPhaser.CannonLink(this.phaserEnv);
            break;
    }
    this.physicsType = physicsType;

};

/**
 * Value to pass to {@link LBSailSim.PhaserSailEnv}'s contructor to use the P2 physics engine from Phaser.
 * @constant
 * @type Number
 */
LBSailSim.PhaserSailEnv.P2_PHYSICS = 0;

/**
 * Value to pass to {@link LBSailSim.PhaserSailEnv}'s contructor to use the Cannon JS physics engine.
 * @constant
 * @type Number
 */
LBSailSim.PhaserSailEnv.CANNON_PHYSICS = 1;

LBSailSim.PhaserSailEnv.prototype = Object.create(LBSailSim.Env.prototype);
LBSailSim.PhaserSailEnv.prototype.constructor = LBSailSim.PhaserSailEnv;


LBSailSim.PhaserSailEnv.prototype._boatCheckedOut = function(boat, data) {
    this.physicsLink.addRigidBody(boat, data);
    LBSailSim.Env.prototype._boatCheckedOut.call(this, boat, data);
};

LBSailSim.PhaserSailEnv.prototype._boatReturned = function(boat) {
    LBSailSim.Env.prototype._boatReturned.call(this, boat);
    this.physicsLink.removeRigidBody(boat);
};

/**
 * Call after physics have been updated to updated the display objects.
 * @returns {undefined}
 */
LBSailSim.PhaserSailEnv.prototype.preRender = function() {
    this.physicsLink.updateDisplayObjects();
};

/**
 * The main simulation update method, call from the {@link Phaser.State}'s update() method.
 * @returns {undefined}
 */
LBSailSim.PhaserSailEnv.prototype.update = function() {
    var dt = this.physicsLink.timeStep();
    LBSailSim.Env.prototype.update.call(this, dt);
    
    this.physicsLink.update(dt);
};
