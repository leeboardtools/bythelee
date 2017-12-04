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


define(['lbsailsim', 'lbcannonphysicslink', 'lbrandom', 'lbui3d', 'lbgeometry', 'lbwater3d', 'lbsky3d', 'lbwakes3d', 'lbwind3d', 'tween', 'three'], 
function(LBSailSim, LBCannonPhysicsLink, LBRandom, LBUI3d, LBGeometry, LBWater3D, LBSky3D, LBWakes3D, LBWind3D, TWEEN, THREE) {
    
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
    
    this.physicsLink.addForceGenerator(this.buoyancyGenerator);
    this.physicsLink.addForceGenerator(this.dampingGenerator);
    
    this.sky3D = new LBSailSim.Sky3D(app3D.mainScene, this);
    this.water3D = new LBSailSim.Water3D(app3D.mainScene, this);
    this.wakes3D = new LBSailSim.Wakes3D(app3D.mainScene, this);
    
    this.runningAvgCount = 60;
    this.dtRunningAvg = new LBRandom.RunningAverage(this.runningAvgCount);
    
    // Prep the running average to try to smooth over startup...
    var dt = 1/60;
    for (var i = 0; i < this.runningAvgCount; ++i) {
        this.dtRunningAvg.addValue(dt);
    }
    
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
};


LBSailSim.SailEnvTHREE.prototype._boatCheckedOut = function(boat, data) {
    this.physicsLink.addRigidBody(boat, data);
    LBSailSim.Env.prototype._boatCheckedOut.call(this, boat, data);
    
    var me = this;
    if (data.threeModel) {
        this.app3D.mainScene.loadJSONModel(data.threeModel, function(model) {
            boat._lbThreeModel = model;
            me.envGroup.add(model);
            
            loadVesselPartModel(me, boat.spars, model, me.app3D.mainScene, boat);
            loadVesselPartModel(me, boat.lines, model, me.app3D.mainScene, boat);
            loadVesselPartModel(me, boat.windIndicators, model, me.app3D.mainScene, boat);
            loadVesselPartModel(me, boat.hydrofoils, model, me.app3D.mainScene, boat);
            loadVesselPartModel(me, boat.airfoils, model, me.app3D.mainScene, boat);
        });
    }
    
    this.wakes3D.addVessel(boat);
};

function loadVesselPartModel(sailEnv, parts, parentModel, mainScene, boat) {
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
                        
                        customizeSail(boat, rigidBody);
                    }
                });
            }
        }
    });
};

function customizeSail(boat, sail) {
    if (!boat.boatInstanceData || !boat.boatInstanceData.sails) {
        return;
    }
    
    var sailData = boat.boatInstanceData.sails[sail.name];
    if (!sailData) {
        return;
    }
    
    if (sailData.color) {
        var material = sail._lbThreeModel.material;
        if (Array.isArray(material)) {
            material = material[0];
        }
        if (material) {
            material.color = LBGeometry.Color.createFromData(sailData.color, material.color);
        }
    }
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
 * Changes the display of a race course. This pretty much calls {@link module:LBSailSim.SailEnvTHREE.displayMark}
 * for all the marks of the course.
 * @param {module:LBRacing.Course} course   The race course.
 * @param {Number} displayFlags Combination of {@link module:LBSailSim.CourseDisplayFlags}, 0 indicates hide everything.
 */
LBSailSim.SailEnvTHREE.prototype.displayCourse = function(course, displayFlags) {
    this.displayMark(course.start, displayFlags);
    
    course.marks.forEach(function(mark) {
        this.displayMark(mark, displayFlags);
    }, this);
    
    this.displayMark(course.finish, displayFlags);
};

/**
 * Flags for controlling how race course components are displayed.
 * @enum
 */
LBSailSim.CourseDisplayFlags = {
    CROSSING_LINES:         0x00000001,
    MARK_INDICATORS:        0x00000002
};

var _crossingLineDisplayZ = 0.1;
var _markIndicatorDisplayZ = 10;

/**
 * Changes the display of a mark.
 * @param {module:LBRacing.Mark} mark   The mark.
 * @param {Number} displayFlags Combination of {@link module:LBSailSim.CourseDisplayFlags}, 0 indicates hide everything.
 */
LBSailSim.SailEnvTHREE.prototype.displayMark = function(mark, displayFlags) {
    displayFlags = displayFlags || 0;
    var scene3D = this.app3D.mainScene;
    if (!displayFlags) {
        if (mark._lbCrossingLinesMesh) {
            scene3D.remove(mark._lbCrossingLinesMesh);
            mark._lbCrossingLinesMesh = undefined;
        }
        if (mark._lbMarkIndicatorMeshes) {
            scene3D.remove(mark._lbMarkIndicatorMeshes);
            mark._lbMarkIndicatorMeshes = undefined;
        }
    }
    else {
        if (!this.markDisplayMaterial) {
            this.markDisplayMaterial = new THREE.LineBasicMaterial({
                transparent: true,
                opacity: 0.25,
                linewidth: 5,
                color: 0xFFFF00
            });
        }
        if (displayFlags & LBSailSim.CourseDisplayFlags.CROSSING_LINES) {
            if (!mark._lbCrossingLinesMesh) {
                var geometry = new THREE.BufferGeometry();
                var basePos = mark.getMarkBasePosition();
                var endPos = mark.getMarkEndPosition();
                var z = _crossingLineDisplayZ;
                var vertices = new Float32Array([
                    basePos.x, basePos.y, z,
                    endPos.x, endPos.y, z
                ]);
                scene3D.coordMapping.xyzToThreeJS(vertices, 0, vertices, 0);
                scene3D.coordMapping.xyzToThreeJS(vertices, 3, vertices, 3);
                geometry.addAttribute('position', new THREE.BufferAttribute(vertices, 3));
                mark._lbCrossingLinesMesh = new THREE.Line(geometry, this.markDisplayMaterial);
                scene3D.add(mark._lbCrossingLinesMesh);
            }
        }
        if (displayFlags & LBSailSim.CourseDisplayFlags.MARK_INDICATORS) {
            var z = _markIndicatorDisplayZ;
            if (!mark._lbMarkIndicatorMeshes) {
                mark._lbMarkIndicatorMeshes = [];
                var geometry = new THREE.BufferGeometry();
                var pos = mark.getMarkBasePosition();
                var vertices = new Float32Array([
                    pos.x, pos.y, 0,
                    pos.x, pos.y, z
                ]);
                scene3D.coordMapping.xyzToThreeJS(vertices, 0, vertices, 0);
                scene3D.coordMapping.xyzToThreeJS(vertices, 3, vertices, 3);
                geometry.addAttribute('position', new THREE.BufferAttribute(vertices, 3));
                var mesh = new THREE.Line(geometry, this.markDisplayMaterial);
                scene3D.add(mesh);
                mark._lbMarkIndicatorMeshes.push(mesh);
                
                if (mark.isCrossingLineSegment()) {
                    var geometry = new THREE.BufferGeometry();
                    var pos = mark.getMarkEndPosition();
                    var vertices = new Float32Array([
                        pos.x, pos.y, 0,
                        pos.x, pos.y, z
                    ]);
                    scene3D.coordMapping.xyzToThreeJS(vertices, 0, vertices, 0);
                    scene3D.coordMapping.xyzToThreeJS(vertices, 3, vertices, 3);
                    geometry.addAttribute('position', new THREE.BufferAttribute(vertices, 3));
                    var mesh = new THREE.Line(geometry, this.markDisplayMaterial);
                    scene3D.add(mesh);
                    mark._lbMarkIndicatorMeshes.push(mesh);
                }
            }
        }
    }
};


/**
 * Call to update the display of a race course.
 * @param {module:LBRacing.Course} course   The race course.
 */
LBSailSim.SailEnvTHREE.prototype.updateCourseDisplay = function(course) {
    this.updateMarkDisplay(course.start);
    course.marks.forEach(function(mark) {
        this.updateMarkDisplay(mark);
    }, this);
};

/**
 * Call to update the display of a mark.
 * @param {module:LBRacing.Mark} mark   The mark.
 */
LBSailSim.SailEnvTHREE.prototype.updateMarkDisplay = function(mark) {
    var scene3D = this.app3D.mainScene;
    if (mark._lbCrossingLinesMesh) {
        var positionAttribute = mark._lbCrossingLinesMesh.geometry.getAttribute('position');
        var positions = positionAttribute.array;
        var basePos = mark.getMarkBasePosition();
        var endPos = mark.getMarkEndPosition();
        positions[0] = basePos.x;
        positions[1] = basePos.y;
        positions[2] = positions[5] = _crossingLineDisplayZ;
        positions[3] = endPos.x;
        positions[4] = endPos.y;
        scene3D.coordMapping.xyzToThreeJS(positions, 0, positions, 0);
        scene3D.coordMapping.xyzToThreeJS(positions, 3, positions, 3);
        
        positionAttribute.needsUpdate = true;
    }
    
    if (mark._lbMarkIndicatorMeshes) {
        var pos = mark.getMarkBasePosition();
        var positionAttribute = mark._lbMarkIndicatorMeshes[0].geometry.getAttribute('position');
        var positions = positionAttribute.array;
        positions[0] = positions[3] = pos.x;
        positions[1] = positions[4] = pos.y;
        positions[2] = 0;
        positions[5] = _markIndicatorDisplayZ;
        
        scene3D.coordMapping.xyzToThreeJS(positions, 0, positions, 0);
        scene3D.coordMapping.xyzToThreeJS(positions, 3, positions, 3);
        positionAttribute.needsUpdate = true;
        
        if (mark._lbMarkIndicatorMeshes.length > 1) {
            pos = mark.getMarkEndPosition();
            positionAttribute = mark._lbMarkIndicatorMeshes[1].geometry.getAttribute('position');
            positions = positionAttribute.array;
            positions[0] = positions[3] = pos.x;
            positions[1] = positions[4] = pos.y;
            positions[2] = 0;
            positions[5] = _markIndicatorDisplayZ;
            scene3D.coordMapping.xyzToThreeJS(positions, 0, positions, 0);
            scene3D.coordMapping.xyzToThreeJS(positions, 3, positions, 3);
            positionAttribute.needsUpdate = true;
        }
    }
};


/**
 * The main simulation update method, call from the {@link module:LBUI3d.App3D}'s update() method.
 * @param {Number} dt   The time step.
 * @returns {undefined}
 */
LBSailSim.SailEnvTHREE.prototype.update = function(dt) {
    dt = dt || this.physicsLink.timeStep();
    if (dt > 0.0625) {
        dt = 0.0625;
    }
    
    dt = this.dtRunningAvg.addValue(dt);
    //dt = this.physicsLink.timeStep();
    
    var me = this;
    this.app3D.debugTimeRecorder.record('TWEEN.update', function() {
        TWEEN.update(me.app3D.runMillisecs);
    });
    
    this.app3D.debugTimeRecorder.record('Env.update', function() {
        LBSailSim.Env.prototype.update.call(me, dt);
    });
    
    this.app3D.debugTimeRecorder.record('physicsLink.update', function() {
        me.physicsLink.update(dt);
    });
    
    // Don't have to call updateDisplayObjects()...
    //this.physicsLink.updateDisplayObjects();
    this.app3D.debugTimeRecorder.record('updateThreeModelFromRigidBody', function() {
        me.physicsLink.rigidBodies.forEach(LBSailSim.SailEnvTHREE.updateThreeModelFromRigidBody);
    });
    
    this.app3D.debugTimeRecorder.start('sky-water-wakes.update');
    this.sky3D.update(dt);
    this.water3D.update(dt);
    this.wakes3D.update(dt);
    this.app3D.debugTimeRecorder.end('sky-water-wakes.update');
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