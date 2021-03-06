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

/* global LBUtil, LBMath, QUnit */
define(['lbmath', 'lbutil'], function (LBMath, LBUtil) {

QUnit.module('Math-tests');

LBMath.CSpline.test = function() {
    console.log("CSpline test:");
    var xs = [10, 20, 25, 27, 30];
    var ys = [10, 5, 15, 7, 21];
    this.setup(xs, ys);

    console.log("y2s:");
    for (var i = 0; i < this.y2s.length; ++i) {
        console.log(i + "\t" + this.y2s[i]);
    }

    console.log("\ninterpolate:");
    for (var i = 5; i <= 30; ++i) {
        var y = this.interpolate(i);
        //var y = LBUtil.bsearch(this.xs, i);
        console.log(i + "\t" + y);
    }
    console.log("End");
};


QUnit.test( "wrapDegrees", function( assert ) {
   assert.equal(LBMath.wrapDegrees(-181), 179, "-181 => 179");
   assert.equal(LBMath.wrapDegrees(-180), 180, "-180 => 180"); 
   assert.equal(LBMath.wrapDegrees(-179), -179, "-179 => -179");
   assert.equal(LBMath.wrapDegrees(179), 179, "179 => 179");
   assert.equal(LBMath.wrapDegrees(180), 180, "180 => -180");
});

QUnit.test( "subDegrees", function( assert ) {
   assert.equal(LBMath.subDegrees(-179, -177), -2, "-179 => -177"); 
   assert.equal(LBMath.subDegrees(-179, 179), 2, "-179 => 179");
   assert.equal(LBMath.subDegrees(179, 177), 2, "179 => 177");
   assert.equal(LBMath.subDegrees(179, -179), -2, "179 => -179");
});

QUnit.test( "DegRange", function(assert) {
    var range = new LBMath.DegRange(100, 270);
    assert.notOk(range.isInRange(99), "99 of 100 -> 270");
    assert.ok(range.isInRange(100), "100 of 100 -> 270");
    assert.ok(range.isInRange(180), "180 of 100 -> 270");
    assert.ok(range.isInRange(-170), "-170 of 100 -> 270");
    assert.ok(range.isInRange(370), "370 of 100 -> 270");
    assert.notOk(range.isInRange(371), "371 of 100 -> 270");
    
    range = new LBMath.DegRange(100, -50);
    assert.notOk(range.isInRange(49), "49 of 100 -> -50");
    assert.ok(range.isInRange(50), "50 of 100 -> -50");
    assert.ok(range.isInRange(100), "100 of 100 -> -50");
    assert.notOk(range.isInRange(101), "101 of 100 -> -50");
    
    range = new LBMath.DegRange(-100, -90);
    assert.notOk(range.isInRange(-191), "-191 of -100 -> -90");
    assert.notOk(range.isInRange(169), "169 of -100 -> -90");
    assert.ok(range.isInRange(-190), "-190 of -100 -> -90");
    assert.ok(range.isInRange(170), "170 of -100 -> -90");
    assert.ok(range.isInRange(-100), "-100 of -100 -> -90");
    assert.notOk(range.isInRange(-99.99999), "-99.99999 of -100 -> -90");
    
    range = new LBMath.DegRange(0, 360);
    assert.ok(range.isInRange(-180), "-180 0 -> 360");
    assert.ok(range.isInRange(-179), "-179 0 -> 360");
    assert.ok(range.isInRange(179), "179 0 -> 360");
    assert.ok(range.isInRange(180), "180 0 -> 360");
});

QUnit.test( "round", function( assert ) {
    assert.equal(LBMath.round(123.456, 2), 123.46, "123.456 => 123.46");
    assert.equal(LBMath.round(123.456), 123, "123.456 => 123");
    assert.equal(LBMath.round(123.456, -1), 120, "123.456 => 120");
    
    assert.equal(LBMath.round(-123.456, 2), -123.46, "-123.456 => -123.46");
    assert.equal(LBMath.round(-123.456), -123, "-123.456 => -123");
    assert.equal(LBMath.round(-123.456, -1), -120, "-123.456 => -120");
});

QUnit.test( "radFromThreeSides", function( assert ) {
    assert.nearEqual(LBMath.radFromThreeSides(10, 10, 10), 60 * LBMath.DEG_TO_RAD);
    assert.nearEqual(LBMath.radFromThreeSides(3, 4, 5), 90 * LBMath.DEG_TO_RAD);
});


var dumpCurveData;
if (dumpCurveData) {
QUnit.test( "dummyTest", function( assert ) {
    console.log("Ces for table");
    var xs      = [5,       10,     15,     20,     25,     30,     40,     60,     90];
    var ys_27   = [0.361,   0.313,  0.344,  0.423,  0.437,  0.439,  0.451,  0.470,  0.50];
    var ys_13_5 = [0.414,   0.363,  0.363,  0.386,  0.420,  0.445,  0.462,  0.479,  0.50];
    var ys_7    = [0.470,   0.392,  0.375,  0.406,  0.439,  0.456,  0.473,  0.485,  0.50];
    
    var spline_27 = new LBMath.CSpline(xs, ys_27);
    var spline_13_5 = new LBMath.CSpline(xs, ys_13_5);
    var spline_7 = new LBMath.CSpline(xs, ys_7);
    
    var xIn = [
                    0,      11,     12,     15,     20,     25,     30,     35,     40,     45,     50,     55,     60,     90,     110,    140,    150,    160,    165,    170,    171,    180
                ];

    var out_27 = "    var cms_27 = [";
    var out_13_5  = "    var cms_13_5 = [";
    var out_7 = "    var cms_7 = [";
    
    for (var i = 0; i < xIn.length; ++i) {
        var x = xIn[i];
        var sign;
        var offset;
        if (x > 90) {
            x = 180 - x;
            sign = -1;
            offset = 1;
        }
        else {
            sign = 1;
            offset = 0;
        }
        var y_27 = spline_27.interpolate(x) * sign + offset;
        var y_13_5 = spline_13_5.interpolate(x) * sign + offset;
        var y_7 = spline_7.interpolate(x) * sign + offset;
        console.log(xIn[i] + "\t" + y_27 + "\t" + y_13_5 + "\t" + y_7);
        
        out_27 += LBMath.round(y_27, 3) + ",  ";
        out_13_5 += LBMath.round(y_13_5, 3) + ",  ";
        out_7 += LBMath.round(y_7, 3) + ",  ";
    }
    
    console.log(out_27 + '];');
    console.log(out_13_5 + '];');
    console.log(out_7 + '];');
    
    assert.equal(1, 1, "Yay");
});


QUnit.test( "Full interp", function( assert ) {
    console.log("Full Cl/Cd/Cm interp");
    var alphas = [
                    0,      11,     12,     15,     20,     25,     30,     35,     40,     45,     50,     55,     60,     90,     110,    140,    150,    160,    165,    170,    171,    180
                ];
    var cls = [
                    0.00,   0.33,   0.39,   0.48,   0.71,   0.97,   1.20,   1.34,   1.30,   1.17,   1.10,   1.06,   1.00,   0.43,   -0.06,  -0.76,  -0.97,  -1.12,  -1.16,  -1.13,  -1.10,  0.00
                ];
    var cds = [
                    0.25,   0.12,   0.11,   0.13,   0.18,   0.25,   0.34,   0.46,   0.53,   0.60,   0.68,   0.80,   0.89,   1.27,   1.33,   1.23,   1.10,   0.89,   0.76,   0.60,   0.57,   0.25
                ];
    var cms_27 = [
                    0.409,  0.312,  0.315,  0.344,  0.423,  0.437,  0.439,  0.445,  0.451,  0.457,  0.461,  0.466,  0.470,  0.500,  0.479,  0.451,  0.439,  0.423,  0.344,  0.313,  0.318,  0.409
                ];
    var cms_13_5 = [
                    0.465,  0.359,  0.358,  0.363,  0.386,  0.420,  0.445,  0.457,  0.462,  0.466,  0.470,  0.475,  0.479,  0.500,  0.487,  0.462,  0.445,  0.386,  0.363,  0.363,  0.370,  0.465
                ];
    var cms_7 = [
                    0.548,  0.383,  0.377,  0.375,  0.406,  0.439,  0.456,  0.466,  0.473,  0.478,  0.481,  0.483,  0.485,  0.500,  0.489,  0.473,  0.456,  0.406,  0.375,  0.392,  0.404,  0.548
                ];
    var cms_27 = [  0.409,  0.312,  0.315,  0.344,  0.423,  0.437,  0.439,  0.445,  0.451,  0.457,  0.461,  0.466,  0.47,  0.5,  0.521,  0.549,  0.561,  0.577,  0.656,  0.687,  0.682,  0.591  ];
    var cms_13_5 = [0.465,  0.359,  0.358,  0.363,  0.386,  0.42,  0.445,  0.457,  0.462,  0.466,  0.47,  0.475,  0.479,  0.5,  0.513,  0.538,  0.555,  0.614,  0.637,  0.637,  0.63,  0.535  ];
    var cms_7 = [   0.548,  0.383,  0.377,  0.375,  0.406,  0.439,  0.456,  0.466,  0.473,  0.478,  0.481,  0.483,  0.485,  0.5,  0.511,  0.527,  0.544,  0.594,  0.625,  0.608,  0.596,  0.452  ];
    var spline_Cls = new LBMath.CSpline(alphas, cls);
    var spline_Cds = new LBMath.CSpline(alphas, cds);
    var spline_Cms_27 = new LBMath.CSpline(alphas, cms_27);
    var spline_Cms_13_5 = new LBMath.CSpline(alphas, cms_13_5);
    var spline_Cms_7 = new LBMath.CSpline(alphas, cms_7);
    
    for (var i = 0; i < 180; i += 1) {
        var cl = spline_Cls.interpolate(i);
        var cd = spline_Cds.interpolate(i);
        var cm_27 = spline_Cms_27.interpolate(i);
        var cm_13_5 = spline_Cms_13_5.interpolate(i);
        var cm_7 = spline_Cms_7.interpolate(i);
        console.log(i + "\t" + cd + "\t" + cl + "\t" + cm_27 + "\t" + cm_13_5 + "\t" + cm_7);
    }
    });
};

QUnit.test( "finiteDiffBackFirst", function( assert ) {
    var dt = 0.1;
    var t = [ 5, 5 - dt, 5 - 2*dt, 5 - 3*dt, 5 - 4*dt, 5 - 5*dt, 5 - 6*dt ];
    var f0 = t[0] * t[0];
    var f1 = t[1] * t[1];
    var f2 = t[2] * t[2];
    var f3 = t[3] * t[3];
    var f4 = t[4] * t[4];

    var fp_ideal = 2 * t[0];
    
    var fp_2 = (f0 - f1) / dt;
    assert.equal(LBMath.finiteDiffBackFirst_2(dt, f0, f1), fp_2, "finiteDiffBackFirst_2");
    assert.equal(LBMath.finiteDiffBackFirst(dt, f0, f1), fp_2, "finiteDiffBackFirst for 2");
    var fp_2_test = LBMath.finiteDiffBackFirst(dt, f0, f1);
    var err_2 = Math.abs(fp_2_test - fp_ideal);
    
    var fp_3_test = LBMath.finiteDiffBackFirst_3(dt, f0, f1, f2);    
    var err_3 = Math.abs(fp_3_test - fp_ideal);
    assert.nearEqual(fp_3_test, fp_ideal, "finiteDiffBackFirst_3", dt * dt * dt);
    assert.equal(LBMath.finiteDiffBackFirst(dt, f0, f1, f2), fp_3_test, "finiteDiffBackFirst for 3");
    
    var fp_4_test = LBMath.finiteDiffBackFirst_4(dt, f0, f1, f2, f3);
    var err_4 = Math.abs(fp_4_test - fp_ideal);
    assert.nearEqual(fp_4_test, fp_ideal, "finiteDiffBackFirst_4", dt * dt * dt * dt);
    assert.equal(LBMath.finiteDiffBackFirst(dt, f0, f1, f2, f3), fp_4_test, "finiteDiffBackFirst for 4");
    
    var fp_5_test = LBMath.finiteDiffBackFirst_5(dt, f0, f1, f2, f3, f4);    
    var err_5 = Math.abs(fp_5_test - fp_ideal);
    assert.nearEqual(fp_5_test, fp_ideal, "finiteDiffBackFirst_5", dt * dt * dt * dt * dt);
    assert.equal(LBMath.finiteDiffBackFirst(dt, f0, f1, f2, f3, f4), fp_5_test, "finiteDiffBackFirst for 5");
    assert.equal(LBMath.finiteDiffBackFirst([dt, f0, f1, f2, f3, f4]), fp_5_test, "finiteDiffBackFirst array args");
});


QUnit.test( "solve2x2Mat", function( assert ) {
    var lhs = [1, 2, 3, 4];
    var rhs = [5, 6];
    var result = LBMath.solve2x2Mat(lhs, rhs);
    assert.nearEqual(lhs[0] * result[0] + lhs[1] * result[1], rhs[0], "1*x + 2*y = 5");
    assert.nearEqual(lhs[2] * result[0] + lhs[3] * result[1], rhs[1], "3*x + 4*y = 6");
    
    result = LBMath.solve2x2Mat([1, 2, 3, 6], [5, 6]);
    assert.equal(result.length, 0, 'singular');
});


});