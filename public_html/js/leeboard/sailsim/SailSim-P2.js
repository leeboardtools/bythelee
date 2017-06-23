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


/* global LBSailSim, Leeboard, LBMath */

/**
 * An implementation of {@link LBSailSim.Env} for use with {@link Phaser.Physics.P2}.
 * @constructor
 * @param {Phaser.Game} game    The Phaser game object.
 * @returns {LBSailSim.P2Env}
 */
LBSailSim.P2Env = function(game) {
    LBSailSim.Env.call(this);
    this.game = game;
    
    this.p2Link = new Leeboard.P2Link(game);
};

LBSailSim.P2Env.prototype = Object.create(LBSailSim.Env.prototype);
LBSailSim.P2Env.prototype.constructor = LBSailSim.P2Env;

LBSailSim.P2Env.prototype.setWorldGroup = function(worldGroup) {
    this.worldGroup = worldGroup;
    this.p2Link.worldGroup = worldGroup;
};

LBSailSim.P2Env.prototype.checkoutBoat = function(typeName, boatName, centerX, centerY, rotation) {
    var childIndex = this.worldGroup.children.length;
    
    var boat = LBSailSim.Env.prototype.checkoutBoat.call(this, typeName, boatName);
    var p2Body = boat[Leeboard.P2Link.p2BodyProperty];
    p2Body.x = centerX;
    p2Body.y = centerY;
    p2Body.rotation = -10 * LBMath.DEG_TO_RAD;
    
    this.worldGroup.addAt(p2Body.sprite, childIndex);
    return boat;
};

LBSailSim.P2Env.prototype._createBoatInstance = function(typeName, boatName, data) {
    var boat = LBSailSim.Env.prototype._createBoatInstance.call(this, typeName, boatName, data, this);
    
    // Tack on a P2 body...
    var p2Body = Leeboard.P2Link.createP2BodyFromData(this.game, data.p2Body);
    boat[Leeboard.P2Link.p2BodyProperty] = p2Body;
    p2Body.damping = 0;
    p2Body.mass = boat.getTotalMass();
    
    return boat;
};

LBSailSim.P2Env.prototype.foilInstanceLoaded = function(vessel, foilInstance, data, isSail) {
    this._loadObj3DSprite(vessel, foilInstance, data);
    
    var arrowColor = (isSail) ? 0x00FF00 : 0xFF0000;
    var arrow = new Leeboard.P2ForceArrow(this.p2Link, arrowColor);
    foilInstance[Leeboard.P2Link.forceArrowProperty] = arrow;
};

LBSailSim.P2Env.prototype._loadObj3DSprite = function(vessel, object, data) {
    if (!object || !object.obj3D || !data) {
        return undefined;
    }
    
    var sprite;
    var spriteData;
    if (data.phaser_sprite) {
        sprite = Leeboard.P2Link.createSpriteFromData(this.game, data.phaser_sprite);
        spriteData = data.phaser_sprite;
    }
    else if (data.phaser_image) {
        sprite = Leeboard.P2Link.createImageFromData(this.game, data.phaser_image);
        spriteData = data.phaser_image;
    }
    if (!sprite) {
        return undefined;
    }
    
    object[Leeboard.P2Link.spriteProperty] = sprite;
    if (this.worldGroup) {
        this.worldGroup.add(sprite);
    }
    return sprite;
};

LBSailSim.P2Env.prototype._boatCheckedOut = function(boat) {
    this.p2Link.addRigidBody(boat);
};

LBSailSim.P2Env.prototype._boatReturned = function(boat) {
    this.p2Link.removeRigidBody(boat);
};

/**
 * The main simulation update method, call from the {@Phaser.State}'s update() method.
 * @returns {undefined}
 */
LBSailSim.P2Env.prototype.update = function() {
    var dt = Leeboard.P2Link.getP2TimeStep(this.game.physics.p2);
    
    LBSailSim.Env.prototype.update.call(this, dt);
    this.p2Link.updateFromP2();
    this.p2Link.applyToP2(dt);
};

