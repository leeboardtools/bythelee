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


var require = {
    baseUrl: 'js',
    paths: {
        'three': 'lib/three',
        'cannon': 'lib/cannon',
        'phaser': 'lib/phaser',
        
        'lbcannon': 'leeboard/cannon/CannonUtil',
        
        'lbcamera': 'leeboard/core/Camera-THREE',
        'lbcontrols': 'leeboard/core/Controls',
        'lbcurve': 'leeboard/core/Curve',
        'lbdebug': 'leeboard/core/Debug',
        'lbfoils': 'leeboard/core/Foils',
        'lbgeometry': 'leeboard/core/Geometry-THREE',
        'lbmath': 'leeboard/core/Math',
        'lbphysics': 'leeboard/core/Physics',
        'lbphysicslink': 'leeboard/core/PhysicsLink',
        'lbutil': 'leeboard/core/Util',
        'lbvolume': 'leeboard/core/Volume',
        
        'lbphasercannonlink': 'leeboard/phaser/CannonLink',
        'lbphaserp2link': 'leeboard/phaser/P2Link',
        'lbphasercontrols': 'leeboard/phaser/PhaserControls',
        'lbphaserutil': 'leeboard/phaser/PhaserUtil',
        'lbphaserphysicsview': 'leeboard/phaser/PhysicsView',
        'lbphaserproject3d': 'leeboard/phaser/Project3D',
        'lbphaser': 'leeboard/phaser/LBPhaser',
        
        'lbdelft': 'leeboard/sailsim/Delft',
        'lbfoilinstance': 'leeboard/sailsim/FoilInstance',
        'lbhull': 'leeboard/sailsim/Hull',
        'lbsail': 'leeboard/sailsim/Sail',
        'lbsailenv': 'leeboard/sailsim/SailEnv',
        'lbsailsim': 'leeboard/sailsim/SailSim',
        'lbvessel': 'leeboard/sailsim/Vessel',
        
        'lbsailsimphaser': 'leeboard/sailsim-phaser/SailSim-Phaser',
        'lbsailsimphaserview': 'leeboard/sailsim-phaser/SailSimPhaserView',
        
        'lbthreejs': 'leeboard/three-js/ThreeJSUtil',
        
        'three-orbit': 'leeboard/three-js-extras/controls/OrbitControls',
        'three-detector': 'leeboard/three-js-extras/Detector',
        
        'lbapp3d': 'leeboard/ui3d/App3D',
        'lbscene3d': 'leeboard/ui3d/Scene3D',
        'lbview3d': 'leeboard/ui3d/View3D',
        'lbui3d': 'leeboard/ui3d/LBUI3d'
    },
    shim: {        
        'lbdelft': {
            deps: ['lbsailsim', 'lbmath'],
            exports: 'LBSaiSim'
        },
        'lbfoilinstance': {
            deps: ['lbphysics', 'lbfoils', 'lbgeometry', 'lbdebug'],
            exports: 'LBSailSim'
        },
        'lbhull': {
            deps: ['lbsailsim', 'lbutil', 'lbmath', 'lbgeometry', 'lbvolume', 'lbphysics', 'lbdelft', 'lbdebug'],
            exports: 'LBSailSim'
        },
        'lbsail': {
            deps: ['lbsailsim', 'lbutil', 'lbmath', 'lbgeometry', 'lbcurve', 'lbphysics', 'lbcontrols', 'lbfoils', 'lbfoilinstance'],
            exports: 'LBSailSim'
        },
        'lbsailenv': {
            deps: ['lbsailsim', 'lbutil', 'lbmath', 'lbgeometry', 'lbfoils', 'lbvessel'],
            exports: 'LBSailSim'
        },
        'lbsailsim': {
            exports: 'LBSailSim'
        },
        'lbvessel': {
            deps: ['lbsailsim', 'lbsail', 'lbhull', 'lbfoils', 'lbutil', 'lbmath', 'lbgeometry', 'lbphysics', 'lbfoils', 'lbcontrols', 'lbdebug'],
            exports: 'LBSailSim'
        },
        
        'lbutil': {
            exports: 'LBUtil'
        },
        'lbcamera': {
            deps: ['three'],
            exports: 'LBCamera'
        },
        'lbdebug': {
            exports: 'LBDebug'
        },
        'lbmath': {
            deps: ['lbutil'],
            exports: 'LBMath'
        },
        'lbgeometry': {
            deps: ['three', 'lbutil', 'lbmath'],
            exports: 'LBGeometry'
        },
        'lbcontrols': {
            deps: ['lbutil', 'lbmath'],
            exports: 'LBControls'
        },
        'lbphysics': {
            deps: ['lbutil', 'lbmath', 'lbgeometry', 'lbvolume'],
            exports: 'LBPhysics'
        },
        'lbphysicslink': {
            deps: ['lbphysics'],
            exports: 'LBPhysics'
        },
        'lbvolume': {
            deps: ['lbutil', 'lbmath', 'lbgeometry'],
            exports: 'LBVolume'
        },
        'lbcurve': {
            deps: ['lbmath', 'lbgeometry'],
            exports: 'LBCurve'
        },
        'lbfoils': {
            deps: ['lbutil', 'lbmath', 'lbgeometry', 'lbphysics'],
            exports: 'LBFoils'
        },
        
        'lbthreejs': {
            deps: ['lbgeometry'],
            exports: 'LBThreeJS'
        },
        
        'three-orbit': {
            deps: ['three'],
            exports: 'THREE'
        },
        
        'lbscene3d': {
            deps: ['three', 'lbmath'],
            exports: 'LBUI3d'
        },
        'lbview3d': {
            deps: ['three', 'three-orbit', 'lbmath', 'lbscene3d'],
            exports: 'LBUI3d'
        },
        'lbapp3d': {
            deps: ['lbutil', 'lbscene3d'],
            exports: 'LBUI3d'
        },
        'lbui3d': {
            deps: ['lbapp3d', 'lbscene3d', 'lbview3d'],
            exports: 'LBUI3d'
        },
        
        'lbcannon': {
            deps: ['lbutil', 'lbgeometry', 'lbphysics', 'cannon'],
            exports: 'LBCannon'
        },
        
        'lbphaserutil': {
            deps: ['lbmath', 'lbgeometry', 'phaser'],
            exports: 'LBPhaser'
        },
        'lbphaserphysicsview': {
            deps: ['lbphaserutil', 'lbutil', 'lbmath', 'lbgeometry', 'phaser'],
            exports: 'LBPhaser'
        },
        'lbphasercannonlink': {
            deps: ['lbphaserutil', 'lbgeometry', 'lbphysics', 'lbcannon', 'cannon', 'lbphysicslink'],
            exports: 'LBPhaser'
        },
        'lbphaserp2link': {
            deps: ['lbphaserutil', 'lbutil', 'lbgeometry', 'lbphysics', 'phaser', 'lbphysicslink'],
            exports: 'LBPhaser'
        },
        'lbphasercontrols': {
            deps: ['lbphaserutil', 'lbmath', 'phaser'],
            exports: 'LBPhaser'
        },
        'lbphaserproject3d': {
            deps: ['lbphaserutil', 'lbmath', 'lbutil', 'lbcamera', 'lbgeometry', 'phaser'],
            exports: 'LBPhaser'
        },
        'lbphaser': {
            deps: ['lbphaserutil', 'lbphaserphysicsview', 'lbphasercannonlink', 'lbphaserp2link', 'lbphasercontrols', 'lbphaserproject3d'],
            exports: 'LBPhaser'
        },
        'phaser': {
            exports: 'Phaser'
        },
        
        'cannon': {
            exports: 'CANNON'
        },
        
        'lbsailsimphaser': {
            deps: ['lbsailsim', 'lbphaser', 'lbsailenv'],
            exports: 'LBSailSim'
        },
        'lbsailsimphaserview': {
            deps: ['lbsailsim', 'lbphaser'],
            exports: 'LBSailSim'
        }
    }
};
