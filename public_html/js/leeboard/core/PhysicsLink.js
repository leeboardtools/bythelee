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


define(['lbphysics'],
function(LBPhysics) {

    'use strict';
    

/**
 * Base class that manages linking a {@link LBPhysics.RigidBody} to a physics engine.
 * @constructor
 * @returns {LBPhysics.PhysicsLink}
 */
LBPhysics.PhysicsLink = function() {    
    this.rigidBodies = [];
    
    this.views = [];
    
    this.updateCount = 0;
    
    /**
     * The next id to be assigned to a rigid body passed to {@link LBPhysics.PhysicsLink#getRigidBodyId}.
     * @private
     */
    this._nextRigidBodyId = 1;
};

LBPhysics.PhysicsLink.prototype = {
    
    /**
     * Retrieves an id that can be used to uniquely identify a rigid body within
     * the physics stuff.
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
     * Adds a top-level {@link LBPhysics.RigidBody} to the manager as a fixed object.
     * This rigid body should not be a part of any other rigid body.
     * @param {LBPhysics.RigidBody} rigidBody The rigid body.
     * @returns {LBPhaser.P2Link}   this.
     */
    addFixedObject: function(rigidBody) {
        throw 'addFixedObject not implemented';
    },
    
    /**
     * Adds a top-level {@link LBPhysics.RigidBody} to the manager. This rigid body
     * should not be a part of any other rigid body.
     * @param {LBPhysics.RigidBody} rigidBody The rigid body.
     * @param {Object}  [data]  Optional data containing additional information for
     * loading other items associated with the rigid body.
     * @returns {LBPhysics.PhysicsLink}   this.
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
     * Called from {@link LBPhysics.PhysicsLink#addRigidBody} after the rigid body
     * has been added.
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
     * Called from {@link LBPhysics.PhysicsLink#removeRigidBody} right before the rigid
     * body is removed from the rigid body list, this does nothing.
     * @protected
     * @param {LBPhysics.RigidBody} rigidBody   The rigid body being removed.
     * @returns {undefined}
     */
    _rigidBodyRemoved: function(rigidBody) {
    },
    
    
    /**
     * Adds a view to the manager. Views should have the following methods:
     *  beginDisplayObjectsUpdate();
     *  endDisplayObjectsUpdate();
     *  updateRigidBodyDisplayObjects();
     * @param {Object} view The view to add.
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
     * @param {Object} view   The view to remove.
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
     * @param {Number} dt The time step.
     * @returns {undefined}
     */
    update: function(dt) {
    },
    
    /**
     * Updates any display objects associated with the physics link by calling
     * the views that were added to the link..
     * <p>
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
    
    constructor: LBPhysics.PhysicsLink
};


return LBPhysics;
});
