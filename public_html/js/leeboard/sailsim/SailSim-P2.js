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


/* global LBSailSim, Leeboard */

/**
 * An implementation of {@link LBSailSim.Env} for use with {@link Phaser.Physics.P2}.
 * @constructor
 * @param {Phaser.Game} game    The Phaser game object.
 * @returns {LBSailSim.P2Env}
 */
LBSailSim.P2Env = function(game) {
    LBSailSim.Env.call(this);
    this.game = game;
    
    this.p2Link = new Leeboard.P2Link();
};

LBSailSim.P2Env.prototype = Object.create(LBSailSim.Env.prototype);
LBSailSim.P2Env.prototype.constructor = LBSailSim.P2Env;

LBSailSim.P2Env._createBoatInstance = function(typeName, boatName, data) {
    var boat = LBSailSim.Env.prototype._createBoatInstance(typeName, boatName, data);
    
    // Tack on a P2 body...
    boat.p2Body = Leeboard.P2Link.createP2BodyFromData(data.p2Body, this.game);
    
    return boat;
};

LBSailSim.P2Env._boatCheckedOut = function(boat) {
    this.p2Link.addLinkedObjects(boat.p2Body, boat);
};

LBSailSim.P2Env._boatReturned = function(boat) {
    this.p2Link.removeLinkByRigidBody(boat);
};


