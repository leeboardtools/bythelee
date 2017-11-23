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



define(['lbsailsim', 'lbmath', 'lbspherical', 'three', 'three-skyshader'],
function(LBSailSim, LBMath, LBSpherical, THREE) {
    

LBSailSim.Sky3D = function(scene3D, sailEnv) {
    this.scene3D = scene3D;
    this.sailEnv = sailEnv;

    this.scene3D.scene.fog = new THREE.FogExp2( 0xaabbbb, 0.001 );
    
    if (!this.loadSkyShader()) {
        this.loadSkyBox();
    }
};

var _minLightAltitudeDeg = -2.3;    // From THREE.Sky's fragment shader, which uses PI/1.95 as the cutoff angle.

LBSailSim.Sky3D.prototype = {
    loadSkyBox: function() {
        // Adapted from ThreeJS examples/canvas_geometry_panorama.html, webgl_shaders_ocean.html...
        var loader = new THREE.CubeTextureLoader();
        /*
        loader.setPath('textures/three-js/skybox/');
        this.skyTextureCube = loader.load([
            'px.jpg', 'nx.jpg',
            'py.jpg', 'ny.jpg',
            'pz.jpg', 'nz.jpg'
        ]);
        */
        loader.setPath('textures/skybox-blue/');
        this.skyTextureCube = loader.load([
            'px.png', 'nx.png',
            'py.png', 'ny.png',
            'pz.png', 'nz.png'
        ]);
        
        // Sky-box arrangement:
        //          +----+
        //          | py |
        //     +----+----+----+----+
        //     | pz | px | nz | nx |
        //     +----+----+----+----+
        //          | ny |
        //          +----+
        
        var cubeShader = THREE.ShaderLib[ 'cube' ];
        cubeShader.uniforms[ 'tCube' ].value = this.skyTextureCube;
        
        var skyBoxMaterial = new THREE.ShaderMaterial( {
                fragmentShader: cubeShader.fragmentShader,
                vertexShader: cubeShader.vertexShader,
                uniforms: cubeShader.uniforms,
                depthWrite: false,
                side: THREE.BackSide
        } );

        var skyBox = new THREE.Mesh(
                new THREE.BoxGeometry( 10000, 10000, 10000 ),
                skyBoxMaterial
        );

        this.skyMaterial = skyBoxMaterial;
        this.skyMesh = skyBox;

        this.scene3D.add( skyBox );
        
        return true;
    },
    
    loadSkyShader: function() {
        // TEST!!!
        return false;
        
        
        var radius = this.sailEnv.horizonDistance;
        this.sky = new THREE.Sky({
            radius: radius,
            //useBox: true,
            widthSegments: 4,
            heightSegments: 2
        });
        this.scene3D.add(this.sky.mesh);
        
        var uniforms = this.sky.uniforms;
        uniforms.turbidity.value = 3.5;
        uniforms.rayleigh.value = 0.9;
        uniforms.luminance.value = 0.8;
        uniforms.mieCoefficient.value = 0.005;
        uniforms.mieDirectionalG.value = 0.8;
        this._sunCoords = new LBSpherical.CoordinatesRAE(radius);
        this.setSunAzimuthAltitudeDeg(40, 30);
        return true;
    },
    
    setSunAzimuthAltitudeDeg: function(azimuthDeg, elevationDeg) {
        this._sunCoords.azimuthDeg = azimuthDeg;
        this._sunCoords.elevationDeg = elevationDeg;
        
        this._sunPos = this._sunCoords.toVector3(this._sunPos);
        this.scene3D.coordMapping.vector3ToThreeJS(this._sunPos, this._sunPos);
        
        if (this.sky) {
            this.sky.uniforms.sunPosition.value.copy(this._sunPos);
        }
    },
    
    
    update: function(dt) {
        if (this._sunPos && (this._sunCoords.elevationDeg > _minLightAltitudeDeg)) {
            this.scene3D.mainLight.position.copy(this._sunPos);
        }
    },
    
    destroy: function() {
        
    },
    
    constructor: LBSailSim.Sky3D
};

return LBSailSim;
});