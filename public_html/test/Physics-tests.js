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


/* global QUnit, LBUtil, LBPhysics, LBGeometry, LBMath */
define(['lbutil', 'lbphysics', 'lbgeometry', 'lbmath'], function (LBUtil, LBPhysics, LBGeometry, LBMath) {

var checkVector3 = require('test/Geometry-tests.js').checkVector3;
var checkMatrix = require('test/Geometry-tests.js').checkMatrix;

QUnit.module('Physics-tests');

function checkResultant3D(assert, resultant, fx, fy, fz, mx, my, mz, px, py, pz, msg, tolerance) {
    if (!LBUtil.isVar(msg)) {
        msg = "";
    }

    checkVector3(assert, resultant.applPoint, px, py, pz, msg + "ApplPoint:", tolerance);
    checkVector3(assert, resultant.force, fx, fy, fz, msg + "Force:", tolerance);
    checkVector3(assert, resultant.moment, mx, my, mz, msg + "Moment:", tolerance);
}

QUnit.test( "Resultant-AddForce", function( assert ) {
    var resultant = new LBPhysics.Resultant3D(
            new LBGeometry.Vector3(1, 2, 3),   // force
            new LBGeometry.Vector3(2, 3, 4),   // moment
            new LBGeometry.Vector3(3, 4, 5));  // position
    checkResultant3D(assert, resultant, 1, 2, 3, 2, 3, 4, 3, 4, 5, "Constructor: ");
    
    resultant.force.set(0, 0, 0);
    resultant.moment.set(0, 0, 0);
    resultant.applPoint.set(0, 0, 0);
    checkResultant3D(assert, resultant, 0, 0, 0, 0, 0, 0, 0, 0, 0, "Zero: ");
    
    var vec_1_2_3 = new LBGeometry.Vector3(1, 2, 3);
    var vec_2_0_0 = new LBGeometry.Vector3(2, 0, 0);
    resultant.addForce(vec_1_2_3, vec_2_0_0);
    checkResultant3D(assert, resultant, 1, 2, 3, 0, -6, 4, 0, 0, 0, "Simple AddForce: ");
    
    resultant.moveApplPoint(vec_2_0_0);
    checkResultant3D(assert, resultant, 1, 2, 3, 0, 0, 0, 2, 0, 0, "MoveApplPoint: ");
    
    // Add a force in the opposite direction at the negative of the original application point,
    // we should now have a pure moment.
    var vec_m1_m2_m3 = vec_1_2_3.clone().negate();
    var vec_m2_0_0 = vec_2_0_0.clone().negate();
    resultant.addForce(vec_m1_m2_m3, vec_m2_0_0);
    checkResultant3D(assert,resultant, 0, 0, 0, 0, -12, 8, 2, 0, 0, "Add Neg Force and Moment: ");
});

QUnit.test( "Resultant-AddResultant", function( assert ) {
    var forceA = new LBGeometry.Vector3(10, 5, -20);
    var momentA = new LBGeometry.Vector3(0, -10, 0);
    var applPointA = new LBGeometry.Vector3(10, 20, 30);
    var resultantA = new LBPhysics.Resultant3D(forceA, momentA, applPointA);

    var forceB = new LBGeometry.Vector3(5, 0, 10);
    var momentB = new LBGeometry.Vector3(0, 0, 3);
    var applPointB = new LBGeometry.Vector3(25, 3, 35);
    var resultantB = new LBPhysics.Resultant3D(forceB, momentB, applPointB);
    
    var resultantC = resultantB.clone();
    resultantC.moveApplPoint(resultantA.applPoint);
    
    var result = resultantA.clone();
    result.addResultant(resultantB);
    
    var refForce = LBGeometry.addVectors3(resultantA.force, resultantB.force);
    var refMoment = LBGeometry.addVectors3(resultantA.moment, resultantC.moment);
    checkResultant3D(assert, result, refForce.x, refForce.y, refForce.z, refMoment.x, refMoment.y, refMoment.z,
        applPointA.x, applPointA.y, applPointA.z);
});

function setupMoment7Test() {
    var resultant = new LBPhysics.Resultant3D();
    
    var fa = new LBGeometry.Vector3(0, 0, -80);
    var pa = new LBGeometry.Vector3(0, 0, 0);
    var fb = new LBGeometry.Vector3(0, -60, 0);
    var pb = new LBGeometry.Vector3(0, 12, 12);
    var fc = new LBGeometry.Vector3(-40, 0, 0);
    var pc = new LBGeometry.Vector3(0, 12, 0);
    
    resultant.addForce(fa, pa);
    resultant.addForce(fb, pb);
    resultant.addForce(fc, pc);
    
    return resultant;
};

function checkMoment7Test(assert, resultant, msg) {
    if (!LBUtil.isVar(msg)) {
        msg = "";
    }
    
    var fx = -40;
    var fy = -60;
    var fz = -80;
    var mx = 231.72418;
    var my = 347.58627;
    var mz = 463.44836;
    
    var end = resultant.force.clone().normalize();
    end.add(resultant.applPoint);
    var line = new LBGeometry.Line3(resultant.applPoint, end);
    var plane = new LBGeometry.Plane(new LBGeometry.Vector3(1, 0, 0), 0);
    var p = LBGeometry.getLinePlaneIntersection(plane, line);
    
    checkResultant3D(assert, resultant, fx, fy, fz, mx, my, mz, resultant.applPoint.x, resultant.applPoint.y, resultant.applPoint.z, msg, 1e-4);
    checkVector3(assert, p, 0, 0.4137931, 8.689655, "P: ", 1e-4);
}

QUnit.test( "Resultant-convertToWrench", function( assert ) {
    var resultant = setupMoment7Test();
    resultant.convertToWrench();
    checkMoment7Test(assert, resultant);
});

QUnit.test( "Resultant-applyQuaternion", function( assert ) {
    var force = new LBGeometry.Vector3(10, 0, 0);
    var applPoint = new LBGeometry.Vector3(5, 10, 15);
    var moment = LBPhysics.calcMoment(force, applPoint);
    var resultant = new LBPhysics.Resultant3D();
    
    resultant.addForce(force, applPoint);
    checkResultant3D(assert, resultant, force.x, force.y, force.z, moment.x, moment.y, moment.z,
        0, 0, 0, "Sanity: ");
        
    var rotation = LBGeometry.createQuaternionFromEulerRad(0, 0, -90 * LBMath.DEG_TO_RAD);
    resultant.applyQuaternion(rotation);
    checkResultant3D(assert, resultant, force.y, -force.x, force.z, moment.y, -moment.x, moment.z,
        0, 0, 0, "Rot Z 90");
    
});

QUnit.test( "Resultant-applyMatrix4", function( assert ) {
    var force = new LBGeometry.Vector3(10, 0, 0);
    var applPoint = new LBGeometry.Vector3(5, 10, 15);
    var moment = LBPhysics.calcMoment(force, applPoint);
    var resultant = new LBPhysics.Resultant3D(force, moment, applPoint);
    
    var matrix = new LBGeometry.Matrix4();
    var rotation = LBGeometry.createQuaternionFromEulerRad(0, 0, -90 * LBMath.DEG_TO_RAD);
    matrix.makeRotationFromQuaternion(rotation);
    matrix.setPosition(new LBGeometry.Vector3(5, 6, 7));
    
    resultant.applyMatrix4(matrix);
    checkResultant3D(assert, resultant, force.y, -force.x, force.z, moment.y, -moment.x, moment.z,
        applPoint.y + 5, -applPoint.x + 6, applPoint.z + 7, "Rot Z 90 Move (5,6,7)");
    
});

QUnit.test( "Resultant-applyDistanceScale", function( assert ) {
    var forceM = new LBGeometry.Vector3(10, 20, 30);
    var applPointM = new LBGeometry.Vector3(3, 4, 0);
    var momentM = new LBGeometry.Vector3(5, 4, 3);
    var resultant = new LBPhysics.Resultant3D(forceM, momentM, applPointM);
    
    var forceKM = forceM.clone().multiplyScalar(1e-3);
    var applPointKM = applPointM.clone().multiplyScalar(1e-3);
    var momentKM = momentM.clone().multiplyScalar(1e-3);
    
    resultant.applyDistanceScale(1e-3);
    checkResultant3D(assert, resultant, forceKM.x, forceKM.y, forceKM.z,
        momentKM.x, momentKM.y, momentKM.z, applPointKM.x, applPointKM.y, applPointKM.z, "applyDistanceScale");
});

QUnit.test( "CoordSystemState.calcVectorLocalToWorld()", function( assert ) {
    var worldMatrixT0 = new LBGeometry.Matrix4();
    worldMatrixT0.makeFromEulerAndXYZ(0, 0, -90 * LBMath.DEG_TO_RAD, 5, 6, 7);
    
    var worldMatrixT1 = new LBGeometry.Matrix4();
    worldMatrixT1.makeFromEulerAndXYZ(0, 0, -180 * LBMath.DEG_TO_RAD, 5, 6, 17);
    
    var localP0 = new LBGeometry.Vector3(10, 0, 0);
    var localP1 = new LBGeometry.Vector3(10, 3, 0);
    
    var refWorldP0 = localP0.clone().applyMatrix4(worldMatrixT0);
    var refWorldP1 = localP1.clone().applyMatrix4(worldMatrixT1);
    
    var coordSystemState = new LBPhysics.CoordSystemState();
    coordSystemState.setXfrms(worldMatrixT0);
    
    var resultsA = { 'worldPos': new LBGeometry.Vector3() };
    coordSystemState.calcVectorLocalToWorld(localP0, resultsA);
    checkVector3(assert, resultsA.worldPos, refWorldP0.x, refWorldP0.y, refWorldP0.z, "ResultsA");
    
    var resultsB = { 'worldPos': new LBGeometry.Vector3(7, 8, 9),
        'worldVel': new LBGeometry.Vector3(1, 2, 3),
        'localVel': new LBGeometry.Vector3(4, 5, 6)
    };
    coordSystemState.calcVectorLocalToWorld(localP0, resultsB);
    checkVector3(assert, resultsB.worldPos, refWorldP0.x, refWorldP0.y, refWorldP0.z, "ResultsB T0 worldPos");
    checkVector3(assert, resultsB.worldVel, 0, 0, 0, "ResultsB T0 worldVel");
    checkVector3(assert, resultsB.localVel, 0, 0, 0, "ResultsB T0 localVel");
    
    var dt = 0.1;
    coordSystemState.setXfrms(worldMatrixT1, dt);
    
    var refWorldVel = refWorldP1.clone().sub(refWorldP0).multiplyScalar(1/dt);
    var refLocalVel = refWorldVel.clone().applyMatrix4Rotation(worldMatrixT1);
    
    coordSystemState.calcVectorLocalToWorld(localP1, resultsB, localP0);
    checkVector3(assert, resultsB.worldPos, refWorldP1.x, refWorldP1.y, refWorldP1.z, "ResultsB T1 worldPos");
    checkVector3(assert, resultsB.worldVel, refWorldVel.x, refWorldVel.y, refWorldVel.z, "ResultsB T1 worldVel");
    checkVector3(assert, resultsB.localVel, refLocalVel.x, refLocalVel.y, refLocalVel.z, "ResultsB T1 localVel");
    
});


QUnit.test( "CoordSystemState.calcAngularVelocityAboutLocalAxis()", function( assert ) {
    var xfrmA = new LBGeometry.Matrix4();
    xfrmA.makeFromEulerAndXYZ(0, 0, 0, 0, 0, 0);
    
    var xfrmB = new LBGeometry.Matrix4();
    xfrmB.makeFromEulerAndXYZ(90 * LBMath.DEG_TO_RAD, 0, 0, 0, 0, 0);
    
    var coordSystemState = new LBPhysics.CoordSystemState();
    coordSystemState.setXfrms(xfrmA, 0);
    coordSystemState.setXfrms(xfrmB, 1);
    
    var axis = new LBGeometry.Vector3(0, 1, 0);
    var omega = coordSystemState.calcAngularVelocityAboutLocalAxis(axis) * LBMath.RAD_TO_DEG;
    assert.nearEqual(omega, 0, "90 deg about X-axis, Y-Axis ref");
    
    axis.set(1, 0, 0);
    omega = coordSystemState.calcAngularVelocityAboutLocalAxis(axis) * LBMath.RAD_TO_DEG;
    assert.nearEqual(omega, 90, "90 deg about X-axis, X-axis ref");

    xfrmB.makeFromEulerAndXYZ(-90 * LBMath.DEG_TO_RAD, 0, 0, 0, 0, 0);
    coordSystemState.setXfrms(xfrmA, 0);
    coordSystemState.setXfrms(xfrmB, 1);

    axis.set(1, 0, 0);
    omega = coordSystemState.calcAngularVelocityAboutLocalAxis(axis) * LBMath.RAD_TO_DEG;
    assert.nearEqual(omega, -90, "Sign check: -90 deg about X-axis, X-axis ref");
    
    axis.set(1, 1, 0).normalize();
    omega = coordSystemState.calcAngularVelocityAboutLocalAxis(axis) * LBMath.RAD_TO_DEG;
    assert.nearEqual(omega, -54.7356, "Sign check: -90 deg about X-axis, X-Y-axis ref", 1e-4);
});


QUnit.test( "loadMomentInertia()", function( assert ) {
    var moment = LBPhysics.loadMomentInertia({ 'xx': 1, 'xy': 2, 'xz': 3, 'yy': 4, 'yz': 5, 'zz': 6});
    var refMoment = new LBGeometry.Matrix3();
    refMoment.set(1, 2, 3, 2, 4, 5, 3, 5, 6);
    checkMatrix(assert, moment, refMoment);
});

QUnit.test( "RigidBody()", function( assert ) {
    var obj3DA = new LBGeometry.Object3D();
    var bodyA = new LBPhysics.RigidBody(obj3DA, 10);
    
    obj3DA.translateX(5);
    obj3DA.translateY(6);
    obj3DA.translateZ(7);
    obj3DA.updateMatrixWorld();
    
    bodyA.updateCoords(0.1);
    
    assert.equal(bodyA.getTotalMass(), 10, "Total Mass A");
    checkVector3(assert, bodyA.getTotalCenterOfMass(), 5, 6, 7, "Total CenterOfMass A");
    
    var obj3DB = new LBGeometry.Object3D();
    var bodyB = new LBPhysics.RigidBody(obj3DB, 5, new LBGeometry.Vector3(10, 3, 1));
    bodyA.addPart(bodyB);

    obj3DB.rotateX(90 * LBMath.DEG_TO_RAD);
    // COM is now 10, -1, 3
    obj3DB.translateX(2);
    // COM is now 12, -1, 3
    // Relative to bodyA, so world COM is:
    // 12+5, -1+6, 3+7
    // 17, 5, 10
    //obj3DB.updateMatrixWorld();
    obj3DA.add(obj3DB);
    obj3DA.updateMatrixWorld(true);
    bodyA.updateCoords(0.1);

    var a = bodyB.centerOfMass.clone();
    a.applyMatrix4(obj3DB.matrix);
    // 
    a.applyMatrix4(obj3DA.matrixWorld);
    
    assert.equal(bodyA.getTotalMass(), 15, "Total Mass A+B");
    
    // COG is:
    // x = (10 * 5 + 5 * 17) / 15
    // y = (10 * 6 + 5 * 5) / 15
    // z = (10 * 7 + 5 * 10) / 15
    checkVector3(assert, bodyA.getTotalCenterOfMass(), 
        (10 * 5 + 5 * 17) / 15,
        (10 * 6 + 5 * 5) / 15,
        (10 * 7 + 5 * 10) / 15,
        "Total CenterOfMass A+B");
    
});

});