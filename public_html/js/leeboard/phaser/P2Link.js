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


define(['lbphaserutil', 'lbutil', 'lbgeometry', 'lbphysics', 'phaser', 'lbphysicslink'],
function(LBPhaser, LBUtil, LBGeometry, LBPhysics, Phaser, LBPhysicsLink) {

    'use strict';


/**
 * Manages linking a {@link https://photonstorm.github.io/phaser-ce/Phaser.Physics.P2.Body|Phaser.Physics.P2.Body} and a {@link LBPhysics.RigidBody}, updating
 * the position/rotation of the rigid body from the P2 body and applying the forces
 * from the rigid body to the P2 body. This also supports displaying an arrow representing
 * the resultant force on rigid bodies.
 * @constructor
 * @extends LBPhysics.PhysicsLink
 * @param {LBPhaser.Env} phaserEnv The Phaser environment we're running under.
 * @returns {LBPhaser.P2Link}
 */
LBPhaser.P2Link = function(phaserEnv) {
    LBPhysics.PhysicsLink.call(this);
    this.phaserEnv = phaserEnv;
    this.game = phaserEnv.game;
    
    this.game.physics.startSystem(Phaser.Physics.P2JS);
    this.game.physics.p2.world.applyGravity = false;
    
    this.fixedObjectCollisionGroup = this.game.physics.p2.createCollisionGroup();
    this.dynamicObjectCollisionGroup = this.game.physics.p2.createCollisionGroup();
};


LBPhaser.P2Link.prototype = Object.create(LBPhysics.PhysicsLink.prototype);
LBPhaser.P2Link.prototype.constructor = LBPhaser.P2Link;

LBPhaser.P2Link.prototype.addFixedPhaserObject = function(object) {
    this.game.physics.p2.enable(object);
    object.body.allowGravity = false;
    object.body.static = true;
    
    object.body.setCollisionGroup(this.fixedObjectCollisionGroup);
    object.body.collides(this.dynamicObjectCollisionGroup);
    return this;
};

// @inheritdoc..
LBPhaser.P2Link.prototype.addRigidBody = function(rigidBody, data) {
    LBPhysics.PhysicsLink.prototype.addRigidBody.call(this, rigidBody);
    
    var p2Body = LBPhaser.P2Link.createP2BodyFromData(this.game, data.phaser);
    rigidBody._lbP2Body = p2Body;
    p2Body.damping = 0;
    
    if (rigidBody.xyOutline && (rigidBody.xyOutline.length > 2)) {        
        var xy = [];
        var env = this.phaserEnv;
        
        var iBegin;
        var iEnd;
        var iDelta;
        // We're presuming the outline is convex...
        if (LBGeometry.whichSideOfLine(rigidBody.xyOutline[0], rigidBody.xyOutline[1], rigidBody.xyOutline[2]) === LBGeometry.LINE_SIDE_RIGHT) {
            // Going clockwise...
            iBegin = rigidBody.xyOutline.length - 1;
            iEnd = -1;
            iDelta = -1;
        }
        else {
            iBegin = 0;
            iEnd = rigidBody.xyOutline.length;
            iDelta = 1;
        }
        
        for (var i = iBegin; i !== iEnd; i += iDelta) {
            xy.push([rigidBody.xyOutline[i].x, rigidBody.xyOutline[i].y]);
        }
        
        var convex = new p2.Convex({ vertices: xy });
        p2Body.clearShapes();
        
        var offsetX = env.toPixelsX(convex.centerOfMass[0]);
        var offsetY = env.toPixelsY(convex.centerOfMass[1]);
        var sprite = p2Body.sprite;
        if (sprite) {
            offsetX += (0.5 - sprite.anchor.x) * sprite.width;
            offsetY += (0.5 - sprite.anchor.y) * sprite.height;
        }
        p2Body.addShape(convex, offsetX, offsetY);
    }
    
    p2Body.setCollisionGroup(this.dynamicObjectCollisionGroup);
    p2Body.collides(this.fixedObjectCollisionGroup);

    p2Body.x = this.phaserEnv.toPixelsX(rigidBody.obj3D.position.x);
    p2Body.y = this.phaserEnv.toPixelsY(rigidBody.obj3D.position.y);
    p2Body.rotation = this.phaserEnv.toPixelsRotationRad(rigidBody.obj3D.rotation.z);
 };

// @inheritdoc..
LBPhaser.P2Link.prototype._rigidBodyRemoved = function(rigidBody) {
    if (rigidBody._lbP2Body) {
        rigidBody._lbP2Body.world.removeBody(rigidBody._lbP2Body);
        rigidBody._lbP2Body = undefined;
    }
};

// @inheritdoc..
LBPhaser.P2Link.prototype.timeStep = function() {
    var p2 = this.game.physics.p2;
    return p2.useElapsedTime ? p2.game.time.physicsElapsed : p2.frameRate;
};

// @inheritdoc..
LBPhaser.P2Link.prototype.update = function(dt) {
    this._updateFromP2();
    this._applyToP2(dt);
    ++this.updateCount;
};

/**
 * Called by {@link LBPhaser.P2Link#update} to update the rigid bodies from the P2 bodies. 
 * This updates the position and orientation of the rigid body from that of the linked P2 body.
 * @protected
 * @returns {LBPhaser.P2Link}   this.
 */
LBPhaser.P2Link.prototype._updateFromP2 = function() {
    this.rigidBodies.forEach(this._updateRigidBodyFromPhaser, this);
    return this;
};
    
LBPhaser.P2Link.prototype._updateRigidBodyFromPhaser = function(rigidBody) {
    var p2Body = rigidBody._lbP2Body;
    if (p2Body) {
        // Phaser negates the coordinate system between P2 and {@link PHaser.Physics.P2}.
        rigidBody.setXYZ(this.phaserEnv.fromPixelsX(p2Body.x), this.phaserEnv.fromPixelsY(p2Body.y), 
            rigidBody.obj3D.position.z);
        rigidBody.setZRotationRad(this.phaserEnv.ySign * p2Body.rotation, true);
        rigidBody.obj3D.updateMatrixWorld();
    }
};

/**
 * Called by {@link LBPhaser.P2Link#update} to apply the forces from the rigid bodies to the P2 bodies.
 * @protected
 * @param {Number} dt   The simulation time step.
 * @returns {LBPhaser.P2Link}   this.
 */
LBPhaser.P2Link.prototype._applyToP2 = function(dt) {
    this.rigidBodies.forEach(this._updateP2BodyFromLB3, { 'p2link': this, 'dt': dt });
    return this;
};

LBPhaser.P2Link.prototype._updateP2BodyFromLB3 = function(rigidBody) {
    var p2Body = rigidBody._lbP2Body;
    if (!p2Body) {
        return;
    }

    rigidBody.updateForces(this.dt);

    var resultant = rigidBody.getResultant(true);

    var mass = rigidBody.getTotalMass();
    if ((mass > 0) && (mass !== p2Body.mass)) {
        p2Body.mass = mass;
        p2Body.invMass = 1./mass;
        p2Body.data.mass = mass;
        p2Body.data.invMass = p2Body.invMass;
    }

    var inertia = LBPhysics.getInertiaZZ(rigidBody.momentInertia);
    if ((inertia > 0) && (inertia !== p2Body.inertia)) {
        p2Body.inertia = inertia;
        p2Body.invInertia = 1./inertia;
        p2Body.data.inertia = p2Body.inertia;
        p2Body.data.invInertia = p2Body.invInertia;
        p2Body.data.updateSolveMassProperties();
    }

    var x = resultant.applPoint.x - rigidBody.obj3D.position.x;
    var y = resultant.applPoint.y - rigidBody.obj3D.position.y;

    var pEnv = this.p2link.phaserEnv;
    resultant.force.y *= pEnv.ySign;

    // Phaser negates the coordinate system between P2 and {@link PHaser.Physics.P2}.
    p2Body.applyForce([-resultant.force.x, -resultant.force.y], 
        pEnv.toPixelsX(x), pEnv.toPixelsY(y));
};

    
/**
 * Creates and loads a {https://photonstorm.github.io/phaser-ce/Phaser.Physics.P2.Body|Phaser.Physics.P2.Body} object based on properties in a data object.
 * @param {Phaser.Game} game    The game to which the body will belong.
 * @param {object} data The data object.
 * @returns {Phaser.Physics.P2.Body}    The created/loaded body.
 */
LBPhaser.P2Link.createP2BodyFromData = function(game, data) {
    var sprite = LBPhaser.PhysicsView.createSpriteFromData(game, data.sprite);
    
    // Enabling P2 physics resets the anchor to 0.5, 0.5
    var anchorX = sprite.anchor.x;
    var anchorY = sprite.anchor.y;
    sprite.game.physics.enable(sprite, Phaser.Physics.P2JS);
    sprite.anchor.x = anchorX;
    sprite.anchor.y = anchorY;
    
    sprite.body.collideWorldBounds = true;

    var p2Body = sprite.body;
    p2Body.mass = data.mass || p2Body.mass;
    p2Body.clearShapes();
    p2Body.addRectangle(sprite.width, sprite.height, (0.5 - anchorX) * sprite.width, (0.5 - anchorY) * sprite.height);

    LBUtil.copyCommonProperties(p2Body, data.p2Body, function(val) {
        return val !== 'sprite';
    });
    
    return p2Body;
};

/**
 * Helper that retrieves the P2 body associated with a rigid body object.
 * @param {LBPhysics.RigidBody} object  The rigid body object.
 * @returns {Phaser.Physics.P2.Body}    The P2 body, undefined if none assigned.
 */
LBPhaser.P2Link.getP2Body = function(object) {
    return object._lbP2Body;
};

return LBPhaser;
});