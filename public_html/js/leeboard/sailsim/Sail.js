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


/* global LBSailSim, LBFoils */

LBSailSim.SailFoil = function(sailInstance) {
    LBFoils.Foil.call(this);
    this.sailInstance = sailInstance;
};

LBSailSim.SailFoil.prototype = Object.create(LBFoils.Foil.prototype);
LBSailSim.SailFoil.prototype.constructor = LBSailSim.SailFoil;

LBSailSim.SailFoil.prototype.calcLocalLiftDragMoment = function(rho, qInfLocal, store, details) {
    var result = LBFoils.Foil.prototype.calcLocalLiftDragMoment.call(rho, qInfLocal, store, details);
    
    // TODO: Apply the reefing factor, flatness factor.
    
    // The Cl/Cd curve will be from the books...
    // Need a luffing state.
    
    return result;
};

LBSailSim.SailInstance = function() {
    var foil = new LBSailSim.SailFoil(this);
    LBSailSim.FoilInstance.call(this, foil);
    
    this.flatness = 1;
    this.twist = 1;
    this.reef = 1;
    this.vreef = 1;    
};

LBSailSim.SailInstance.prototype = Object.create(LBSailSim.FoilInstance.prototype);
LBSailSim.SailInstance.prototype.constructor = LBSailSim.SailInstance;

