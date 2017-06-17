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


/* global Leeboard, Phaser, LBPhysics */

/**
 * Manages linking a {@link Phaser.Physics.P2.Body} and a {@link LBPhysics.RigidBody}, updating
 * the position/rotation of the rigid body from the P2 body and applying the forces
 * from the rigid body to the P2 body.
 * @constructor
 * @param {object} game The Phaser game we're running under.
 * @returns {Leeboard.P2Link}
 */
Leeboard.P2Link = function(game) {
    this.game = game;
    
    /**
     * Set this to -1 to make the y-axis going up, otherwise set it to +1 to make the y-axis
     * go down.
     */
    this.ySign = 1;
    this.linkedObjects = [];
    this.workingResultant = new LBPhysics.Resultant3D();
};

Leeboard.P2Link.prototype = {
    /**
     * Adds a {@link Phaser.Physics.P2.Body} and a {@link LBPhysics.RigidBody} pair to the manager.
     * @param {object} p2Body   The P2 body.
     * @param {object} rigidBody The rigid body.
     * @returns {Leeboard.P2Link}   this.
     */
    addLinkedObjects: function(p2Body, rigidBody) {
        this.linkedObjects.push({ 'p2Body': p2Body, 'rigidBody': rigidBody });
        return this;
    },
    
    /**
     * Removes a P2 body/rigid body link via index.
     * @param {number} index  The index of the entry to remove.
     * @returns {Leeboard.P2Link}   this.
     */
    removeLinkedObject: function(index) {
        this.linkedObjects.splice(index, 1);
        return this;
    },
    
    /**
     * Removes a P2 body/rigid body link via the P2 body.
     * @param {object} p2Body   The P2 body of the link.
     * @returns {Boolean}   true if a link with the P2 body was removed.
     */
    removeLinkByP2Body: function(p2Body) {
        var index = indexOfP2Body(p2Body);
        if (index >= 0) {
            removeLinkedObject(index);
            return true;
        }
        return false;
    },
    
    /**
     * Removes a P2 body/rigid body link via the rigid body.
     * @param {object} rigidBody    The rigid body of the link.
     * @returns {Boolean}   true if a link with the rigid body was removed.
     */
    removeLinkByRigidBody: function(rigidBody) {
        var index = indexOfRigidBody(rigidBody);
        if (index >= 0) {
            removeLinkedObject(index);
            return true;
        }
        return false;
    },
    
    /**
     * Retrieves the index of a P2 body in the manager.
     * @param {object} p2Body   The P2 body of interest.
     * @returns {Number}    The index, -1 if p2Body is not in the manager.
     */
    indexOfP2Body: function(p2Body) {
        for (var i = 0; i < this.linkedObjects.length; ++i) {
            if (this.linkedObjects[i].p2Body === p2Body) {
                return i;
            }
        }
        return -1;
    },
    
    /**
     * Retrieves the index of a rigid body in the manager.
     * @param {object} rigidBody  The rigid body.
     * @returns {Number}    The index, -1 if rigidBody is not in the manager.
     */
    indexOfRigidBody: function(rigidBody) {
        for (var i = 0; i < this.linkedObjects.length; ++i) {
            if (this.linkedObjects[i].rigidBody === rigidBody) {
                return i;
            }
        }
        return -1;
    },
    
    /**
     * Call to update the rigid bodies from the P2 bodies. This updates the position and
     * orientation of the rigid body from that of the linked P2 body.
     * @returns {Leeboard.P2Link}   this.
     */
    updateFromP2: function() {
        this.linkedObjects.forEach(this._updateLB3BodyFromP2, this);
        return this;
    },
    
    _updateLB3BodyFromP2: function(entry) {
        var p2Body = entry.p2Body;
        var rigidBody = entry.rigidBody;
        // Phaser negates the coordinate system between P2 and {@link PHaser.Physics.P2}.
        rigidBody.setXYZ(-p2Body.world.pxmi(p2Body.x), -this.ySign * p2Body.world.pxmi(p2Body.y), 
            rigidBody.obj3D.position.z);
        rigidBody.setZRotationRad(this.ySign * p2Body.rotation);
        rigidBody.obj3D.updateMatrixWorld();
    },
    
    /**
     * Call to apply the forces from the rigid bodies to the P2 bodies.
     * @param {number} dt   The simulation time step.
     * @returns {Leeboard.P2Link}   this.
     */
    applyToP2: function(dt) {
        this.linkedObjects.forEach(this._updateP2BodyFromLB3, { 'p2link': this, 'dt': dt });
        return this;
    },
    
    _updateP2BodyFromLB3: function(entry) {
        var p2Body = entry.p2Body;
        var rigidBody = entry.rigidBody;
        rigidBody.updateForces(this.dt);
        
        var resultant = rigidBody.getResultant(true);
        
        p2Body.mass = rigidBody.getTotalMass();
        p2Body.inertia = LBPhysics.getInertiaZZ(rigidBody.momentInertia);
        
        var x = resultant.applPoint.x - rigidBody.obj3D.position.x;
        var y = resultant.applPoint.y - rigidBody.obj3D.position.y;
        
        // Phaser negates the coordinate system between P2 and {@link PHaser.Physics.P2}.
        p2Body.applyForce([-resultant.force.x, -this.p2link.ySign * resultant.force.x], 
            p2Body.world.mpxi(-x), p2Body.world.mpxi(-this.p2link.ySign * y));
    },

    constructor: Leeboard.P2Link
};

/**
 * Retrieves the appropriate tie step to use based on the settings of {@link Phaser.Physics.P2}.
 * @param {Phaser.Physics.P2} p2    The P2 physics object.
 * @returns {number}    The time step.
 */
Leeboard.P2Link.getP2TimeStep = function(p2) {
    return p2.useElapsedTime ? p2.game.time.physicsElapsed : p2.frameRate;
};

/**
 * Creates and loads a {Phaser.Sprite} object based on properties in a data object.
 * @param {Phaser.Game} game    The game to which the sprite will belong.
 * @param {object} data The data object.
 * @returns {Phaser.Sprite} Th created/loaded sprite.
 */
Leeboard.P2Link.createSpriteFromData = function(game, data) {
    var sprite = new Phaser.Sprite(game, data.x, data.y, data.key, data.frame);
    Leeboard.copyCommonProperties(sprite, data);
    return sprite;
};

/**
 * Creates and loads a {Phaser.Physics.P2.Body} object based on properties in a data object.
 * @param {Phaser.Game} game    The game to which the body will belong.
 * @param {object} data The data object.
 * @returns {Phaser.Physics.P2.Body}    The created/loaded body.
 */
Leeboard.P2Link.createP2BodyFromData = function(game, data) {
    var sprite = Leeboard.P2Link.createSpriteFromData(game, data.sprite);
    sprite.game.physics.enable(sprite, Phaser.Physics.P2JS);
    sprite.body.collideWorldBounds = true;

    var p2Body = sprite.body;
    p2Body.mass = data.mass || p2Body.mass;

    Leeboard.copyCommonProperties(p2Body, data.p2Body, function(val) {
        return val !== 'sprite';
    });
    
    return p2Body;
};

/**
 * Extension of {Phaser.Point}, adding a copy function.
 * @param {object} src  The object to be copied.
 * @returns {Phaser.Point}  this.   
 */
Phaser.Point.prototype.copy = function(src) {
    this.x = src.x || this.x;
    this.y = src.y || this.y;
    return this;
};