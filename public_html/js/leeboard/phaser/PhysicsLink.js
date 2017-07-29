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


/* global LBUtil, Phaser, LBPhysics, LBGeometry, LBMath, LBPhaser */

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
    
    this.rigidBodies = [];
    
    this.views = [];
    
    this.updateCount = 0;
    this.stageUpdateCount = 0;
    
    /**
     * The next id to be assigned to a rigid body passed to {@link LBPhaser.PhysicsLink#getRigidBodyId}.
     * @private
     */
    this._nextRigidBodyId = 1;
};

LBPhaser.PhysicsLink.prototype = {
    
    /**
     * Retrieves an id that can be used to uniquely identify a rigid body within
     * the Phaser physics stuff.
     * @param {LBPhysics.RigidBody} rigidBody   The rigid body of interest.
     * @returns {Number}    The id for the rigid body.
     */
    getRigidBodyId: function(rigidBody) {
        var id = rigidBody._lbPhysicsLinkId;
        if (!id) {
            id = this._nextRigidBodyId++;
            rigidBody._lbPhysicsLinkId = id;
        }
        return id;
    },

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
        
        this._rigidBodyAdded(rigidBody, data);

        this.views.forEach(function(view) {
            view.rigidBodyAdded(rigidBody);
        });
        
        return this;
    },
    
    /**
     * Called from {@link LBPhaser.PhysicsLink#addRigidBody} after the rigid body
     * has been added but before the views have been notified.
     * @protected
     * @param {LBPhysics.RigidBody} rigidBody   The rigid body.
     * @param {Object}  [data]  Optional data containing additional information for
     * loading other items associated with the rigid body, such as a Phaser display object.
     * @returns {undefined}
     */
    _rigidBodyAdded: function(rigidBody, data) {
    },
    
    
    /**
     * Removes a rigid body from the manager.
     * @param {LBPhysics.RigidBody} rigidBody   The rigid body.
     * @returns {Boolean}   true if the rigid body was removed, false if it was not
     * part of this link.
     */
    removeRigidBody: function(rigidBody) {
        var index = this.rigidBodies.indexOf(rigidBody);
        if (index >= 0) {
            this.views.forEach(function(view) {
                view.rigidBodyRemoved(rigidBody);
            });
            
            this._rigidBodyRemoved(rigidBody);
            
            this.rigidBodies.splice(index, 1);
            return true;
        }
        return false;
    },
    
    /**
     * Called from {@link LBPhaser.PhysicsLink#removeRigidBody} right before the rigid
     * body is removed from the rigid body list, this does nothing.
     * @protected
     * @param {LBPhysics.RigidBody} rigidBody   The rigid body being removed.
     * @returns {undefined}
     */
    _rigidBodyRemoved: function(rigidBody) {
    },
    
    
    /**
     * Adds a {@link LBPhaser.PhysicsView} to the manager.
     * @param {LBPhaser.PhysicsView} view The view to add.
     */
    addView: function(view) {
        this.views.push(view);
        
        // Tell the view about all the physics objects...
        this.rigidBodies.forEach(function(rigidBody) {
            view.rigidBodyAdded(rigidBody);
        });
        
        return this;
    },
    
    /**
     * Removes a view from the manager.
     * @param {LBPhaser.PhysicsView} view   The view to remove.
     * @return {Boolean}    true if the view was removed, false if it was not part
     * of this link.
     */
    removeView: function(view) {
        var index = this.views.indexOf(view);
        if (index >= 0) {
            // Tell the view to remove all the physics objects...
            this.rigidBodies.forEach(function(rigidBody) {
                view.rigidBodyRemoved(rigidBody);
            });
            this.views.splice(index, 1);
            return true;
        }
        return false;
    },
    

    /**
     * @returns {Number}    The time step for the next update call.
     */
    timeStep: function() {
        return 1/60;
    },

    /**
     * Performs an update cycle.
     * @param {Number} dt The time step, normally what was returned by {@link LBPhaser.P2Link#timeStep}..
     * @returns {undefined}
     */
    update: function(dt) {
    },
    
    /**
     * Updates any Phaser display object that have been attached to any of the rigid bodies or their
     * parts.
     * <p>
     * This is automatically called from {@link LBPhaser.PhysicsLink#_stageUpdateTransform}.
     * @returns {undefined}
     */
    updateDisplayObjects: function() {
        this.views.forEach(function(view) {
            view.beginDisplayObjectsUpdate();
        });
        
        this.rigidBodies.forEach(this._updateDisplayObjects, this);

        this.views.forEach(function(view) {
            view.endDisplayObjectsUpdate();
        });        
    },

    _updateDisplayObjects: function(rigidBody) {
        this.views.forEach(function(view) {
            view.updateRigidBodyDisplayObjects(rigidBody);
        });
    },
    
    constructor: LBPhaser.PhysicsLink
};



