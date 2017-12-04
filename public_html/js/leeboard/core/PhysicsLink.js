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


define(['lbphysics'],
function(LBPhysics) {

    'use strict';

/**
 * This module contains helper base classes for linking our stuff with a physics engine.
 * @exports LBPhysicsLink
 */
var LBPhysicsLink = LBPhysics;

/**
 * Base class that manages linking a {@link module:LBPhysics.RigidBody} to a physics engine.
 * @constructor
 * @returns {module:LBPhysicsLink.Link}
 */
LBPhysicsLink.Link = function() {    
    this.rigidBodies = [];
    this.forceGenerators = [];
    
    this.views = [];
    
    this.updateCount = 0;
    
    /**
     * The next id to be assigned to a rigid body passed to {@link module:LBPhysicsLink.Link#getRigidBodyId}.
     * @private
     */
    this._nextRigidBodyId = 1;
};

LBPhysicsLink.Link.prototype = {
    
    /**
     * Retrieves an id that can be used to uniquely identify a rigid body within
     * the physics stuff.
     * @param {module:LBPhysics.RigidBody} rigidBody   The rigid body of interest.
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
     * Adds a top-level {@link module:LBPhysics.RigidBody} to the manager as a fixed object.
     * This rigid body should not be a part of any other rigid body.
     * @param {module:LBPhysics.RigidBody} rigidBody The rigid body.
     * @returns {module:LBPhysicsLink.Link}   this.
     */
    addFixedObject: function(rigidBody) {
        throw 'addFixedObject not implemented';
    },
    
    /**
     * Adds a top-level {@link module:LBPhysics.RigidBody} to the manager. This rigid body
     * should not be a part of any other rigid body.
     * @param {module:LBPhysics.RigidBody} rigidBody The rigid body.
     * @param {Object}  [data]  Optional data containing additional information for
     * loading other items associated with the rigid body.
     * @returns {module:LBPhysicsLink.Link}   this.
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
     * Called from {@link module:LBPhysicsLink.Link#addRigidBody} after the rigid body
     * has been added.
     * @protected
     * @param {module:LBPhysics.RigidBody} rigidBody   The rigid body.
     * @param {Object}  [data]  Optional data containing additional information for
     * loading other items associated with the rigid body, such as a Phaser display object.
     * @returns {undefined}
     */
    _rigidBodyAdded: function(rigidBody, data) {
    },
    
    
    /**
     * Removes a rigid body from the manager.
     * @param {module:LBPhysics.RigidBody} rigidBody   The rigid body.
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
     * Called from {@link module:LBPhysicsLink.Link#removeRigidBody} right before the rigid
     * body is removed from the rigid body list, this does nothing.
     * @protected
     * @param {module:LBPhysics.RigidBody} rigidBody   The rigid body being removed.
     * @returns {undefined}
     */
    _rigidBodyRemoved: function(rigidBody) {
    },
    
    
    /**
     * Determines if two bodies are in contact.
     * @param {module:LBPhysics.RigidBody} bodyA    The first body.
     * @param {module:LBPhysics.RigidBody} bodyB    The second body.
     * @returns {Boolean}
     */
    areBodiesInContact: function(bodyA, bodyB) {
        throw "LBPhysicsLink.Link#areBodiesInContact not implemented!";
    },
    

    /**
     * Adds a {@link module:LBForces.ForceGenerator} to the manager.
     * @param {module:LBForces.Generator} generator    The force generator.
     * @returns {LBPhysicsLink.Link}    this.
     */
    addForceGenerator: function(generator) {
        this.forceGenerators.push(generator);
        return this;
    },
    
    /**
     * Removes a force generator from the manager.
     * @param {module:LBForces.Generator} generator    The force generator.
     * @returns {Boolean}   true if the generator was removed, false if it was not part of the manager.
     */
    removeForceGenerator: function(generator) {
        var index = this.forceGenerators.indexOf(generator);
        if (index >= 0) {
            this.forceGenerators.splice(index, 1);
            return true;
        }
        return false;
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
        this.rigidBodies.forEach(function(rigidBody) {
            rigidBody.clearForces();
            this._updateRigidBodyForces(rigidBody, dt);
            
        }, this);
        
        this.forceGenerators.forEach(function(generator) {
            generator.update(dt);
        });
    },
    
    /**
     * Called from update() for each rigid body to have the body update any forces
     * generated from itself.
     * @param {module:LBPhysics.RigidBody} rigidBody    The rigid body.
     * @param {Number} dt   The time step.
     * @returns {undefined}
     */
    _updateRigidBodyForces: function(rigidBody, dt) {
        rigidBody.updateCoords(dt);
        if (rigidBody.updateForces) {
            rigidBody.updateForces(dt);
        }
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
    
    constructor: LBPhysicsLink.Link
};


return LBPhysics;
});
