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


function checkResultant3D(assert, resultant, fx, fy, fz, mx, my, mz, px, py, pz, msg, tolerance) {
    if (!Leeboard.isVar(msg)) {
        msg = "";
    }

    checkVector3D(assert, resultant.applPoint, px, py, pz, msg + "ApplPoint:", tolerance);
    checkVector3D(assert, resultant.force, fx, fy, fz, msg + "Force:", tolerance);
    checkVector3D(assert, resultant.moment, mx, my, mz, msg + "Moment:", tolerance);
}

QUnit.test( "Resultant-AddForce", function( assert ) {
    var resultant = new Leeboard.Resultant3D(
            Leeboard.createVector3D(1, 2, 3),   // force
            Leeboard.createVector3D(2, 3, 4),   // moment
            Leeboard.createVector3D(3, 4, 5));  // position
    checkResultant3D(assert, resultant, 1, 2, 3, 2, 3, 4, 3, 4, 5, "Constructor: ");
    
    resultant.force.set(0, 0, 0);
    resultant.moment.set(0, 0, 0);
    resultant.applPoint.set(0, 0, 0);
    checkResultant3D(assert, resultant, 0, 0, 0, 0, 0, 0, 0, 0, 0, "Zero: ");
    
    var vec_1_2_3 = Leeboard.createVector3D(1, 2, 3);
    var vec_2_0_0 = Leeboard.createVector3D(2, 0, 0);
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
    var forceA = Leeboard.createVector3D(10, 5, -20);
    var momentA = Leeboard.createVector3D(0, -10, 0);
    var applPointA = Leeboard.createVector3D(10, 20, 30);
    var resultantA = new Leeboard.Resultant3D(forceA, momentA, applPointA);

    var forceB = Leeboard.createVector3D(5, 0, 10);
    var momentB = Leeboard.createVector3D(0, 0, 3);
    var applPointB = Leeboard.createVector3D(25, 3, 35);
    var resultantB = new Leeboard.Resultant3D(forceB, momentB, applPointB);
    
    var resultantC = resultantB.clone();
    resultantC.moveApplPoint(resultantA.applPoint);
    
    var result = resultantA.clone();
    result.addResultant(resultantB);
    
    var refForce = Leeboard.addVectors3D(resultantA.force, resultantB.force);
    var refMoment = Leeboard.addVectors3D(resultantA.moment, resultantC.moment);
    checkResultant3D(assert, result, refForce.x, refForce.y, refForce.z, refMoment.x, refMoment.y, refMoment.z,
        applPointA.x, applPointA.y, applPointA.z);
});

function setupMoment7Test() {
    var resultant = new Leeboard.Resultant3D();
    
    var fa = Leeboard.createVector3D(0, 0, -80);
    var pa = Leeboard.createVector3D(0, 0, 0);
    var fb = Leeboard.createVector3D(0, -60, 0);
    var pb = Leeboard.createVector3D(0, 12, 12);
    var fc = Leeboard.createVector3D(-40, 0, 0);
    var pc = Leeboard.createVector3D(0, 12, 0);
    
    resultant.addForce(fa, pa);
    resultant.addForce(fb, pb);
    resultant.addForce(fc, pc);
    
    return resultant;
};

function checkMoment7Test(assert, resultant, msg) {
    if (!Leeboard.isVar(msg)) {
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
    var line = Leeboard.createLine3D(resultant.applPoint, end);
    var plane = Leeboard.createPlane(Leeboard.createVector3D(1, 0, 0), 0);
    var p = Leeboard.getLinePlaneIntersection(plane, line);
    
    checkResultant3D(assert, resultant, fx, fy, fz, mx, my, mz, resultant.applPoint.x, resultant.applPoint.y, resultant.applPoint.z, msg, 1e-4);
    checkVector3D(assert, p, 0, 0.4137931, 8.689655, "P: ", 1e-4);
}

QUnit.test( "Resultant-convertToWrench", function( assert ) {
    var resultant = setupMoment7Test();
    resultant.convertToWrench();
    checkMoment7Test(assert, resultant);
});

QUnit.test( "Resultant-applyQuaternion", function( assert ) {
    var force = Leeboard.createVector3D(10, 0, 0);
    var applPoint = Leeboard.createVector3D(5, 10, 15);
    var moment = Leeboard.calcMoment(force, applPoint);
    var resultant = new Leeboard.Resultant3D();
    
    resultant.addForce(force, applPoint);
    checkResultant3D(assert, resultant, force.x, force.y, force.z, moment.x, moment.y, moment.z,
        0, 0, 0, "Sanity: ");
        
    var rotation = Leeboard.createQuaternionFromEulerRad(0, 0, -90 * Leeboard.DEG_TO_RAD);
    resultant.applyQuaternion(rotation);
    checkResultant3D(assert, resultant, force.y, -force.x, force.z, moment.y, -moment.x, moment.z,
        0, 0, 0, "Rot Z 90");
    
});
