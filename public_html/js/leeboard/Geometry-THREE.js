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
        store = new LBGeometry.Vector2(nx, ny);
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
        store = new LBGeometry.Vector2(tx, ty);
    }
    else {
        store.set(tx, ty);
    }
    return store.normalize();
};


/**
 * A 2D vector, our encapsulation of {@link LBGeometry.Vector2}.
 * @constructor
 * @param {Number} [x=0]    The x coordinate.
 * @param {Number} [y=0]    The y coordinate.
 * @returns {LBGeometry.Vector2}
 */
LBGeometry.Vector2 = function(x, y) {
    THREE.Vector2.call(this, x, y);
};
LBGeometry.Vector2.prototype = Object.create(THREE.Vector2.prototype);
LBGeometry.Vector2.prototype.constructor = LBGeometry.Vector2;
LBGeometry.Vector2.prototype.clone = function() {
    return new LBGeometry.Vector2(this.x, this.y);
}

/**
 * Creates a 2D vector from a magnitude and angle in degrees.
 * @param {Number} mag  The magnitude.
 * @param {Number} deg  The angle, in degrees, of the vector relative to the x axis.
 * @returns {LBGeometry.Vector2}
 */
LBGeometry.createVector2MagDeg = function(mag, deg) {
    var rad = LBMath.DEG_TO_RAD * deg;
    var cos = Math.cos(rad);
    var sin = Math.sin(rad);
    return new LBGeometry.Vector2(cos * mag, sin * mag);
};

/**
 * Returns the angle, in radians, between this vector and another vector with the sign
 * appropriate for the direction towards the other vector.
 * @param {object} v    The other vector.
 * @returns {Number}    The angle.
 */
LBGeometry.Vector2.prototype.angleToSigned = function(v) {
    var lengthSquareds = this.lengthSq() * v.lengthSq();
    if (LBMath.isLikeZero(lengthSquareds)) {
        return 0;
    }
    var cosTheta = this.dot( v ) / ( Math.sqrt(lengthSquareds) );
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
LBGeometry.Vector2.prototype.zero = function() {
    this.x = 0;
    this.y = 0;
    return this;
};

/**
 * Normalizes the vector, this version handles the zero length case.
 * @implements {THREE.Vector2#normalize}
 * @returns {object} this.
 */
LBGeometry.Vector2.prototype.normalize = function() {
    var len = this.length();
    if (LBMath.isLikeZero(len)) {
        return this.zero();
    }
    
    this.x /= len;
    this.y /= len;
    return this;
};

/**
 * Determines if all the components of the vector are zero.
 * @returns {Boolean}   True if all components of the vector are zero.
 */
LBGeometry.Vector2.prototype.isZero = function() {
    return this.x === 0 && this.y === 0;
};


/**
 * Our encapsulation of {@link THREE.Vector3}, a 3D vector.
 * @constructor
 * @param {Number} [x=0]    The x coordinate.
 * @param {Number} [y=0]    The y coordinate.
 * @param {Number} [z=0]    The z coordinate.
 * @returns {LBGeometry.Vector3}
 */
LBGeometry.Vector3 = function(x, y, z) {
    THREE.Vector3.call(this, x, y, z);
};

LBGeometry.Vector3.prototype = Object.create(THREE.Vector3.prototype);
LBGeometry.Vector3.constructor = LBGeometry.Vector3;

/**
 * Clones the vector.
 * @returns {LBGeometry.Vector3}
 */
LBGeometry.Vector3.prototype.clone = function() {
    return new LBGeometry.Vector3(this.x, this.y, this.z);
};


/**
 * Applies only the rotation portion of a Matrix4 to the vector.
 * @param {type} m  The matrix to apply.
 * @returns {LBGeometry.Vector3} this.
 */
LBGeometry.Vector3.prototype.applyMatrix4Rotation = function(m) {
    var x = this.x, y = this.y, z = this.z;
    var e = m.elements;

    this.x = e[ 0 ] * x + e[ 4 ] * y + e[ 8 ]  * z;
    this.y = e[ 1 ] * x + e[ 5 ] * y + e[ 9 ]  * z;
    this.z = e[ 2 ] * x + e[ 6 ] * y + e[ 10 ] * z;
    return this;
};

/**
 * Normalizes the vector, this version handles the zero length case.
 * @implements {THREE.Vector3#normalize}
 * @returns {LBGeometry.Vector3} this.
 */
LBGeometry.Vector3.prototype.normalize = function() {
    var len = this.length();
    if (LBMath.isLikeZero(len)) {
        return this.zero();
    }
    
    this.x /= len;
    this.y /= len;
    this.z /= len;
    return this;
};

/**
 * Override of THREE.Vector3.copy(), supports copying a Vector2 by setting the
 * z coordinate to 0 if the object being copied does not have a z.
 * @implements {THREE.Vector3#copy}
 * @param {object} vec  The vector to copy.
 * @returns {LBGeometry.Vector3} this.
 */
LBGeometry.Vector3.prototype.copy = function(vec) {
    this.x = vec.x;
    this.y = vec.y;
    this.z = vec.z || 0;
    return this;
};

/**
 * Override of {@link THREE.Vector3#add}, supports copying a Vector2 by setting the
 * z coordinate to 0 if the object being copied does not have a z.
 * @implements {THREE.Vector3#copy}
 * @param {object} vec  The vector to copy.
 * @returns {LBGeometry.Vector3} this.
 */
LBGeometry.Vector3.prototype.add = function(vec) {
    this.x += vec.x;
    this.y += vec.y;
    this.z += vec.z || 0;
    return this;
};

/**
 * Extension to {THREE.Vector3}, sets the vector's components to all zero.
 * @returns {LBGeometry.Vector3} this.
 */
LBGeometry.Vector3.prototype.zero = function() {
    this.x = 0;
    this.y = 0;
    this.z = 0;
    return this;
};

/**
 * Determines if all the components of the vector are zero.
 * @returns {Boolean}   True if all components of the vector are zero.
 */
LBGeometry.Vector3.prototype.isZero = function() {
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
    vec = vec || new LBGeometry.Vector2();
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
    vec = vec || new LBGeometry.Vector3();
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
    var vec = new LBGeometry.Vector2(vecA.x, vecA.y);
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
    var vec = new LBGeometry.Vector3(vecA.x, vecA.y, vecA.z);
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
    var vec = new LBGeometry.Vector2(vecA.x, vecA.y);
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
    var vec = new LBGeometry.Vector3(vecA.x, vecA.y, vecA.z);
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
    return new LBGeometry.Vector3(0, 0, vecA.x * vecB.y - vecA.y * vecB.x);
};

/**
 * Returns the cross product of two 3D vectors.
 * @param {object} vecA The first vector.
 * @param {object} vecB The second vectorl
 * @returns {object}    A new vector representing vecA X vecB
 */
LBGeometry.crossVectors3 = function(vecA, vecB) {
    var vec = new LBGeometry.Vector3(vecA.x, vecA.y, vecA.z);
    vec.cross(vecB);
    return vec;
};

/**
 * Determines if all the components of a vector are near zero.
 * @param {LBGeometry.Vector2|LBGeometry.Vector3} vec  The vector of interest.
 * @returns {Boolean}   True if all three components can be treated as 0.
 */
LBGeometry.isVectorLikeZero = function(vec) {
    return LBMath.isLikeZero(vec.x) && LBMath.isLikeZero(vec.y) && (!vec.z || LBMath.isLikeZero(vec.z));
};

/**
 * Limits the magnitude of a vector.
 * @param {object} vec  The 2D or 3D vector.
 * @param {Number} mag  The maximum magnitude.
 * @returns {object}    vec.
 */
LBGeometry.clampVectorMag = function(vec, mag) {
    if (vec.lengthSq() > mag * mag) {
        vec.setLength(mag);
    }
    return vec;
};

/**
 * Sets a vector such that it is orthogonal to another vector.
 * @param {object} refVec The 3D axis to make the vec orthogonal to.
 * @param {object} [store]  If defined, the vector to be made orthogonal
 * @returns {object}    The orthogonal vector.
 */
LBGeometry.makeOrthogonal = function(refVec, store) {
    store = store || new LBGeometry.Vector3();
    // Orthogonality is defined by vec dot axis === 0, or vec.x * axis.x + vec.y * axis.y + vec.z * axis.z === 0.
    // We'll just rotate the x and y coordinates and then solve for the z coordinate.
    store.x = refVec.y;
    store.y = refVec.z;
    if (!LBMath.isLikeZero(refVec.z)) {
        store.z = -(store.x * refVec.x + store.y * refVec.y) / refVec.z;
    }
    else {
        store.z = refVec.x;
    }
    return store;
};


/**
 * Our encapsulation of {@link THREE.Quaternion}.
 * @param {Number} [x=0]    Initial x value.
 * @param {Number} [y=0]    Initial y value.
 * @param {Number} [z=0]    Initial z value.
 * @param {Number} [w=1]    Initial w value.
 */
LBGeometry.Quaternion = function(x, y, z, w) {
    THREE.Quaternion.call(this, x, y, z, w);
};
LBGeometry.Quaternion.prototype = Object.create(THREE.Quaternion.prototype);
LBGeometry.Quaternion.prototype.constructor = LBGeometry.Quaternion;
LBGeometry.Quaternion.prototype.clone = function() {
    return new LBGeometry.Quaternion(this.x, this.y, this.z, this.w);
};


/**
 * Loads a quaternion from a data object.
 * @param {object} data The data object, the looked for fields are 'qx', 'qy', 'qz', and 'qw'.
 * @param {object} [quat] If defined the quaternion to be set.
 * @returns {object}    The quaternion.
 */
LBGeometry.loadQuaternion = function(data, quat) {
    quat = quat || new LBGeometry.Quaternion();
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
 * @param {Number} xRad   The rotation about the x axis, in radians.
 * @param {Number} yRad   The rotation about the y axis, in radians.
 * @param {Number} zRad   The rotation about the z axis, in radians.
 * @returns {object}    The THREE.Quaternion compatible quaternion.
 */
LBGeometry.createQuaternionFromEulerRad = function(xRad, yRad, zRad) {
    var euler = new LBGeometry.Euler(xRad, yRad, zRad);
    var quaternion = new LBGeometry.Quaternion();
    quaternion.setFromEuler(euler);
    return quaternion;
};


/**
 * An object representing a set of Euler angles, our encapsulation of
 * {@link THREE.Euler}.
 * @constructor
 * @param {Number} [xRad=0] The rotation about the x axis in radians.
 * @param {Number} [yRad=0] The rotation about the y axis in radians.
 * @param {Number} [zRad=0] The rotation about the z axis in radians.
 * @param {String} [order='XYZ']    The order of rotation.
 * @returns {LBGeometry.Euler}    The Euler object.
 */
LBGeometry.Euler = function(xRad, yRad, zRad, order) {
    THREE.Euler.call(this, xRad, yRad, zRad, order);
};
LBGeometry.Euler.prototype = Object.create(THREE.Euler.prototype);
LBGeometry.Euler.prototype.constructor = LBGeometry.Euler;
LBGeometry.Euler.prototype.clone = function() {
    return new LBGeometry.Euler(this.x, this.y, this.z, this.order);
};

/**
 * Creates an object representing Euler angles.
 * @param {Number} xRad The rotation about the x axis in radians.
 * @param {Number} yRad The rotation about the y axis in radians.
 * @param {Number} zRad The rotation about the z axis in radians.
 * @param {String} order    The order of rotation.
 * @returns {LBGeometry.Euler}    The Euler object.
 */
LBGeometry.createEulerRad = function(xRad, yRad, zRad, order) {
    return new LBGeometry.Euler(xRad, yRad, zRad, order);
};

/**
 * Creates an object representing Euler angles given the angles in degrees.
 * @param {Number} xDeg The rotation about the x axis in degrees.
 * @param {Number} yDeg The rotation about the y axis in degrees.
 * @param {Number} zDeg The rotation about the z axis in degrees.
 * @param {String} order    The order of rotation.
 * @returns {LBGeometry.Euler}    The Euler object.
 */
LBGeometry.createEulerDeg = function(xDeg, yDeg, zDeg, order) {
    return new LBGeometry.Euler(xDeg * LBMath.DEG_TO_RAD, yDeg * LBMath.DEG_TO_RAD, zDeg * LBMath.DEG_TO_RAD, order);
};

/**
 * Loads an Euler object from a data object.
 * @param {object} data The data to load from, the looked for fields are 'ex', 'ey', 'ez', and 'order'.
 * @param {object} [euler]    If defined the object to be loaded into.
 * @returns {object}    The euler object.
 */
LBGeometry.loadEuler = function(data, euler) {
    euler = euler || new LBGeometry.Euler();
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
 * A 2D line segment, modeled after {@link THREE.Line3}.
 * @constructor
 * @param {object} [start=LBGeometry.ZERO]    The start of the line segment.
 * @param {object} [end=LBGeometry.ZERO]  The end of the line segment.
 * @returns {LBGeometry.Line2}
 */
LBGeometry.Line2 = function(start, end) {
    this.start = Leeboard.copyCommonProperties(new LBGeometry.Vector2(), start);
    this.end = Leeboard.copyCommonProperties(new LBGeometry.Vector2(), end);
};

LBGeometry.Line2.prototype = {
    constructor: LBGeometry.Line2,
    
    /**
     * Creates a copy of this.
     * @returns {LBGeometry.Line2}
     */
    clone: function() {
        return new LBGeometry.Line2(this.start, this.end);
    },
    
    /**
     * Sets this line to match the settings of another line.
     * @param {LBGeometry.Line2} other  The line to be copied.
     * @returns {LBGeometry.Line2}  this.
     */
    copy: function(other) {
        this.start.copy(other.start);
        this.end.copy(other.end);
        return this;
    },
    
    /**
     * Returns the end minus the start.
     * @param {LBGeometry.Vector2} [store]  If defined the vector to receive the difference.
     * @returns {LBGeometry.Vector2}    The delta.
     */
    delta: function(store) {
        store = store || new LBGeometry.Vector2();
        return store.subVectors(this.end, this.start);
    },
    
    /**
     * 
     * @returns {Number}    The length of the line squared.
     */
    lengthSq: function() {
        return this.start.distanceToSquared(this.end);
    },
    
    /**
     * 
     * @returns {Number}    The length of the line.
     */
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
    line = line || new LBGeometry.Line2();
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
 * A 3D line, our encapsulation of {@link THREE.Line3}..
 * @constructor
 * @param {LBGeometry.Vector3} [start=LBGeometry.ZERO]    The starting point of the line.
 * @param {LBGeometry.Vector3} [end=LBGeometry.ZERO]  The ending point of the line.
 * @returns {LBGeometry.Line3}   The line.
 */
LBGeometry.Line3 = function(start, end) {
    THREE.Line3.call(this, start, end);
};
LBGeometry.Line3.prototype = Object.create(THREE.Line3.prototype);
LBGeometry.Line3.prototype.constructor = LBGeometry.Line3;

LBGeometry.Line3.prototype.clone = function() {
    return new LBGeometry.Line3(this.start, this.end);
};

/**
 * Loads a 3D line from a data object.
 * @param {object} data The data to load from.
 * @param {object} [line] If defined the line to be loaded.
 * @returns {object}    The loaded line.
 */
LBGeometry.loadLine3 = function(data, line) {
    line = line || new LBGeometry.Line3();
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
 * A plane, our encapsulation of {@link THREE.Plane}.
 * @constructor
 * @param {LBGeometry.Vector3} [normal=LBGeometry.X_AXIS]   A normal to the plane.
 * @param {Number} [constant=LBGeometry.ORIGIN] The negative distance from the origin to the plane along
 * the normal vector.
 * @returns {LBGeometry.Plane}
 */
LBGeometry.Plane = function(normal, constant) {
    THREE.Plane.call(this, normal, constant);
};

LBGeometry.Plane.prototype = Object.create(THREE.Plane.prototype);
LBGeometry.Plane.prototype.constructor = LBGeometry.Plane;

/**
 * Determines the parametric value along a line where the line intersects a plane.
 * The parametric value is 0 at line.start and 1 and line.start + u, where u is the
 * unit vector in the direction of the line. 
 * @param {LBGeometry.Plane} plane  The plane of interest.
 * @param {LBGeometry.Line3} line The line of interest.
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
    var s = -(plane.constant + nDotP) / nDotU;
    return s;
};

/**
 * Determines the point where a line intersects a plane. This differs from THREE.Plane.intersectLine()
 * in that Plane treats the line as a line segment, and if the line segment does not intersect the
 * plane then it returns undefined. This function treats the line as a true line.
 * @param {LBGeometry.Plane} plane  The plane of interest.
 * @param {LBGeometry.Line3} line   The line of interest.
 * @param {LBGeometry.Vector3} [store]    If defined the 3D vector to receive the intersection point.
 * @returns {undefined|LBGeometry.Vector3}  The intersection point, undefined if the line does not
 * intersect the plane.
 */
LBGeometry.getLinePlaneIntersection = function(plane, line, store) {
    store = store || new LBGeometry.Vector3();
    store.copy(line.end).sub(line.start);
    var nDotDir = plane.normal.dot(store);
    if (LBMath.isLikeZero(nDotDir)) {
        return undefined;
    }
    
    var nDotP = plane.normal.dot(line.start);
    var s = -(plane.constant + nDotP) / nDotDir;
    store.multiplyScalar(s).add(line.start);
    return store;
};


/**
 * A sphere, our encapsulation of {@link THREE.Sphere}.
 * @constructor
 * @param {LBGeometry.Vector3} [center=LBGeometry.ORIGIN] The center of the sphere.
 * @param {Number} [radius=0]   The radius of the sphere.
 * @returns {THREE.Sphere}
 */
LBGeometry.Sphere = function(center, radius) {
    THREE.Sphere.call(this, center, radius);
};
LBGeometry.Sphere.prototype = Object.create(THREE.Sphere.prototype);
LBGeometry.Sphere.prototype.constructor = LBGeometry.Sphere;
LBGeometry.Sphere.prototype.clone = function() {
    return new LBGeometry.Sphere(this.center, this.radius);
};


/**
 * A 3x3 matrix, our encapsulation of {@link THREE.Matrix3}.
 * @returns {LBGeometry.Matrix3}
 */
LBGeometry.Matrix3 = function() {
    THREE.Matrix3.call(this);
};
LBGeometry.Matrix3.prototype = Object.create(THREE.Matrix3.prototype);
LBGeometry.Matrix3.prototype.constructor = LBGeometry.Matrix3;

LBGeometry.Matrix3.prototype.clone = function() {
    var matrix = new LBGeometry.Matrix3();
    return matrix.copy(this);
};

/**
 * Extension to {THREE.Matrix3}, sets all the elements of the matrix to 0.
 * @returns {undefined}
 */
LBGeometry.Matrix3.prototype.zero = function() {
    var e = this.elements;
    e[0] = e[1] = e[2] = e[3] = e[4] = e[5] = e[6] = e[7] = e[8] = 0;
    return this;
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
        mat = new LBGeometry.Matrix3();
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
 * A 4x4 matrix, our encapsulation of {@link THREE.Matrix4}.
 * @returns {LBGeometry.Matrix3}
 */
LBGeometry.Matrix4 = function() {
    THREE.Matrix4.call(this);
};
LBGeometry.Matrix4.prototype = Object.create(THREE.Matrix4.prototype);
LBGeometry.Matrix4.prototype.constructor = LBGeometry.Matrix4;

LBGeometry.Matrix4.prototype.clone = function() {
    var matrix = new LBGeometry.Matrix4();
    return matrix.copy(this);
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
        mat = new LBGeometry.Matrix4();
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
 * Extension to {@link THREE.Matrix4}, sets the position components of the matrix using
 * separate x,y, and z coordinates.
 * @param {Number} x    The x coordinate.
 * @param {Number} y    The y coordinate.
 * @param {Number} z    The z coordinate.
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
 * Extension to {@link LBGeometry.Matrix4}, sets the matrix to a rotation defined by Euler angles
 * followed by a translation to x,y,z coordinates.
 * @param {Number} xRad   The rotation about the x axis, in radians.
 * @param {Number} yRad   The rotation about the y axis, in radians.
 * @param {Number} zRad   The rotation about the z axis, in radians.
 * @param {Number} px    The x coordinate.
 * @param {Number} py    The y coordinate.
 * @param {Number} pz    The z coordinate.
 * @returns {Leeboard.Matrix4}  this.
 */
LBGeometry.Matrix4.prototype.makeFromEulerAndXYZ = function(xRad, yRad, zRad, px, py, pz) {
    this.makeRotationFromEuler(new LBGeometry.Euler(xRad, yRad, zRad));
    this.setXYZ(px, py, pz);
    return this;
};


/**
 * Logs a 4x4 matrix to the console.
 * @param {object} mat  The matrix to log.
 * @param {String} msg  The optional message to precede the vector.
 */
LBGeometry.consoleLogMatrix4 = function(mat, msg) {
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
 * A 3D object, our encapsulation of {@link THREE.Object3D}.
 * @returns {LBGeometry.Object3D}
 */
LBGeometry.Object3D = function() {
    THREE.Object3D.call(this);
};
LBGeometry.Object3D.prototype = Object.create(THREE.Object3D.prototype);
LBGeometry.Object3D.prototype.constructor = LBGeometry.Object3D;


/**
 * Loads the basic settings of a 3D object from a data object.
 * @param {object} data The data containing the settings.
 * @param {object} [obj3D]    If defined the 3D object to be loaded into.
 * @returns {object}    this.
 */
LBGeometry.loadObject3DBasic = function(data, obj3D) {
    if (!obj3D) {
        obj3D = new LBGeometry.Object3D();
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
 * a 'className' property, the value of that property is passed to {@link Leeboard#stringToNewClassInstance}
 * along with the optional 'constructorArgs' property as the argument to the constructor.
 * to create the 3D object object, otherwise new LBGeometry.Object3D() is used.
 * @param {object} data The data to load from.
 * @returns {object}    The 3D object.
 */
LBGeometry.createObject3DFromData = function(data) {
    if (!data) {
        return new LBGeometry.Object3D();
    }
    
    var obj3D;
    if (data.className) {
        obj3D = Leeboard.newClassInstanceFromData(data);
    }
    else {
        obj3D = new LBGeometry.Object3D();
    }
    
    if (obj3D.load) {
        obj3D.load(data);
    }
    else {
        LBGeometry.loadObject3DBasic(data, obj3D);
    }
    return obj3D;
};


/**
 * The 3D point (0, 0, 0)
 * @constant
 * @type LBGeometry.Vector3
 */
LBGeometry.ORIGIN = new LBGeometry.Vector3();

/**
 * A vector representing the x-axis.
 * @constant
 * @type LBGeometry.Vector3
 */
LBGeometry.X_AXIS = new LBGeometry.Vector3(1, 0, 0);

/**
 * A vector representing the y-axis.
 * @constant
 * @type LBGeometry.Vector3
 */
LBGeometry.Y_AXIS = new LBGeometry.Vector3(0, 1, 0);

/**
 * A vector representing the z-axis.
 * @constant
 * @type LBGeometry.Vector3
 */
LBGeometry.Z_AXIS = new LBGeometry.Vector3(0, 0, 1);

/**
 * A plane representing the x-y plane passing through the origin.
 * @constant
 * @type LBGeometry.Plane
 */
LBGeometry.XY_PLANE = new LBGeometry.Plane(LBGeometry.Z_AXIS, 0);

/**
 * A plane representing the z-x plane passing through the origin.
 * @constant
 * @type LBGeometry.Plane
 */
LBGeometry.ZX_PLANE = new LBGeometry.Plane(LBGeometry.Y_AXIS, 0);

/**
 * A plane representing the y-z plane passing through the origin.
 * @constant
 * @type LBGeometry.Plane
 */
LBGeometry.YZ_PLANE = new LBGeometry.Plane(LBGeometry.X_AXIS, 0);

