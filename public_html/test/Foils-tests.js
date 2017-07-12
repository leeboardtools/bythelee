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


/* global Leeboard, QUnit, LBPhysics, LBGeometry, LBMath, LBFoils */


LBFoils.Foil.prototype.localForceTest = function(rho, qInfSpeed, start, end, delta) {
    console.log("LBFoils.Foil.localForceTest:");
    console.log("Deg\t\tApplPoint.x\tApplPoint.y\t\tForce.x\tForce.y\t\tMoment.z");
    var resultant = new LBPhysics.Resultant3D();
    var details = {};
    var qInfLocal = new LBGeometry.Vector2();
    for (var deg = start; deg < end; deg += delta) {
        var rad = deg * LBMath.DEG_TO_RAD;
        qInfLocal.set(Math.cos(rad) * qInfSpeed, Math.sin(rad) * qInfSpeed);
        this.calcLocalForce(rho, qInfLocal, details, resultant);
        var string = deg + "\t" 
                //+ "\t" + resultant.applPoint.x + "\t" + resultant.applPoint.y + "\t" 
                + "\t" + resultant.force.x + "\t" + resultant.force.y + "\t"
                + "\t" + resultant.moment.z
                + "\t" + details.coefs.stallFraction;
        console.log(string);
    }
};


QUnit.test( "ClCd.calcLiftDragMoment()", function( assert ) {
    var cl = 1;
    var cd = 2;
    var rho = 1.204;
    var area = 12;
    var qInfSpeed = 10;
    var clCd = new LBFoils.ClCd(cl, cd, 0);
    var liftDragMoment = LBFoils.ClCd.calcLiftDragMoment(clCd, rho, area, qInfSpeed);
    assert.nearEqual(liftDragMoment.lift, 0.5 * rho * area * qInfSpeed * qInfSpeed * cl, "basic Cl");
    assert.nearEqual(liftDragMoment.drag, 0.5 * rho * area * qInfSpeed * qInfSpeed * cd, "basic Cd");
    assert.equal(liftDragMoment.moment, 0, "no Cm");
    assert.equal(liftDragMoment.inducedDrag, undefined, "no aspect ratio");
    
    var cm = 5;
    var chordLength = 7;
    var aspectRatio = 3;
    clCd.cm = cm;
    LBFoils.ClCd.calcLiftDragMoment(clCd, rho, area, qInfSpeed, chordLength, aspectRatio, liftDragMoment);
    assert.nearEqual(liftDragMoment.lift, 0.5 * rho * area * qInfSpeed * qInfSpeed * cl, "basic Cl");
    assert.nearEqual(liftDragMoment.drag, 0.5 * rho * area * qInfSpeed * qInfSpeed * cd, "basic Cd");
    assert.nearEqual(liftDragMoment.moment, 0.5 * rho * area * qInfSpeed * qInfSpeed * chordLength * cm, "basic Cm");
    
    var cdi = cl * cl / (aspectRatio * Math.PI);
    assert.nearEqual(liftDragMoment.inducedDrag, 0.5 * rho * area * qInfSpeed * qInfSpeed * cdi, "basic Cl");
});

function createTestFoil(assert) {
    var foil = new LBFoils.Foil();
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
        checkVector2(assert, foil.chordLine.start, 3, 0, msg + "chordStart");
        checkVector2(assert, foil.chordLine.end, 13, 0, msg + "chordEnd");
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
    var cosAlpha = Math.cos(LBMath.DEG_TO_RAD * alphaDeg);
    var sinAlpha = Math.sin(LBMath.DEG_TO_RAD * alphaDeg);
    var qInfSpeed = 2;
    var qInf = new LBGeometry.Vector2(qInfSpeed * cosAlpha, qInfSpeed * sinAlpha);
    var localForceResultant = testFoil.calcLocalForce(rho, qInf, details);
    
    var forceScale = 0.5 * rho * qInfSpeed * qInfSpeed * 15;
    var refLift = LBGeometry.createVector2MagDeg(1.1 * forceScale, alphaDeg + 90);
    var refDrag = LBGeometry.createVector2MagDeg(0.3 * forceScale, alphaDeg);
    var refInducedDrag = LBGeometry.createVector2MagDeg(1.1 * 1.1 / (Math.PI * testFoil.aspectRatio) * forceScale, alphaDeg);
    
    assert.nearEqual(details.angleDeg, alphaDeg, "angle: ");
    assert.nearEqual(details.lift, refLift.length(), "lift: ");
    assert.nearEqual(details.drag, refDrag.length(), "drag: ");
    assert.nearEqual(details.inducedDrag, refInducedDrag.length(), "induced drag:");
    
    var refForce = refLift.clone();
    refForce.add(refDrag);
    refForce.add(refInducedDrag);
    
    checkVector2(assert, localForceResultant.force, refForce.x, refForce.y, "Force: ");    
    checkVector2(assert, localForceResultant.applPoint, 3, 0, "applPoint: ");
    
    // The force is applied at the 25% chord point...
    refForce.sub(refInducedDrag);
    var refForceMag = refForce.length();
    var refR = new LBGeometry.Vector2(2.5 * refForce.y / refForceMag, 2.5 * -refForce.x / refForceMag);
    var refMoment = LBPhysics.calcMoment(refForce, refR);
    
    checkVector3(assert, localForceResultant.moment, refMoment.x, refMoment.y, refMoment.z, "moment: ");
});


QUnit.test( "Foil.calcWorldForce", function( assert ) {
    var testFoil = createTestFoil();
    
    var coordSystemState = new LBPhysics.CoordSystemState();

    var worldXfrmT0 = new LBGeometry.Matrix4();
    worldXfrmT0.makeFromEulerAndXYZ(90 * LBMath.DEG_TO_RAD, 0, 90 * LBMath.DEG_TO_RAD, 100, 0, 0);
    coordSystemState.setXfrms(worldXfrmT0);
    
    var worldXfrmT1 = new LBGeometry.Matrix4();
    worldXfrmT1.makeFromEulerAndXYZ(90 * LBMath.DEG_TO_RAD, 0, 90 * LBMath.DEG_TO_RAD, 100, 0, -1);
    // For this rotation we have:
    // xW = -yL
    // yW = -zL
    // zW = +xL
    
    var dt = 0.1;
    coordSystemState.setXfrms(worldXfrmT1, dt);
    
    var rho = 1.204;
    var alpha = 15;
    var qInfSpeed = 3;
    var qInfWorld = new LBGeometry.Vector3();
    qInfWorld.z = qInfSpeed * Math.cos(alpha * LBMath.DEG_TO_RAD);
    qInfWorld.x = -qInfSpeed * Math.sin(alpha * LBMath.DEG_TO_RAD);
    
    var resultant = testFoil.calcWorldForce(rho, qInfWorld, coordSystemState);
    
    var qInfLocal = new LBGeometry.Vector2(qInfWorld.z + 10, -qInfWorld.x);
    var refResultant = testFoil.calcLocalForce(rho, qInfLocal);
    
    assert.nearEqual(resultant.force.x, -refResultant.force.y, "World Fx");
    assert.nearEqual(resultant.force.y, -refResultant.force.z, "World Fy");
    assert.nearEqual(resultant.force.z, refResultant.force.x, "World Fz");
    
    assert.nearEqual(resultant.moment.x, -refResultant.moment.y, "World Mx");
    assert.nearEqual(resultant.moment.y, -refResultant.moment.z, "World My");
    assert.nearEqual(resultant.moment.z, refResultant.moment.x, "World Mz");
    
    assert.nearEqual(resultant.applPoint.x, -refResultant.applPoint.y + 100, "World Px");
    assert.nearEqual(resultant.applPoint.y, -refResultant.applPoint.z, "World Py");
    assert.nearEqual(resultant.applPoint.z, refResultant.applPoint.x - 1, "World Pz");
});