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

QUnit.module('Spherical-tests');

function checkSphericalCoordinatesRAA(assert, spherical, radius, azimuthDeg, altitudeDeg, msg, tolerance) {
    if (!LBUtil.isVar(msg)) {
        msg = "";
    }
    assert.nearEqual(spherical.radius, radius, msg + " Radius OK", tolerance);
    assert.nearEqual(LBMath.wrapDegrees(spherical.azimuthDeg), LBMath.wrapDegrees(azimuthDeg), msg + " Azimuth OK", tolerance);
    assert.nearEqual(LBMath.wrapDegrees(spherical.altitudeDeg), LBMath.wrapDegrees(altitudeDeg), msg + " Altitude OK", tolerance);
};

QUnit.test('CoordinatesRAA', function(assert) {
    var spherical = new LBSpherical.CoordinatesRAA(10, 20, 30);
    
    var cartesian = spherical.toVector3();
    
    var theta = spherical.azimuthDeg * LBMath.DEG_TO_RAD;
    var phi = (90 - spherical.altitudeDeg) * LBMath.DEG_TO_RAD;
    var x = spherical.radius * Math.sin(theta) * Math.cos(phi);
    var y = spherical.radius * Math.sin(theta) * Math.sin(phi);
    var z = spherical.radius * Math.cos(theta);
    checkVector3(assert, cartesian, x, y, z, "toVector3()");
    
    var spherical2 = new LBSpherical.CoordinatesRAA();
    spherical2.setFromVector3(cartesian);
    checkSphericalCoordinatesRAA(assert, spherical2, spherical.radius, spherical.azimuthDeg, spherical.altitudeDeg, "fromVector3");
    
    
    spherical.altitudeDeg = -130;
    spherical.toVector3(cartesian);
    
    spherical2.setFromVector3(cartesian);
    checkSphericalCoordinatesRAA(assert, spherical2, spherical.radius, spherical.azimuthDeg, spherical.altitudeDeg, "fromVector3 Neg Altitude");
});

return {
    checkSphericalCoordinatesRAA: checkSphericalCoordinatesRAA
};
});