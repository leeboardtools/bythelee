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


/* global LBSailSim, LBFoils, LBControls, LBGeometry, LBMath */

/**
 * Implementation of {@link LBFoils.Foil} for sails, supports reefing and flatness factors.
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
 * @inheritdoc
 */
LBSailSim.SailFoil.prototype.calcLocalLiftDragMoment = function(rho, qInfLocal, store, details) {
    var result = LBFoils.Foil.prototype.calcLocalLiftDragMoment.call(rho, qInfLocal, store, details);
    
    // TODO: Apply the reefing factor, flatness factor.
    
    // The Cl/Cd curve will be from the books...
    // Need a luffing state.
    
    return result;
};


/**
 * The {@link LBSailSim.FoilInstance} implementation for sails.
 * @constructor
 * @returns {LBSailSim.SailInstance}
 */
LBSailSim.SailInstance = function() {
    var foil = new LBSailSim.SailFoil(this);
    LBSailSim.FoilInstance.call(this, foil);
    
    this.flatness = 1;
    this.twist = 1;
    this.reef = 1;
    this.vreef = 1;
    
    this.sheetAnchorSail = new LBGeometry.Vector3();
    this.sheetAnchorBoat = new LBGeometry.Vector3();
    
    this.sheetLength = 0;
    this.minSheetLength = 0;
    this.maxSheetLength = 1;
};


LBSailSim.SailInstance.prototype = Object.create(LBSailSim.FoilInstance.prototype);
LBSailSim.SailInstance.prototype.constructor = LBSailSim.SailInstance;

/**
 * @inheritdoc
 */
LBSailSim.SailInstance.prototype.updateFoilForce = function(dt, flow) {
    LBSailSim.FoilInstance.prototype.updateFoilForce.call(this, dt, flow);

    var currentDeg = this.obj3D.rotation.z * LBMath.RAD_TO_DEG;
    this.integrateForceForRotation(LBGeometry.ORIGIN, LBGeometry.Z_AXIS, currentDeg, function(deg) {
        deg += this.rotationOffsetDegs[2];
        var deg2 = LBMath.clamp(deg, this.minRotationDeg, this.maxRotationDeg);
        return deg2 - this.rotationOffsetDegs[2];
    });
    
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
        this.obj3D.rotateOnAxis(LBGeometry.Z_AXIS, (deg2 - deg) * LBMath.DEG_TO_RAD);
    }
};

/**
 * @inheritdoc
 */
LBSailSim.SailInstance.prototype.load = function(data, sailEnv) {
    LBSailSim.FoilInstance.prototype.load.call(this, data, sailEnv);
    
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
    
    this._updateRotationLimits();
    return this;
};

/**
 * Sets the sheet length.
 * @param {number} length   The sheet length.
 * @returns {LBSailSim.SailInstance} this.
 */
LBSailSim.SailInstance.prototype.setSheetLength = function(length) {
    this.sheetLength = LBMath.clamp(length, this.minSheetLength, this.maxSheetLength);
    this._updateRotationLimits();
    return this;
};

/**
 * Sets the sheet length based on a ratio between the minimum and maximum sheet lengths.
 * @param {number} ratio    The sheet length ratio, 0 is the minimun sheet length,
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
     * @member {string}
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
    
    this.sails.splice(0, this.sails.length);
    for (var i = 0; i < this.vessel.airfoils.length; ++i) {
        if (this.vessel.airfoils[i].name === this.sailName) {
            this.sails.push(this.vessel.airfoils[i]);            
        }
    }
};

/**
 * Changes the sheet length for all the sails.
 * @param {number} value    The sheet length.
 * @returns {undefined}
 */
LBSailSim.SailController.prototype.setSheetLength = function(value) {
    var ratio = (value - this.minValue)  / (this.maxValue - this.minValue);
    for (var i = 0; i < this.sails.length; ++i) {
        this.sails[i].setSheetLengthRatio(ratio);
    }
};