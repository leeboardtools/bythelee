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
/* global Leeboard, LBSailSim, LBGeometry, LBMath */


//
//--------------------------------------------------
LoadingState = {};

//
//--------------------------------------------------
LoadingState.init = function() {
    
};


//--------------------------------------------------
LoadingState.preload = function() {
    this.game.load.json('clCdCurves', 'data/clcdcurves.json');
    this.game.load.json('boats', 'data/boats.json');
    this.game.load.json('basic', 'data/basic.json');    
    
    this.game.load.image('bkgd_water', 'images/bkgd_water.png');
    this.game.load.image('dinghy', 'images/dinghy.png');
    this.game.load.image('can', 'images/can.png');
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
    this.cursorKeys = this.game.input.keyboard.createCursorKeys();
    this.keys = this.game.input.keyboard.addKeys({
        space: Phaser.KeyCode.SPACEBAR,
        t : Phaser.KeyCode.T
    });
    this.debounceT = false;
    
    this.game.physics.startSystem(Phaser.Physics.P2JS);

    this.sailEnv = new LBSailSim.P2Env(this.game);
};


//
//--------------------------------------------------
PlayState.create = function() {
    this.camera.flash('#000000');
    this.world.setBounds(-this.game.width / 2, -this.game.height / 2, this.game.width, this.game.height);
    this.game.world.bounds.setTo(-10000, -10000, 20000, 20000);
    this.game.physics.setBoundsToWorld();
    
    this.camera.focusOnXY(0, 0);
        
    var clCdCurvesJSON = this.game.cache.getJSON('clCdCurves');
    this.sailEnv.loadClCdCurves(clCdCurvesJSON);
    
    var boatsJSON = this.game.cache.getJSON('boats');
    this.sailEnv.loadBoatDatas(boatsJSON);
    
    var basicJSON = this.game.cache.getJSON('basic');
    this._loadLevel(basicJSON);
};

//--------------------------------------------------
PlayState._loadLevel = function (data) {
    // The background...
    this.bkgdWater = this.game.add.group();
    var maxSize = Math.sqrt(this.game.width * this.game.width + this.game.height * this.game.height);
    maxSize = Math.ceil(maxSize);
    this.water = this.game.add.tileSprite(-maxSize/2, -maxSize/2, maxSize, maxSize, 'bkgd_water');
    this.bkgdWater.add(this.water);
 
    // Need wind ripples...
    
    this.worldGroup = this.game.add.group();
    this.buoys = this.game.add.group(this.worldGroup);
    
    data.buoys.forEach(this._spawnBuoys, this);
    
    this._spawnCharacters({myBoat: data.myBoat });
    
    this._setupHUD();
};

//--------------------------------------------------
PlayState._spawnBuoys = function(data) {
    var buoy = this.buoys.create(data.x, data.y, data.image);
    
    this.physics.enable(buoy);
    buoy.body.allowGravity = false;
    buoy.body.immovable = true;
};

//--------------------------------------------------
PlayState._spawnCharacters = function (data) {
    var centerX = 0;
    var centerY = 0;
    //this.myBoat = new Boat(this.game, this.sailEnv, centerX, centerY, data.myBoat);
    this.myBoat = this.sailEnv.checkoutBoat("Tubby", "TubbyA");
    this.myBoat.p2Body.x = centerX;
    this.myBoat.p2Body.y = centerY;
    this.myBoat.p2Body.rotation = -10 * LBMath.DEG_TO_RAD;
    this.worldGroup.add(this.myBoat.p2Body.sprite);    
};

//--------------------------------------------------
PlayState._setupHUD = function() {
    this.hud = this.game.add.group();
    this.hud.position.x = -this.game.width / 2;
    this.hud.position.y = -this.game.height / 2;

    var style = { "font": "Arial", "fontSize": "12pt", "fill": "#FFFFFF" };
    var left = 0;
    var top = 0;
    var vSpacing = 0;

    this.headingText = this.game.add.text(left, top, "heading: 0", style);
    this.hud.add(this.headingText);
    top += this.headingText.height + vSpacing;
    
    this.speedText = this.game.add.text(left, top, "speed: 0", style);
    this.hud.add(this.speedText);
    top += this.speedText.height + vSpacing;
    
    this.leewayText = this.game.add.text(left, top, "leeway: 0", style);
    this.hud.add(this.leewayText);
    top += this.leewayText.height + vSpacing;
    
    this.positionText = this.game.add.text(left, top, "position: 0", style);
    this.hud.add(this.positionText);
    top += this.positionText.height + vSpacing;
    
    this.appWindSpeedText = this.game.add.text(left, top, "App Wind Speed: 0", style);
    this.hud.add(this.appWindSpeedText);
    top += this.appWindSpeedText.height + vSpacing;
    
    this.appWindBearingText = this.game.add.text(left, top, "App Wind Bearing: 0", style);
    this.hud.add(this.appWindBearingText);
    top += this.appWindBearingText.height + vSpacing;
    
    this.rudderText = this.game.add.text(left, top, "Rudder Angle: 0", style);
    this.hud.add(this.rudderText);
    top += this.rudderText.height + vSpacing;
    
    this.throttleText = this.game.add.text(left, top, "Throttle: 0", style);
    this.hud.add(this.throttleText);
    top += this.throttleText.height + vSpacing;
};


//
//--------------------------------------------------
PlayState.update = function() {
    this._handleCollisions();
    
    this._updateCamera();
    this._handleInput();
    
    var dt = Leeboard.P2Link.getP2TimeStep(this.game.physics.p2);
    this.sailEnv.update(dt);
    this._updateHUD();
};

//------------------------------ --------------------
PlayState._handleCollisions = function() {
    this.game.physics.arcade.collide(this.myBoat, this.buoys);  
};

//------------------------------ --------------------
PlayState._updateHUD = function() {
    var heading = this.myBoat.getHeadingDeg(true);
    this.headingText.text = "Heading: " + heading.toFixed();
    
    var speed = this.myBoat.getKnots();
    this.speedText.text = "Speed: " + speed.toFixed(2);
    
    var leewayAngle = this.myBoat.getLeewayDeg(true);
    if (leewayAngle < 0) {
        this.leewayText.text = "Leeway: " + leewayAngle.toFixed() + " to Port";
    }
    else if (leewayAngle > 0) {
        this.leewayText.text = "Leeway: " + leewayAngle.toFixed() + " to Stbd";
    }
    else {
        this.leewayText.text = "Leeway: 0";
    }
    
    var position = this.myBoat.getPosition();
    this.positionText.text = "Position: " + LBMath.round(position.x, 1) + " " + LBMath.round(position.y, 1);
   
    speed = this.myBoat.getApparentWindKnots();
    this.appWindSpeedText.text = "App Wind Speed: " + speed.toFixed(2);
    
    var bearing = this.myBoat.getApparentWindBearingDeg(true);
    this.appWindBearingText.text = "App Wind Bearing: " + bearing.toFixed();
    
    var rudder = this.myBoat.getRudderDeg();
    this.rudderText.text = "Rudder Angle: " + LBMath.round(rudder);
    
    var throttle = this.myBoat.getThrottlePos();
    if (throttle !== undefined) {
        this.throttleText.text = "Throttle:" + LBMath.round(throttle, 1);
    }
};


//------------------------------ --------------------
PlayState._handleInput = function() {
    if (this.cursorKeys.left.isDown) {
        this.myBoat.moveRudder(-0.1, true);
    }
    else if (this.cursorKeys.right.isDown) {
        this.myBoat.moveRudder(0.1, true);
    }
    else if (this.cursorKeys.up.isDown) {
        //this.myBoat.moveMainsheet(-1);
        this.myBoat.moveThrottle(0.1, true);
    }
    else if (this.cursorKeys.down.isDown) {
        //this.myBoat.moveMainsheet(1);
        this.myBoat.moveThrottle(-0.1, true);
    }
    else if (this.keys.space.isDown) {
        this.myBoat.moveRudder(0, false);
    }
    else if (this.keys.t.isDown) {
        this.debounceT = true;
    }
    else if (this.debounceT && this.keys.t.isUp) {
        this.debounceT = false;
        
        //var cspline = new LBMath.CSpline();
        //cspline.test();
        var clCdCurve = this.sailEnv.clCdCurves["FlatPlateAR5"];
        clCdCurve.test(0, 180, 2);
    }
};

//--------------------------------------------------
PlayState._updateCamera = function() {
    var x = this.myBoat.p2Body.x;
    var y = this.myBoat.p2Body.y;
    
    this.water.tilePosition.x = -x;
    this.water.tilePosition.y = -y;

    this.worldGroup.position.x = -x;
    this.worldGroup.position.y = -y;
/*    
    var cosBoat = Math.cos(this.myBoat.body.rotation);
    var sinBoat = Math.sin(this.myBoat.body.rotation);
    
    this.worldGroup.position.x = -this.myBoat.position.x * cosBoat - this.myBoat.position.y * sinBoat;
    this.worldGroup.position.y = -this.myBoat.position.y * sinBoat + this.myBoat.position.y * cosBoat;;
    
    //this.worldGroup.pivot.x = -this.myBoat.position.x;
    //this.worldGroup.pivot.y = -this.myBoat.position.y;
    
    this.worldGroup.rotation = -this.myBoat.rotation;
   */
};


// PlayState.shutdown

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
        renderer: Phaser.AUTO,
        parent: "game",
        physicsConfig: PlayState
    };
    
    game = new Phaser.Game(config);

    game.state.add('play', PlayState);
    game.state.add('loading', LoadingState);
    game.state.start('loading');
};
