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

/* global Leeboard, THREE, LBMath */


/**
 * The geometry components are primarily based upon the THREE.js
 * geometry objects. The main purpose of our set of components is to isolate the direct
 * references to THREE.js, the rest of Leeboard should not make direct references to
 * THREE.js. This way should we want to something other than the full blown THREE.js
 * we can simply replace this file.
 * @namespace LBGeometry    
 */
var LBGeometry = LBGeometry || {};

/**
 * Calculates a 2D normal from a tangent.
 * @param {object} tangent  The tangent of interest.
 * @param {object} [store] Optional object to store the normal into.
 * @returns {object}    The normal.
 */
LBGeometry.tangentToNormalXY = function(tangent, store) {
    var nx = -tangent.y;
    var ny = tangent.x;
    if (!store) {
        store = new THREE.Vector2(nx, ny);
    }
    else {
        store.set(nx, ny);
    }
    return store.normalize();
};

/**
 * Calculates a 2D tangent from a normal.
 * @param {object} normal  The normal of interest.
 * @param {object} [store]  Optional object to store the tangent into.
 * @returns {object}    The tangent.
 */
LBGeometry.normalToTangentXY = function(normal, store) {
    var tx = normal.y;
    var ty = -normal.x;
    if (!store) {
        store = new THREE.Vector2(tx, ty);
    }
    else {
        store.set(tx, ty);
    }
    return store.normalize();
};

/**
 * Creates a 2D vector/point.
 * @param {number} x    Initial x coordinate value.
 * @param {number} y    Initial y coordinate value.
 */
LBGeometry.createVector2 = function(x, y) {
    return new THREE.Vector2(x, y);
};

/**
 * Creates a 2D vector from a magnitude and angle in degrees.
 * @param {number} mag  The magnitude.
 * @param {number} deg  The angle, in degrees, of the vector relative to the x axis.
 */
LBGeometry.createVector2MagDeg = function(mag, deg) {
    var rad = LBMath.DEG_TO_RAD * deg;
    var cos = Math.cos(rad);
    var sin = Math.sin(rad);
    return new THREE.Vector2(cos * mag, sin * mag);
};

/**
 * Returns the angle, in radians, between this vector and another vector with the sign
 * appropriate for the direction towards the other vector.
 * @param {object} v    The other vector.
 * @returns {Number}    The angle.
 */
THREE.Vector2.prototype.angleToSigned = function(v) {
    var lengthSquards = this.lengthSq() * v.lengthSq();
    if (LBMath.isLikeZero(lengthSquards)) {
        return 0;
    }
    var cosTheta = this.dot( v ) / ( Math.sqrt(lengthSquards) );
    cosTheta = LBMath.clamp( cosTheta, -1, 1);
    
    var theta;
    if (LBMath.isNearEqual(cosTheta, -1)) {
        theta = -Math.PI;
    }
    else if (LBMath.isNearEqual(cosTheta, 1)) {
        theta = Math.PI;
    }
    else {
        theta = Math.acos(cosTheta);
    }
    
    // Now handle the sign...
    if ((this.x * v.y - this.y * v.x) < 0) {
        theta = -theta;
    }
    return theta;
};

/**
 * Sets the vector's components to all zero.
 * @returns {object} this.
 */
THREE.Vector2.prototype.zero = function() {
    this.x = 0;
    this.y = 0;
    return this;
};

/**
 * Determines if all the components of the vector are zero.
 * @returns {Boolean}   True if all components of the vector are zero.
 */
THREE.Vector2.prototype.isZero = function() {
    return this.x === 0 && this.y === 0;
};


/**
 * Logs a 2D vector to the console.
 * @param {object} vec  The vector to log.
 * @param {String} msg  The optional message to precede the vector.
 */
LBGeometry.logVector2 = function(vec, msg) {
    msg = msg || "";
    console.log(msg + vec.x + "\t" + vec.y);
};


/**
 * Logs a 3D vector to the console.
 * @param {object} vec  The vector to log.
 * @param {String} msg  The optional message to precede the vector.
 */
LBGeometry.logVector3 = function(vec, msg) {
    msg = msg || "";
    console.log(msg + vec.x + "\t" + vec.y + "\t" + vec.z);
};


/**
 * Creates a 3D vector/point.
 * @param {number} x    Initial x coordinate value.
 * @param {number} y    Initial y coordinate value.
 * @param {number} z      Initial z coordinate value.
 */
LBGeometry.createVector3 = function(x, y, z) {
    return new THREE.Vector3(x, y, z);
};

/**
 * Extension to THREE.Vector3, applies only the rotation portion of a Matrix4 to the vector.
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
};

/**
 * Override of THREE.Vector3.copy(), supports copying a Vector2 by setting the
 * z coordinate to 0 if the object being copied does not have a z.
 * @param {object} vec  The vector to copy.
 * @returns {object}    this.
 */
THREE.Vector3.prototype.copy = function(vec) {
    this.x = vec.x;
    this.y = vec.y;
    this.z = vec.z || 0;
    return this;
};

/**
 * Extension to THREE.Vector3, sets the vector's components to all zero.
 * @returns {object} this.
 */
THREE.Vector3.prototype.zero = function() {
    this.x = 0;
    this.y = 0;
    this.z = 0;
    return this;
};

/**
 * Determines if all the components of the vector are zero.
 * @returns {Boolean}   True if all components of the vector are zero.
 */
THREE.Vector3.prototype.isZero = function() {
    return this.x === 0 && this.y === 0 && this.z === 0;
};


/**
 * Loads a 2D vector from a data object. If appropriate data does not exist
 * for a field that field is set to 0.
 * @param {object} data The data to load from.
 * @param {object} [vec]  If defined the 2D vector to load into.
 * @returns {object}    The loaded vector.
 */
LBGeometry.loadVector2 = function(data, vec) {
    vec = vec || new THREE.Vector2();
    if (!data) {
        vec.zero();
    }
    else {
        vec.x = data.x || 0;
        vec.y = data.y || 0;
    }
    return vec;
};


/**
 * Loads a 3D vector from a data object. If appropriate data does not exist
 * for a field that field is set to 0.
 * @param {object} data The data to load from.
 * @param {object} [vec]  If defined the 2D vector to load into.
 * @returns {object}    The loaded vector.
 */
LBGeometry.loadVector3 = function(data, vec) {
    vec = vec || new THREE.Vector3();
    if (!data) {
        vec.zero();
    }
    else {
        vec.x = data.x || 0;
        vec.y = data.y || 0;
        vec.z = data.z || 0;
    }
    return vec;
};

/**
 * Adds two 2D vectors.
 * @param {object} vecA The first vector.
 * @param {object} vecB The second vectorl
 * @returns {object}    A new vector representing vecA + vecB
 */
LBGeometry.addVectors2 = function(vecA, vecB) {
    var vec = new THREE.Vector2(vecA.x, vecA.y);
    vec.add(vecB);
    return vec;
};

/**
 * Adds two 3D vectors.
 * @param {object} vecA The first vector.
 * @param {object} vecB The second vectorl
 * @returns {object}    A new vector representing vecA + vecB
 */
LBGeometry.addVectors3 = function(vecA, vecB) {
    var vec = new THREE.Vector3(vecA.x, vecA.y, vecA.z);
    vec.add(vecB);
    return vec;
};

/**
 * Subtracts two 2D vectors.
 * @param {object} vecA The first vector.
 * @param {object} vecB The second vectorl
 * @returns {object}    A new vector representing vecA - vecB
 */
LBGeometry.subVectors2 = function(vecA, vecB) {
    var vec = new THREE.Vector2(vecA.x, vecA.y);
    vec.sub(vecB);
    return vec;
};

/**
 * Subtracts two 3D vectors.
 * @param {object} vecA The first vector.
 * @param {object} vecB The second vectorl
 * @returns {object}    A new vector representing vecA - vecB
 */
LBGeometry.subVectors3 = function(vecA, vecB) {
    var vec = new THREE.Vector3(vecA.x, vecA.y, vecA.z);
    vec.sub(vecB);
    return vec;
};

/**
 * Returns the cross product of two 2D vectors, which is a 3D vector..
 * @param {object} vecA The first vector.
 * @param {object} vecB The second vectorl
 * @returns {object}    A new 3D vector representing vecA X vecB
 */
LBGeometry.crossVectors2 = function(vecA, vecB) {
    return new THREE.Vector3(0, 0, vecA.x * vecB.y - vecA.y * vecB.x);
};

/**
 * Returns the cross product of two 3D vectors.
 * @param {object} vecA The first vector.
 * @param {object} vecB The second vectorl
 * @returns {object}    A new vector representing vecA X vecB
 */
LBGeometry.crossVectors3 = function(vecA, vecB) {
    var vec = new THREE.Vector3(vecA.x, vecA.y, vecA.z);
    vec.cross(vecB);
    return vec;
};

/**
 * Determines if all the components of a vector are near zero.
 * @param {object} vec  The vector of interest.
 * @returns {Boolean}   True if all three components can be treated as 0.
 */
LBGeometry.isVector2LikeZero = function(vec) {
    return LBMath.isLikeZero(vec.x) && LBMath.isLikeZero(vec.y);
};

/**
 * Determines if all the components of a vector are near zero.
 * @param {object} vec  The vector of interest.
 * @returns {Boolean}   True if all three components can be treated as 0.
 */
LBGeometry.isVector3LikeZero = function(vec) {
    return LBMath.isLikeZero(vec.x) && LBMath.isLikeZero(vec.y) && LBMath.isLikeZero(vec.z);
};

/**
 * Limits the magnitude of a vector.
 * @param {object} vec  The 2D or 3D vector.
 * @param {number} mag  The maximum magnitude.
 * @returns {object}    vec.
 */
LBGeometry.clampVectorMag = function(vec, mag) {
    if (vec.lengthSq() > mag * mag) {
        vec.setLength(mag);
    }
    return vec;
};

/**
 * Creates a quaternion.
 * @param {number} x    Initial x value.
 * @param {number} y    Initial y value.
 * @param {number} z    Initial z value.
 * @param {number} w    Initial w value.
 */
LBGeometry.createQuaternion = function(x, y, z, w) {
    return new THREE.Quaternion(x, y, z, w);
};

/**
 * Loads a quaternion from a data object.
 * @param {object} data The data object, the looked for fields are 'qx', 'qy', 'qz', and 'qw'.
 * @param {object} [quat] If defined the quaternion to be set.
 * @returns {object}    The quaternion.
 */
LBGeometry.loadQuaternion = function(data, quat) {
    quat = quat || new THREE.Quaternion();
    if (!data) {
        quat.set(0, 0, 0, 1);
    }
    else {
        quat.x = data.qx || 0;
        quat.y = data.qy || 0;
        quat.z = data.qz || 0;
        quat.w = data.qw || 1;
    }
    return quat;
};

/**
 * Creates a quaternion representing three Euler angles, in radians.
 * @param {number} xRad   The rotation about the x axis, in radians.
 * @param {number} yRad   The rotation about the y axis, in radians.
 * @param {number} zRad   The rotation about the z axis, in radians.
 * @returns {object}    The THREE.Quaternion compatible quaternion.
 */
LBGeometry.createQuaternionFromEulerRad = function(xRad, yRad, zRad) {
    var euler = new THREE.Euler(xRad, yRad, zRad);
    var quaternion = new THREE.Quaternion();
    quaternion.setFromEuler(euler);
    return quaternion;
};

/**
 * Creates an object representing Euler angles.
 * @param {number} xRad The rotation about the x axis in radians.
 * @param {number} yRad The rotation about the y axis in radians.
 * @param {number} zRad The rotation about the z axis in radians.
 * @param {object} order    The order of rotation.
 * @returns {object}    The THREE.Euler compatible object.
 */
LBGeometry.createEulerRad = function(xRad, yRad, zRad, order) {
    return new THREE.Euler(xRad, yRad, zRad, order);
};

/**
 * Creates an object representing Euler angles given the angles in degrees.
 * @param {number} xDeg The rotation about the x axis in degrees.
 * @param {number} yDeg The rotation about the y axis in degrees.
 * @param {number} zDeg The rotation about the z axis in degrees.
 * @param {object} order    The order of rotation.
 * @returns {object}    The THREE.Euler compatible object.
 */
LBGeometry.createEulerDeg = function(xDeg, yDeg, zDeg, order) {
    return new THREE.Euler(xDeg * LBMath.DEG_TO_RAD, yDeg * LBMath.DEG_TO_RAD, zDeg * LBMath.DEG_TO_RAD, order);
};

/**
 * Loads an Euler object from a data object.
 * @param {object} data The data to load from, the looked for fields are 'ex', 'ey', 'ez', and 'order'.
 * @param {object} [euler]    If defined the object to be loaded into.
 * @returns {object}    The euler object.
 */
LBGeometry.loadEuler = function(data, euler) {
    euler = euler || new THREE.Euler();
    if (!data) {
        euler.set(0, 0, 0, THREE.Euler.DefaultOrder);
    }
    else {
        // Need to use Leeboard.isVar(), data.exd might be 0.
        if (Leeboard.isVar(data.exd)) {
            euler.x = (data.exd || 0) * LBMath.DEG_TO_RAD;
            euler.y = (data.eyd || 0) * LBMath.DEG_TO_RAD;
            euler.z = (data.ezd || 0) * LBMath.DEG_TO_RAD;
        }
        else {
            euler.x = data.ex || 0;
            euler.y = data.ey || 0;
            euler.z = data.ez || 0;
        }
        euler.order = data.order || THREE.Euler.DefaultOrder;
    }
    return euler;
};


/**
 * Creates a 2D line segment.
 * @param {object} start    The start of the line segment.
 * @param {object} end  The end of the line segment.
 */
LBGeometry.createLine2 = function(start, end) {
    return new LBGeometry.Line2(start, end);
};

/**
 * A 2D line segment, modeled after THREE.Line3.
 * @constructor
 * @param {object} start    The start of the line segment.
 * @param {object} end  The end of the line segment.
 * @returns {LBGeometry.Line2}
 */
LBGeometry.Line2 = function(start, end) {
    this.start = Leeboard.copyCommonProperties(new THREE.Vector2(), start);
    this.end = Leeboard.copyCommonProperties(new THREE.Vector2(), end);
};

LBGeometry.Line2.prototype = {
    constructor: LBGeometry.Line2,
    
    clone: function() {
        return new LBGeometry.Line2(this.start, this.end);
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
    }
};

/**
 * Loads a 2D line from a data object.
 * @param {object} data The data to load from.
 * @param {object} [line] If defined the line to be loaded.
 * @returns {object}    The loaded line.
 */
LBGeometry.loadLine2 = function(data, line) {
    line = line || LBGeometry.createLine2();
    if (!data) {
        line.start.zero();
        line.end.zero();
    }
    else {
        LBGeometry.loadVector2(data.start, line.start);
        LBGeometry.loadVector2(data.end, line.end);
    }
    
    return line;
};

/**
 * Creates a 3D line.
 * @param {object} start    The starting point of the line.
 * @param {object} end  The ending point of the line.
 * @returns {THREE.Line3}   The line.
 */
LBGeometry.createLine3 = function(start, end) {
    return new THREE.Line3(start, end);
};

/**
 * Loads a 3D line from a data object.
 * @param {object} data The data to load from.
 * @param {object} [line] If defined the line to be loaded.
 * @returns {object}    The loaded line.
 */
LBGeometry.loadLine3 = function(data, line) {
    line = line || LBGeometry.createLine3();
    if (!data) {
        line.start.zero();
        line.end.zero();
    }
    else {
        LBGeometry.loadVector3(data.start, line.start);
        LBGeometry.loadVector3(data.end, line.end);
    }
    
    return line;
};

/**
 * Creates a plane.
 * @param {object} normal   A normal to the plane.
 * @param {object} constant The negative distance from the origin to the plane along
 * the normal vector.
 * @returns {THREE.Plane}
 */
LBGeometry.createPlane = function(normal, constant) {
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
LBGeometry.intersectLineWithPlane = function(plane, line) {
    // We have n dot p = constant
    // p = p0 + s * u
    // n dot p0 + s * n dot u = constant
    // s = (constant - n dot p0) / n dot u
    var u = line.delta();
    u.normalize();
    var nDotU = plane.normal.dot(u);
    if (LBMath.isLikeZero(nDotU)) {
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
LBGeometry.getLinePlaneIntersection = function(plane, line) {
    var s = LBGeometry.intersectLineWithPlane(plane, line);
    if (s === Math.NaN) {
        return undefined;
    }
    
    var delta = line.delta();
    var length = delta.length();
    delta.multiplyScalar(s / length);
    delta.add(line.start);
    return delta;
};


/**
 * Creates a 3x3 matrix.
 */
LBGeometry.createMatrix3 = function() {
    return new THREE.Matrix3();
};

/**
 * Loads a 3x3 matrix from a data object.
 * @param {object} data The data to load from.
 * @param {object} [mat]  If defined the matrix to load into.
 * @returns {object}    The loaded matrix.
 */
LBGeometry.loadMatrix3 = function(data, mat) {
    if (mat) {
        mat.identity();
    }
    else {
        mat = new THREE.Matrix3();
    }
    
    if (!data) {
        return mat;
    }
    
    if (data.elements) {
        var count = Math.min(data.elements.length, mat.elements.length);
        for (var i = 0; i < count; ++i) {
            mat.elements[i] = data.elements[i];
        }
        for (var i = count; i < mat.elements.length; ++i) {
            mat.elements[i] = 0;
        }
    }

    return mat;
};


/**
 * Creates a 4x4 matrix for performing coordinate transformations.
 */
LBGeometry.createMatrix4 = function() {
    return new THREE.Matrix4();
};

/**
 * Loads a 4x4 matrix from a data object.
 * @param {object} data The data to load from.
 * @param {object} [mat]  If defined the matrix to load into.
 * @returns {object}    The matrix.
 */
LBGeometry.loadMatrix4 = function(data, mat) {
    if (mat) {
        mat.identity();
    }
    else {
        mat = new THREE.Matrix4();
    }
    
    if (!data) {
        return mat;
    }
    
    if (data.elements) {
        var count = Math.min(data.elements.length, mat.elements.length);
        for (var i = 0; i < count; ++i) {
            mat.elements[i] = data.elements[i];
        }
        for (var i = count; i < mat.elements.length; ++i) {
            mat.elements[i] = 0;
        }
    }
    else {
        if (data.rotation) {
            // Need to use Leeboard.isVar() here because the values may be 0..
            if (Leeboard.isVar(data.rotation.ex) || Leeboard.isVar(data.rotation.exd)) {
                // Euler angles...
                var euler = LBGeometry.loadEuler(data.rotation);
                mat.makeRotationFromEuler(euler);
            }
            else if (Leeboard.isVar(data.rotation.qx)) {
                // Quaternion...
                var quaternion = LBGeometry.loadQuaternion(data.rotation);
                mat.makeRotationFromQuaternion(quaternion);
            }
        }
        
        if (data.origin) {
            var origin = LBGeometry.loadVector3(data.origin);
            mat.setPosition(origin);
        }
    }
    
    return mat;
};


/**
 * Extension to THREE.Matrix4, sets the position components of the matrix using
 * separate x,y, and z coordinates.
 * @param {number} x    The x coordinate.
 * @param {number} y    The y coordinate.
 * @param {number} z    The z coordinate.
 * @returns {Leeboard.Matrix4}  this.
 */
THREE.Matrix4.prototype.setXYZ = function(x, y, z) {
    var te = this.elements;
    te[ 12 ] = x;
    te[ 13 ] = y;
    te[ 14 ] = z;
    return this;
};

/**
 * Extension to THREE.Matrix4, sets the matrix to a rotation defined by Euler angles
 * followed by a translation to x,y,z coordinates.
 * @param {number} xRad   The rotation about the x axis, in radians.
 * @param {number} yRad   The rotation about the y axis, in radians.
 * @param {number} zRad   The rotation about the z axis, in radians.
 * @param {number} px    The x coordinate.
 * @param {number} py    The y coordinate.
 * @param {number} pz    The z coordinate.
 * @returns {Leeboard.Matrix4}  this.
 */
THREE.Matrix4.prototype.makeFromEulerAndXYZ = function(xRad, yRad, zRad, px, py, pz) {
    this.makeRotationFromEuler(new THREE.Euler(xRad, yRad, zRad));
    this.setXYZ(px, py, pz);
    return this;
};


/**
 * Logs a 4x4 matrix to the console.
 * @param {object} mat  The matrix to log.
 * @param {String} msg  The optional message to precede the vector.
 */
LBGeometry.logMatrix4 = function(mat, msg) {
    var text = "";
    if (Leeboard.isVar(msg)) {
        text = "\n" + msg + "\n";
    }
    
    var row;
    for (row = 0; row < 4; ++row) {
        var col;
        for (col = 0; col < 4; ++col) {
            text = text + "\t" + mat.elements[col * 4 + row];
        }
        text = text + "\n";
    }
    
    console.log(text);
};


/**
 * Creates a 3D object.
 * @returns {object}
 */
LBGeometry.createObject3D = function() {
    return new THREE.Object3D();
};

/**
 * Loads the basic settings of a 3D object from a data object.
 * @param {object} data The data containing the settings.
 * @param {object} [obj3D]    If defined the 3D object to be loaded into.
 * @returns {object}    this.
 */
LBGeometry.loadObject3DBasic = function(data, obj3D) {
    if (!obj3D) {
        obj3D = LBGeometry.createObject3D();
    }
    
    obj3D.name = data.name || "";
    
    LBGeometry.loadVector3(data.position, obj3D.position);
    if (data.rotation) {
        LBGeometry.loadEuler(data.rotation, obj3D.rotation);
    }
    else {
        LBGeometry.loadQuaternion(data.quaternion, obj3D.quaternion);
    }
    obj3D.matrixWorldNeedsUpdate = true;
    
    return obj3D;
};

/**
 * Helper that creates and loads a 3D object from a data object. If the data object contains
 * a 'construct' property, the value of that property is passed directly to eval() to create
 * the 3D object object, otherwise LBGeometry.createObject3D() is used.
 * @param {object} data The data to load from.
 * @returns {object}    The 3D object.
 */
LBGeometry.createObject3DFromData = function(data) {
    if (!data) {
        return LBGeometry.createObject3D();
    }
    
    var obj3D;
    if (data.construct) {
        obj3D = eval(data.construct);
    }
    else {
        obj3D = LBGeometry.createObject3D();
    }
    
    if (obj3D.load) {
        obj3D.load(data);
    }
    else {
        LBGeometry.loadObject3DBasic(data, obj3D);
    }
    return obj3D;
};


