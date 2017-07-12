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


/* global CANNON, LBGeometry, LBMath, Leeboard, LBPhysics */

/**
 * @namespace LBCannon
 */
var LBCannon = LBCannon || {};

LBCannon._workingVector3 = new LBGeometry.Vector3();

/**
 * A proxy for {@link http://schteppe.github.io/cannon.js/docs/classes/Vec3.html|CANNON.Vec3} that
 * links it to a {@link LBGeometry.Vector3} and utilizes the {@link LBGeometry.Vector3} as the
 * underlying storage object.
 * <p>
 * Note that for any given {@link LBGeometry.Vector3} there should be only one proxy.
 * @private
 * @constructor
 * @param {LBGeometry.Vector3} [vector3=new LBGeometry.Vector3()]    The underlying {@link LBGeometry.Vector3} object.
 * @param {LBGeometry.Vector3} [offset=LBGeometry.ORIGIN]  The underlying offset added 
 * to the underlying vector3 to get the Cannon coordinates.
 * @returns {LBCannon.Vec3Proxy}
 */
LBCannon.Vec3Proxy = function(vector3, offset) {
    this.vector3 = LBCannon._workingVector3;
    this._cannonOffset = offset || LBGeometry.ORIGIN;
    
    // Need to pass in the current values of this.vector3 so they don't get overwritten.
    CANNON.Vec3.call(this, this.vector3.x, this.vector3.y, this.vector3.z);

    /**
     * The underlying {@link LBGeometry.Vector3}.
     */
    this.vector3 = vector3 || new LBGeometry.Vector3();

    this.vector3._cannonVec3Proxy = this;
};

LBCannon.Vec3Proxy.prototype = Object.create(CANNON.Vec3.prototype);
LBCannon.Vec3Proxy.prototype.constructor = LBCannon.Vec3Proxy;
Object.defineProperty(LBCannon.Vec3Proxy.prototype, 'x', {
    get: function() {
        return this.vector3.x + this._cannonOffset.x;
    },
    set: function(val) {
        this.vector3.x = val - this._cannonOffset.x;
        return val;
    }
});

Object.defineProperty(LBCannon.Vec3Proxy.prototype, 'y', {
    get: function() {
        return this.vector3.y + this._cannonOffset.y;
    },
    set: function(val) {
        this.vector3.y = val - this._cannonOffset.y;
        return val;
    }
});

Object.defineProperty(LBCannon.Vec3Proxy.prototype, 'z', {
    get: function() {
        return this.vector3.z + this._cannonOffset.z;
    },
    set: function(val) {
        this.vector3.z = val - this._cannonOffset.z;
        return val;
    }
});

/**
 * Retrieves the proxy associated with an {@link LBGeometry.Vector3}, creating one
 * if necessary.
 * @param {LBGeometry.Vector3} vector3  The vector3 object, may be undefined.
 * @param {LBGeometry.Vector3} [offset=LBGeometry.ORIGIN]  The underlying offset added 
 * to the underlying vector3 to get the Cannon coordinates.
 * @returns {undefined|LBCannon.Vec3Proxy}  The proxy, undefined if vector3 is undefined.
 */
LBCannon.Vec3Proxy.getProxy = function(vector3, offset) {
    if (!vector3) {
        return undefined;
    }
    if (vector3._cannonVec3Proxy) {
        return vector3._cannonVec3Proxy;
    }
    return new LBCannon.Vec3Proxy(vector3, offset);
};

LBCannon._tetraFaces = [
    [0, 1, 2],
    [0, 2, 3],
    [0, 3, 1],
    [1, 3, 2]
];

/**
 * Adds volumes as shapes to a {@link http://schteppe.github.io/cannon.js/docs/classes/Body.html|CANNON.Body}.
 * Once volumes have been added to a body, {@link LBCannon.updateBodyCenterOfMass} should be called
 * to properly align the body's center of mass with the origin.
 * @param {CANNON.Body} body    The body to add the tetras to.
 * @param {LBVolume.Volume[]} volumes The array of tetras to be added.
 * @returns {CANNON.Body}   body.
 */
LBCannon.addVolumesToBody = function(body, volumes) {
    var offset = LBCannon._workingVector3;
    
    for (var i = 0; i < volumes.length; ++i) {
        var tv = volumes[i].vertices;
        
        // It looks like Cannon expects shapes to be centered on their origin (based
        // on the way CANNON.ConvexPolyhedron#computeNormals() checks the face normals
        // for pointing in the proper direction.
        // What we end up doing is offsetting the vertex coordinates by the centroid
        // via the {@link LBCannon.Vec3Proxy} before we pass the vertices to
        // {@link http://schteppe.github.io/cannon.js/docs/classes/ConvexPolyhedron.hmtl|CANNON.ConvexPolyhedron}
        // this way they have the origin at their center. Then, when we add the
        // shape to the body, we offset the shape by the centroid location.
        var centerOffset = volumes[i].centroid();
        offset.copy(centerOffset);
        centerOffset.negate();
        
        var vertices = [];
        for (var j = 0; j < tv.length; ++j) {
            // Unfortunately, because of the center offsets we need to clone each vertex...
            vertices.push(new LBCannon.Vec3Proxy(tv[j].clone(), centerOffset));
        }
        
        var shape = new CANNON.ConvexPolyhedron(vertices, volumes[i].faces());
        shape._lbVolume = volumes[i];
        shape._lbCenterOffset = centerOffset;
        
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
 * @param {LBGeometry.Vector3} centerOfMass The position of the center of mass.
 * @param {Number}  [mass]  The mass, if undefined the mass will not be modified.
 * @param {LBGeometry.Matrix3}  [inertia\   The inertia, if undefined the inertia computed
 * by the Cannon body will be used.
 * @returns {CANNON.Body}   body.
 */
LBCannon.updateBodyCenterOfMass = function(body, centerOfMass, mass, inertia) {
    if (Leeboard.isVar(mass)) {
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
        I.z = LBPhysics.getInertiaXZ(inertia);
        body.invInertia.set(
            I.x > 0 ? 1.0 / I.x : 0,
            I.y > 0 ? 1.0 / I.y : 0,
            I.z > 0 ? 1.0 / I.z : 0
        );
        body.updateInertiaWorld(true);
    }
    
    return body;
};