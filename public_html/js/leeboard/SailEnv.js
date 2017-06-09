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

/* global Leeboard, Phaser, LBGeometry */

/**
 * 
 * @namespace LBSailEnv
 */
var LBSailEnv = LBSailEnv || {};

/**
 * The main sailing environment, basically the sailing world.
 * @class SailEnv
 * @constructor
 * @returns {LBSailEnv.Env}
 */
LBSailEnv.Env = function() {
    this.wind = new LBSailEnv.Wind();
    this.water = new LBSailEnv.Water();
    
    this.clCdCurves = [];
    this.boatDatas = [];
};

LBSailEnv.Env.prototype = {
    constructor: LBSailEnv.Env,
    
    loadClCdCurves: function(data) {
        data.clCdCurves.forEach(this._loadClCdCurve, this);
    },
    
    _loadClCdCurve: function(data) {
        var clCdCurve = new LBFoils.ClCdCurve();
        clCdCurve.load(data);
        this.clCdCurves[clCdCurve.name] = clCdCurve;
    },
    
    
    getClCdCurve: function(name) {
        return this.clCdCurves[name];
    },
    
    
    loadBoatDatas: function(data) {
        data.boats.forEach(this._loadBoatData, this);
    },
    
    _loadBoatData: function(data) {
        this.boatDatas.push(data);
    },
    
    
    update: function() {
        this.wind.update();
        this.water.update();
    }
};


/**
 * The wind manager.
 * @constructor
 * @returns {LBSailEnv.Wind}
 */
LBSailEnv.Wind = function() {
    this.density = 1.204;
};

LBSailEnv.Wind.prototype = {
    constructor: LBSailEnv.Wind,
    
    getFlowVelocity: function(x, y, z, vel) {
        var vx = 4;
        var vy = 0;

        if (!Leeboard.isVar(vel)) {
            return LBGeometry.createVector2(vx, vy);
        }
        vel.x = vx;
        vel.y = vy;
        return vel;
    },
    
    update: function() {
        
    }
};


/**
 * The water manager, its primary responsibility is water currents.
 * @constructor
 * @returns {LBSailEnv.Water}
 */
LBSailEnv.Water = function() {
    this.density = 1000;
};

LBSailEnv.Water.prototype = {
    constructor: LBSailEnv.Water,
    
    getFlowVelocity: function(x, y, z, vel) {
        var vx = 0;
        var vy = 0.1;

        if (!Leeboard.isVar(vel)) {
            return new LBGeometry.createVector2(vx, vy);
        }
        vel.x = vx;
        vel.y = vy;
        return vel;
    },
    
    update: function() {
        
    }
};


LBSailEnv.getFlowVelocity = function(flow, pos, vel) {
    var z = pos.z || 0;
    return flow.getFlowVelocity(pos.x, pos.y, pos.z, vel);
};
