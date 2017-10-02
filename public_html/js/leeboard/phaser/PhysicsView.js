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


define(['lbphaserutil', 'lbutil', 'lbmath', 'lbgeometry', 'phaser'],
function(LBPhaser, LBUtil, LBMath, LBGeometry, Phaser) {

/**
 * A Phaser view onto physics objects represented via a {@link LBPhysics.PhysicsLink}.
 * @param {LBPhysics.PhysicsLink} physicsLink    The physics link containing the physics objects.
 * @param {Phaser.Group}    [worldGroup]    If defined, the group to which all display
 * objects loaded by this are added.
 * @returns {LBPhaser.PhysicsView}
 */
LBPhaser.PhysicsView = function(physicsLink, worldGroup) {
    this.physicsLink = physicsLink;
    this.worldGroup = worldGroup;
    
    this.rigidBodyEntries = {
    };
};


LBPhaser.PhysicsView._workingEuler;
LBPhaser.PhysicsView._working3DPos = new LBGeometry.Vector3();
LBPhaser.PhysicsView._workingPlaneA = new LBGeometry.Plane();
LBPhaser.PhysicsView._workingPlaneB = new LBGeometry.Plane();
LBPhaser.PhysicsView._working3DNormal = new LBGeometry.Vector3();
LBPhaser.PhysicsView._workingSphere = new LBGeometry.Sphere();


LBPhaser.PhysicsView.prototype = {
    /**
     * Retrieves the object used to hold information specific to this view for a
     * given rigid body.
     * @protected
     * @param {LBPhysics.RigidBody} rigidBody   The rigid body of interest.
     * @returns {Object}    The obejct containing the information.
     */
    _getRigidBodyEntry: function(rigidBody) {
        var id = this.physicsLink.getRigidBodyId(rigidBody);
        var entry = this.rigidBodyEntries[id];
        if (!entry) {
            entry = {};
            this.rigidBodyEntries[id] = entry;
        }
        return entry;
    },
    
    /**
     * Retrieves the Phaser {@link https://photonstorm.github.io/phaser-ce/global.html#Phaser.DisplayObject|DisplayObject} 
     * associated with a rigid body.
     * @param {LBPhysics.RigidBody} rigidBody   The rigid body.
     * @returns {Phaser.Sprite} The display object associated with rigidBody, may be undefined.
     */
    getRigidBodyDisplayObject: function(rigidBody) {
        return this._getRigidBodyEntry(rigidBody).displayObject;
    },
    
    /**
     * Associates a Phaser {@link https://photonstorm.github.io/phaser-ce/global.html#Phaser.DisplayObject|DisplayObject} 
     * with a rigid body. A rigid body can only have one display object associated with it.
     * @param {LBPhysics.RigidBody} rigidBody   The rigid body.
     * @param {Object} drawingObject    The drawing object to associate.
     * @returns {undefined}
     */
    setRigidBodyDisplayObject: function(rigidBody, drawingObject) {
        this._getRigidBodyEntry(rigidBody).displayObject = drawingObject;
    },
    
    /**
     * Destroys the Phaser {@link https://photonstorm.github.io/phaser-ce/global.html#Phaser.DisplayObject|DisplayObject} 
     * associated with a rigid body, if any.
     * @param {LBPhysics.RigidBody} rigidBody   The rigid body.
     * @returns {undefined}
     */
    destroyRigidBodyDisplayObject: function(rigidBody) {
        var obj = this.getRigidBodyDisplayObject(rigidBody);
        if (obj) {
            obj.destroy();
            this.setRigidBodyDisplayObject(rigidBody, undefined);
        }
    },


    /**
     * Retrieves the force arrow associated with a rigid body.
     * @param {LBPhysics.RigidBody} rigidBody The rigid body.
     * @returns {LBPhaser.Arrow}    The force arrow, may be undefined.
     */
    getRigidBodyForceArrow: function(rigidBody) {
        return this._getRigidBodyEntry(rigidBody).forceArrow;
    },
    
    /**
     * Sets the force arrow associated with a rigid body.
     * @param {LBPhysics.RigidBody} rigidBody The rigid body.
     * @param {LBPhaser.Arrow} forceArrow   The force arrow.
     * @returns {undefined}
     */
    setRigidBodyForceArrow: function(rigidBody, forceArrow) {
        this._getRigidBodyEntry(rigidBody).forceArrow = forceArrow;
    },
    
    /**
     * Destroys the force arrow associated with a rigid body, if any.
     * @param {LBPhysics.RigidBody} rigidBody   The rigid body.
     * @returns {undefined}
     */
    destroyRigidBodyForceArrow: function(rigidBody) {
        var obj = this.getRigidBodyForceArrow(rigidBody);
        if (obj) {
            obj.destroy();
            this.setRigidBodyForceArrow(rigidBody, undefined);
        }
    },

    
    /**
     * Retrieves the callback object associated with a rigid body.
     * @param {LBPhysics.RigidBody} rigidBody The rigid body.
     * @returns {Object}    The callback object, may be undefined.
     */
    getBodyCallback: function(rigidBody) {
        return this._getRigidBodyEntry(rigidBody).callback;
    },
    
    /**
     * Sets the callback object associated with a rigid body. The callback has the
     * following optional functions:
     * <li>onDisplayObjectsUpdated = function(topRigidBody, rigidBody);
     * @param {LBPhysics.RigidBody} rigidBody The rigid body.
     * @param {Object}  callback    The callback object.
     */
    setBodyCallback: function(rigidBody, callback) {
        this._getRigidBodyEntry(rigidBody).callback = callback;
    },
    

    /**
     * Called by {@link LBPhysics.PhysicsLink} when a rigid body is added to the physics
     * link or when this view is first added to the physics link.
     * @protected
     * @param {LBPhysics.RigidBody} rigidBody   The rigid body to process.
     * @returns {undefined}
     */
    rigidBodyAdded: function(rigidBody) {
        this._getRigidBodyEntry(rigidBody);
    },
    
    /**
     * Called by {@link LBPhysics.PhysicsLink} when a rigid body is removed from the
     * physics link or when this view is removed from the physics link.
     * @protected
     * @param {LBPhysics.RigidBody} rigidBody   The rigid body to process.
     * @returns {undefined}
     */
    rigidBodyRemoved: function(rigidBody) {
        var id = this.physicsLink.getRigidBodyId(rigidBody);
        this.rigidBodyEntries[id] = undefined;
    },
    
    /**
     * Called by {@link LBPhysics.PhysicsLink} before it starts calling {@link LBPhaser.PhysicsView#updateRigidBodyDisplayObjects}
     * for each rigid body.
     * @returns {undefined}
     */
    beginDisplayObjectsUpdate: function() {
        
    },
    
    /**
     * Called by {@link LBPhysics.PhysicsLink} after it has finished calling {@link LBPhaser.PhysicsView#updateRigidBodyDisplayObjects}
     * for each rigid body.
     * @returns {undefined}
     */
    endDisplayObjectsUpdate: function() {
        
    },

    /**
     * Called by {@link LBPhysics.PhysicsLink} to have the view update from the current
     * state of a rigid body.
     * @protected
     * @param {LBPhysics.RigidBody} rigidBody   The rigid body to process.
     * @returns {undefined}
     */
    updateRigidBodyDisplayObjects: function(rigidBody) {
        this.activeRigidBody = rigidBody;        
        this._updateDisplayObjects(rigidBody);
        this.activeRigidBody = null;
    },
    
    /**
     * Called by {@link LBPhaser.PhysicsView#updateRigidbodyDisplayObject} and recursively
     * from here for each part of a rigid body to handle updating the display objects
     * for a rigid body.
     * @param {LBPhysics.RigidBody} rigidBody   The rigid body whose objects are to be updated.
     * @returns {undefined}
     */
    _updateDisplayObjects: function(rigidBody) {
        var sprite = this.getRigidBodyDisplayObject(rigidBody);
        if (sprite) {
            this.updateSpriteFromRigidBody(rigidBody, sprite);
        }
        
        var forceArrow = this.getRigidBodyForceArrow(rigidBody);
        if (forceArrow) {
            this.updateForceArrowFromRigidBody(rigidBody, forceArrow);
        }
        
        rigidBody.parts.forEach(this._updateDisplayObjects, this);
        
        var callback = this.getBodyCallback(rigidBody);
        if (callback && callback.onDisplayObjectsUpdated) {
            callback.onDisplayObjectsUpdated(this.activeRigidBody, rigidBody);
        }
    },
    
    /**
     * Updates a sprite from a rigid body.
     * <p>
     * This is automatically called as a result of calling {@link LBPhysics.PhysicsLink#updateDisplayObjects}.
     * @param {LBPhysics.RigidBody} rigidBody   The rigid body.
     * @param {Phaser.Image} sprite   The sprite to be updated.
     * @returns {undefined}
     */
    updateSpriteFromRigidBody: function(rigidBody, sprite) {
        var obj3D = rigidBody.obj3D;
        if (!obj3D) {
            return;
        }        

        var pos = LBPhaser.PhysicsView._working3DPos;
        if (sprite._lbLocalOffset) {
            pos.copy(sprite._lbLocalOffset);
        }
        else {
            pos.zero();
        }
        obj3D.localToWorld(pos);
        var euler = LBPhaser.PhysicsView._workingEuler = obj3D.getWorldRotation(LBPhaser.PhysicsView._workingEuler);
        
        var phaserEnv = this.physicsLink.phaserEnv;
        sprite.x = phaserEnv.toPixelsX(pos.x);
        sprite.y = phaserEnv.toPixelsY(pos.y);
        sprite.rotation = phaserEnv.ySign * euler.z;
    },

    /**
     * Updates a force arrow from a rigid body's resultant. If the rigid body has
     * a 'getForceArrowResultant' member function defined, that will be called
     * to obtain the resultant, otherwise the rigid body's {@link LBPhysics.RigidBody#getResultant} method will
     * be called.
     * <p>
     * This is automatically called as a result of calling {@link LBPhysics.PhysicsLink#updateDisplayObjects}.
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
        var plane = LBPhaser.PhysicsView._workingPlaneA;
        var normal = LBPhaser.PhysicsView._working3DNormal;
        var point = rigidBody.obj3D.getWorldPosition(LBPhaser.PhysicsView._working3DPos);
        var rotation = rigidBody.obj3D.getWorldRotation(LBPhaser.PhysicsView._workingEuler);
        var angle = LBMath.PI_2 + rotation.z;
        normal.set(Math.cos(angle), Math.sin(angle), 0);
        plane.setFromNormalAndCoplanarPoint(normal, point);
        
        var secondaryPlane = LBPhaser.PhysicsView._workingPlaneB;
        angle += LBMath.PI_2;
        normal.set(Math.cos(angle), Math.sin(angle), 0);
        secondaryPlane.setFromNormalAndCoplanarPoint(normal, point);
        
        var bounds;
        if (rigidBody.massRadius) {
            bounds = LBPhaser.PhysicsView._workingSphere;
            bounds.set(rigidBody.centerOfMass, rigidBody.massRadius);
            bounds.center.z = 0;
            bounds.applyMatrix4(rigidBody.obj3D.matrixWorld);
        }
        
        var resultant;
        if (rigidBody.getForceArrowResultant) {
            resultant = rigidBody.getForceArrowResultant(plane, bounds, secondaryPlane);
        }
        else {
            resultant = rigidBody.getResultant(true, plane, bounds, secondaryPlane);
        }
        if (resultant) {
            forceArrow.setFromBaseAndVector(resultant.applPoint, resultant.force);
        }
    },
    
    /**
     * Call when done with the view, this removes references to other objects,
     * hoping this will eventually get garbage collected.
     * @returns {undefined}
     */
    destroy: function() {
        if (this.physicsLink) {
            // TODO: Gotta get rid of all our stuff...
            this.rigidBodyEntries = null;
            
            this.physicsLink.removeView(this);
            this.physicsLink = null;
        }
    },
    
    constructor: LBPhaser.PhysicsView
};


/**
 * Creates and loads a {@link https://photonstorm.github.io/phaser-ce/Phaser.Sprite|Phaser.Sprite} object based on properties in a data object.
 * @param {Phaser.Game} game    The game to which the sprite will belong.
 * @param {object} data The data object.
 * @returns {Phaser.Sprite} Th created/loaded sprite.
 */
LBPhaser.PhysicsView.createSpriteFromData = function(game, data) {
    var sprite = new Phaser.Sprite(game, data.x, data.y, data.key, data.frame);
    sprite._lbLocalOffset = new LBGeometry.Vector3();    
    LBUtil.copyCommonProperties(sprite, data);
    return sprite;
};

/**
 * Creates and loads a {@link https://photonstorm.github.io/phaser-ce/Phaser.Image|Phaser.Image} object based on properties in a data object.
 * @param {Phaser.Game} game    The game to which the sprite will belong.
 * @param {object} data The data object.
 * @returns {Phaser.Image} Th created/loaded image.
 */
LBPhaser.PhysicsView.createImageFromData = function(game, data) {
    var sprite = new Phaser.Image(game, data.x, data.y, data.key, data.frame);
    sprite._lbLocalOffset = new LBGeometry.Vector3();    
    LBUtil.copyCommonProperties(sprite, data);
    return sprite;
};

return LBPhaser;
});