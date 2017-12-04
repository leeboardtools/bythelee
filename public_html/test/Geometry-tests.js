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
};

function checkMatrix(assert, mat, refMat, msg, tolerance) {
    if (!LBUtil.isVar(msg)) {
        msg = "";
    }

    assert.equal(mat.elements.length, refMat.elements.length, msg + " Elements Match");
    for (var i = 0; i < refMat.elements.length; ++i) {
        assert.nearEqual(mat.elements[i], refMat.elements[i], msg + " E" + i + "OK", tolerance);
    }
};

function checkOrthogonal(assert, vec, ref, msg) {
    if (!LBUtil.isVar(msg)) {
        msg = "";
    }
    var dot = vec.dot(ref);
    assert.nearEqual(dot, 0, msg + " OK");
};

function checkRect(assert, rect, minX, minY, maxX, maxY, msg, tolerance) {
    if (!LBUtil.isVar(msg)) {
        msg = "";
    }
    assert.nearEqual(rect.minX, minX, msg + " minX", tolerance);
    assert.nearEqual(rect.minY, minY, msg + " minY", tolerance);
    assert.nearEqual(rect.maxX, maxX, msg + " maxX", tolerance);
    assert.nearEqual(rect.maxY, maxY, msg + " maxY", tolerance);
};

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

QUnit.test("rect", function(assert) {
    var rect = new LBGeometry.Rect();
    assert.ok(rect.isEmpty(), "isEmpty");
    
    rect.set(1, 2, 3, 4);
    checkRect(assert, rect, 1, 2, 3, 4, "set");
    assert.notOk(rect.isEmpty(), "not isEmpty");
    
    var clone = rect.clone();
    checkRect(assert, clone, 1, 2, 3, 4, "clone");
    
    assert.ok(rect.isEqual(clone), "rect.isEqual(clone)");
    assert.ok(clone.isEqual(rect), "clone.isEqual(rect)");
    
    var rect2 = new LBGeometry.Rect(new LBGeometry.Vector2(1, 2), new LBGeometry.Vector2(3, 5));
    checkRect(assert, rect2, 1, 2, 3, 5, "point constructor arg");
    
    assert.notOk(rect.isEqual(rect2), "not rect.isEqual(rect2)");
    assert.notOk(rect2.isEqual(rect), "not rect2.isEqual(rect)");
    
    var rect3 = new LBGeometry.Rect(rect2);
    checkRect(assert, rect3, 1, 2, 3, 5, "rect constructor arg");
    
    rect3.set(5, 6, 7, 8);
    checkRect(assert, rect3, 5, 6, 7, 8, "set");
    
    rect3.makeEmpty();
    assert.ok(rect3.isEmpty(), "makeEmpty");
    
    rect3.copy(rect2);
    checkRect(assert, rect3, 1, 2, 3, 5, "copy");
    
    rect3.extendToPoint(2, 4);
    checkRect(assert, rect3, 1, 2, 3, 5, "extendToPoint x,y inside");
    
    rect3.extendToPoint(6, 7);
    checkRect(assert, rect3, 1, 2, 6, 7, "extendToPoint x,y outside max");
    
    rect3.extendToPoint(new LBGeometry.Vector2(0, 1));
    checkRect(assert, rect3, 0, 1, 6, 7, "extendToPoint Vector2 outside min");
    
    assert.ok(rect3.containsPoint(0, 1), "containsPoint xy on min");
    assert.ok(rect3.containsPoint(new LBGeometry.Vector2(6, 7)), "containsPoint vector2 on max");    
    assert.notOk(rect3.containsPoint(new LBGeometry.Vector2(-0.00001, 1)), "containsPoint x below min");
    assert.notOk(rect3.containsPoint(new LBGeometry.Vector2(1, 0.999999)), "containsPoint y below min");
    assert.notOk(rect3.containsPoint(6.00001, 5), "containsPoint x above max");
    assert.notOk(rect3.containsPoint(5, 7.0001), "containsPoint y above max");
    
    rect.set(10, 20, 100, 200);
    rect.extendToRect(new LBGeometry.Rect(10, 20, 30, 50));
    checkRect(assert, rect, 10, 20, 100, 200, "extendToRect inside");
    
    rect2.makeEmpty();
    rect.extendToRect(rect2);
    checkRect(assert, rect, 10, 20, 100, 200, "extendToRect arg rect empty");

    rect2.extendToRect(rect);
    checkRect(assert, rect2, 10, 20, 100, 200, "extendToRect initial rect empty");
    
    rect3.set(110, 5, 120, 70);
    assert.notOk(rect3.isEmpty(), "isEmpty 110, 5, 120, 70");
    
    rect.extendToRect(rect3);
    checkRect(assert, rect, 10, 5, 120, 200, "extendToRect extend minY, maxX");
    
    rect3.set(-5, 240, 0, 250);
    rect.extendToRect(rect3);
    checkRect(assert, rect, -5, 5, 120, 250, "extendToRect extend minX, maxY");
    
    rect.set(10, 100, 20, 200);
    rect2.set(11, 110, 12, 120);
    rect3.copy(rect2);
    assert.ok(rect.containsEntireRect(rect2), "containsEntireRect");
    assert.ok(rect.containsEntireRect(rect), "containsEntireRect self");
    
    rect2.minX = 9;
    assert.notOk(rect.containsEntireRect(rect2), "containsEntireRect minX out");
    assert.ok(rect.containsAnyOfRect(rect2), "containsAnyOfRect minX out");
    
    rect2.copy(rect3);
    rect2.minY = 99;
    assert.notOk(rect.containsEntireRect(rect2), "containsEntireRect minY out");
    assert.ok(rect.containsAnyOfRect(rect2), "containsAnyOfRect minY out");
    
    rect2.copy(rect3);
    rect2.maxX = 21;
    assert.notOk(rect.containsEntireRect(rect2), "containsEntireRect maxX out");
    assert.ok(rect.containsAnyOfRect(rect2), "containsAnyOfRect maxX out");
    
    rect2.copy(rect3);
    rect2.maxY = 201;
    assert.notOk(rect.containsEntireRect(rect2), "containsEntireRect minY out");
    assert.ok(rect.containsAnyOfRect(rect2), "containsAnyOfRect minY out");
    
    rect2.minY = 201;
    assert.notOk(rect.containsEntireRect(rect2), "containsEntireRect minY, maxY above maxY");
    assert.notOk(rect.containsAnyOfRect(rect2), "containsAnyOfRect minY,maxY above maxY");
    
    rect2.copy(rect3);
    rect2.maxY = 90;
    rect2.minY = 99;
    assert.notOk(rect.containsEntireRect(rect2), "containsEntireRect minY, maxY below minY");
    assert.notOk(rect.containsAnyOfRect(rect2), "containsAnyOfRect minY,maxY below minY");
    
    rect2.copy(rect3);
    rect2.maxX = 22;
    rect2.minX = 21;
    assert.notOk(rect.containsEntireRect(rect2), "containsEntireRect minX, maxX above maxX");
    assert.notOk(rect.containsAnyOfRect(rect2), "containsAnyOfRect minX,maxX above maxX");
    
    rect2.copy(rect3);
    rect2.maxX = 9;
    rect2.minX = 8;
    assert.notOk(rect.containsEntireRect(rect2), "containsEntireRect minX, maxX below minX");
    assert.notOk(rect.containsAnyOfRect(rect2), "containsAnyOfRect minX,maxX below minX");
    
    rect.set(10, 20, 30, 40);
    rect.offset(1, 2);
    checkRect(assert, rect, 11, 22, 31, 42, "offset 1, 2");
    
    rect.multiply(10, 20);
    checkRect(assert, rect, 110, 440, 310, 840, "multiply 10, 20");
    
    assert.equal(rect.width(), 200, "width");
    assert.equal(rect.height(), 840-440, "height");
    assert.equal(rect.centerX(), (110+310)/2, "centerX");
    assert.equal(rect.centerY(), (840+440)/2, "centerY");
    
    rect.set(10, 100, 20, 200);

    var center = rect.getCenter();
    checkVector2(assert, center, 15, 150, "getCenter");
    
    rect.setCenter(50, 250);
    rect.getCenter(center);
    checkVector2(assert, center, 50, 250, "getCenter Vector2");
    checkRect(assert, rect, 45, 200, 55, 300, "setCenter");
    
    rect.setWidth(20);
    rect.setHeight(200);
    checkRect(assert, rect, 40, 150, 60, 350, "setWidth, setHeight");
    
    rect.setSize(10, 100);
    checkRect(assert, rect, 45, 200, 55, 300, "setSize");
});

QUnit.test("rotation2D", function(assert) {
    var rotation = new LBGeometry.Rotation2D();
    var vec = new LBGeometry.Vector2(10, 5);
    rotation.rotationDeg = 90;
    
    var vecTest = rotation.rotateVector2(vec);
    checkVector2(assert, vecTest, -vec.y, vec.x, "rotate 90");
    
    rotation.invRotateVector2(vecTest, vecTest);
    checkVector2(assert, vecTest, vec.x, vec.y, "inv rotate 90");
    
    rotation.rotationDeg = -90;
    vecTest = rotation.rotateVector2(vec, vecTest);
    checkVector2(assert, vecTest, vec.y, -vec.x, "rotate -90");
    assert.nearEqual(rotation.rotationRad, -LBMath.PI_2, "rotationRad -90");
    
    rotation.invRotateVector2(vecTest, vecTest);
    checkVector2(assert, vecTest, vec.x, vec.y, "inv rotate 90");
    
    rotation.rotationDeg = -180;
    vecTest = rotation.rotateVector2(vec, vecTest);
    checkVector2(assert, vecTest, -vec.x, -vec.y, "rotate -180");
    
    rotation.invRotateVector2(vecTest, vecTest);
    checkVector2(assert, vecTest, vec.x, vec.y, "inv rotate -180");
    
    rotation.rotationDeg = 180;
    vecTest = rotation.rotateVector2(vec, vecTest);
    checkVector2(assert, vecTest, -vec.x, -vec.y, "rotate 180");
    
    rotation.invRotateVector2(vecTest, vecTest);
    checkVector2(assert, vecTest, vec.x, vec.y, "inv rotate 180");
    
    rotation.rotationDeg = 30;
    vecTest = rotation.rotateVector2(vec, vecTest);
    var rad = rotation.rotationDeg * LBMath.DEG_TO_RAD;
    var refX = vec.x * Math.cos(rad) - vec.y * Math.sin(rad);
    var refY = vec.x * Math.sin(rad) + vec.y * Math.cos(rad);
    checkVector2(assert, vecTest, refX, refY, "rotate 30 deg");
    
    rotation.invRotateVector2(vecTest, vecTest);
    checkVector2(assert, vecTest, vec.x, vec.y, "inv rotate 30");
    
    rotation.setFromVector2(new LBGeometry.Vector2(10, 10));
    assert.equal(rotation.rotationDeg, 45, "setFromVector2(10,10)");

    rotation.setFromVector2(new LBGeometry.Vector2(-10, 10));
    assert.equal(rotation.rotationDeg, 135, "setFromVector2(-10,10)");

    rotation.setFromVector2(new LBGeometry.Vector2(-10, -10));
    assert.equal(rotation.rotationDeg, -135, "setFromVector2(-10,-10)");

    rotation.setFromVector2(new LBGeometry.Vector2(10, -10));
    assert.equal(rotation.rotationDeg, -45, "setFromVector2(10,-10)");
});

QUnit.test("ellipse", function(assert) {
    var ellipse = new LBGeometry.Ellipse(10, 5);
    
    assert.equal(ellipse.rotationDeg, 0, "rotationDeg=0");
    
    var result = ellipse.getYsForX(10);
    assert.nearEqual(result, [0], "x=10");
    
    result = ellipse.getYsForX(-10, result);
    assert.nearEqual(result, [0], "x=-10");
    
    result = ellipse.getYsForX(-11, result);
    assert.nearEqual(result, [], "x=-11");
    
    result = ellipse.getYsForX(11, result);
    assert.nearEqual(result, [], "x=11");
    
    result = ellipse.getYsForX(0, result);
    assert.nearEqual(result, [5, -5], "x=0");
    
    var refX = 5;
    var refY = ellipse.yAxis / ellipse.xAxis * Math.sqrt(ellipse.xAxis * ellipse.xAxis - refX * refX);
    result = ellipse.getYsForX(5, result);
    assert.nearEqual(result, [refY, -refY], "x=5");

    result = ellipse.getYsForX(-5, result);
    assert.nearEqual(result, [refY, -refY], "x=-5");
    
    
    ellipse.getXsForY(5, result);
    assert.nearEqual(result, [0], "y=5");

    ellipse.getXsForY(-5, result);
    assert.nearEqual(result, [0], "y=-5");
    
    ellipse.getXsForY(6, result);
    assert.nearEqual(result, [], "y=6");
    
    ellipse.getXsForY(-6, result);
    assert.nearEqual(result, [], "y=-6");
    
    ellipse.getXsForY(0, result);
    assert.nearEqual(result, [10, -10], "y=0");

    ellipse.getXsForY(refY, result);
    assert.nearEqual(result, [refX, -refX], "y=" + refY);
    
    
    ellipse.getSlopeAtX(0, result);
    assert.nearEqual(result, [0], "slope at x=0");
    
    ellipse.getSlopeAtX(10, result);
    assert.nearEqual(result, [Number.POSITIVE_INFINITY], "slope at x=10");
    
    ellipse.getSlopeAtX(-10, result);
    assert.nearEqual(result, [Number.POSITIVE_INFINITY], "slope at x=-10");
    
    var dydx = - refX * ellipse.yAxis * ellipse.yAxis / (refY * ellipse.xAxis * ellipse.xAxis);
    ellipse.getSlopeAtX(refX, result);
    assert.nearEqual(result, [dydx, -dydx], "slope at x=" + refX);

    ellipse.getSlopeAtX(-refX, result);
    assert.nearEqual(result, [-dydx, dydx], "slope at x=" + -refX);
    
    ellipse.getSlopeAtY(0, result);
    assert.nearEqual(result, [Number.POSITIVE_INFINITY], "slope at y=0");
    
    ellipse.getSlopeAtY(5, result);
    assert.nearEqual(result, [0], "slope at y=5");

    ellipse.getSlopeAtY(-5, result);
    assert.nearEqual(result, [0], "slope at y=-5");

    ellipse.getSlopeAtY(refY, result);
    assert.nearEqual(result, [dydx, -dydx], "slope at y=" + refY);

    ellipse.getSlopeAtY(-refY, result);
    assert.nearEqual(result, [-dydx, dydx], "slope at x=" + -refY);
    
    
    ellipse.getPointsWithTangent(0, result);
    assert.nearEqual(result, [0, 5, 0, -5], "points with tangent 0");

    ellipse.getPointsWithTangent(Number.POSITIVE_INFINITY, result);
    assert.nearEqual(result, [10, 0, -10, 0], "points with tangent infinity");

    ellipse.getPointsWithTangent(Number.NEGATIVE_INFINITY, result);
    assert.nearEqual(result, [10, 0, -10, 0], "points with tangent -infinity");
    
    ellipse.getPointsWithTangent(dydx, result);
    assert.nearEqual(result, [refX, refY, -refX, -refY], "points with tangent " + dydx);
    
    ellipse.getPointsWithTangent(-dydx, result);
    assert.nearEqual(result, [refX, -refY, -refX, refY], "points with tangent " + -dydx);
    

    assert.ok(ellipse.isPointInEllipse(10,0), "isPointInEllipse 10,0");
    assert.notOk(ellipse.isPointInEllipse(10.00001,0), "isPointInEllipse 10.00001,0");
    assert.ok(ellipse.isPointInEllipse(-10,0), "isPointInEllipse -10,0");
    assert.notOk(ellipse.isPointInEllipse(-10.00001,0), "isPointInEllipse -10.00001,0");

    assert.ok(ellipse.isPointInEllipse(8,1), "isPointInEllipse 8,1");

    assert.ok(ellipse.isPointInEllipse(0,5), "isPointInEllipse 0,5");
    assert.notOk(ellipse.isPointInEllipse(0,5.00001), "isPointInEllipse 0,5.00001");
    assert.ok(ellipse.isPointInEllipse(0,-5), "isPointInEllipse 0,-5");
    assert.notOk(ellipse.isPointInEllipse(0,-5.00001), "isPointInEllipse 0,-5.00001");
});


QUnit.test("parametricLineIntersection", function(assert) {
    var fromA = new LBGeometry.Vector2(10, 0);
    var toA = new LBGeometry.Vector2(20, 0);
    
    var fromB = new LBGeometry.Vector2(10, 1);
    var toB = new LBGeometry.Vector2(20, 1);
    
    var result = LBGeometry.calcParametricLineIntersection(fromA, toA, fromB, toB);
    assert.equal(result.length, 0, "parallel lines");
    
    fromB.set(12, 5);
    toB.set(12, 15);
    LBGeometry.calcParametricLineIntersection(fromA, toA, fromB, toB, result);
    assert.nearEqual(result, [0.2, -0.5], "intersection");
});

return {
    checkVector2: checkVector2,
    checkVector3: checkVector3,
    checkLine2: checkLine2,
    checkMatrix: checkMatrix,
    checkEuler: checkEuler,
    checkQuaternion: checkQuaternion,
    checkRect: checkRect
};

});