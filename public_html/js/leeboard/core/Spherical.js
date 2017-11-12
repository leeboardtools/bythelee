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


define(['lbmath', 'lbgeometry'], 
function(LBMath, LBGeometry) {
    
    'use strict';

/**
 * This module contains stuff for working with spherical coordinates.
 * @exports LBSpherical
 */
var LBSpherical = LBSpherical || {};
    
var _workingEuler = new LBGeometry.Euler();


/**
 * Defines an orientation in spherical coordinates using azimuth, elevation, and rotation
 * angles in degrees.
 * <p>
 * An azimuth of 0 degrees points towards the +x axis. We follow the navigation convention, 
 * normal rotation is CW (towards -y).
 * An elevation of + degrees points towards the +z axis.
 * The rotation angle is around the azimuth/elevation axis
 * @constructor
 * @param {Number} [azimuthDeg=0]   The azimuth in degrees.
 * @param {Number} [elevationDeg=0]   The elevation in degrees.
 * @param {Number} [rotationDeg=0]   The rotation in degrees.
 * @returns {module:LBSpherical.Orientation}
 */
LBSpherical.Orientation = function(azimuthDeg, elevationDeg, rotationDeg) {
    /**
     * The azimuth angle in degrees, this is the CW rotation about the world z-axis.
     * @member {Number}
     */
    this.azimuthDeg = azimuthDeg || 0;

    /**
     * The elevation angle in degrees, this is the rotation about the y-axis after it
     * has been rotated by the azimuth..
     * @member {Number}
     */
    this.elevationDeg = elevationDeg || 0;
    
    /**
     * The rotation angle in degrees, this is the rotation about the local x-axis
     * after the azimuth and elevation rotations.
     * @member {Number}
     */
    this.rotationDeg = rotationDeg || 0;
};


/**
 * A {@link module:LBSpherical.Orientation} that's all 0.
 * @constant
 * @type {module:LBSpherical.Orientation}
 */
LBSpherical.Orientation.ZERO = new LBSpherical.Orientation();

LBSpherical.Orientation.prototype = {
    /**
     * Creates a copy of this.
     * @returns {module:LBSpherical.Orientation}   The copy.
     */
    clone: function() {
        var obj = new LBSpherical.Orientation();
        return obj.copy(this);
    },
    
    /**
     * Sets this to match another orientation.
     * @param {module:LBSpherical.Orientation} other   The orientation to copy.
     * @returns {module:LBSpherical.Orientation}   this.
     */
    copy: function(other) {
        this.azimuthDeg = other.azimuthDeg;
        this.elevationDeg = other.elevationDeg;
        this.rotationDeg = other.rotationDeg;
        return this;
    },
    
    /**
     * Determines if this orientation and another orientation are the same.
     * @param {module:LBSpherical.Orientation} other   The orientation to test against.
     * @returns {boolean}   true if they are the same.
     */
    equals: function(other) {
        return LBMath.degreesEqual(this.azimuthDeg, other.azimuthDeg)
            && LBMath.degreesEqual(this.elevationDeg, other.elevationDeg)
            && LBMath.degreesEqual(this.rotationDeg, other.rotationDeg);
    },
    
    /**
     * Calculates a point at a distance along the ray defined by the orientation.
     * @param {Number} r    The distance.
     * @param {module:LBGeometry.Vector3} [store]    If defined the object to store the point in.
     * @returns {module:LBGeometry.Vector3}    The point.
     */
    calcLookAtPoint: function(r, store) {
        r = r || 1;
        store = store || new LBGeometry.Vector3();
        
        var theta = (90 - this.elevationDeg) * LBMath.DEG_TO_RAD;
        var phi = -this.azimuthDeg * LBMath.DEG_TO_RAD;
        var r_sinTheta = r * Math.sin(theta);
        return store.set(r_sinTheta * Math.cos(phi), r_sinTheta * Math.sin(phi), r * Math.cos(theta));
    },
    
    /**
     * Calculates the {@link module:LBGeometry.Euler} equivalent.
     * @param {module:LBGeometry.Euler} [store]    If defined the object to store into.
     * @returns {module:LBGeometry.Euler}  The Euler object.
     */
    toEuler: function(store) {
        return (store) ? store.set(this.rotationDeg * LBMath.DEG_TO_RAD, -this.elevationDeg * LBMath.DEG_TO_RAD, -this.azimuthDeg * LBMath.DEG_TO_RAD, 'ZYX')
            : new LBGeometry.Euler(this.rotationDeg * LBMath.DEG_TO_RAD, -this.elevationDeg * LBMath.DEG_TO_RAD, -this.azimuthDeg * LBMath.DEG_TO_RAD, 'ZYX');
    },
    
    /**
     * Calculates the {@link module:LBGeometry.Quaternion} equivalent.
     * @param {module:LBGeometry.Quaternion} [store]   If defined the object to store into.
     * @returns {module:LBGeometry.Quaternion} The quaternion.
     */
    toQuaternion: function(store) {
        store = store || new LBGeometry.Quaternion();
        return store.setFromEuler(this.toEuler(_workingEuler));
    },
    
    /**
     * Calculates a {@link module:LBGeometry.Matrix4} rotation matrix equivalent of the orientation.
     * @param {module:LBGeometry.Matrix4} [store]  If defined the object to store into.
     * @returns {module:LBGeometry.Matrix4}    The rotation matrix.
     */
    toMatrix4: function(store) {
        store = store || new LBGeometry.Matrix4();
        return store.makeRotationFromEuler(this.toEuler(_workingEuler));
    },
    
    /**
     * Sets the orientation angles to all zero.
     * @returns {module:LBSpherical.Orientation}
     */
    zero: function() {
        this.azimuthDeg = 0;
        this.elevationDeg = 0;
        this.rotationDeg = 0;
        return this;
    },
    
    constructor: LBSpherical.Orientation
};


/**
 * Defines a point in spherical coordinates using radius, azimuth, and elevation (RAE).
 * @constructor
 * @param {Number} [radius=0]   The radius
 * @param {Number} [azimuthDeg=0]   The azimuth in degrees.
 * @param {Number} [elevationDeg=0]  The elevation in degrees.
 * @returns {module:LBSpherical.CoordinatesRAE}
 */
LBSpherical.CoordinatesRAE = function(radius, azimuthDeg, elevationDeg) {
    this.radius = radius || 0;
    this.azimuthDeg = azimuthDeg || 0;
    this.elevationDeg = elevationDeg || 0;
};


/**
 * An {@link module:LBSpherical.CoordinatesRAE} that's all zero.
 * @constant
 * @type {module:LBSpherical.CoordinatesRAE}
 */
LBSpherical.CoordinatesRAE.ZERO = new LBSpherical.CoordinatesRAE();

LBSpherical.CoordinatesRAE.prototype = {
    /**
     * Creates a clone of this.
     * @returns {module:LBSpherical.CoordinatesRAE}   The clone.
     */
    clone: function() {
        return new LBSpherical.CoordinatesRAE(this.radius, this.azimuthDeg, this.elevationDeg);
    },
    
    /**
     * Sets this to match another.
     * @param {module:LBSpherical.CoordinatesRAE} other   The object to copy.
     * @returns {module:LBSpherical.CoordinatesRAE}   this.
     */
    copy: function(other) {
        this.radius = other.radius;
        this.azimuthDeg = other.azimuthDeg;
        this.elevationDeg = other.elevationDeg;
        return this;
    },
    
    /**
     * Sets the azimuth and elevation to match those of a spherical orientation.
     * @param {module:LBSpherical.Orientation} orientation The orientation to copy from.
     * @returns {module:LBSpherical.CoordinatesRAE}   this.
     */
    setFromSphericalOrientation: function(orientation) {
        this.azimuthDeg = orientation.azimuthDeg;
        this.elevationDeg = orientation.elevationDeg;
        return this;
    },
    
    /**
     * Sets up a spherical orientation with the azimuth and elevation.
     * @param {module:LBSpherical.Orientation} [store] If defined the object to store into.
     * @returns {module:LBSpherical.Orientation}   The spherical orientation.
     */
    toSphericalOrientation: function(store) {
        if (store) {
            store.azimuthDeg = this.azimuthDeg;
            store.elevationDeg = this.elevationDeg;
            store.rotationDeg = 0;
            return store;
        }
        else {
            return new LBSpherical.Orientation(this.azimuthDeg, this.elevationDeg, 0);
        }
    },
    
    /**
     * Sets the coordinates from a point in cartesian coordinates.
     * @param {module:LBGeometry.Vector3} point The cartesian coordinates.
     * @returns {module:LBSpherical.CoordinatesRAE}   this.
     */
    setFromVector3: function(point) {
        this.radius = point.length();
        
        if (LBMath.isLikeZero(this.radius)) {
            this.azimuthDeg = 0;
            this.elevationDeg = 0;
        }
        else {
            var theta = Math.acos(point.z / this.radius);
            var phi = Math.atan2(point.y, point.x);
            
            this.azimuthDeg = -phi * LBMath.RAD_TO_DEG;
            this.elevationDeg = 90 - theta * LBMath.RAD_TO_DEG;
        }
        
        return this;
    },
    
    /**
     * Calculates the cartesian coordinate equivalent.
     * @param {module:LBGeometry.Vector3} [store]  If defined the object to store the coordinates into.
     * @returns {module:LBGeometry.Vector3}    The cartesian coordinates.
     */
    toVector3: function(store) {
        store = store || new LBGeometry.Vector3();
        
        var theta = (90 - this.elevationDeg) * LBMath.DEG_TO_RAD;
        var rSinTheta = this.radius * Math.sin(theta);
        
        var phi = -this.azimuthDeg * LBMath.DEG_TO_RAD;
        store.x = rSinTheta * Math.cos(phi);
        store.y = rSinTheta * Math.sin(phi);
        store.z = this.radius * Math.cos(theta);
        
        return store;
    },
    
    
    /**
     * Adjust the elevation so the cartesian coordinate equivalent has a given z,
     * while maintaining the azimuth and radius.
     * @param {Number} z    The z coordinate of interest. If this is larger than
     * the radius, then the radius will just be set to this and the elevation will be 90.
     * @returns {module:LBSpherical.CoordinatesRAE}    this.
     */
    adjustElevationForZ: function(z) {
        if (z <= this.radius) {
            var theta = Math.acos(z / this.radius);
            this.elevationDeg = 90 - theta * LBMath.RAD_TO_DEG;
        }
        else {
            this.radius = z;
            this.elevationDeg = 90;
        }
        return this;
    },
    
    constructor: LBSpherical.CoordinatesRAE
};
    
    return LBSpherical;
});