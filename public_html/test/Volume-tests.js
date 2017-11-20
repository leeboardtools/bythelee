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
define(['lbgeometry', 'lbvolume'], function (LBGeometry, LBVolume) {

var checkVector3 = require('test/Geometry-tests.js').checkVector3;

QUnit.module('Volume-tests');

checkVolume = function(assert, tetras, refVol, msg) {
    var vol = LBVolume.Volume.totalVolume(tetras);
    assert.nearEqual(vol, refVol, msg);
};

checkFaces = function(assert, volume, msg) {
    var centroid = volume.getCentroid();
    var normal;
    var faces = volume.getFaces();
    for (var f = 0; f < faces.length; ++f) {
        normal = volume.getFaceNormal(f, normal);
        var vec = volume.vertices[faces[f][0]].clone();
        vec.sub(centroid);
        var dir = vec.dot(normal);
        assert.ok(dir > 0, msg + " Face " + f + " Normal Pointing Outward");
    }
};

checkMirrored = function(assert, volume, plane, msg) {
    var mirroredVol = volume.cloneMirrored(plane);
    checkFaces(assert, mirroredVol, msg + " - Faces");
    assert.equal(mirroredVol.getVolume(), volume.getVolume(), msg + " - Volume");
    
    var centroid = volume.getCentroid();
    var refMirroredCentroid = LBGeometry.mirrorPointAboutPlane(plane, centroid);
    var mirroredCentroid = mirroredVol.getCentroid();
    checkVector3(assert, mirroredCentroid, refMirroredCentroid.x, refMirroredCentroid.y, refMirroredCentroid.z, msg + " - Centroid");
};

QUnit.test( "Tetra.getVolume()", function( assert ) {
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
    assert.nearEqual(tetra.getVolume(), vol, "Simple Volume");
    
    var xfrm = new LBGeometry.Matrix4();
    xfrm.makeFromEulerAndXYZ(1, 2, 3, 4, 5, 6);
    
    for (var i = 0; i < vertices.length; ++i) {
        vertices[i].applyMatrix4(xfrm);
    }
    assert.nearEqual(tetra.getVolume(), vol, "Transformed Volume");
    
});

QUnit.test( "Tetra.tetraInertiaTensor()", function( assert ) {
    // From the example given in http://thescipub.com/PDF/jmssp.2005.8.11.pdf
    var vertices = [
        new LBGeometry.Vector3(8.33220, -11.86875, 0.93355),
        new LBGeometry.Vector3(0.75523, 5.00000, 16.37072),
        new LBGeometry.Vector3(52.61236, 5.00000, -5.38580),
        new LBGeometry.Vector3(2.00000, 5.00000, 3.00000)
    ];
    
    var tetra = new LBVolume.Tetra(vertices);
    
    var vol = tetra.getVolume();
    assert.nearEqual(vol, 11239.4001852988/6, "Volume", 1e-3);
    tetra.mass = vol;
    
    var centroid = tetra.getCentroid();
    checkVector3(assert, centroid, 15.92492, 0.78281, 3.72692, "Centroid", 1e-3);
    
    var tensor = tetra.tetraInertiaTensor();
    var tol = 1e-3;
    var aRef = 43520.33257;
    var bRef = 194711.28938;
    var cRef = 191168.76173;
    var apRef = 4417.66150;
    var bpRef = -46343.16662;
    var cpRef = 11996.20119;
    assert.nearEqual(tensor.elements[0], aRef, "a", tol);
    assert.nearEqual(-tensor.elements[1], bpRef, "bp", tol);
    assert.nearEqual(-tensor.elements[2], cpRef, "cp", tol);
    assert.nearEqual(tensor.elements[4], bRef, "b", tol);
    assert.nearEqual(-tensor.elements[5], apRef, "ap", tol);
    assert.nearEqual(tensor.elements[8], cRef, "c", tol);
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
// TODO FIX ME!!!
//    assert.equal(result, undefined, "No Intersection A");
    
    plane.constant = -10;
    result = LBVolume.Tetra.sliceWithPlane(tetra, plane);
// TODO FIX ME!!!
//    assert.equal(result, undefined, "No Intersection B");
    
    plane.constant = 0;
    result = LBVolume.Tetra.sliceWithPlane(tetra, plane);
// TODO FIX ME!!!
//    assert.equal(result, undefined, "No Intersection C - Entire Face");
    
    plane.constant = -z;
    result = LBVolume.Tetra.sliceWithPlane(tetra, plane);
// TODO FIX ME!!!
//    assert.equal(result, undefined, "No Intersection D - Single Vertex");
    
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

QUnit.test( "TriBiPyramid", function( assert ) {
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
    var volume = new LBVolume.TriBiPyramid(vertices, data.mass, data.indices[0]);
    
    var refTetras = LBVolume.Tetra.loadFromData(data);
    LBVolume.Volume.allocateMassToVolumes(refTetras, data.mass);
    
    var volumeTetras = volume.equivalentTetras();
    checkTetraArraysSimilar(assert, volumeTetras, refTetras, "Equivalent Tetras");
    assert.equal(volume.mass, data.mass, "Mass");
    
    var refVol = LBVolume.Volume.totalVolume(refTetras);
    assert.equal(volume.getVolume(), refVol, "Volume");
    
    var refCentroid = LBVolume.Volume.totalCenterOfMass(refTetras).position;
    var centroid = volume.getCentroid();
    checkVector3(assert, centroid, refCentroid.x, refCentroid.y, refCentroid.z, "Centroid");
    
    checkFaces(assert, volume, "Faces");
    
    checkMirrored(assert, volume, LBGeometry.XY_PLANE, "X-Y");
    checkMirrored(assert, volume, LBGeometry.YZ_PLANE, "Y-Z");
    checkMirrored(assert, volume, LBGeometry.ZX_PLANE, "Z-X");
    
    var volume2 = new LBVolume.TriBiPyramid(vertices, data.mass, [10, 0, 1, 3, 4]);
    assert.equal(volume2.getVolume(), refVol, "Volume2");
    checkFaces(assert, volume2, "Faces2");
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
    LBVolume.Volume.allocateMassToVolumes(refTetras, data.mass);
    
    var tetras = volume.equivalentTetras();
    checkTetraArraysSimilar(assert, tetras, refTetras, "Equivalent Tetras");
    assert.equal(volume.mass, data.mass, "Mass");
    
    assert.equal(volume.getVolume(), 2 * 1 * 3 / 2, "Volume");
    
    var refCentroid = LBVolume.Volume.totalCenterOfMass(refTetras).position;
    var centroid = volume.getCentroid();
    checkVector3(assert, centroid, refCentroid.x, refCentroid.y, refCentroid.z, "Centroid");
    
    checkFaces(assert, volume, "Faces");
    
    checkMirrored(assert, volume, LBGeometry.XY_PLANE, "X-Y");
    checkMirrored(assert, volume, LBGeometry.YZ_PLANE, "Y-Z");
    checkMirrored(assert, volume, LBGeometry.ZX_PLANE, "Z-X");
    
    var volume2 = new LBVolume.TriPrism(vertices, data.mass, [0, 4, 1, 3, 7, 2]);
    assert.equal(volume2.getVolume(), volume.getVolume(), "Volume2");
    checkFaces(assert, volume2, "Faces2");
});


QUnit.test( "Cuboid", function( assert ) {
    var data = {
        mass: 5,
        vertices: [
            0, 0, 3,
            2, 0, 3,
            2, 1, 3,
            0, 1, 3,
            
            0, 0, 0,
            2, 0, 0,
            2, 1, 0,
            0, 1, 0
        ],
        indices: [
            [ 0, 1, 2, 3, 4, 5, 6, 7]
        ]
    };
    
    var vertices = LBGeometry.loadVector3ArrayFromCoordArray(data.vertices);
    var volume = new LBVolume.Cuboid(vertices, data.mass);
    
    var refTetras = LBVolume.Tetra.loadFromData(data);
    LBVolume.Volume.allocateMassToVolumes(refTetras, data.mass);
    
    var cuboidTetras = volume.equivalentTetras();
    checkTetraArraysSimilar(assert, cuboidTetras, refTetras, "Equivalent Tetras");
    assert.equal(volume.mass, data.mass, "Mass");
    
    assert.equal(volume.getVolume(), 2 * 1 * 3, "Volume");
    
    var centroid = volume.getCentroid();
    checkVector3(assert, centroid, 1, 0.5, 1.5, "Centroid");
    
    checkFaces(assert, volume, "Faces");
    
    checkMirrored(assert, volume, LBGeometry.XY_PLANE, "X-Y");
    checkMirrored(assert, volume, LBGeometry.YZ_PLANE, "Y-Z");
    checkMirrored(assert, volume, LBGeometry.ZX_PLANE, "Z-X");
});


QUnit.test( "Volume.overallInertiaTensor()", function( assert ) {
    var x = 10;
    var y = 5;
    var z = 15;
    var mass = 5;
    
    y = x;
    z = x;
    
    var Ixx = mass / 12 * (y*y + z*z);
    var Iyy = mass / 12 * (z*z + x*x);
    var Izz = mass / 12 * (y*y + x*x);
    
    var data = {
        mass: mass,
        vertices: [
            0, 0, 0,
            0, 0, z,
            0, y, z,
            0, y, 0,
            
            x, 0, 0,
            x, 0, z,
            x, y, z,
            x, y, 0
        ],
        indices: [
            [ 0, 1, 2, 3, 4, 5, 6, 7]
        ]
    };
    
    var vertices = LBGeometry.loadVector3ArrayFromCoordArray(data.vertices);
    
    var offset = new LBGeometry.Vector3(-x/2, -y/2, -z/2);
    vertices.forEach(function(vertex) {
        vertex.add(offset);
    });
    
    var volume = new LBVolume.Cuboid(vertices, data.mass);
    
    var volumes = [ volume ];
    
    var tensor = LBVolume.Volume.overallInertiaTensor(volumes);
    
    assert.nearEqual(tensor.elements[0], Ixx, "Ixx");
    assert.nearEqual(tensor.elements[4], Iyy, "Iyy");
    assert.nearEqual(tensor.elements[8], Izz, "Izz");
    
    var dx = 5;
    var dy = 6;
    var dz = 7;
    volume.vertices.forEach(function(vertex) {
        vertex.set(vertex.x + dx, vertex.y + dy, vertex.z + dz);
    });
    LBVolume.Volume.overallInertiaTensor(volumes, tensor);
    
    assert.nearEqual(tensor.elements[0], Ixx, "Ixx Offset");
    assert.nearEqual(tensor.elements[4], Iyy, "Iyy Offset");
    assert.nearEqual(tensor.elements[8], Izz, "Izz Offset");
});


});
