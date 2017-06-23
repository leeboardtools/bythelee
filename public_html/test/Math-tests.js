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

/* global Leeboard, LBMath, QUnit */

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
        //var y = Leeboard.bsearch(this.xs, i);
        console.log(i + "\t" + y);
    }
    console.log("End");
};


QUnit.test( "wrapDegrees", function( assert ) {
   assert.equal(LBMath.wrapDegrees(-181), 179, "-181 => 179");
   assert.equal(LBMath.wrapDegrees(-180), -180, "-180 => 180"); 
   assert.equal(LBMath.wrapDegrees(-179), -179, "-179 => -179");
   assert.equal(LBMath.wrapDegrees(179), 179, "179 => 179");
   assert.equal(LBMath.wrapDegrees(180), -180, "180 => -180");
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