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

define(['lbutil', 'lbmath', 'lbgeometry'],
function(LBUtil, LBMath, LBGeometry) {
    
    'use strict';

/**
 * A bunch of volume related classes and functions.
 * @exports LBVolume
 */
var LBVolume = LBVolume || {};

/**
 * Base class for volumes. A volume has a set of vertices and faces, and can be
 * broken down into a set of tetrahedra via {@link module:LBVolume.Volume#equivalentTetras}.
 * @constructor
 * @param {String} typeName The type name of the volume class.
 * @param {Number} [mass=Number.NaN] If defined the mass  assigned to the volume.
 * @param {Number} [massDistribution=1] Additional factor used by {@link module:LBVolume.allocateMassToVolumes}
 * to control mass distribution.
 * @returns {module:LBVolume.Volume}
 */
LBVolume.Volume = function(typeName, mass, massDistribution) {
    /**
     * The type name of the volume, used to describe it in messages.
     */
    this.typeName = typeName || "Unknown";

    /**
     * The array of vertices of the tetra.
     * @member {module:LBGeometry.Vector3}
     */
    this.vertices = [];    
    
    /**
     * Mass associated with the volume, set to {@link Number.NaN} if a mass is not assigned.
     * @member {module:Number}
     */
    this.mass = LBUtil.isVar(mass) ? mass : Number.NaN;
    
    /**
     * Additional factor used by {@link module:LBVolume.allocateMassToVolumes} to control mass distribution.
     * This is basically a normalized density value.
     * @member {Number}
     */
    this.massDistribution = massDistribution || 1;
};

LBVolume.Volume._workingCenterOfMassResult;
LBVolume.Volume._workingVector3A = new LBGeometry.Vector3();
LBVolume.Volume._workingVector3B = new LBGeometry.Vector3();
LBVolume.Volume._workingVector3C = new LBGeometry.Vector3();
LBVolume.Volume._workingMatrix3;

LBVolume.Volume.prototype = {
    /**
     * Creates a shallow copy of the volume.
     * @abstract
     * @returns {module:LBVolume.Tetra}    The shallow copy.
     */
    clone: function() {
        throw 'clone() not implemented by ' + this.typeName;
    },
    
    /**
     * Creates a clone of the volume mirrored about a plane.
     * @abstract
     * @param {module:LBGeometry.Plane} plane  The plane to mirror about.
     * @returns {module:LBVolume.Volume}   The clone.
     */
    cloneMirrored: function(plane) {
        throw 'cloneMirrored() not implemented by ' + this.cloneMirrored;
    },
    
    /**
     * Makes the vertices of the volume unique by cloning them.
     * @returns {module:LBVolume.Volume}   this.
     */
    makeVerticesUnique: function() {
        for (var i = 0; i < this.vertices.length; ++i) {
            this.vertices[i] = this.vertices[i].clone();
        }
        return this;
    },
    
    /**
     * Retrieves an array of arrays of indices into the vertices array describing each
     * face. The face indices should be specified in CCW order so the normal is pointing
     * outward.
     * @abstract
     * @returns {Number[][]}    Array of arrays of indices.
     */
    getFaces: function() {
        throw 'faces() not implemented by ' + this.typeName;
    },
    
    /**
     * Retrieves the normal vector of a face.
     * @param {Number} f    The face index.
     * @param {module:LBGeometry.Vector3} [store]  If defined set to the normal.
     * @returns {module:LBGeometry.Vector3}    The normal.
     */
    getFaceNormal: function(f, store) {
        var face = this.getFaces()[f];
        var v0 = this.vertices[face[0]];
        var v1 = this.vertices[face[1]];
        var v2 = this.vertices[face[2]];
        var v1m0 = LBVolume.Volume._workingVector3A.copy(v1).sub(v0);
        var v2m1 = LBVolume.Volume._workingVector3B.copy(v2).sub(v1);
        
        store = (store) ? store.copy(v1m0) : v1m0.clone();
        store.cross(v2m1).normalize();
        return store;
    },
    
    /**
     * Computes the centroid of the volume.
     * @param {module:LBGeometry.Vector3} [store] If defined the object to store the centroid into.
     * @returns {module:LBGeometry.Vector3}    The centroid.
     */
    getCentroid: function(store) {
        var tetras = this.equivalentTetras();
        var result = LBVolume.Volume._workingCenterOfMassResult = LBVolume.Volume.totalCenterOfMass(tetras,
            LBVolume.Volume._workingCenterOfMassResult);
        if (store) {
            return store.copy(result.position);
        }
        return result.position.clone();
    },
    
    /**
     * Computes the volume of the volume.
     * @returns {Number}    The volume.
     */
    getVolume: function() {
        var tetras = this.equivalentTetras();
        return LBVolume.Volume.totalVolume(tetras);
    },
    
    /**
     * Retrieves an array of {@link module:LBVolume.Tetra} objects that make up the volume.
     * For the case of {@link module:LBVolume.Tetra} this is a one element array containing
     * the tetra.
     * <p>
     * Note that the tetras returned should be considered to be owned by this volume,
     * and should not be modified directly.
     * @abstract
     * @returns {module:LBVolume.Tetra[]}  The array of tetras.
     */
    equivalentTetras: function() {
        throw 'equivalentTetras() not implemented by ' + this.typeName;
    },
    
    
    /**
     * Applies a rotation defined by Euler angles to all at the vertices.
     * @param {module:LBGeometry.Euler}  rotation  The rotation in Euler angles.
     * @returns {module:LBVolume.Volume}   this.
     */
    applyEuler: function(rotation) {
        var quaternion = new LBGeometry.Quaternion();
        quaternion.setFromEuler(rotation);
        return this.applyQuaternion(quaternion);
    },
    
    /**
     * Applies a rotation defined by a quaternion to all at the vertices.
     * @param {module:LBGeometry.Quaternion}  quaternion  The quaternion to apply
     * @returns {module:LBVolume.Volume}   this.
     */
    applyQuaternion: function(quaternion) {
        this.vertices.forEach(function(vertex) {
           vertex.applyQuaternion(quaternion); 
        });
        return this;
    },
    
    /**
     * Helper that applies a rotation based upon a data object to the vertices of the volume.
     * @param {Object} data The data object, if it has a rotation property then that is
     * used to define the rotation.
     * @returns {module:LBVolume.Volume}   this.
     */
    loadRotation: function(data) {
        if (data.rotation) {
            var rotation = LBGeometry.loadEuler(data.rotation);
            this.applyEuler(rotation);
        }
        return this;
    },
    
    /**
     * Call when done with the object to have it release any internal references
     * to other objects to help with garbage collection.
     * @returns {undefined}
     */
    destroy: function() {
        if (this.vertices) {
            if (this._equivalentTetrasArray) {
                if ((this._equivalentTetrasArray.length > 0) && (this._equivalentTetrasArray[0] !== this)) {
                    this._equivalentTetrasArray.forEach(function(tetra) {
                        tetra.destroy();
                    });
                }
                this._equivalentTetrasArray.length = 0;
                this._equivalentTetrasArray = null;
            }
            this.vertices.length = 0;
            this.vertices = null;
        }
    },
    
    constructor: LBVolume.Volume
};


/**
 * Returns the total volume of the volumes in an array.
 * @param {module:LBVolume.Volume[]} volumes    The array of volumes.
 * @returns {Number}    The total volume.
 */
LBVolume.Volume.totalVolume = function(volumes) {
    var vol = 0;
    for (var i = 0; i < volumes.length; ++i) {
        vol += volumes[i].getVolume();
    }
    return vol;
};


/**
 * Calculates the center of mass and total mass of the volumes in an array of volumes.
 * Note that if a volume does not have a mass assigned, it's volume is used, so to
 * ensure consistency the volumes should either have all their masses defined (use 0
 * to ignore a volume) or not have a mass defined at all.
 * @param {module:LBVolume.Volume[]} volume    The array of volumes.
 * @param {Object} [store]  If defined the object to store the results into.
 * @returns {Object}    The results, the position property is compatible with {@link module:LBGeometry.Vector3}
 * and contains the coordinates of the center of mass, the mass property is the total mass.
 */
LBVolume.Volume.totalCenterOfMass = function(volume, store) {
    store = store || {};
    
    var centroid = LBVolume.Tetra._workingVectorA;
    var sumX = 0, sumY = 0, sumZ = 0;
    var totalMass = 0;
    for (var i = 0; i < volume.length; ++i) {
        var mass = !Number.isNaN(volume[i].mass) ? volume[i].mass : volume[i].getVolume();
        totalMass += mass;
        centroid = volume[i].getCentroid(centroid);
        sumX += centroid.x * mass;
        sumY += centroid.y * mass;
        sumZ += centroid.z * mass;
    }
    
    var x, y, z;
    if (totalMass > 0) {
        x = sumX / totalMass;
        y = sumY / totalMass;
        z = sumZ / totalMass;
    }
    else {
        x = y = z = 0;
    }
    
    if (!store.position) {
        store.position = new LBGeometry.Vector3(x, y, z);
    }
    else {
        store.position.set(x, y, z);
    }
    
    store.mass = totalMass;
    
    return store;
};


/**
 * Allocates a mass amongst all the volumes in an array based upon the volume
 * of the individual volumes.
 * @param {module:LBVolume.Volume[]} volumes    The array of volumes.
 * @param {Number} totalMass    The total mass to assign, may be {@link Number.NaN}.
 * @param {Number} [startIndex=0] If specified the index in volumes at which to start.
 * @param {Number} [endIndex=tetras.length] If specified the index after the last index
 * in volumes to process.
 * @returns {undefined}
 */
LBVolume.Volume.allocateMassToVolumes = function(volumes, totalMass, startIndex, endIndex) {
    startIndex = startIndex || 0;
    if (!LBUtil.isVar(endIndex)) {
        endIndex = volumes.length;
    }
    
    if (Number.isNaN(totalMass)) {
        for (var i = startIndex; i < endIndex; ++i) {
            volumes[i].mass = Number.NaN;
        }
    }
    else {
        var volValues = [];
        var distributionValues = [];
        var totalDistribution = 0;
        for (var i = startIndex; i < endIndex; ++i) {
            var vol = volumes[i].getVolume();
            volValues[i] = vol;
            
            var distribution = volumes[i].massDistribution || 1;
            distributionValues[i] = distribution;
            totalDistribution += distribution;
        }

        var totalVol = 0;
        for (var i = startIndex; i < endIndex; ++i) {
            volValues[i] *= distributionValues[i];
            totalVol += volValues[i];
        }
        
        var massVol = (LBMath.isLikeZero(totalVol)) ? 0 : totalMass / totalVol;
        for (var i = startIndex; i < endIndex; ++i) {
            volumes[i].mass = volValues[i] * massVol;
            var equivalentTetras = volumes[i].equivalentTetras();
            if (equivalentTetras !== volumes) {
                LBVolume.Volume.allocateMassToVolumes(equivalentTetras, volumes[i].mass);
            }
        }
    }
};


/**
 * Calculates the inertia tensor from the volumes in a array of volumes. The tensor
 * is relative to the overal centroid of the volumes.
 * @param {module:LBVolume.Volume[]} volumes    The array of volumes.
 * @param {module:LBGeometry.Matrix3} [tensor] If defined the 3x3 matrix to receive the tensor.
 * @param {module:LBGeometry.Vector3} [totalCentroid] If defined this is set to the overall centroid
 * of all the volumes.
 * @returns {module:LBGeometry.Matrix3}    The tensor.
 */
LBVolume.Volume.overallInertiaTensor = function(volumes, tensor, totalCentroid) {
    tensor = tensor || new LBGeometry.Matrix3();
    tensor.zero();
    
    totalCentroid = totalCentroid || LBVolume.Volume._workingVector3A;
    totalCentroid.zero();
    
    var totalMass = 0;
    
    var tetraCentroid = LBVolume.Volume._workingVector3B;
    var tetraInertia = LBVolume.Volume._workingMatrix3;
    
    for (var i = 0; i < volumes.length; ++i) {
        var vol = volumes[i];
        var tetras = vol.equivalentTetras();
        for (var t = 0; t < tetras.length; ++t) {
            var tetra = tetras[t];

            // The inertia tensor is relative to the tetra's centroid.
            tetraInertia = tetra.tetraInertiaTensor(tetraInertia);

            // We'll make the tensor relative to the origin so we can sum the tensors,
            // we'll shift it back to the total centroid after (we could make it relative
            // to the total centroid now, but we don't yet know the total centroid).
            // While shifting to 
            tetraCentroid = tetra.getCentroid(tetraCentroid);
            
            var xx = tetraCentroid.x * tetraCentroid.x;
            var yy = tetraCentroid.y * tetraCentroid.y;
            var zz = tetraCentroid.z * tetraCentroid.z;
            tensor.elements[0] += tetraInertia.elements[0] + tetra.mass * (yy + zz);
            tensor.elements[4] += tetraInertia.elements[4] + tetra.mass * (xx + zz);
            tensor.elements[8] += tetraInertia.elements[8] + tetra.mass * (xx + yy);

            tensor.elements[1] += tetraInertia.elements[1] + tetra.mass * tetraCentroid.x * tetraCentroid.y;
            tensor.elements[2] += tetraInertia.elements[2] + tetra.mass * tetraCentroid.x * tetraCentroid.z;
            tensor.elements[5] += tetraInertia.elements[5] + tetra.mass * tetraCentroid.y * tetraCentroid.z;
            
            totalCentroid.x += tetraCentroid.x * tetra.mass;
            totalCentroid.y += tetraCentroid.y * tetra.mass;
            totalCentroid.z += tetraCentroid.z * tetra.mass;
            
            totalMass += tetra.mass;
        }
    }
    
    LBVolume.Volume._workingMatrix3 = tetraInertia;
    
    // The inertia tensor is now relative to the origin. If our centroid is not at the
    // origin we'll need to shift the tensor...
    totalCentroid.divideScalar(totalMass);
    if (!LBGeometry.isVectorLikeZero(totalCentroid)) {
        var xx = totalCentroid.x * totalCentroid.x;
        var yy = totalCentroid.y * totalCentroid.y;
        var zz = totalCentroid.z * totalCentroid.z;
        
        tensor.elements[0] -= totalMass * (yy + zz);
        tensor.elements[4] -= totalMass * (xx + zz);
        tensor.elements[8] -= totalMass * (xx + yy);
        
        tensor.elements[1] -= totalMass * totalCentroid.x * totalCentroid.y;
        tensor.elements[2] -= totalMass * totalCentroid.x * totalCentroid.z;
        tensor.elements[5] -= totalMass * totalCentroid.y * totalCentroid.z;
    }
    
    tensor.elements[3] = tensor.elements[1];
    tensor.elements[6] = tensor.elements[2];
    tensor.elements[7] = tensor.elements[5];
    
    return tensor;
};


/**
 * Loads an array of arbitrary volumes from properties in a data object.
 * @param {Object} data The data object.
 * @param {module:LBGeometry.Vector3[]} [vertices] If defined the array of vertices to use,
 * otherwise data should have a vertices property.
 * @param {module:LBVolume.Volume[]} [volumes] If defined, the array to store the volumes into.
 * This is NOT cleared.
 * @returns {module:LBVolume.Volume[]} The array of volumes.
 */
LBVolume.Volume.loadVolumesFromData = function(data, vertices, volumes) {
    if (!vertices) {
        vertices = LBGeometry.loadVector3ArrayFromCoordArray(data.vertices);
    }
    volumes = volumes || [];
    
    var firstIndex = volumes.length;
    
    for (var i = 0; i < data.indices.length; ++i) {
        var item = data.indices[i];
        var indices;
        var mass;
        var massDistribution;
        if (!Array.isArray(item)) {
            mass = LBUtil.isVar(item.mass) ? item.mass : Number.NaN;
            massDistribution = item.massDistribution || 1;
            indices = item.indices;
        }
        else {
            mass = Number.NaN;
            massDistribution = 1;
            indices = item;
        }
        
        var startIndex = volumes.length;
        switch (indices.length) {
            case 4 :
                var myVertices = LBVolume.Tetra._workingVertexArray;
                for (var j = 0; j < 4; ++j) {
                    myVertices[j] = vertices[indices[j]];
                }
                volumes.push(new LBVolume.Tetra(myVertices));
                break;
                
            case 5 :
                volumes.push(new LBVolume.TriBiPyramid(vertices, mass, indices));
                break;
                
            case 6 :
                volumes.push(new LBVolume.TriPrism(vertices, mass, indices));
                break;
                
            case 8 :
                volumes.push(new LBVolume.Cuboid(vertices, mass, indices));
                break;
                
            default :
                console.warn("LBVolume.Volume.loadVolumesFromData: " + indices.length + " indices not supported, data.indices[" + i + "]");
                break;
        }
        
        volumes[volumes.length - 1].massDistribution = massDistribution;
        
        if (!Number.isNaN(mass)) {
            LBVolume.Volume.allocateMassToVolumes(volumes, mass, startIndex, volumes.length);
        }
    }
    
    if (data.mirrorPlane) {
        var mirrorPlane = LBGeometry.loadPlane(data.mirrorPlane);
        if (!mirrorPlane) {
            console.warn("LBVolume.Volume.loadVolumesFromData: data.mirrorPlane could not be loaded into an LBGeometry.Plane object.");
        }
        else {
            var endIndex = volumes.length;

            for (var i = firstIndex; i < endIndex; ++i) {
                volumes.push(volumes[i].cloneMirrored(mirrorPlane));
            }
        }
    }
    
    return volumes;
};

/**
 * Loads an array of vertices representing the outline of a volume in the x-y plane
 * from properties in a data object. The data object is typically the same as that passed
 * to {@link module:LBVolume.Volume.loadVolumesFromData}.
 * @param {Object} data The data object.
 * @param {module:LBGeometry.Vector3[]} [vertices] If defined the array of vertices to use,
 * otherwise data should have a vertices property.
 * @param {Array} [outlineVertices] If defined the array to store the vertices into.
 * @returns {Array} The array of outline vertices.
 */
LBVolume.Volume.loadXYOutlineFromData = function(data, vertices, outlineVertices) {
    if (!vertices) {
        vertices = LBGeometry.loadVector3ArrayFromCoordArray(data.vertices);
    }
    outlineVertices = outlineVertices || [];
    
    if (!data.xyOutlineIndices) {
        return outlineVertices;
    }
    
    for (var i = 0; i < data.xyOutlineIndices.length; ++i) {
        var vertex = vertices[data.xyOutlineIndices[i]];
        outlineVertices.push(new LBGeometry.Vector3(vertex.x, vertex.y));
    }

    if (data.mirrorPlane) {
        var mirrorPlane = LBGeometry.loadPlane(data.mirrorPlane);
        for (var i = outlineVertices.length - 1; i >= 0; --i) {
            var mirroredVertex = LBGeometry.mirrorPointAboutPlane(mirrorPlane, outlineVertices[i]);
            if (!LBGeometry.areVectorsNearEqual(mirroredVertex, outlineVertices[i])) {
                outlineVertices.push(mirroredVertex);
            }
        }
    }
    
    return outlineVertices;
};


/**
 * Represents a tetrahedron.
 * @constructor
 * @extends module:LBVolume.Volume
 * @param {module:LBGeometry.Vector3[]} [vertices]    If defined, an array containing the
 * four vertices for the tetrahedron. References to the vertices are used, they are not copied.
 * If not defined the vertices are all set to new instances of {@link module:LBGeometry.Vector3}.
 * @param {Number} [mass=Number.NaN] If defined the mass assigned to the volume.
 * @param {Number[]} [indices]  If defined an array of the indices of the four vertices
 * in vertices of the tetra.
 * @param {Number} [massDistribution=1] Additional factor used by {@link module:LBVolume.allocateMassToVolumes}
 * to control mass distribution.
 * @returns {module:LBVolume.Tetra}
 */
LBVolume.Tetra = function(vertices, mass, indices, massDistribution) {
    LBVolume.Volume.call(this, LBVolume.Tetra.TYPE_NAME, mass, massDistribution);
    
    this._faces = LBVolume.Tetra._facesCCW;
    
    if (vertices) {
        if (indices) {
            for (var i = 0; i < 4; ++i) {
                this.vertices.push(vertices[indices[i]]);
            }
        }
        else {
            for (var i = 0; i < 4; ++i) {
                this.vertices.push(vertices[i]);
            }
        }
        
        var a = LBVolume.Tetra._workingVectorA.copy(vertices[1]).sub(vertices[0]);
        var b = LBVolume.Tetra._workingVectorB.copy(vertices[2]).sub(vertices[0]);
        var c = LBVolume.Tetra._workingVectorC.copy(vertices[3]).sub(vertices[0]);
        a.cross(b);
        if (c.dot(a) > 0) {
            this._faces = LBVolume.Tetra._facesCW;
        }
    }
    else {
        for (var i = 0; i < 4; ++i) {
            this.vertices.push(new LBGeometry.Vector3());
        }
    }
    
    this._equivalentTetrasArray = [this];
};

/**
 * The tetra type name, the value of {@link module:LBVolume.Volume#typeName} for tetras.
 * @constant
 * @type {String}
 */
LBVolume.Tetra.TYPE_NAME = "Tetra";

LBVolume.Tetra._workingVertexArray = [ null, null, null, null, null, null, null, null ];
LBVolume.Tetra._workingVectorA = new LBGeometry.Vector3();
LBVolume.Tetra._workingVectorB = new LBGeometry.Vector3();
LBVolume.Tetra._workingVectorC = new LBGeometry.Vector3();
LBVolume.Tetra._workingArrayA = [];
LBVolume.Tetra._workingArrayB = [];
LBVolume.Tetra._workingArrayC = [];
LBVolume.Tetra._workingLine3 = new LBGeometry.Line3();
LBVolume.Tetra._workingOrderedIndices = [ 0, 1, 2, 3, 4, 5, 6, 7, 8];

LBVolume.Tetra.prototype = Object.create(LBVolume.Volume.prototype);
LBVolume.Tetra.prototype.constructor = LBVolume.Tetra;

/**
 * Creates a shallow copy of the tetra.
 * @returns {module:LBVolume.Tetra}    The shallow copy.
 */
LBVolume.Tetra.prototype.clone = function() {
    return new LBVolume.Tetra(this.vertices, this.mass);
};

// @inheritdoc...
LBVolume.Tetra.prototype.getFaces = function() {
    return this._faces;
};
LBVolume.Tetra._facesCCW = [
    [0, 1, 2],
    [0, 2, 3],
    [0, 3, 1],
    [1, 3, 2]
];
LBVolume.Tetra._facesCW = [
    [0, 2, 1],
    [0, 3, 2],
    [0, 1, 3],
    [1, 2, 3]
];

/**
 * Determines if the vertices are such that vertices 0, 1, and 2 are counter-clockwise
 * about their face.
 * @returns {Boolean} true if vertices 0, 1, and 2 are counter-clockwise about their face.
 */
LBVolume.Tetra.prototype.isCCWFaces = function() {
    return this._faces === LBVolume.Tetra._facesCCW;
};

// @inheritdoc...
LBVolume.Tetra.prototype.getCentroid = function(store) {
    store = store || new LBGeometry.Vector3();

    store.copy(this.vertices[0]);
    store.add(this.vertices[1]);
    store.add(this.vertices[2]);
    store.add(this.vertices[3]);
    store.divideScalar(4);

    return store;
};

// @inheritdoc...
LBVolume.Tetra.prototype.getVolume = function() {
    // From https://en.wikipedia.org/wiki/Tetrahedron#Volume
    var a = LBVolume.Tetra._workingVectorA.copy(this.vertices[0]).sub(this.vertices[3]);
    var b = LBVolume.Tetra._workingVectorB.copy(this.vertices[1]).sub(this.vertices[3]);
    var c = LBVolume.Tetra._workingVectorC.copy(this.vertices[2]).sub(this.vertices[3]);
    b.cross(c);
    var volume = Math.abs(a.dot(b)) / 6;
    return volume;
};

// @inheritdoc...
LBVolume.Tetra.prototype.equivalentTetras = function() {
    return this._equivalentTetrasArray;
};

// @inheritdoc...
LBVolume.Tetra.prototype.cloneMirrored = function(plane) {
    var vertices = LBVolume.Tetra._workingArrayA;
    vertices.length = 0;
    vertices.push(LBGeometry.mirrorPointAboutPlane(plane, this.vertices[0]));
    vertices.push(LBGeometry.mirrorPointAboutPlane(plane, this.vertices[2]));
    vertices.push(LBGeometry.mirrorPointAboutPlane(plane, this.vertices[1]));
    vertices.push(LBGeometry.mirrorPointAboutPlane(plane, this.vertices[3]));
    return new LBVolume.Tetra(vertices, this.mass, undefined, this.massDistribution);
};

/**
 * Calculates the inertia tensor matrix for the tetrahedron using the formulas given in:
 * {@link http://thescipub.com/PDF/jmssp.2005.8.11.pdf}
 * @param {module:LBGeometry.Matrix3} [tensor] If defined the object to store the tensor into.
 * @returns {module:LBGeometry.Matrix3}    The inertia tensor.
 */
LBVolume.Tetra.prototype.tetraInertiaTensor = function(tensor) {
    tensor = tensor || new LBGeometry.Matrix3();
    tensor.zero();
    
    // Eq = [ a -b' -c'; -b' b -a'; -c' -a' c ]
    // Each polynomial term is multiplied by mu * |DET(J)|, and DET(J) = 6 * Vol,
    // so the scaling term is simply 6 * mass.
    var cent = this.getCentroid(LBVolume.Tetra._workingVectorA);
    var scale = 6 * this.mass;
    var x1 = this.vertices[0].x - cent.x, x2 = this.vertices[1].x - cent.x, x3 = this.vertices[2].x - cent.x, x4 = this.vertices[3].x - cent.x;
    var y1 = this.vertices[0].y - cent.y, y2 = this.vertices[1].y - cent.y, y3 = this.vertices[2].y - cent.y, y4 = this.vertices[3].y - cent.y;
    var z1 = this.vertices[0].z - cent.z, z2 = this.vertices[1].z - cent.z, z3 = this.vertices[2].z - cent.z, z4 = this.vertices[3].z - cent.z;
    
    var xTerm = x1*x1 + x1*x2 + x2*x2 + x1*x3 + x2*x3 + x3*x3 + x1*x4 + x2*x4 + x3*x4 + x4*x4;
    var yTerm = y1*y1 + y1*y2 + y2*y2 + y1*y3 + y2*y3 + y3*y3 + y1*y4 + y2*y4 + y3*y4 + y4*y4;
    var zTerm = z1*z1 + z1*z2 + z2*z2 + z1*z3 + z2*z3 + z3*z3 + z1*z4 + z2*z4 + z3*z4 + z4*z4;
    var a = scale * (yTerm + zTerm) / 60;
    var b = scale * (xTerm + zTerm) / 60;
    var c = scale * (xTerm + yTerm) / 60;
    
    var xSum = x1 + x2 + x3 + x4;
    var ySum = y1 + y2 + y3 + y4;
    var zSum = z1 + z2 + z3 + z4;
    var ap = scale * ((ySum + y1) * z1 + (ySum + y2) * z2 + (ySum + y3) * z3 + (ySum + y4) * z4) / 120;
    var bp = scale * ((xSum + x1) * z1 + (xSum + x2) * z2 + (xSum + x3) * z3 + (xSum + x4) * z4) / 120;
    var cp = scale * ((xSum + x1) * y1 + (xSum + x2) * y2 + (xSum + x3) * y3 + (xSum + x4) * y4) / 120;
    
    tensor.elements[0] = a;
    tensor.elements[1] = tensor.elements[3] = -bp;
    tensor.elements[2] = tensor.elements[6] = -cp;
    tensor.elements[4] = b;
    tensor.elements[5] = tensor.elements[7] = -ap;
    tensor.elements[8] = c;
    
    return tensor;
};


//
//----------
//

/**
 * Determines where a plane slices a tetra, and if it does slice the tetra this
 * generates the tetras representing the volumes on each side of the plane.
 * @param {module:LBVolume.Tetra} tetra    The tetra of interest.
 * @param {module:LBGeometry.Plane} plane  The slicing plane.
 * @param {Boolean} [positiveDir=true]    If true then tetras are generated to represent
 * the volume on the side of the plane to which the normal points.
 * @param {Boolean} [negativeDir=true]    If true then tetras are generated to represent
 * the volume on the side of the plane to which the normal does not point.
 * @returns {undefined | LBVolume.Tetra[]}  If the plane does not slice the tetra,
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
    above.length = 0;
    below.length = 0;
    onPlane.length = 0;

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
    
    if (!LBUtil.isVar(positiveDir)) {
        positiveDir = true;
    }
    if (!LBUtil.isVar(negativeDir)) {
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
            LBVolume.TriBiPyramid.toTetras(indices, myVertices, otherTetras);
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
            LBVolume.TriPrism.toTetras(indices, myVertices, otherTetras);
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
            LBVolume.TriPrism.toTetras(indices, myVertices, aboveTetras);
        }
        if (negativeDir) {
            var myVertices = [belowA, ptAA, ptAB, belowB, ptBA, ptBB];
            LBVolume.TriPrism.toTetras(indices, myVertices, belowTetras);
        }
    }
    
    return [aboveTetras, belowTetras];
};


/**
 * Loads an array of tetras from properties in a data object.
 * @param {Object} data The data object.
 * @param {module:LBGeometry.Vector3[]} [vertices] If defined the array of vertices to use,
 * otherwise data should have a vertices property.
 * @param {module:LBVolume.Tetra[]} [tetras] If defined, the array to store the tetras into.
 * This is NOT cleared.
 * @returns {module:LBVolume.Tetra[]} The array of tetras.
 */
LBVolume.Tetra.loadFromData = function(data, vertices, tetras) {
    if (!vertices) {
        vertices = LBGeometry.loadVector3ArrayFromCoordArray(data.vertices);
    }
    if (!tetras) {
        tetras = [];
    }
    
    var firstIndex = tetras.length;
    
    for (var i = 0; i < data.indices.length; ++i) {
        var item = data.indices[i];
        var indices;
        var mass;
        if (!Array.isArray(item)) {
            mass = LBUtil.isVar(item.mass) ? item.mass : Number.NaN;
            indices = item.indices;
        }
        else {
            mass = Number.NaN;
            indices = item;
        }
        
        var startIndex = tetras.length;
        switch (indices.length) {
            case 4 :
                var myVertices = LBVolume.Tetra._workingVertexArray;
                for (var j = 0; j < 4; ++j) {
                    myVertices[j] = vertices[indices[j]];
                }
                tetras.push(new LBVolume.Tetra(myVertices));
                break;
                
            case 5 :
                LBVolume.TriBiPyramid.toTetras(indices, vertices, tetras);
                break;
                
            case 6 :
                LBVolume.TriPrism.toTetras(indices, vertices, tetras);
                break;
                
            case 8 :
                LBVolume.Cuboid.toTetras(indices, vertices, tetras);
                break;
                
            default :
                console.warn("LBVolume.Tetra.loadFromData: " + indices.length + " indices not supported, data.indices[" + i + "]");
                break;
        }
        
        if (!Number.isNaN(mass)) {
            LBVolume.Volume.allocateMassToVolumes(tetras, mass, startIndex, tetras.length);
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


/**
 * A tri-bipyramid volume. A tri-bipyramid is basically two tetras that are joined
 * together at one face.
 * <p>
 * The vertices must be specified such that v[0]-v[1]-v[2]-v[3] define one tetra and
 * v[1]-v[2]-v[3]-v[4] defines the other tetra (v[1]-v[2]-v[3] defines the shared
 * face, with the vertices v[0], v[1], v[2] ordered CCW (right hand rule).
 * @constructor
 * @extends module:LBVolume.Volume
 * @param {module:LBGeometry.Vector3[]} [vertices] The array of vertices. If undefined the
 * volume is set to so each vertex is approximately 0.5 from the center, and the center
 * is at 0,0,0.
 * @param {Number} [mass=Number.NaN] If defined the mass  assigned to the volume.
 * @param {Number[]} [indices]  If defined the array of the indices of the vertices in
 * vertices identifiying the vertices, the ordering must be as described above.
 * @param {Number} [massDistribution=1] Additional factor used by {@link module:LBVolume.allocateMassToVolumes}
 * to control mass distribution.
 * @returns {module:LBVolume.TriBiPyramid}
 */
LBVolume.TriBiPyramid = function(vertices, mass, indices, massDistribution) {
    LBVolume.Volume.call(this, LBVolume.TriBiPyramid.TYPE_NAME, mass, massDistribution);
    
    this._faces = [];
    if (vertices) {
        if (!indices) {
            indices = LBVolume.TriBiPyramid._defaultIndices;
        }
        for (var i = 0; i < 5; ++i) {
            this.vertices.push(vertices[indices[i]]);
        }
    }
    else {
        this.vertices.push(new LBGeometry.Vector3(-0.5, 0, 0));
        this.vertices.push(new LBGeometry.Vector3(0, 0, 0.5));
        this.vertices.push(new LBGeometry.Vector3(0, 0.4330127, -0.25));
        this.vertices.push(new LBGeometry.Vector3(0, -0.4330127, -0.25));
        this.vertices.push(new LBGeometry.Vector3(0.5, 0, 0));
    }
};

/**
 * The triangular bipyramid type name, the value of {@link module:LBVolume.Volume#typeName} for cuboids.
 * @constant
 * @type {String}
 */
LBVolume.TriBiPyramid.TYPE_NAME = "TriBiPyramid";

LBVolume.TriBiPyramid.prototype = Object.create(LBVolume.Volume.prototype);

// @inheritdoc...
LBVolume.TriBiPyramid.prototype.clone = function() {
    return new LBVolume.TriBiPyramid(this.mass, this.vertices);
};

// @inheritdoc...
LBVolume.TriBiPyramid.prototype.getFaces = function() {
    this.equivalentTetras();
    return this._faces;
};
LBVolume.TriBiPyramid._defaultIndices = [
    0, 1, 2, 3, 4
];

// @inheritdoc...
LBVolume.TriBiPyramid.prototype.equivalentTetras = function() {
    if (!this._equivalentTetrasArray) {
        this._equivalentTetrasArray = LBVolume.TriBiPyramid.toTetras(LBVolume.TriBiPyramid._defaultIndices, 
            this.vertices, undefined, this._faces);
        if (this.mass) {
            LBVolume.Volume.allocateMassToVolumes(this._equivalentTetrasArray, this.mass);
        }
    }
    return this._equivalentTetrasArray;
};

// @inheritdoc...
LBVolume.TriBiPyramid.prototype.cloneMirrored = function(plane) {
    var vertices = LBGeometry.mirrorPointArrayAboutPlane(plane, this.vertices, LBVolume.TriBiPyramid._workingVertices);
    return new LBVolume.TriBiPyramid(vertices, this.mass, undefined, this.massDistribution);
};
LBVolume.TriBiPyramid._workingVertices = [];


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
 * @param {Number[]} vertexIndices The array of indices of the vertices in vertexArray.
 * @param {module:LBGeometry.Vector3[]} vertexArray   The array of vertices.
 * @param {module:LBVolume.Tetra[]} [tetras]  If defined the array to store the tetras into. This array is NOT cleared.
 * @param {Number[][]} [faces]  If defined an array that is set to the arrays of vertices for each outside face.
 * @returns {module:LBVolume.Tetra[]} The array of the tetrahedra.
 */
LBVolume.TriBiPyramid.toTetras = function(vertexIndices, vertexArray, tetras, faces) {
    if (!tetras) {
        tetras = [];
    }

    var vertices = LBVolume.Tetra._workingVertexArray;
    vertices[0] = vertexArray[vertexIndices[0]];
    vertices[1] = vertexArray[vertexIndices[1]];
    vertices[2] = vertexArray[vertexIndices[2]];
    vertices[3] = vertexArray[vertexIndices[3]];
    var tetraA = new LBVolume.Tetra(vertices); 
    tetras.push(tetraA);

    vertices[0] = vertexArray[vertexIndices[1]];
    vertices[1] = vertexArray[vertexIndices[2]];
    vertices[2] = vertexArray[vertexIndices[3]];
    vertices[3] = vertexArray[vertexIndices[4]];
    var tetraB = new LBVolume.Tetra(vertices);
    tetras.push(tetraB);
    
    if (faces !== undefined) {
        faces.length = 6;
        
        if (tetraA.isCCWFaces()) {
            faces[0] = [0, 1, 2];
            faces[1] = [0, 2, 3];
            faces[2] = [0, 3, 1];
        }
        else {
            faces[0] = [0, 2, 1];
            faces[1] = [0, 3, 2];
            faces[2] = [0, 1, 3];
        }
        if (tetraB.isCCWFaces()) {
            faces[3] = [4, 2, 1];
            faces[4] = [4, 3, 2];
            faces[5] = [4, 1, 3];
        }
        else {
            faces[3] = [4, 1, 2];
            faces[4] = [4, 2, 3];
            faces[5] = [4, 3, 1];
        }
    }
    
    return tetras;
};


/**
 * A triangular prism. A tri-prism is basically an extruded triangle.
 * <p>
 * The vertices must be specified such that v[0]-v[1]-v[2] defines one triangular
 * face ordered CCW (right hand rule), while v[3]-v[4]-v[5] defines the other
 * triangular face, with v[3] connected to v[0], v[4] connected to v[1], and v[5]
 * connected to v[2] (these vertices are therefore ordered CW looking into the prism).
 * @constructor
 * @extends module:LBVolume.Volume
 * @param {module:LBGeometry.Vector3[]} [vertices] The array of vertices. If undefined the
 * volume is set to so each vertex on the triangular face is 0.5 from the center of
 * that face, and each face is positioned 0.5 on each side of the origin.
 * @param {Number} [mass=Number.NaN] If defined the mass  assigned to the volume.
 * @param {Number[]} [indices]  If defined the array of the indices of the vertices in
 * vertices identifiying the vertices, the ordering must be as described above.
 * @param {Number} [massDistribution=1] Additional factor used by {@link module:LBVolume.allocateMassToVolumes}
 * to control mass distribution.
 * @returns {module:LBVolume.TriPrism}
 */
LBVolume.TriPrism = function(vertices, mass, indices, massDistribution) {
    LBVolume.Volume.call(this, LBVolume.TriPrism.TYPE_NAME, mass, massDistribution);
    
    if (vertices) {
        if (!indices) {
            indices = LBVolume.TriPrism._defaultIndices;
        }
        for (var i = 0; i < 6; ++i) {
            this.vertices.push(vertices[indices[i]]);
        }
    }
    else {
        this.vertices.push(new LBGeometry.Vector3(-0.5, 0, 0.5));
        this.vertices.push(new LBGeometry.Vector3(-0.5, 0.4330127, -0.25));
        this.vertices.push(new LBGeometry.Vector3(-0.5, -0.4330127, -0.25));
        this.vertices.push(new LBGeometry.Vector3(0.5, 0, 0.5));
        this.vertices.push(new LBGeometry.Vector3(0.5, 0.4330127, -0.25));
        this.vertices.push(new LBGeometry.Vector3(0.5, -0.4330127, -0.25));
    }
    
    this._faces = [];
};

/**
 * The triangular bipyramid type name, the value of {@link module:LBVolume.Volume#typeName} for cuboids.
 * @constant
 * @type {String}
 */
LBVolume.TriPrism.TYPE_NAME = "TriPrism";

LBVolume.TriPrism.prototype = Object.create(LBVolume.Volume.prototype);

// @inheritdoc...
LBVolume.TriPrism.prototype.clone = function() {
    return new LBVolume.TriPrism(this.mass, this.vertices);
};


// @inheritdoc...
LBVolume.TriPrism.prototype.getFaces = function() {
    this.equivalentTetras();
    return this._faces;
};
LBVolume.TriPrism._defaultIndices = [
    0, 1, 2, 3, 4, 5
];

// @inheritdoc...
LBVolume.TriPrism.prototype.equivalentTetras = function() {
    if (!this._equivalentTetrasArray) {
        this._equivalentTetrasArray = LBVolume.TriPrism.toTetras(LBVolume.TriPrism._defaultIndices, 
            this.vertices, undefined, this._faces);
        if (this.mass) {
            LBVolume.Volume.allocateMassToVolumes(this._equivalentTetrasArray, this.mass);
        }
    }
    return this._equivalentTetrasArray;
};

// @inheritdoc...
LBVolume.TriPrism.prototype.cloneMirrored = function(plane) {
    var vertices = LBGeometry.mirrorPointArrayAboutPlane(plane, this.vertices, LBVolume.TriPrism._workingVertexArray);
    return new LBVolume.TriPrism(vertices, this.mass, undefined, this.massDistribution);
};
LBVolume.TriPrism._workingVertexArray = [];



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
 * @param {Number[]} vertexIndices The array of indices of the vertices in vertexArray.
 * @param {module:LBGeometry.Vector3[]} vertexArray   The array of vertices.
 * @param {module:LBVolume.Tetra[]} [tetras]  If defined the array to store the tetras into. This array is NOT cleared.
 * @param {Number[][]} [faces]  If defined an array that is set to the arrays of vertices for each outside face.
 * @returns {module:LBVolume.Tetra[]} The array of the tetrahedra.
 */
LBVolume.TriPrism.toTetras = function(vertexIndices, vertexArray, tetras, faces) {
    if (!tetras) {
        tetras = [];
    }

    var vertices = LBVolume.Tetra._workingVertexArray;
    vertices[0] = vertexArray[vertexIndices[0]];
    vertices[1] = vertexArray[vertexIndices[1]];
    vertices[2] = vertexArray[vertexIndices[2]];
    vertices[3] = vertexArray[vertexIndices[3]];
    var tetraA = new LBVolume.Tetra(vertices);
    tetras.push(tetraA);

    vertices[0] = vertexArray[vertexIndices[3]];
    vertices[1] = vertexArray[vertexIndices[5]];
    vertices[2] = vertexArray[vertexIndices[4]];
    vertices[3] = vertexArray[vertexIndices[2]];
    var tetraB = new LBVolume.Tetra(vertices);
    tetras.push(tetraB);

    vertices[0] = vertexArray[vertexIndices[3]];
    vertices[1] = vertexArray[vertexIndices[4]];
    vertices[2] = vertexArray[vertexIndices[1]];
    vertices[3] = vertexArray[vertexIndices[2]];
    var tetraC = new LBVolume.Tetra(vertices);
    tetras.push(tetraC);
    
    if (faces !== undefined) {
        faces.length = 8;

        if (tetraA.isCCWFaces()) {
            faces[0] = [0, 1, 2];
            faces[3] = [0, 2, 3];
            faces[5] = [3, 1, 0];
        }
        else {
            faces[0] = [0, 2, 1];
            faces[3] = [0, 3, 2];
            faces[5] = [3, 0, 1];
        }
        
        if (tetraB.isCCWFaces()) {
            faces[2] = [2, 4, 5];
            faces[4] = [2, 5, 3];
            faces[7] = [3, 5, 4];
        }
        else {
            faces[2] = [2, 5, 4];
            faces[4] = [2, 3, 5];
            faces[7] = [3, 4, 5];
        }
        
        if (tetraC.isCCWFaces()) {
            faces[1] = [1, 4, 2];
            faces[6] = [1, 3, 4];
        }
        else {
            faces[1] = [1, 2, 4];
            faces[6] = [1, 4, 3];
        }
    }
    
    return tetras;
};


/**
 * A cuboid volume. A cuboid is a six sided convex polyhedron with each of the
 * sides a quadrilateral (having four edges).
 * @constructor
 * @extends module:LBVolume.Volume
 * @param {module:LBGeometry.Vector3[]} [vertices] The array of vertices. If undefined the
 * cuboid is set to a unit cube (each side is length 1) centered at 0,0,0.
 * @param {Number} [mass=Number.NaN] If defined the mass assigned to the volume.
 * @param {Number[]} [indices]  If defined the array of the indices of the vertices in
 * vertices identifiying two opposing faces of the cuboid. The first set of indices should
 * be ordered CCW (right-hand rule), while the second set of indices is such that v[4] is
 * jointed to v[0], v[5] is joined to v[1], v[6] is joined to v[2], v[7] is joined to
 * v[3].
 * @param {Number} [massDistribution=1] Additional factor used by {@link module:LBVolume.allocateMassToVolumes}
 * to control mass distribution.
 * @returns {module:LBVolume.Cuboid}
 */
LBVolume.Cuboid = function(vertices, mass, indices, massDistribution) {
    LBVolume.Volume.call(this, LBVolume.Cuboid.TYPE_NAME, mass, massDistribution);
    
    if (vertices) {
        if (!indices) {
            indices = LBVolume.Cuboid._defaultIndices;
        }
        for (var i = 0; i < 8; ++i) {
            this.vertices.push(vertices[indices[i]]);
        }
    }
    else {
        this.vertices.push(new LBGeometry.Vector3(-0.5, -0.5, -0.5));
        this.vertices.push(new LBGeometry.Vector3(0.5, -0.5, -0.5));
        this.vertices.push(new LBGeometry.Vector3(0.5, -0.5, 0.5));
        this.vertices.push(new LBGeometry.Vector3(-0.5, -0.5, 0.5));
        this.vertices.push(new LBGeometry.Vector3(-0.5, 0.5, -0.5));
        this.vertices.push(new LBGeometry.Vector3(0.5, 0.5, -0.5));
        this.vertices.push(new LBGeometry.Vector3(0.5, 0.5, 0.5));
        this.vertices.push(new LBGeometry.Vector3(-0.5, 0.5, 0.5));
    }
    
    this._faces = [];
};

/**
 * The cuboid type name, the value of {@link module:LBVolume.Volume#typeName} for cuboids.
 * @constant
 * @type {String}
 */
LBVolume.Cuboid.TYPE_NAME = "Cuboid";

LBVolume.Cuboid.prototype = Object.create(LBVolume.Volume.prototype);

// @inheritdoc...
LBVolume.Cuboid.prototype.clone = function() {
    return new LBVolume.Cuboid(this.mass, this.vertices);
};

// @inheritdoc...
LBVolume.Cuboid.prototype.getFaces = function() {
    this.equivalentTetras();
    return this._faces;
};
LBVolume.Cuboid._defaultIndices = [
    0, 1, 2, 3, 4, 5, 6, 7
];

// @inheritdoc...
LBVolume.Cuboid.prototype.equivalentTetras = function() {
    if (!this._equivalentTetrasArray) {
        this._equivalentTetrasArray = LBVolume.Cuboid.toTetras(LBVolume.Cuboid._defaultIndices, 
            this.vertices, undefined, this._faces);
        if (this.mass) {
            LBVolume.Volume.allocateMassToVolumes(this._equivalentTetrasArray, this.mass);
        }
    }
    return this._equivalentTetrasArray;
};

// @inheritdoc...
LBVolume.Cuboid.prototype.cloneMirrored = function(plane) {
    var vertices = LBGeometry.mirrorPointArrayAboutPlane(plane, this.vertices, LBVolume.Cuboid._workingVertexArray);
    return new LBVolume.Cuboid(vertices, this.mass, undefined, this.massDistribution);
};
LBVolume.Cuboid._workingVertexArray = [];


/**
 * Converts a set of 8 vertices describing a cuboid (a convex polyhedron with 6 quadrilateral faces)
 * into an array of 6 tetrahedra representing the volume.
 * <p>
 * This is currently a fairly simple algorithm, it does not check for vertices lying on each
 * other, and expects the vertices in a particular order.
 * <p>
 * The vertices should be specified such that the first 4 vertices are one face, with
 * the order in the CCW direction (right-hand rule), while the second 4 vertices are the
 * opposite face, with the opposite order so that v[4] is connected to v[0], v[5] to v[1],
 * v[6] to v[2], and v[7] to v[3].
 * @param {Number[]} vertexIndices The array of indices of the vertices in vertexArray.
 * @param {module:LBGeometry.Vector3[]} vertexArray   The array of vertices.
 * @param {module:LBVolume.Tetra[]} [tetras]  If defined the array to store the tetras into. This array is NOT cleared.
 * @param {Number[][]} [faces]  If defined an array that is set to the arrays of vertices for each outside face.
 * @returns {module:LBVolume.Tetra[]} The array of the tetrahedra.
 */
LBVolume.Cuboid.toTetras = function(vertexIndices, vertexArray, tetras, faces) {
    if (!tetras) {
        tetras = [];
    }

    var vertices = LBVolume.Tetra._workingVertexArray;

    vertices[0] = vertexArray[vertexIndices[0]];
    vertices[1] = vertexArray[vertexIndices[1]];
    vertices[2] = vertexArray[vertexIndices[2]];
    vertices[3] = vertexArray[vertexIndices[5]];
    var tetra0 = new LBVolume.Tetra(vertices);
    tetras.push(tetra0);
    
    vertices[0] = vertexArray[vertexIndices[0]];
    vertices[1] = vertexArray[vertexIndices[2]];
    vertices[2] = vertexArray[vertexIndices[3]];
    vertices[3] = vertexArray[vertexIndices[7]];
    var tetra1 = new LBVolume.Tetra(vertices);
    tetras.push(tetra1);
    
    vertices[0] = vertexArray[vertexIndices[0]];
    vertices[1] = vertexArray[vertexIndices[5]];
    vertices[2] = vertexArray[vertexIndices[2]];
    vertices[3] = vertexArray[vertexIndices[7]];
    var tetra2 = new LBVolume.Tetra(vertices);
    tetras.push(tetra2);
    
    vertices[0] = vertexArray[vertexIndices[0]];
    vertices[1] = vertexArray[vertexIndices[5]];
    vertices[2] = vertexArray[vertexIndices[7]];
    vertices[3] = vertexArray[vertexIndices[4]];
    var tetra3 = new LBVolume.Tetra(vertices);
    tetras.push(tetra3);
    
    vertices[0] = vertexArray[vertexIndices[2]];
    vertices[1] = vertexArray[vertexIndices[5]];
    vertices[2] = vertexArray[vertexIndices[6]];
    vertices[3] = vertexArray[vertexIndices[7]];
    var tetra4 = new LBVolume.Tetra(vertices);
    tetras.push(tetra4);
    
    if (faces !== undefined) {
        faces.length = 12;

        if (tetra0.isCCWFaces()) {
            faces[0] = [0, 1, 2];
            faces[2] = [1, 5, 2];
            faces[8] = [0, 5, 1];
        }
        else {
            faces[0] = [0, 2, 1];
            faces[2] = [1, 2, 5];
            faces[8] = [0, 1, 5];
        }
        
        if (tetra1.isCCWFaces()) {
            faces[1] = [0, 2, 3];
            faces[4] = [3, 2, 7];
            faces[6] = [0, 3, 7];
        }
        else {
            faces[1] = [0, 3, 2];
            faces[4] = [3, 7, 2];
            faces[6] = [0, 7, 3];
        }
        
        // Tetra2 is the interior tetra...
        
        if (tetra3.isCCWFaces()) {
            faces[7] = [4, 0, 7];
            faces[9] = [0, 4, 5];
            faces[11] = [4, 7, 5];
        }
        else {
            faces[7] = [4, 7, 0];
            faces[9] = [0, 5, 4];
            faces[11] = [4, 5, 7];            
        }
        
        if (tetra4.isCCWFaces()) {
            faces[3] = [2, 5, 6];
            faces[5] = [2, 6, 7];
            faces[10] = [5, 7, 6];
        }
        else {
            faces[3] = [2, 6, 5];
            faces[5] = [2, 7, 6];
            faces[10] = [5, 6, 7];
        }
    }

    return tetras;
};

/**
 * Helper that creates a box.
 * @param {Number} dx   The x dimension of the box.
 * @param {Number} dy   The y dimension of the box.
 * @param {Number} dz   The z dimension of the box.
 * @param {Number} cx   The x dimension of the center of the box.
 * @param {Number} cy   The y dimension of the center of the box.
 * @param {Number} cz   The z dimension of the center of the box.
 * @param {Number} [mass]   The optional mass for the box.
 * @returns {module:LBVolume.Cuboid}
 */
LBVolume.createBox = function(dx, dy, dz, cx, cy, cz, mass) {
    var box = new LBVolume.Cuboid();
    var xl = cx - dx / 2;
    var xu = xl + dx;
    var yl = cy - dy / 2;
    var yu = yl + dy;
    var zl = cz - dz / 2;
    var zu = zl + dz;
    box.vertices[0].set(xl, yl, zl);
    box.vertices[1].set(xu, yl, zl);
    box.vertices[2].set(xu, yu, zl);
    box.vertices[3].set(xl, yu, zl);
    box.vertices[4].set(xl, yl, zu);
    box.vertices[5].set(xu, yl, zu);
    box.vertices[6].set(xu, yu, zu);
    box.vertices[7].set(xl, yu, zu);
    return box;
};

/**
 * Loads a box volume from properties in a data object.
 * @param {Object} data The data object. This should contain the following properties:
 * <li>[center]: {"x":x, "y":y, "z":z}    The center of the box, if missing 0,0,0 will be used.
 * <li>size: {"x":x, "y":y, "z":z}  The dimensions of the box.
 * <li>[rotation]: See {@link module:LBGeometry.loadEuler} If specified, the rotation to apply to the
 * box.
 * @param {Number} [mass=undefined] The mass of the box.
 * @returns {module:LBVolume.Cuboid}
 */
LBVolume.loadBoxFromData = function(data, mass) {
    var center = LBGeometry.loadVector3(data.center);
    var size = LBGeometry.loadVector3(data.size);
    
    var box = LBVolume.createBox(size.x, size.y, size.z, center.x, center.y, center.z);
    box.mass = mass;
    box.loadRotation(data);
    return box;
};

/**
 * Loads a cylindrical volume from properties in a data object. For now it simply
 * loads it as a {@link module:LBVolume.Cuboid}.
 * @param {Object} data The data object. This should contain the following properties:
 * <li>base: {"x":x, "y":y, "z":z}  The base of the cylinder, it will be extruded in the
 * +z direction.
 * <li>size: {"x":dx, "y": dy, "z": length} The dimensions of the cylinder. dx is the diameter
 * along the x-axis, dy is the diameter along the y-axis, length is the length of the cylinder,
 * which is along the +z axis.
 * <li>[pos]: See {@link module:LBGeometry.loadVector3}
 * <li>[rotation]: See {@link module:LBGeometry.loadEuler} If specified, the rotation to apply to the
 * vertices.
 * @param {Number} [mass=undefined] The mass of the cylinder.
 * @returns {module:LBVolume.Cuboid|undefined}
 */
LBVolume.loadCylinderFromData = function(data, mass) {
    if (!data.size) {
        console.log("LBVolume.createCylinderFromData(): data.size missing!");
        return undefined;
    }
    
    // For now just generate a cuboid...
    var base = LBGeometry.loadVector3(data.base);
    var size = LBGeometry.loadVector3(data.size);
    var rx = size.x / 2;
    var ry = size.y / 2;
    var z = size.z;
    
    var vertices = [
        new LBGeometry.Vector3(base.x - rx, base.y - ry, 0),
        new LBGeometry.Vector3(base.x - rx, base.y + ry, 0),
        new LBGeometry.Vector3(base.x + rx, base.y + ry, 0),
        new LBGeometry.Vector3(base.x + rx, base.y - ry, 0),
        new LBGeometry.Vector3(base.x - rx, base.y - ry, z),
        new LBGeometry.Vector3(base.x - rx, base.y + ry, z),
        new LBGeometry.Vector3(base.x + rx, base.y + ry, z),
        new LBGeometry.Vector3(base.x + rx, base.y - ry, z)
    ];
    
    var volume = new LBVolume.Cuboid(vertices, mass);
    volume.loadRotation(data);
    return volume;
};


/**
 * Loads a standard volume from properties in a data file.
 * @param {Object} data The data object. This must contain at the absolute mininum
 * a type property, which indicates the standard volume type.
 * @param {Number} [mass=undefined] The mass of the cylinder.
 * @returns {undefined|LBVolume.Volume}
 */
LBVolume.loadStandardVolumeFromData = function(data, mass) {
    if (!data.type) {
        console.log("LBVolume.loadStandardVolumeFromData(): data.type missing!");
        return undefined;
    }
    
    switch (data.type) {
        case 'box' :
            return LBVolume.loadBoxFromData(data, mass);
            
        case 'cylinder' :
            return LBVolume.loadCylinderFromData(data, mass);
            
        default :
            console.log("LBVolume.loadStandardVolumeFromData(): data.type === " + data.type + " is not supported!");
            return undefined;
    }
};

return LBVolume;
});
