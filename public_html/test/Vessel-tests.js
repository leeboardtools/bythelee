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


/* global QUnit, LBSailSim, LBMath, LBGeometry */
define(['lbsailsim', 'lbmath', 'lbgeometry'], function (LBSailSim, LBMath, LBGeometry) {

var checkVector3 = require('test/Geometry-tests.js').checkVector3;
var checkQuaternion = require('test/Geometry-tests.js').checkQuaternion;
var checkLine2 = require('test/Geometry-tests.js').checkLine2;

QUnit.module('Vessel-tests');

var clCdCurvesJSON_Test = {
    "clCdCurves": [
        { 
            "name": "FlatPlate", 
            "stallStartDeg": 25,
            "liftEndDeg": 35,
            "clCdStall": {},
            "clCdInterp": {
                "alphas": [
                    0,      10,     14,     20,     27
                ],
                "cls": [
                    0,      1.1,    1.3423, 0.8233, 1.0680
                ],
                "cds": [
                    0.0064, 0.2223, 0.3097, 0.4378, 0.5811
                ]
            }
        },
        {
            "name": "FlatPlateAR5",
            "aspectRatio": 5,
            "clCdInterp": {
                "alphas": [
                    0,      10,     15,     20,     25,     30,     35,     40,     45,     
                    50,     60,     70,     80,     90
                ],
                "cls": [
                    0.0000, 0.7194, 0.7881, 0.8388, 0.8806, 0.8985, 0.8299, 0.7642, 0.7343,
                    0.6955, 0.5642, 0.4477, 0.2567, 0.0000
                ],
                "cds": [
                    0.1194, 0.1552, 0.2209, 0.3582, 0.4299, 0.5045, 0.5970, 0.6567, 0.7284,
                    0.8000, 0.9642, 1.0627, 1.1731, 1.2388
                ],
                "cms": [
                    0.0000, 0.0615, 0.0983, 0.1844, 0.1885, 0.1954, 0.2022, 0.2090, 0.2158,
                    0.2227, 0.2295, 0.2363, 0.2432, 0.2500
                ]
            }
        },
        {
            "name": "NACA0012",
            "re": 0.86e6,
            "stallStartDeg": 25,
            "liftEndDeg": 35,
            "clCdStall": {},
            "clCdInterp": {
                "alphas": [
                    0,      6,      11.9,   12,     15,     20,     24
                ],
                "cls": [
                    0.00,   0.66,   0.96,   0.96,   0.60,   0.63,   0.73
                ],
                "cds": [
                    0.0080, 0.0135, 0.0291, 0.15,   0.20,   0.30,   0.38 
                ],
                "cms": [
                    0.25,   0.25,   0.23,   0.29,   0.31,   0.31,   0.33
                ]
            }
        }
    ]
};

var boatsJSON_Test = {
    "boats": [
        {
            "typeName": "Tubby",
            "mass": 100,
            "centerOfMass": { "x": 1, "y": 5, "z": 10 },
            "momentInertia": {},
            "airfoils": [],
            "hydrofoils": [ {
                    "construct": "new LBSailSim.FoilInstance()",
                    "name": "keel",
                    "mass": 20,
                    "centerOfMass": { "x": 0, "y": 0, "z": -3 },
                    "obj3D": {
                        "position" : { "x": 0, "y": 3, "z": 0 },
                        "rotation": { "exd": 0, "eyd": 15, "ezd": 0 }
                    },
                    "foil": {
                        "chordLine": {
                            "start": { "x": 0, "y": 0 },
                            "end": { "x": 0.5, "y": 0 }
                        },
                        "sliceZ": 0.2,
                        "area": 1.2,
                        "aspectRatio": 3,
                        "libClCdCurve": "FlatPlate"
                    }
            }],
            "propulsors": [],
            "ballasts": [ { 
                    "mass": 30,
                    "centerOfMass": { "x": 0, "y": 0, "z": -5 } 
                }
            ]
        }
    ]
};

QUnit.test( "Vessel-load", function( assert ) {
    var sailEnv = new LBSailSim.Env();
    sailEnv.loadClCdCurves(clCdCurvesJSON_Test);
    
    sailEnv.loadBoatDatas(boatsJSON_Test);
    
    var vessel = LBSailSim.Vessel.createFromData(sailEnv.boatDatas["Tubby"], sailEnv);
    
    assert.equal(vessel.typeName, "Tubby", "typeName");
    assert.equal(vessel.mass, 100, "mass");
    checkVector3(assert, vessel.centerOfMass, 1, 5, 10, "centerOfMass");
    
    assert.equal(vessel.hydrofoils.length, 1, "hydrofoils.length");
    
    var hydroFoil = vessel.hydrofoils[0];
    assert.equal(hydroFoil.mass, 20, "hydroFoil[0].mass");
    checkVector3(assert, hydroFoil.centerOfMass, 0, 0, -3, "hydroFoil[0].centerOfMass");
    
    checkVector3(assert, hydroFoil.obj3D.position, 0, 3, 0, "hydroFoil[0].obj3D.position");
    
    var quaternion = LBGeometry.createQuaternionFromEulerRad(0, 15 * LBMath.DEG_TO_RAD, 0);
    checkQuaternion(assert, hydroFoil.obj3D.quaternion, quaternion.x, quaternion.y, quaternion.z, quaternion.w, "hydroFoil[0].obj3D.quaternion");
    
    var foil = hydroFoil.foil;
    checkLine2(assert, foil.chordLine, 0, 0, 0.5, 0, "hydroFoil[0].foil.chordLine");
    assert.equal(foil.sliceZ, 0.2, "hydroFoil[0].foil.sliceZ");
    assert.equal(foil.area, 1.2, "hydroFoil[0].foil.area");
    assert.equal(foil.aspectRatio, 3, "hydroFoil[0].foil.aspectRatio");
    assert.equal(foil.clCdCurve, sailEnv.getClCdCurve("FlatPlate"), "hydroFoil[0].foil.clCdCurve");
    
    assert.equal(vessel.ballasts.length, 1, "ballasts.length");
});

});