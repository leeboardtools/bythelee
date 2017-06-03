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

/* global Leeboard, THREE */


/**
 * Creates a 2D vector/point.
 * @constructor
 * @param {number} x    Initial x coordinate value.
 * @param {number} y    Initial y coordinate value.
 * @param {type} z      Initial z coordinate value.
 */
Leeboard.createVector2D = function(x, y, z) {
    return new THREE.Vector2(x, y, z);
};


/**
 * Creates a 3D vector/point.
 * @constructor
 * @param {number} x    Initial x coordinate value.
 * @param {number} y    Initial y coordinate value.
 * @param {type} z      Initial z coordinate value.
 */
Leeboard.createVector3D = function(x, y, z) {
    return new THREE.Vector3(x, y, z);
};

/**
 * Adds two 3D vectors.
 * @param {object} vecA The first vector.
 * @param {object} vecB The second vectorl
 * @returns {object}    A new vector representing vecA + vecB
 */
Leeboard.addVectors3D = function(vecA, vecB) {
    var vec = Leeboard.createVector3D(vecA.x, vecA.y, vecA.z);
    vec.add(vecB);
    return vec;
};

/**
 * Subtracts two 3D vectors.
 * @param {object} vecA The first vector.
 * @param {object} vecB The second vectorl
 * @returns {object}    A new vector representing vecA - vecB
 */
Leeboard.subVectors3D = function(vecA, vecB) {
    var vec = Leeboard.createVector3D(vecA.x, vecA.y, vecA.z);
    vec.sub(vecB);
    return vec;
};

/**
 * Returns the cross product of two 3D vectors.
 * @param {object} vecA The first vector.
 * @param {object} vecB The second vectorl
 * @returns {object}    A new vector representing vecA X vecB
 */
Leeboard.crossVectors3D = function(vecA, vecB) {
    var vec = Leeboard.createVector3D(vecA.x, vecA.y, vecA.z);
    vec.cross(vecB);
    return vec;
};

Leeboard.isVectors3DLikeZero = function(vec) {
    return Leeboard.isLikeZero(vec.x) && Leeboard.isLikeZero(vec.y) && Leeboard.isLikeZero(vec.z);
};

/**
 * Creates a quaternion.
 * @param {number} x    Initial x value.
 * @param {number} y    Initial y value.
 * @param {number} z    Initial z value.
 * @param {number} w    Initial w value.
 */
Leeboard.createQuaternion = function(x, y, z, w) {
    return new THREE.Quaternion(x, y, z, w);
};


Leeboard.createLine3D = function(start, end) {
    return new THREE.Line3(start, end);
};

Leeboard.createPlane = function(normal, constant) {
    return new THREE.Plane(normal, constant);
};

Leeboard.intersectLineWithPlane = function(plane, line) {
    // We have n dot p = constant
    // p = p0 + s * u
    // n dot p0 + s * n dot u = constant
    // s = (constant - n dot p0) / n dot u
    var u = line.delta();
    u.normalize();
    var nDotU = plane.normal.dot(u);
    if (Leeboard.isLikeZero(nDotU)) {
        return Math.NaN;
    }
    
    var nDotP = plane.normal.dot(line.start);
    var s = (plane.constant - nDotP) / nDotU;
    return s;
};

Leeboard.getLinePlaneIntersection = function(plane, line) {
    var s = Leeboard.intersectLineWithPlane(plane, line);
    if (s === Math.NaN) {
        return undefined;
    }
    
    var delta = line.delta();
    delta.multiplyScalar(s);
    delta.add(line.start);
    return delta;
}
