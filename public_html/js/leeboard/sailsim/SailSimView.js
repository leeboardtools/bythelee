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


/* global LBSailSim, LBPhaser */

/**
 * Base class for the sailsim Phaser views.
 * @param {LBSailSim.Env} sailEnv   The sailing environment.
 * @param {Phaser.Group} worldGroup The parent group for all display objects.
 * @returns {LBSailSim.PhaserView}
 */
LBSailSim.PhaserView = function(sailEnv, worldGroup) {
    LBPhaser.PhysicsView.call(this, sailEnv.physicsLink, worldGroup);
    
    this.sailEnv = sailEnv;    
    
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
    
    this.sailEnv.addBoatCallback(this);
    
    this.sailEnv.physicsLink.addView(this);

};

LBSailSim.PhaserView.prototype = Object.create(LBPhaser.PhysicsView.prototype);
LBSailSim.PhaserView.prototype.constructor = LBSailSim.PhaserView;

/**
 * Changes whether or not the force arrows are displayed.
 * @param {Boolean} isVisible   If true the force arrows are displayed, otherwise they are hidden.
 * @returns {Boolean}   True if the force arrows were visible prior to this call.
 */
LBSailSim.PhaserView.prototype.setForceArrowsVisible = function(isVisible) {
    var wasVisible = this.areForceArrowsVisible();
    this.sailArrowStyle.isVisible = isVisible;
    this.foilArrowStyle.isVisible = isVisible;
    this.hullArrowStyle.isVisible = isVisible;
    return wasVisible;
};

/**
 * @returns {Boolean}   True if the force arrows are currently displayed.
 */
LBSailSim.PhaserView.prototype.areForceArrowsVisible = function() {
    return this.sailArrowStyle.isVisible;
};

/**
 * Changes whether or not the velocity arrows are displayed.
 * @param {Boolean} isVisible   If true the velocity arrows are displayed, otherwise they are hidden.
 * @returns {Boolean}   True if the velocity arrows were visible prior to this call.
 */
LBSailSim.PhaserView.prototype.setVelocityArrowsVisible = function(isVisible) {
    var wasVisible = this.areVelocityArrowsVisible();
    this.boatVelocityArrowStyle.isVisible = isVisible;
    this.appWindVelocityArrowStyle.isVisible = isVisible;
    return wasVisible;
};

/**
 * @returns {Boolean}   True if the velocity arrows are currently displayed.
 */
LBSailSim.PhaserView.prototype.areVelocityArrowsVisible = function() {
    return this.boatVelocityArrowStyle.isVisible;
};

/**
 * Called from {@link LBSailSim.SailEnv#checkoutBoat} after the boat has been loaded
 * and just before it is returned to the caller, this is where we add display objects
 * for this view.
 * @param {LBSailSim.Vessel} boat   The boat that's been checked out.
 * @param {Object} data The data object from which the boat was loaded.
 * @returns {undefined}
 */
LBSailSim.PhaserView.prototype.onBoatCheckedOut = function(boat, data) {    
    // The hull is at the bottom...
    this._loadDisplayObjectForHull(boat);
    
    // Add the hydrofoils...
    boat.hydroFoils.forEach(this._loadDisplayObjectForHydrofoil, this);
    
    // Add the airfoils...
    boat.airfoils.forEach(this._loadDisplayObjectForAirfoil, this);

    // Add the arrows...
    this._loadForceArrowHull(boat);
    boat.hydroFoils.forEach(this._loadForceArrowHydrofoil, this);
    boat.airfoils.forEach(this._loadForceArrowAirfoil, this);
};

/**
 * Called by {@link LBSailSim.PhaserView#onBoatCheckedOut} to handle loading the display
 * objects for the hull.
 * @param {LBSailSim.Vessel} boat   The boat to load for.
 * @returns {undefined}
 */
LBSailSim.PhaserView.prototype._loadDisplayObjectForHull = function(boat) {
};

/**
 * Called by {@link LBSailSim.PhaserView#onBoatCheckedOut} to handle loading the display
 * objects for a hydrofoil.
 * @param {LBSailSim.FoilInstance} rigidBody    The hydrofoil to load for.
 * @returns {undefined}
 */
LBSailSim.PhaserView.prototype._loadDisplayObjectForHydrofoil = function(rigidBody) {
};

/**
 * Called by {@link LBSailSim.PhaserView#onBoatCheckedOut} to handle loading the display
 * objects for an airfoil.
 * @param {LBSailSim.FoilInstance} rigidBody    The airfoil to load for.
 * @returns {undefined}
 */
LBSailSim.PhaserView.prototype._loadDisplayObjectForAirfoil = function(rigidBody) {
};

/**
 * Called by {@link LBSailSim.PhaserView#onBoatCheckedOut} to add the force arrow
 * for the hull.
 * @param {LBSailSim.Vessel} boat   The boat.
 * @returns {undefined}
 */
LBSailSim.PhaserView.prototype._loadForceArrowHull = function(boat) {
    var hullArrow = new LBPhaser.Arrow(this.sailEnv.phaserEnv, this.worldGroup, this.hullArrowStyle);
    this.setBodyForceArrow(boat, hullArrow);

    boat.getForceArrowResultant = function(plane, bounds, secondaryPlane) {
        return boat.hullResultant.convertToWrench(plane, bounds, secondaryPlane);
    };

};

/**
 * Called by {@link LBSailSim.PhaserView#onBoatCheckedOut} to add the force arrow
 * for a hydrofoil.
 * @param {LBSailSim.FoilInstance} rigidBody    The hydrofoil.
 * @returns {undefined}
 */
LBSailSim.PhaserView.prototype._loadForceArrowHydrofoil = function(rigidBody) {
    var arrowStyle = this.foilArrowStyle;
    var arrow = new LBPhaser.Arrow(this.sailEnv.phaserEnv, this.worldGroup, arrowStyle);    
    this.setBodyForceArrow(rigidBody, arrow);
};

/**
 * Called by {@link LBSailSim.PhaserView#onBoatCheckedOut} to add the force arrow
 * for an airfoil.
 * @param {LBSailSim.FoilInstance} rigidBody    The airfoil.
 * @returns {undefined}
 */
LBSailSim.PhaserView.prototype._loadForceArrowAirfoil = function(rigidBody) {
    var arrow = new LBPhaser.Arrow(this.sailEnv.phaserEnv, this.worldGroup, this.sailArrowStyle);    
    this.setBodyForceArrow(rigidBody, arrow);    
};

/**
 * Called from {@link LBSailSim.SailEnv#boatReturned}, this disposes of any display
 * objects that were created for the boat.
 * @param {LBSailSim.Vessel} boat   The boat that was returned..
 * @returns {undefined}
 */
LBSailSim.PhaserView.prototype.onBoatReturned = function(boat) {
    var sprite = this.getRigidBodyDisplayObject(boat);
    if (sprite) {
        this.worldGroup.removeChild(sprite);
        sprite.destroy();
    }
    
    // TODO:
    // Handle all the parts of the boat...
};

LBSailSim.PhaserView.prototype._loadObj3DSprite = function(object, data) {
    if (!object || !object.obj3D || !data) {
        return undefined;
    }

    var sprite;
    var spriteData;
    var game = this.physicsLink.phaserEnv.game;
    if (data.phaser_sprite) {
        sprite = LBPhaser.PhysicsView.createSpriteFromData(game, data.phaser_sprite);
        spriteData = data.phaser_sprite;
    }
    else if (data.phaser_image) {
        sprite = LBPhaser.PhysicsView.createImageFromData(game, data.phaser_image);
        spriteData = data.phaser_image;
    }
    if (!sprite) {
        return undefined;
    }

    this.setRigidBodyDisplayObject(object, sprite);
    if (this.worldGroup) {
        this.worldGroup.add(sprite);
    }
    return sprite;
};

/**
 * Rigid body callback function assigned using {@link LBPhaser.PhysicsView#setBodyCallback}
 * and called after the rigid body display objects have been updated, this is where we handle
 * flipping the sail.
 * @param {LBPhysics.RigidBody} topRigidBody    The top-level rigid body.
 * @param {LBPhysics.RigidBody} rigidBody   The rigid body with the callback assigned to it.
 * @returns {undefined}
 */
LBSailSim.PhaserView.prototype.onDisplayObjectsUpdated = function(topRigidBody, rigidBody) {
    var sprite = this.getRigidBodyDisplayObject(rigidBody);
    if (sprite) {
        if (rigidBody.foilDetails) {
            sprite.scale.y = (rigidBody.foilDetails.angleDeg * this.sailEnv.phaserEnv.ySign < 0) ? 1 : -1;
        }
    }
    
    if (rigidBody._lbCannonBoat) {
        rigidBody._lbCannonBoat.update();
    }
};

/**
 * Call when done with the view, this removes references to other objects,
 * hoping this will eventually get garbage collected.
 * @returns {undefined}
 */
LBSailSim.PhaserView.prototype.destroy = function() {
    if (this.sailEnv) {
        this.worldGroup = null;

        this.sailEnv.removeBoatCallback(this);
        this.sailEnv = null;
    }
    
    LBPhaser.PhysicsView.protoype.destroy.call(this);
};


/**
 * Sailing simulator 2D Phaser view, uses sprites.
 * @param {LBSailSim.Env} sailEnv   The sailing environment.
 * @param {Phaser.Group} worldGroup The parent group for all display objects.
 * @returns {LBSailSim.Phaser2DView}
 */
LBSailSim.Phaser2DView = function(sailEnv, worldGroup) {
    LBSailSim.PhaserView.call(this, sailEnv, worldGroup);
};

LBSailSim.Phaser2DView.prototype = Object.create(LBSailSim.PhaserView.prototype);
LBSailSim.Phaser2DView.prototype.constructor = LBSailSim.Phaser2DView;


LBSailSim.Phaser2DView.prototype._loadDisplayObjectForHull = function(boat) {
    if (LBPhaser.P2Link.getP2Body(boat)) {
        // The sprite is already loaded...
        return;
    }
    
    var data = boat.loadData;
    if (data && data.phaser) {
        var game = this.sailEnv.phaserEnv.game;
        var sprite = LBPhaser.PhysicsView.createSpriteFromData(game, data.phaser.sprite);
        this.setRigidBodyDisplayObject(boat, sprite);
        this.worldGroup.add(sprite);
    }
};

LBSailSim.Phaser2DView.prototype._loadDisplayObjectForHydrofoil = function(rigidBody) {
    this._loadObj3DSprite(rigidBody, rigidBody.loadData);
};

LBSailSim.Phaser2DView.prototype._loadDisplayObjectForAirfoil = function(rigidBody) {
    var sprite = this._loadObj3DSprite(rigidBody, rigidBody.loadData);
    
    if (sprite) {
        // Need a sail flipper...
        this.setBodyCallback(rigidBody, this);
    }
};


/**
 * Sailing simulator 3D Phaser view, uses a {@link LBPhaser.Project3D} to handle the
 * projection into 2D.
 * @param {LBSailSim.Env} sailEnv   The sailing environment.
 * @param {Phaser.Group} worldGroup The parent group for all display objects.
 * @returns {LBSailSim.Phaser2DView}
 */
LBSailSim.Phaser3DView = function(sailEnv, worldGroup) {
    LBSailSim.PhaserView.call(this, sailEnv, worldGroup);
};

LBSailSim.Phaser3DView.prototype = Object.create(LBSailSim.PhaserView.prototype);
LBSailSim.Phaser3DView.prototype.constructor = LBSailSim.Phaser3DView;


LBSailSim.Phaser3DView.prototype._loadDisplayObjectForHull = function(boat) {
    var data = boat.loadData;
    if (data && data.phaser) {
        var game = this.sailEnv.phaserEnv.game;
        var sprite = LBPhaser.PhysicsView.createSpriteFromData(game, data.phaser.sprite);
        this.setRigidBodyDisplayObject(boat, sprite);
        this.worldGroup.add(sprite);
    }
};

LBSailSim.Phaser3DView.prototype._loadDisplayObjectForHydrofoil = function(rigidBody) {
    this._loadObj3DSprite(rigidBody, rigidBody.loadData);
};

LBSailSim.Phaser3DView.prototype._loadDisplayObjectForAirfoil = function(rigidBody) {
    var sprite = this._loadObj3DSprite(rigidBody, rigidBody.loadData);
    
    if (sprite) {
        // Need a sail flipper...
        this.setBodyCallback(rigidBody, this);
    }
};


/*
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
*/
