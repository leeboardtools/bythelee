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
 * Calculates a 2D normal from a tangent.
 * @param {object} tangent  The tangent of interest.
 * @returns {object}    The normal.
 */
Leeboard.tangentToNormalXY = function(tangent) {
    return new THREE.Vector2(tangent.y, -tangent.x).normalize();
}

/**
 * Calculates a 2D tangent from a normal.
 * @param {object} normal  The normal of interest.
 * @returns {object}    The tangent.
 */
Leeboard.normalToTangentXY = function(normal) {
    return new THREE.Vector2(-normal.y, normal.x).normalize();
}

/**
 * Extension to THREE.Vector, applies only the rotation portion of a Matrix4 to the vector.
 * @param {type} m  The matrix to apply.
 * @returns {THREE.Vector3} this.
 */
THREE.Vector3.prototype.applyMatrix4Rotation = function(m) {
    var x = this.x, y = this.y, z = this.z;
    var e = m.elements;

    this.x = e[ 0 ] * x + e[ 4 ] * y + e[ 8 ]  * z;
    this.y = e[ 1 ] * x + e[ 5 ] * y + e[ 9 ]  * z;
    this.z = e[ 2 ] * x + e[ 6 ] * y + e[ 10 ] * z;
    return this;
}

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
    var vec = new THREE.Vector3(vecA.x, vecA.y, vecA.z);
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
    var vec = new THREE.Vector3(vecA.x, vecA.y, vecA.z);
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
    var vec = new THREE.Vector3(vecA.x, vecA.y, vecA.z);
    vec.cross(vecB);
    return vec;
};

/**
 * Determines if all the components of a vector are near zero.
 * @param {object} vec  The vector of interest.
 * @returns {Boolean}   True if all three components can be treated as 0.
 */
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

/**
 * Creates a quaternion representing three Euler angles, in radians.
 * @param {type} xRad   The rotation about the x axis, in radians.
 * @param {type} yRad   The rotation about the y axis, in radians.
 * @param {type} zRad   The rotation about the z axis, in radians.
 * @returns {Leeboard.createQuaternionFromEuler.quaternion|THREE.Quaternion}
 */
Leeboard.createQuaternionFromEulerRad = function(xRad, yRad, zRad) {
    var euler = new THREE.Euler(xRad, yRad, zRad);
    var quaternion = new THREE.Quaternion();
    quaternion.setFromEuler(euler);
    return quaternion;
};

/**
 * Creates a 2D line segment.
 * @param {object} start    The start of the line segment.
 * @param {object} end  The end of the line segment.
 */
Leeboard.createLine2D = function(start, end) {
    return new Leeboard.Line2D(start, end);
};

/**
 * A 2D line segment, modeled after THREE.Line3.
 * @constructor
 * @param {object} start    The start of the line segment.
 * @param {object} end  The end of the line segment.
 * @returns {Leeboard.Line2D}
 */
Leeboard.Line2D = function(start, end) {
    this.start = Leeboard.copyCommonProperties(new THREE.Vector2(), start);
    this.end = Leeboard.copyCommonProperties(new THREE.Vector2(), end);
};

Leeboard.Line2D.prototype = {
    constructor: Leeboard.Line2D,
    
    clone: function() {
        return new Leeboard.Line2D(this.start, this.end);
    },
    
    copy: function(other) {
        this.start.copy(other.start);
        this.end.copy(other.end);
        return this;
    },
    
    delta: function(store) {
        store = store || new THREE.Vector2();
        return store.subVectors(this.end, this.start);
    },
    
    lengthSq: function() {
        return this.start.distanceToSquared(this.end);
    },
    
    length: function() {
        return this.start.distanceTo(this.end);
    },
};

/**
 * Creates a line.
 * @param {object} start    The starting point of the line.
 * @param {object} end  The ending point of the line.
 * @returns {THREE.Line3}   The line.
 */
Leeboard.createLine3D = function(start, end) {
    return new THREE.Line3(start, end);
};

/**
 * Creates a plane.
 * @param {object} normal   A normal to the plane.
 * @param {object} constant The negative distance from the origin to the plane along
 * the normal vector.
 * @returns {THREE.Plane}
 */
Leeboard.createPlane = function(normal, constant) {
    return new THREE.Plane(normal, constant);
};

/**
 * Determines the parametric value along a line where the line intersects a plane.
 * The parametric value is 0 at line.start and 1 and line.start + u, where u is the
 * unit vector in the direction of the line. 
 * @param {object} plane  The plane of interest.
 * @param {object} line The line of interest.
 * @returns {Math.NaN|number}   The parametric value, Math.NaN if the line is parallel
 * to the plane or a point.
 */
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

/**
 * Determines the point where a line intersects a plane. This differs from THREE.Plane.intersectLine()
 * in that Plane treats the line as a line segment, and if the line segment does not intersect the
 * plane then it returns undefined. This function treats the line as a true line.
 * @param {type} plane  The plane of interest.
 * @param {type} line   The line of interest.
 * @returns {undefined|object}  The intersection point, undefined if the line does not
 * intersect the plane.
 */
Leeboard.getLinePlaneIntersection = function(plane, line) {
    var s = Leeboard.intersectLineWithPlane(plane, line);
    if (s === Math.NaN) {
        return undefined;
    }
    
    var delta = line.delta();
    var length = delta.length();
    delta.multiplyScalar(s / length);
    delta.add(line.start);
    return delta;
};
