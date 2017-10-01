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



/* global LBSailSim, LBPhysics, LBFoils, LBGeometry, LBDebug */

/**
 * An instance of a foil, a foil is something that generates a force due
 * to its interaction with a flowing fluid.
 * @constructor
 * @extends LBPhysics.RigidBody
 * @param {object} foil The {@link LBFoils.Foil} object that generates the forces.
 * @param {object} obj3D    The 3D object that defines the local coordinate system
 * of the foil.
 * @param {Number} mass The mass of the foil.
 * @param {object} centerOfMass The center of mass of the foil.
 */
LBSailSim.FoilInstance = function(foil, obj3D, mass, centerOfMass) {
    LBPhysics.RigidBody.call(this, obj3D, mass, centerOfMass);
    
    /**
     * The foil used to generate the forces.
     * @member {LBFoils.Foil}
     */
    this.foil = foil || new LBFoils.Foil();
    
    /**
     * An array of rotation offsets, one for each rotation about each axis, in degrees, 
     * used to adjust a rotational control value to the actual rotation angle.
     * @member {Array}
     */
    this.rotationOffsetDegs = [0, 0, 0];
    
    /**
     * Object holding the details from the foil, see {@link LBFoils.Foil#calcWorldForce}.
     */
    this.foilDetails = {
        
    };
};

LBSailSim.FoilInstance._workingPos = new LBGeometry.Vector3();
LBSailSim.FoilInstance._workingQInf;
LBSailSim.FoilInstance._workingResultant;
LBSailSim.FoilInstance._workingEuler;

LBSailSim.FoilInstance.prototype = Object.create(LBPhysics.RigidBody.prototype);
LBSailSim.FoilInstance.prototype.constructor = LBSailSim.FoilInstance;

LBSailSim.FoilInstance.prototype.destroy = function() {
    if (this.foil) {
        this.foil = this.foil.destroy();
        this.rotationOffsetDegs = null;
        this.foilDetails = null;
        LBPhysics.RigidBody.prototype.destroy.call(this);
    }
};

/**
 * Updates the forces generated by this foil instance.
 * @param {Number} dt   The simulation time step.
 * @param {LBSailSim.Wind|LBSailSim.Water} flow What this is flowing through.
 * @returns {LBSailSim.FoilInstance}    this.
 */
LBSailSim.FoilInstance.prototype.updateFoilForce = function(dt, flow) {
    var dbgField = undefined;
    if (this.dumpFoilDetails) {
        dbgField = LBDebug.DataLog.getField(this.name);
        if (dbgField) {
            if (!this.foilDetails.localResultant) {
                this.foilDetails.localResultant = new LBPhysics.Resultant3D();
            }
        }
    }
    
    var pos = LBSailSim.FoilInstance._workingPos;
    pos.set(0, 0, this.foil.sliceZ);
    pos.applyMatrix4(this.coordSystem.worldXfrm);
    
    var qInf = LBSailSim.FoilInstance._workingQInf = LBSailSim.getFlowVelocity(flow, pos, LBSailSim.FoilInstance._workingQInf);
    var resultant = LBSailSim.FoilInstance._workingResultant = this.foil.calcWorldForce(flow.density, qInf,
            this.coordSystem, this.foilDetails, LBSailSim.FoilInstance._workingResultant);
            
    // TEST!!!
    //resultant.force.z = 0;
    //resultant.moment.x = resultant.moment.y = 0;
    
    this.addWorldResultant(resultant);
    
    if (dbgField) {
        this.obj3D.getWorldPosition(pos);
        dbgField.setSubFieldValue('wPos', pos);

        var rot = LBSailSim.FoilInstance._workingEuler = this.obj3D.getWorldRotation(LBSailSim.FoilInstance._workingEuler);
        dbgField.setSubFieldValue('wRot', rot);

        var details = this.foilDetails;
        dbgField.setSubFieldValue('wQInf', qInf);
        dbgField.setSubFieldValue('wVel', details.worldVel);

        dbgField.setSubFieldValue('chord', details.chord);
        dbgField.setSubFieldValue('angleDeg', details.angleDeg);
        dbgField.setSubFieldValue('lQInf', details.qInfLocal);

        dbgField.setSubFieldValue('lResultant', details.localResultant);
        dbgField.setSubFieldValue('wResultant', resultant);
    }
    return this;
};

/**
 * Helper that adds fields for a given foil instance name to {@link LBDebug.DataLog}.
 * @param {String} name The foil instance name to debug.
 * @returns {undefined}
 */
LBSailSim.FoilInstance.addDebugFields = function(name) {
    LBDebug.DataLog.addFieldVector3([name, 'wPos']);
    LBDebug.DataLog.addFieldEuler([name, 'wRot']);
    LBDebug.DataLog.addFieldVector3([name, 'wQInf']);
    LBDebug.DataLog.addFieldVector3([name, 'wVel']);
    LBDebug.DataLog.addSpacer(name);

    LBDebug.DataLog.addField([name, 'angleDeg']);
    LBDebug.DataLog.addFieldVector2([name, 'chord']);
    LBDebug.DataLog.addFieldVector2([name, 'lQInf']);
    LBDebug.DataLog.addSpacer(name);

    LBDebug.DataLog.addFieldResultant([name, 'lResultant']);
    LBDebug.DataLog.addSpacer(name);

    LBDebug.DataLog.addFieldResultant([name, 'wResultant']);
};

/**
 * Loads the foil instance's properties from properties in a data object.
 * @param {object} data The data to load from.
 * @param {LBSailSim.Env} sailEnv  The sailing environment, passed to {@link LBFoils.Foil} for
 * loading the {@link LBFoils.ClCdCurve} object.
 * @returns {LBSailSim.FoilInstance}    this.
 */
LBSailSim.FoilInstance.prototype.load = function(data, sailEnv) {
    LBPhysics.RigidBody.prototype.load.call(this, data);
    if (data.foil) {
        this.foil = LBFoils.Foil.createFromData(data.foil, sailEnv);
    }
    
    this.rotationOffsetDegs = data.rotationOffset || [0, 0, 0];
    this.dumpFoilDetails = data.dumpFoilDetails;
    
    return this;
};

/**
 * Called by the vessel after loading and prior to use.
 * @param {LBSailSim.Vessel} vessel The vessel calling this.
 * @returns {LBSailSim.FoilInstance}    this.
 */
LBSailSim.FoilInstance.prototype.vesselLoaded = function(vessel) {
    return this;
};
