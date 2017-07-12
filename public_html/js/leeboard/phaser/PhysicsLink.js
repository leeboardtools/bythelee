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


/* global Leeboard, Phaser, LBPhysics, LBGeometry, LBMath, LBPhaser */

/**
 * Base class that manages linking a {@link LBPhysics.RigidBody} to a physics engine
 * for use with Phaser.
 * <p>
 * This also supports the display of force arrows (via {@link LBPhaser.Arrow} objects)
 * and updating sprites from their associated rigid bodies.
 * @constructor
 * @param {LBPhaser.Env} phaserEnv The Phaser environment we're running under.
 * @returns {LBPhaser.PhysicsLink}
 */
LBPhaser.PhysicsLink = function(phaserEnv) {
    this.phaserEnv = phaserEnv;
    this.game = phaserEnv.game;
    
    // We're overriding the stage's updateTransform() method so we can update the
    // sprites from the current obj3D positions of the rigid bodies. The postUpdate()
    // methods all seem to be internal, so I'm hooking into updateTransform() because
    // that's currently called right after the P2 bodies update the positions of their
    // sprites (which is done in {Phaser.Physics.P2.Body.postUpdate()}.
    this.savedUpdateTransform = this.game.stage.updateTransform;
    this.game.stage._physicsLink = this;
    this.game.stage.updateTransform = this._stageUpdateTransform;
    
    this.rigidBodies = [];
    
    this.updateCount = 0;
    this.stageUpdateCount = 0;
};

LBPhaser.PhysicsLink._working3DPos = new LBGeometry.Vector3();
LBPhaser.PhysicsLink._workingEuler;
LBPhaser.PhysicsLink._workingPlane = new LBGeometry.Plane();
LBPhaser.PhysicsLink._working3DNormal = new LBGeometry.Vector3();
LBPhaser.PhysicsLink._workingSphere = new LBGeometry.Sphere();

LBPhaser.PhysicsLink.prototype = {

    /**
     * Adds a fixed object to the physics link.
     * @param {Object} object   A Phaser drawing object.
     * @returns {LBPhaser.P2Link}   this.
     */
    addFixedObject: function(object) {
        throw 'addFixedObject not implemented';
    },
    
    /**
     * Adds a top-level {@link LBPhysics.RigidBody} to the manager. This rigid body
     * should not be a part of any other rigid body.
     * @param {LBPhysics.RigidBody} rigidBody The rigid body.
     * @param {Object}  [data]  Optional data containing additional information for
     * loading other items associated with the rigid body, such as a Phaser display object.
     * @returns {LBPhaser.PhysicsLink}   this.
     */
    addRigidBody: function(rigidBody, data) {
        this.rigidBodies.push(rigidBody);
        return this;
    },
    
    /**
     * Removes a rigid body from the manager.
     * @param {LBPhysics.RigidBody} rigidBody   The rigid body.
     * @returns {LBPhaser.PhysicsLink}   this.
     */
    removeRigidBody: function(rigidBody) {
        var index = this.rigidBodies.indexOf(rigidBody);
        if (index >= 0) {
            this.rigidBodies.splice(index, 1);
        }
        return this;
    },
    
    /**
     * Called by {@link LBPhaser.PhysicsLink#removeRigidBody} when a rigid body is going to be
     * removed.
     * @protected
     * @param {LBPhysics.RigidBody} rigidBody   The rigid body.
     * @returns {undefined}
     */
    _rigidBodyRemoved: function(rigidBody) {
        
    },
    
    /**
     * Retrieves the Phaser {@link https://photonstorm.github.io/phaser-ce/global.html#Phaser.DisplayObject|DisplayObject} 
     * associated with a rigid body.
     * @param {LBPhysics.RigidBody} rigidBody   The rigid body.
     * @returns {Phaser.Sprite} The display object associated with rigidBody, may be undefined.
     */
    getRigidBodyDisplayObject: function(rigidBody) {
        return rigidBody._lbDisplayObject;
    },
    
    /**
     * Associates a Phaser {@link https://photonstorm.github.io/phaser-ce/global.html#Phaser.DisplayObject|DisplayObject} 
     * with a rigid body. A rigid body can only have one display object associated with it.
     * @param {LBPhysics.RigidBody} rigidBody   The rigid body.
     * @param {Object} drawingObject    The drawing object to associate.
     * @returns {undefined}
     */
    setRigidBodyDisplayObject: function(rigidBody, drawingObject) {
        rigidBody._lbDisplayObject = drawingObject;
    },


    /**
     * Retrieves the force arrow associated with a rigid body.
     * @param {LBPhysics.RigidBody} rigidBody The rigid body.
     * @returns {LBPhaser.Arrow}    The force arrow, may be undefined.
     */
    getBodyForceArrow: function(rigidBody) {
        return rigidBody._lbForceArrow;
    },
    
    /**
     * Sets the force arrow associated with a rigid body.
     * @param {LBPhysics.RigidBody} rigidBody The rigid body.
     * @param {LBPhaser.Arrow} forceArrow   The force arrow.
     * @returns {undefined}
     */
    setBodyForceArrow: function(rigidBody, forceArrow) {
        rigidBody._lbForceArrow = forceArrow;
    },
    
    /**
     * Retrieves the callback object associated with a rigid body.
     * @param {LBPhysics.RigidBody} rigidBody The rigid body.
     * @returns {Object}    The callback object, may be undefined.
     */
    getBodyCallback: function(rigidBody) {
        return rigidBody._lbCallback;
    },
    
    /**
     * Sets the callback object associated with a rigid body. The callback has the
     * following optional functions:
     * <li>displayObjectsUpdated = function(topRigidBody, rigidBody);
     * @param {LBPhysics.RigidBody} rigidBody The rigid body.
     * @param {Object}  callback    The callback object.
     */
    setBodyCallback: function(rigidBody, callback) {
        rigidBody._lbCallback = callback;
    },
    
    /**
     * Our hook into {@link https://photonstorm.github.io/phaser-ce/Phaser.Stage#updateTransform|Phaser.Stage#updateTransform}.
     * @protected
     * @returns {undefined}
     */
    _stageUpdateTransform: function() {
        var me = this._physicsLink;
        me.savedUpdateTransform.call(this);
        
        me.updateDisplayObjects();
        ++this.stageUpdateCount;
    },
    
    /**
     * Updates any Phaser display object that have been attached to any of the rigid bodies or their
     * parts.
     * <p>
     * This is automatically called from {@link LBPhaser.PhysicsLink#_stageUpdateTransform}.
     * @returns {undefined}
     */
    updateDisplayObjects: function() {
        this.rigidBodies.forEach(this._topUpdateDisplayObjects, this);
    },

    _topUpdateDisplayObjects: function(rigidBody) {
        this.activeRigidBody = rigidBody;
        
        this._updateDisplayObjects(rigidBody);
    },
    
    _updateDisplayObjects: function(rigidBody) {
        var sprite = this.getRigidBodyDisplayObject(rigidBody);
        if (sprite) {
            this.updateSpriteFromRigidBody(rigidBody, sprite);
        }
        
        var forceArrow = this.getBodyForceArrow(rigidBody);
        if (forceArrow) {
            this.updateForceArrowFromRigidBody(rigidBody, forceArrow);
        }
        
        rigidBody.parts.forEach(this._updateDisplayObjects, this);
        
        var callback = this.getBodyCallback(rigidBody);
        if (callback) {
            callback.displayObjectsUpdated(this.activeRigidBody, rigidBody);
        }
    },
    
    /**
     * Updates a sprite from a rigid body.
     * <p>
     * This is automatically called as a result of calling {@link LBPhaser.PhysicsLink#updateDisplayObjects}.
     * @param {LBPhysics.RigidBody} rigidBody   The rigid body.
     * @param {Phaser.Image} sprite   The sprite to be updated.
     * @returns {undefined}
     */
    updateSpriteFromRigidBody: function(rigidBody, sprite) {
        var obj3D = rigidBody.obj3D;
        if (!obj3D) {
            return;
        }        

        var pos = LBPhaser.PhysicsLink._working3DPos;
        if (sprite._lbLocalOffset) {
            pos.copy(sprite._lbLocalOffset);
        }
        else {
            pos.zero();
        }
        obj3D.localToWorld(pos);
        var euler = Leeboard._workingEuler = obj3D.getWorldRotation(Leeboard._workingEuler);
        
        sprite.x = this.phaserEnv.toPixelsX(pos.x);
        sprite.y = this.phaserEnv.toPixelsY(pos.y);
        sprite.rotation = this.phaserEnv.ySign * euler.z;
    },

    /**
     * Updates a force arrow from a rigid body's resultant. If the rigid body has
     * a 'getForceArrowResultant' member function defined, that will be called
     * to obtain the resultant, otherwise the rigid body's {@link LBPhysics.RigidBody#getResultant} method will
     * be called.
     * <p>
     * This is automatically called as a result of calling {@link LBPhaser.PhysicsLink#updateDisplayObjects}.
     * <p>
     * The getForceArrowResultant function has the same function signature as 
     * {@link LBPhysics.RigidBody#getResultant} excluding the convertToWrench argument
     * (the first argument).
     * @param {LBPhysics.RigidBody} rigidBody   The rigid body.
     * @param {LBPhaser.Arrow} forceArrow   The arrow object.
     * @returns {undefined}
     */
    updateForceArrowFromRigidBody: function(rigidBody, forceArrow) {
        // We want the resultant passing through the vertical (world) plane that is
        // lined up with the local X-axis and passes through the local origin.
        var plane = LBPhaser.PhysicsLink._workingPlane;
        var normal = LBPhaser.PhysicsLink._working3DNormal;
        var point = rigidBody.obj3D.getWorldPosition(LBPhaser.PhysicsLink._working3DPos);
        var rotation = rigidBody.obj3D.getWorldRotation(LBPhaser.PhysicsLink._workingEuler);
        var angle = LBMath.PI_2 + rotation.z;
        normal.set(Math.cos(angle), Math.sin(angle), 0);
        plane.setFromNormalAndCoplanarPoint(normal, point);
        
        var bounds;
        if (rigidBody.massRadius) {
            bounds = LBPhaser.PhysicsLink._workingSphere;
            bounds.set(rigidBody.centerOfMass, rigidBody.massRadius);
            bounds.center.z = 0;
            bounds.applyMatrix4(rigidBody.obj3D.matrixWorld);
        }
        
        var resultant;
        if (rigidBody.getForceArrowResultant) {
            resultant = rigidBody.getForceArrowResultant(plane, bounds);
        }
        else {
            resultant = rigidBody.getResultant(true, plane, bounds);
        }
        if (resultant) {
            forceArrow.setFromBaseAndVector(resultant.applPoint, resultant.force);
        }
    },
    
    constructor: LBPhaser.PhysicsLink
};



/**
 * Creates and loads a {@link https://photonstorm.github.io/phaser-ce/Phaser.Sprite|Phaser.Sprite} object based on properties in a data object.
 * @param {Phaser.Game} game    The game to which the sprite will belong.
 * @param {object} data The data object.
 * @returns {Phaser.Sprite} Th created/loaded sprite.
 */
LBPhaser.PhysicsLink.createSpriteFromData = function(game, data) {
    var sprite = new Phaser.Sprite(game, data.x, data.y, data.key, data.frame);
    sprite._lbLocalOffset = new LBGeometry.Vector3();    
    Leeboard.copyCommonProperties(sprite, data);
    return sprite;
};

/**
 * Creates and loads a {@link https://photonstorm.github.io/phaser-ce/Phaser.Image|Phaser.Image} object based on properties in a data object.
 * @param {Phaser.Game} game    The game to which the sprite will belong.
 * @param {object} data The data object.
 * @returns {Phaser.Image} Th created/loaded image.
 */
LBPhaser.PhysicsLink.createImageFromData = function(game, data) {
    var sprite = new Phaser.Image(game, data.x, data.y, data.key, data.frame);
    sprite._lbLocalOffset = new LBGeometry.Vector3();    
    Leeboard.copyCommonProperties(sprite, data);
    return sprite;
};

