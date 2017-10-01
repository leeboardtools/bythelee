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


/* global QUnit, LBCurve, LBGeometry */
define(['lbcurve', 'lbgeometry'], function (LBCurve, LBGeometry) {

var checkVector2 = require('test/Geometry-tests.js').checkVector2;

QUnit.module('Curve-tests');

QUnit.test( "QuadraticBezier2", function( assert ) {
    var curve = new LBCurve.QuadraticBezier2(new LBGeometry.Vector2(1, 10), new LBGeometry.Vector2(2, 17), new LBGeometry.Vector2(1, 20));

    var pos = curve.calcPoint(0);
    checkVector2(assert, pos, 1, 10, "t=0");
    
    // B = (1 - t)^2 * P0 + 2*(1 - t)*t * P1 + t^2 * P2
    var t = 0.75;
    var pt = new LBGeometry.Vector2();
    pt.copy(curve.p0);
    pt.multiplyScalar((1 - t) * (1 - t));
    pos.copy(pt);
    
    pt.copy(curve.p1);
    pt.multiplyScalar(2*(1-t)*t);
    pos.add(pt);
    
    pt.copy(curve.p2);
    pt.multiplyScalar(t*t);
    pos.add(pt);
    
    pt.copy(pos);
    
    curve.calcPoint(t, pos);
    checkVector2(assert, pos, pt.x, pt.y, "t=" + t);
    
    curve.calcPoint(1, pos);
    checkVector2(assert, pos, 1, 20, "t=1");
    
    pt.copy(curve.p1);
    pt.sub(curve.p0);
    pt.normalize();
    
    curve.calcTangent(0, pos);
    pos.normalize();
    checkVector2(assert, pos, pt.x, pt.y, "Tangent t=0");
    
    // Tangent:
    // B' = 2*(1 - t) * (P1 - P0) + 2*t * (P2 - P1)
    pt.copy(curve.p1);
    pt.sub(curve.p0);
    pt.multiplyScalar(2*(1-t));
    pos.copy(pt);
    
    pt.copy(curve.p2);
    pt.sub(curve.p1);
    pt.multiplyScalar(2*t);
    pt.add(pos);
    pt.normalize();
    
    curve.calcTangent(t, pos);
    pos.normalize();
    checkVector2(assert, pos, pt.x, pt.y, "Tangent t=" + t);
    
    
    pt.copy(curve.p2);
    pt.sub(curve.p1);
    pt.normalize();
    
    curve.calcTangent(1, pos);
    pos.normalize();
    checkVector2(assert, pos, pt.x, pt.y, "Tangent t=0");
    });
    
    });