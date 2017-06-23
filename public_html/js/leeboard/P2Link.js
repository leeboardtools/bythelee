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


/* global Leeboard, Phaser, LBPhysics, LBGeometry, LBMath */

/**
 * Manages linking a {@link Phaser.Physics.P2.Body} and a {@link LBPhysics.RigidBody}, updating
 * the position/rotation of the rigid body from the P2 body and applying the forces
 * from the rigid body to the P2 body. This also supports displaying an arrow representing
 * the resultant force on rigid bodies.
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
};

Leeboard.P2Link._working3DPos = LBGeometry.createVector3();
Leeboard.P2Link._workingEuler;
Leeboard.P2Link._workingPlane = LBGeometry.createPlane();
Leeboard.P2Link._working3DNormal = LBGeometry.createVector3();

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
     * Scales an x value in rigid body coordinates to pixel coordinates.
     * @param {number} x    The x coordinate.
     * @returns {Number}    The pixel equivalent.
     */
    rbToPixelsX: function(x) {
        return -this.game.physics.p2.mpxi(x);
    },
     
    /**
     * Scales an y value in rigid body coordinates to pixel coordinates.
     * @param {number} y    The y coordinate.
     * @returns {Number}    The pixel equivalent.
     */
    rbToPixelsY: function(y) {
        return -this.ySign * this.game.physics.p2.mpxi(y);
    },
       
    /**
     * Scales an x value in pixel coordinates to rigid body coordinates.
     * @param {number} px    The pixels x coordinate.
     * @returns {Number}    The rigid body equivalent.
     */
    pixelsToRBX: function(px) {
        return -this.game.physics.p2.pxmi(px);
    },
           
    /**
     * Scales a y value in pixel coordinates to rigid body coordinates.
     * @param {number} py    The pixels y coordinate.
     * @returns {Number}    The rigid body equivalent.
     */
    pixelsToRBY: function(py) {
        return -this.ySign * this.game.physics.p2.pxmi(py);
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
        
        resultant.force.y *= this.p2link.ySign;
        
        // Phaser negates the coordinate system between P2 and {@link PHaser.Physics.P2}.
        p2Body.applyForce([-resultant.force.x, -resultant.force.y], 
            p2Body.world.mpxi(-x), p2Body.world.mpxi(-this.p2link.ySign * y));
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
     * parts via a property named {@link Leeboard.P2Link.spriteProperty}.
     * @returns {undefined}
     */
    updateDisplayObjects: function() {
        this.rigidBodies.forEach(this._topUpdateDisplayObjects, this);
    },

    _topUpdateDisplayObjects: function(rigidBody) {
        this.activeRigidBody = rigidBody;
        this.activeP2Body = rigidBody[Leeboard.P2Link.p2BodyProperty];
        
        // TEST
        var x, y;
        if (this.activeP2Body) {
            x = this.activeP2Body.x;
            y = this.activeP2Body.y;
        }
        
        this._updateDisplayObjects(rigidBody);
    },
    
    _updateDisplayObjects: function(rigidBody) {
        var sprite = rigidBody[Leeboard.P2Link.spriteProperty];
        if (sprite) {
            this.updateSpriteFromRigidBody(rigidBody, sprite);
        }
        
        var forceArrow = rigidBody[Leeboard.P2Link.forceArrowProperty];
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

        var pos = Leeboard.P2Link._working3DPos;
        if (sprite.lbLocalOffset) {
            pos.copy(sprite.lbLocalOffset);
        }
        else {
            pos.zero();
        }
        obj3D.localToWorld(pos);
        var euler = Leeboard._workingEuler = obj3D.getWorldRotation(Leeboard._workingEuler);
        
        sprite.x = this.rbToPixelsX(pos.x);
        sprite.y = this.rbToPixelsY(pos.y);
        sprite.rotation = euler.z;
    },

    updateForceArrowFromRigidBody: function(rigidBody, forceArrow) {
        // We want the resultant passing through the vertical (world) plane that is
        // lined up with the local X-axis and passes through the local origin.
        var plane = Leeboard.P2Link._workingPlane;
        var normal = Leeboard.P2Link._working3DNormal;
        var point = rigidBody.obj3D.getWorldPosition(Leeboard.P2Link._working3DPos);
        var rotation = rigidBody.obj3D.getWorldRotation(Leeboard.P2Link._workingEuler);
        var angle = LBMath.PI_2 + rotation.z;
        normal.set(Math.cos(angle), Math.sin(angle), 0);
        plane.setFromNormalAndCoplanarPoint(normal, point);
        
        var resultant = rigidBody.getResultant(true, plane);
        forceArrow.updateForce(resultant.force, resultant.applPoint);
    },

    scaleForceArrow: function(forceMag) {
        return forceMag * 0.1;
    },

    getForceArrowAlpha: function() {
        return 1;
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
 * The name of the property in {LBPhysics.RigidBody} objects where we store {@link Leeboard.P2ForceArrow} objects.
 */
Leeboard.P2Link.forceArrowProperty = "_forceArrow";

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


Leeboard.P2ForceArrow = function(p2Link, color, width, arrowSize) {
    this.p2Link = p2Link;
    this.graphics = p2Link.game.add.graphics(0, 0, p2Link.worldGroup);
    this.color = color;
    this.width = width || 2;
    this.arrowSize = arrowSize || 20;
};

Leeboard.P2ForceArrow.prototype = {
    updateForce: function(force, applPoint) {
        var g = this.graphics;
        g.clear();
        
        var length = force.length();
        if (LBMath.isLikeZero(length)) {
            return;
        }
        var dx = force.x / length;
        var dy = force.y / length;
        length = this.p2Link.scaleForceArrow(length);
        
        var alpha = this.p2Link.getForceArrowAlpha();
        
        g.lineStyle(this.width, this.color, alpha);
        
        var baseX = this.p2Link.rbToPixelsX(applPoint.x);
        var baseY = this.p2Link.rbToPixelsY(applPoint.y); 
        g.moveTo(baseX, baseY);
        
        dx = this.p2Link.rbToPixelsX(dx * length);
        dy = this.p2Link.rbToPixelsY(dy * length);
        length = Math.sqrt(dx * dx + dy * dy);
        
        var tipX = baseX + dx;
        var tipY = baseY + dy;
        g.lineTo(tipX, tipY);
        
        var arrowSize = Math.min(this.arrowSize, length * 0.707);
        
        var endX = -dy - dx;
        var endY = dx - dy;
        var endLen = Math.sqrt(endX * endX + endY * endY);
        endX = arrowSize * endX / endLen;
        endY = arrowSize * endY / endLen;
        g.lineTo(tipX + endX, tipY + endY);
        
        endX = dy - dx;
        endY = -dx - dy;
        endLen = Math.sqrt(endX * endX + endY * endY);
        endX = arrowSize * endX / endLen;
        endY = arrowSize * endY / endLen;

        g.moveTo(tipX, tipY);
        g.lineTo(tipX + endX, tipY + endY);
    },
    
    constructor: Leeboard.P2ForceArrow
};
