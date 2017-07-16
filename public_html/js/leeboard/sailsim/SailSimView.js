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

LBSailSim.Phaser2DView = function(sailEnv, worldGroup) {
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
    
/*    
    // TEST!!!
    var camera = new LBCamera.OrthographicCamera(-100, 100, 100, -100, 1, 1000);
    camera = new LBCamera.PerspectiveCamera();
    camera.position.x = 100;
    camera.position.y = 50;
    camera.position.z = 100;
    camera.updateMatrixWorld(true);
    
    var lookAt = new LBGeometry.Vector3(camera.position.x, camera.position.y, -100);
    camera.lookAt(lookAt);
    
    var pos = [
        new LBGeometry.Vector3(101, 51, -1),
        new LBGeometry.Vector3(101, 49, -1),
        new LBGeometry.Vector3(99, 49, -1),
        new LBGeometry.Vector3(99, 51, -1),
        new LBGeometry.Vector3(101, 51, 1),
        new LBGeometry.Vector3(101, 49, 1),
        new LBGeometry.Vector3(99, 49, 1),
        new LBGeometry.Vector3(99, 51, 1)
    ];
    
    var matrix = camera.matrixWorld.clone();
    matrix.getInverse(camera.matrixWorld);
    var mat2 = matrix;
    matrix = camera.projectionMatrix.clone();
    matrix.multiply(mat2);
    
    var pos2 = new LBGeometry.Vector3();
    for (var i = 0; i < pos.length; ++i) {
        pos2.copy(pos[i]);
        pos2.applyMatrix4(matrix);
        console.log(pos[i].x + "\t" + pos[i].y + "\t" + pos[i].z + "\t\t" + pos2.x + "\t" + pos2.y + "\t" + pos2.z);
    }
    
    camera = new LBCamera.PerspectiveCamera();
    camera.lookAt(lookAt);
*/
};

LBSailSim.Phaser2DView.prototype = Object.create(LBPhaser.PhysicsView.prototype);
LBSailSim.Phaser2DView.prototype.constructor = LBSailSim.Phaser2DView;

/**
 * Changes whether or not the force arrows are displayed.
 * @param {Boolean} isVisible   If true the force arrows are displayed, otherwise they are hidden.
 * @returns {Boolean}   True if the force arrows were visible prior to this call.
 */
LBSailSim.Phaser2DView.prototype.setForceArrowsVisible = function(isVisible) {
    var wasVisible = this.areForceArrowsVisible();
    this.sailArrowStyle.isVisible = isVisible;
    this.foilArrowStyle.isVisible = isVisible;
    this.hullArrowStyle.isVisible = isVisible;
    return wasVisible;
};

/**
 * @returns {Boolean}   True if the force arrows are currently displayed.
 */
LBSailSim.Phaser2DView.prototype.areForceArrowsVisible = function() {
    return this.sailArrowStyle.isVisible;
};

/**
 * Changes whether or not the velocity arrows are displayed.
 * @param {Boolean} isVisible   If true the velocity arrows are displayed, otherwise they are hidden.
 * @returns {Boolean}   True if the velocity arrows were visible prior to this call.
 */
LBSailSim.Phaser2DView.prototype.setVelocityArrowsVisible = function(isVisible) {
    var wasVisible = this.areVelocityArrowsVisible();
    this.boatVelocityArrowStyle.isVisible = isVisible;
    this.appWindVelocityArrowStyle.isVisible = isVisible;
    return wasVisible;
};

/**
 * @returns {Boolean}   True if the velocity arrows are currently displayed.
 */
LBSailSim.Phaser2DView.prototype.areVelocityArrowsVisible = function() {
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
LBSailSim.Phaser2DView.prototype.onBoatCheckedOut = function(boat, data) {    
    // The hull is at the bottom...
    var game = this.sailEnv.phaserEnv.game;
    if (data && data.phaser) {
        var sprite = LBPhaser.PhysicsView.createSpriteFromData(game, data.phaser.sprite);
        this.setRigidBodyDisplayObject(boat, sprite);
        this.worldGroup.add(sprite);
    }
    
    // Add the hydrofoils...
    this._isSail = false;
    boat.hydroFoils.forEach(this._loadDisplayObjectForRigidBody, this);
    
    // Add the airfoils...
    this._isSail = true;
    boat.airfoils.forEach(this._loadDisplayObjectForRigidBody, this);

    // TEST!!!
/*        var cannonBoat = new LBSailSim.CannonBoat(this.sailEnv, boat);
    this.worldGroup.add(cannonBoat.graphics);
*/        

    boat.getForceArrowResultant = function(plane, bounds, secondaryPlane) {
        return boat.hullResultant.convertToWrench(plane, bounds, secondaryPlane);
    };

    // Add the arrows...
    var hullArrow = new LBPhaser.Arrow(this.sailEnv.phaserEnv, this.worldGroup, this.hullArrowStyle);
    this.setBodyForceArrow(boat, hullArrow);

};

LBSailSim.Phaser2DView.prototype._loadDisplayObjectForRigidBody = function(rigidBody) {
    var sprite = this._loadObj3DSprite(rigidBody, rigidBody.loadData);
    
    var arrowStyle = (this._isSail) ? this.sailArrowStyle : this.foilArrowStyle;
    var arrow = new LBPhaser.Arrow(this.sailEnv.phaserEnv, this.worldGroup, arrowStyle);    
    this.setBodyForceArrow(rigidBody, arrow);
    
    if (this._isSail && sprite) {
        // Need a sail flipper...
        this.setBodyCallback(rigidBody, this);
    }
};

/**
 * Called from {@link LBSailSim.SailEnv#boatReturned}, this disposes of any display
 * objects that were created for the boat.
 * @param {LBSailSim.Vessel} boat   The boat that was returned..
 * @returns {undefined}
 */
LBSailSim.Phaser2DView.prototype.onBoatReturned = function(boat) {
    var sprite = this.getRigidBodyDisplayObject(boat);
    if (sprite) {
        this.worldGroup.removeChild(sprite);
        sprite.destroy();
    }
    
    // TODO:
    // Handle all the parts of the boat...
};

LBSailSim.Phaser2DView.prototype._loadObj3DSprite = function(object, data) {
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
LBSailSim.Phaser2DView.prototype.onDisplayObjectsUpdated = function(topRigidBody, rigidBody) {
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
LBSailSim.Phaser2DView.prototype.destroy = function() {
    if (this.sailEnv) {
        this.worldGroup = null;

        this.sailEnv.removeBoatCallback(this);
        this.sailEnv = null;
    }
    
    LBPhaser.PhysicsView.protoype.destroy.call(this);
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

