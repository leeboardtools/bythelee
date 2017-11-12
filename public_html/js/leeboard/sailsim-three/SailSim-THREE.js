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


define(['lbsailsim', 'lbcannonphysicslink', 'three', 'lbgeometry', 'lbassets', 'lbui3d', 'lbwater3d', 'lbsky3d', 'lbwakes3d', 'lbwind3d', 'tween'], 
function(LBSailSim, LBCannonPhysicsLink, THREE, LBGeometry, LBAssets, LBUI3d, LBWater3D, LBSky3D, LBWakes3D, LBWind3D, TWEEN) {
    
    'use strict';


/**
 * An implementation of {@link LBSailSim.Env} for use with {@link Phaser.Physics.P2} or Cannon physics.
 * This pretty much just ties together the physics link and the sailing environment.
 * @constructor
 * @extends {LBSailSim.SailEnv}
 * @param {module:LBUI3d.App3D} app3D   The app calling this.
 * @param {module:LBUI3d.View3D} mainView   The main view of the app.
 * @param {LBSailSim.SailEnvTHREE.CANNON_PHYSICS} physicsType  The physics engine to use.
 * @param {module:LBAssets.Loader} [assetLoader]   The optional asset loader.
 * @returns {LBSailSim.SailEnvTHREE}
 */
LBSailSim.SailEnvTHREE = function(app3D, mainView, physicsType, assetLoader) {
    LBSailSim.Env.call(this, assetLoader);
    
    this.app3D = app3D;
    this.mainView = mainView;
    
    this.physicsType = physicsType;
    
    switch (physicsType) {
        case LBSailSim.SailEnvTHREE.CANNON_PHYSICS :
        case undefined :
            this.physicsLink = new LBCannonPhysicsLink.Link();
            break;
    }
    
    this.water3D = new LBSailSim.Water3D(app3D.mainScene, this);
    this.wakes3D = new LBSailSim.Wakes3D(app3D.mainScene, this);
    this.sky3D = new LBSailSim.Sky3D(app3D.mainScene, this);
    
    // For testing...
    //this.water3D.waterMesh.visible = false;
    //this.sky3D.skyMesh.visible = false;
    
//    this.envGroup = new THREE.Group();
//    this.app3D.mainScene.add(this.envGroup);

    this.envGroup = this.app3D.mainScene;
};


/**
 * Value to pass to {@link LBSailSim.SailEnvTHREE}'s contructor to use the Cannon JS physics engine.
 * @constant
 * @type {Number}
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
        this.app3D.mainScene.loadJSONModel(objectDef.threeModel, function(model) {
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
        this.app3D.mainScene.loadJSONModel(data.threeModel, function(model) {
            boat._lbThreeModel = model;
            me.envGroup.add(model);
            
            loadVesselPartModel(me, boat.spars, model, me.app3D.mainScene);
            loadVesselPartModel(me, boat.lines, model, me.app3D.mainScene);
            loadVesselPartModel(me, boat.windIndicators, model, me.app3D.mainScene);
            loadVesselPartModel(me, boat.hydrofoils, model, me.app3D.mainScene);
            loadVesselPartModel(me, boat.airfoils, model, me.app3D.mainScene);
        });
    }
    
    this.wakes3D.addVessel(boat);
};

function loadVesselPartModel(sailEnv, parts, parentModel, mainScene) {
    parts.forEach(function(rigidBody) {
        var partData = rigidBody.loadData;
        if (partData) {
            if (partData.telltale3D) {
                rigidBody._lbTelltale = LBSailSim.Telltale3D.createFromData(sailEnv, partData.telltale3D);
                rigidBody._lbThreeModel = rigidBody._lbTelltale;
                parentModel.add(rigidBody._lbThreeModel);
            }
            else {
                mainScene.loadModelFromData(partData, function(model) {
                    rigidBody._lbThreeModel = model;
                    parentModel.add(model);

                    if (rigidBody.sailSurface) {
                        mapSailSurfaceToModel(rigidBody.sailSurface, model);
                    }
                });
            }
        }
    });
};

function vector3ToTHREEDistanceSq(vec, vecThree) {
    var dx = vec.x - vecThree.x;
    var dy = vec.y - vecThree.z;
    var dz = vec.z + vecThree.y;
    return dx * dx + dy * dy + dz * dz;
};

function mapSailSurfaceToModel(sailSurface, model) {
    var vertices = model.geometry.vertices;
    var vertexIndices = [];
    var vertexCount = vertices.length;
    for (var i = 0; i < vertexCount; ++i) {
        vertexIndices.push(i);
    }
    
    sailSurface.slices.forEach(function(slice) {
        for (var j = 0; j < slice.points.length; ++j) {
            var minIndex = 0;
            var minDistanceSq = vector3ToTHREEDistanceSq(slice.points[j], vertices[vertexIndices[minIndex]]);
            for (var k = 1; k < vertexIndices.length; ++k) {
                var distanceSq = vector3ToTHREEDistanceSq(slice.points[j], vertices[vertexIndices[k]]);
                if (distanceSq < minDistanceSq) {
                    minDistanceSq = distanceSq;
                    minIndex = k;
                }
            }
            
            slice.indexMapping[j] = vertexIndices[minIndex];
            vertexIndices.splice(minIndex, 1);
            if (!vertexIndices.length) {
                break;
            }
        }
    });
    
    // If there are extra vertices, look for the slices that only have two points
    // and see if they lie on those slices. If they do, we need to add them somehow.
};

LBSailSim.SailEnvTHREE.prototype._boatReturned = function(boat) {
    this.wakes3D.removeVessel(boat);
    LBSailSim.Env.prototype._boatReturned.call(this, boat);
    this.physicsLink.removeRigidBody(boat);
};

/**
 * The main simulation update method, call from the {@link module:LBUI3d.App3D}'s update() method.
 * @param {Number} dt   The time step.
 * @returns {undefined}
 */
LBSailSim.SailEnvTHREE.prototype.update = function(dt) {
    dt = dt || this.physicsLink.timeStep();
    
    dt = this.physicsLink.timeStep();
    
    TWEEN.update(this.app3D.runMillisecs);
    LBSailSim.Env.prototype.update.call(this, dt);
    
    this.physicsLink.update(dt);
    
    // Don't have to call updateDisplayObjects()...
    //this.physicsLink.updateDisplayObjects();
    this.physicsLink.rigidBodies.forEach(LBSailSim.SailEnvTHREE.updateThreeModelFromRigidBody);
    
    this.sky3D.update(dt);
    this.water3D.update(dt);
    this.wakes3D.update(dt);
};

LBSailSim.SailEnvTHREE.updateThreeModelFromRigidBody = function(rigidBody) {
    var model = rigidBody._lbThreeModel;
    if (model) {
        if (rigidBody.sailSurface) {
            rigidBody.sailSurface.slices.forEach(function(slice) {
                var count = slice.indexMapping.length;
                for (var i = 0; i < count; ++i) {
                    var index = slice.indexMapping[i];
                    LBSailSim.SailEnvTHREE.copyVectorToTHREE(slice.points[i], model.geometry.vertices[index]);
                }
            });
            model.geometry.verticesNeedUpdate = true;
        }
        
        var obj3D = rigidBody.obj3D;
        LBSailSim.SailEnvTHREE.copyVectorToTHREE(obj3D.position, model.position);
        if (!model.noLBOrientationCopy) {
            LBSailSim.SailEnvTHREE.copyQuaternionToTHREE(obj3D.quaternion, model.quaternion);
        }
        model.updateMatrixWorld(true);
    }
    
    rigidBody.parts.forEach(LBSailSim.SailEnvTHREE.updateThreeModelFromRigidBody);
};

LBSailSim.SailEnvTHREE.copyVectorToTHREE = LBUI3d.ZIsUpCoordMapping.vector3ToThreeJS;

LBSailSim.SailEnvTHREE.copyQuaternionToTHREE = LBUI3d.ZIsUpCoordMapping.quaternionToThreeJS;;

LBSailSim.SailEnvTHREE.copyEulerToTHREE = LBUI3d.ZIsUpCoordMapping.eulerToThreeJS;;

return LBSailSim;
});