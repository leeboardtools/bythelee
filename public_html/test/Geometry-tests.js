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


/* global QUnit, LBUtil, LBGeometry, LBMath */
define(['lbutil', 'lbgeometry', 'lbmath'], function (LBUtil, LBGeometry, LBMath) {

QUnit.module('Geometry-tests');

function checkVector2(assert, vector, x, y, msg, tolerance) {
    if (!LBUtil.isVar(msg)) {
        msg = "";
    }
    assert.nearEqual(vector.x, x, msg + " X OK", tolerance);
    assert.nearEqual(vector.y, y, msg + " Y OK", tolerance);
};

function checkVectorMagAngle(assert, vector, mag, angleRad, tolerance, msg) {
    if (!LBUtil.isVar(msg)) {
        msg = "";
    }
    if (LBUtil.isVar(mag)) {
        assert.nearEqual(vector.length(), mag, msg + " Mag OK", tolerance);
    }
    if (LBUtil.isVar(angleRad)) {
        assert.nearEqual(vector.angle(), angleRad, msg + " Angle OK", tolerance);
    }
}

function checkVector3(assert, vector, x, y, z, msg, tolerance) {
    if (!LBUtil.isVar(msg)) {
        msg = "";
    }
    assert.nearEqual(vector.x, x, msg + " X OK", tolerance);
    assert.nearEqual(vector.y, y, msg + " Y OK", tolerance);
    assert.nearEqual(vector.z, z, msg + " Z OK", tolerance);
};

function checkQuaternion(assert, quat, x, y, z, w, msg, tolerance) {
    if (!LBUtil.isVar(msg)) {
        msg = "";
    }
    assert.nearEqual(quat.x, x, msg + " QX OK", tolerance);
    assert.nearEqual(quat.y, y, msg + " QY OK", tolerance);
    assert.nearEqual(quat.z, z, msg + " QZ OK", tolerance);
    assert.nearEqual(quat.w, w, msg + " QZ OK", tolerance);
};

function checkEuler(assert, euler, x, y, z, order, msg, tolerance) {
    if (!LBUtil.isVar(msg)) {
        msg = "";
    }
    assert.nearEqual(euler.x, x, msg + " EX OK", tolerance);
    assert.nearEqual(euler.y, y, msg + " EY OK", tolerance);
    assert.nearEqual(euler.z, z, msg + " EZ OK", tolerance);
    assert.equal(euler.order, order, " Order OK");
};

function checkLine2(assert, line, startX, startY, endX, endY, msg, tolerance) {
    if (!LBUtil.isVar(msg)) {
        msg = "";
    }
    checkVector2(assert, line.start, startX, startY, msg + "Start", tolerance);
    checkVector2(assert, line.end, endX, endY, msg + "End", tolerance);
}

function checkMatrix(assert, mat, refMat, msg, tolerance) {
    if (!LBUtil.isVar(msg)) {
        msg = "";
    }

    assert.equal(mat.elements.length, refMat.elements.length, msg + " Elements Match");
    for (var i = 0; i < refMat.elements.length; ++i) {
        assert.nearEqual(mat.elements[i], refMat.elements[i], msg + " E" + i + "OK", tolerance);
    }
}

function checkOrthogonal(assert, vec, ref, msg) {
    if (!LBUtil.isVar(msg)) {
        msg = "";
    }
    var dot = vec.dot(ref);
    assert.nearEqual(dot, 0, msg + " OK");
}

QUnit.test( "applyMatrix4Rotation", function( assert ) {
    var m = new LBGeometry.Matrix4();
    var a = 30 * LBMath.DEG_TO_RAD;
    m.makeRotationZ(a);
    m.setPosition(new LBGeometry.Vector3(10, 20, 30));
    
    var v = new LBGeometry.Vector3(10, 0, 0);
    v.applyMatrix4(m);
    checkVector3(assert, v, 10*Math.cos(a) + 10, 10*Math.sin(a) + 20, 30, "applyMatrix4");
    
    v.set(10, 0, 0);
    v.applyMatrix4Rotation(m);
    checkVector3(assert, v, 10*Math.cos(a), 10*Math.sin(a), 0, "applyMatrix4Rotation");
});
    
QUnit.test( "createVector2MagDeg", function( assert ) {
    var vec = LBGeometry.createVector2MagDeg(10, 20);
    checkVectorMagAngle(assert, vec, 10, 20 * LBMath.DEG_TO_RAD);
});

QUnit.test( "angleToSigned", function( assert ) {
    var vecA = new LBGeometry.Vector2(0.3, 0);
    var vecB = new LBGeometry.Vector2(0.493689568995088, 0.031062650308456);
    var angle = vecA.angleToSigned(vecB);
    var refAngle = Math.acos(vecA.dot(vecB) / vecA.length() / vecB.length());
    assert.nearEqual(angle, refAngle, "Check A");
    
    angle = vecB.angleToSigned(vecA);
    assert.nearEqual(angle, -refAngle, "Check B");
    
    vecA.set(0, 10);
    refAngle = 30 * LBMath.DEG_TO_RAD;
    vecB.set(-3 * Math.cos(refAngle), -3 * Math.sin(refAngle));
    refAngle = 90 * LBMath.DEG_TO_RAD + refAngle;
    
    angle = vecA.angleToSigned(vecB);
    assert.nearEqual(angle, refAngle, "Check C");
    
    angle = vecB.angleToSigned(vecA);
    assert.nearEqual(angle, -refAngle, "Check D");
});

    
QUnit.test( "normalTangent", function( assert ) {
    var refTangent = new LBGeometry.Vector2(10, 0);
    var normal = LBGeometry.tangentToNormalXY(refTangent);
    
    checkVector2(assert, normal, 0, 1, "normal");
    
    var tangent = LBGeometry.normalToTangentXY(normal);
    checkVector2(assert, tangent, 1, 0, "tangent");
    
    var refNormal = new LBGeometry.Vector2(10, 20);
    var normFactor = 1 / refNormal.length();
    
    tangent = LBGeometry.normalToTangentXY(refNormal);
    checkVector2(assert, tangent, 20 * normFactor, -10 * normFactor, "tangent 2");
    
    normal = LBGeometry.tangentToNormalXY(tangent);
    checkVector2(assert, normal, 10 * normFactor, 20 * normFactor, "normal 2");
});


QUnit.test( "Vector2 Load", function( assert ) {
    var vec2 = LBGeometry.loadVector2({ 'x': 1, 'y': 2, 'z': 3 });
    checkVector2(assert, vec2, 1, 2, "All values");
    
    LBGeometry.loadVector2({ 'y': 4 }, vec2);
    checkVector2(assert, vec2, 0, 4, "Missing Values");

});
    
    
QUnit.test( "Vector3 Load", function( assert ) {
    var vec3 = LBGeometry.loadVector3({ 'x': 1, 'y': 2, 'z': 3 });
    checkVector3(assert, vec3, 1, 2, 3, "All Values");
    
    vec3 = LBGeometry.loadVector3({ 'y': 4 }, vec3);
    checkVector3(assert, vec3, 0, 4, 0, "Missing Values");
    
});


QUnit.test( "Quaternion Load", function( assert ) {
    var quat = LBGeometry.loadQuaternion({ 'qx': 1, 'qy': 2, 'qz': 3, 'qw':4});
    checkQuaternion(assert, quat, 1, 2, 3, 4, "All Values");
    
    quat = LBGeometry.loadQuaternion({ 'qx': -1, 'qy' : -2 });
    checkQuaternion(assert, quat, -1, -2, 0, 1, "Missing Values");
});


QUnit.test( "Quaternion Load", function( assert ) {
    var euler = LBGeometry.loadEuler({ 'ex': 1, 'ey': 2, 'ez': 3});
    checkEuler(assert, euler, 1, 2, 3, "XYZ", "All Values");
    
    LBGeometry.loadEuler({ 'ey': -2, 'order': "YZX" }, euler);
    checkEuler(assert, euler, 0, -2, 0, "YZX", "Missing Values");
});


QUnit.test( "Matrix4 Load", function( assert ) {
    var elements = [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
    var mat = LBGeometry.loadMatrix4({ "elements": [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]});
    
    var refMat = new LBGeometry.Matrix4();
    for (var i = 0; i < elements.length; ++i) {
        refMat.elements[i] = elements[i];
    }
    checkMatrix(assert, mat, refMat, "Elements");
    
    mat = LBGeometry.loadMatrix4({ "origin": { 'x': 10, 'y': 11, 'z': 12 } }, mat);
    refMat.identity();
    refMat.setPosition(new LBGeometry.Vector3(10, 11, 12));
    checkMatrix(assert, mat, refMat, "Origin");
    
    
    LBGeometry.loadMatrix4({ 'rotation': { 'ex': .1, 'ey': .2, 'ez': .3 }}, mat);
    refMat.makeFromEulerAndXYZ(.1, .2, .3, 0, 0, 0);
    checkMatrix(assert, mat, refMat, "Euler");
    
    LBGeometry.loadMatrix4({ 'origin': { 'x':10, 'y':11, 'z':15}, 'rotation': { 'qx': 1, 'qy':2, 'qz':3, 'qw':4}}, mat);
    refMat.makeRotationFromQuaternion(new LBGeometry.Quaternion(1, 2, 3, 4));
    refMat.setPosition(new LBGeometry.Vector3(10, 11, 15));
    checkMatrix(assert, mat, refMat, "Quaternion-Origin");
});

QUnit.test( "makeOrthogonal", function( assert ) {
    var vecA = new LBGeometry.Vector3(2, 3, 4);
    var result = LBGeometry.makeOrthogonal(vecA);
    checkOrthogonal(assert, result, vecA, "2, 3, 4");
    
    vecA.set(1, 0, 0);
    LBGeometry.makeOrthogonal(vecA, result);
    checkOrthogonal(assert, result, vecA, "1, 0, 0");

    vecA.set(0, -1, 0);
    LBGeometry.makeOrthogonal(vecA, result);
    checkOrthogonal(assert, result, vecA, "0, -1, 0");

    vecA.set(0, 0, 1);
    LBGeometry.makeOrthogonal(vecA, result);
    checkOrthogonal(assert, result, vecA, "0, 0, 1");
});

return {
    checkVector2: checkVector2,
    checkVector3: checkVector3,
    checkLine2: checkLine2,
    checkMatrix: checkMatrix,
    checkEuler: checkEuler,
    checkQuaternion: checkQuaternion
};

});