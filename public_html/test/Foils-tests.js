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

