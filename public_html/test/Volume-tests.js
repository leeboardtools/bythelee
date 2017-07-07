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


/* global QUnit, LBGeometry, LBVolume */

checkVolume = function(assert, tetras, refVol, msg) {
    var vol = LBVolume.Volume.totalVolume(tetras);
    assert.nearEqual(vol, refVol, msg);
};

QUnit.test( "Tetra.volume()", function( assert ) {
    var x = 1;
    var y = 2;
    var z = 3;
    var vertices = [
        new LBGeometry.Vector3(0, 0, 0),
        new LBGeometry.Vector3(x, y, 0),
        new LBGeometry.Vector3(0, y, 0),
        new LBGeometry.Vector3(0, 0, z)
    ];
    
    var tetra = new LBVolume.Tetra(vertices);
    var vol = 1/3 * (x * y / 2) * z;
    assert.nearEqual(tetra.volume(), vol, "Simple Volume");
    
    var xfrm = new LBGeometry.Matrix4();
    xfrm.makeFromEulerAndXYZ(1, 2, 3, 4, 5, 6);
    
    for (var i = 0; i < vertices.length; ++i) {
        vertices[i].applyMatrix4(xfrm);
    }
    assert.nearEqual(tetra.volume(), vol, "Transformed Volume");
    
    });
    

QUnit.test( "Tetra.triangularBipyramidToTetras()", function( assert ) {
    var x = 1;
    var y = 2;
    var z = 3;
    var vertices = [
        new LBGeometry.Vector3(0, 0, 0),
        new LBGeometry.Vector3(x, 0, 0),
        new LBGeometry.Vector3(x, y, 0),
        new LBGeometry.Vector3(0, y, 0),

        new LBGeometry.Vector3(0, 0, z),
        new LBGeometry.Vector3(x, 0, z),
        new LBGeometry.Vector3(x, y, z),
        new LBGeometry.Vector3(0, y, z)
    ];
    
    var vertexIndices = [
        0, 1, 3, 4, 7
    ];
    
    var tetras = LBVolume.Tetra.triangularBipyramidToTetras(vertexIndices, vertices);
    assert.equal(tetras.length, 2, "OK Tetra Count");
    
    var refVol = x * y * z / 3;
    checkVolume(assert, tetras, refVol, "OK Tetras Volume");
    
    });
    
    
QUnit.test( "Tetra.triangularPrismToTetras()()", function( assert ) {
    var x = 1;
    var y = 2;
    var z = 3;
    var vertices = [
        new LBGeometry.Vector3(0, 0, 0),
        new LBGeometry.Vector3(x, 0, 0),
        new LBGeometry.Vector3(x, y, 0),
        new LBGeometry.Vector3(0, y, 0),

        new LBGeometry.Vector3(0, 0, z),
        new LBGeometry.Vector3(x, 0, z),
        new LBGeometry.Vector3(x, y, z),
        new LBGeometry.Vector3(0, y, z)
    ];
    
    var vertexIndices = [
        0, 1, 3, 4, 5, 7
    ];
    
    var tetras = LBVolume.Tetra.triangularPrismToTetras(vertexIndices, vertices);
    assert.equal(tetras.length, 3, "OK Tetra Count");
    
    var refVol = x * y * z / 2;
    checkVolume(assert, tetras, refVol, "OK Tetras Volume");
    
    });
    

QUnit.test( "Tetra.cuboidToTetras()", function( assert ) {
    var x = 1;
    var y = 2;
    var z = 3;
    var vertices = [
        new LBGeometry.Vector3(0, 0, 0),
        new LBGeometry.Vector3(x, 0, 0),
        new LBGeometry.Vector3(x, y, 0),
        new LBGeometry.Vector3(0, y, 0),

        new LBGeometry.Vector3(0, 0, z),
        new LBGeometry.Vector3(x, 0, z),
        new LBGeometry.Vector3(x, y, z),
        new LBGeometry.Vector3(0, y, z)
    ];
    
    var vertexIndices = [
        1, 2, 6, 5, 0, 3, 7, 4
    ];
    
    var tetras = LBVolume.Tetra.cuboidToTetras(vertexIndices, vertices);
    assert.equal(tetras.length, 6, "OK Tetra Count");
    
    var refVol = x * y * z;
    checkVolume(assert, tetras, refVol, "OK Tetras Volume");    
});


checkTetrasSimilar = function(assert, test, ref, msg) {
    for (var i = 0; i < 4; ++i) {
        checkVector3(assert, test.vertices[i], ref.vertices[i].x, ref.vertices[i].y, ref.vertices[i].z, msg + " - Vertex[" + i + "]");
    }
    
    assert.equal(test.mass, ref.mass, msg + " - mass");
};

checkTetraArraysSimilar = function(assert, test, ref, msg) {
    assert.equal(test.length, ref.length, msg + " - array length");
    for (var i = 0; i < ref.length; ++i) {
        checkTetrasSimilar(assert, test[i], ref[i], " - Tetra " + i);
    }    
};

checkTetraSliceWithPlaneResultSide = function(assert, result, ref, msg, volOnly) {
    if (!ref) {
        assert.equal(result, undefined, msg + " - Undefined");
        return;
    }
    assert.equal(result.length, ref.length, msg + " - Lengths");
    
    if (volOnly) {
        var vol = LBVolume.Volume.totalVolume(result);
        var refVol = LBVolume.Volume.totalVolume(ref);
        assert.nearEqual(vol, refVol, msg + " - Volumes");
    }
    else {
        checkTetraArraysSimilar(assert, result, ref);
    }
};

checkTetraSliceWithPlaneResult = function(assert, result, above, below, msg, volOnly) {
    checkTetraSliceWithPlaneResultSide(assert, result[0], above, msg + " - Above", volOnly);
    checkTetraSliceWithPlaneResultSide(assert, result[1], below, msg + " - Below", volOnly);
};
    
QUnit.test( "Tetra.sliceWithPlane()", function( assert ) {
    var x = 1;
    var y = 2;
    var z = 3;
    var vertices = [
        new LBGeometry.Vector3(x, 0, 0),
        new LBGeometry.Vector3(x, y, 0),
        new LBGeometry.Vector3(0, y, 0),
        new LBGeometry.Vector3(x, y, z)
    ];
    
    var tetra = new LBVolume.Tetra(vertices);

    // No intersection....
    var plane = new LBGeometry.Plane(LBGeometry.Z_AXIS.clone(), 1);
    var result = LBVolume.Tetra.sliceWithPlane(tetra, plane);
    assert.equal(result, undefined, "No Intersection A");
    
    plane.constant = -10;
    result = LBVolume.Tetra.sliceWithPlane(tetra, plane);
    assert.equal(result, undefined, "No Intersection B");
    
    plane.constant = 0;
    result = LBVolume.Tetra.sliceWithPlane(tetra, plane);
    assert.equal(result, undefined, "No Intersection C - Entire Face");
    
    plane.constant = -z;
    result = LBVolume.Tetra.sliceWithPlane(tetra, plane);
    assert.equal(result, undefined, "No Intersection D - Single Vertex");
    
    // Through single vertex
    var ptA = new LBGeometry.Vector3(x, 0.5 * y, 0.5 * z);
    var ptB = new LBGeometry.Vector3(0.5 * x, y, 0.5 * z);
    plane.setFromCoplanarPoints(vertices[1], ptA, ptB);
    
    result = LBVolume.Tetra.sliceWithPlane(tetra, plane);
    checkTetraSliceWithPlaneResult(assert, result, 
        [
            new LBVolume.Tetra([vertices[0], vertices[1], ptA, ptB]),
            new LBVolume.Tetra([vertices[0], vertices[1], vertices[2], ptB])
        ],
        [
            new LBVolume.Tetra([vertices[1], vertices[3], ptA, ptB])
        ],
        "Single Vertex",
        true);
        
    // Flip plane normal...
    plane.setFromCoplanarPoints(vertices[1], ptB, ptA);
    result = LBVolume.Tetra.sliceWithPlane(tetra, plane);
    checkTetraSliceWithPlaneResult(assert, result, 
        [
            new LBVolume.Tetra([vertices[1], vertices[3], ptA, ptB])
        ],
        [
            new LBVolume.Tetra([vertices[0], vertices[1], vertices[2], ptA]),
            new LBVolume.Tetra([ptB, vertices[1], vertices[2], ptA])
        ],
        "Single Vertex, Other Dir",
        true);
    
    // Plane through two vertices.
    plane.setFromCoplanarPoints(vertices[1], vertices[3], LBGeometry.ORIGIN);
    result = LBVolume.Tetra.sliceWithPlane(tetra, plane);
    ptA.set(0.5 * x, 0.5 * y, 0);
    checkTetraSliceWithPlaneResult(assert, result, 
        [
            new LBVolume.Tetra([vertices[0], vertices[1], vertices[3], ptA])
        ],
        [
            new LBVolume.Tetra([vertices[1], vertices[2], vertices[3], ptA])
        ],
        "Two Vertices",
        true);

    // Flip plane normal.
    plane.setFromCoplanarPoints(vertices[3], vertices[1], LBGeometry.ORIGIN);
    result = LBVolume.Tetra.sliceWithPlane(tetra, plane);
    ptA.set(0.5 * x, 0.5 * y, 0);
    checkTetraSliceWithPlaneResult(assert, result, 
        [
            new LBVolume.Tetra([vertices[1], vertices[2], vertices[3], ptA])
        ],
        [
            new LBVolume.Tetra([vertices[0], vertices[1], vertices[3], ptA])
        ],
        "Two Vertices, Other Dir",
        true);

    // Single vertex on one side
    plane.setFromNormalAndCoplanarPoint(LBGeometry.Z_AXIS, new LBGeometry.Vector3(0, 0, 1.5));
    result = LBVolume.Tetra.sliceWithPlane(tetra, plane);
    ptA.set(x, 0.5*y, 0.5*z);
    ptB.set(0.5*x, y, 0.5*z);
    var ptC = new LBGeometry.Vector3();
    ptC.set(x, y, 0.5*z);
    checkTetraSliceWithPlaneResult(assert, result, 
        [
            new LBVolume.Tetra([vertices[3], ptA, ptB, ptC])
        ],
        [
            new LBVolume.Tetra([vertices[1], ptA, ptB, ptC]),
            new LBVolume.Tetra([vertices[0], vertices[1], ptA, ptB]),
            new LBVolume.Tetra([vertices[0], vertices[1], vertices[2], ptB])
        ],
        "Single Vertex Positive Side",
        true);

    plane.setFromNormalAndCoplanarPoint(LBGeometry.Z_AXIS.clone().negate(), new LBGeometry.Vector3(0, 0, 1.5));
    result = LBVolume.Tetra.sliceWithPlane(tetra, plane);
    ptA.set(x, 0.5*y, 0.5*z);
    ptB.set(0.5*x, y, 0.5*z);
    var ptC = new LBGeometry.Vector3();
    ptC.set(x, y, 0.5*z);
    checkTetraSliceWithPlaneResult(assert, result, 
        [
            new LBVolume.Tetra([vertices[1], ptA, ptB, ptC]),
            new LBVolume.Tetra([vertices[0], vertices[1], ptA, ptB]),
            new LBVolume.Tetra([vertices[0], vertices[1], vertices[2], ptB])
        ],
        [
            new LBVolume.Tetra([vertices[3], ptA, ptB, ptC])
        ],
        "Single Vertex Negative Side",
        true);
        
    // Two vertices on each side...
    ptA.set(x, 0.5*y, 0);
    ptB.set(x, 0.5*y, 0.5*z);
    ptC.set(0.5*x, y, 0);
    var ptD = new LBGeometry.Vector3();
    ptD.set(0.5*x, y, 0.5*z);
    plane.setFromCoplanarPoints(ptA, ptB, ptC);
    result = LBVolume.Tetra.sliceWithPlane(tetra, plane);
    checkTetraSliceWithPlaneResult(assert, result, 
        [
            new LBVolume.Tetra([vertices[0], vertices[2], ptA, ptB]),
            new LBVolume.Tetra([vertices[2], ptA, ptB, ptC]),
            new LBVolume.Tetra([vertices[2], ptB, ptC, ptD])
        ],
        [
            new LBVolume.Tetra([vertices[1], vertices[3], ptA, ptB]),
            new LBVolume.Tetra([vertices[3], ptA, ptB, ptC]),
            new LBVolume.Tetra([vertices[3], ptB, ptC, ptD])
        ],
        "Two Vertices Each Side",
        true);

    plane.setFromCoplanarPoints(ptB, ptA, ptC);
    result = LBVolume.Tetra.sliceWithPlane(tetra, plane);
    checkTetraSliceWithPlaneResult(assert, result, 
        [
            new LBVolume.Tetra([vertices[0], vertices[2], ptA, ptB]),
            new LBVolume.Tetra([vertices[2], ptA, ptB, ptC]),
            new LBVolume.Tetra([vertices[2], ptB, ptC, ptD])
        ],
        [
            new LBVolume.Tetra([vertices[1], vertices[3], ptA, ptB]),
            new LBVolume.Tetra([vertices[3], ptA, ptB, ptC]),
            new LBVolume.Tetra([vertices[3], ptB, ptC, ptD])
        ],
        "Two Vertices Each Side, opposite direction",
        true);
});

QUnit.test( "centerOfMassOfTetras", function( assert ) {
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
    LBVolume.Volume.allocateMassToVolumess(tetras, 5);
    
    var result = LBVolume.Volume.totalCenterOfMass(tetras);
    checkVector3(assert, result.position, 1, 0.5, 1.5, "Position");
    assert.nearEqual(result.mass, 5, "Mass");
});

QUnit.test( "TriBipyramid", function( assert ) {
    var data = {
        mass: 5,
        vertices: [
            0, 0, 0,
            2, 0, 0,
            2, 1, 0,
            0, 1, 0,
            
            0, 0, 3,
            2, 0, 3,
            2, 1, 3,
            0, 1, 3,
            
            0, 0, -3,
            2, 0, -3,
            2, 1, -3,
            0, 1, -3
        ],
        indices: [
            [ 4, 0, 1, 3, 10 ]
        ]
    };
    
    var vertices = LBGeometry.loadVector3ArrayFromCoordArray(data.vertices);
    var volume = new LBVolume.TriBipyramid(vertices, data.mass, data.indices[0]);
    
    var refTetras = LBVolume.Tetra.loadFromData(data);
    LBVolume.Volume.allocateMassToVolumess(refTetras, data.mass);
    
    var volumeTetras = volume.equivalentTetras();
    checkTetraArraysSimilar(assert, volumeTetras, refTetras, "Equivalent Tetras");
    assert.equal(volume.mass, data.mass, "Mass");
    
    var refVol = LBVolume.Volume.totalVolume(refTetras);
    assert.equal(volume.volume(), refVol, "Volume");
    
    var refCentroid = LBVolume.Volume.totalCenterOfMass(refTetras).position;
    var centroid = volume.centroid();
    checkVector3(assert, centroid, refCentroid.x, refCentroid.y, refCentroid.z, "Centroid");
});

QUnit.test( "Tri-Prism", function( assert ) {
    var data = {
        mass: 5,
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
            [ 0, 1, 4, 3, 2, 7 ]
        ]
    };
    
    var vertices = LBGeometry.loadVector3ArrayFromCoordArray(data.vertices);
    var volume = new LBVolume.TriPrism(vertices, data.mass, data.indices[0]);
    
    var refTetras = LBVolume.Tetra.loadFromData(data);
    LBVolume.Volume.allocateMassToVolumess(refTetras, data.mass);
    
    var tetras = volume.equivalentTetras();
    checkTetraArraysSimilar(assert, tetras, refTetras, "Equivalent Tetras");
    assert.equal(volume.mass, data.mass, "Mass");
    
    assert.equal(volume.volume(), 2 * 1 * 3 / 2, "Volume");
    
    var refCentroid = LBVolume.Volume.totalCenterOfMass(refTetras).position;
    var centroid = volume.centroid();
    checkVector3(assert, centroid, refCentroid.x, refCentroid.y, refCentroid.z, "Centroid");
});


QUnit.test( "Cuboid", function( assert ) {
    var data = {
        mass: 5,
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
    
    var vertices = LBGeometry.loadVector3ArrayFromCoordArray(data.vertices);
    var cuboid = new LBVolume.Cuboid(vertices, data.mass);
    
    var refTetras = LBVolume.Tetra.loadFromData(data);
    LBVolume.Volume.allocateMassToVolumess(refTetras, data.mass);
    
    var cuboidTetras = cuboid.equivalentTetras();
    checkTetraArraysSimilar(assert, cuboidTetras, refTetras, "Equivalent Tetras");
    assert.equal(cuboid.mass, data.mass, "Mass");
    
    assert.equal(cuboid.volume(), 2 * 1 * 3, "Volume");
    
    var centroid = cuboid.centroid();
    checkVector3(assert, centroid, 1, 0.5, 1.5, "Centroid");
});
