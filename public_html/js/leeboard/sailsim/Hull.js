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


/* global LBSailSim, LBPhysics, LBGeometry, LBMath, Leeboard */

/**
 * Spline used for calculating the friction coefficient Cf given the roughness
 * ratio, eyeballed from Fossati pg. 16.
 * @type {LBMath.CSpline}
 */
LBSailSim.CFVsRoughnessRatio = new LBMath.CSpline();
LBSailSim.CFVsRoughnessRatio.setup(
        [ 3e3,      1e4,    3e4,    1e5,    3e5 ],
        [ 6.5e-3,   5e-3,   4e-3,   3e-3,   2.6e-3]);

/**
 * The representation of a hull, this includes the various hull parameters such as
 * waterline length and prismatic coefficient. It handles computing the canoe body
 * forces for the hull.
 * @constructor
 * @param {LBSailSim.Vessel} vessel The vessel to which the hull belongs.
 * @return {LBSailSim.Hull}
 */
LBSailSim.Hull = function(vessel) {
    this.vessel = vessel;
    
    /**
     * The center of buoyancy in local coordinates.
     * @member {LBGeometry.Vector3}
     */
    this.centerOfBuoyancy = new LBGeometry.Vector3();
    
    /**
     * The waterline length LWL.
     * @member {number}
     */
    this.lwl = 10.02;
    
    /**
     * The waterline beam, BWL.
     * @member {number}
     */
    this.bwl = 3.17;
    
    /**
     * The canoe body draft Tc.
     * @member {number}
     */
    this.tc = 0.57;
    
    /**
     * The canoe body volumne displacement delC.
     * @member {number}
     */
    this.delC = 7.63;
    
    /**
     * The prismatic coefficient CP.
     * @member {number}
     */
    this.cp = 0.56;
    
    /**
     * The longitudinal center of buoyancy from the forward perpendicular, LBCfpp
     * @member {number}
     */
    // In the book it's given as a percentage, which I'm presuming is percent of LWO
    // from the mid-point, so we have:
    // lwl / 2 + % LWL / 2
    this.lcb = 0.5 * this.lwl + 0.035 * this.lwl;
    
    /**
     * The longitudinal center of floatation from the forward perpendicular, LFCfpp.
     * @member {number}
     */
    this.lcf = 0.5 * this.lwl + 0.065 * this.lwl;
    
    /**
     * The area of water plane, AW
     * @member {number}
     */
    this.aw = 22.7;
    
    /**
     * The wetted surface area of canoe body, Swc, also Sc
     * @member {number}
     */
    this.swc = 25.2;
    
    /**
     * The unheeled wetted surface area of canoe body, Swc, also Sc
     * @member {number}
     */
    this.swcnh = 25.2;
     
    /**
     * The midship section coefficient, CM
     * @member {number}
     */
    this.cm = 0.752;
   
    /**
     * The equivalent uniform roughness, K.
     * @member {number}
     */
    this.k = 5e-6;
    
    /**
     * The current heeling angle about the boat's y axis, in world coordinates.
     * @readonly
     * @member {number}
     */
    this.heelAngleDeg = 0;
    
    /**
     * The center of buoyancy in world coordinates.
     * @readonly
     * @member {LBGeometry.Vector3}
     */
    this.worldCenterOfBuoyancy = new LBGeometry.Vector3();
    
    /**
     * The center of resistance (where the hull resistance is applied) in world coordinates.
     * @readonly
     * @member {LBGeometry.Vector3}
     */
    this.worldCenterOfResistance = new LBGeometry.Vector3();

    /**
     * The scale factor 1/2 * rho * V^2.
     * @readonly
     * @member {number}
     */
    this.halfRhoVSq = 0;
};

LBSailSim.Hull._workingForce = new LBGeometry.Vector3();
LBSailSim.Hull._workingVelResults = { 'worldPos' : new LBGeometry.Vector3() };
LBSailSim.Hull.prototype = {
    
    /**
     * Updates the hull properties that are dependent upon the hull's orientation.
     * @protected
     */
    _updatePropertiesFromVessel: function() {
        var vessel = this.vessel;
        this.waterSpeed = vessel.apparentCurrent.length();
        this.halfRhoVSq = 0.5 * vessel.sailEnv.water.density * this.waterSpeed;

        this.heelAngleDeg = vessel.obj3D.rotation.x * LBMath.RAD_TO_DEG;
        
        var velResults = LBSailSim.Hull._workingVelResults;
        vessel.coordSystem.calcVectorLocalToWorld(this.centerOfBuoyancy, velResults);
        this.worldCenterOfBuoyancy.copy(velResults.worldPos);
        
        this.worldCenterOfResistance.copy(velResults.worldPos);
        
        this.swc = this.swcnh * LBSailSim.Delft.calcWettedSurfaceHeelCorrection(this);
    },
    
    /**
     * Calculates the drag due to friction.
     * @return {number} The drag due to friction.
     */
    calcFrictionalDrag: function() {
        // Based on Larsson, pg. 66 - 70.
        if (LBMath.isLikeZero(this.waterSpeed)) {
            this.frictionalDrag = 0;
        }
        else {
            var frictionalRe = this.vessel.sailEnv.water.calcRe(this.waterSpeed, this.lwl * 0.7);
            var den = Math.log10(frictionalRe) - 2;
            var cFriction = 0.075 / (den * den);

            if (!LBMath.isLikeZero(this.waterSpeed)) {
                var permissibleRoughness = 100e-6 / this.waterSpeed;
                if (this.k > permissibleRoughness) {
                    var roughnessRatio = this.lwl / this.k;
                    cFriction = LBSailSim.CFVsRoughnessRatio.interpolate(roughnessRatio);
                }
            }
            this.frictionalDrag = this.halfRhoVSq * cFriction * this.swc;
        }
        
        return this.frictionalDrag;
    },
    
    calcResiduaryResistance: function() {
        this.residuaryResistance = LBSailSim.Delft.calcResiduaryResistance(this);
        return this.residuaryResistance;
    },
    
    calcFormDrag: function() {
        return 0;
    },
    
    calcWaveDrag: function() {
        return 0;
    },
    
    /**
     * Calculates the forces due to the hull, returning it as a resultant.
     * @param {number} dt   The simulation time step.
     * @param {LBPhysics.Resultant} [resultant] If defined the resultant to store the results into.
     * @return {LBPhysics.Resultant3D}  The resultant.
     */
    updateForces: function(dt, resultant) {
        resultant = resultant || new LBPhysics.Resultant3D();
        
        this._updatePropertiesFromVessel();
        
        resultant.applPoint.copy(this.worldCenterOfResistance);

        var frictionDrag = this.calcFrictionalDrag();
        var residuaryResistance = this.calcResiduaryResistance();
        var formDrag = this.calcFormDrag();
        var waveDrag = this.calcWaveDrag();
        
        var drag = frictionDrag + residuaryResistance + formDrag + waveDrag;
        var force = LBSailSim.Hull._workingForce;
        force.copy(this.vessel.apparentCurrent).normalize();
        force.multiplyScalar(drag);
        
        resultant.addForce(force, this.worldCenterOfResistance);
        
        // Add gravity...
        var fGravity = this.vessel.getTotalMass() * this.vessel.sailEnv.gravity;
        force.set(0, 0, fGravity);
        resultant.addForce(force, this.vessel.getTotalCenterOfMass());
        
        // And buoyancy...
        force.set(0, 0, -fGravity);
        resultant.addForce(force, this.worldCenterOfBuoyancy);
        
        return resultant;
    },

    /**
     * Loads the hull parameters from properties in a data object.
     * @param {object} data The data object.
     * @param {LBSailSim.Vessel} vessel The vessel this hull represents.
     * @return {LBSailSim.Hull} this.
     */
    load: function(data, vessel) {
        this.vessel = vessel;
        
        this.lwl = data.lwl || this.lwl;
        this.bwl = data.bwl || this.bwl;
        this.tc = data.tc || this.tc;
        this.delC = data.delC || this.delC;
        this.cm = data.cm || this.cm;
        this.cp = data.cp || this.cp;
         
        this.k = data.k || this.k;
        
        this.swc = data.swc || LBSailSim.Hull.estimateSW(this);
        this.swcnh = this.swc;
        
        LBGeometry.loadVector3(data.centerOfBuoyancy, this.centerOfBuoyancy);
        return this;
    },

    constructor: LBSailSim.Hull
};

/**
 * Creates and loads a hull from properties in a data object.
 * @param {object} data The data object.
 * @param {LBSailSim.Vessel} vessel The vessel to which the hull belongs.
 * @return {LBSailSim.Hull} The hull, undefined if data is undefined.
 */
LBSailSim.Hull.createFromData = function(data, vessel) {
    if (!data) {
        return undefined;
    }
    
    var hull;
    if (data.className) {
        hull = Leeboard.newClassInstanceFromData(data);
    }
    else {
        hull = new LBSailSim.Hull();
    }
    
    return hull.load(data, vessel);
};


/**
 * Calculates the midship coefficient for a set of hull parameters.
 * Larsson pg. 33
 * @param {LBSailSim.Hull} hull The hull parameters.
 * @return {number} The midship coefficient CM.
 */
LBSailSim.Hull.calcCM = function(hull) {
    var den = hull.lwl * hull.bwl * hull.tc * hull.cp;
    return hull.delC / den;
};

/**
 * Estimates the wetted surface area.
 * Larsson pg. 33
 * @param {LBSailSim.Hull} hull The hull parameters.
 * @return {number} The estimated wetted surface area SW.
 */
LBSailSim.Hull.estimateSW = function(hull) {
    var cm = (hull.cm) ? hull.cm : LBSailSim.Hull.calcCM(hull);
    var sw = (1.97 + 0.171 * hull.bwl / hull.tc) * Math.sqrt(hull.delC * hull.lwl);
    sw *= Math.pow(0.65 / cm, 1./3.);
    return sw;
};

/**
 * Calculates the prismatic coefficient CP.
 * @param {number} delC The canoe body volumetric displacement.
 * @param {number} lwl  The waterline length.
 * @param {number} ax   The maximum transverse cross-sectional area.
 * @return {number} The prismatic coefficient.
 */
LBSailSim.Hull.calcCP = function(delC, lwl, ax) {
    return delC / (lwl * ax);
};

/**
 * Calculates the block coefficient CB.
 * @param {number} delC The canoe body volumetric displacement.
 * @param {number} lwl  The waterline length.
 * @param {number} bwl  The maximum beam at the designated waterline.
 * @param {number} tc   The canoe body draft.
 * @return {number} The block coefficient.
 */
LBSailSim.Hull.calcCB = function(delC, lwl, bwl, tc) {
    return delC / (lwl * bwl * tc);
};
