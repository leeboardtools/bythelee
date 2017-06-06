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