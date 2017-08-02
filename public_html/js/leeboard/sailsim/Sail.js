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


/* global LBSailSim, LBFoils, LBControls, LBGeometry, LBMath, LBPhysics, LBUtil, LBCurve */

/**
 * Implementation of {@link LBFoils.Foil} for sails, will support reefing and flatness factors.
 * @constructor
 * @param {LBSailSim.SailInstance} sailInstance The sail instance that owns this.
 * @returns {LBSailSim.SailFoil}
 */
LBSailSim.SailFoil = function(sailInstance) {
    LBFoils.Foil.call(this);
    this.sailInstance = sailInstance;
};

LBSailSim.SailFoil.prototype = Object.create(LBFoils.Foil.prototype);
LBSailSim.SailFoil.prototype.constructor = LBSailSim.SailFoil;

/**
 * @todo Implement the reefing and flatness factors...
 * @param {Number} rho  The fluid density.
 * @param {object} qInfLocal    The free stream velocity in the local x-y plane.
 * @param {object} [details]  If defined, an object to receive details about the calculation.
 * @param {object} [store]  If defined, the object to receive the forces and moment.
 * @returns {object}    The object containing the forces and moment.
 */
LBSailSim.SailFoil.prototype.calcLocalLiftDragMoment = function(rho, qInfLocal, store, details) {
    var result = LBFoils.Foil.prototype.calcLocalLiftDragMoment.call(rho, qInfLocal, store, details);
    
    // TODO: Apply the reefing factor, flatness factor.
    
    // The Cl/Cd curve will be from the books...
    // Need a luffing state.
    
    return result;
};

/**
 * Call when done with the object to have it release any internal references
 * to other objects to help with garbage collection.
 * @returns {undefined}
 */
LBSailSim.SailFoil.prototype.destroy = function() {
    this.sailInstance = null;
    LBFoils.Foil.prototype.destroy.call(this);
};


/**
 * Represents a single slice through a sail for {@link LBSailSim.SailSurface}.
 * @constructor
 * @param {Number} slicePos The local position of the slice along the reference leading edge of the sail.
 * @param {Number} surfaceLength  The length of the slice.
 * @param {Number} [pointCount=5] The number of points in the slice.
 * @returns {LBSailSim.SailSlice}
 */
LBSailSim.SailSlice = function(slicePos, surfaceLength, pointCount) {
    
    /**
     * The local position of the slice along the reference leading edge of the sail.
     * @readonly
     * @member {Number}
     */
    this.slicePos = slicePos;
    
    /**
     * The surface length of the slice.
     * @readonly
     * @member {Number}
     */
    this.surfaceLength = surfaceLength;
    
    pointCount = pointCount || 5;
    if (pointCount < 2) {
        pointCount = 2;
    }
    
    /**
     * The array of 3D points on the slice. The first point is at the reference leading edge.
     * @member {LBGeometry.Vector3[]}
     */
    this.points = [];
    for (var i = 0; i < pointCount; ++i) {
        this.points.push(new LBGeometry.Vector3());
    }
};

LBSailSim.SailSlice.prototype = {
    /**
     * Call when done with the object to have it release any internal references
     * to other objects to help with garbage collection.
     * @returns {undefined}
     */
    destroy: function() {
        if (this.points) {
            this.points.length = 0;
            this.points = null;
        }
    },
    
    constructor: LBSailSim.SailSlice
};

/**
 * Helper that creates and loads an {@link LBSailSim.SailSlice} from properties in a data object.
 * @param {Number}  slicePosRange   The full range length of the slice positions, used for
 * computing the actual position when given a slice position as a fraction.
 * @param {Object} data The data object.
 * @returns {LBSailSim.SailSlice}   The loaded sail slice.
 */
LBSailSim.SailSlice.createFromData = function(slicePosRange, data) {
    var slicePos;
    if (data.slicePosFraction) {
        slicePos = data.slicePosFraction * slicePosRange;
    }
    else {
        slicePos = data.slicePos;
    }
    
    var surfaceLength = data.surfaceLength;
    if (!surfaceLength) {
        console.warn("LBSailSim.SailSlice.createFromData: data.surfaceLength is required!");
        return undefined;
    }
    if (surfaceLength < 0) {
        console.warn("LBSailSim.SailSlice.createFromData: data.surfaceLength must be >= 0!");
        return undefined;
    }
    
    return new LBSailSim.SailSlice(slicePos, surfaceLength, data.pointCount);
};


/**
 * Represents the surface of the sail, primarily for visualization purposes.
 * @constructor
 * @returns {LBSailSim.SailSurface}
 */
LBSailSim.SailSurface = function() {    
    /**
     * The slices representing the surface.
     * @member {LBSailSim.SailSlice[]}
     */
    this.slices = [];
};

LBSailSim.SailSurface.prototype = {    
    /**
     * Call when done with the object to have it release any internal references
     * to other objects to help with garbage collection.
     * @returns {undefined}
     */
    destroy: function() {
        if (this.slices) {
            this.slices.forEach(function(slice) {
                slice.destroy();
            });
            this.slices.length = 0;
            this.slices = null;
        }
    },
    
    constructor: LBSailSim.SailSurface
};


/**
 * The {@link LBSailSim.FoilInstance} implementation for sails.
 * @constructor
 * @extends LBSailSim.FoilInstance
 * @returns {LBSailSim.SailInstance}
 */
LBSailSim.SailInstance = function() {
    var foil = new LBSailSim.SailFoil(this);
    LBSailSim.FoilInstance.call(this, foil);
    
    /**
     * The flatness factor, 0 is most flat, 1 is least flat.
     * @member {Number}
     */
    this.flatnessFactor = 0.5;
    
    /**
     * The twist factor, 0 is least twist, 1 is most twist.
     * @member {Number}
     */
    this.twistFactor = 0.5;
    
    /**
     * The reefing factor, 0 is most reefed, 1 is not reefed.
     * @member {Number}
     */
    this.reefFactor = 1;
    
    /**
     * ??? Forgot what vreef stands for!
     */
    this.vreef = 1;
    
    /**
     * The anchor point of the sheet on the sail in local coordinates.
     * @member {LBGeometry.Vector3}
     */
    this.sheetAnchorSail = new LBGeometry.Vector3();
    
    /**
     * The anchor point of the sheet on the boat, in sail local coordinates.
     * TODO Need a little clarification here, how is this really used?!?
     * @member {LBGeometry.Vector3}
     */
    this.sheetAnchorBoat = new LBGeometry.Vector3();
    
    /**
     * The length of the sheet.
     * @member {Number}
     */
    this.sheetLength = 0;
    
    /**
     * The minimum sheet length.
     * @member {Number}
     */
    this.minSheetLength = 0;
    
    /**
     * The maximum sheet length.
     * @member {Number}
     */
    this.maxSheetLength = 1;
    
    /**
     * The minimum sail twist in degrees.
     * @member {Number}
     */
    this.minTwistDeg = 5;
    
    /**
     * The maximum sail twist in degrees.
     * @member {Number}
     */
    this.maxTwistDeg = 30;
    
    /**
     * The minimum camber as a fraction of the chord length.
     * @member {Number}
     */
    this.minCamberFraction = 1/20;
    
    /**
     * The maximum camber as a fraction of the chord length.
     * @member {Number}
     */
    this.maxCamberFraction = 1/7;
    
    /**
     * The spars associated with this sail.
     * @member {LBPhysics.RigidBody[]}
     */
    this.spars = [];
    
    /**
     * The minimum rotation angle of the sail in degrees, set by {@link LBSailSim.SailInstance#_updateRotationLimits}.
     * @readonly
     * @member {Number}
     */
    this.minRotationDeg = 0;
    
    /**
     * The maximum rotation angle of the sail in degrees, set by {@link LBSailSim.SailInstance#_updateRotationLimits}.
     * @readonly
     * @member {Number}
     */
    this.maxRotationDeg = 0;
    
    /**
     * The surface representation of the sail.
     * @member {LBSailSim.SailSurface}
     */
    this.sailSurface = new LBSailSim.SailSurface();
    
    /**
     * The implementation of {@link LBSailSim.SailShaper} used to shape the sail surface
     * {@link LBSailSim.SailInstance#sailSurface}.
     * @member {LBSailSim.SailShaper}
     */
    this.sailShaper = undefined;
};


LBSailSim.SailInstance.prototype = Object.create(LBSailSim.FoilInstance.prototype);
LBSailSim.SailInstance.prototype.constructor = LBSailSim.SailInstance;

/**
 * Call when done with the object to have it release any internal references
 * to other objects to help with garbage collection.
 * @returns {undefined}
 */
LBSailSim.SailInstance.prototype.destroy = function() {
    if (this.spars) {
        this.spars.length = 0;
        this.spars = null;
        this.sparName = null;

        this.sheetAnchorBoat = null;
        this.sheetAnchorSail = null;
        
        if (this.sailShaper) {
            this.sailShaper = this.sailShaper.destroy();
        }
        this.sailSurface = this.sailSurface.destroy();
        
        LBSailSim.FoilInstance.prototype.destroy.call(this);
    }
};

/**
 * Returns the total twist of the sail between the head and foot, in degrees.
 * @returns {Number}    The twist in degrees
 */
LBSailSim.SailInstance.prototype.getTwistDeg = function() {
    return this.twistFactor * (this.maxTwistDeg - this.minTwistDeg) + this.minTwistDeg;
};

/**
 * Returns the current maximum camber of the sail as a fraction of the chord.
 * @returns {Number}    The camber as a fraction of the chord.
 */
LBSailSim.SailInstance.prototype.getCamberFraction = function() {
    return this.flatnessFactor * (this.maxCamberFraction - this.minCamberFraction) + this.minCamberFraction;
};

/**
 * Returns the current position of the maximum camber of the sail as a fraction of the
 * chord from the leading edge.
 * @returns {Number}    The maximum camber position as a fraction of the chord.
 */
LBSailSim.SailInstance.prototype.getCamberPosFraction = function() {
    return 0.45;
};

// @inheritdoc...
LBSailSim.SailInstance.prototype.updateFoilForce = function(dt, flow) {
    LBSailSim.FoilInstance.prototype.updateFoilForce.call(this, dt, flow);

    // Here we're integrating the force on the sail around the local z-axis and origin to
    // figure out the position of the sail.
    var currentDeg = this.obj3D.rotation.z * LBMath.RAD_TO_DEG;
    this.integrateForceForRotation(LBGeometry.ORIGIN, LBGeometry.Z_AXIS, currentDeg, function(deg) {
        deg += this.rotationOffsetDegs[2];
        var deg2 = LBMath.clamp(deg, this.minRotationDeg, this.maxRotationDeg);
        return deg2 - this.rotationOffsetDegs[2];
    });
    
    // Match the locations of any spars to the sail location.
    this.spars.forEach(function(spar) {
        spar.setPositionAndQuaternion(this.obj3D.position, this.obj3D.quaternion);
    }, this);
    
    if (this.sailShaper) {
        this.sailShaper.updateSailSurface(this, this.sailSurface);
    }
    
    return this;
};

/**
 * This handles calculating the rotation limits {@link LBSailSim.SailInstance#minRotationDeg}
 * and {@link LBSailSim.SailInstance#maxRotationDeg} based on the current sheet length.
 * @protected
 * @returns {undefined}
 */
LBSailSim.SailInstance.prototype._updateRotationLimits = function() {
    // TODO: Handle multiple sheets (i.e. jib sheeets and spinnakers...)
    
    var a = this.sheetAnchorSail.length();
    var b = this.sheetAnchorBoat.length();
    var c = this.sheetLength;
    
    if (c < (a + b)) {
        this.maxRotationDeg = LBMath.radFromThreeSides(a, b, c) * LBMath.RAD_TO_DEG;
    }
    else {
        this.maxRotationDeg = 180;
    }
    this.minRotationDeg = -this.maxRotationDeg;

    var deg = this.obj3D.rotation.z * LBMath.RAD_TO_DEG + this.rotationOffsetDegs[2];
    var deg2 = LBMath.clamp(deg, this.minRotationDeg, this.maxRotationDeg);
    if (deg !== deg2) {
        deg2 -= this.rotationOffsetDegs[2];
        var rad = (deg2 - deg) * LBMath.DEG_TO_RAD;
        this.obj3D.rotateOnAxis(LBGeometry.Z_AXIS, rad);
    }
};

// @inheritdoc...
LBSailSim.SailInstance.prototype.load = function(data, sailEnv) {
    LBSailSim.FoilInstance.prototype.load.call(this, data, sailEnv);
    
    this.sparName = data.sparName;

    if (!data.sheetSailAnchor) {
        // If the sheet anchor on the sail was not specified, make it the mid-point
        // of the chord, which we'll presume is the boom.
        var chord = this.foil.chordLine;
        this.sheetAnchorSail.copy(chord.start);
        this.sheetAnchorSail.add(chord.end).multiplyScalar(0.5);
    }
    else {
        LBGeometry.loadVector3(data.sheetSailAnchor, this.sheetAnchorSail);
    }
    if (!data.sheetBoatAnchor) {
        // If the sheet anchor on the boat was not specified, make it the same as
        // the sheet anchor on the sail at the current orientation.
        this.sheetAnchorBoat.copy(this.sheetAnchorSail);
    }
    else {
        LBGeometry.loadVector3(data.sheetBoatAnchor, this.sheetAnchorBoat);
    }
    
    this.minSheetLength = data.minSheetLength || 0;
    this.maxSheetLength = data.maxSheetLength || 1;
    
    if ((data.minTwistDeg !== undefined) && (data.minTwistDeg >= 0)) {
        this.minTwistDeg = data.minTwistDeg;
    }
    if ((data.maxTwistDeg !== undefined) && (data.maxTwistDeg >= 0)) {
        this.maxTwistDeg = data.maxTwistDeg;
    }
    if (this.minTwistDeg > this.maxTwistDeg) {
        var tmp = this.minTwistDeg;
        this.minTwistDeg = this.maxTwistDeg;
        this.maxTwistDeg = tmp;
    }
    
    if ((data.minChordFraction !== undefined) && (data.minChordFraction >= 0)) {
        this.minChordFraction = data.minChordFraction;
    }
    if ((data.maxChordFraction !== undefined) && (data.maxChordFraction >= 0)) {
        this.maxChordFraction = data.maxChordFraction;
    }
    if (this.minChordFraction > this.maxChordFraction) {
        var tmp = this.minChordFraction;
        this.minChordFraction = this.maxChordFraction;
        this.maxChordFraction = tmp;
    }
    
    this._updateRotationLimits();
    
    if (data.sailShaper) {
        this._loadSailShaper(data.sailShaper);
    }
    return this;
};

LBSailSim.SailInstance.prototype._loadSailShaper = function(data) {
    var shaper = LBUtil.newClassInstanceFromData(data);
    if (!shaper) {
        return;
    }
    
    shaper.load(this, data);
    
    this.sailShaper = shaper;
};

// @inheritdoc
LBSailSim.SailInstance.prototype.vesselLoaded = function(vessel) {
    LBSailSim.FoilInstance.prototype.vesselLoaded.call(this, vessel);
    
    if (this.sparName) {
        LBPhysics.RigidBody.getRigidBodiesWithName(vessel.spars, this.sparName, this.spars);
    }
    return this;
};

/**
 * Sets the sheet length.
 * @param {Number} length   The sheet length.
 * @returns {LBSailSim.SailInstance} this.
 */
LBSailSim.SailInstance.prototype.setSheetLength = function(length) {
    this.sheetLength = LBMath.clamp(length, this.minSheetLength, this.maxSheetLength);
    this._updateRotationLimits();
    return this;
};

/**
 * Sets the sheet length based on a ratio between the minimum and maximum sheet lengths.
 * @param {Number} ratio    The sheet length ratio, 0 is the minimun sheet length,
 * 1 is the maximum sheet length.
 * @returns {LBSailSim.SailInstance}  this.
 */
LBSailSim.SailInstance.prototype.setSheetLengthRatio = function(ratio) {
    var length = this.minSheetLength + ratio * (this.maxSheetLength - this.minSheetLength);
    return this.setSheetLength(length);
};


/**
 * Basic sail controller, sets the sheet length.
 * @constructor
 * @param {LBSailSim.Vessel} vessel The vessel which this helps control.
 * @returns {LBSailSim.SailController}
 */
LBSailSim.SailController = function(vessel) {
    LBControls.SmoothController.call(this);

    /**
     * The vessel to which this belongs.
     * @member {LBSailSim.Vessel}
     */
    this.vessel = vessel;
    
    /**
     * The name of the sails which are controlled by this.
     * @member {String}
     */
    this.sailName = 'sail';
    
    /**
     * The array of sails controlled by this.
     * @member {Array}
     */
    this.sails = [];
    
};


LBSailSim.SailController.prototype = Object.create(LBControls.SmoothController.prototype);
LBSailSim.SailController.prototype.constructor = LBSailSim.SailController;

/**
 * Loads the controller from the properties in a data object.
 * @param {object} data The data object.
 * @param {LBSailSim.Vessel} vessel The vessel to which this belongs.
 * @returns {LBSailSim.SailController}  this.
 */
LBSailSim.SailController.prototype.load = function(data, vessel) {
    this.controllee = function(value) {
        this.setSheetLength(value);
    };
    
    this.vessel = vessel;
    LBControls.SmoothController.prototype.load.call(this, data, vessel);
    this.sailName = data.sailName || 'sail';
    this._loadSails();
    this.setSheetLength(this.currentValue);
    return this;
};

/**
 * Gathers up the sails controlled by this controller.
 * @returns {undefined}
 */
LBSailSim.SailController.prototype._loadSails = function() {
    if (!this.vessel) {
        return;
    }
    
    LBPhysics.RigidBody.getRigidBodiesWithName(this.vessel.airfoils, this.sailName, this.sails);
};

/**
 * Changes the sheet length for all the sails.
 * @param {Number} value    The sheet length.
 * @returns {undefined}
 */
LBSailSim.SailController.prototype.setSheetLength = function(value) {
    var ratio = (value - this.minValue)  / (this.maxValue - this.minValue);
    for (var i = 0; i < this.sails.length; ++i) {
        this.sails[i].setSheetLengthRatio(ratio);
    }
};

/**
 * Call when done with the object to have it release any internal references
 * to other objects to help with garbage collection.
 * @returns {undefined}
 */
LBSailSim.SailController.prototype.destroy = function() {
    if (this.sails) {
        this.sails.length = 0;
        this.sails = null;
        this.controllee = null;
        this.sailName = null;
        this.vessel = null;
        
        LBControls.SmoothController.prototype.destroy.call(this);
    }
};


/**
 * Helper object for calculating points along the cambered sail surface.
 * @constructor
 * @returns {LBSailSim.SailCamberCurve}
 */
LBSailSim.SailCamberCurve = function() {
    /**
     * The maximum camber as a fraction of the chord length.
     * @member {Number}
     */
    this.camberFraction = 0;
    
    /**
     * The position of the maximum camber from the leading edge as a fraction of the
     * chord length.
     * @member {Number}
     */
    this.camberPosFraction = 0;
    
    /**
     * The curve used to compute the actual points.
     * @member {LBCurve.QuadraticBezier2}
     */
    this.curve = new LBCurve.QuadraticBezier2();
    
    this.setCamber(0.1, 0.45);
};

LBSailSim.SailCamberCurve.prototype = {
    /**
     * Sets up the curve for a given camber.
     * @param {Number} camberFraction   The maximum camber as a fraction of the chord length.
     * @param {Number} camberPosFraction    The position of the maximum camber from the leading
     * edge as a fraction of the chord length.
     * @returns {LBSailSim.SailCamberCurve} this.
     */
    setCamber: function(camberFraction, camberPosFraction) {
        if ((this.camberFraction !== camberFraction) || (this.camberPosFraction !== camberPosFraction)) {
            this.camberFraction = camberFraction;
            this.camberPosFraction = camberPosFraction;
            
            // We presume a chord length of 1 to keep things simple...
            var p1x = 2 * (camberPosFraction - 0.5) + 0.5;
            var p1y = 2 * camberFraction;
            this.curve.setControlPoints(LBGeometry.ORIGIN, new LBGeometry.Vector2(p1x, p1y), LBGeometry.X_AXIS);
        }
        return this;
    },
    
    /**
     * Calculates a point along the surface of the cambered curve.
     * @param {Number} surfacePos   The position along the surface to be computed,
     * as a fraction of the total surface length, should be &ge; 0 and &le; 1.
     * @param {LBGeometry.Vector2} [store]  If defined the object to store the result in. 
     * @param {Number} [surfaceLength=1]    If defined the length of the surface of the curve.
     * @returns {LBGeometry.Vector2}    The point at the desired position.
     */
    calcXY: function(surfacePos, store, surfaceLength) {
        store = this.curve.calcPoint(surfacePos, store);        
        surfaceLength = LBUtil.isVar(surfaceLength) ? surfaceLength : 1;
        
        var curveSurfaceLength = this.curve.getCurveLength();
        if (!LBMath.isLikeZero(curveSurfaceLength)) {
            store.multiplyScalar(surfaceLength / curveSurfaceLength);
        }
        
        return store;
    },
    
    constructor: LBSailSim.SailCamberCurve
};


/**
 * Base class for the objects that compute the shape of a sail.
 * @returns {LBSailSim.SailShaper}
 */
LBSailSim.SailShaper = function() {
    /**
     * The curve object that can be used to compute points along a camber curve.
     * @member {LBSailSim.CamberCurve}
     */
    this.camberCurve = new LBSailSim.SailCamberCurve();
};

LBSailSim.SailShaper.prototype = {
    /**
     * Loads the sail shaper from properties of a data object.
     * @param {LBSailSim.SailInstance}  sailInstance    The sail instance calling this.
     * @param {Object} data The data object.
     * @returns {LBSailSim.SailShaper}  this.
     */
    load: function(sailInstance, data) {
        return this;
    },
    
    /**
     * Called by {@link LBSailSim.SailInstance#updateFoilForce} to have the sail surface
     * updated.
     * @param {LBSailSim.SailInstance} sailInstance The sail instance this is for.
     * @param {LBSailSim.SailSurface} surface   The surface to be updated.
     * @returns {undefined}
     */
    updateSailSurface: function(sailInstance, surface) {
        throw "updateSailSurface not implemented by this!";
    },
    
    /**
     * Call when done with the object to have it release any internal references
     * to other objects to help with garbage collection.
     * @returns {undefined}
     */
    dispose: function() {
        if (this.camberCurve) {
            this.camberCurve = null;            
        }
    },
    
    constructor: LBSailSim.SailShaper
};

/**
 * Sail shaper for triangular sails.
 * @constructor
 * @extends LBSailSim.SailShaper
 * @returns {LBSailSim.TriangleSailShaper}
 */
LBSailSim.TriangleSailShaper = function() {
    LBSailSim.SailShaper.call(this);
    
    /**
     * The length of the luff of the sail.
     * @member {Number}
     */
    this.luffLength = undefined;
    
    /**
     * The length of the foot of the sail.
     * @member {Number}
     */
    this.footLength = undefined;
    
    /**
     * The length of the head of the sail.
     * @member {Number}
     */
    this.headLength = undefined;
};

LBSailSim.TriangleSailShaper._workingVector2 = new LBGeometry.Vector2();
LBSailSim.TriangleSailShaper.prototype = Object.create(LBSailSim.SailShaper.prototype);
LBSailSim.TriangleSailShaper.prototype.constructor = LBSailSim.TriangleSailShaper;

LBSailSim.TriangleSailShaper.prototype.load = function(sailInstance, data) {
    this.luffLength = data.luffLength;
    this.footLength = data.footLength;
    this.headLength = data.headLength;
    
    var surface = sailInstance.sailSurface;
    surface.slices.length = 0;
    
    if (this.footLength) {
        surface.slices.push(new LBSailSim.SailSlice(0, this.footLength, 2));
    }
    if (data.slices) {
        for (var i = 0; i < data.slices.length; ++i) {
            var slice = LBSailSim.SailSlice.createFromData(this.luffLength, data.slices[i]);
            if (slice) {
                surface.slices.push(slice);
            }
        }
    }
    surface.slices.push(new LBSailSim.SailSlice(this.luffLength, this.headLength, 2));
};

LBSailSim.TriangleSailShaper.prototype.updateSailSurface = function(sailInstance, surface) {
    var totalTwistDeg = sailInstance.getTwistDeg();
    var totalTwistRad = totalTwistDeg * LBMath.DEG_TO_RAD;
    
    var camberFraction = sailInstance.getCamberFraction();
    var camberPosFraction = sailInstance.getCamberPosFraction();
    
    if (sailInstance.foilDetails.angleDeg < 0) {
        camberFraction = -camberFraction;
    }
    else {
        totalTwistRad = -totalTwistRad;
    }
    
    this.camberCurve.setCamber(camberFraction, camberPosFraction);
    var camberPos = LBSailSim.TriangleSailShaper._workingVector2;
    
    for (var i = 0; i < surface.slices.length; ++i) {
        var slice = surface.slices[i];
        // First point is the leading edge which is currently always at x = y = 0.
        slice.points[0].set(0, 0, slice.slicePos);
        
        var twistRad = slice.slicePos / this.luffLength * totalTwistRad;
        var cosTwist = Math.cos(twistRad);
        var sinTwist = Math.sin(twistRad);
        var scale = 1 / (slice.points.length - 1);
        
        for (var p = 1; p < slice.points.length; ++p) {
            this.camberCurve.calcXY(p * scale, camberPos, slice.surfaceLength);
            
            var x = cosTwist * camberPos.x + sinTwist * camberPos.y;
            var y = -sinTwist * camberPos.x + cosTwist * camberPos.y;
            slice.points[p].set(x, y, slice.slicePos);
        }
    }
};
