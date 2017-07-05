/* 
 * Copyright 2017 albert.
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


/* global QUnit, LBGeometry, LBCannon, LBVolume, CANNON */

checkCannonVec3 = function(assert, vec3, vector3, msg) {
    msg = msg || "";
    assert.equal(vec3.x, vector3.x, msg + " - x");
    assert.equal(vec3.y, vector3.y, msg + " - y");
    assert.equal(vec3.z, vector3.z, msg + " - z");
};

QUnit.test( "Vec3Proxy", function( assert ) {
    var vector3 = new LBGeometry.Vector3(1,2,3);
    var vec3 = new LBCannon.Vec3Proxy(vector3);
    
    checkCannonVec3(assert, vec3, vector3, "Constructor");
    
    vec3.set(5, 6, 7);
    checkCannonVec3(assert, vec3, new LBGeometry.Vector3(5, 6, 7), "Set");
    
    vector3.set(10, 11, 12);
    checkCannonVec3(assert, vec3, vector3, "Vector3 Changed");
});
    
    
QUnit.test( "addTetrasToBody", function( assert ) {
    var data = {
        vertices: [
            0, 0, 0,
            2, 0, 0,
            2, 1, 0,
            0, 1, 0,
            
            0, 0, 3,
            2, 0, 3,
            2, 1, 3,
            0, 1, 3
        ],
        indices: [
            [ 0, 1, 2, 3, 4, 5, 6, 7]
        ]
    };
    
    var tetras = LBVolume.Tetra.loadFromData(data);
    LBVolume.Tetra.allocateMassToTetras(tetras, 5);
    
    var body = new CANNON.Body();
    LBCannon.addTetrasToBody(body, tetras);
    assert.equal(body.shapes.length, tetras.length, "Shape Count");
    
    LBCannon.updateBodyCenterOfMass(body);
    assert.nearEqual(body.position.x, 1, "COM-x");
    assert.nearEqual(body.position.y, 0.5, "COM-y");
    assert.nearEqual(body.position.z, 1.5, "COM-z");
    
    var min = new LBGeometry.Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
    var max = new LBGeometry.Vector3(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE);
    body.shapes.forEach(function(shape, index) {
        for (var i = 0; i < shape.vertices.length; ++i) {
            var vec = shape.vertices[i].vadd(body.shapeOffsets[index]);
            min.copyIfMin(vec);
            max.copyIfMax(vec);
        }
    },
    this);
    
    checkVector3(assert, min, -1, -0.5, -1.5, "Min Extent");
    checkVector3(assert, max, 1, 0.5, 1.5, "Max Extent");
});