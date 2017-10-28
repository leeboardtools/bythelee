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
        'tween': 'lib/Tween',
        
        'lbcannonutil': 'leeboard/cannon/CannonUtil',
        'lbcannonphysicslink': 'leeboard/cannon/CannonPhysicsLink',
        'lbcannon': 'leeboard/cannon/LBCannon',
        
        'lbassets': 'leeboard/core/Assets',
        'lbcamera': 'leeboard/core/Camera-THREE',
        'lbcontrols': 'leeboard/core/Controls',
        'lbcurve': 'leeboard/core/Curve',
        'lbdebug': 'leeboard/core/Debug',
        'lbfoils': 'leeboard/core/Foils',
        'lbgeometry': 'leeboard/core/Geometry-THREE',
        'lbmath': 'leeboard/core/Math',
        'lbphysics': 'leeboard/core/Physics',
        'lbphysicslink': 'leeboard/core/PhysicsLink',
        'lbspherical': 'leeboard/core/Spherical',
        'lbtracking': 'leeboard/core/Tracking',
        'lbutil': 'leeboard/core/Util',
        'lbvolume': 'leeboard/core/Volume',
        
        'lbphaserp2link': 'leeboard/phaser/P2Link',
        'lbphasercontrols': 'leeboard/phaser/PhaserControls',
        'lbphaserutil': 'leeboard/phaser/PhaserUtil',
        'lbphaserphysicsview': 'leeboard/phaser/PhysicsView',
        'lbphaserproject3d': 'leeboard/phaser/Project3D',
        'lbphaser': 'leeboard/phaser/LBPhaser',
        
        'lbdelft': 'leeboard/sailsim/Delft',
        'lbfoilinstance': 'leeboard/sailsim/FoilInstance',
        'lbhull': 'leeboard/sailsim/Hull',
        'lbpropulsor': 'leeboard/sailsim/Propulsor',
        'lbsail': 'leeboard/sailsim/Sail',
        'lbsailenv': 'leeboard/sailsim/SailEnv',
        'lbsailsim': 'leeboard/sailsim/SailSim',
        'lbsailsimbase': 'leeboard/sailsim/SailSimBase',
        'lbvessel': 'leeboard/sailsim/Vessel',
        
        'lbsailsimphaser': 'leeboard/sailsim-phaser/SailSim-Phaser',
        'lbsailsimphaserview': 'leeboard/sailsim-phaser/SailSimPhaserView',
        
        'lbsailsimthree': 'leeboard/sailsim-three/SailSim-THREE',
        'lbsky3d': 'leeboard/sailsim-three/Sky3D',
        'lbwakes3d': 'leeboard/sailsim-three/Wakes3D',
        'lbwater3d': 'leeboard/sailsim-three/Water3D',
        
        'lbthreejs': 'leeboard/three-js/ThreeJSUtil',
        
        'three-detector': 'leeboard/three-js-extras/Detector',
        'three-gpuparticlesystem': 'leeboard/three-js-extras/GPUParticleSystem',
        
        'lbapp3d': 'leeboard/ui3d/App3D',
        'lbscene3d': 'leeboard/ui3d/Scene3D',
        'lbview3d': 'leeboard/ui3d/View3D',
        'lbcameracontrollers': 'leeboard/ui3d/CameraControllers',
        'lbparticles': 'leeboard/ui3d/Particles',
        'lbshaders': 'leeboard/ui3d/Shaders',
        'lbui3d': 'leeboard/ui3d/LBUI3d'
    },
    shim: {
        'phaser': {
            exports: 'Phaser'
        },
        
        'tween': {
            exports: 'TWEEN'
        },
        
        'three-gpuparticlesystem': {
            deps: ['three'],
            exports: 'THREE'
        },
        
        'cannon': {
            exports: 'CANNON'
        }
        
    }
};
