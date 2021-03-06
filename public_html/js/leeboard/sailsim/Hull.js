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


define(['lbsailsimbase', 'lbutil', 'lbmath', 'lbgeometry', 'lbvolume', 'lbphysics', 'lbinterpolate', 'lbdelft', 'lbdebug'],
function(LBSailSim, LBUtil, LBMath, LBGeometry, LBVolume, LBPhysics, LBInterpolate, LBDelft, LBDebug) {
    
    'use strict';


/**
 * Spline used for calculating the friction coefficient Cf given the roughness
 * ratio, eyeballed from Fossati pg. 16.
 * @type {module:LBMath.CSpline}
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
     * The center of buoyancy in local coordinates. This is actively updated if
     * volumes have been specified for the vessel.
     * @member {module:LBGeometry.Vector3}
     */
    this.centerOfBuoyancy = new LBGeometry.Vector3();
    
    /**
     * The immersed volume. This is actively updated if
     * volumes have been specified for the vessel.
     * @member {Number}
     */
    this.immersedVolume = 0;
    
    /**
     * The waterline length LWL.
     * @member {Number}
     */
    this.lwl = 10.02;
    
    /**
     * The waterline beam, BWL.
     * @member {Number}
     */
    this.bwl = 3.17;
    
    /**
     * The canoe body draft Tc.
     * @member {Number}
     */
    this.tc = 0.57;
    
    /**
     * The canoe body volumne displacement delC.
     * @member {Number}
     */
    this.delC = 7.63;
    
    /**
     * The prismatic coefficient CP.
     * @member {Number}
     */
    this.cp = 0.56;
    
    /**
     * The longitudinal center of buoyancy from the forward perpendicular, LBCfpp
     * @member {Number}
     */
    // In the book it's given as a percentage, which I'm presuming is percent of LWO
    // from the mid-point, so we have:
    // lwl / 2 + % LWL / 2
    this.lcb = 0.5 * this.lwl + 0.035 * this.lwl;
    
    /**
     * The longitudinal center of floatation from the forward perpendicular, LFCfpp.
     * @member {Number}
     */
    this.lcf = 0.5 * this.lwl + 0.065 * this.lwl;
    
    /**
     * The area of water plane, AW
     * @member {Number}
     */
    this.aw = 22.7;
    
    /**
     * The wetted surface area of canoe body, Swc, also Sc
     * @member {Number}
     */
    this.swc = 25.2;
    
    /**
     * The unheeled wetted surface area of canoe body, Swc, also Sc
     * @member {Number}
     */
    this.swcnh = 25.2;
     
    /**
     * The midship section coefficient, CM
     * @member {Number}
     */
    this.cm = 0.752;
   
    /**
     * The equivalent uniform roughness, K.
     * @member {Number}
     */
    this.k = 5e-6;
    
    /**
     * The current heeling angle about the boat's y axis, in world coordinates.
     * @readonly
     * @member {Number}
     */
    this.heelAngleDeg = 0;
    
    /**
     * The center of buoyancy in world coordinates.
     * @readonly
     * @member {module:LBGeometry.Vector3}
     */
    this.worldCenterOfBuoyancy = new LBGeometry.Vector3();
    
    /**
     * The center of resistance (where the hull resistance is applied) in world coordinates.
     * @readonly
     * @member {module:LBGeometry.Vector3}
     */
    this.worldCenterOfResistance = new LBGeometry.Vector3();

    /**
     * The scale factor 1/2 * rho * V^2.
     * @readonly
     * @member {Number}
     */
    this.halfRhoVSq = 0;
    
    /**
     * The resistance force in world coordinates.
     * @member {module:LBGeometry.Vector3}
     */
    this.resistanceForce = new LBGeometry.Vector3();
    
};

//var _workingPos = new LBGeometry.Vector3();
var _workingPlane = LBGeometry.XY_PLANE.clone();
var _workingVelResults = { 'worldPos' : new LBGeometry.Vector3() };
var _workingVelPerpendicular = new LBGeometry.Vector3();

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
        
        if (this.vessel.volumes.length > 0) {
            this._updateBuoyancy();
        }
        else {
            this.centerOfBuoyancy.copy(this.vessel.centerOfMass);
        }
        
        var velResults = _workingVelResults;
        vessel.coordSystem.calcVectorLocalToWorld(this.centerOfBuoyancy, velResults);
        this.worldCenterOfBuoyancy.copy(velResults.worldPos);
        
        this.worldCenterOfResistance.copy(velResults.worldPos);
        
        this.swc = this.swcnh * LBSailSim.Delft.calcWettedSurfaceHeelCorrection(this);
    },
    
    _updateBuoyancy: function() {
        var xyPlane = _workingPlane.copy(LBGeometry.XY_PLANE);
        xyPlane.applyMatrix4(this.vessel.coordSystem.localXfrm);
        
        this.wakeEdgeCalculator.startUpdateBuoyancy();
        
        this.immersedVolume = LBVolume.Volume.volumesOnSideOfPlane(this.vessel.volumes, xyPlane, false, this.centerOfBuoyancy,
            this.wakeEdgeCalculator.getBuoyancyWaterlineFunction(xyPlane));

        this.wakeEdgeCalculator.endUpdateBuoyancy();
    },
    
    /**
     * Calculates the drag due to friction.
     * @return {Number} The drag due to friction.
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
     * @param {Number} dt   The simulation time step.
     * @param {module:LBPhysics.Resultant} [resultant] If defined the resultant to store the results into.
     * @return {module:LBPhysics.Resultant3D}  The resultant.
     */
    updateForces: function(dt, resultant) {
        resultant = resultant || new LBPhysics.Resultant3D();
        resultant.zero();
        
        this._updatePropertiesFromVessel();
        
        resultant.applPoint.copy(this.worldCenterOfResistance);

        this.frictionalDrag = this.calcFrictionalDrag();
        this.residuaryResistance = this.calcResiduaryResistance();
        this.formDrag = this.calcFormDrag();
        this.waveDrag = this.calcWaveDrag();
        
        var drag = this.frictionalDrag + this.residuaryResistance + this.formDrag + this.waveDrag;       
        var force = this.resistanceForce;
        force.copy(this.vessel.apparentCurrent);
        
        // Don't bother with z because all our drag models don't do up-down motion...
        force.z = 0;
        force.normalize();
        
        force.multiplyScalar(drag);
        
        resultant.addForce(force, this.worldCenterOfResistance);
        
        // Add gravity...
        this.forceGravity = -this.vessel.getTotalMass() * this.vessel.sailEnv.gravity;
        force.set(0, 0, this.forceGravity);
        resultant.addForce(force, this.vessel.getTotalCenterOfMass());
        
        // And buoyancy...
        this.forceBuoyancy = this.immersedVolume * this.vessel.sailEnv.water.density * this.vessel.sailEnv.gravity;
        // Add some damping...
        if (this.buoyancyDamping) {
            // Based on the linear damping used in cannon/bullet, which is:
            //      vNew = v * (1 - damping)^(dt)
            // Since we work in forces, we want to generate a force that has a similar effect.
            // Working backwards:
            //      F = mass * accel
            //      accel = deltaV / dt
            //      deltaV = vNew - v
            // We get:
            //      deltaV = v * (1 - damping)^(dt) - v
            var deltaV = this.vessel.worldLinearVelocity.z * (Math.pow(1 - this.buoyancyDamping, dt) - 1);
            var accel = -deltaV / dt;
            this.forceBuoyancy -= accel * this.vessel.getTotalMass();
        }

        force.set(0, 0, this.forceBuoyancy);
        resultant.addForce(force, this.worldCenterOfBuoyancy);
        
        
        this.wakeEdgeCalculator.update();
        this.wakeEndPort = this.wakeEdgeCalculator.wakeEndPort;
        this.wakeEndStbd = this.wakeEdgeCalculator.wakeEndStbd;
        
        this.handleDebugFields(resultant);
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
        this.cm = data.cm || this.cm;
        this.cp = data.cp || this.cp;
        
        if (data.lcb) {
            this.lcb = data.lcb;
        }
        else {
            this.lcb = 0.5 * this.lwl + 0.035 * this.lwl;
        }
        
        if (data.lcf) {
            this.lcf = data.lcf;
        }
        else {
            this.lcf = 0.5 * this.lwl + 0.065 * this.lwl;
        }
        
        this.delC = vessel.mass / vessel.sailEnv.water.density;
         
        this.k = data.k || this.k;
        
        this.swc = data.swc || LBSailSim.Hull.estimateSW(this);
        this.swc *= data.swcScale || 1;
        this.swcnh = this.swc;
        
        this.buoyancyDamping = data.buoyancyDamping || 0;
        
        this.debugForces = data.debugForces;
        
        LBGeometry.loadVector3(data.centerOfBuoyancy, this.centerOfBuoyancy);
        
        this.wakeEdgeCalculator = LBSailSim.WakeEdgeCalculator.createFromData(this, data.wakeEdgeCalculator);
        return this;
    },

    /**
     * Call when done with the object to have it release any internal references
     * to other objects to help with garbage collection.
     * @returns {undefined}
     */
    destroy: function() {
        if (this.vessel) {
            this.centerOfBuoyancy = null;
            this.vessel = null;
            this.worldCenterOfBuoyancy= null;
            this.worldCenterOfResistance = null;
            
            if (this.wakeEdgeCalculator) {
                this.wakeEdgeCalculator.destroy();
                this.wakeEdgeCalculator = null;
            }
        }
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
        hull = LBUtil.newClassInstanceFromData(data);
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
 * @return {Number} The midship coefficient CM.
 */
LBSailSim.Hull.calcCM = function(hull) {
    var den = hull.lwl * hull.bwl * hull.tc * hull.cp;
    return hull.delC / den;
};

/**
 * Estimates the wetted surface area.
 * Larsson pg. 33
 * @param {LBSailSim.Hull} hull The hull parameters.
 * @return {Number} The estimated wetted surface area SW.
 */
LBSailSim.Hull.estimateSW = function(hull) {
    var cm = (hull.cm) ? hull.cm : LBSailSim.Hull.calcCM(hull);
    var sw = (1.97 + 0.171 * hull.bwl / hull.tc) * Math.sqrt(hull.delC * hull.lwl);
    sw *= Math.pow(0.65 / cm, 1./3.);
    return sw;
};

/**
 * Calculates the prismatic coefficient CP.
 * @param {Number} delC The canoe body volumetric displacement.
 * @param {Number} lwl  The waterline length.
 * @param {Number} ax   The maximum transverse cross-sectional area.
 * @return {Number} The prismatic coefficient.
 */
LBSailSim.Hull.calcCP = function(delC, lwl, ax) {
    return delC / (lwl * ax);
};

/**
 * Calculates the block coefficient CB.
 * @param {Number} delC The canoe body volumetric displacement.
 * @param {Number} lwl  The waterline length.
 * @param {Number} bwl  The maximum beam at the designated waterline.
 * @param {Number} tc   The canoe body draft.
 * @return {Number} The block coefficient.
 */
LBSailSim.Hull.calcCB = function(delC, lwl, bwl, tc) {
    return delC / (lwl * bwl * tc);
};

/**
 * Handles recording debug field data if necessary.
 * @protected
 * @param {module:LBPhysics.Resultant} resultant   The force resultant.
 * @returns {undefined}
 */
LBSailSim.Hull.prototype.handleDebugFields = function(resultant) {
    if (this.debugForces) {
        var dbgField = LBDebug.DataLog.getField(this.vessel.name + '.hull');
        if (dbgField) {
            dbgField.setSubFieldValue('resultant', resultant);
            dbgField.setSubFieldValue('rForce', this.resistanceForce);
            dbgField.setSubFieldValue('formDrag', this.formDrag);
            dbgField.setSubFieldValue('frictionalDrag', this.frictionalDrag);
            dbgField.setSubFieldValue('residuaryResistance', this.residuaryResistance);
            dbgField.setSubFieldValue('waveDrag', this.waveDrag);
            dbgField.setSubFieldValue('gravity', this.forceGravity);
            dbgField.setSubFieldValue('buoyancy', this.forceBuoyancy);
            dbgField.setSubFieldValue('wCOM', this.vessel.getTotalCenterOfMass());
            
            var pos = this.vessel.getTotalCenterOfMass().clone();
            pos.applyMatrix4(this.vessel.coordSystem.localXfrm);
            dbgField.setSubFieldValue('lclCOM', pos);

            pos.copy(this.worldCenterOfBuoyancy);
            pos.applyMatrix4(this.vessel.coordSystem.localXfrm);
            dbgField.setSubFieldValue('lclCOB', pos);
        }
    }
};

/**
 * Helper that adds fields for a given hull instance name to {@link module:LBDebug.DataLog}.
 * @param {String} name The foil instance name to debug.
 * @returns {undefined}
 */
LBSailSim.Hull.addDebugFields = function(name) {
    name += '.hull';
    LBDebug.DataLog.addFieldResultant([name, 'resultant']);
    LBDebug.DataLog.addField([name, 'frictionalDrag']);
    LBDebug.DataLog.addField([name, 'residuaryResistance']);
    LBDebug.DataLog.addField([name, 'formDrag']);
    LBDebug.DataLog.addField([name, 'waveDrag']);
    LBDebug.DataLog.addField([name, 'gravity']);
    LBDebug.DataLog.addField([name, 'buoyancy']);
    LBDebug.DataLog.addFieldVector3([name, 'wCOM']);
    LBDebug.DataLog.addFieldVector3([name, 'lclCOM']);
    LBDebug.DataLog.addFieldVector3([name, 'lclCOB']);
    
};


/**
 * Class used to compute the edges where a wake leaves the hull.
 * @constructor
 * @param {module:LBSailSim.Hull} hull  The hull this is for.
 * @returns {module:LBSailSim.WakeEdgeCalculator}
 */
LBSailSim.WakeEdgeCalculator = function(hull) {
    this.hull = hull;
};

LBSailSim.WakeEdgeCalculator.prototype = {
    startUpdateBuoyancy: function() {
        this._storeMinPerpVertex = this._storeMinPerpVertex || new LBGeometry.Vector3();
        this._storeMaxPerpVertex = this._storeMaxPerpVertex || new LBGeometry.Vector3();
        
        var vessel = this.hull.vessel;
        _workingVelPerpendicular.x = -vessel.worldLinearVelocity.y;
        _workingVelPerpendicular.y = vessel.worldLinearVelocity.x;
        _workingVelPerpendicular.applyMatrix4Rotation(vessel.coordSystem.localXfrm);
        _workingVelPerpendicular.normalize();

        this.minPerpVertex = undefined;
        this.minPerpDistance = Number.MAX_VALUE;
        this.maxPerpVertex = undefined;
        this.maxPerpDistance = -Number.MAX_VALUE;
    },
    
    getBuoyancyWaterlineFunction: function(xyPlane) {
        var me = this;
        return function(volIndex, tetra) {
            tetra.vertices.forEach(function(vertex) {
                if (LBMath.isLikeZero(xyPlane.distanceToPoint(vertex))) {
                    var dot = vertex.dot(_workingVelPerpendicular);
                    if (dot < me.minPerpDistance) {
                        me.minPerpDistance = dot;
                        me.minPerpVertex = me._storeMinPerpVertex.copy(vertex);
                    }
                    if (dot > me.maxPerpDistance) {
                        me.maxPerpDistance = dot;
                        me.maxPerpVertex = me._storeMaxPerpVertex.copy(vertex);
                    }
                }
            });
        };
    },
    
    endUpdateBuoyancy: function() {
        if (this.maxPerpVertex) {
            var vessel = this.hull.vessel;
            this.maxPerpVertex.applyMatrix4(vessel.coordSystem.worldXfrm);
            this.minPerpVertex.applyMatrix4(vessel.coordSystem.worldXfrm);
        }
        
        this.wakeEndPort = this.maxPerpVertex;
        this.wakeEndStbd = this.minPerpVertex;
    },
    
    load: function(data) {
        
    },
    
    update: function() {
    },
    
    destroy: function() {
        if (this.hull) {
            this._storeMinPerpVertex = null;
            this._storeMaxPerpVertex = null;
            this.minPerpVertex = null;
            this.maxPerpVertex = null;
            this.wakeEndPort = null;
            this.wakeEndStbd = null;
            
            this.hull = null;
        }
    },
    constructor: LBSailSim.WakeEdgeCalculator
};

var _interpWakeEdgeCalculatorValues = [];

LBSailSim.InterpWakeEdgeCalculator = function(hull) {
    this.hull = hull;
    this.interpolator = new LBInterpolate.MultiDim();
    this.wakeEndPort = new LBGeometry.Vector3();
    this.wakeEndStbd = new LBGeometry.Vector3();
};

LBSailSim.InterpWakeEdgeCalculator.prototype = {
    startUpdateBuoyancy: function() {
    },
    
    getBuoyancyWaterlineFunction: function(xyPlane) {
        return undefined;
    },
    
    endUpdateBuoyancy: function() {
    },
    
    load: function(data) {
        this.interpolator.setFromSingleArray(data.interpData, 2);
    },
    
    update: function() {
        var vessel = this.hull.vessel;
        var leewayDeg = vessel.getLeewayDeg();
        var values = this.interpolator.calcValue(leewayDeg, _interpWakeEdgeCalculatorValues);
        this.wakeEndPort.set(values[0], values[1], 0);
        
        leewayDeg = LBMath.wrapDegrees(leewayDeg + 180);
        this.interpolator.calcValue(leewayDeg, values);
        this.wakeEndStbd.set(values[0], values[1], 0);
        
        vessel.obj3D.localToWorld(this.wakeEndPort);
        this.wakeEndPort.z = 0;
        
        vessel.obj3D.localToWorld(this.wakeEndStbd);
        this.wakeEndStbd.z = 0;
    },
    
    destroy: function() {
        if (this.hull) {
            this.wakeEndPort = null;
            this.wakeEndStbd = null;
            
            this.hull = null;
        }
    },
    constructor: LBSailSim.WakeEdgeCalculator
};


LBSailSim.WakeEdgeCalculator.createFromData = function(hull, data) {
    var calculator;
    if (data.className) {
        calculator = LBUtil.newClassInstanceFromData(data);
        calculator.hull = hull;
    }
    else {
        calculator = new LBSailSim.WakeEdgeCalculator(hull);
    }
    
    calculator.load(data);
    return calculator;
};

return LBSailSim;
});
