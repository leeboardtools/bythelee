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
    this.foil = foil;
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


Leeboard.Propulsor = function(obj3D) {
    this.forceMag = 0;
    this.workingPos = Leeboard.createVector3();
};

Leeboard.Propulsor.prototype = Object.create(Leeboard.RigidBody.prototype);
Leeboard.Propulsor.prototype.constructor = Leeboard.Propulsor;

Leeboard.Propulsor.prototype.updateForce = function(dt) {
    
};


Leeboard.Vessel = function() {
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

Leeboard.Vessel.prototype.load = function(data) {
    
    return this;
};

Leeboard.Vessel.prototyp.updateFoilForces = function(dt, sailEnv, flow, foils) {
    for (var i = 0; i < foils.length; ++i) {
        foils[i].updateFoilForce(dt, flow);
    }
    return this;
};

Leeboard.Vessel.prototype.updateForces = function(dt, sailEnv) {
    this.updateCoords(dt);
    
    this.updateFoilForces(dt, sailEnv, sailEnv.wind, this.aeroFoils);
    this.updateFoilForces(dt, sailEnv, sailEnv.water, this.hydroFoils);
    
    // Need the hull resistance...
    
    return this;
};
