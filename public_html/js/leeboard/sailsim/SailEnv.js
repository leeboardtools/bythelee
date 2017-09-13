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

/* global LBUtil, Phaser, LBGeometry, LBFoils, LBSailSim, LBMath */

/**
 * 
 * @namespace LBSailSim
 */

/**
 * The main sailing environment, basically the sailing world.
 * @class SailEnv
 * @constructor
 * @returns {LBSailSim.Env}
 */
LBSailSim.Env = function() {
    this.wind = new LBSailSim.Wind();
    this.water = new LBSailSim.Water();
    
    this.clCdCurves = [];

    /**
     * The boat data objects, each property is named with the boat type name, with the
     * value of the property the data object for that boat type.
     * @readonly
     * @member {object}
     */
    this.boatDatas = {};
    
    /**
     * Each property of boatsByType has the name of the boat type and is an object
     * whose properties correspond to the possible instances of the boat type. These
     * properties have the name of the boat instance and whose value is the actual
     * checked out boat, "" if the boat is not checked out. We use "" instead of
     * undefined so we can distinguish between availability (=== "") and non-existance 
     * (undefined).
     * @readonly
     * @member {object}
     */
    this.boatsByType = {};
    
    /**
     * The acceleration due to gravity.
     * @member {Number}
     */
    this.gravity = 9.81;
    
    /**
     * Array of callback objects. These callback objects are examimed for
     * the appropriate functions, and if present that function is called at the
     * appropriate time.
     * @member {Array}
     */
    this.boatCallbacks = [];
};

LBSailSim.Env.prototype = {
    constructor: LBSailSim.Env,
    
    /**
     * Calculates the Froude number for a given speed and length.
     * @param {Number} vel  The speed.
     * @param {Number} len  The length.
     * @returns {Number}    The Froude number.
     */
    calcFroudeNumber: function(vel, len) {
        return vel / Math.sqrt(len * this.gravity);
    },
    
    /**
     * Calculates the Reynolds number for a given speed and length in the air.
     * @param {Number} vel  The speed.
     * @param {Number} len  The length.
     * @returns {Number}    The Reynolds number.
     */
    calcAirRe: function(vel, len) {
        return this.wind.calcRe(vel, len);
    },
    
    /**
     * Calculates the Reynolds number for a given speed and length in the water.
     * @param {Number} vel  The speed.
     * @param {Number} len  The length.
     * @returns {Number}    The Reynolds number.
     */
    calcWaterRe: function(vel, len) {
        return this.water.calcRe(vel, len);
    },
    
    /**
     * Loads {@link LBFoils.ClCdCurve} from a data object.
     * @param {object} data The array of data objects for the ClCd curves.
     * @returns {LBSailSim.Env} this.
     */
    loadClCdCurves: function(data) {
        data.clCdCurves.forEach(this._loadClCdCurve, this);
        return this;
    },
    
    _loadClCdCurve: function(data) {
        var clCdCurve = new LBFoils.ClCdCurve();
        clCdCurve.load(data);
        this.clCdCurves[clCdCurve.name] = clCdCurve;
    },
    
    
    /**
     * Retrieves a loaded {@link LBFoils.ClCdCurve}.
     * @param {object} name The name of the ClCd curve.
     * @returns {object}    The ClCd curve, undefined if there isn't one with the name.
     */
    getClCdCurve: function(name) {
        return this.clCdCurves[name];
    },
    
    
    /**
     * Adds a boat callback object.
     * @param {Object} callback The callback object.
     * @returns {LBSailSim.Env} this.
     */
    addBoatCallback: function(callback) {
        this.boatCallbacks.push(callback);
        return this;
    },
    
    /**
     * Removes a boat callback object.
     * @param {Object} callback The callback object to remove.
     * @returns {LBSailSim.Env} this.
     */
    removeBoatCallback: function(callback) {
        var index = this.boatCallbacks.indexOf(callback);
        if (index >= 0) {
            this.boatCallbacks.splice(index, 1);
        }
        return this;
    },

    /**
     * Loads the boat data objects, actual boat instances are not created.
     * @param {object} data An array containing the boat data objects.
     * @returns {LBSailSim.Env} this.
     */
    loadBoatDatas: function(data) {
        data.boats.forEach(this._loadBoatData, this);
        return this;
    },
    
    /**
     * Called from {@link LBSailSim.SailEnv.loadBoatDatas} to handle storing the data
     * object and updating the boat database.
     * @protected
     * @param {object} data The boat data object.
     * @returns {undefined}
     */
    _loadBoatData: function(data) {
        this.boatDatas[data.typeName] = data;
        
        var boatsForType = {};
        if (data.instances) {
            // TODO: Someday support a range of numbered boats.
            for (var i = 0; i < data.instances.length; ++i) {
                boatsForType[data.instances[i]] = "";
            }
        }
        else {
            boatsForType[data.typeName] = "";
        }
        this.boatsByType[data.typeName] = boatsForType;
    },
    
    /**
     * Retrieves the boat data object for a particular boat type.
     * @param {object} typeName The boat type name.
     * @returns {LBSailSim.Env.boatDatas}
     */
    getBoatData: function(typeName) {
        return this.boatDatas[typeName];
    },
    
    /**
     * Determines if a boat is available for checkout.
     * @param {object} typeName The name of the boat type.
     * @param {object} [boatName] The name of the boat instance, if undefined the typeName is used.
     * @returns {Boolean}   True if the boat is available for checkout.
     */
    isBoatAvailable: function(typeName, boatName) {
        var boatData = this.getBoatData(typeName);
        if (!boatData) {
            return false;
        }

        var boatsOfType = this.boatsByType[typeName];
        if (!boatsOfType) {
            // The boat type is not supported.
            return false;
        }

        boatName = boatName || typeName;
        var boatInstance = boatsOfType[boatName];
        // Need to use use LBUtil.isVar(), as boatInstance is a string and an empty
        // string is treated as false.
        if (!LBUtil.isVar(boatInstance)) {
            // Boat name for boat type is not supported.
            return false;
        }

        return boatInstance === "";
    },
    

    /**
     * Creates and loads a new boat instance. The boat is attached to the sailing environment.
     * <p>
     * This will call the function:
     * <p>
     * onBoatCheckedOut = function(boat, data) {}
     * <p>
     * on any callbacks that have it defined.
     * 
     * @param {object} typeName The boat's type.
     * @param {object} [boatName] The name of the particular boat instance.
     * @param {Number} [centerX=0] The initial x coordinate of the boat.
     * @param {Number} [centerY=0] The initial y coordinate of the boat.
     * @param {Number} [rotDeg=0] The initial rotation of the boat, in degrees.
     * @param {Number} [rollDeg=0] The initial roll angle of the boat, in degrees.
     * @param {Number} [pitchDeg=0] The initial pitch angel of the boat, in degrees.
     * @returns {object}    The boat instance, undefined if the boat is not available.
     */
    checkoutBoat: function(typeName, boatName, centerX, centerY, rotDeg, rollDeg, pitchDeg) {
        if (!this.isBoatAvailable(typeName, boatName)) {
            return undefined;
        }

        var boatData = this.getBoatData(typeName);
        if (!boatData) {
            return undefined;
        }

        boatName = boatName || "";
        var boat = this._createBoatInstance(typeName, boatName, boatData);
        if (!boat) {
            return undefined;
        }
        
        boat.name = boatName;
        boat.obj3D.position.x = centerX || 0;
        boat.obj3D.position.y = centerY || 0;
        if (rotDeg) {
            boat.obj3D.rotateZ(rotDeg * LBMath.DEG_TO_RAD);
        }
        if (pitchDeg) {
            boat.obj3D.rotateY(pitchDeg * LBMath.DEG_TO_RAD);
        }
        if (rollDeg) {
            boat.obj3D.rotateX(rollDeg * LBMath.DEG_TO_RAD);
        }
        boat.obj3D.updateMatrixWorld(true);

        this.boatsByType[typeName][boatName] = boat;
        this._boatCheckedOut(boat, boatData);
        return boat;
    },
    
    /**
     * Called by {@link LBSailSim.Env.checkoutBoat} to handle creating the actual
     * boat instance. This also loads the boat from the data.
     * @protected
     * @param {object} typeName The boat's type name passed to checkoutBoat().
     * @param {object} boatName The instance name for the boat.
     * @param {object} data The boat data object.
     * @param {object} [loadCallback]   If defined, a callback object with functions that
     * get called back after each component is loaded.
     * @returns {object}    The boat instance.
     */
    _createBoatInstance: function(typeName, boatName, data, loadCallback) {
        var boat = LBSailSim.Vessel.createFromData(data, this, loadCallback);
        boat.boatName = boatName;
        return boat;
    },
    
    /**
     * Called by {@link LBSailSim.Env#checkoutBoat} when a boat has been checked out, lets derived
     * objects update their state.
     * @protected
     * @param {object} boat The boat that was checked out.
     * @param {Object} data The data object that was passed to {@link LBSailSim.Env#checkoutBoat}.
     */
    _boatCheckedOut: function(boat, data) {
        this.boatCallbacks.forEach(
            function(callback) {
                if (callback.onBoatCheckedOut) {
                    callback.onBoatCheckedOut(boat, data);
                }
            },
            this);
    },

    /**
     * Returns a boat that had been checked out.
     * @param {object} boat The boat to return.
     * @returns {Boolean}   True if the boat was returned, false if it had not
     * been checked out.
     */
    returnBoat: function(boat) {
        var boatsOfType = this.boatsByType[boat.typeName];
        if (boatsOfType) {
            if (boatsOfType[boat.boatName] === boat) {
                boatsOfType[boat.boatName] = "";
                this._boatReturned(boat);
                boat.destroy();
                return true;
            }
        }

        return false;
    },

    /**
     * Called by {@link LBSailSim.Env.returnBoat} when a boat has been returned, lets derived
     * objects update their state.
     * <p>
     * This will call the function:
     * <p>
     * onBoatReturned = function(boat) {}
     * <p>
     * for any callbacks that define it.
     * @protected
     * @param {object} boat The boat that was returned.
     */
    _boatReturned: function(boat) {
        this.boatCallbacks.forEach(
            function(callback) {
                if (callback.onBoatReturned) {
                    callback.onBoatReturned(boat);
                }
            },
            this);
    },
    
    /**
     * Call after physics have been updated to handle any pre-rendering updates.
     * @returns {object} this.
     */
    preRender: function() {
        
    },

    /**
     * Call to update the sailing environment state for a new simulation time step.
     * @param {Number} dt   The simulation time step.
     * @returns {object}    this.
     */
    update: function(dt) {
        this.wind.update(dt);
        this.water.update(dt);
        return this;
    }
};


/**
 * The wind manager.
 * @constructor
 * @returns {LBSailSim.Wind}
 */
LBSailSim.Wind = function() {
    /**
     * The density.
     * @member {Number}
     */
    this.density = 1.204;
    
    /**
     * The kinematic viscosity.
     * @member {Number}
     */
    this.kViscosity = 1.48e-5;
    
    /**
     * The average wind speed in m/s.
     * @member {Number}
     */
    this.averageMPS;
    
    /**
     * The average direction the wind is blowing from in degrees.
     * @member {Number}
     */
    this.averageFromDeg = 0;
    
    this.setAverageForce(3);
};

LBSailSim.Wind.BEAUFORT_UPPER_BOUNDARY_KTS = [
    1.5,    // 0
    3.5,
    6.5,
    10.5,   // 3
    16.5,
    21.5,
    27.5,   // 6
    33.5,
    40.5,
    47.5,   // 9
    55.5,
    63.5
];

LBSailSim.Wind.MAX_BEAUFORT_FORCE = 12;

LBSailSim.Wind.prototype = {
    constructor: LBSailSim.Wind,
    
    /**
     * Sets the average speed of the wind using a Beaufort force value.
     * The average speed is set to the mid-value of the speeds for the force value.
     * @param {Number} force    The force on the Beaufort wind scale.
     * @returns {LBSailSim.Wind.prototype}  this.
     */
    setAverageForce: function(force) {
        if (force < 0) {
            force = 0;
        }
        else if (force > LBSailSim.Wind.MAX_BEAUFORT_FORCE) {
            force = LBSailSim.Wind.MAX_BEAUFORT_FORCE;
        }
        
        var minKts = (force > 0) ? LBSailSim.Wind.BEAUFORT_UPPER_BOUNDARY_KTS[force - 1] : 0;
        var maxKts;
        if (force === LBSailSim.Wind.MAX_BEAUFORT_FORCE) {
            maxKts = 2 * LBSailSim.Wind.BEAUFORT_UPPER_BOUNDARY_KTS[force] - LBSailSim.Wind.BEAUFORT_UPPER_BOUNDARY_KTS[force - 1];
        }
        else {
            maxKts = LBSailSim.Wind.BEAUFORT_UPPER_BOUNDARY_KTS[force];
        }
        
        this.averageMPS = LBUtil.kt2mps(0.5 * (minKts + maxKts));
        
        return this;
    },
    
    /**
     * Retrieves the wind velocity at a given point
     * @param {Number} x    The x coordinate.
     * @param {Number} y    The y coordinate.
     * @param {Number} z    The z coordinate.
     * @param {object} vel  The object to receive the velocity.
     * @returns {object}    The object containing the velocity.
     */
    getFlowVelocity: function(x, y, z, vel) {
        var speed = this.averageMPS;
        var headingRad = this.averageFromDeg * LBMath.DEG_TO_RAD;
        var vx = speed * Math.cos(headingRad);
        var vy = speed * Math.sin(headingRad);
        
        if (!vel) {
            return new LBGeometry.Vector3(vx, vy);
        }
        vel.x = vx;
        vel.y = vy;
        vel.z = 0;
        return vel;
    },
    
    /**
     * Calculates a Reynolds number.
     * @param {Number} vel  The speed.
     * @param {Number} len  The length.
     * @returns {Number}    The Reynolds number.
     */
    calcRe: function(vel, len) {
        return vel * len / this.kViscosity; 
    },
    
    /**
     * Called to update the state of the wind.
     * @param {Number} dt   The simulation time step.
     * @returns {LBSailSim.Wind}    this.
     */
    update: function(dt) {
        return this;
    }
};


/**
 * The water manager, its primary responsibility is water currents.
 * @constructor
 * @returns {LBSailSim.Water}
 */
LBSailSim.Water = function() {
    /**
     * Density of the water, fresh water is ~1000, salt water is ~1025 kg/m^3
     */
    this.density = 1025;
    
    /**
     * Kinematic viscosity of the water, salt water is ~1e-6 m^2/s
     */
    this.kViscosity = 1e-6;
};

LBSailSim.Water.prototype = {
    constructor: LBSailSim.Water,
    
    /**
     * Retrieves the water current velocity at a given point
     * @param {Number} x    The x coordinate.
     * @param {Number} y    The y coordinate.
     * @param {Number} z    The z coordinate.
     * @param {object} [vel]  If defined the object to receive the velocity.
     * @returns {object}    The object containing the velocity.
     */
    getFlowVelocity: function(x, y, z, vel) {
        var vx = 0;
        var vy = 0;
        //vy = 0.1;
        //vx = 0.4;
        //vx = -0.5;

        if (!vel) {
            return new LBGeometry.Vector3(vx, vy, 0);
        }
        vel.x = vx;
        vel.y = vy;
        vel.z = 0;
        return vel;
    },
    
    /**
     * Calculates a Reynolds number.
     * @param {Number} vel  The speed.
     * @param {Number} len  The length.
     * @returns {Number}    The Reynolds number.
     */
    calcRe: function(vel, len) {
        return vel * len / this.kViscosity; 
    },
    
    /**
     * Called to update the state of the water.
     * @param {Number} dt   The simulation time step.
     * @returns {LBSailSim.Water}    this.
     */
    update: function(dt) {
        return this;
    }
};


/**
 * Helper that retreives the flow velocity for a given position.
 * @param {object} flow The flow object, such as {@link LBSailEnv.Wind} or {@link LBSailEnv.Water}.
 * @param {object} pos  The coordinates of the position of interest.
 * @param {object} [vel]  If defined the object to receive the velocity.
 * @returns {object}    The flow velocity.
 */
LBSailSim.getFlowVelocity = function(flow, pos, vel) {
    var z = pos.z || 0;
    return flow.getFlowVelocity(pos.x, pos.y, z, vel);
};
