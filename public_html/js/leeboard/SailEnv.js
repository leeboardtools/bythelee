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

/* global Leeboard, Phaser */

/**
 * The main sailing environment, basically the sailing world.
 * @class SailEnv
 * @constructor
 * @returns {Leeboard.SailEnv}
 */
Leeboard.SailEnv = function() {
    this.wind = new Leeboard.Wind();
    this.water = new Leeboard.Water();
    
    this.clCdCurves = [];
};

Leeboard.SailEnv.prototype = {
    constructor: Leeboard.SailEnv,
    
    load: function(data) {
        data.clCdCurves.forEach(this._loadClCdCurve, this);
    },
    
    _loadClCdCurve: function(data) {
        var clCdCurve = new Leeboard.ClCdCurve();
        clCdCurve.load(data);
        this.clCdCurves[clCdCurve.name] = clCdCurve;
    },
    
    getClCdCurve: function(name) {
        return this.clCdCurves[name];
    },
    
    update: function() {
        this.wind.update();
        this.water.update();
    }
};


/**
 * The wind manager.
 * @returns {Leeboard.Wind}
 */
Leeboard.Wind = function() {
    this.density = 1.204;
};

Leeboard.Wind.prototype = {
    constructor: Leeboard.Wind,
    
    getFlowVelocity: function(x, y, z, vel) {
        var vx = 4;
        var vy = 0;

        if (!Leeboard.isVar(vel)) {
            return Leeboard.createVector2(vx, vy);
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
 * @returns {Leeboard.Water}
 */
Leeboard.Water = function() {
    this.density = 1000;
};

Leeboard.Water.prototype = {
    constructor: Leeboard.Water,
    
    getFlowVelocity: function(x, y, z, vel) {
        var vx = 0;
        var vy = 0.1;

        if (!Leeboard.isVar(vel)) {
            return new Leeboard.createVector2(vx, vy);
        }
        vel.x = vx;
        vel.y = vy;
        return vel;
    },
    
    update: function() {
        
    }
};


Leeboard.getFlowVelocity = function(flow, pos, vel) {
    var z = pos.z || 0;
    return flow.getFlowVelocity(pos.x, pos.y, pos.z, vel);
};
