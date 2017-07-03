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


/* global LBGeometry, Leeboard, LBMath */

/**
 * 
 * @namespace LBVolume
 */
var LBVolume = LBVolume || {};

/**
 * Represents a tetrahedron.
 * @constructor
 * @param {Array[LBGeometry.Vector3]} [vertices]    If defined an array containing the
 * four vertices for the tetrahedron. References to the vertices are used, they are not copied.
 * If not defined the vertices are all set to new instances of {@link LBGeometry.Vector3}.
 * @returns {LBVolume.Tetra}
 */
LBVolume.Tetra = function(vertices) {
    this.vertices = [];
    if (vertices) {
        for (var i = 0; i < 4; ++i) {
            this.vertices.push(vertices[i]);
        }
    }
    else {
        for (var i = 0; i < 4; ++i) {
            this.vertices.push(new LBGeometry.Vector3());
        }
    }
};

LBVolume.Tetra._workingVertexArray = [ null, null, null, null, null, null, null, null ];
LBVolume.Tetra._workingVectorA = new LBGeometry.Vector3();
LBVolume.Tetra._workingVectorB = new LBGeometry.Vector3();
LBVolume.Tetra._workingVectorC = new LBGeometry.Vector3();
LBVolume.Tetra._workingArrayA = [];
LBVolume.Tetra._workingArrayB = [];
LBVolume.Tetra._workingArrayC = [];
LBVolume.Tetra._workingLine3 = new LBGeometry.Line3();
LBVolume.Tetra._workingOrderedIndices = [ 0, 1, 2, 3, 4, 5, 6, 7, 8];

LBVolume.Tetra.prototype = {
    /**
     * Creates a shallow copy of the tetra.
     * @returns {LBVolume.Tetra}    The shallow copy.
     */
    clone: function() {
        return new LBVolume.Tetra(this.vertices);
    },
    
    /**
     * Takes all the vertices of the tetra and clones them, making them unique to this
     * tetra.
     * @returns {LBVolume.Tetra}    this.
     */
    makeVerticesUnique: function() {
        for (var i = 0; i < this.vertices.length; ++i) {
            this.vertices[i] = this.vertices[i].clone();
        }
        return this;
    },
    
    /**
     * Computes the centroid (center of mass) of the tetra.
     * @param {LBGeometry.Vector3} [store] If defined the vector to store the centroid in.
     * @returns {LBGeometry.Vector3}    The centroid.
     */
    centroid: function(store) {
        store = store || new LBGeometry.Vector3();
        
        store.copy(this.vertices[0]);
        store.add(this.vertices[1]);
        store.add(this.vertices[2]);
        store.add(this.vertices[3]);
        store.divideScalar(4);
        
        return store;
    },
    
    /**
     * @returns {Number}    The volume of the tetrahedron.
     */
    volume: function() {
        // From https://en.wikipedia.org/wiki/Tetrahedron#Volume
        var a = LBVolume.Tetra._workingVectorA.copy(this.vertices[0]).sub(this.vertices[3]);
        var b = LBVolume.Tetra._workingVectorB.copy(this.vertices[1]).sub(this.vertices[3]);
        var c = LBVolume.Tetra._workingVectorC.copy(this.vertices[2]).sub(this.vertices[3]);
        b.cross(c);
        var volume = Math.abs(a.dot(b)) / 6;
        return volume;
    },
    
    /**
     * Creates a clone of this tetra that is mirrored about a plane.
     * @param {LBGeometry.Plane} plane  The mirror plane.
     * @returns {LBVolume.Tetra}
     */
    cloneMirrored: function(plane) {
        var clone = new LBVolume.Tetra();
        for (var i = 0; i < this.vertices.length; ++i) {
            LBGeometry.mirrorPointAboutPlane(plane, this.vertices[i], clone.vertices[i]);
        }
        return clone;
    },

    /**
     * Removes all references to other objects so this could hopefully be garbage collected.
     * @returns {undefined}
     */
    dispose: function() {
        this.vertices = null;
    },
    
    constructor: LBVolume.Tetra
};


/**
 * Returns the total volume of tetras in an array.
 * @param {Array[LBVolume.Tetra]} tetras    The array of tetras.
 * @returns {Number}    The total volume.
 */
LBVolume.Tetra.totalVolumeOfTetras = function(tetras) {
    var vol = 0;
    for (var i = 0; i < tetras.length; ++i) {
        vol += tetras[i].volume();
    }
    return vol;
};

/**
 * Converts a set of 5 vertices describing a triangular bipyramid into an array of two tetrahedra
 * representing the volume.
 * <p>
 * This is currently a fairly simple algorithm, it does not check for vertices lying on each
 * other, and expects the vertices in a particular order.
 * <p>
 * The bipyramid must be described such that the first four vertices describe one tetrahedron,
 * and the last four vertices describe the other tetrahedron (the face v[1], v[2], v[3] is
 * internal and does not exist).
 * @param {Array[Number]} vertexIndices The array of indices of the vertices in vertexArray.
 * @param {Array[LBGeometry.Vector3]} vertexArray   The array of vertices.
 * @param {Array} [tetras]  If defined the array to store the tetras into. This array is NOT cleared.
 * @returns {Array[LBVolume.Tetra]} The array of the tetrahedra.
 */
LBVolume.Tetra.triangularBipyramidToTetras = function(vertexIndices, vertexArray, tetras) {
    if (!tetras) {
        tetras = [];
    }

    var vertices = LBVolume.Tetra._workingVertexArray;
    vertices[0] = vertexArray[vertexIndices[0]];
    vertices[1] = vertexArray[vertexIndices[1]];
    vertices[2] = vertexArray[vertexIndices[2]];
    vertices[3] = vertexArray[vertexIndices[3]];
    tetras.push(new LBVolume.Tetra(vertices));

    vertices[0] = vertexArray[vertexIndices[1]];
    vertices[1] = vertexArray[vertexIndices[2]];
    vertices[2] = vertexArray[vertexIndices[3]];
    vertices[3] = vertexArray[vertexIndices[4]];
    tetras.push(new LBVolume.Tetra(vertices));
    
    return tetras;
};


/**
 * Converts a set of 6 vertices describing a triangular prism into an array of three tetrahedra
 * representing the volume.
 * <p>
 * This is currently a fairly simple algorithm, it does not check for vertices lying on each
 * other, and expects the vertices in a particular order.
 * <p>
 * The prism must be described such that the first 3 vertices represent one triangular
 * face and the second 3 vertices the other triangular face, and v[0] is connected to v[3],
 * v[1] is connected to v[4], and v[2] is connected to v[5].
 * @param {Array[Number]} vertexIndices The array of indices of the vertices in vertexArray.
 * @param {Array[LBGeometry.Vector3]} vertexArray   The array of vertices.
 * @param {Array} [tetras]  If defined the array to store the tetras into. This array is NOT cleared.
 * @returns {Array[LBVolume.Tetra]} The array of the tetrahedra.
 */
LBVolume.Tetra.triangularPrismToTetras = function(vertexIndices, vertexArray, tetras) {
    if (!tetras) {
        tetras = [];
    }

    var vertices = LBVolume.Tetra._workingVertexArray;
    vertices[0] = vertexArray[vertexIndices[0]];
    vertices[1] = vertexArray[vertexIndices[1]];
    vertices[2] = vertexArray[vertexIndices[2]];
    vertices[3] = vertexArray[vertexIndices[3]];
    tetras.push(new LBVolume.Tetra(vertices));

    vertices[0] = vertexArray[vertexIndices[3]];
    vertices[1] = vertexArray[vertexIndices[4]];
    vertices[2] = vertexArray[vertexIndices[5]];
    vertices[3] = vertexArray[vertexIndices[2]];
    tetras.push(new LBVolume.Tetra(vertices));

    vertices[0] = vertexArray[vertexIndices[3]];
    vertices[1] = vertexArray[vertexIndices[4]];
    vertices[2] = vertexArray[vertexIndices[1]];
    vertices[3] = vertexArray[vertexIndices[2]];
    tetras.push(new LBVolume.Tetra(vertices));
    
    return tetras;
};


/**
 * Converts a set of 8 vertices describing a cuboid (a convex polyhedron with 6 quadrilateral faces)
 * into an array of 6 tetrahedra representing the volume.
 * <p>
 * This is currently a fairly simple algorithm, it does not check for vertices lying on each
 * other, and expects the vertices in a particular order.
 * <p>
 * The cuboid must be described such that the faces are described by the following index groups:
 * <p>
 * <li>0, 1, 2, 3
 * <li>4, 5, 6, 7
 * <li>4, 0, 3, 7
 * <li>7, 3, 2, 7
 * <li>6, 2, 1, 5
 * <li>5, 1, 0, 4
 * <p>
 * This is basically the first 4 vertices are one face and the second 4 vertices are the
 * opposite face, with the vertices on the each such that v[0] is connected to v[4], v[1]
 * is connected to v[5], etc.
 * @param {Array[Number]} vertexIndices The array of indices of the vertices in vertexArray.
 * @param {Array[LBGeometry.Vector3]} vertexArray   The array of vertices.
 * @param {Array} [tetras]  If defined the array to store the tetras into. This array is NOT cleared.
 * @returns {Array[LBVolume.Tetra]} The array of the tetrahedra.
 */
LBVolume.Tetra.cuboidToTetras = function(vertexIndices, vertexArray, tetras) {
    if (!tetras) {
        tetras = [];
    }

    var vertices = LBVolume.Tetra._workingVertexArray;

    vertices[0] = vertexArray[vertexIndices[0]];
    vertices[1] = vertexArray[vertexIndices[1]];
    vertices[2] = vertexArray[vertexIndices[2]];
    vertices[3] = vertexArray[vertexIndices[5]];
    tetras.push(new LBVolume.Tetra(vertices));
    
    vertices[0] = vertexArray[vertexIndices[0]];
    vertices[1] = vertexArray[vertexIndices[2]];
    vertices[2] = vertexArray[vertexIndices[3]];
    vertices[3] = vertexArray[vertexIndices[5]];
    tetras.push(new LBVolume.Tetra(vertices));
    
    vertices[0] = vertexArray[vertexIndices[2]];
    vertices[1] = vertexArray[vertexIndices[6]];
    vertices[2] = vertexArray[vertexIndices[3]];
    vertices[3] = vertexArray[vertexIndices[5]];
    tetras.push(new LBVolume.Tetra(vertices));
    
    vertices[0] = vertexArray[vertexIndices[5]];
    vertices[1] = vertexArray[vertexIndices[6]];
    vertices[2] = vertexArray[vertexIndices[7]];
    vertices[3] = vertexArray[vertexIndices[3]];
    tetras.push(new LBVolume.Tetra(vertices));
    
    vertices[0] = vertexArray[vertexIndices[5]];
    vertices[1] = vertexArray[vertexIndices[7]];
    vertices[2] = vertexArray[vertexIndices[4]];
    vertices[3] = vertexArray[vertexIndices[3]];
    tetras.push(new LBVolume.Tetra(vertices));
    
    vertices[0] = vertexArray[vertexIndices[5]];
    vertices[1] = vertexArray[vertexIndices[4]];
    vertices[2] = vertexArray[vertexIndices[3]];
    vertices[3] = vertexArray[vertexIndices[0]];
    tetras.push(new LBVolume.Tetra(vertices));

    return tetras;
};

/**
 * Determines where a plane slices a tetra, and if it does slice the tetra this
 * generates the tetras representing the volumes on each side of the plane.
 * @param {LBVolume.Tetra} tetra    The tetra of interest.
 * @param {LBGeometry.Plane} plane  The slicing plane.
 * @param {Boolean} [positiveDir = true]    If true then tetras are generated to represent
 * the volume on the side of the plane to which the normal points.
 * @param {Boolean} [negativeDir = true]    If true then tetras are generated to represent
 * the volume on the side of the plane to which the normal does not point.
 * @returns {undefined | Array[Array[LBVolume.Tetra]]}  If the plane does not slice the tetra,
 * returns undefined, otherwise an array of two elements, with the first element
 * an array containing the tetras for the volume on the positive side of the plane
 * (empty if positiveDir is false), and the second element an array containing the
 * tetras for the volume on the negative side of the plane (empty if negativeDir is false).
 */
LBVolume.Tetra.sliceWithPlane = function(tetra, plane, positiveDir, negativeDir) {
    
    // Sort the vertices to which side of the plane they lie.
    // We have the following cases:
    // All points on one side: No intersection.
    // One point on plane, other points on one side: No intersection.
    // One point on plane, one point on one side: A tetra on one side, two tetras on the other.
    // Two points on plane, one on each side: Two tetras, one on each side.
    // One point on one side: one tetra on one side, three on the other.
    // Two points on one side: three tetras on each side.
    var above = LBVolume.Tetra._workingArrayA;
    var below = LBVolume.Tetra._workingArrayB;
    var onPlane = LBVolume.Tetra._workingArrayC;
    above.splice(0, above.length);
    below.splice(0, below.length);
    onPlane.splice(0, onPlane.length);

    for (var i = 0; i < 4; ++i) {
        var distance = plane.distanceToPoint(tetra.vertices[i]);
        if (LBMath.isLikeZero(distance)) {
            onPlane.push(i);
        }
        else if (distance > 0) {
            above.push(i);
        }
        else if (distance < 0) {
            below.push(i);
        }
    }
    
    if (((onPlane.length + above.length) === 4) || ((onPlane.length + below.length) === 4)) {
        // No intersection...
        return undefined;
    }
    
    if (!Leeboard.isVar(positiveDir)) {
        positiveDir = true;
    }
    if (!Leeboard.isVar(negativeDir)) {
        negativeDir = true;
    }
    
    var aboveTetras = [];
    var belowTetras = [];
    
    var vertices = LBVolume.Tetra._workingVertexArray;
    var line = LBVolume.Tetra._workingLine3;
    var indices = LBVolume.Tetra._workingOrderedIndices;
    
    if (onPlane.length === 1) {
        // Divide into a tetra on one side, two tetras on the other.
        var singleTetras;
        var otherTetras;
        var singleIndices;
        var otherIndices;
        
        if (above.length === 1) {
            singleIndices = above;
            otherIndices = below;
            if (positiveDir) {
                singleTetras = aboveTetras;
            }
            if (negativeDir) {
                otherTetras = belowTetras;
            }
        }
        else {
            singleIndices = below;
            otherIndices = above;
            if (positiveDir) {
                otherTetras = aboveTetras;
            }
            if (negativeDir) {
                singleTetras = belowTetras;
            }
        }
        
        var singleVertex = tetra.vertices[singleIndices[0]];
        line.start.copy(singleVertex);
        
        var vertex0 = tetra.vertices[otherIndices[0]];
        line.end.copy(vertex0);
        var pointA = plane.intersectLine(line);
        
        var vertex1 = tetra.vertices[otherIndices[1]];
        line.end.copy(vertex1);
        var pointB = plane.intersectLine(line);
        
        if (singleTetras) {
            vertices[0] = tetra.vertices[onPlane[0]];
            vertices[1] = singleVertex;
            vertices[2] = pointA;
            vertices[3] = pointB;
            singleTetras.push(new LBVolume.Tetra(vertices));
        }
        if (otherTetras) {
            // Can't use vertices, since it's LBVolume.Tetra._workingVertexArray and
            // we can't pass it into an LBVolume.Tetra function...
            var myVertices = [vertex0, vertex1, tetra.vertices[onPlane[0]], pointA, pointB];
            LBVolume.Tetra.triangularBipyramidToTetras(indices, myVertices, otherTetras);
        }
    }
    else if (onPlane.length === 2) {
        // Divide into two tetras...
        vertices[0] = tetra.vertices[onPlane[0]];
        vertices[1] = tetra.vertices[onPlane[1]];
        
        line.start.copy(tetra.vertices[above[0]]);
        line.end.copy(tetra.vertices[below[0]]);
        vertices[2] = plane.intersectLine(line);
        
        if (positiveDir) {
            vertices[3] = tetra.vertices[above[0]];
            aboveTetras.push(new LBVolume.Tetra(vertices));
        }
        if (negativeDir) {
            vertices[3] = tetra.vertices[below[0]];
            belowTetras.push(new LBVolume.Tetra(vertices));
        }
    }
    else if ((above.length === 1) || (below.length === 1)) {
        // Single tetra on one side...
        var singleTetras;
        var otherTetras;
        var singleIndices;
        var otherIndices;

        if (above.length === 1) {
            singleIndices = above;
            otherIndices = below;
            if (positiveDir) {
                singleTetras = aboveTetras;
            }
            if (negativeDir) {
                otherTetras = belowTetras;
            }
        }
        else {
            singleIndices = below;
            otherIndices = above;
            if (positiveDir) {
                otherTetras = aboveTetras;
            }
            if (negativeDir) {
                singleTetras = belowTetras;
            }
        }
        
        var singleVertex = tetra.vertices[singleIndices[0]];
        line.start.copy(singleVertex);
        
        var vertex0 = tetra.vertices[otherIndices[0]];
        line.end.copy(vertex0);
        var pointA = plane.intersectLine(line);
        
        var vertex1 = tetra.vertices[otherIndices[1]];
        line.end.copy(vertex1);
        var pointB = plane.intersectLine(line);
        
        var vertex2 = tetra.vertices[otherIndices[2]];
        line.end.copy(vertex2);
        var pointC = plane.intersectLine(line);
        
        if (singleTetras) {
            vertices[0] = singleVertex;
            vertices[1] = pointA;
            vertices[2] = pointB;
            vertices[3] = pointC;
            singleTetras.push(new LBVolume.Tetra(vertices));
        }
        if (otherTetras) {
            // This is a triangular prism
            // Can't use vertices, since it's LBVolume.Tetra._workingVertexArray and
            // we can't pass it into an LBVolume.Tetra function...
            var myVertices = [vertex0, vertex1, vertex2, pointA, pointB, pointC ];
            LBVolume.Tetra.triangularPrismToTetras(indices, myVertices, otherTetras);
        }
    }
    else {
        // Two triangular prisms...
        var aboveA = tetra.vertices[above[0]];
        var aboveB = tetra.vertices[above[1]];
        var belowA = tetra.vertices[below[0]];
        var belowB = tetra.vertices[below[1]];
        
        line.start.copy(aboveA);
        line.end.copy(belowA);
        var ptAA = plane.intersectLine(line);
        
        line.end.copy(belowB);
        var ptAB = plane.intersectLine(line);
        
        line.start.copy(aboveB);
        var ptBB = plane.intersectLine(line);
        
        line.end.copy(belowA);
        var ptBA = plane.intersectLine(line);
        
        if (positiveDir) {
            var myVertices = [aboveA, ptAA, ptAB, aboveB, ptBA, ptBB];
            LBVolume.Tetra.triangularPrismToTetras(indices, myVertices, aboveTetras);
        }
        if (negativeDir) {
            var myVertices = [belowA, ptAA, ptAB, belowB, ptBA, ptBB];
            LBVolume.Tetra.triangularPrismToTetras(indices, myVertices, belowTetras);
        }
    }
    
    return [aboveTetras, belowTetras];
};


/**
 * Loads an array of tetras from properties in a data object.
 * @param {Object} data The data object.
 * @param {Array[LBGeometry.Vector3]} [vertices] If defined the array of vertices to use,
 * otherwise data should have a vertices property.
 * @param {Array[LBVolume.Tetra]} [tetras] If defined, the array to store the tetras into.
 * This is NOT cleared.
 * @returns {Array[LBVolume.Tetra]} The array of tetras.
 */
LBVolume.Tetra.loadFromData = function(data, vertices, tetras) {
    if (!vertices) {
        vertices = LBGeometry.loadVector3ArrayFromCoordArray(data.vertices);
    }
    if (!tetras) {
        tetras = [];
    }
    
    var firstIndex = tetras.length;
    
    var indices = data.indices;
    for (var i = 0; i < indices.length; ++i) {
        switch (indices[i].length) {
            case 4 :
                tetras.push(new LBVolume.Tetra(indices[i], vertices));
                break;
                
            case 5 :
                LBVolume.Tetra.triangularBipyramidToTetras(indices[i], vertices, tetras);
                break;
                
            case 6 :
                LBVolume.Tetra.triangularPrismToTetras(indices[i], vertices, tetras);
                break;
                
            case 8 :
                LBVolume.Tetra.cuboidToTetras(indices[i], vertices, tetras);
                break;
                
            default :
                console.warn("LBVolume.Tetra.loadFromData: " + indices[i].length + " indices not supported, data.indices[" + i + "]");
                break;
        }
    }
    
    if (data.mirrorPlane) {
        var mirrorPlane = LBGeometry.loadPlane(data.mirrorPlane);
        if (!mirrorPlane) {
            console.warn("LBVolume.Tetra.loadFromData: data.mirrorPlane could not be loaded into an LBGeometry.Plane object.");
        }
        else {
            var endIndex = tetras.length;

            for (var i = firstIndex; i < endIndex; ++i) {
                tetras.push(tetras[i].cloneMirrored(mirrorPlane));
            }
        }
    }
    
    return tetras;
};
