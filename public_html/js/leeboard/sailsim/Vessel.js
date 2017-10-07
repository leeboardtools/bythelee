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

define(['lbsailsimbase', 'lbsail', 'lbhull', 'lbpropulsor', 'lbcontrols', 'lbphysics', 'lbutil', 'lbmath', 'lbgeometry', 'lbdebug', 'lbfoilinstance'], 
function(LBSailSim, LBSail, LBHull, LBPropulsor, LBControls, LBPhysics, LBUtil, LBMath, LBGeometry, LBDebug) {

/**
 * A controller for rudders. This supports controlling more than one rudder, though
 * it only has a single rudder angle.
 * @constructor
 * @extends LBControls.SmoothController
 * @param {LBSailSim.Vessel} [vessel] The vessel this belongs to.
 * @returns {LBSailSim.RudderController}
 */
LBSailSim.RudderController = function(vessel) {
    LBControls.SmoothController.call(this);
    
    /**
     * The vessel to which this belongs.
     * @member {LBSailSim.Vessel}
     */
    this.vessel = vessel;
    
    /**
     * The name of the hydrofoils which this treats as rudders to be controlled.
     * @member {String}
     */
    this.foilName = 'rudder';

    /**
     * The array of hydrofoils which this treats as rudders to be controlled.
     * @member {Array}
     */
    this.rudders = [];
    this._loadRudders();
};

LBSailSim.RudderController.prototype = Object.create(LBControls.SmoothController.prototype);
LBSailSim.RudderController.prototype.constructor = LBSailSim.RudderController;

LBSailSim.RudderController.prototype.destroy = function() {
    if (this.rudders) {
        this.rudders.length = 0;
        this.rudders = null;
        this.vessel = null;
        this.foilName = null;
        
        LBControls.SmoothController.prototype.destroy.call(this);        
    }
};


/**
 * Loads the controller's settings from properties in a data object.
 * @param {object} data The data object to load from.
 * @param {LBSailSim.Vessel} vessel The vessel to which this belongs.
 * @returns {LBSailSim.RudderController}    this/
 */
LBSailSim.RudderController.prototype.load = function(data, vessel) {
    this.controllee = function(value) {
        this.setRudderAngleDeg(value);
    };
    this.vessel = vessel;
    LBControls.SmoothController.prototype.load.call(this, data, vessel);
    this._loadRudders();
    this.setRudderAngleDeg(this.currentValue);
    return this;
};

LBSailSim.RudderController.prototype._loadRudders = function() {
    if (!this.vessel) {
        return;
    }
    
    LBPhysics.RigidBody.getRigidBodiesWithName(this.vessel.hydrofoils, this.foilName, this.rudders);
};

/**
 * Sets the rudder angle for the controlled rudders. The actual {@link LBSailSim.FoilInstance}
 * objects are rotated about their local z-axis, the with foil instance's {@link LBSailSim.FoilInstance#rotationOffsetDegs}
 * for the z-axis added to the angle.
 * @param {Number} deg  The angle in degrees.
 */
LBSailSim.RudderController.prototype.setRudderAngleDeg = function(deg) {
    this.rudders.forEach(function(rudder) {
            rudder.setZRotationDeg(deg + rudder.rotationOffsetDegs[2]);
        },
        deg);
};


/**
 * A controller for propulsors.
 * @constructor
 * @extends LBControls.SmoothController
 * @param {LBSailSim.Vessel} vessel The vessel to which this belongs.
 * @returns {LBSailSim.ThrottleController}
 */
LBSailSim.ThrottleController = function(vessel) {
    LBControls.SmoothController.call(this);
    /**
     * The vessel to which this belongs.
     * @member {LBSailSim.Vessel}
     */
    this.vessel = vessel;
    
    /**
     * The name of the propulsors which are controlled by this.
     * @member {String}
     */
    this.propulsorName = 'engine';
    
    /**
     * The array of propulsors controlled by this.
     * @member {Array}
     */
    this.engines = [];
};

LBSailSim.ThrottleController.prototype = Object.create(LBControls.SmoothController.prototype);
LBSailSim.ThrottleController.prototype.constructor = LBSailSim.ThrottleController;

LBSailSim.ThrottleController.prototype.destroy = function() {
    if (this.engines) {
        this.engines.length = 0;
        this.engines = null;
        this.vessel = null;
        this.propulsorName = null;
        LBControls.SmoothController.prototype.destroy.call(this);
    }
};


/**
 * Loads the controller from the properties in a data object.
 * @param {object} data The data object.
 * @param {LBSailSim.Vessel} vessel The vessel to which this belongs.
 * @returns {LBSailSim.ThrottleController}  this.
 */
LBSailSim.ThrottleController.prototype.load = function(data, vessel) {
    this.controllee = function(value) {
        this.setThrottlePosition(value);
    };
    this.vessel = vessel;
    LBControls.SmoothController.prototype.load.call(this, data, vessel);
    this.propulsorName = data.propulsorName || 'engine';
    this._loadEngines();
    this.setThrottlePosition(this.currentValue);
    return this;
};

LBSailSim.ThrottleController.prototype._loadEngines = function() {
    if (!this.vessel) {
        return;
    }
    
    this.engines.length = 0;
    for (var i = 0; i < this.vessel.propulsors.length; ++i) {
        if (this.vessel.propulsors[i].name === this.propulsorName) {
            this.engines.push(this.vessel.propulsors[i]);            
        }
    }
};

/**
 * Sets the throttle position. The throttle position is such that when it is set to
 * its maximum value the force for the engines is set to their maximum magnitude.
 * If the throttle's minimum value is less than zero, which corresponds to reverse,
 * then the mapping is done in two stages. For positive control values it is mapped
 * between 0 and the engine's maximum force, while for negative control values it is
 * mapped between 0 and the engine's minimum force (which should be negative).
 * @param {Number} value    The throttle position value.
 * @returns {LBSailSim.ThrottleController}  this.
 */
LBSailSim.ThrottleController.prototype.setThrottlePosition = function(value) {
    value = LBMath.clamp(value, this.minValue, this.maxValue);
    
    for (var i = 0; i < this.engines.length; ++i) {
        var engine = this.engines[i];
        if (value > 0) {
            if (engine.maxForce > 0) {
                engine.forceMag = engine.maxForce * value / this.maxValue;
                continue;
            }
        }
        else if (value < 0) {
            if (engine.minForce < 0) {
                engine.forceMag = engine.minForce * value / this.minValue;
                continue;
            }
        }
        engine.forceMag = 0;
    }
    return this;
};

/**
 * Container representing a vessel that floats. Vessels support:
 * <li>airfoils, which are {@link LBSailSim.FoilInstance} based objects that are driven by the atmosphere.
 * <li>hydrofoils,which are {@link LBSailSim.FoilInstance} based objects that are driven by the water.
 * <li>Propulsors, which are {@link LBSailSim.Propulsor} based objects.
 * <li>Ballasts, which are {@link LBPhysics.RigidBody} based objects.
 * <p>
 * For boats, the local coordinate system is presumed to line up the longitudinal
 * axis with the x-axis, the forward end of the waterline at x = 0, and the aft
 * end in the positive x direction.
 * @constructor
 * @extends LBPhysics.RigidBody
 * @param {object} sailEnv  The sailing environment.
 * @param {type} obj3D
 * @returns {LBSailSim.Vessel}
 */
LBSailSim.Vessel = function(sailEnv, obj3D) {
    LBPhysics.RigidBody.call(this, obj3D);

    /**
     * The sailing environment.
     * @member {LBSailSim.Env}
     */
    this.sailEnv = sailEnv;
    
    /**
     * The array of hydrofoils {@link LBSaimSim.FoilInstance}.
     * @member {LBSailSim.FoilInstance[]}
     */
    this.hydrofoils = [];
    
    /**
     * The array of airfoils {@link LBSailSim.FoilInstance}.
     * @member {LBSailSim.FoilInstance[]}
     */
    this.airfoils = [];
    
    /**
     * The array of propulsors {@link LBSaimSim.Propulsor}.
     * @member {LBSailSim.Propulsor[]}
     */
    this.propulsors = [];
    
    /**
     * The array of spars {@link LBPhysics.RigidBody}.
     */
    this.spars = [];
    
    /**
     * The array of ballasts {@link LBPhysics.RigidBody}.
     * @member {LBPhysics.RigidBody[]}
     */
    this.ballasts = [];
    
    /**
     * The array of controllers.
     * @member {Array}
     */
    this.controllers = [];
    
    // Later:
    //this.crew = [];
    
    /**
     * Stores the true wind velocity.
     * @member {LBGeometry.Vector3}
     */
    this.trueWind = new LBGeometry.Vector3();
    
    /**
     * Stores the current apparent wind.
     * @member {LBGeometry.Vector3}
     */
    this.apparentWind = new LBGeometry.Vector3();
    
    /**
     * Stores the current apparent velocity through the water.
     * @member {LBGeometry.Vector3}
     */
    this.apparentCurrent = new LBGeometry.Vector3();
    
    /**
     * The maximum force magnitude we'll generate algorithmically, used
     * to help prevent weird oscillations.
     * @member {Number}
     */
    this.maxForceMag = 10000;

    /**
     * The representation of the hull, this is responsible for generating the
     * canoe body forces.
     * @member {LBSailSim.Hull}
     */
    this.hull = undefined;
};

LBSailSim.Vessel._workingVector3A = new LBGeometry.Vector3();
LBSailSim.Vessel._workingVector3B = new LBGeometry.Vector3();
LBSailSim.Vessel._workingEuler = new LBGeometry.Euler();

LBSailSim.Vessel.prototype = Object.create(LBPhysics.RigidBody.prototype);
LBSailSim.Vessel.prototype.constructor = LBSailSim.Vessel;

LBSailSim.Vessel.prototype.destroy = function() {
    if (this.controllers) {
        this.controllers.forEach(function(controller) {
            controller.destroy();
        });
        this.controllers.length = 0;
        this.controllers = null;

        this.jibsheetController = null;
        this.mainsheetController = null;
        this.rudderController = null;
        this.throttleController = null;        
        
        // We let all the parts (hydrofoils, airfoils, etc.) be destroyed by the
        // rigid body's destroy()...
        this.hydrofoils.length = 0;
        this.hydrofoils = null;
        
        this.airfoils.length = 0;
        this.airfoils = null;
        
        this.propulsors.length = 0;
        this.propulsors = null;
        
        this.ballasts.length = 0;
        this.ballasts = null;
        
        this.spars.length = 0;
        this.spars = null;
        
        this.apparentCurrent = null;
        this.apparentWind = null;
        this.trueWind = null;
        
        this.hullResultant = this.hullResultant.destroy();
        
        if (this.hull) {
            this.hull = this.hull.destroy();
        }
        
        this.sailEnv = null;
        
        LBPhysics.RigidBody.prototype.destroy.call(this);
    }
};

/**
 * Adds an airfoil to the vessel.
 * @param {LBSailSim.FoilInstance} foilInstance The foil instance representing the airfoil.
 * @returns {LBSailSim.Vessel}  this.
 */
LBSailSim.Vessel.prototype.addAirfoil = function(foilInstance) {
    this.airfoils.push(foilInstance);
    this.addPart(foilInstance);
    return this;
};

/**
 * Adds a hydrofoil to the vessel.
 * @param {LBSailSim.FoilInstance} foilInstance The foil instance representing the hydrofoil.
 * @returns {LBSailSim.Vessel}  this.
 */
LBSailSim.Vessel.prototype.addHydroFoil = function(foilInstance) {
    this.hydrofoils.push(foilInstance);
    this.addPart(foilInstance);
    return this;
};

/**
 * Adds a propulsor to the vessel.
 * @param {LBSailSim.Propulsor} propulsor    The propulsor.
 * @returns {LBSailSim.Vessel}  this.
 */
LBSailSim.Vessel.prototype.addPropulsor = function(propulsor) {
    this.propulsors.push(propulsor);
    this.addPart(propulsor);
    return this;
};

/**
 * Adds a spar to the vessel.
 * @param {LBPhysics.RigidBody} spar    The spar.
 * @returns {LBSailSim.Vessel}  this.
 */
LBSailSim.Vessel.prototype.addSpar = function(spar) {
    this.spars.push(spar);
    this.addPart(spar);
    return this;
};

/**
 * Adds ballast to the vessel.
 * @param {LBPhysics.RigidBody} ballast  The ballast.
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
 * @param {object} controllee   The object controlled by the controller. This is assigned
 * to the 'controllee' property of the controller object.
 * @returns {LBSailSim.Vessel}  this.
 */
LBSailSim.Vessel.prototype.addController = function(controller, controllee) {
    controller.controllee = controllee;
    this.controllers.push(controller);
    return this;
};

/**
 * Removes the rigid bodies in a parts array from the vessel.
 * @protected
 * @param {Array} foils    The array containing the rigid body parts, all items are
 * removed from the array.
 * @returns {LBSailSim.Vessel}    this.
 */
LBSailSim.Vessel.prototype._removeParts = function(foils) {
    for (var i = 0; i < foils.length; ++i) {
        this.removePart(foils[i]);
    }
    foils.length = 0;
    return this;
};

/**
 * Called from {@link LBSailSim.Vessel#_loadFoils} to create and load a {@link LBSailSim.FoilInstance}
 * object from properties in a data object.
 * @protected
 * @param {object} data The data object.
 * @param {Boolean} isSail  If true the foil is being created for a sail/airfoil.
 * @returns {LBSailSim.FoilInstance}    The foil instance.
 */
LBSailSim.Vessel.prototype._createAndLoadFoilInstance = function(data, isSail) {
    // We're not using {@link LBPhysics.RigidBody#createFromData() because we need to pass
    // sailEnv to {@link LBFoils.Foil#load()}.
    var foilInstance;
    if (data.className) {
        if (data.className === 'undefined') {
            return undefined;
        }
        
        foilInstance = LBUtil.newClassInstanceFromData(data);
    }
    else {
        if (isSail) {
            foilInstance = new LBSailSim.SailInstance();
        }
        else {
            foilInstance = new LBSailSim.FoilInstance();
        }
    }
    
    return foilInstance.load(data, this.sailEnv);
};

/**
 * Creats and loads {@link LBSailSim.FoilInstance} objects from properties of data objects
 * in an array into an array of foil instances.
 * @protected
 * @param {Array} data  The array of data objects to load each foil from.
 * @param {Array} foils The array for the loaded foils.
 * @param {object} [loadCallback]   If defined, a callback object with functions that
 * get called back after each component is loaded.
 * @returns {LBSailSim.Vessel}  this.
 */
LBSailSim.Vessel.prototype._loadFoils = function(data, foils, loadCallback) {
    if (!data) {
        return this;
    }
    
    var isSail = foils === this.airfoils;
    for (var i = 0; i < data.length; ++i) {
        var foilData = data[i];
        var foilInstance = this._createAndLoadFoilInstance(foilData, isSail);
        if (foilInstance) {
            if (loadCallback && loadCallback.foilInstanceLoaded) {
                loadCallback.foilInstanceLoaded(this, foilInstance, foilData, isSail);
            }
            foils.push(foilInstance);
            this.addPart(foilInstance);
        }
    }
    return this;
};

/**
 * Called from {@link LBSailSim.Vessel#_loadPropulsors} to create and load an 
 * individual {@link LBSailSim.Propulsor} from properties in a data object.
 * @protected
 * @param {object} data The data object.
 * @returns {LBSailSim.Propulsor}   The propulsor.
 */
LBSailSim.Vessel.prototype._createAndLoadPropulsor = function(data) {
    var propulsor;
    if (data.className) {
        propulsor = LBUtil.newClassInstanceFromData(data);
    }
    else {
        propulsor = new LBSailSim.Propulsor(this);
    }
    return propulsor.load(data);
};

/**
 * Loads the vessel's propulsors from properties of data objects in an array.
 * @protected
 * @param {Array} data  The array of data objects.
 * @param {object} [loadCallback]   If defined, a callback object with functions that
 * get called back after each component is loaded.
 * @returns {LBSailSim.Vessel}  this.
 */
LBSailSim.Vessel.prototype._loadPropulsors = function(data, loadCallback) {
    if (!data) {
        return this;
    }
    
    for (var i = 0; i < data.length; ++i) {
        var propulsor = this._createAndLoadPropulsor(data[i]);
        if (propulsor) {
            if (loadCallback && loadCallback.propulsorLoaded) {
                loadCallback.propulsorLoaded(this, propulsor, data[i]);
            }
            this.addPropulsor(propulsor);
        }
    }
    return this;
};


/**
 * Called from {@link LBSailSim.Vessel#_loadSpars} to create and load a spar 
 * object from properties in a data object.
 * @protected
 * @param {object} data The data object.
 * @returns {LBPhysics.RigidBody}   The spar object.
 */
LBSailSim.Vessel.prototype._createAndLoadSpar = function(data) {
    return LBPhysics.RigidBody.createFromData(data);
};

/**
 * Loads the array of spar objects from properties of data objects in an
 * array of data objects.
 * @protected
 * @param {Array} data  The array of data objects.
 * @param {object} [loadCallback]   If defined, a callback object with functions that
 * get called back after each component is loaded.
 * @returns {LBSailSim.Vessel}  this.
 */
LBSailSim.Vessel.prototype._loadSpars = function(data, loadCallback) {
    if (!data) {
        return this;
    }
    
    for (var i = 0; i < data.length; ++i) {
        var spar = this._createAndLoadSpar(data[i]);
        if (spar) {
            if (loadCallback && loadCallback.sparLoaded) {
                loadCallback.sparLoaded(this, spar, data[i]);
            }
            this.addSpar(spar);
        }
    }
    return this;
};


/**
 * Called from {@link LBSailSim.Vessel#_loadBallasts} to create and load a ballast 
 * object from properties in a data object.
 * @protected
 * @param {object} data The data object.
 * @returns {LBPhysics.RigidBody}   The ballast object.
 */
LBSailSim.Vessel.prototype._createAndLoadBallast = function(data) {
    return LBPhysics.RigidBody.createFromData(data);
};

/**
 * Loads the array of ballast objects from properties of data objects in an
 * array of data objects.
 * @protected
 * @param {Array} data  The array of data objects.
 * @param {object} [loadCallback]   If defined, a callback object with functions that
 * get called back after each component is loaded.
 * @returns {LBSailSim.Vessel}  this.
 */
LBSailSim.Vessel.prototype._loadBallasts = function(data, loadCallback) {
    if (!data) {
        return this;
    }
    
    for (var i = 0; i < data.length; ++i) {
        var ballast = this._createAndLoadBallast(data[i]);
        if (ballast) {
            if (loadCallback && loadCallback.ballastLoaded) {
                loadCallback.ballastLoaded(this, ballast, data[i]);
            }
            this.addBallast(ballast);
        }
    }
    return this;
};

/**
 * Called from {@link LBSailSim.Vessel#_loadControllers} to create and load a controller 
 * object from properties in a data object.
 * @protected
 * @param {object} data The data object.
 * @returns {object}    The controller object.
 */
LBSailSim.Vessel.prototype._createAndLoadController = function(data) {
    return LBControls.createControllerFromData(data, this);
};

/**
 * Loads the array of controllers from the properties of data objects in an array
 * of data objects.
 * @protected
 * @param {Array} data  The array of data objects.
 * @param {object} [loadCallback]   If defined, a callback object with functions that
 * get called back after each component is loaded.
 * @returns {LBSailSim.Vessel}  this.
 */
LBSailSim.Vessel.prototype._loadControllers = function(data, loadCallback) {
    if (!data) {
        return this;
    }
    
    for (var i = 0; i < data.length; ++i) {
        var controller = this._createAndLoadController(data[i]);
        if (controller) {
            if (loadCallback && loadCallback.controllerLoaded) {
                loadCallback.controllerLoaded(this, controller, data[i]);
            }
            this.controllers.push(controller);
        }
    }
    return this;
};

/**
 * Loads the vessel's properties from properties in a data object.
 * @param {object} data The data object.
 * @param {object} [loadCallback]   If defined, a callback object with functions that
 * get called back after each component is loaded.
 * @returns {LBSailSim.Vessel}  this.
 */
LBSailSim.Vessel.prototype.load = function(data, loadCallback) {
    // Clear out the existing settings...
    this._removeParts(this.airfoils);
    this._removeParts(this.hydrofoils);
    this._removeParts(this.propulsors);
    this._removeParts(this.spars);
    this._removeParts(this.ballasts);
    this.controllers.length = 0;
    
    this.rudderController = undefined;
    this.mainsheetController = undefined;
    this.jibsheetController = undefined;
    this.throttleController = undefined;
    
    LBPhysics.RigidBody.prototype.load.call(this, data);
    this.typeName = data.typeName;
    this.instances = data.instances;
    
    this.debugForces = data.debugForces;
    
    this._loadSpars(data.spars, loadCallback);
    this._loadBallasts(data.ballasts, loadCallback);
    this._loadPropulsors(data.propulsors, loadCallback);
    this._loadFoils(data.hydrofoils, this.hydrofoils, loadCallback);
    
    // Load airfoils last so they appear above everyone else...
    this._loadFoils(data.airfoils, this.airfoils, loadCallback);

    this._loadControllers(data.controllers, loadCallback);
    
    this.hydrofoils.forEach(function(foil) {
        foil.vesselLoaded(this);
    }, this);
    this.airfoils.forEach(function(foil) {
        foil.vesselLoaded(this);
    }, this);
    
    this.hull = LBSailSim.Hull.createFromData(data.hull, this);
    if (this.hull && loadCallback && loadCallback.hullLoaded) {
        loadCallback.hullLoaded(this, this.hull, data.hull);
    }
    
    if (loadCallback && loadCallback.vesselLoaded) {
        loadCallback.vesselLoaded(this, data);
    }
    
    return this;
};

/**
 * Called by {@link LBSailSim.Vessel#updateForces} to call the {@link LBSailSim.FoilInstance#updateFoilForce}
 * method of the foil instances in an array.
 * @protected
 * @param {Number} dt   The simulation time step.
 * @param {LBSailSim.Water|LBSailSim.Wind} flow What the foil instances are flowing through.
 * @param {Array} foils The array of foil instances.
 * @returns {LBSailSim.Vessel}  this.
 */
LBSailSim.Vessel.prototype._updateFoilForces = function(dt, flow, foils) {
    for (var i = 0; i < foils.length; ++i) {
        foils[i].updateFoilForce(dt, flow);
    }
    return this;
};

/**
 * Call each simulation time step to update the forces to be applied to the vessel
 * based on the vessel's characteristics.
 * @param {Number} dt   The simulation time step.
 * @returns {LBSailSim.Vessel}  this.
 */
LBSailSim.Vessel.prototype.updateForces = function(dt) {
    this.clearForces();
    
    this.updateCoords(dt);
    
    this.sailEnv.wind.getFlowVelocity(this.obj3D.position.x, this.obj3D.position.y, 0, this.trueWind);
    this.apparentWind.copy(this.trueWind);
    this.apparentWind.sub(this.worldLinearVelocity);
    
    this.sailEnv.water.getFlowVelocity(this.obj3D.position.x, this.obj3D.position.y, 0, this.apparentCurrent);
    this.apparentCurrent.sub(this.worldLinearVelocity);
    this.apparentCurrent.z = 0;
    
    this._updateFoilForces(dt, this.sailEnv.wind, this.airfoils);
    this._updateFoilForces(dt, this.sailEnv.water, this.hydrofoils);
    
    for (var i = 0; i < this.propulsors.length; ++i) {
        this.propulsors[i].updateForce(dt);
    }
    
    if (this.hull) {
        this.hullResultant = this.hull.updateForces(dt);
        this.addWorldResultant(this.hullResultant);
    }
    
    this.handleDebugFields();
    
    return this;
};

LBSailSim.Vessel.prototype.handleDebugFields = function() {
    if (this.debugForces) {
        var dbgField = LBDebug.DataLog.getField(this.name);
        if (dbgField) {
            var pos = this.obj3D.getWorldPosition(LBSailSim.Vessel._workingVector3A);
            dbgField.setSubFieldValue('wPos', pos);
            
            var rot = this.obj3D.getWorldRotation(LBSailSim.Vessel._workingEuler);
            dbgField.setSubFieldValue('wRot', rot);
            
            dbgField.setSubFieldValue('wResultant', this.resultant);
            dbgField.setSubFieldValue('wVel', this.apparentCurrent);
        }
    }
};

LBSailSim.Vessel.addDebugFields = function(name) {
    LBDebug.DataLog.addFieldVector3([name, 'wPos']);
    LBDebug.DataLog.addFieldEuler([name, 'wRot']);
    LBDebug.DataLog.addFieldResultant([name, 'wResultant']);
    LBDebug.DataLog.addFieldVector3([name, 'wVel']);
};

// @inheritdoc...
LBSailSim.Vessel.prototype.getResultant = function(convertToWrench) {
    var resultant = LBPhysics.RigidBody.prototype.getResultant.call(this, convertToWrench);
    LBGeometry.clampVectorMag(resultant.force, this.maxForceMag);
    return resultant;
};

/**
 * Retrieves the rudder controller used by {@link LBSailSim.Vessel#moveRudder} and {@link LBSailSim.Vessel#getRudderDeg}.
 * @returns {object}    The controller, undefined if a rudder controller has not been defined.
 */
LBSailSim.Vessel.prototype.getRudderController = function() {
    if (this.rudderController === undefined) {
        // Look for a rudder controller...
        this.rudderController = LBUtil.findArrayElementWithName(this.controllers, 'Rudder', null);
    }
    return (this.rudderController) ? this.rudderController : undefined;
};

/**
 * Helper that moves the rudder using the rudder controller.
 * @param {Number} deg  The rudder angle in degrees.
 * @param {Boolan} [isOffset=false] If true deg is an offset from the current angle position, otherwise
 * it is the absolute angle.
 * @returns {LBSailSim.Vessel}  this.
 */
LBSailSim.Vessel.prototype.moveRudder = function(deg, isOffset) {
    var controller = this.getRudderController();
    if (controller) {
        controller.setValue(deg, isOffset);
    }
    return this;
};

/**
 * Retrieves the current rudder angle in degrees.
 * @returns {Number} The current rudder angle in degrees.
 */
LBSailSim.Vessel.prototype.getRudderDeg = function() {
    return (this.rudderController) ? this.rudderController.getValue() : 0;
};

/**
 * Retrieves the mainsheet controller, if any.
 * @returns {object}    The mainsheet controller, undefined if there is none.
 */
LBSailSim.Vessel.prototype.getMainsheetController = function() {
    if (this.mainsheetController === undefined) {
        this.mainsheetController = LBUtil.findArrayElementWithName(this.controllers, 'Mainsheet', null);        
    }
    return (this.mainsheetController && (this.mainsheetController.sails.length > 0)) ? this.mainsheetController : undefined;
};

/**
 * Changes the mainsheet's position.
 * @param {Number} position The mainsheet position.
 * @param {Boolean} [isOffset=false]    If true position is an offset to be added to the 
 * mainsheet's current position.
 * @returns {LBSailSim.Vessel}  this.
 */
LBSailSim.Vessel.prototype.moveMainsheet = function(position, isOffset) {
    var controller = this.getMainsheetController();
    if (controller) {
        controller.setValue(position, isOffset);
    }
    return this;
};

/**
 * Retrieves the current position of the mainsheet controller.
 * @returns {Number}    The position.
 */
LBSailSim.Vessel.prototype.getMainsheetPos = function() {
    return (this.mainsheetController) ? this.mainsheetController.getValue() : 0;
};

/**
 * Retrieves the jibsheet controller, if any.
 * @returns {object}    The jibheet controller, undefined if there is none.
 */
LBSailSim.Vessel.prototype.getJibsheetController = function() {
    if (this.jibsheetController === undefined) {
        this.jibsheetController = LBUtil.findArrayElementWithName(this.controllers, 'Jibsheet', null);        
    }
    return (this.jibsheetController && (this.jibsheetController.sails.length > 0)) ? this.jibsheetController : undefined;
};

/**
 * Changes the jibsheet's position.
 * @param {Number} position The jibsheet position.
 * @param {Boolean} [isOffset=false]    If true position is an offset to be added to the 
 * jibsheet's current position.
 * @returns {LBSailSim.Vessel}  this.
 */
LBSailSim.Vessel.prototype.moveJibsheet = function(position, isOffset) {
    var controller = this.getJibsheetController();
    if (controller) {
        controller.setValue(position, isOffset);
    }
    return this;
};

/**
 * Retrieves the current position of the jibsheet controller.
 * @returns {Number}    The position.
 */
LBSailSim.Vessel.prototype.getJibsheetPos = function() {
    return (this.jibsheetController) ? this.jibsheetController.getValue() : 0;
};

/**
 * Retrieves the throttle controller, if any.
 * @returns {object}    The throttle controller, undefined if there is none.
 */
LBSailSim.Vessel.prototype.getThrottleController = function() {
    if (this.throttleController === undefined) {
        this.throttleController = LBUtil.findArrayElementWithName(this.controllers, 'Throttle', null);
    }
    return this.throttleController ? this.throttleController : undefined;
};

/**
 * Moves the throttle position.
 * @param {Number} position The new throttle position.
 * @param {Boolean} [isOffset=false]    If true position is an offset to be added to the current
 * throttle position.
 * @returns {LBSailSim.Vessel}  this.
 */
LBSailSim.Vessel.prototype.moveThrottle = function(position, isOffset) {
    var controller = this.getThrottleController();
    if (controller) {
        controller.setValue(position, isOffset);
    }
    return this;
};

/**
 * Retrieves the current throttle position.
 * @returns {Number}    The throttle position.
 */
LBSailSim.Vessel.prototype.getThrottlePos = function() {
    return (this.throttleController) ? this.throttleController.getValue() : 0;
};


/**
 * Retrieves the current position of the veseel.
 * @returns {object}    The vessel's position.
 */
LBSailSim.Vessel.prototype.getPosition = function() {
    return this.obj3D.position;
};

/**
 * Retrieves the linear velocity of the center of the vessel in m/s.
 * @returns {LBGeometry.Vector2}    The velocity.
 */
LBSailSim.Vessel.prototype.getVelocityMPS = function() {
    return this.worldLinearVelocity;
};

/**
 * Retrieves the heading of the vessel in compass degrees.
 * @param {Boolean} [isRound]   If true the heading is rounded to 0 decimal digits.
 * @returns {Number}    The heading in compass degrees.
 */
LBSailSim.Vessel.prototype.getHeadingDeg = function(isRound) {
    var degrees = this.obj3D.rotation.z * LBMath.RAD_TO_DEG + 90;
    if (isRound) {
        degrees = Math.round(degrees);
    }
    return LBSailSim.compassDegreesXY(degrees);
};

/**
 * Retrieves the speed of the vessel in knots.
 * @returns {Number}    The speed of the vessel in knots.
 */
LBSailSim.Vessel.prototype.getKnots = function() {
    var x = this.worldLinearVelocity.x;
    var y = this.worldLinearVelocity.y;
    return LBUtil.mps2kt(Math.sqrt(x * x + y * y));
};

/**
 * Returns the leeway angle in degrees. The leeway angle is the angular difference between
 * the velocity direction and the x-axis of the vessel.
 * @param {Boolean} isRound If true the leeway angle is rounded before wrapping.
 * @returns {Number}    The leeway angle in degrees.
 */
LBSailSim.Vessel.prototype.getLeewayDeg = function(isRound) {
    if (this.worldLinearVelocity.lengthSq() < 1e-3) {
        return 0;
    }
    
    var rot = this.obj3D.getWorldRotation(LBSailSim.Vessel._workingEuler);
    var heading = rot.z * LBMath.RAD_TO_DEG + 180;
    var boatDir = Math.atan2(this.worldLinearVelocity.y, this.worldLinearVelocity.x) * LBMath.RAD_TO_DEG;
    var leeway = LBMath.subDegrees(boatDir, heading);
    if (isRound) {
        leeway = Math.round(leeway);
    }
    return leeway;
};

/**
 * Retrieves the true wind velocity at the vessel's location.
 * @returns {LBGeometry.Vector3}
 */
LBSailSim.Vessel.prototype.getTrueWindVelocityMPS = function() {
    return this.trueWind;
};

/**
 * Retrieves the apparent wind speed of the vessel in knots.
 * @returns {Number}    The apparent wind speed in knots.
 */
LBSailSim.Vessel.prototype.getApparentWindKnots = function() {
    var x = this.apparentWind.x;
    var y = this.apparentWind.y;
    return LBUtil.mps2kt(Math.sqrt(x * x + y * y));
};

/**
 * Returns the bearing of the apparent wind relative to the bow of the boat (which 
 * is in the local +x direction.
 * @param {Boolean} isRound If true the angle is rounded before wrapping.
 * @returns {Number}    The bearing in degrees.
 */
LBSailSim.Vessel.prototype.getApparentWindBearingDeg = function(isRound) {
    var heading = this.obj3D.rotation.z * LBMath.RAD_TO_DEG;
    var degrees = Math.atan2(this.apparentWind.y, this.apparentWind.x) * LBMath.RAD_TO_DEG - heading;
    if (isRound) {
        degrees = Math.round(degrees);
    }
    return LBMath.wrapDegrees(degrees);
};

/**
 * Retrieves the apparent wind velocity vector in m/s.
 * @returns {LBGeometry.Vector3}    The apparent wind velocity.
 */
LBSailSim.Vessel.prototype.getApparentWindVelocityMPS = function() {
    return this.apparentWind;
};

LBSailSim.Vessel.prototype._getFoilForceMag = function(foils, localDir) {
    var dir = LBSailSim.Vessel._workingVector3B.copy(localDir);
    this.obj3D.localToWorld(dir);
    
    var origin = LBSailSim.Vessel._workingVector3A.zero();
    this.obj3D.localToWorld(origin);
    
    dir.sub(origin);
    dir.z = 0;
    dir.normalize();

    var force = LBSailSim.Vessel._workingVector3A;
    force.zero();
    foils.forEach(function(foil) {
        force.add(foil.getResultant().force);
    });
    
    return Math.abs(force.dot(dir));
};

LBSailSim.Vessel.prototype.getDrivingForceMag = function() {
    return this._getFoilForceMag(this.airfoils, LBGeometry.X_AXIS);
};

LBSailSim.Vessel.prototype.getHeelingForceMag = function() {
    return this._getFoilForceMag(this.airfoils, LBGeometry.Y_AXIS);
};

LBSailSim.Vessel.prototype.getSideForceMag = function() {
    return this._getFoilForceMag(this.hydrofoils, LBGeometry.Y_AXIS);
};

LBSailSim.Vessel.prototype.getHydrofoilDrag = function() {
    return this._getFoilForceMag(this.hydrofoils, LBGeometry.X_AXIS);
};

LBSailSim.Vessel.prototype.getRudderForceMag = function() {
    return 0;
};

LBSailSim.Vessel.prototype.getFrictionalDrag = function() {
    return this.hull.frictionalDrag;
};

LBSailSim.Vessel.prototype.getResiduaryDrag = function() {
    return this.hull.residuaryResistance;
};

/**
 * Creates a vessel object based upon properties in a data object.
 * @param {object} data
 * @param {object} sailEnv
 * @param {object} [loadCallback]   If defined, a callback object with the following functions
 * that get called back after the loading of each component:
 * <li>foilInstanceLoaded = function(vessel, foilInstance, foilData, isSail);
 * <li>propulsorLoaded = function(this, propulsor, propulsorData);
 * <li>ballastLoaded = function(this, ballast, ballastData);
 * <li>controllerLoaded = function(this, controller, controllerData);
 * <li>hullLoaded = function(this, this.hull, hullData);
 * <li>vesselLoaded = function(this, vesselData);
 * <p>
 * Each function is optional.
 * @returns {object}    The created vessel, {undefined} if data is not defined.
 */
LBSailSim.Vessel.createFromData = function(data, sailEnv, loadCallback) {
    if (!data) {
        return undefined;
    }
    
    var vessel;
    if (data.className) {
        vessel = LBUtil.newClassInstanceFromData(data);
        vessel.sailEnv = sailEnv;
    }
    else {
        vessel = new LBSailSim.Vessel(sailEnv);
    }
    
    return vessel.load(data, loadCallback);
};

return LBSailSim;
});