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
/* global Leeboard */



//--------------------------------------------------
function Boat(sailingEnv, x, y, data) {
    Phaser.Sprite.call(this, sailingEnv.game, x, y, data.type);
    
    this.sailingEnv = sailingEnv;
    this.anchor.set(0.5, 0.5);
    
    this.game.physics.enable(this);
    this.body.collideWorldBounds = true;
    
    this.appWind = new Phaser.Point(0, 0);
}

// inherit from Phaser.Sprite
Boat.prototype = Object.create(Phaser.Sprite.prototype);
Boat.prototype.constructor = Boat;

//--------------------------------------------------
Boat.prototype.update = function() {
    this.sailingEnv.wind.getFlowVelocity(this.body.x, this.body.y, this.appWind);
    this.appWind.x -= this.body.velocity.x;
    this.appWind.y -= this.body.velocity.y;
};

//--------------------------------------------------
Boat.prototype.moveTiller = function(amount) {
    if (this.isFrozen) {
        return;
    }
    
    if (amount === 0) {
        this.body.angularVelocity = 0;
    }
    else {
        this.body.angularVelocity += amount;
    }
};

//--------------------------------------------------
Boat.prototype.moveMainsheet = function(amount) {
    if (this.isFrozen) {
        return;
    }
    
    if (amount === 0) {
        this.body.velocity.x = 0;
        this.body.velocity.y = 0;
    }
    else {
        var dx = -Math.sin(this.body.rotation * Math.PI / 180);
        var dy = Math.cos(this.body.rotation * Math.PI / 180);
        
        amount = Leeboard.kt2mps(amount);
        amount = Leeboard.mpx(amount);
        this.body.velocity.x += amount * dx;
        this.body.velocity.y += amount * dy;
    }
};

//--------------------------------------------------
Boat.prototype.getHeading = function() {
    var heading = this.body.rotation;
    if (heading < 0) {
        heading += 360;
    }
    
    return heading;
};

//--------------------------------------------------
Boat.prototype.getKnots = function() {
    var speed = this.body.velocity.getMagnitude();
    speed = Leeboard.pxm(speed);
    return Leeboard.mps2kt(speed);
};

//--------------------------------------------------
Boat.prototype.getLeeway = function() {
    if ((this.body.velocity.x === 0) && (this.body.velocity.y === 0)) {
        return 0;
    }
    
    var heading = this.body.rotation;
    var boatDir = Math.atan2(this.body.velocity.y, this.body.velocity.x) * this.game.math.DEG_TO_RAD + 90;
    var leeway = boatDir - heading;
    return this.game.math.wrapAngle(leeway, false);
};

//--------------------------------------------------
Boat.prototype.getAppWindKnots = function() {
    var speed = this.appWind.getMagnitude();
    speed = Leeboard.pxm(speed);
    return Leeboard.mps2kt(speed);
};

//--------------------------------------------------
Boat.prototype.getAppWindBearing = function() {
    var angle = Math.atan2(this.appWind.y, this.appWind.x) * this.game.math.DEG_TO_RAD;
    var bearing = angle - this.body.rotation;
    return this.game.math.wrapAngle(bearing, false);
};



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
    
    this.sailEnv = new Leeboard.SailEnv(this.game);
};


//
//--------------------------------------------------
PlayState.create = function() {
    this.camera.flash('#000000');
    this.world.setBounds(-this.game.width / 2, -this.game.height / 2, this.game.width, this.game.height);
    this.camera.focusOnXY(0, 0);
    
    var clCdCurvesJSON = this.game.cache.getJSON('clCdCurves');
    var basicJSON = this.game.cache.getJSON('basic');
    
    this.sailEnv.load(clCdCurvesJSON);
    
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
    this.myBoat = new Boat(this.sailEnv, centerX, centerY, data.myBoat);
    this.worldGroup.add(this.myBoat);
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
};


//
//--------------------------------------------------
PlayState.update = function() {
    this._handleCollisions();
    
    // Update the HUD/camera after collisions but before input.
    this._updateHUD();
    this._updateCamera();

    this._handleInput();
    
    this.sailEnv.update();
};

//------------------------------ --------------------
PlayState._handleCollisions = function() {
    this.game.physics.arcade.collide(this.myBoat, this.buoys);  
};

//------------------------------ --------------------
PlayState._updateHUD = function() {
    var heading = this.myBoat.getHeading();
    this.headingText.text = "Heading: " + heading.toFixed();
    
    var speed = this.myBoat.getKnots();
    this.speedText.text = "Speed: " + speed.toFixed(2);
    
    var leewayAngle = this.myBoat.getLeeway();
    if (leewayAngle < 0) {
        this.leewayText.text = "Leeway: " + leewayAngle.toFixed() + " to Port";
    }
    else if (leewayAngle > 0) {
        this.leewayText.text = "Leeway: " + leewayAngle.toFixed() + " to Stbd";
    }
    else {
        this.leewayText.text = "Leeway: 0";
    }
    
    this.positionText.text = "Position: " + this.myBoat.position.x.toFixed() + " " + -this.myBoat.position.y.toFixed();
   
    speed = this.myBoat.getAppWindKnots();
    this.appWindSpeedText.text = "App Wind Speed: " + speed.toFixed(2);
    
    var bearing = this.myBoat.getAppWindBearing();
    this.appWindBearingText.text = "App Wind Bearing: " + bearing.toFixed();
};

//------------------------------ --------------------
PlayState._handleInput = function() {
    if (this.cursorKeys.left.isDown) {
        this.myBoat.moveTiller(-1);
    }
    else if (this.cursorKeys.right.isDown) {
        this.myBoat.moveTiller(1);
    }
    else if (this.cursorKeys.up.isDown) {
        this.myBoat.moveMainsheet(-1);
    }
    else if (this.cursorKeys.down.isDown) {
        this.myBoat.moveMainsheet(1);
    }
    else if (this.keys.space.isDown) {
        this.myBoat.moveTiller(0);
    }
    else if (this.keys.t.isDown) {
        this.debounceT = true;
    }
    else if (this.debounceT && this.keys.t.isUp) {
        this.debounceT = false;
        
        var vecA = { 'x': 10, 'b': 11};
        
        var vecB = Leeboard.createVector3D();
        Leeboard.copyCommonProperties(vecB, null);
        
        var vec = vecB;
        Object.getOwnPropertyNames(vec).forEach(
                function(val, idx, array) {
                    console.log(val + "\t" + idx + "\t" + vec[val]);
                });
        
        //var cspline = new Leeboard.CSpline();
        //cspline.test();
        //var clCdCurve = this.sailEnv.clCdCurves["FlatPlateAR5"];
        //clCdCurve.test(0, 180, 2);
    }
};

//--------------------------------------------------
PlayState._updateCamera = function() {
    this.water.tilePosition.x = -this.myBoat.position.x;
    this.water.tilePosition.y = -this.myBoat.position.y;

    this.worldGroup.position.x = -this.myBoat.position.x;
    this.worldGroup.position.y = -this.myBoat.position.y;
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


//--------------------------------------------------
window.onload = function() {
    var config = {
        width: "100",
        height: "100",
        renderer: Phaser.AUTO,
        parent: "game",
        physicsConfig: Leeboard
    };
    
    game = new Phaser.Game(config);
    game.state.add('play', PlayState);
    game.state.add('loading', LoadingState);
    game.state.start('loading');
};
