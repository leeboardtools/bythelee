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


define(['lbphaserutil', 'lbmath', 'phaser'],
function(LBPhaser, LBMath, Phaser) {

    'use strict';



/**
 * A Phaser based slider control, the control contains a thumb that moves along either
 * the local x-axis (horizontal orientation) or the local y-axis (vertical orientation).
 * <p>
 * The control creates a group ({@link LBPhaser.Slider#group}) to which it adds the thumb and other drawing objects,
 * the control can be positioned and rotated by directly accessing that group.
 * @constructor
 * @param {Phaser.game} game    The Phaser game object.
 * @param {Number} lowerValue   The value associated with one end of the controlled range.
 * @param {Number} lowerValuePixel  The pixel value associated with lowerValue, this is the
 * position of the sprite when the current value is lowerValue.
 * @param {Number} upperValue   The value associated with the other end of the controlled range.
 * @param {Number} upperValuePixel  The pixel value associated with upperValue, this is the
 * position of the sprite when the current value is upperValue.
 * @param {Boolean} isVertical  If true the thumb locally moves vertically, otherwise it moves
 * horizontally.
 * @param {Phaser.Sprite | Phaser.Image} thumbSprite    The sprite representing the
 * thumb (the draggable part)
 * @param {Object} [bkgdObject]   The background drawing object. If this is a {@link Phaser.TileSprite
 * its tile position will be updated to match the pixel position of the thumb.
 * @param {Object} [lowerImage] If defined, a label that appears outside the side of the
 * control with corresponding to lowerValue.
 * @param {Object} [upperImage] If defined, a label that appears outside the side of the
 * control with corresponding to upperValue.
 * @returns {LBPhaser.Slider}
 */
LBPhaser.Slider = function(game, lowerValue, lowerValuePixel, upperValue, upperValuePixel, 
        isVertical, thumbSprite, bkgdObject, lowerImage, upperImage) {
    
    /**
     * One limit of the controlled value.
     * @readonly
     * @member {Number}
     */
    this.lowerValue = lowerValue;
    
    /**
     * The thumb pixel position corresponding to {@link LBPhaser.Slider#lowerValue}.
     * @readonly
     * @member {Number}
     */
    this.lowerValuePixel = lowerValuePixel;

    /**
     * Another limit of the controlled value.
     * @readonly
     * @member {Number}
     */
    this.upperValue = upperValue;

    /**
     * The thumb pixel position corresponding to {@link LBPhaser.Slider#upperValue}.
     * @readonly
     * @member {Number}
     */
    this.upperValuePixel = upperValuePixel;
    
    /**
     * The group of the control, position or rotate this to move or rotate the control.
     * @member {Phaser.Group}
     */
    this.group = game.add.group();

    /**
     * The sprite representing the thumb.
     * @member {Phaser.Sprite}
     */
    this.thumbSprite = thumbSprite;
    
    thumbSprite.inputEnabled = true;
    
    var minPixel;
    var maxPixel;
    if (lowerValuePixel <= upperValuePixel) {
        minPixel = lowerValuePixel;
        maxPixel = upperValuePixel;
    }
    else {
        minPixel = upperValuePixel;
        maxPixel = lowerValuePixel;
    }
    
    var bounds;
    var alignment;
    if (isVertical) {
        bounds = new Phaser.Rectangle(-thumbSprite.width / 2, minPixel - thumbSprite.height / 2, thumbSprite.width, maxPixel - minPixel + thumbSprite.height);
        this.getActivePos = function(x, y) {
            return y;
        };
        this.getActiveSize = function(sprite) {
            return sprite.height;
        };
        this.getAlignedSize = function(sprite) {
            return sprite.width;
        };
        this.setSpritePos = function(sprite, pos) {
            sprite.position.y = pos;
        };
        this.getSpritePos = function(sprite) {
            return sprite.position.y;
        };
        this.setSpriteAlignedPos = function(sprite, pos) {
            sprite.position.x = pos;
        };
        this.setTilePosition = function(sprite, x, y) {
            sprite.tilePosition.y = y;
        };
        thumbSprite.input.setDragLock(false, true);
        alignment = -thumbSprite.width / 2;
    }
    else {
        bounds = new Phaser.Rectangle(minPixel - thumbSprite.width / 2, -thumbSprite.height / 2, maxPixel - minPixel + thumbSprite.width, thumbSprite.height);
        this.getActivePos = function(x, y) {
            return x;
        };
        this.getActiveSize = function(sprite) {
            return sprite.width;
        };
        this.getAlignedSize = function(sprite) {
            return sprite.height;
        };
        this.setSpritePos = function(sprite, pos) {
            sprite.position.x = pos;
        };
        this.getSpritePos = function(sprite) {
            return sprite.position.x;
        };
        this.setSpriteAlignedPos = function(sprite, pos) {
            sprite.position.y = pos;
        };
        this.setTilePosition = function(sprite, x, y) {
            sprite.tilePosition.x = x;
        };
        thumbSprite.input.setDragLock(true, false);
        alignment = -thumbSprite.height / 2;
    }
    
    thumbSprite.input.enableDrag(false, false, false, false, bounds);
    thumbSprite.events.onDragUpdate.add(this._dragUpdate, this);

    var x = LBMath.clamp(this.getSpritePos(thumbSprite), this.lowerValuePixel, this.upperValuePixel);
    this.setSpritePos(thumbSprite, x);
    this.value = this.pixelToValue(x);
    this.setSpriteAlignedPos(thumbSprite, alignment);
    
    if (bkgdObject) {
        this.bkgdObject = bkgdObject;
        this.group.add(bkgdObject);
        this.setSpriteAlignedPos(bkgdObject, alignment);
        if (bkgdObject.tilePosition) {
            this.setTilePosition(bkgdObject, thumbSprite.position.x, thumbSprite.position.y);
            bkgdObject.left = bounds.left;
            bkgdObject.top = bounds.top;
            bkgdObject.width = bounds.width;
            bkgdObject.height = bounds.height;
        }
    }
    
    if (lowerValue > upperValue) {
        var tmp = lowerImage;
        lowerImage = upperImage;
        upperImage = tmp;
    }
    
    if (lowerImage) {
        this.group.add(lowerImage);
        this.setSpriteAlignedPos(lowerImage, alignment);
        var edge = this.getActivePos(bounds.left, bounds.top);
        edge -= this.getActiveSize(lowerImage);
        this.setSpritePos(lowerImage, edge);
    }
    
    if (upperImage) {
        this.group.add(upperImage);
        this.setSpriteAlignedPos(upperImage, alignment);
        var edge = this.getActivePos(bounds.right, bounds.bottom);
        this.setSpritePos(upperImage, edge);
    }
    
    this.group.add(thumbSprite);
};

LBPhaser.Slider.prototype = {
    /**
     * Sets the callback called whenever the slider's thumb is moved.
     * @param {function} callback   The callback function, it has the signature:
     * <p>
     * callback = function(newValue, slider);
     * @param {Object} [callbackThis]   If defined, this is the 'this' context for
     * when the callback function is called.
     * @returns {LBPhaser.Slider}   this.
     */
    setCallback: function(callback, callbackThis) {
        this.callback = callback;
        this.callbackThis = callbackThis;
        return this;
    },
    
    /**
     * @returns {Number}    The current controlled value.
     */
    getValue: function() {
        return this.value;
    },
    
    /**
     * Sets the slider's controlled value. This does NOT call the callback function.
     * @param {Number} value    The new value, this is clamped to the lower and upper values.
     * @returns {LBPhaser.Slider}   this.
     */
    setValue: function(value) {
        value = LBMath.clamp(value, this.lowerValue, this.upperValue);
        if (this.value !== value) {
            this._setValue(value);
            var pixel = this.lowerValuePixel 
                    + (value - this.lowerValue) * (this.upperValuePixel - this.lowerValuePixel) / (this.upperValue - this.lowerValue);
            this.setSpritePos(this.thumbSprite, pixel);
        }
        return this;
    },
    
    _setValue: function(value) {
        this.value = value;
        if (this.bkgdObject.tilePosition) {
            this.setTilePosition(this.bkgdObject, this.thumbSprite.position.x, this.thumbSprite.position.y);
        }
    },
    
    /**
     * Converts a pixel value to the corresponding controlled value. The control value
     * limits are enforced.
     * @param {Number} pixel    The pixel value to convert.
     * @returns {Number}    The controlled value equivalent.
     */
    pixelToValue: function(pixel) {
        var value = this.lowerValue + (pixel - this.lowerValuePixel) 
            * (this.upperValue - this.lowerValue) / (this.upperValuePixel - this.lowerValuePixel);
        return LBMath.clamp(value, this.lowerValue, this.upperValue);
    },
    
    _dragUpdate: function(obj, pointer, newX, newY, snap, fromStart) {
        var pixel = this.getActivePos(newX, newY);
        var value = this.pixelToValue(pixel);
        if (value !== this.value) {
            this._setValue(value);
            
            if (this.callback) {
                if (this.callbackThis) {
                    this.callback.call(this.callbackThis, value, this);
                }
                else {
                    this.callback(value, this);
                }
            }
        }
    },
    
    /**
     * Call when done with the control to let it free up its internal references
     * and hopefully be garbage collected.
     * @returns {undefined}
     */
    destroy: function() {
        if (this.group) {
            this.group.destroy();
            this.group = undefined;
            this.thumbSprite = undefined;
            this.bkgdObject = undefined;
            this.callback = undefined;
            this.callbackThis = undefined;
        }
    },
    
    constructor: LBPhaser.Slider
};


/**
 * A Phaser based rotary dial control. The control contains a thumb that rotates
 * about the local origin.
 * <p>
 * The control creates a group ({@link LBPhaser.Dial#group}) to which it adds the thumb and other drawing objects,
 * the control can be positioned and rotated by directly accessing that group.
 * @constructor
 * @param {Phaser.Game} game    The Phaser game object.
 * @param {Number} lowerValue   The value associated with one end of the controlled range.
 * @param {Number} lowerDeg     The local rotation angle of the thumb in degrees corresponding to
 * lowerValue.
 * @param {Number} upperValue   The value associated with the other end of the controlled range.
 * @param {Number} upperDeg     The local rotation angle of the thumb in degrees corresponding to
 * upperValue.
 * @param {Phaser.Sprite} thumbSprite  The sprite representing the thumb, this is rotated about
 * the local origin.
 * @param {Object} [bkgdObject]   The optional background appearing behind the thumb.
 * @returns {LBPhaser.Dial}
 */
LBPhaser.Dial = function(game, lowerValue, lowerDeg, upperValue, upperDeg, thumbSprite, bkgdObject) {
    /**
     * One limit of the controlled value.
     * @readonly
     * @member {Number}
     */
    this.lowerValue = lowerValue;
    
    /**
     * The rotation of the thumb sprite, in degrees, corresponding to a controlled
     * value of {@link LBPhaser.Dial#lowerValue}.
     * @readonly
     * @member {Number}
     */
    this.lowerDeg = lowerDeg;
    
    
    /**
     * The other limit of the controlled value.
     * @readonly
     * @member {Number}
     */
    this.upperValue = upperValue;
    
    /**
     * The rotation of the thumb sprite, in degrees, corresponding to a controlled
     * value of {@link LBPhaser.Dial#upperValue}.
     * @readonly
     * @member {Number}
     */
    this.upperDeg = upperDeg;
    

    /**
     * The group of the control, position or rotate this to move or rotate the control.
     * @member {Phaser.Group}
     */
    this.group = game.add.group();

    /**
     * The sprite representing the thumb.
     * @member {Phaser.Sprite}
     */
    this.thumbSprite = thumbSprite;
    
    if (bkgdObject) {
        this.bkgdObject = bkgdObject;
        this.group.add(bkgdObject);
    }
    
    thumbSprite.inputEnabled = true;
    thumbSprite.input.enableDrag(false, false, false, false);
    thumbSprite.input.setDragLock(false, false);
    thumbSprite.events.onDragStart.add(this._dragStart, this);
    thumbSprite.events.onDragUpdate.add(this._dragUpdate, this);
    thumbSprite.events.onDragStop.add(this._dragStop, this);

    this.group.add(thumbSprite);
};

LBPhaser.Dial.prototype = {
    /**
     * Sets the callback called whenever the dial's thumb is moved.
     * @param {function} callback   The callback function, it has the signature:
     * <p>
     * callback = function(newValue, dial);
     * @param {Object} [callbackThis]   If defined, this is the 'this' context for
     * when the callback function is called.
     * @returns {LBPhaser.Dial} this.
     */
    setCallback: function(callback, callbackThis) {
        this.callback = callback;
        this.callbackThis = callbackThis;
        return this;
    },
    
    /**
     * @returns {Number}    The current controlled value.
     */
    getValue: function() {
        return this.value;
    },
    
    /**
     * Changes the current controlled value.
     * @param {Number} value    The new controlled value, this value is clamped to
     * the lower and upper values.
     * @returns {LBPhaser.Dial} this.
     */
    setValue: function(value) {
        value = LBMath.clamp(value, this.lowerValue, this.upperValue);
        if (value !== this.value) {
            this._setValue(value);
        }
        return this;
    },
    
    _setValue: function(value) {
        this.value = value;
        var newDeg = this.lowerDeg + (value - this.lowerValue) * (this.upperDeg - this.lowerDeg) / (this.upperValue - this.lowerValue);
        newDeg = LBMath.clamp(newDeg, this.lowerDeg, this.upperDeg);
        this.thumbSprite.rotation = newDeg * LBMath.DEG_TO_RAD;
    },
    
    _getDragDeg: function(pointer) {
        var dx = pointer.x - this.group.worldPosition.x;
        var dy = pointer.y - this.group.worldPosition.y;
        return Math.atan2(dy, dx) * LBMath.RAD_TO_DEG;
    },
    
    _dragStart: function(obj, pointer, xStart, yStart) {
        this.prevDragDeg = this._getDragDeg(pointer);
        this.currentOffsetDeg = 0;
        this.startThumbDeg = this.thumbSprite.rotation * LBMath.RAD_TO_DEG;
        return true;
    },
    
    _dragUpdate: function(obj, pointer, newX, newY, snap, fromStart) {
        if (this.prevDragDeg === undefined) {
            return false;
        }
        
        var dragDeg = this._getDragDeg(pointer);
        var deltaDeg = LBMath.wrapDegrees(dragDeg - this.prevDragDeg);
        this.currentOffsetDeg += deltaDeg;
        this.prevDragDeg = dragDeg;
        
        var deg = this.currentOffsetDeg + this.startThumbDeg;
        
        var value = this.lowerValue + (deg - this.lowerDeg) * (this.upperValue - this.lowerValue) / (this.upperDeg - this.lowerDeg);
        value = LBMath.clamp(value, this.lowerValue, this.upperValue);
        if (value !== this.value) {
            this._setValue(value);

            if (this.callback) {
                if (this.callbackThis) {
                    this.callback.call(this.callbackThis, value, this);
                }
                else {
                    this.callback(value, this);
                }
            }
        }
        
        return true;
    },
    
    _dragStop: function(obj, pointer, xStart, yStart) {
        this.prevDragDeg = undefined;
        return true;
    },
    
    
    /**
     * Call when done with the control to let it free up its internal references
     * and hopefully be garbage collected.
     * @returns {undefined}
     */
    destroy: function() {
        if (this.group) {
            this.group.destroy();
            this.group = undefined;
            this.thumbSprite = undefined;
            this.bkgdObject = undefined;
            this.callback = undefined;
            this.callbackThis = undefined;
        }
    },
    
    constructor: LBPhaser.Dial
};

return LBPhaser;
});
