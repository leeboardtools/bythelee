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


define(['lbsailsim', 'lbcannon', 'three', 'lbgeometry', 'lbassets'], function(LBSailSim, LBCannon, THREE, LBGeometry, LBAssets) {
    

/**
 * An implementation of {@link LBSailSim.Env} for use with {@link Phaser.Physics.P2} or Cannon physics.
 * This pretty much just ties together the physics link and the sailing environment.
 * @constructor
 * @param {LBSailSim.SailEnvTHREE.CANNON_PHYSICS} physicsType  The physics engine to use.
 * @param {LBApp3D} app3d   The app calling this.
 * @param {LBAssets.Loader} [assetLoader]   The optional asset loader.
 * @returns {LBSailSim.SailEnvTHREE}
 */
LBSailSim.SailEnvTHREE = function(app3d, physicsType, assetLoader) {
    LBSailSim.Env.call(this, assetLoader);
    
    this.app3d = app3d;
    this.physicsType = physicsType;
    
    switch (physicsType) {
        case LBSailSim.SailEnvTHREE.CANNON_PHYSICS :
        case undefined :
            this.physicsLink = new LBCannon.CannonPhysicsLink();
            break;
    }
    
    this.envGroup = new THREE.Group();
    this.app3d.mainScene.scene.add(this.envGroup);
};


/**
 * Value to pass to {@link LBSailSim.SailEnvTHREE}'s contructor to use the Cannon JS physics engine.
 * @constant
 * @type Number
 */
LBSailSim.SailEnvTHREE.CANNON_PHYSICS = 0;

LBSailSim.SailEnvTHREE.prototype = Object.create(LBSailSim.Env.prototype);
LBSailSim.SailEnvTHREE.prototype.constructor = LBSailSim.SailEnvTHREE;

LBSailSim.SailEnvTHREE.prototype.clearEnv = function() {
    LBSailSim.Env.prototype.clearEnv.call(this);
    
    while (this.envGroup.children.length > 0) {
        this.envGroup.remove(this.envGroup.children[0]);
    }
};

LBSailSim.SailEnvTHREE.prototype.floatingObjectLoaded = function(data, rigidBody, objectDef) {
    LBSailSim.Env.prototype.floatingObjectLoaded.call(this, data, rigidBody, objectDef);
    
    var me = this;
    if (objectDef && objectDef.threeModel) {
        this.app3d.mainScene.loadJSONModel(objectDef.threeModel, function(model) {
            rigidBody._lbThreeModel = model;
            me.envGroup.add(model);            
            LBSailSim.SailEnvTHREE.updateThreeModelFromRigidBody(rigidBody);
        });
    }
    //this.physicsLink.addRigidBody(rigidBody, data);
    this.physicsLink.addFixedObject(rigidBody);
};


LBSailSim.SailEnvTHREE.prototype._boatCheckedOut = function(boat, data) {
    this.physicsLink.addRigidBody(boat, data);
    LBSailSim.Env.prototype._boatCheckedOut.call(this, boat, data);
    
    var me = this;
    if (data.threeModel) {
        this.app3d.mainScene.loadJSONModel(data.threeModel, function(model) {
            boat._lbThreeModel = model;
            me.envGroup.add(model);
            
            loadVesselPartModel(boat.spars, model, me.app3d.mainScene);
            loadVesselPartModel(boat.hydrofoils, model, me.app3d.mainScene);
            loadVesselPartModel(boat.airfoils, model, me.app3d.mainScene);
        });
    }
};

function loadVesselPartModel(parts, parentModel, mainScene) {
    parts.forEach(function(rigidBody) {
        var partData = rigidBody.loadData;
        if (partData && partData.threeModel) {
            mainScene.loadJSONModel(partData.threeModel, function(model) {
                rigidBody._lbThreeModel = model;
                parentModel.add(model);
            });
        }
    });
};

LBSailSim.SailEnvTHREE.prototype._boatReturned = function(boat) {
    LBSailSim.Env.prototype._boatReturned.call(this, boat);
    this.physicsLink.removeRigidBody(boat);
};

/**
 * The main simulation update method, call from the {@link LBUI3d.App3D}'s update() method.
 * @returns {undefined}
 */
LBSailSim.SailEnvTHREE.prototype.update = function() {
    var dt = this.physicsLink.timeStep();
    LBSailSim.Env.prototype.update.call(this, dt);
    
    this.physicsLink.update(dt);
    
    // Don't have to call updateDisplayObjects()...
    //this.physicsLink.updateDisplayObjects();
    this.physicsLink.rigidBodies.forEach(LBSailSim.SailEnvTHREE.updateThreeModelFromRigidBody);
};


LBSailSim.SailEnvTHREE.updateThreeModelFromRigidBody = function(rigidBody) {
    var model = rigidBody._lbThreeModel;
    if (model) {
        var obj3D = rigidBody.obj3D;
        model.position.set(obj3D.position.x, obj3D.position.z, -obj3D.position.y);
        model.rotation.set(obj3D.rotation.x, obj3D.rotation.z, -obj3D.rotation.y, obj3D.rotation.w);
        model.updateMatrixWorld(true);
    }
    
    rigidBody.parts.forEach(LBSailSim.SailEnvTHREE.updateThreeModelFromRigidBody);
};

return LBSailSim;
});