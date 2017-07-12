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

/**
 * Sets the world group to which all the sailing environment graphic objects will
 * belong.
 * @param {Phaser.Group} worldGroup The world group.
 * @returns {undefined}
 */
LBSailSim.PhaserSailEnv.prototype.setWorldGroup = function(worldGroup) {
    this.worldGroup = worldGroup;
    this.physicsLink.worldGroup = worldGroup;
};

/**
 * Changes whether or not the force arrows are displayed.
 * @param {Boolean} isVisible   If true the force arrows are displayed, otherwise they are hidden.
 * @returns {Boolean}   True if the force arrows were visible prior to this call.
 */
LBSailSim.PhaserSailEnv.prototype.setForceArrowsVisible = function(isVisible) {
    var wasVisible = this.areForceArrowsVisible();
    this.sailArrowStyle.isVisible = isVisible;
    this.foilArrowStyle.isVisible = isVisible;
    this.hullArrowStyle.isVisible = isVisible;
    return wasVisible;
};

/**
 * @returns {Boolean}   True if the force arrows are currently displayed.
 */
LBSailSim.PhaserSailEnv.prototype.areForceArrowsVisible = function() {
    return this.sailArrowStyle.isVisible;
};

/**
 * Changes whether or not the velocity arrows are displayed.
 * @param {Boolean} isVisible   If true the velocity arrows are displayed, otherwise they are hidden.
 * @returns {Boolean}   True if the velocity arrows were visible prior to this call.
 */
LBSailSim.PhaserSailEnv.prototype.setVelocityArrowsVisible = function(isVisible) {
    var wasVisible = this.areVelocityArrowsVisible();
    this.boatVelocityArrowStyle.isVisible = isVisible;
    this.appWindVelocityArrowStyle.isVisible = isVisible;
    return wasVisible;
};

/**
 * @returns {Boolean}   True if the velocity arrows are currently displayed.
 */
LBSailSim.PhaserSailEnv.prototype.areVelocityArrowsVisible = function() {
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
LBSailSim.PhaserSailEnv.prototype.checkoutBoat = function(typeName, boatName, centerX, centerY, rotDeg) {
    var childIndex = this.worldGroup.children.length;
    
    var boat = LBSailSim.Env.prototype.checkoutBoat.call(this, typeName, boatName, centerX, centerY, rotDeg);
    if (!boat) {
        return boat;
    }

    var sprite = this.physicsLink.getRigidBodyDisplayObject(boat);
    if (sprite) {
        this.worldGroup.addAt(sprite, childIndex);
    }
    
    // TEST!!!
    var cannonBoat = new LBSailSim.CannonBoat(this, boat);
    this.worldGroup.add(cannonBoat.graphics);
    this.physicsLink.setBodyCallback(boat, this);
    
    return boat;
};

LBSailSim.PhaserSailEnv.prototype._createBoatInstance = function(typeName, boatName, data) {
    var boat = LBSailSim.Env.prototype._createBoatInstance.call(this, typeName, boatName, data, this);
    
    boat.getForceArrowResultant = function(plane, bounds) {
        return boat.hullResultant.convertToWrench(plane);
    };
    
    var hullArrow = new LBPhaser.Arrow(this.phaserEnv, this.worldGroup, this.hullArrowStyle);
    this.physicsLink.setBodyForceArrow(boat, hullArrow);
    
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
LBSailSim.PhaserSailEnv.prototype.foilInstanceLoaded = function(vessel, foilInstance, data, isSail) {
    var sprite = this._loadObj3DSprite(vessel, foilInstance, data);
    
    var arrowStyle = (isSail) ? this.sailArrowStyle : this.foilArrowStyle;
    var arrow = new LBPhaser.Arrow(this.phaserEnv, this.worldGroup, arrowStyle);    
    this.physicsLink.setBodyForceArrow(foilInstance, arrow);
    
    if (isSail && sprite) {
        // Need a sail flipper...
        this.physicsLink.setBodyCallback(foilInstance, this);
    }
};

LBSailSim.PhaserSailEnv.prototype.displayObjectsUpdated = function(topRigidBody, rigidBody) {
    var sprite = this.physicsLink.getRigidBodyDisplayObject(rigidBody);
    if (sprite) {
        if (rigidBody.foilDetails) {
            sprite.scale.y = (rigidBody.foilDetails.angleDeg * this.phaserEnv.ySign < 0) ? 1 : -1;
        }
    }
    
    if (rigidBody._lbCannonBoat) {
        rigidBody._lbCannonBoat.update();
    }
};

LBSailSim.PhaserSailEnv.prototype._loadObj3DSprite = function(vessel, object, data) {
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
    
    this.physicsLink.setRigidBodyDisplayObject(object, sprite);
    if (this.worldGroup) {
        this.worldGroup.add(sprite);
    }
    return sprite;
};

LBSailSim.PhaserSailEnv.prototype._boatCheckedOut = function(boat, data) {
    this.physicsLink.addRigidBody(boat, data);
};

LBSailSim.PhaserSailEnv.prototype._boatReturned = function(boat) {
    this.physicsLink.removeRigidBody(boat);
};

/**
 * The main simulation update method, call from the {@Phaser.State}'s update() method.
 * @returns {undefined}
 */
LBSailSim.PhaserSailEnv.prototype.update = function() {
    var dt = this.physicsLink.timeStep();
    LBSailSim.Env.prototype.update.call(this, dt);
    
    this.physicsLink.update(dt);
};

LBSailSim.CannonBoat = function(phaserEnv, boat) {
    this.phaserSailEnv = phaserEnv;
    this.boat = boat;
    this.graphics = phaserEnv.game.add.graphics();
    boat._lbCannonBoat = this;
};

LBSailSim.CannonBoat.prototype = {
    update: function() {
        var g = this.graphics;
        var phaserEnv = this.phaserSailEnv.phaserEnv;
        var body = LBPhaser.CannonLink.getCannonBody(this.boat);
        this.phaserSailEnv.physicsLink.updateSpriteFromRigidBody(this.boat, g);
        
        g.clear();
        
        g.lineStyle(1, 0x00FF00);
        
        for (var s = 0; s < body.shapes.length; ++s) {
            var shape = body.shapes[s];
            var sx = body.shapeOffsets[s].x + this.boat.centerOfMass.x;
            var sy = body.shapeOffsets[s].y + this.boat.centerOfMass.y;
            for (var f = 0; f < shape.faces.length; ++f) {
                var face = shape.faces[f];
                var v = shape.vertices[face[0]];
                g.moveTo(phaserEnv.toPixelsX(v.x + sx), phaserEnv.toPixelsY(v.y + sy));
                for (var v = 1; v < face.length; ++v) {
                    var v = shape.vertices[face[v]];
                    g.lineTo(phaserEnv.toPixelsX(v.x + sx), phaserEnv.toPixelsY(v.y + sy));
                }
            }
        }
    },
    
    constructor: LBSailSim.CannonBoat
};