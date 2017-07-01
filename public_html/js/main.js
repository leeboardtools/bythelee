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
/* global Leeboard, LBSailSim, LBGeometry, LBMath, LBPhaser */


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
    this.game.load.image('tubby', 'images/tubby.png');
    this.game.load.image('tubby_mainsail', 'images/tubby_mainsail.png');
    this.game.load.image('tubby_rudder', 'images/tubby_rudder.png');
    this.game.load.image('can', 'images/can.png');

    var sizeSuffix = 'med';
    this.game.load.image('compass', 'images/compass_card_' + sizeSuffix + '.png');
    this.game.load.image('mainsheet_thumb', 'images/mainsheet_thumb_' + sizeSuffix + '.png');
    this.game.load.image('mainsheet_bkgd', 'images/mainsheet_bkgd_' + sizeSuffix + '.png');
    this.game.load.image('mainsheet_logo', 'images/mainsheet_logo_' + sizeSuffix + '.png');
    this.game.load.image('tiller_thumb', 'images/tiller_thumb_' + sizeSuffix + '.png');
    this.game.load.image('tiller_bkgd', 'images/tiller_bkgd_' + sizeSuffix + '.png');
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
        f : Phaser.KeyCode.F,
        n : Phaser.KeyCode.N,
        p : Phaser.KeyCode.P,
        t : Phaser.KeyCode.T,
        v : Phaser.KeyCode.V
    });
    
    this.keys.f.onDown.add(this.toggleForceArrows, this);
    this.keys.p.onDown.add(this.togglePause, this);
    this.keys.t.onDown.add(this.doTest, this);
    this.keys.v.onDown.add(this.toggleVelocityArrows, this);
    
    this.game.physics.startSystem(Phaser.Physics.P2JS);

    this.sailEnv = new LBSailSim.P2Env(this.game);
};

//
//--------------------------------------------------
PlayState.togglePause = function() {
    this.game.paused = !this.game.paused;
};

//
//--------------------------------------------------
PlayState.toggleForceArrows = function() {
    this.sailEnv.setForceArrowsVisible(!this.sailEnv.areForceArrowsVisible());
};

//
//--------------------------------------------------
PlayState.toggleVelocityArrows = function() {
    this.sailEnv.setVelocityArrowsVisible(!this.sailEnv.areVelocityArrowsVisible());
};

//
//--------------------------------------------------
PlayState.doTest = function() {
    //var cspline = new LBMath.CSpline();
    //cspline.test();
    var clCdCurve = this.sailEnv.clCdCurves["FlatPlate"];
    clCdCurve.test(-180, 180, 2);
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

    this.water = this.game.add.tileSprite(0, 0, maxSize, maxSize, 'bkgd_water');
    this.water.anchor.x = 0.5;
    this.water.anchor.y = 0.5;
    this.bkgdWater.add(this.water);
 
    // Need wind ripples...
    
    // The worldGroup effectively lets us scroll the world...
    this.worldGroup = this.game.add.group();
    this.sailEnv.setWorldGroup(this.worldGroup);
    
    this.buoys = this.game.add.group(this.worldGroup);
    
    data.buoys.forEach(this._spawnBuoys, this);
    
    this._spawnCharacters({myBoat: data.myBoat });
    
    this.appWindArrow = new LBPhaser.Arrow(this.sailEnv.phaserEnv, this.worldGroup, this.sailEnv.appWindVelocityArrowStyle);
    this.boatVelocityArrow = new LBPhaser.Arrow(this.sailEnv.phaserEnv, this.worldGroup, this.sailEnv.boatVelocityArrowStyle);
    
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
    var rotation = 0;
    
    centerX = 200;
    centerY = 100;
    rotation = 60;
    //this.myBoat = new Boat(this.game, this.sailEnv, centerX, centerY, data.myBoat);
    this.myBoat = this.sailEnv.checkoutBoat("Tubby", "TubbyA", centerX, centerY, rotation);
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
    
    this.mainsheetText = this.game.add.text(left, top, "Mainsheet: 0", style);
    this.hud.add(this.mainsheetText);
    top += this.mainsheetText.height + vSpacing;
    
    this.throttleText = this.game.add.text(left, top, "Throttle: 0", style);
    this.hud.add(this.throttleText);
    top += this.throttleText.height + vSpacing;
    
    this.ticksText = this.game.add.text(left, top, "SimTicks: 0", style);
    this.hud.add(this.ticksText);
    top += this.ticksText.height + vSpacing;
    
    this.hInset = 5;
    this.vInset = 5;
    
    this.compass = this.game.add.sprite(0, 0, 'compass', 0, this.hud);
    this.compass.anchor.x = 0.5;
    this.compass.anchor.y = 0.5;
    this.compass.position.x = this.game.width - this.compass.width - this.hInset;
    this.compass.position.y = this.compass.height / 2 + this.vInset;

    
    
    if (this.myBoat.getMainsheetController()) {
        var thumbSprite = this.game.add.sprite(0, 0, 'mainsheet_thumb');
        thumbSprite.anchor.y = 0.5;

        var bkgdSprite = this.game.add.tileSprite(0, 0, 32, 32, 'mainsheet_bkgd');
        var logoSprite = this.game.add.sprite(0, 0, 'mainsheet_logo');
        logoSprite.rotation = -LBMath.PI_2;
        logoSprite.anchor.x = 0.2;
        
        this.mainsheetSlider = new LBPhaser.Slider(this.game, 1, -100, 0, 100, true, 
                thumbSprite, bkgdSprite, undefined, logoSprite);
        this.mainsheetSlider.group.position.x = this.game.width / 2 - thumbSprite.width - this.hInset;
        this.mainsheetSlider.setCallback(function(newPos, controller) {
                if (!this.myBoat) {
                    return;
                }
                var controller = this.myBoat.getMainsheetController();
                if (!controller) {
                    return;
                }
                var controllerValue = controller.minValue + newPos * (controller.maxValue - controller.minValue);
                controller.setValue(controllerValue);
            },
            this);
    }
    
    var rudderController = this.myBoat.getRudderController();
    if (rudderController) {
        var thumbSprite = this.game.add.sprite(0, 0, 'tiller_thumb');
        thumbSprite.anchor.x = 0.5;
        thumbSprite.anchor.y = 0.8;
        
        var bkgdSprite = this.game.add.sprite(0, 0, 'tiller_bkgd');
        bkgdSprite.anchor.x = 0.5;
        bkgdSprite.anchor.y = 0.5;

        this.tillerDial = new LBPhaser.Dial(this.game, rudderController.minValue, 90, rudderController.maxValue, -90, thumbSprite, bkgdSprite);
        this.tillerDial.group.position.y = this.game.height / 2 - bkgdSprite.height / 2 - this.vInset;
        this.tillerDial.setCallback(function(newPos, controller) {
                if (!this.myBoat) {
                    return;
                }
                var controller = this.myBoat.getRudderController();
                if (!controller) {
                    return;
                }
                controller.setValue(newPos);
            },
            this);
    }
};


//
//--------------------------------------------------
PlayState.update = function() {
    this._handleCollisions();
    
    this._updateCamera();
    this._handleInput();
    
    this.sailEnv.update();
    this._updateHUD();
    this._updateArrows();
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
    
    var mainsheet = this.myBoat.getMainsheetPos();
    this.mainsheetText.text = "Mainsheet: " + LBMath.round(mainsheet, 2);
    
    var throttle = this.myBoat.getThrottlePos();
    if (throttle !== undefined) {
        this.throttleText.text = "Throttle:" + LBMath.round(throttle, 1);
    }
    
    if (this.ticksText) {
        this.ticksText.text = "SimTicks:" + this.sailEnv.p2Link.updateCount;
    }
};

//------------------------------ --------------------
PlayState._updateArrows = function() {
    if (!this.myBoat) {
        this.boatVelocityArrow.isVisible = false;
        this.appWindArrow.isVisible = false;
    }
    else {
        var base = this.myBoat.getPosition();
        
        this.boatVelocityArrow.isVisible = true;
        this.appWindArrow.isVisible = true;
        
        this.boatVelocityArrow.setFromBaseAndVector(base, this.myBoat.getVelocityMPS());
        
        // We want to position the apparent wind vector's tip upwind from the boat's center.
        var appWindVelocity = this.myBoat.getApparentWindVelocityMPS();
        var appWindDir = appWindVelocity.clone().normalize();
        var offset = this.myBoat.hull.lwl * 0.5;
        appWindDir.multiplyScalar(-offset).add(base);
        this.appWindArrow.setFromTipAndVector(appWindDir, appWindVelocity);
    }
};

//------------------------------ --------------------
PlayState.getControlIncrement = function(controller) {
    var range = controller.maxValue - controller.minValue;
    return range / 50;
};

//------------------------------ --------------------
PlayState.moveRudder = function(key, isDecrease) {
    var delta = PlayState.getControlIncrement(this.myBoat.getRudderController());
    if (key.shiftKey) {
        delta *= 0.25;
    }
    else if (key.altKey) {
        delta *= 4.0;
    }
    if (isDecrease) {
        delta = -delta;
    }
    delta *= this.sailEnv.phaserEnv.ySign;
    this.myBoat.moveRudder(delta, true);
    
    if (this.tillerDial) {
        this.tillerDial.setValue(this.myBoat.getRudderDeg());
    }
};

//------------------------------ --------------------
PlayState.moveMainsheet = function(key, isDecrease) {
    var delta = PlayState.getControlIncrement(this.myBoat.getMainsheetController());
    if (key.shiftKey) {
        delta *= 0.25;
    }
    else if (key.altKey) {
        delta *= 4.0;
    }
    if (isDecrease) {
        delta = -delta;
    }
    this.myBoat.moveMainsheet(delta, true);
    
    if (this.mainsheetSlider) {
        this.mainsheetSlider.setValue(this.myBoat.getMainsheetPos());
    }
};

//------------------------------ --------------------
PlayState._handleInput = function() {
    if (this.cursorKeys.left.isDown) {
        this.moveRudder(this.cursorKeys.left, false);
    }
    else if (this.cursorKeys.right.isDown) {
        this.moveRudder(this.cursorKeys.right, true);
    }
    else if (this.cursorKeys.up.isDown) {
        this.moveMainsheet(this.cursorKeys.up, false);
    }
    else if (this.cursorKeys.down.isDown) {
        this.moveMainsheet(this.cursorKeys.up, true);
    }
    else if (this.keys.space.isDown) {
        this.myBoat.moveRudder(0, false);
        if (this.tillerDial) {
            this.tillerDial.setValue(0);
        }
    }
    else if (this.keys.n.isDown) {
        this.myBoat.moveThrottle(0, false);
    }
};

//--------------------------------------------------
PlayState._updateCamera = function() {
    var p2Body = this.myBoat[LBPhaser.P2Link.p2BodyProperty];
    var x = p2Body.x;
    var y = p2Body.y;
    
    this.water.tilePosition.x = -x;
    this.water.tilePosition.y = -y;

    this.worldGroup.position.x = -x;
    this.worldGroup.position.y = -y;

    var rotation = p2Body.rotation - LBMath.PI_2;
    var cosBoat = Math.cos(rotation);
    var sinBoat = Math.sin(rotation);
    var posX = -x * cosBoat - y * sinBoat;
    var posY = x * sinBoat - y * cosBoat;
    
    this.worldGroup.rotation = -rotation;
    this.worldGroup.position.x = posX;
    this.worldGroup.position.y = posY;
    
    this.water.rotation = -rotation;
    
    this.compass.rotation = -rotation;

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
