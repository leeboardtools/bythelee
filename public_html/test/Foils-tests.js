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


/* global Leeboard, QUnit */

QUnit.test( "ClCd.calcLiftDragMoment()", function( assert ) {
    var cl = 1;
    var cd = 2;
    var rho = 1.204;
    var area = 12;
    var qInfSpeed = 10;
    var clCd = new Leeboard.ClCd(cl, cd, 0);
    var liftDragMoment = clCd.calcLiftDragMoment(rho, area, qInfSpeed);
    assert.nearEqual(liftDragMoment.lift, 0.5 * rho * area * qInfSpeed * qInfSpeed * cl, "basic Cl");
    assert.nearEqual(liftDragMoment.drag, 0.5 * rho * area * qInfSpeed * qInfSpeed * cd, "basic Cd");
    assert.equal(liftDragMoment.moment, 0, "no Cm");
    assert.equal(liftDragMoment.inducedDrag, undefined, "no aspect ratio");
    
    var cm = 5;
    var chordLength = 7;
    var aspectRatio = 3;
    clCd.cm = cm;
    clCd.calcLiftDragMoment(rho, area, qInfSpeed, chordLength, aspectRatio, liftDragMoment);
    assert.nearEqual(liftDragMoment.lift, 0.5 * rho * area * qInfSpeed * qInfSpeed * cl, "basic Cl");
    assert.nearEqual(liftDragMoment.drag, 0.5 * rho * area * qInfSpeed * qInfSpeed * cd, "basic Cd");
    assert.nearEqual(liftDragMoment.moment, 0.5 * rho * area * qInfSpeed * qInfSpeed * chordLength * cm, "basic Cm");
    
    var cdi = cl * cl / (aspectRatio * Math.PI);
    assert.nearEqual(liftDragMoment.inducedDrag, 0.5 * rho * area * qInfSpeed * qInfSpeed * cdi, "basic Cl");
});

function createTestFoil(assert) {
    var foil = new Leeboard.Foil();
    var foilData = {
        'chordLine': {
            'start': { 'x': 3, 'y': 0 },
            'end': { 'x':13, 'y': 0 }
        },
        'sliceZ': 5,
        'area': 15,
        'aspectRatio': 4,
        'clCdCurve': {
            'stallStartDeg': 25,
            'liftEndDeg': 35,
            'clCdStall': {},
            'clCdInterp': {
                'alphas': [ 0, 10, 30 ],
                'cls': [ 0, 1.1, 1.2 ],
                'cds': [ 0.1, 0.3, 0.5 ]
            }
        }
    };
    foil.load(foilData);
    
    if (Leeboard.isVar(assert)) {
        var msg = "TestFoil: ";
        checkVector2D(assert, foil.chordLine.start, 3, 0, msg + "chordStart");
        checkVector2D(assert, foil.chordLine.end, 13, 0, msg + "chordEnd");
        assert.equal(foil.sliceZ, 5, msg + "sliceZ");
        assert.equal(foil.area, 15, msg + "area");
        assert.equal(foil.aspectRatio, 4, msg + "aspectRatio");
    }
    return foil;
}

QUnit.test( "Foil.calcLocalForce", function( assert ) {
    var testFoil = createTestFoil(assert);
    
    var details = {};
    
    var rho = 1.204;
    var alphaDeg = 10;
    var cosAlpha = Math.cos(Leeboard.DEG_TO_RAD * alphaDeg);
    var sinAlpha = Math.sin(Leeboard.DEG_TO_RAD * alphaDeg);
    var qInfSpeed = 2;
    var qInf = Leeboard.createVector2D(qInfSpeed * cosAlpha, qInfSpeed * sinAlpha);
    var localForceResultant = testFoil.calcLocalForce(rho, qInf, details);
    
    var forceScale = 0.5 * rho * qInfSpeed * qInfSpeed * 15;
    var refLift = Leeboard.createVector2DMagDeg(1.1 * forceScale, alphaDeg + 90);
    var refDrag = Leeboard.createVector2DMagDeg(0.3 * forceScale, alphaDeg);
    var refInducedDrag = Leeboard.createVector2DMagDeg(1.1 * 1.1 / (Math.PI * testFoil.aspectRatio) * forceScale, alphaDeg);
    
    assert.nearEqual(details.angleDeg, alphaDeg, "angle: ");
    assert.nearEqual(details.lift, refLift.length(), "lift: ");
    assert.nearEqual(details.drag, refDrag.length(), "drag: ");
    assert.nearEqual(details.inducedDrag, refInducedDrag.length(), "induced drag:");
    
    var refForce = refLift.clone();
    refForce.add(refDrag);
    refForce.add(refInducedDrag);
    
    checkVector2D(assert, localForceResultant.force, refForce.x, refForce.y, "Force: ");    
    checkVector2D(assert, localForceResultant.applPoint, 3, 0, "applPoint: ");
    
    // The force is applied at the 25% chord point...
    refForce.sub(refInducedDrag);
    var refR = Leeboard.createVector2D(2.5, 0);
    var refMoment = Leeboard.calcMoment(refForce, refR);
    
    checkVector3D(assert, localForceResultant.moment, refMoment.x, refMoment.y, refMoment.z, "moment: ");
});