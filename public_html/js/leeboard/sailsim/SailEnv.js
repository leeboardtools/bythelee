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

/* global Leeboard, Phaser, LBGeometry, LBFoils, LBSailSim */

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
     */
    this.boatDatas = {};
    
    /**
     * Each property of boatsByType has the name of the boat type and is an object
     * whose properties correspond to the possible instances of the boat type. These
     * properties have the name of the boat instance and whose value is the actual
     * checked out boat, "" if the boat is not checked out. We use "" instead of
     * undefined so we can distinguish between availability (=== "") and non-existance 
     * (undefined).
     * 
     */
    this.boatsByType = {};
};

LBSailSim.Env.prototype = {
    constructor: LBSailSim.Env,
    
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
        if (Leeboard.isVar(data.instances)) {
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
        var boatData = getBoatData(typeName);
        if (!Leeboard.isVar(boatData)) {
            return false;
        }

        var boatsOfType = this.boatsByType[typeName];
        if (!Leeboard.isVar(boatsOfType)) {
            // The boat type is not supported.
            return false;
        }

        boatName = boatName || typeName;
        var boatInstance = boatsOfType[boatName];
        if (!Leeboard.isVar(boatInstance)) {
            // Boat name for boat type is not supported.
            return false;
        }

        return boatInstance === "";
    },
    

    /**
     * Creates and loads a new boat instance. The boat is attached to the sailing environment.
     * @param {object} typeName The boat's type.
     * @param {object} [boatName] The name of the particular boat instance.
     * @returns {object}    The boat instance, undefined if the boat is not available.
     */
    checkoutBoat: function(typeName, boatName) {
        if (!this.isBoatAvailable(typeName, boatName)) {
            return undefined;
        }

        var boatData = getBoatData(typeName);
        if (!Leeboard.isVar(boatData)) {
            return undefined;
        }

        boat.boatName = boatName || "";
        var boat = _createBoatInstance(typeName, boatName, boatData);
        if (!Leeboard.isVar(boat)) {
            return undefined;
        }

        this.boatsByType[typeName][boatName] = boat;
        this._boatCheckedOut(boat);
        return this;
    },
    
    /**
     * Called by {@link LBSailSim.Env.checkoutBoat} to handle creating the actual
     * boat instance. This also loads the boat from the data.
     * @protected
     * @param {object} typeName The boat's type name passed to checkoutBoat().
     * @param {object} boatName The instance name for the boat.
     * @param {object} data The boat data object.
     * @returns {object}    The boat instance.
     */
    _createBoatInstance: function(typeName, boatName, data) {
        return LBSailSim.Vessel.createFromData(data, this);
    },
    
    /**
     * Called by {@link LBSailSim.Env.checkoutBoat} when a boat has been checked out, lets derived
     * objects update their state.
     * @protected
     * @param {object} boat The boat that was checked out.
     */
    _boatCheckedOut: function(boat) {
    },

    /**
     * Returns a boat that had been checked out.
     * @param {object} boat The boat to return.
     * @returns {Boolean}   True if the boat was returned, false if it had not
     * been checked out.
     */
    returnBoat: function(boat) {
        var boatsOfType = this.boatsByType[boat.typeName];
        if (Leeboard.isVar(boatsOfType)) {
            if (boatsOfType[boat.boatName] === boat) {
                boatsOfType[boat.boatName] = "";
                _boatReturned(boat);
                return true;
            }
        }

        return false;
    },

    /**
     * Called by {@link LBSailSim.Env.returnBoat} when a boat has been returned, lets derived
     * objects update their state.
     * @protected
     * @param {object} boat The boat that was returned.
     */
    _boatReturned: function(boat) {
    },

    /**
     * Call to update the sailing environment state for a new simulation time step.
     * @param {number} dt   The simulation time step.
     * @returns {undefined}
     */
    update: function(dt) {
        this.wind.update(dt);
        this.water.update(dt);
    }
};


/**
 * The wind manager.
 * @constructor
 * @returns {LBSailSim.Wind}
 */
LBSailSim.Wind = function() {
    this.density = 1.204;
};

LBSailSim.Wind.prototype = {
    constructor: LBSailSim.Wind,
    
    /**
     * Retrieves the wind velocity at a given point
     * @param {number} x    The x coordinate.
     * @param {number} y    The y coordinate.
     * @param {number} z    The z coordinate.
     * @param {object} vel  The object to receive the velocity.
     * @returns {object}    The object containing the velocity.
     */
    getFlowVelocity: function(x, y, z, vel) {
        var vx = 4;
        var vy = 0;

        if (!Leeboard.isVar(vel)) {
            return LBGeometry.createVector3(vx, vy);
        }
        vel.x = vx;
        vel.y = vy;
        vel.z = 0;
        return vel;
    },
    
    /**
     * Called to update the state of the wind.
     * @param {number} dt   The simulation time step.
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
    this.density = 1000;
};

LBSailSim.Water.prototype = {
    constructor: LBSailSim.Water,
    
    /**
     * Retrieves the water current velocity at a given point
     * @param {number} x    The x coordinate.
     * @param {number} y    The y coordinate.
     * @param {number} z    The z coordinate.
     * @param {object} [vel]  If defined the object to receive the velocity.
     * @returns {object}    The object containing the velocity.
     */
    getFlowVelocity: function(x, y, z, vel) {
        var vx = 0;
        var vy = 0.1;

        if (!Leeboard.isVar(vel)) {
            return new LBGeometry.createVector3(vx, vy, 0);
        }
        vel.x = vx;
        vel.y = vy;
        vel.z = 0;
    },
    
    /**
     * Called to update the state of the water.
     * @param {number} dt   The simulation time step.
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
