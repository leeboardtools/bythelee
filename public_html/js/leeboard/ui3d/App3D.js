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


/* global LBUI3d, LBUtil */
define(['lbutil', 'lbdebug', 'lbui3dbase', 'lbscene3d', 'lbview3d'], 
function(LBUtil, LBDebug, LBUI3d) {

    'use strict';

/**
 * My 3D application framework module, these classes all rely upon ThreeJS.
 * If this description and the LBUI3d static members appear multiple times in the docs,
 * that's a limitation of JSDoc: {@link https://github.com/jsdoc3/jsdoc/issues/515}.
 * @exports LBUI3d
 */
var LBUI3d = LBUI3d || {};

/**
 * Our 3D application framework.
 * @constructor
 * @return {module:LBUI3d.App3D}
 */
LBUI3d.App3D = function() {
    
    /**
     * The current running state.
     */
    this._runState = LBUI3d.App3D.RUN_STATE_NOT_STARTED;
    
    /**
     * The main scene.
     * @member {Number}
     */
    this.mainScene = new LBUI3d.Scene3D();

    /**
     * Array of views managed by the app.
     * @member {module:LBUI3d.View3D[]}
     */
    this.views = [];

    /**
     * The current number of frames per second.
     * @member {Number}
     */
    this.fps = 0;

    /**
     * The number of times a frame has been rendered.
     * @member {Number}
     */
    this.frameCount = 0;
    
    /**
     * The number of milliseconds elapsed between the last frame and the current frame.
     * @member {Number}
     */
    this.lastFrameMillisecs = 0;
    
    /**
     * The total number of milliseconds the application has been operating in run or step mode.
     * @member {Number}
     */
    this.runMillisecs = 0;
    
    /**
     * The mouse mode currently active in all the views.
     * @member {module:LBUI3d.View3D.MOUSE_ROTATE_MODE|LBUI3d.View3D.MOUSE_PAN_MODE}
     */
    this.mouseMode = LBUI3d.View3D.MOUSE_ROTATE_MODE;
    
    
    this._nextSecondTimeStamp = (performance || Date).now() + 1000;
    this._prevSecondFrameCount = 0;
    this._lastFrameTimeStamp = 0;

    /**
     * A time recorder to be used for debugging execution times within the update or
     * render loops. The default is a {@link module:LBDebug.NullTimeRecorder}, which 
     * does nothing.
     * @member {module:LBDebug.TimeRecorder}
     */
    this.debugTimeRecorder = new LBDebug.NullTimeRecorder();
    
    /**
     * The period, in milliseconds, in which to output the debugging times.
     * @member {Number}
     */
    this.deltaSocketEmitMs = 5000;
    
    this._nextSocketEmit = performance.now() + this.deltaSocketEmitMs;
    
    if (typeof io === "function") {
        this.socket = io();
    }
};

LBUI3d.App3D.RUN_STATE_NOT_STARTED = 0;
LBUI3d.App3D.RUN_STATE_RUNNING = 1;
LBUI3d.App3D.RUN_STATE_PAUSED = 2;

LBUI3d.App3D.activeApp = undefined;
LBUI3d.App3D.prototype = {
    constructor: LBUI3d.App3D
};

/**
 * The main initialization function.
 * @protected
 * @param {Object} mainContainer    The main DOM container.
 */
LBUI3d.App3D.prototype.init = function(mainContainer) {
    this.mainContainer = mainContainer;
    var me = this;
    window.addEventListener('resize', function() { me.onWindowResize(); }, false);
};

/**
 * Retrieves the current run state, one of the LBUI3d.App3D.RUN_STATE_ constants.
 * @return {Number} The current run state.
 */
LBUI3d.App3D.prototype.getRunState = function() {
    return this._runState;
};

/**
 * 
 * @return {Boolean}    True if the application run state is running.
 */
LBUI3d.App3D.prototype.isRunning = function() {
    return this._runState === LBUI3d.App3D.RUN_STATE_RUNNING;
};

/**
 * 
 * @return {Boolean}    True if the application run state is paused.
 */
LBUI3d.App3D.prototype.isPaused = function() {
    return this._runState === LBUI3d.App3D.RUN_STATE_PAUSED;
};

/**
 * Toggles the application run state between running and paused.
 */
LBUI3d.App3D.prototype.togglePaused = function() {
    if (this._runState === LBUI3d.App3D.RUN_STATE_RUNNING) {
        this.pause();
    }
    else {
        this.runContinuous();
    }
};

/**
 * Puts the application run state into pause.
 */
LBUI3d.App3D.prototype.pause = function() {
    if (this._runState === LBUI3d.App3D.RUN_STATE_RUNNING) {
        this._runState = LBUI3d.App3D.RUN_STATE_PAUSED;
    }
};

/**
 * Puts the application run state into continuous running.
 */
LBUI3d.App3D.prototype.runContinuous = function() {
    if (this._runState !== LBUI3d.App3D.RUN_STATE_RUNNING) {
        this._runState = LBUI3d.App3D.RUN_STATE_RUNNING;
        this._lastFrameTimeStamp = 0;
        LBUI3dApp3DAnimate((performance || Date).now());
    }
};

/**
 * Performs one simulation/render pass and the puts the application run state into pause.
 */
LBUI3d.App3D.prototype.runSingleStep = function() {
    if (this._runState === LBUI3d.App3D.RUN_STATE_RUNNING) {
        this.pause();
    }
    else {
        this._lastFrameTimeStamp = 0;
        LBUI3dApp3DAnimate((performance || Date).now());
        this._runState = LBUI3d.App3D.RUN_STATE_PAUSED;
    }
};

/**
 * Adds a view to the application.
 * @param {LBUI3d.View} view    The view to add.
 */
LBUI3d.App3D.prototype.addView = function(view) {
    this.views.push(view);
    view.setMouseMode(this.mouseMode);
};

/**
 * Removes a view from the application.
 * @param {LBUI3d.View} view    The view to remove.
 */
LBUI3d.App3D.prototype.removeView = function(view) {
    var index = this.views.indexOf(view);
    if (index >= 0) {
        this.views.splice(index, 1);
    }
};

/**
 * Changes the mouse mode of all the views and their camera controllers.
 * @param {Number} mode The mouse mode to set.
 */
LBUI3d.App3D.prototype.setMouseMode = function(mode) {
    if (this.mouseMode !== mode) {
        this.views.forEach(function(view) {
            view.setMouseMode(mode);
        });
        this.mouseMode = mode;
    }
};

/**
 * Sets the current mouse mode to rotate.
 */
LBUI3d.App3D.prototype.setRotateMode = function() {
    this.setMouseMode(LBUI3d.View3D.MOUSE_ROTATE_MODE);
};

/**
 * Sets the current mouse mode to pan.
 */
LBUI3d.App3D.prototype.setPanMode = function() {
    this.setMouseMode(LBUI3d.View3D.MOUSE_PAN_MODE);
};

/**
 * Changes the current mouse mode to the 'next' mouse mode.
 * @return {Number} The newly set mouse mode.
 */
LBUI3d.App3D.prototype.nextMouseMode = function() {
    switch (this.mouseMode) {
    case LBUI3d.View3D.MOUSE_PAN_MODE :
        this.setRotateMode();
        break;
        
    case LBUI3d.View3D.MOUSE_ROTATE_MODE :
        this.setPanMode();
        break;
    }
    return this.mouseMode;
};

/**
 * The 'resize' event handler for the top-level window.
 * @protected
 */
LBUI3d.App3D.prototype.onWindowResize = function() {
    this.views.forEach(function(view) {
        view.onWindowResize();
    });
};

/**
 * Toggles full screen mode.
 * @param {Object} container    A DOM container object.
 * @return {unresolved}
 */
LBUI3d.App3D.prototype.toggleFullScreen = function(container) {
    container = container || this.mainContainer;
    return LBUtil.toggleFullScreen(container);
};

/**
 * Called each cycle, before {@link module:LBUI3d.App3D.render}.
 * @protected
 * @param {Number} dt The number of milliseconds since the last call to this.
 */
LBUI3d.App3D.prototype.update = function(dt) {
    this.debugTimeRecorder.start('App3D.update');
    this.views.forEach(function(view) {
        view.update(dt);
    });
    this.debugTimeRecorder.end('App3D.update');
};

/**
 * Called each render cycle.
 * @protected
 * @param {Number} dt The number of milliseconds since the last call to this.
 */
LBUI3d.App3D.prototype.render = function(dt) {
    this.debugTimeRecorder.start('App3D.render');
    this.views.forEach(function(view) {
        view.render(dt);
    });
    this.debugTimeRecorder.end('App3D.render');
};

/**
 * Called each time the number of frames per second has been updated.
 * @protected
 */
LBUI3d.App3D.prototype.fpsUpdated = function() {
    
};

var debug_timing_count = 0;

LBUI3d.App3D.prototype._cycle = function(timeStamp) {
    var timeRecord = this.debugTimeRecorder.start('App3D._cycle');
    var lastMaxMs = timeRecord ? timeRecord.maxMs : 0;
    
    if (this._runState === LBUI3d.App3D.RUN_STATE_RUNNING) {
        requestAnimationFrame(LBUI3dApp3DAnimate);
    }
    
    if (timeStamp >= this._nextSecondTimeStamp) {
        this.fps = (this.frameCount - this._lastSecondFrameCount) * 1000 / (timeStamp - this._nextSecondTimeStamp + 1000);
        this._lastSecondFrameCount = this.frameCount;
        this._nextSecondTimeStamp = timeStamp + 1000;
        this.fpsUpdated();
    }
    
    if (this._lastFrameTimeStamp) {
        this.lastFrameMillisecs = timeStamp - this._lastFrameTimeStamp;
    }
    else {
        this.lastFrameMillisecs = 1000/60;
    }
    
    var dt = this.lastFrameMillisecs / 1000;
    this.update(dt);
    this.render(dt);
    ++this.frameCount;
    this.runMillisecs += this.lastFrameMillisecs;

    this._lastFrameTimeStamp = timeStamp;
    
    if (timeRecord) {
        timeRecord.end();
        if (timeRecord.maxMs > lastMaxMs) {
            this.debugTimeRecorder.freeze();
        }
    }
    
    if (!this.debugTimeRecorder.isNullTimeRecorder) {
        var now = performance.now();
        if (now >= this._nextSocketEmit) {
            this._nextSocketEmit = now + this.deltaSocketEmitMs;
            
            var summary = this.debugTimeRecorder.getSummary(true);
            summary.fps = this.fps;
            
            if (this.socket) {
                this.socket.emit('debug-timing', summary);
            }
            else {
                var data = summary;
                console.log('');
                var now = new Date();
                console.log('debug-timing(' + debug_timing_count + '):' + now.toTimeString());
                if (data.fps) {
                    console.log('FPS:\t' + data.fps.toFixed(1));
                }
                Object.keys(data).forEach(function(key) {
                    var record = data[key];
                    if (key !== 'fps') {
                                console.log(key + ':\t' + record.maxMs.toFixed(2) + '\t' + record.frozenMs.toFixed(2) + '\t' + record.averageMs.toFixed(2) + '\t' + record.count);
                    }
                });

                ++debug_timing_count;
            }
        }
    }
};

function LBUI3dApp3DAnimate(timeStamp) {
    LBUI3d.App3D.activeApp._cycle(timeStamp);
}

/**
 * The main function for starting the application.
 * @param {Object} mainContainer    The main DOM container.
 * @param {Boolean} [startPaused=false] If true the application is started in the
 * paused state.
 */
LBUI3d.App3D.prototype.start = function(mainContainer, startPaused) {
    LBUI3d.App3D.activeApp = this;
    
    this.init(mainContainer);
    
    if (startPaused) {
        this._runState = LBUI3d.App3D.RUN_STATE_PAUSED;
    }
    else {
        this._runState = LBUI3d.App3D.RUN_STATE_RUNNING;
        LBUI3dApp3DAnimate((performance || Date).now());
    }
};

return LBUI3d;
});