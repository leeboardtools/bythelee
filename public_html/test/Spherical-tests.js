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


/* global QUnit */

define(['lbspherical', 'lbutil', 'lbgeometry', 'lbmath'], function (LBSpherical, LBUtil, LBGeometry, LBMath) {

var checkVector3 = require('test/Geometry-tests.js').checkVector3;
var checkEuler = require('test/Geometry-tests.js').checkEuler;

QUnit.module('Spherical-tests');

function checkSphericalOrientation(assert, spherical, azimuthDeg, elevationDeg, rotationDeg, msg, tolerance) {
    if (!LBUtil.isVar(msg)) {
        msg = "";
    }
    assert.nearEqual(LBMath.wrapDegrees(spherical.azimuthDeg), LBMath.wrapDegrees(azimuthDeg), msg + " Azimuth OK", tolerance);
    assert.nearEqual(LBMath.wrapDegrees(spherical.elevationDeg), LBMath.wrapDegrees(elevationDeg), msg + " Elevation OK", tolerance);
    assert.nearEqual(LBMath.wrapDegrees(spherical.rotationDeg), LBMath.wrapDegrees(rotationDeg), msg + " Rotation OK", tolerance);
};

function checkSphericalCoordinatesRAA(assert, spherical, radius, azimuthDeg, elevationDeg, msg, tolerance) {
    if (!LBUtil.isVar(msg)) {
        msg = "";
    }
    assert.nearEqual(spherical.radius, radius, msg + " Radius OK", tolerance);
    assert.nearEqual(LBMath.wrapDegrees(spherical.azimuthDeg), LBMath.wrapDegrees(azimuthDeg), msg + " Azimuth OK", tolerance);
    assert.nearEqual(LBMath.wrapDegrees(spherical.elevationDeg), LBMath.wrapDegrees(elevationDeg), msg + " Elevation OK", tolerance);
};

QUnit.test('Orientation', function(assert) {
    var orientation = new LBSpherical.Orientation(10, 20, 30);
    
    var ez = orientation.azimuthDeg * LBMath.DEG_TO_RAD;
    var ey = -orientation.elevationDeg * LBMath.DEG_TO_RAD;
    var ex = orientation.rotationDeg * LBMath.DEG_TO_RAD;
    
    var euler = orientation.toEuler();
    checkEuler(assert, euler, ex, ey, ez, 'ZYX', "to Euler");
    
});

QUnit.test('CoordinatesRAA', function(assert) {
    var spherical = new LBSpherical.CoordinatesRAA(10, 20, 30);
    
    var cartesian = spherical.toVector3();
    
    var theta = (90 - spherical.elevationDeg) * LBMath.DEG_TO_RAD;
    var phi = spherical.azimuthDeg * LBMath.DEG_TO_RAD;
    var x = spherical.radius * Math.sin(theta) * Math.cos(phi);
    var y = spherical.radius * Math.sin(theta) * Math.sin(phi);
    var z = spherical.radius * Math.cos(theta);
    checkVector3(assert, cartesian, x, y, z, "toVector3()");
    
    var spherical2 = new LBSpherical.CoordinatesRAA();
    spherical2.setFromVector3(cartesian);
    checkSphericalCoordinatesRAA(assert, spherical2, spherical.radius, spherical.azimuthDeg, spherical.elevationDeg, "fromVector3");
    
    
    spherical.elevationDeg = -30;
    spherical.toVector3(cartesian);
    
    spherical2.setFromVector3(cartesian);
    checkSphericalCoordinatesRAA(assert, spherical2, spherical.radius, spherical.azimuthDeg, spherical.elevationDeg, "fromVector3 Neg elevation");
});

return {
    checkSphericalOrientation: checkSphericalOrientation,
    checkSphericalCoordinatesRAA: checkSphericalCoordinatesRAA
};
});