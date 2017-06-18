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


/* global Leeboard, Phaser, LBPhysics, LBGeometry */

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
    this.game.physics.p2.world.applyGravity = false;
    
    // We're overriding the stage's updateTransform() method so we can update the
    // sprites from the current obj3D positions of the rigid bodies. The postUpdate()
    // methods all seem to be internal, so I'm hooking into updateTransform() because
    // that's currently called right after the P2 bodies update the positions of their
    // sprites (which is done in {Phaser.Physics.P2.Body.postUpdate()}.
    this.savedUpdateTransform = this.game.stage.updateTransform;
    this.game.stage.LB_P2Link = this;
    this.game.stage.updateTransform = this._stageUpdateTransform;
    
    /**
     * Set this to -1 to make the y-axis going up, otherwise set it to +1 to make the y-axis
     * go down.
     */
    this.ySign = 1;
    this.rigidBodies = [];
    this.workingResultant = new LBPhysics.Resultant3D();
    this.working3DPos = LBGeometry.createVector3();
};

Leeboard.P2Link.prototype = {
    /**
     * Adds a {@link LBPhysics.RigidBody} pair to the manager.
     * @param {object} rigidBody The rigid body.
     * @returns {Leeboard.P2Link}   this.
     */
    addRigidBody: function(rigidBody) {
        this.rigidBodies.push(rigidBody);
        return this;
    },
    
    /**
     * Removes a rigid body link via index.
     * @param {object} rigidBody The rigid body.
     * @returns {Leeboard.P2Link}   this.
     */
    removeRigidBody: function(rigidBody) {
        var index = this.rigidBodies.indexOf(rigidBody);
        if (index >= 0) {
            this.rigidBodies.splice(index, 1);
        }
        return this;
    },
    
    
    /**
     * Call to update the rigid bodies from the P2 bodies. This updates the position and
     * orientation of the rigid body from that of the linked P2 body.
     * @returns {Leeboard.P2Link}   this.
     */
    updateFromP2: function() {
        this.rigidBodies.forEach(this._updateRigidBodyFromPhaser, this);
        return this;
    },
    
    _updateRigidBodyFromPhaser: function(rigidBody) {
        var p2Body = rigidBody[Leeboard.P2Link.p2BodyProperty];
        if (p2Body) {
            // Phaser negates the coordinate system between P2 and {@link PHaser.Physics.P2}.
            rigidBody.setXYZ(-p2Body.world.pxmi(p2Body.x), -this.ySign * p2Body.world.pxmi(p2Body.y), 
                rigidBody.obj3D.position.z);
            rigidBody.setZRotationRad(this.ySign * p2Body.rotation);
            rigidBody.obj3D.updateMatrixWorld();
        }
    },
    
    /**
     * Call to apply the forces from the rigid bodies to the P2 bodies.
     * @param {number} dt   The simulation time step.
     * @returns {Leeboard.P2Link}   this.
     */
    applyToP2: function(dt) {
        this.rigidBodies.forEach(this._updateP2BodyFromLB3, { 'p2link': this, 'dt': dt });
        return this;
    },
    
    _updateP2BodyFromLB3: function(rigidBody) {
        var p2Body = rigidBody[Leeboard.P2Link.p2BodyProperty];
        if (!p2Body) {
            return;
        }
        
        rigidBody.updateForces(this.dt);
        
        var resultant = rigidBody.getResultant(true);
        
        p2Body.mass = rigidBody.getTotalMass();
        p2Body.inertia = LBPhysics.getInertiaZZ(rigidBody.momentInertia);
        
        var x = resultant.applPoint.x - rigidBody.obj3D.position.x;
        var y = resultant.applPoint.y - rigidBody.obj3D.position.y;
        
        // Phaser negates the coordinate system between P2 and {@link PHaser.Physics.P2}.
        p2Body.applyForce([-resultant.force.x, -this.p2link.ySign * resultant.force.y], 
            p2Body.world.mpxi(-x), p2Body.world.mpxi(-this.p2link.ySign * y));
    },
    
    /**
     * Our hook into {@link Phaser.Stage#updateTransform}.
     * @returns {undefined}
     */
    _stageUpdateTransform: function() {
        var p2Link = this.LB_P2Link;
        p2Link.savedUpdateTransform.call(this);
        
        p2Link.updateSprites();
    },
    
    /**
     * Updates any sprites that have been attached to any of the rigid bodies or their
     * parts via a property named {@link Leeboard.P2Link.spriteProperty}.
     * @returns {undefined}
     */
    updateSprites: function() {
        this.rigidBodies.forEach(this._updateSprites, this);
    },
    
    _updateSprites: function(rigidBody) {
        var sprite = rigidBody[Leeboard.P2Link.spriteProperty];
        if (sprite) {
            this.updateSpriteFromRigidBody(rigidBody, sprite);
        }
        
        rigidBody.parts.forEach(this._updateSprites, this);
    },
    
    /**
     * Updates a sprite from a rigid body.
     * @param {LBPhysics.RigidBody} rigidBody   The rigid body.
     * @param {Phaser.Sprite|Phaser.Image} sprite   The sprite to be updated.
     * @returns {undefined}
     */
    updateSpriteFromRigidBody: function(rigidBody, sprite) {
        var obj3D = rigidBody.obj3D;
        if (!obj3D) {
            return;
        }        

        if (sprite.lbLocalOffset) {
            this.working3DPos.copy(sprite.lbLocalOffset);
        }
        else {
            this.working3DPos.zero();
        }
        obj3D.localToWorld(this.working3DPos);
        this.workingEuler = obj3D.getWorldRotation(this.workingEuler);
        
        var p2 = this.game.physics.p2;
        sprite.x = p2.mpx(this.working3DPos.x);
        sprite.y = this.ySign * p2.mpx(this.working3DPos.y);
        sprite.rotation = this.workingEuler.z;
    },

    constructor: Leeboard.P2Link
};

/**
 * The name of the property in {LBPhysics.RigidBody} objects where we store the {Phaser.Physics.P2.Body}.
 * P2 bodies control the position of the rigid body.
 */
Leeboard.P2Link.p2BodyProperty = "_p2Body";

/**
 * The name of the property in {LBPhysics.RigidBody} objects where we store {Phaser.Sprite} or {Phaser.Image}
 * objects. Sprite/image objects are controlled by the rigid body's world position and rotation.
 */
Leeboard.P2Link.spriteProperty = "_sprite";

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
    sprite.lbLocalOffset = LBGeometry.createVector3();    
    Leeboard.copyCommonProperties(sprite, data);
    return sprite;
};

/**
 * Creates and loads a {Phaser.Image} object based on properties in a data object.
 * @param {Phaser.Game} game    The game to which the sprite will belong.
 * @param {object} data The data object.
 * @returns {Phaser.Image} Th created/loaded image.
 */
Leeboard.P2Link.createImageFromData = function(game, data) {
    var sprite = new Phaser.Image(game, data.x, data.y, data.key, data.frame);
    sprite.lbLocalOffset = LBGeometry.createVector3();    
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