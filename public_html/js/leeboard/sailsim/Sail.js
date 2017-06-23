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

LBSailSim.SailFoil = function(sailInstance) {
    LBFoils.Foil.call(this);
    this.sailInstance = sailInstance;
};

LBSailSim.SailFoil.prototype = Object.create(LBFoils.Foil.prototype);
LBSailSim.SailFoil.prototype.constructor = LBSailSim.SailFoil;

LBSailSim.SailFoil.prototype.calcLocalLiftDragMoment = function(rho, qInfLocal, store, details) {
    var result = LBFoils.Foil.prototype.calcLocalLiftDragMoment.call(rho, qInfLocal, store, details);
    
    // TODO: Apply the reefing factor, flatness factor.
    
    // The Cl/Cd curve will be from the books...
    // Need a luffing state.
    
    return result;
};

LBSailSim.SailInstance = function() {
    var foil = new LBSailSim.SailFoil(this);
    LBSailSim.FoilInstance.call(this, foil);
    
    this.flatness = 1;
    this.twist = 1;
    this.reef = 1;
    this.vreef = 1;
    
    this.sheetAnchorSail = LBGeometry.createVector3();
    this.sheetAnchorBoat = LBGeometry.createVector3();
    
    this.sheetLength = 0;
    this.minSheetLength = 0;
    this.maxSheetLength = 1;
    
    this.workingPos = LBGeometry.createVector3();
    this.workingCoordResults = {
        'worldPos' : LBGeometry.createVector3(),
        'worldVel' : LBGeometry.createVector3()
    };
    this.workingMoment = LBGeometry.createVector3();
};

LBSailSim.SailInstance.prototype = Object.create(LBSailSim.FoilInstance.prototype);
LBSailSim.SailInstance.prototype.constructor = LBSailSim.SailInstance;

LBSailSim.SailInstance.prototype.updateFoilForce = function(dt, flow) {
    LBSailSim.FoilInstance.prototype.updateFoilForce.call(this, dt, flow);
    
    // Handle rotating the sail if needed.
    // The force on the sail is our current force resultant, first let's move it to
    // the center of rotation.
    this.workingPos.zero();
    this.coordSystem.calcVectorLocalToWorld(this.workingPos, this.workingCoordResults);
    
    this.resultant.moveApplPoint(this.workingCoordResults.worldPos);
    
    this.workingMoment.copy(this.resultant.moment);
    this.workingMoment.applyMatrix4Rotation(this.coordSystem.localXfrm);
    // If the moment's z-axis is positive, the rotation is positive...
    if (!LBMath.isLikeZero(this.workingMoment.z)) {
        // Get the current rotation and check it against the appropriate angle limit.
        var rotationDeg = this.obj3D.rotation.z * LBMath.RAD_TO_DEG + this.rotationOffsetDegs[2];
        if (this.workingMoment.z < 0) {
            if (rotationDeg >= this.maxRotationDeg) {
                return this;
            }
        }
        else {
            if (rotationDeg <= this.minRotationDeg) {
                return this;
            }
        }
        
        var currentDeg = this.obj3D.rotation.z * LBMath.RAD_TO_DEG;
        this.integrateForceForRotation(LBGeometry.Z_AXIS, currentDeg, function(deg) {
            deg += this.rotationOffsetDegs[2];
            deg = LBMath.clamp(deg, this.minRotationDeg, this.maxRotationDeg);
            return deg - this.rotationOffsetDegs[2];
        });
    }
    
    return this;
};

LBSailSim.SailInstance.prototype._updateRotationLimits = function() {
    // TODO: Handle multiple sheets (i.e. jib sheeets and spinnakers...)
    
    var a = this.sheetAnchorSail.length();
    var b = this.sheetAnchorBoat.length();
    var c = this.sheetLength;
    
    if (c < (a + b)) {
        this.maxRotationDeg = LBMath.radFromThreeSides(a, b, c) * LBMath.RAD_TO_DEG;
    }
    else {
        this.maxRotationDeg = Math.PI;
    }
    this.minRotationDeg = -this.maxRotationDeg;
};

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

LBSailSim.SailInstance.prototype.setSheetLength = function(length) {
    this.sheetLength = LBMath.clamp(length, this.minSheetLength, this.maxSheetLength);
    this._updateRotationLimits();
    return this;
};

LBSailSim.SailInstance.prototype.setSheetLengthRatio = function(ratio) {
    var length = this.minSheetLength + ratio * (this.maxSheetLength - this.minSheetLength);
    this.setSheetLength(length);
};


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
    return this;
};

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

LBSailSim.SailController.prototype.setSheetLength = function(value) {
    var ratio = (value - this.minValue)  / (this.maxValue - this.minValue);
    for (var i = 0; i < this.sails.length; ++i) {
        this.sails[i].setSheetLengthRatio(ratio);
    }
};