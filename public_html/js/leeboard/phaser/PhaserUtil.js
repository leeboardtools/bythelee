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

define(['lbmath', 'lbgeometry', 'phaser'],
function(LBMath, LBGeometry, Phaser) {

    'use strict';


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
    
    this.toPixX = 20;
    this.toPixY = -20;
    this.fromPixX = 1/this.toPixX;
    this.fromPixY = 1/this.toPixY;
};

LBPhaser.Env.prototype = {
    /**
     * Converts a x coordinate in our units (normally meters) to pixels.
     * @param {Number} x    The x coordinate to convert.
     * @returns {Number}    The pixels.
     */
    toPixelsX: function(x) {
        return x * this.toPixX;
    },
    
    /**
     * Converts a y coordinate in our units (normally meters) to pixels.
     * @param {Number} y    The y coordinate to convert.
     * @returns {Number}    The pixels.
     */
    toPixelsY: function(y) {
        return y * this.toPixY;
    },
    
    /**
     * Converts a right-hand rotation about the z-axis in radians to pixel space.
     * @param {Number} rad  The radians to convert.
     * @returns {Number}    The radians.
     */
    toPixelsRotationRad: function(rad) {
        return this.ySign * rad;
    },
    
    /**
     * Converts a right-hand rotation about the z-axis in degrees to pixel space.
     * @param {Number} deg  The degrees to convert.
     * @returns {Number}    The degrees.
     */
    toPixelsRotationDeg: function(deg) {
        return this.ySign * deg;
    },
    
    /**
     * Converts x pixels to our units (normally meters).
     * @param {Number} x    The x pixels.
     * @returns {Number}    Our units.
     */
    fromPixelsX: function(x) {
        return x * this.fromPixX;
    },
    
    /**
     * Converts y pixels to our units (normally meters).
     * @param {Number} y    The y pixels.
     * @returns {Number}    Our units.
     */
    fromPixelsY: function(y) {
        return y * this.fromPixY;
    },
    
    /**
     * Converts pixel space rotation in radians to a right-hand rotation about the z-axis.
     * @param {Number} rad  The radians to convert.
     * @returns {Number}    The radians.
     */
    fromPixelsRotationRad: function(rad) {
        return this.ySign * rad;
    },
    
    /**
     * Converts pixel space rotation in degrees to a right-hand rotation about the z-axis.
     * @param {Number} deg  The degrees to convert.
     * @returns {Number}    The degrees.
     */
    fromPixelsRotationDeg: function(deg) {
        return this.ySign * deg;
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
 * @param {Number} color    The RGB color.
 * @param {function} [arrowLengthScaler=LBPhaser.ArrowStyle.DEF_ARROW_LENGTH_SCALER]
 * The function to use for scaling the vector length passed to the arrow to units
 * prior to conversion to pixels.
 * @param {Number} [alpha=1]    The alpha value for the arrow, 1 = opaque, 0 = transparent.
 * @param {Number} [width=2]    The pixel width of the arrow line.
 * @param {Number} [arrowSize=20]    The nominal pixel size of the arrow head.
 * @returns {LBPhaser.ArrowStyle}
 */
LBPhaser.ArrowStyle = function(color, arrowLengthScaler, alpha, width, arrowSize) {
    /**
     * The RGB color of the arrow.
     * @type number
     */
    this.color = color;
    
    /**
     * The pixel width of the arrow.
     * @type number
     */
    this.width = width || 2;
    
    /**
     * The maximum size of the arrowhead in pixels.
     * @type number
     */
    this.arrowSize = arrowSize || 20;
    
    /**
     * The alpha opacity to apply when drawing the arrow.
     * @type number
     */
    this.alpha = alpha || 1;
    
    /**
     * The function used to scale the arrow length to modeling units (modeling units
     * are what are passed to {@link LBPhaser.Env#toPixelsX} and {@link LBPhaser.Env#toPixelsY}.
     * @type function
     */
    this.arrowLengthScaler = arrowLengthScaler || LBPhaser.ArrowStyle.DEF_ARROW_LENGTH_SCALER;
    
    /**
     * Style visibility flag, can be used to hide all arrows that use this style.
     * @type boolean
     */
    this.isVisible = true;
};

/**
 * The default arrow length function that is used to scale the arrow length to modeling units (modeling units
 * are what are passed to {@link LBPhaser.Env#toPixelsX} and {@link LBPhaser.Env#toPixelsY}.
 * @param {Number} length   The arrow length to be scaled.
 * @returns {Number}    The scaled length.
 */
LBPhaser.ArrowStyle.DEF_ARROW_LENGTH_SCALER = function(length) {
    return length;
};

LBPhaser.ArrowStyle._workingPath = [0, 1, 2, 3, 4, 5, 5, 4, 3, 2, 1, 0];
LBPhaser.ArrowStyle.prototype = {
    /**
     * Main function called by {@link LBPhaser.Arrow}'s setup methods to set up the
     * graphics object with the arrow.
     * @param {LBPhaser.Env} env    Our Phaser environment.
     * @param {Phaser.Graphics} g   The Phaser graphics object that draws the arrow.
     * @param {LBGeometry.Vector2} base The base of the arrow.
     * @param {LBGeometry.Vector2} tip   The tip of the arrow.
     * @returns {undefined}
     */
    setupArrowGraphics: function(env, g, base, tip) {
        g.clear();
        
        var dx = tip.x - base.x;
        var dy = tip.y - base.y;
        var length = Math.sqrt(dx * dx + dy * dy);
        if (LBMath.isLikeZero(length)) {
            return;
        }
        
        dx /= length;
        dy /= length;
        length = this.arrowLengthScaler(length);
        
        var baseX = env.toPixelsX(base.x);
        var baseY = env.toPixelsY(base.y); 
        
        dx = env.toPixelsX(dx * length);
        dy = env.toPixelsY(dy * length);
        length = Math.sqrt(dx * dx + dy * dy);

        var dirX = dx / length;
        var dirY = dy / length;
        
        var tipX = baseX + dx;
        var tipY = baseY + dy;
        
        var arrowSize = Math.min(this.arrowSize, length);
        
        var leftX = dy - dx;
        var leftY = -dx - dy;
        var endLen = Math.sqrt(leftX * leftX + leftY * leftY);
        var arrowScale = arrowSize / endLen;
        leftX = tipX + arrowScale * leftX;
        leftY = tipY + arrowScale * leftY;
        
        var rightX = -dy - dx;
        var rightY = dx - dy;
        rightX = tipX + arrowScale * rightX;
        rightY = tipY + arrowScale * rightY;

        if (this.width > 2) {
            this._setThickArrow(g, dirX, dirY, baseX, baseY, tipX, tipY, leftX, leftY, rightX, rightY, arrowSize);
        }
        else {
            this._setLineArrow(g, baseX, baseY, tipX, tipY, leftX, leftY, rightX, rightY);
        }
    },
    
    /**
     * Called by {@link LBPhaser.ArrowStyle#setupArrowGraphics} when the style width is &gt; 2, this draws the
     * arrow using a polygon. All values are in pixels.
     * @protected
     * @param {Phaser.Graphics} g   The Phaser graphics object.
     * @param {Number} dirX The normalized x component of the arrow direction.
     * @param {Number} dirY The normalized y component of the arrow direction.
     * @param {Number} baseX    The x coordinate of the base center.
     * @param {Number} baseY    The y coordinate of the base center.
     * @param {Number} tipX The x coordinate of the tip.
     * @param {Number} tipY The y coordinate of the tip.
     * @param {Number} leftX    The x coordinate of the left arrowhead point.
     * @param {Number} leftY    The y coordinate of the left arrowhead point.
     * @param {Number} rightX   The x coordinate of the right arrowhead point.
     * @param {Number} rightY   The y coordinate of the right arrowhead point.
     * @param {Number} arrowSize    The size of the arrowhead.
     * @returns {undefined}
     */
    _setThickArrow: function(g, dirX, dirY, baseX, baseY, tipX, tipY, leftX, leftY, rightX, rightY, arrowSize) {
        var path = LBPhaser.ArrowStyle._workingPath;
        
        var baseDX = -0.5 * this.width * dirY;
        var baseDY = 0.5 * this.width * dirX;
        var innerX = 0.5 * (leftX + rightX);
        var innerY = 0.5 * (leftY + rightY);
        
        path[0] = tipX;
        path[1] = tipY;
        path[2] = leftX;
        path[3] = leftY;
        path[4] = innerX + baseDX;    // Inside left
        path[5] = innerY + baseDY;
        path[6] = baseX + baseDX;    // Base left
        path[7] = baseY + baseDY;
        path[8] = baseX - baseDX;    // Base right
        path[9] = baseY - baseDY;
        path[10] = innerX - baseDX;   // Inside right
        path[11] = innerY - baseDY;
        path[12] = rightX;   // Outside right
        path[13] = rightY;
        path[14] = tipX;
        path[15] = tipY;
        
        g.beginFill(this.color, this.alpha);
        g.drawPolygon(path);
        g.endFill();
    },
    
    /**
     * Called by {@link LBPhaser.ArrowStyle#setupArrowGraphics} when the style width is &le; 2, this draws the
     * arrow using lines. All values are in pixels.
     * @protected
     * @param {Phaser.Graphics} g   The Phaser graphics object.
     * @param {Number} baseX    The x coordinate of the base center.
     * @param {Number} baseY    The y coordinate of the base center.
     * @param {Number} tipX The x coordinate of the tip.
     * @param {Number} tipY The y coordinate of the tip.
     * @param {Number} leftX    The x coordinate of the left arrowhead point.
     * @param {Number} leftY    The y coordinate of the left arrowhead point.
     * @param {Number} rightX   The x coordinate of the right arrowhead point.
     * @param {Number} rightY   The y coordinate of the right arrowhead point.
     * @returns {undefined}
     */
    _setLineArrow: function(g, baseX, baseY, tipX, tipY, leftX, leftY, rightX, rightY) {
        g.lineStyle(this.width, this.color, this.alpha);
        g.moveTo(baseX, baseY);
        g.lineTo(tipX, tipY);

        g.moveTo(tipX, tipY);
        g.lineTo(leftX, leftY);

        g.moveTo(tipX, tipY);
        g.lineTo(rightX, rightY);
    },
    
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
    /**
     * The Phaser environment.
     * @type LBPhaser.Env
     */
    this.env = env;
    
    /**
     * The graphics object used to draw the arrow.
     * @type Phaser.Graphics
     */
    this.graphics = env.game.add.graphics(0, 0, group);
    
    /**
     * The arrow's style.
     * @type LBPhaser.ArrowStyle
     */
    this.style = style || LBPhaser.ArrowStyle.DEFAULT;
    
    /**
     * The local visibility flag for the arrow, the arrow is only drawn
     * if both this and the style's visibility flags are true.
     * @type boolean
     */
    this.isVisible = true;
};

LBPhaser.Arrow._workingTip = new LBGeometry.Vector2();
LBPhaser.Arrow.prototype = {
    /**
     * Sets the arrow from a point defining the base and a vector defining the
     * length and direction of the arrow from the base.
     * @param {LBGeometry.Vector2} base The base of the arrow.
     * @param {LBGeometry.Vector2} vector   The vector describing the length and direction of the
     * arrow from base. A 2D or 3D vector.
     * @returns {undefined}
     */
    setFromBaseAndVector: function(base, vector) {
        var g = this._getVisibleGraphics();
        if (g) {
            var tip = LBPhaser.Arrow._workingTip.copy(base);
            tip.add(vector);
            this.style.setupArrowGraphics(this.env, g, base, tip);
        }
    },
    
    /**
     * Sets the arrow from a point defining the base and a vector defining the
     * length and direction of the arrow from the base to the tip.
     * @param {LBGeometry.Vector2} tip The tip of the arrow.
     * @param {LBGeometry.Vector2} vector   The vector describing the length and direction of the
     * arrow from base. A 2D or 3D vector.
     * @returns {undefined}
     */
    setFromTipAndVector: function(tip, vector) {
        var g = this._getVisibleGraphics();
        if (g) {
            var base = LBPhaser.Arrow._workingTip.copy(tip);
            base.sub(vector);
            this.style.setupArrowGraphics(this.env, g, base, tip);
        }
    },
    
    _getVisibleGraphics: function() {
        var g = this.graphics;
        g.visible = this.style.isVisible && this.isVisible;
        return (g.visible) ? g : undefined;
    },
    
    /**
     * Call when done with the arrow, this releases references to other objects in the
     * hope that it can be garbage collected.
     * @returns {undefined}
     */
    destroy: function() {
        if (this.graphics) {
            this.graphics.destroy();
            this.graphics = null;
            this.env = null;
            this.style = null;
        }
    },
  
    constructor: LBPhaser.Arrow
};

return LBPhaser;
});