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


/* global LBSailSim, Leeboard, LBMath, LBPhaser */


/**
 * An implementation of {@link LBSailSim.Env} for use with {@link Phaser.Physics.P2}.
 * @constructor
 * @param {Phaser.Game} game    The Phaser game object.
 * @returns {LBSailSim.PhaserEnv}
 */
LBSailSim.PhaserEnv = function(game) {
    LBSailSim.Env.call(this);
    this.game = game;
    this.phaserEnv = new LBPhaser.Env(game);
    
    // Less confusing for the math if the y axis is pointing up.
    this.phaserEnv.ySign = -1;
    
    this.physicsLink = new LBPhaser.P2Link(this.phaserEnv);
    
    var forceArrowScaler = function(length) {
        return 0.025 * length;
    };
    this.sailArrowStyle = new LBPhaser.ArrowStyle(0x00FF00, forceArrowScaler);
    this.foilArrowStyle = new LBPhaser.ArrowStyle(0x0088FF, forceArrowScaler);
    this.hullArrowStyle = new LBPhaser.ArrowStyle(0xFF0000, forceArrowScaler);
    
    var velocityArrowScaler = function(length) {
        return length * 1.2;
    };
    this.boatVelocityArrowStyle = new LBPhaser.ArrowStyle(0x008888, velocityArrowScaler, 0.5, 6);
    this.appWindVelocityArrowStyle = new LBPhaser.ArrowStyle(0x008800, velocityArrowScaler, 0.5, 12);
};

LBSailSim.PhaserEnv.prototype = Object.create(LBSailSim.Env.prototype);
LBSailSim.PhaserEnv.prototype.constructor = LBSailSim.PhaserEnv;

/**
 * Sets the world group to which all the sailing environment graphic objects will
 * belong.
 * @param {Phaser.Group} worldGroup The world group.
 * @returns {undefined}
 */
LBSailSim.PhaserEnv.prototype.setWorldGroup = function(worldGroup) {
    this.worldGroup = worldGroup;
    this.physicsLink.worldGroup = worldGroup;
};

/**
 * Changes whether or not the force arrows are displayed.
 * @param {Boolean} isVisible   If true the force arrows are displayed, otherwise they are hidden.
 * @returns {Boolean}   True if the force arrows were visible prior to this call.
 */
LBSailSim.PhaserEnv.prototype.setForceArrowsVisible = function(isVisible) {
    var wasVisible = this.areForceArrowsVisible();
    this.sailArrowStyle.isVisible = isVisible;
    this.foilArrowStyle.isVisible = isVisible;
    this.hullArrowStyle.isVisible = isVisible;
    return wasVisible;
};

/**
 * @returns {Boolean}   True if the force arrows are currently displayed.
 */
LBSailSim.PhaserEnv.prototype.areForceArrowsVisible = function() {
    return this.sailArrowStyle.isVisible;
};

/**
 * Changes whether or not the velocity arrows are displayed.
 * @param {Boolean} isVisible   If true the velocity arrows are displayed, otherwise they are hidden.
 * @returns {Boolean}   True if the velocity arrows were visible prior to this call.
 */
LBSailSim.PhaserEnv.prototype.setVelocityArrowsVisible = function(isVisible) {
    var wasVisible = this.areVelocityArrowsVisible();
    this.boatVelocityArrowStyle.isVisible = isVisible;
    this.appWindVelocityArrowStyle.isVisible = isVisible;
    return wasVisible;
};

/**
 * @returns {Boolean}   True if the velocity arrows are currently displayed.
 */
LBSailSim.PhaserEnv.prototype.areVelocityArrowsVisible = function() {
    return this.boatVelocityArrowStyle.isVisible;
};

/**
 * @inheritdoc
 * @param {type} typeName
 * @param {type} boatName
 * @param {type} centerX
 * @param {type} centerY
 * @param {type} rotDeg
 * @returns {LBSailSim.Vessel}
 */
LBSailSim.PhaserEnv.prototype.checkoutBoat = function(typeName, boatName, centerX, centerY, rotDeg) {
    var childIndex = this.worldGroup.children.length;
    
    var boat = LBSailSim.Env.prototype.checkoutBoat.call(this, typeName, boatName);
    var p2Body = boat[LBPhaser.P2Link.p2BodyProperty];
    p2Body.x = centerX;
    p2Body.y = centerY;
    p2Body.rotation = rotDeg * LBMath.DEG_TO_RAD;
    
    this.worldGroup.addAt(p2Body.sprite, childIndex);
    return boat;
};

LBSailSim.PhaserEnv.prototype._createBoatInstance = function(typeName, boatName, data) {
    var boat = LBSailSim.Env.prototype._createBoatInstance.call(this, typeName, boatName, data, this);
    
    this.physicsLink.addDynamicObject(boat, data);
    
    boat.getForceArrowResultant = function(plane, bounds) {
        return boat.hullResultant.convertToWrench(plane);
    };
    
    var hullArrow = new LBPhaser.Arrow(this.phaserEnv, this.worldGroup, this.hullArrowStyle);
    boat[LBPhaser.PhysicsLink.forceArrowProperty] = hullArrow;
    
    return boat;
};

/**
 * Called after a foil instance has been loaded by {@link LBSailSim.Vessel#_loadFoils}, this
 * is where we attach the force arrows and graphic objects. 
 * @param {LBSailSim.Vessel} vessel The vessel calling this.
 * @param {LBSailSim.FoilInstance} foilInstance The foil instance that was just loaded.
 * @param {object} data The data object the foil instance was loaded from.
 * @param {Boolean} isSail  True if the foil instance is an airfoil, false if hydrofoil.
 * @returns {undefined}
 */
LBSailSim.PhaserEnv.prototype.foilInstanceLoaded = function(vessel, foilInstance, data, isSail) {
    var sprite = this._loadObj3DSprite(vessel, foilInstance, data);
    
    var arrowStyle = (isSail) ? this.sailArrowStyle : this.foilArrowStyle;
    var arrow = new LBPhaser.Arrow(this.phaserEnv, this.worldGroup, arrowStyle);    
    foilInstance[LBPhaser.PhysicsLink.forceArrowProperty] = arrow;
    
    if (isSail && sprite) {
        // Need a sail flipper...
        foilInstance[LBPhaser.PhysicsLink.callbackProperty] = this;
    }
};

LBSailSim.PhaserEnv.prototype.displayObjectsUpdated = function(topRigidBody, rigidBody) {
    var sprite = rigidBody[LBPhaser.PhysicsLink.spriteProperty];
    if (sprite) {
        if (rigidBody.foilDetails) {
            sprite.scale.y = (rigidBody.foilDetails.angleDeg * this.phaserEnv.ySign < 0) ? 1 : -1;
        }
    }
};

LBSailSim.PhaserEnv.prototype._loadObj3DSprite = function(vessel, object, data) {
    if (!object || !object.obj3D || !data) {
        return undefined;
    }
    
    var sprite;
    var spriteData;
    if (data.phaser_sprite) {
        sprite = LBPhaser.PhysicsLink.createSpriteFromData(this.game, data.phaser_sprite);
        spriteData = data.phaser_sprite;
    }
    else if (data.phaser_image) {
        sprite = LBPhaser.PhysicsLink.createImageFromData(this.game, data.phaser_image);
        spriteData = data.phaser_image;
    }
    if (!sprite) {
        return undefined;
    }
    
    object[LBPhaser.PhysicsLink.spriteProperty] = sprite;
    if (this.worldGroup) {
        this.worldGroup.add(sprite);
    }
    return sprite;
};

LBSailSim.PhaserEnv.prototype._boatCheckedOut = function(boat) {
    this.physicsLink.addRigidBody(boat);
};

LBSailSim.PhaserEnv.prototype._boatReturned = function(boat) {
    this.physicsLink.removeRigidBody(boat);
};

/**
 * The main simulation update method, call from the {@Phaser.State}'s update() method.
 * @returns {undefined}
 */
LBSailSim.PhaserEnv.prototype.update = function() {
    var dt = this.physicsLink.timeStep();
    LBSailSim.Env.prototype.update.call(this, dt);
    
    this.physicsLink.update(dt);
};

