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

/*
 * A vessel is something that floats and can potentially hold other things?
 */

/* global Leeboard */

Leeboard.FoilInstance = function(foil, obj3D, mass, centerOfMass) {
    Leeboard.RigidBody.call(this, obj3D, mass, centerOfMass);
    this.foil = foil || new Leeboard.Foil();
    this.workingPos = Leeboard.createVector3();
};

Leeboard.FoilInstance.prototype = Object.create(Leeboard.RigidBody.prototype);
Leeboard.FoilInstance.prototype.constructor = Leeboard.FoilInstance;

Leeboard.FoilInstance.prototype.updateFoilForce = function(dt, flow) {
    this.workingPos.copy(0, 0, this.foil.sliceZ);
    this.workingPos.applyMatrix4(this.coords.worldXfrm);
    
    this.workingQInf = Leeboard.getFlowVelocity(flow, this.workingPos, this.workingQInf);
    this.workingResultant = this.foil.calcWorldForce(flow.density, this.workingQInf,
            this.coords);
    this.addWorldResultant(this.workingResultant);
};

Leeboard.FoilInstance.prototype.load = function(data, sailEnv) {
    Leeboard.RigidBody.prototype.load.call(this, data);
    if (Leeboard.isVar(data.foil)) {
        this.foil = Leeboard.createFoilFromData(data.foil, sailEnv);
    }
    return this;
};


Leeboard.Propulsor = function(obj3D, maxForce) {
    Leeboard.RigidBody.call(this, obj3D, 0);
    this.forceMag = 0;
    this.forceDir = Leeboard.createVector3(1, 0, 0);
    this.maxForce = maxForce || Number.MAX_VALUE;
    
    this.workingForce = Leeboard.createVector3();
    this.workingPos = Leeboard.createVector3();
};

Leeboard.Propulsor.prototype = Object.create(Leeboard.RigidBody.prototype);
Leeboard.Propulsor.prototype.constructor = Leeboard.Propulsor;

Leeboard.Propulsor.prototype.updateForce = function(dt) {
    var forceMag = Leeboard.clamp(this.forceMag, 0, this.maxForce);
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


Leeboard.Vessel = function(obj3D) {
    Leeboard.RigidBody.call(this, obj3D);

    this.hydroFoils = [];
    this.aeroFoils = [];
    this.propulsors = [];
    
    // Later:
    //this.crew = [];
    //this.ballast = [];

};

Leeboard.Vessel.prototype = Object.create(Leeboard.RigidBody.prototype);
Leeboard.Vessel.prototype.constructor = Leeboard.Vessel;

Leeboard.Vessel.prototype.addAeroFoil = function(foilInstance) {
    this.aeroFoils.push(foilInstance);
    this.addPart(foilInstance);
    return this;
};

Leeboard.Vessel.prototype.addHydroFoil = function(foilInstance) {
    this.hydroFoils.push(foilInstance);
    this.addPart(foilInstance);
    return this;
};

Leeboard.Vessel.prototype.addPropulsor = function(propulsor) {
    this.propulsors.push(propulsor);
    this.addPart(propulsor);
    return this;
};

Leeboard.Vessel.prototype.removeParts = function(foils) {
    for (var i = 0; i < foils.length; ++i) {
        this.removePart(foils[i]);
    }
    foils.splice(0, foils.length);
    return foils;
};

Leeboard.Vessel.prototype.createFoilInstanceForLoad = function(data, sailEnv) {
    if (Leeboard.isVar(data.construct)) {
        return eval(data.construct);
    }
    
    return new FoilInstance();
};

Leeboard.Vessel.prototype.loadFoilInstance = function(data, sailEnv) {    
    var foilInstance = this.createFoilInstanceForLoad(data, sailEnv);
    if (Leeboard.isVar(foilInstance)) {
        foilInstance.load(data, sailEnv);
    }    
    return foilInstance;
};

Leeboard.Vessel.prototype.loadFoils = function(data, foils, sailEnv) {
    if (!Leeboard.isVar(data)) {
        return;
    }
    
    for (var i = 0; i < data.length; ++i) {
        var foilData = data[i];
        var foilInstance = this.loadFoilInstance(foilData, sailEnv);
        if (Leeboard.isVar(foilInstance)) {
            foils.push(foilInstance);
            this.addPart(foilInstance);
        }
    }
}

Leeboard.Vessel.prototype.loadPropulsors = function(data) {
    
}

Leeboard.Vessel.prototype.load = function(data, sailEnv) {
    // Clear out the existing settings...
    this.aeroFoils = this.removeParts(this.aeroFoils);
    this.hydroFoils = this.removeParts(this.hydroFoils);
    this.propulsors = this.removeParts(this.propulsors);
    
    Leeboard.RigidBody.prototype.load.call(this, data);
    
    this.loadFoils(data.aeroFoils, this.aeroFoils, sailEnv);
    this.loadFoils(data.hydroFoils, this.hydroFoils, sailEnv);
    this.loadPropulsors(data.propulsors);
    
    return this;
};

Leeboard.Vessel.prototype.updateFoilForces = function(dt, sailEnv, flow, foils) {
    for (var i = 0; i < foils.length; ++i) {
        foils[i].updateFoilForce(dt, flow);
    }
    return this;
};

Leeboard.Vessel.prototype.updateForces = function(dt, sailEnv) {
    this.clearForces();
    
    this.updateCoords(dt);
    
    this.updateFoilForces(dt, sailEnv, sailEnv.wind, this.aeroFoils);
    this.updateFoilForces(dt, sailEnv, sailEnv.water, this.hydroFoils);
    
    for (var i = 0; i < this.propulsors.length; ++i) {
        this.propulsors[i].updateForce(dt);
    }
    
    // Need the hull resistance...
    
    return this;
};
