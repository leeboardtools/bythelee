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


/* global Leeboard, Phaser, LBPhysics, LBGeometry, LBMath, LBPhaser */

/**
 * Manages linking a {@link Phaser.Physics.P2.Body} and a {@link LBPhysics.RigidBody}, updating
 * the position/rotation of the rigid body from the P2 body and applying the forces
 * from the rigid body to the P2 body. This also supports displaying an arrow representing
 * the resultant force on rigid bodies.
 * @constructor
 * @param {LBPhaser.Env} phaserEnv The Phaser environment we're running under.
 * @returns {LBPhaser.P2Link}
 */
LBPhaser.P2Link = function(phaserEnv) {
    this.phaserEnv = phaserEnv;
    this.game = phaserEnv.game;
    this.game.physics.p2.world.applyGravity = false;
    
    // We're overriding the stage's updateTransform() method so we can update the
    // sprites from the current obj3D positions of the rigid bodies. The postUpdate()
    // methods all seem to be internal, so I'm hooking into updateTransform() because
    // that's currently called right after the P2 bodies update the positions of their
    // sprites (which is done in {Phaser.Physics.P2.Body.postUpdate()}.
    this.savedUpdateTransform = this.game.stage.updateTransform;
    this.game.stage.LB_P2Link = this;
    this.game.stage.updateTransform = this._stageUpdateTransform;
    
    this.rigidBodies = [];
};

LBPhaser.P2Link._working3DPos = LBGeometry.createVector3();
LBPhaser.P2Link._workingEuler;
LBPhaser.P2Link._workingPlane = LBGeometry.createPlane();
LBPhaser.P2Link._working3DNormal = LBGeometry.createVector3();

LBPhaser.P2Link.prototype = {
    /**
     * Adds a {@link LBPhysics.RigidBody} pair to the manager.
     * @param {object} rigidBody The rigid body.
     * @returns {LBPhaser.P2Link}   this.
     */
    addRigidBody: function(rigidBody) {
        this.rigidBodies.push(rigidBody);
        return this;
    },
    
    /**
     * Removes a rigid body link via index.
     * @param {object} rigidBody The rigid body.
     * @returns {LBPhaser.P2Link}   this.
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
     * @returns {LBPhaser.P2Link}   this.
     */
    updateFromP2: function() {
        this.rigidBodies.forEach(this._updateRigidBodyFromPhaser, this);
        return this;
    },
    
    _updateRigidBodyFromPhaser: function(rigidBody) {
        var p2Body = rigidBody[LBPhaser.P2Link.p2BodyProperty];
        if (p2Body) {
            // Phaser negates the coordinate system between P2 and {@link PHaser.Physics.P2}.
            rigidBody.setXYZ(this.phaserEnv.fromPixelsX(p2Body.x), this.phaserEnv.fromPixelsY(p2Body.y), 
                rigidBody.obj3D.position.z);
            rigidBody.setZRotationRad(this.phaserEnv.ySign * p2Body.rotation);
            rigidBody.obj3D.updateMatrixWorld();
        }
    },
    
    /**
     * Call to apply the forces from the rigid bodies to the P2 bodies.
     * @param {number} dt   The simulation time step.
     * @returns {LBPhaser.P2Link}   this.
     */
    applyToP2: function(dt) {
        this.rigidBodies.forEach(this._updateP2BodyFromLB3, { 'p2link': this, 'dt': dt });
        return this;
    },
    
    _updateP2BodyFromLB3: function(rigidBody) {
        var p2Body = rigidBody[LBPhaser.P2Link.p2BodyProperty];
        if (!p2Body) {
            return;
        }
        
        rigidBody.updateForces(this.dt);
        
        var resultant = rigidBody.getResultant(true);
        
        p2Body.mass = rigidBody.getTotalMass();
        p2Body.inertia = LBPhysics.getInertiaZZ(rigidBody.momentInertia);
        
        var x = resultant.applPoint.x - rigidBody.obj3D.position.x;
        var y = resultant.applPoint.y - rigidBody.obj3D.position.y;
        
        var pEnv = this.p2link.phaserEnv;
        resultant.force.y *= pEnv.ySign;
        
        // Phaser negates the coordinate system between P2 and {@link PHaser.Physics.P2}.
        p2Body.applyForce([-resultant.force.x, -resultant.force.y], 
            pEnv.toPixelsX(x), pEnv.toPixelsY(y));
    },
    
    /**
     * Our hook into {@link Phaser.Stage#updateTransform}.
     * @returns {undefined}
     */
    _stageUpdateTransform: function() {
        var p2Link = this.LB_P2Link;
        p2Link.savedUpdateTransform.call(this);
        
        p2Link.updateDisplayObjects();
    },
    
    /**
     * Updates any sprites that have been attached to any of the rigid bodies or their
     * parts via a property named {@link LBPhaser.P2Link.spriteProperty}.
     * @returns {undefined}
     */
    updateDisplayObjects: function() {
        this.rigidBodies.forEach(this._topUpdateDisplayObjects, this);
    },

    _topUpdateDisplayObjects: function(rigidBody) {
        this.activeRigidBody = rigidBody;
        this.activeP2Body = rigidBody[LBPhaser.P2Link.p2BodyProperty];
        
        // TEST
        var x, y;
        if (this.activeP2Body) {
            x = this.activeP2Body.x;
            y = this.activeP2Body.y;
        }
        
        this._updateDisplayObjects(rigidBody);
    },
    
    _updateDisplayObjects: function(rigidBody) {
        var sprite = rigidBody[LBPhaser.P2Link.spriteProperty];
        if (sprite) {
            this.updateSpriteFromRigidBody(rigidBody, sprite);
        }
        
        var forceArrow = rigidBody[LBPhaser.P2Link.forceArrowProperty];
        if (forceArrow) {
            this.updateForceArrowFromRigidBody(rigidBody, forceArrow);
        }
        
        rigidBody.parts.forEach(this._updateDisplayObjects, this);
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

        var pos = LBPhaser.P2Link._working3DPos;
        if (sprite.lbLocalOffset) {
            pos.copy(sprite.lbLocalOffset);
        }
        else {
            pos.zero();
        }
        obj3D.localToWorld(pos);
        var euler = Leeboard._workingEuler = obj3D.getWorldRotation(Leeboard._workingEuler);
        
        sprite.x = this.phaserEnv.toPixelsX(pos.x);
        sprite.y = this.phaserEnv.toPixelsY(pos.y);
        sprite.rotation = euler.z;
    },

    /**
     * Updates a force arrow from a rigid body's resultant. If the rigid body has
     * a 'getForceArrowResultant' member function defined, that will be called
     * to obtain the resultant, otherwise the rigid body's {@link LBPhysics.RigidBody#getResultant} method will
     * be called.
     * <p>
     * The getForceArrowResultant function has the same function signature as 
     * {@link LBPhysics.RigidBody#getResultant}.
     * @param {LBPhysics.RigidBody} rigidBody   The rigid body.
     * @param {LBPhaser.Arrow} forceArrow   The arrow object.
     * @returns {undefined}
     */
    updateForceArrowFromRigidBody: function(rigidBody, forceArrow) {
        // We want the resultant passing through the vertical (world) plane that is
        // lined up with the local X-axis and passes through the local origin.
        var plane = LBPhaser.P2Link._workingPlane;
        var normal = LBPhaser.P2Link._working3DNormal;
        var point = rigidBody.obj3D.getWorldPosition(LBPhaser.P2Link._working3DPos);
        var rotation = rigidBody.obj3D.getWorldRotation(LBPhaser.P2Link._workingEuler);
        var angle = LBMath.PI_2 + rotation.z;
        normal.set(Math.cos(angle), Math.sin(angle), 0);
        plane.setFromNormalAndCoplanarPoint(normal, point);
        
        var resultant;
        if (rigidBody.getForceArrowResultant) {
            resultant = rigidBody.getForceArrowResultant(plane);
        }
        else {
            resultant = rigidBody.getResultant(true, plane);
        }
        if (resultant) {
            forceArrow.setFromBaseAndVector(resultant.applPoint, resultant.force);
        }
    },
    
    constructor: LBPhaser.P2Link
};

/**
 * The name of the property in {LBPhysics.RigidBody} objects where we store the {Phaser.Physics.P2.Body}.
 * P2 bodies control the position of the rigid body.
 */
LBPhaser.P2Link.p2BodyProperty = "_p2Body";

/**
 * The name of the property in {LBPhysics.RigidBody} objects where we store {Phaser.Sprite} or {Phaser.Image}
 * objects. Sprite/image objects are controlled by the rigid body's world position and rotation.
 */
LBPhaser.P2Link.spriteProperty = "_sprite";

/**
 * The name of the property in {LBPhysics.RigidBody} objects where we store {@link LBPhaser.P2ForceArrow} objects.
 */
LBPhaser.P2Link.forceArrowProperty = "_forceArrow";

/**
 * Retrieves the appropriate tie step to use based on the settings of {@link Phaser.Physics.P2}.
 * @param {Phaser.Physics.P2} p2    The P2 physics object.
 * @returns {number}    The time step.
 */
LBPhaser.P2Link.getP2TimeStep = function(p2) {
    return p2.useElapsedTime ? p2.game.time.physicsElapsed : p2.frameRate;
};

/**
 * Creates and loads a {Phaser.Sprite} object based on properties in a data object.
 * @param {Phaser.Game} game    The game to which the sprite will belong.
 * @param {object} data The data object.
 * @returns {Phaser.Sprite} Th created/loaded sprite.
 */
LBPhaser.P2Link.createSpriteFromData = function(game, data) {
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
LBPhaser.P2Link.createImageFromData = function(game, data) {
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
LBPhaser.P2Link.createP2BodyFromData = function(game, data) {
    var sprite = LBPhaser.P2Link.createSpriteFromData(game, data.sprite);
    sprite.game.physics.enable(sprite, Phaser.Physics.P2JS);
    sprite.body.collideWorldBounds = true;

    var p2Body = sprite.body;
    p2Body.mass = data.mass || p2Body.mass;

    Leeboard.copyCommonProperties(p2Body, data.p2Body, function(val) {
        return val !== 'sprite';
    });
    
    return p2Body;
};

