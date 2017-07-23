/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


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


/* global Phaser */
/* global Leeboard, LBSailSim, LBGeometry, LBMath, LBPhaser, LBFoils */


//
//--------------------------------------------------
LoadingState = {};

//
//--------------------------------------------------
LoadingState.init = function() {    
};


//--------------------------------------------------
LoadingState.preload = function() {
    this.game.load.image('bkgd_water', 'images/bkgd_water.png');
};


//--------------------------------------------------
LoadingState.create = function() {
    this.game.state.start('play');
};


//--------------------------------------------------
PlayState = {};


//
//
//--------------------------------------------------
PlayState.init = function() {
};


//
//--------------------------------------------------
PlayState.create = function() {
    //this.camera.flash('#000000');
    this.world.setBounds(-this.game.width / 2, -this.game.height / 2, this.game.width, this.game.height);
    this.game.world.bounds.setTo(-10000, -10000, 20000, 20000);
    this.game.physics.setBoundsToWorld();
    
    this.camera.focusOnXY(0, 0);

    this.bkgdWater = this.game.add.group();
    var maxSize = Math.sqrt(this.game.width * this.game.width + this.game.height * this.game.height);
    maxSize = Math.ceil(maxSize);

    this.water = this.game.add.tileSprite(0, 0, maxSize, maxSize, 'bkgd_water');
    this.water.anchor.x = 0.5;
    this.water.anchor.y = 0.5;
    this.bkgdWater.add(this.water);
    
    this.worldGroup = this.game.add.group();
    this.graphics = this.game.add.graphics(0, 0, this.worldGroup);
};


//
//--------------------------------------------------
PlayState.preRender = function() {
    if (!this.game.paused) {
        // TEST!!!
        if (!this.firstTime) {
            this.firstTime = true;
            this.graphics.clear();
            this.graphics.currentPath = null;

            //var phaserEnv = this.sailEnv.phaserEnv;
            //this.graphics.position.set(
            //        phaserEnv.toPixelsX(this.myBoat.obj3D.position.x),
            //        phaserEnv.toPixelsY(this.myBoat.obj3D.position.y));
            //this.graphics.updateTransform();

            var graphics = this.graphics;
            graphics.lineStyle(1, 0, 1);

            var a = true;
            a = false;
            if (a) {
                graphics.moveTo(12.2542889680046, 17.0447552668089);
                graphics.lineTo(-12.0237970820493, -17.0042681688679);
                graphics.lineTo(-11.0218071751101, -15.5872361810669);
                graphics.lineTo(11.2330912732274, 15.6243493312257);
            }
            else {
                graphics.moveTo(11.7931862069491, 17.3655714053597);
                graphics.lineTo(-11.5607600954607, -17.323831173544);
                graphics.lineTo(-10.5973568665846, -15.8801687541803);
                //graphics.lineTo(10.8104140036774, 15.9184306096805);
                //graphics.moveTo(-11.5607600954607, -17.323831173544);
                //graphics.lineTo(-10.5973568665846, -15.8801687541803);
            }
        }
    }
};

//
//--------------------------------------------------
PlayState.update = function() {
};

PlayState.mpx = function (v) {
    return v *= 20;
};

PlayState.pxm = function (v) {
    return v * 0.05;
};

PlayState.mpxi = function (v) {
    return v *= -20;
};

PlayState.pxmi = function (v) {
    return v * -0.05;
};

//--------------------------------------------------
window.onload = function() {
    var config = {
        width: "100",
        height: "100",
        renderer: Phaser.CANVAS,
        parent: "game",
        physicsConfig: PlayState
    };
    //config.width = 800;
    //config.height = 800;
    
    game = new Phaser.Game(config);

    game.state.add('play', PlayState);
    game.state.add('loading', LoadingState);
    game.state.start('loading');
};
