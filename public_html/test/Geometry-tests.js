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


/* global QUnit, Leeboard */

function checkVector2(assert, vector, x, y, msg, tolerance) {
    if (!Leeboard.isVar(msg)) {
        msg = "";
    }
    assert.nearEqual(vector.x, x, msg + " X OK", tolerance);
    assert.nearEqual(vector.y, y, msg + " Y OK", tolerance);
};

function checkVectorMagAngle(assert, vector, mag, angleRad, tolerance, msg) {
    if (!Leeboard.isVar(msg)) {
        msg = "";
    }
    if (Leeboard.isVar(mag)) {
        assert.nearEqual(vector.length(), mag, msg + " Mag OK", tolerance);
    }
    if (Leeboard.isVar(angleRad)) {
        assert.nearEqual(vector.angle(), angleRad, msg + " Angle OK", tolerance);
    }
}

function checkVector3(assert, vector, x, y, z, msg, tolerance) {
    if (!Leeboard.isVar(msg)) {
        msg = "";
    }
    assert.nearEqual(vector.x, x, msg + " X OK", tolerance);
    assert.nearEqual(vector.y, y, msg + " Y OK", tolerance);
    assert.nearEqual(vector.z, z, msg + " Z OK", tolerance);
};

function checkQuaternion(assert, quat, x, y, z, w, msg, tolerance) {
    if (!Leeboard.isVar(msg)) {
        msg = "";
    }
    assert.nearEqual(quat.x, x, msg + " QX OK", tolerance);
    assert.nearEqual(quat.y, y, msg + " QY OK", tolerance);
    assert.nearEqual(quat.z, z, msg + " QZ OK", tolerance);
    assert.nearEqual(quat.w, w, msg + " QZ OK", tolerance);
};

function checkEuler(assert, euler, x, y, z, order, msg, tolerance) {
    if (!Leeboard.isVar(msg)) {
        msg = "";
    }
    assert.nearEqual(euler.x, x, msg + " EX OK", tolerance);
    assert.nearEqual(euler.y, y, msg + " EY OK", tolerance);
    assert.nearEqual(euler.z, z, msg + " EZ OK", tolerance);
    assert.equal(euler.order, order, " Order OK");
};

function checkLine2(assert, line, startX, startY, endX, endY, msg, tolerance) {
    if (!Leeboard.isVar(msg)) {
        msg = "";
    }
    checkVector2(assert, line.start, startX, startY, msg + "Start", tolerance);
    checkVector2(assert, line.end, endX, endY, msg + "End", tolerance);
}

function checkMatrix4(assert, mat, refMat, msg, tolerance) {
    if (!Leeboard.isVar(msg)) {
        msg = "";
    }

    for (var i = 0; i < refMat.elements.length; ++i) {
        assert.nearEqual(mat.elements[i], refMat.elements[i], msg + " E" + i + "OK", tolerance);
    }
}

QUnit.test( "applyMatrix4Rotation", function( assert ) {
    var m = Leeboard.createMatrix4();
    var a = 30 * Leeboard.DEG_TO_RAD;
    m.makeRotationZ(a);
    m.setPosition(Leeboard.createVector3(10, 20, 30));
    
    var v = Leeboard.createVector3(10, 0, 0);
    v.applyMatrix4(m);
    checkVector3(assert, v, 10*Math.cos(a) + 10, 10*Math.sin(a) + 20, 30, "applyMatrix4");
    
    v.set(10, 0, 0);
    v.applyMatrix4Rotation(m);
    checkVector3(assert, v, 10*Math.cos(a), 10*Math.sin(a), 0, "applyMatrix4Rotation");
});
    
QUnit.test( "createVector2MagDeg", function( assert ) {
    var vec = Leeboard.createVector2MagDeg(10, 20);
    checkVectorMagAngle(assert, vec, 10, 20 * Leeboard.DEG_TO_RAD);
});

    
QUnit.test( "normalTangent", function( assert ) {
    var refTangent = Leeboard.createVector2(10, 0);
    var normal = Leeboard.tangentToNormalXY(refTangent);
    
    checkVector2(assert, normal, 0, 1, "normal");
    
    var tangent = Leeboard.normalToTangentXY(normal);
    checkVector2(assert, tangent, 1, 0, "tangent");
    
    var refNormal = Leeboard.createVector2(10, 20);
    var normFactor = 1 / refNormal.length();
    
    tangent = Leeboard.normalToTangentXY(refNormal);
    checkVector2(assert, tangent, 20 * normFactor, -10 * normFactor, "tangent 2");
    
    normal = Leeboard.tangentToNormalXY(tangent);
    checkVector2(assert, normal, 10 * normFactor, 20 * normFactor, "normal 2");
});


QUnit.test( "Vector2 Load", function( assert ) {
    var vec2 = Leeboard.loadVector2({ 'x': 1, 'y': 2, 'z': 3 });
    checkVector2(assert, vec2, 1, 2, "All values");
    
    Leeboard.loadVector2({ 'y': 4 }, vec2);
    checkVector2(assert, vec2, 0, 4, "Missing Values");

});
    
    
QUnit.test( "Vector3 Load", function( assert ) {
    var vec3 = Leeboard.loadVector3({ 'x': 1, 'y': 2, 'z': 3 });
    checkVector3(assert, vec3, 1, 2, 3, "All Values");
    
    vec3 = Leeboard.loadVector3({ 'y': 4 }, vec3);
    checkVector3(assert, vec3, 0, 4, 0, "Missing Values");
    
});


QUnit.test( "Quaternion Load", function( assert ) {
    var quat = Leeboard.loadQuaternion({ 'qx': 1, 'qy': 2, 'qz': 3, 'qw':4});
    checkQuaternion(assert, quat, 1, 2, 3, 4, "All Values");
    
    quat = Leeboard.loadQuaternion({ 'qx': -1, 'qy' : -2 });
    checkQuaternion(assert, quat, -1, -2, 0, 1, "Missing Values");
});


QUnit.test( "Quaternion Load", function( assert ) {
    var euler = Leeboard.loadEuler({ 'ex': 1, 'ey': 2, 'ez': 3});
    checkEuler(assert, euler, 1, 2, 3, "XYZ", "All Values");
    
    Leeboard.loadEuler({ 'ey': -2, 'order': "YZX" }, euler);
    checkEuler(assert, euler, 0, -2, 0, "YZX", "Missing Values");
});


QUnit.test( "Matrix4 Load", function( assert ) {
    var elements = [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
    var mat = Leeboard.loadMatrix4({ "elements": [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]});
    
    var refMat = Leeboard.createMatrix4();
    for (var i = 0; i < elements.length; ++i) {
        refMat.elements[i] = elements[i];
    }
    checkMatrix4(assert, mat, refMat, "Elements");
    
    mat = Leeboard.loadMatrix4({ "origin": { 'x': 10, 'y': 11, 'z': 12 } }, mat);
    refMat.identity();
    refMat.setPosition(Leeboard.createVector3(10, 11, 12));
    checkMatrix4(assert, mat, refMat, "Origin");
    
    
    Leeboard.loadMatrix4({ 'rotation': { 'ex': .1, 'ey': .2, 'ez': .3 }}, mat);
    refMat.makeFromEulerAndXYZ(.1, .2, .3, 0, 0, 0);
    checkMatrix4(assert, mat, refMat, "Euler");
    
    Leeboard.loadMatrix4({ 'origin': { 'x':10, 'y':11, 'z':15}, 'rotation': { 'qx': 1, 'qy':2, 'qz':3, 'qw':4}}, mat);
    refMat.makeRotationFromQuaternion(Leeboard.createQuaternion(1, 2, 3, 4));
    refMat.setPosition(Leeboard.createVector3(10, 11, 15));
    checkMatrix4(assert, mat, refMat, "Quaternion-Origin");
});