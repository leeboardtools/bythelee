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


define(['lbutil', 'lbgeometry', 'lbphysics', 'cannon'],
function(LBUtil, LBGeometry, LBPhysics, CANNON) {

    'use strict';

/**
 * Some utilities for working with the {@link http://schteppe.github.io/cannon.js|cannon.js} physics engine.
 * @exports LBCannonUtil
 */
var LBCannonUtil = LBCannonUtil || {};

LBCannonUtil._workingVector3 = new LBGeometry.Vector3();

/**
 * A proxy for {@link http://schteppe.github.io/cannon.js/docs/classes/Vec3.html|CANNON.Vec3} that
 * links it to a {@link module:LBGeometry.Vector3} and utilizes the {@link module:LBGeometry.Vector3} as the
 * underlying storage object.
 * <p>
 * Note that for any given {@link module:LBGeometry.Vector3} there should be only one proxy.
 * @private
 * @constructor
 * @param {module:LBGeometry.Vector3} [vector3=new LBGeometry.Vector3()]    The underlying {@link module:LBGeometry.Vector3} object.
 * @param {module:LBGeometry.Vector3} [offset=LBGeometry.ORIGIN]  The underlying offset added 
 * to the underlying vector3 to get the Cannon coordinates.
 * @returns {module:LBCannonUtil.Vec3Proxy}
 */
LBCannonUtil.Vec3Proxy = function(vector3, offset) {
    this.vector3 = LBCannonUtil._workingVector3;
    this._cannonOffset = offset || LBGeometry.ORIGIN;
    
    // Need to pass in the current values of this.vector3 so they don't get overwritten.
    CANNON.Vec3.call(this, this.vector3.x, this.vector3.y, this.vector3.z);

    /**
     * The underlying {@link module:LBGeometry.Vector3}.
     */
    this.vector3 = vector3 || new LBGeometry.Vector3();

    this.vector3._cannonVec3Proxy = this;
};

LBCannonUtil.Vec3Proxy.prototype = Object.create(CANNON.Vec3.prototype);
LBCannonUtil.Vec3Proxy.prototype.constructor = LBCannonUtil.Vec3Proxy;
Object.defineProperty(LBCannonUtil.Vec3Proxy.prototype, 'x', {
    get: function() {
        return this.vector3.x + this._cannonOffset.x;
    },
    set: function(val) {
        this.vector3.x = val - this._cannonOffset.x;
        return val;
    }
});

Object.defineProperty(LBCannonUtil.Vec3Proxy.prototype, 'y', {
    get: function() {
        return this.vector3.y + this._cannonOffset.y;
    },
    set: function(val) {
        this.vector3.y = val - this._cannonOffset.y;
        return val;
    }
});

Object.defineProperty(LBCannonUtil.Vec3Proxy.prototype, 'z', {
    get: function() {
        return this.vector3.z + this._cannonOffset.z;
    },
    set: function(val) {
        this.vector3.z = val - this._cannonOffset.z;
        return val;
    }
});


/**
 * Applies a 4x4 transform matrix to the point.
 * @param {module:LBGeometry.Matrix4} xfrm The transform matrix.
 * @returns {undefined}
 */
LBCannonUtil.Vec3Proxy.prototype.transformProxy = function(xfrm) {
    this.vector3.applyMatrix4(xfrm);
    this._cannonOffset.applyMatrix4(xfrm);
};

/**
 * Call when done with the object to have it release any internal references
 * to other objects to help with garbage collection.
 * @returns {undefined}
 */
LBCannonUtil.Vec3Proxy.prototype.destroy = function() {
    this.vector3 = null;
    this._cannonOffset = null;
};


/**
 * Retrieves the proxy associated with an {@link module:LBGeometry.Vector3}, creating one
 * if necessary.
 * @param {module:LBGeometry.Vector3} vector3  The vector3 object, may be undefined.
 * @param {module:LBGeometry.Vector3} [offset=LBGeometry.ORIGIN]  The underlying offset added 
 * to the underlying vector3 to get the Cannon coordinates.
 * @returns {undefined|LBCannonUtil.Vec3Proxy}  The proxy, undefined if vector3 is undefined.
 */
LBCannonUtil.Vec3Proxy.getProxy = function(vector3, offset) {
    if (!vector3) {
        return undefined;
    }
    if (vector3._cannonVec3Proxy) {
        return vector3._cannonVec3Proxy;
    }
    return new LBCannonUtil.Vec3Proxy(vector3, offset);
};


LBCannonUtil._workingMatrix4A = new LBGeometry.Matrix4();
LBCannonUtil._workingMatrix4B = new LBGeometry.Matrix4();

/**
 * Adds volumes as shapes to a {@link http://schteppe.github.io/cannon.js/docs/classes/Body.html|CANNON.Body}.
 * Once volumes have been added to a body, {@link module:LBCannonUtil.updateBodyCenterOfMass} should be called
 * to properly align the body's center of mass with the origin.
 * @param {CANNON.Body} body    The body to add the tetras to.
 * @param {module:LBVolume.Volume[]} volumes The array of tetras to be added.
 * @param {module:LBGeometry.Matrix4}  [volToBodyXfrm] If defined the transform to apply to
 * each vertex to bring it to the coordinate system of the body.
 * @returns {CANNON.Body}   body.
 */
LBCannonUtil.addVolumesToBody = function(body, volumes, volToBodyXfrm) {
    var offset = LBCannonUtil._workingVector3;
    
    for (var i = 0; i < volumes.length; ++i) {
        var tv = volumes[i].vertices;
        
        // It looks like Cannon expects shapes to be centered on their origin (based
        // on the way CANNON.ConvexPolyhedron#computeNormals() checks the face normals
        // for pointing in the proper direction.
        // What we end up doing is offsetting the vertex coordinates by the centroid
        // via the {@link module:LBCannonUtil.Vec3Proxy} before we pass the vertices to
        // {@link http://schteppe.github.io/cannon.js/docs/classes/ConvexPolyhedron.hmtl|CANNON.ConvexPolyhedron}
        // this way they have the origin at their center. Then, when we add the
        // shape to the body, we offset the shape by the centroid location.
        var centerOffset = volumes[i].getCentroid();
        offset.copy(centerOffset);
        centerOffset.negate();
        
        var vertices = [];
        for (var j = 0; j < tv.length; ++j) {
            // Unfortunately, because of the center offsets we need to clone each vertex...
            vertices.push(new LBCannonUtil.Vec3Proxy(tv[j].clone(), centerOffset));
        }
        if (volToBodyXfrm) {
            vertices.forEach(function(vertex) {
                vertex.transformProxy(volToBodyXfrm);
            });
        }
        
        var shape = new CANNON.ConvexPolyhedron(vertices, volumes[i].getFaces());
        shape._lbVolume = volumes[i];
        shape._lbCenterOffset = centerOffset;
        volumes[i]._lbCannonShape = shape;
        
        if (volumes[i].mass) {
            body.mass += volumes[i].mass;
        }
        body.addShape(shape, offset);
    }
    return body;
};


/**
 * Updates the center of mass of a body. The local origin of the body is the center of mass.
 * @param {CANNON.Body} body    The Cannon body.
 * @param {module:LBGeometry.Vector3} centerOfMass The position of the center of mass.
 * @param {Number}  [mass]  The mass, if undefined the mass will not be modified.
 * @param {module:LBGeometry.Matrix3}  [inertia]   The inertia, if undefined the inertia computed
 * by the Cannon body will be used.
 * @returns {CANNON.Body}   body.
 */
LBCannonUtil.updateBodyCenterOfMass = function(body, centerOfMass, mass, inertia) {
    if (LBUtil.isVar(mass)) {
        body.mass = mass;
    }
    
    for (var i = 0; i < body.shapes.length; ++i) {
        var shape = body.shapes[i];
        if (shape._lbVolume && (shape._lbVolume.mass > 0)) {
            var centerOffset = shape._lbCenterOffset;
            body.shapeOffsets[i].x = -centerOfMass.x - centerOffset.x;
            body.shapeOffsets[i].y = -centerOfMass.y - centerOffset.y;
            body.shapeOffsets[i].z = -centerOfMass.z - centerOffset.z;
        }
    }
    
    body.position.x += centerOfMass.x;
    body.position.y += centerOfMass.y;
    body.position.z += centerOfMass.z;
    
    body.updateMassProperties();
    
    if (inertia) {
        var I = body.inertia;
        I.x = LBPhysics.getInertiaXX(inertia);
        I.y = LBPhysics.getInertiaYY(inertia);
        I.z = LBPhysics.getInertiaZZ(inertia);
        body.invInertia.set(
            I.x > 0 ? 1.0 / I.x : 0,
            I.y > 0 ? 1.0 / I.y : 0,
            I.z > 0 ? 1.0 / I.z : 0
        );
        body.updateInertiaWorld(true);
    }
    
    return body;
};

LBCannonUtil.addRigidBodyVolumesToBody = function(body, rigidBody) {
    LBCannonUtil.addVolumesToBody(body, rigidBody.volumes);

/*    var worldToBody = LBCannonUtil._workingMatrix4A;
    rigidBody.obj3D.matrixWorld.getInverse(worldToBody);
    var xfrm = LBCannonUtil._workingMatrix4B;
    rigidBody.parts.forEach(function(part) {
        if (!part.volumes || (part.volumes.length === 0)) {
            return;
        }
        xfrm.copy(part.obj3D.matrixWorld);
        xfrm.multiply(worldToBody);
        LBCannonUtil.addVolumesToBody(body, part.volumes, xfrm);
    });
*/    
    LBCannonUtil.updateBodyCenterOfMass(body, rigidBody.centerOfMass, rigidBody.mass, rigidBody.momentInertia);    
};

LBCannonUtil.updateBodyFromRigidBodyVolumes = function(body, rigidBody) {
    if (rigidBody.linearDamping !== undefined) {
        body.linearDamping = rigidBody.linearDamping;
    }
    if (rigidBody.angularDamping !== undefined) {
        body.angularDamping = rigidBody.angularDamping;
    }
//    LBCannonUtil.updateBodyCenterOfMass(body, rigidBody.centerOfMass, rigidBody.mass);//, rigidBody.momentInertia);    
};

return LBCannonUtil;
});
