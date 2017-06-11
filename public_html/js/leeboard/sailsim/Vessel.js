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

/* global Leeboard, LBPhysics, LBGeometry, LBMath, LBFoils, LBSailSim */

// Need to tie together Phaser and our Vessel stuff.
// What is the tie-in?
// Need to take the forces from Vessel and apply them to the Phaser physics object.
// Need to take the position/rotation of the phaser object and apply it to the
// Vessel.
// Why do we need P2? Because of collision detection.

/**
 * A basic instance of a foil, a foil is something that generates a force due
 * to its interaction with a flowing fluid.
 * @constructor
 * @param {object} foil The {@link LBFoils.Foil} object that generates the forces.
 * @param {object} obj3D    The 3D object that defines the local coordinate system
 * of the foil.
 * @param {number} mass The mass of the foil.
 * @param {object} centerOfMass The center of mass of the foil.
 */
LBSailSim.FoilInstance = function(foil, obj3D, mass, centerOfMass) {
    LBPhysics.RigidBody.call(this, obj3D, mass, centerOfMass);
    this.foil = foil || new LBFoils.Foil();
    this.workingPos = LBGeometry.createVector3();
};

LBSailSim.FoilInstance.prototype = Object.create(LBPhysics.RigidBody.prototype);
LBSailSim.FoilInstance.prototype.constructor = LBSailSim.FoilInstance;

LBSailSim.FoilInstance.prototype.updateFoilForce = function(dt, flow) {
    this.workingPos.set(0, 0, this.foil.sliceZ);
    this.workingPos.applyMatrix4(this.coordSystem.worldXfrm);
    
    this.workingQInf = LBSailSim.getFlowVelocity(flow, this.workingPos, this.workingQInf);
    this.workingResultant = this.foil.calcWorldForce(flow.density, this.workingQInf,
            this.coordSystem);
    this.addWorldResultant(this.workingResultant);
};

/**
 * Loads the foil instance's properties from properties in a data object.
 * @param {object} data The data to load from.
 * @param {object} sailEnv  The sailing environment, passed to {@link LBFoils.Foil} for
 * loading the {@link LBFoils.ClCdCurve} object.
 * @returns {object}    this.
 */
LBSailSim.FoilInstance.prototype.load = function(data, sailEnv) {
    LBPhysics.RigidBody.prototype.load.call(this, data);
    if (Leeboard.isVar(data.foil)) {
        this.foil = LBFoils.Foil.createFromData(data.foil, sailEnv);
    }
    return this;
};



/**
 * An instance of a propulsor, which is an object that exerts some type of propulsive
 * force.
 * @constructor
 * @param {object} obj3D    The object 3D defining the local coordinate system of
 * the propulsor.
 * @param {number} maxForce The maximum force magnitude generated by the propulsor, if
 * not defined it is set to {Number.MAX_VALUE}.
 * @returns {LBSailSim.Propulsor}
 */
LBSailSim.Propulsor = function(obj3D, maxForce) {
    LBPhysics.RigidBody.call(this, obj3D, 0);
    this.forceMag = 0;
    this.forceDir = LBGeometry.createVector3(1, 0, 0);
    this.maxForce = maxForce || Number.MAX_VALUE;
    
    this.workingForce = LBGeometry.createVector3();
    this.workingPos = LBGeometry.createVector3();
};

LBSailSim.Propulsor.prototype = Object.create(LBPhysics.RigidBody.prototype);
LBSailSim.Propulsor.prototype.constructor = LBSailSim.Propulsor;

LBSailSim.Propulsor.prototype.updateForce = function(dt) {
    var forceMag = LBMath.clamp(this.forceMag, 0, this.maxForce);
    if (forceMag === 0) {
        return this;
    }
    
    this.workingForce.copy(this.forceDir);
    this.workingForce.multiplyScalar(forceMag);
    this.workingForce.applyMatrix4Rotation(this.coords.worldXfrm);
    
    this.workingPos.zero();
    this.workingPos.applyMatrix4(this.coords.worldXfrm);
    
    this.addWorldForce(this.workingForce, this.workingPos);
            
    return this;
};


/**
 * Container representing a vessel that floats. Vessels support:
 * <li>Aerofoils, which are {@link LBSailSim.FoilInstance} based objects that are driven by the atmosphere.
 * <li>Hydrofoils,which are {@link LBSailSim.FoilInstance} based objects that are driven by the water.
 * <li>Propulsors, which are {@link LBSailSim.Propulsor} based objects.
 * <li>Ballasts, which are {@link LBPhysics.RigidBody} based objects.
 * @constructor
 * @param {object} sailEnv  The sailing environment.
 * @param {type} obj3D
 * @returns {LBSailSim.Vessel}
 */
LBSailSim.Vessel = function(sailEnv, obj3D) {
    LBPhysics.RigidBody.call(this, obj3D);

    this.sailEnv = sailEnv;
    this.hydroFoils = [];
    this.aeroFoils = [];
    this.propulsors = [];
    this.ballasts = [];
    
    this.controllers = [];
    
    // Later:
    //this.crew = [];
    
    this.apparentWind = LBGeometry.createVector3();

};

LBSailSim.Vessel.prototype = Object.create(LBPhysics.RigidBody.prototype);
LBSailSim.Vessel.prototype.constructor = LBSailSim.Vessel;

/**
 * Adds an aerofoil to the vessel.
 * @param {object} foilInstance The foil instance representing the aerofoil.
 * @returns {LBSailSim.Vessel}  this.
 */
LBSailSim.Vessel.prototype.addAeroFoil = function(foilInstance) {
    this.aeroFoils.push(foilInstance);
    this.addPart(foilInstance);
    return this;
};

/**
 * Adds a hydrofoil to the vessel.
 * @param {object} foilInstance The foil instance representing the hydrofoil.
 * @returns {LBSailSim.Vessel}  this.
 */
LBSailSim.Vessel.prototype.addHydroFoil = function(foilInstance) {
    this.hydroFoils.push(foilInstance);
    this.addPart(foilInstance);
    return this;
};

/**
 * Adds a propulsor to the vessel.
 * @param {object} propulsor    The propulsor.
 * @returns {LBSailSim.Vessel}  this.
 */
LBSailSim.Vessel.prototype.addPropulsor = function(propulsor) {
    this.propulsors.push(propulsor);
    this.addPart(propulsor);
    return this;
};

/**
 * Adds ballast to the vessel.
 * @param {object} ballast  The ballast.
 * @returns {LBSailSim.Vessel}  this.
 */
LBSailSim.Vessel.prototype.addBallast = function(ballast) {
    this.ballasts.push(ballast);
    this.addPart(ballast);
    return this;
};

/**
 * Adds a controller and what it controls to the vessel.
 * @param {object} controller   The controller.
 * @param {object} controllee   The object controlled by the controller.
 * @returns {LBSailSim.Vessel.prototype}
 */
LBSailSim.Vessel.prototype.addController = function(controller, controllee) {
    controller.controllee = controllee;
    this.controllers.push(controller);
    return this;
};

/**
 * Removes the rigid bodies in a parts array from the vessel.
 * @protected
 * @param {object} foils    The array containing the rigid body parts, all items are
 * removed from the array.
 * @returns {object}    foils.
 */
LBSailSim.Vessel.prototype._removeParts = function(foils) {
    for (var i = 0; i < foils.length; ++i) {
        this.removePart(foils[i]);
    }
    foils.splice(0, foils.length);
    return foils;
};

LBSailSim.Vessel.prototype._createFoilInstanceForLoad = function(data) {
    // We're not using {@link LBPhysics.RigidBody#createFromData() because we need to pass
    // sailEnv to {@link LBFoils.Foil#load()}.
    if (Leeboard.isVar(data.construct)) {
        return eval(data.construct);
    }
    
    return new FoilInstance();
};

LBSailSim.Vessel.prototype._loadFoilInstance = function(data) {    
    var foilInstance = this._createFoilInstanceForLoad(data);
    if (Leeboard.isVar(foilInstance)) {
        foilInstance.load(data, this.sailEnv);
    }    
    return foilInstance;
};

LBSailSim.Vessel.prototype._loadFoils = function(data, foils) {
    if (!Leeboard.isVar(data)) {
        return this;
    }
    
    for (var i = 0; i < data.length; ++i) {
        var foilData = data[i];
        var foilInstance = this._loadFoilInstance(foilData);
        if (Leeboard.isVar(foilInstance)) {
            foils.push(foilInstance);
            this.addPart(foilInstance);
        }
    }
    return this;
};

LBSailSim.Vessel.prototype._loadPropulsors = function(data) {
    if (!Leeboard.isVar(data)) {
        return this;
    }
    return this;
};

LBSailSim.Vessel.prototype._createBallastForLoad = function(data) {
    return LBPhysics.RigidBody.createFromData(data);
};

LBSailSim.Vessel.prototype._loadBallasts = function(data) {
    if (!Leeboard.isVar(data)) {
        return this;
    }
    
    for (var i = 0; i < data.length; ++i) {
        var ballast = this._createBallastForLoad(data[i]);
        if (ballast !== undefined) {
            this.addBallast(ballast);
        }
    }
    return this;
};

LBSailSim.Vessel.prototype.load = function(data) {
    // Clear out the existing settings...
    this.aeroFoils = this._removeParts(this.aeroFoils);
    this.hydroFoils = this._removeParts(this.hydroFoils);
    this.propulsors = this._removeParts(this.propulsors);
    this.ballasts = this._removeParts(this.ballasts);
    
    LBPhysics.RigidBody.prototype.load.call(this, data);
    this.typeName = data.typeName;
    this.instances = data.instances;
    
    this._loadFoils(data.aeroFoils, this.aeroFoils);
    this._loadFoils(data.hydroFoils, this.hydroFoils);
    this._loadPropulsors(data.propulsors);
    this._loadBallasts(data.ballasts);
    
    return this;
};

LBSailSim.Vessel.prototype._updateFoilForces = function(dt, flow, foils) {
    for (var i = 0; i < foils.length; ++i) {
        foils[i].updateFoilForce(dt, flow);
    }
    return this;
};

LBSailSim.Vessel.prototype.updateForces = function(dt) {
    this.clearForces();
    
    this.updateCoords(dt);
    
    var wind = this.sailEnv.wind;
    this.sailEnv.wind.getFlowVelocity(this.obj3D.position.x, this.obj3D.position.y, this.apparentWind);
    this.apparentWind.sub(this.worldLinearVelocity);
    
    this._updateFoilForces(dt, this.sailEnv.wind, this.aeroFoils);
    this._updateFoilForces(dt, this.sailEnv.water, this.hydroFoils);
    
    for (var i = 0; i < this.propulsors.length; ++i) {
        this.propulsors[i].updateForce(dt);
    }
    
    // Need the hull resistance...
    
    // Need to add gravity.
    
    return this;
};

LBSailSim.Vessel.prototype.moveTiller = function(deltaDeg) {
    
};

LBSailSim.Vessel.prototype.moveMainsheet = function(delta) {
    
};


/**
 * Retrieves the current position of the veseel.
 * @returns {object}    The vessel's position.
 */
LBSailSim.Vessel.prototype.getPosition = function() {
    return this.obj3D.position;
};

/**
 * Retrieves the heading of the vessel in compass degrees.
 * @param {Boolean} [isRound]   If true the heading is rounded to 0 decimal digits.
 * @returns {Number}    The heading in compass degrees.
 */
LBSailSim.Vessel.prototype.getHeadingDeg = function(isRound) {
    var degrees = this.obj3D.rotation.z * LBMath.RAD_TO_DEG;
    if (isRound) {
        degrees = degrees.toFixed();
    }
    return LBSailSim.compassDegrees(degrees);
};

/**
 * Retrieves the speed of the vessel in knots.
 * @returns {Number}    The speed of the vessel in knots.
 */
LBSailSim.Vessel.prototype.getKnots = function() {
    return Leeboard.mps2kt(this.worldLinearVelocity.length());
};

/**
 * Returns the leeway angle in degrees. The leeway angle is the angular difference between
 * the velocity direction and the x-axis of the vessel.
 * @returns {Number}    The leeway angle in degrees.
 */
LBSailSim.Vessel.prototype.getLeewayDeg = function() {
    if ((this.worldLinearVelocity.x === 0) && (this.worldLinearVelocity.y === 0)) {
        return 0;
    }
    
    var heading = this.obj3D.rotation.z * LBMath.RAD_TO_DEG;
    var boatDir = Math.atan2(this.worldLinearVelocity.y, this.worldLinearVelocity.x) * LBMath.RAD_TO_DEG;
    var leeway = boatDir - heading;
    return LBMath.wrapDegrees(leeway);
};

/**
 * Retrieves the apparent wind speed of the vessel in knots.
 * @returns {Number}    The apparent wind speed in knots.
 */
LBSailSim.Vessel.prototype.getApparentWindKnots = function() {
    return Leeboard.mps2kt(this.apparentWind.length());
};

/**
 * Returns the bearing of the apparent wind relative to the bow of the boat (which 
 * is in the +x direction.
 * @returns {Number}    The bearing in degrees.
 */
LBSailSim.Vessel.prototype.getApparentWindBearingDeg = function() {
    var degrees = Math.atan2(this.apparentWind.y, this.apparentWind.x) * LBMath.RAD_TO_DEG;
    return LBMath.wrapDegrees(degrees);
};


/**
 * Creates a vessel object based upon properties in a data object.
 * @param {object} data
 * @param {object} sailEnv
 * @returns {object}    The created vessel, {undefined} if data is not defined.
 */
LBSailSim.Vessel.createFromData = function(data, sailEnv) {
    if (!Leeboard.isVar(data)) {
        return undefined;
    }
    
    var vessel;
    if (Leeboard.isVar(data.construct)) {
        vessel = eval(data.construct);
        vessel.sailEnv = sailEnv;
    }
    else {
        vessel = new LBSailSim.Vessel(sailEnv);
    }
    
    return vessel.load(data);
};