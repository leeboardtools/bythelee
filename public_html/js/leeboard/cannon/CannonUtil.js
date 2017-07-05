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


/* global CANNON, LBGeometry, LBMath, Leeboard */

/**
 * @namespace LBCannon
 */
var LBCannon = LBCannon || {};

/**
 * A proxy for {@link http://schteppe.github.io/cannon.js/docs/classes/Vec3.html|CANNON.Vec3} that
 * links it to a {@link LBGeometry.Vector3} and utilizes the {@link LBGeometry.Vector3} as the
 * underlying storage object.
 * <p>
 * Note that for any given {@link LBGeometry.Vector3} there should be only one proxy.
 * @private
 * @constructor
 * @param {LBGeometry.Vector3} [vector3=new LBGeometry.Vector3()]    The underlying {@link LBGeometry.Vector3} object.
 * @returns {LBCannon.Vec3Proxy}
 */
LBCannon.Vec3Proxy = function(vector3) {
    /**
     * The underlying {@link LBGeometry.Vector3}.
     */
    this.vector3 = vector3 || new LBGeometry.Vector3();
    
    // Need to pass in the current values of this.vector3 so they don't get overwritten.
    CANNON.Vec3.call(this, this.vector3.x, this.vector3.y, this.vector3.z);

    this.vector3._cannonVec3Proxy = this;
};

LBCannon.Vec3Proxy.prototype = Object.create(CANNON.Vec3.prototype);
LBCannon.Vec3Proxy.prototype.constructor = LBCannon.Vec3Proxy;
Object.defineProperty(LBCannon.Vec3Proxy.prototype, 'x', {
    get: function() {
        return this.vector3.x;
    },
    set: function(val) {
        this.vector3.x = val;
        return val;
    }
});

Object.defineProperty(LBCannon.Vec3Proxy.prototype, 'y', {
    get: function() {
        return this.vector3.y;
    },
    set: function(val) {
        this.vector3.y = val;
        return val;
    }
});

Object.defineProperty(LBCannon.Vec3Proxy.prototype, 'z', {
    get: function() {
        return this.vector3.z;
    },
    set: function(val) {
        this.vector3.z = val;
        return val;
    }
});

/**
 * Retrieves the proxy associated with an {@link LBGeometry.Vector3}, creating one
 * if necessary.
 * @param {LBGeometry.Vector3} vector3  The vector3 object, may be undefined.
 * @returns {undefined|LBCannon.Vec3Proxy}  The proxy, undefined if vector3 is undefined.
 */
LBCannon.Vec3Proxy.getProxy = function(vector3) {
    if (!vector3) {
        return undefined;
    }
    if (vector3._cannonVec3Proxy) {
        return vector3._cannonVec3Proxy;
    }
    return new LBCannon.Vec3Proxy(vector3);
};

LBCannon._tetraFaces = [
    [0, 1, 2],
    [0, 2, 3],
    [0, 3, 1],
    [1, 3, 2]
];

/**
 * Adds tetras as shapes to a {@link http://schteppe.github.io/cannon.js/docs/classes/Body.html|CANNON.Body}.
 * Once tetras have been added to a body, {@link LBCannon.updateBodyCenterOfMass} should be called
 * to properly align the body's center of mass with the origin.
 * @param {CANNON.Body} body    The body to add the tetras to.
 * @param {LBVolume.Tetra[]} tetras The array of tetras to be added.
 * @returns {CANNON.Body}   body.
 */
LBCannon.addTetrasToBody = function(body, tetras) {
    for (var i = 0; i < tetras.length; ++i) {
        var tv = tetras[i].vertices;
        var vertices = [];
        for (var j = 0; j < 4; ++j) {
            vertices.push(LBCannon.Vec3Proxy.getProxy(tv[j]));
        }
        
        var shape = new CANNON.ConvexPolyhedron(vertices, LBCannon._tetraFaces);
        shape._lbTetra = tetras[i];
        body.addShape(shape);
    }
    return body;
};

/**
 * Updates the center of mass of a body. The local origin of the body is the center of mass.
 * @param {CANNON.Body} body    The Cannon body.
 * @param {LBGeometry.Vector3} centerOfMass The position of the center of mass.
 * @param {Number}  [mass]  The mass, if undefined the mass will not be modified.
 * @returns {CANNON.Body}   body.
 */
LBCannon.updateBodyCenterOfMass = function(body, centerOfMass, mass) {
    if (Leeboard.isVar(mass)) {
        body.mass = mass;
    }
    
    for (var i = 0; i < body.shapes.length; ++i) {
        var shape = body.shapes[i];
        if (shape._lbTetra && (shape._lbTetra.mass > 0)) {
            body.shapeOffsets[i].x = -centerOfMass.x;
            body.shapeOffsets[i].y = -centerOfMass.y;
            body.shapeOffsets[i].z = -centerOfMass.z;
        }
    }
    
    body.updateMassProperties();
    
    body.position.x += centerOfMass.x;
    body.position.y += centerOfMass.y;
    body.position.z += centerOfMass.z;
    
    return body;
};