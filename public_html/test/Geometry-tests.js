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

function checkVector3D(assert, vector, x, y, z, msg, tolerance) {
    if (!Leeboard.isVar(msg)) {
        msg = "";
    }
    assert.nearEqual(vector.x, x, msg + " X OK", tolerance);
    assert.nearEqual(vector.y, y, msg + " Y OK", tolerance);
    assert.nearEqual(vector.z, z, msg + " Z OK", tolerance);
}

QUnit.test( "applyMatrix4Rotation", function( assert ) {
    var m = Leeboard.createMatrix4();
    var a = 30 * Leeboard.DEG_TO_RAD;
    m.makeRotationZ(a);
    m.setPosition(Leeboard.createVector3D(10, 20, 30));
    
    var v = Leeboard.createVector3D(10, 0, 0);
    v.applyMatrix4(m);
    checkVector3D(assert, v, 10*Math.cos(a) + 10, 10*Math.sin(a) + 20, 30, "applyMatrix4");
    
    v.set(10, 0, 0);
    v.applyMatrix4Rotation(m);
    checkVector3D(assert, v, 10*Math.cos(a), 10*Math.sin(a), 0, "applyMatrix4Rotation");
});
    
