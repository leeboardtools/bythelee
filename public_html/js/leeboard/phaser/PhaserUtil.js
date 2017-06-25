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

/* global Leeboard, LBMath, Phaser */

/**
 * @namespace LBPhaser
 */
var LBPhaser = LBPhaser || {};

/**
 * This is used as the central environment for the Leeboard-Phaser interface.
 * @constructor
 * @param {Phaser.Game} game    The Phaser game object.
 * @returns {LBPhaser.Env}
 */
LBPhaser.Env = function(game) {
    this.game = game;

    /**
     * Set this to -1 to make the y-axis going up, otherwise set it to +1 to make the y-axis
     * go down.
     */
    this.ySign = 1;
};

LBPhaser.Env.prototype = {
    /**
     * Converts a x coordinate in our units (normally meters) to pixels.
     * @param {Number} x    The x coordinate to convert.
     * @returns {Number}    The pixels.
     */
    toPixelsX: function(x) {
        return -this.game.physics.p2.mpxi(x);
    },
    
    /**
     * Converts a y coordinate in our units (normally meters) to pixels.
     * @param {Number} y    The y coordinate to convert.
     * @returns {Number}    The pixels.
     */
    toPixelsY: function(y) {
        return -this.ySign * this.game.physics.p2.mpxi(y);
    },
    
    /**
     * Converts x pixels to our units (normally meters).
     * @param {Number} x    The x pixels.
     * @returns {Number}    Our units.
     */
    fromPixelsX: function(x) {
        return -this.game.physics.p2.pxmi(x);
    },
    
    /**
     * Converts y pixels to our units (normally meters).
     * @param {Number} y    The y pixels.
     * @returns {Number}    Our units.
     */
    fromPixelsY: function(y) {
        return -this.ySign * this.game.physics.p2.pxmi(y);
    },
    
    constructor: LBPhaser.Env
};

/**
 * Extension of {Phaser.Point}, adding a copy function.
 * @param {object} src  The object to be copied.
 * @returns {Phaser.Point}  this.   
 */
Phaser.Point.prototype.copy = function(src) {
    this.x = src.x || this.x;
    this.y = src.y || this.y;
    return this;
};


/**
 * Object representing the style information used for an {@link LBPhaser.Arrow}.
 * @constructor
 * @param {number} color    The RGB color.
 * @param {function} [arrowLengthScaler=LBPhaser.ArrowStyle.DEF_ARROW_LENGTH_SCALER]
 * The function to use for scaling the vector length passed to the arrow to units
 * prior to conversion to pixels.
 * @param {number} [alpha=1]    The alpha value for the arrow, 1 = opaque, 0 = transparent.
 * @param {number} [width=2]    The pixel width of the arrow line.
 * @param {number} [arrowSize=20]    The nominal pixel size of the arrow head.
 * @returns {LBPhaser.ArrowStyle}
 */
LBPhaser.ArrowStyle = function(color, arrowLengthScaler, alpha, width, arrowSize) {
    this.color = color;
    this.width = width || 2;
    this.arrowSize = arrowSize || 20;
    this.alpha = alpha || 1;
    this.arrowLengthScaler = arrowLengthScaler || LBPhaser.ArrowStyle.DEF_ARROW_LENGTH_SCALER;
    this.isVisible = true;
};

LBPhaser.ArrowStyle.DEF_ARROW_LENGTH_SCALER = function(length) {
    return length;
};

LBPhaser.ArrowStyle.prototype = {
    
    constructor: LBPhaser.ArrowStyle
};

/**
 * The default {@link LBPhaser.Arrow} style.
 * @type LBPhaser.ArrowStyle
 */
LBPhaser.ArrowStyle.DEFAULT = new LBPhaser.ArrowStyle();


/**
 * A {@link Phaser.Graphics} based arrow.
 * @constructor
 * @param {LBPhaser.Env} env    The Phaser environment.
 * @param {Phaser.Group} [group]    If defined the group the arrow is added to.
 * @param {LBPhaser.ArrowStyle} [style=LBPhaser.ArrowStyle.DEFAULT] If defined the style for the arrow,
 * if not defined {@link LBPhaser.ArrowStyle.DEFAULT} will be used.
 * @returns {LBPhaser.Arrow}
 */
LBPhaser.Arrow = function(env, group, style) {
    this.env = env;
    this.graphics = env.game.add.graphics(0, 0, group);
    this.style = style || LBPhaser.ArrowStyle.DEFAULT;
};

LBPhaser.Arrow.prototype = {
    /**
     * Sets the arrow from a point defining the base and a vector defining the
     * length and direction of the arrow from the base.
     * @param {object} base The base of the arrow, a 2D or 3D vector.
     * @param {object} vector   The vector describing the length and direction of the
     * arrow from base. A 2D or 3D vector.
     * @returns {undefined}
     */
    setFromBaseAndVector: function(base, vector) {
        var g = this.graphics;
        g.visible = this.style.isVisible;
        if (!this.style.isVisible) {
            return;
        }
        
        g.clear();
        
        var length = vector.length();
        if (LBMath.isLikeZero(length)) {
            return;
        }
        var dx = vector.x / length;
        var dy = vector.y / length;
        length = this.style.arrowLengthScaler(length);
        
        g.lineStyle(this.style.width, this.style.color, this.style.alpha);
        
        var baseX = this.env.toPixelsX(base.x);
        var baseY = this.env.toPixelsY(base.y); 
        g.moveTo(baseX, baseY);
        
        dx = this.env.toPixelsX(dx * length);
        dy = this.env.toPixelsY(dy * length);
        length = Math.sqrt(dx * dx + dy * dy);
        
        var tipX = baseX + dx;
        var tipY = baseY + dy;
        g.lineTo(tipX, tipY);
        
        var arrowSize = Math.min(this.style.arrowSize, length * 0.707);
        
        var endX = -dy - dx;
        var endY = dx - dy;
        var endLen = Math.sqrt(endX * endX + endY * endY);
        endX = arrowSize * endX / endLen;
        endY = arrowSize * endY / endLen;
        g.lineTo(tipX + endX, tipY + endY);
        
        endX = dy - dx;
        endY = -dx - dy;
        endLen = Math.sqrt(endX * endX + endY * endY);
        endX = arrowSize * endX / endLen;
        endY = arrowSize * endY / endLen;

        g.moveTo(tipX, tipY);
        g.lineTo(tipX + endX, tipY + endY);
    },
  
    constructor: LBPhaser.Arrow
};

