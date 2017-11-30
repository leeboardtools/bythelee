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

define(function() {

    'use strict';
    
/**
 * Stuff that I didn't want to create a new module for...
 * @exports LBUtil
 */
var LBUtil = LBUtil || {};


/**
 * Converts meters per second to knots.
 * @param {Number} mps    The meters/sec to convert.
 * @returns {Number} The value in knots.
 */
LBUtil.mps2kt = function(mps) {
    return mps * 1.94384;
};

/**
 * Converts knots to meters per second.
 * @param {Number} knots  The knots to convert.
 * @returns {Number} The value in meters/sec.
 */
LBUtil.kt2mps = function(knots) {
    return knots / 1.94384;
};


/**
 * Simple binary search of a sorted array.
 * @param {Array} array The sorted array in increasing order, array[i] &lt; array[i+1].
 * No check is made.
 * @param {Number} value    The value to locate.
 * @returns {Number}    The index of the first element in array that is &le; value, if
 * value is &lt; array[0] then -1 is returned.
 */
LBUtil.bsearch = function(array, value) {
    var lastIndex = array.length - 1;
    if (value < array[0]) {
        return -1;
    }
    else if (value >= array[lastIndex]) {
        return lastIndex;
    }

    var low = 0;
    var high = lastIndex;
    while ((high - low) > 1) {
        var mid = (low + high) >> 1;
        if (value < array[mid]) {
            high = mid;
        }
        else {
            low = mid;
        }
    }

    return low;
};

/**
 * Function based binary search algorithm.
 * @param {Function} getValueCallback   The function called to retrieve the value at
 * a given index. It has the signature:
 * <pre><code>
 *      function getValueCallback(index) {
 *          return values[index];
 *      }
 * </code></pre>
 * The function must satisfy getValueCallback(i) &lt; getValueCallback(i+1)
 * @param {Number} count    The number of available values.
 * @param {Number} value    The value to search for.
 * @returns {Number}    The index of the first element that is &le; value, if
 * value is &lt; getValueCallback(0) then -1 is returned.
 */
LBUtil.bsearchFunction = function(getValueCallback, count, value) {
    var value0 = getValueCallback(0);
    if (value < value0) {
        return -1;
    }

    var lastIndex = count - 1;
    var valueLast = getValueCallback(lastIndex);
    if (value >= valueLast) {
        return lastIndex;
    }

    var low = 0;
    var high = lastIndex;
    while ((high - low) > 1) {
        var mid = (low + high) >> 1;
        if (value < getValueCallback(mid)) {
            high = mid;
        }
        else {
            low = mid;
        }
    }

    return low;
};


/**
 * Copies properties that are common to two objects from one object to another.
 * @param {object} dst  The object to copy to.
 * @param {object} src  The obejct to copyf from.
 * @param {Function} [filter] If defined, a filter function that should return true
 * if a property should be copied. The function has the call signature of
 * func(propName, dst, src).
 * @returns {object}    dst.
 */
LBUtil.copyCommonProperties = function(dst, src, filter) {
    if (!LBUtil.isVar(src)) {
        return dst;
    }
    if (LBUtil.isVar(filter)) {
        Object.getOwnPropertyNames(dst).forEach(
                function(val, idx, array) {
                    if (src[val] !== undefined) {
                        if (filter(val, dst, src)) {
                            dst[val] = LBUtil.copyObject(dst[val], src[val]);
                        }
                    }
                }
        );
    }
    else {
        Object.getOwnPropertyNames(dst).forEach(
                function(val, idx, array) {
                    if (src[val] !== undefined) {
                        dst[val] = LBUtil.copyObject(dst[val], src[val]);
                    }
                }
        );
    }
    return dst;
};

/**
 * Attempts to copy one object to another using a copy() method. If dst is an object,
 * and it has a copy function, dst.copy is called and dst is returned, otherwise
 * src is returned.
 * @param {object} dst  The destination.
 * @param {object} src  The source object.
 * @returns {objectd}   dst if dst is an object with a copy function, src otherwise.
 */
LBUtil.copyObject = function(dst, src) {
    if (typeof dst === "object") {
        if (typeof dst.copy === "function") {
            dst.copy(src);
            return dst;
        }
    }
    return src;
};


/**
 * Determines if a value is both defined and not null.
 * @param {Number} v  The value to check.
 * @returns {Boolean}   true if v is defined and not null.
 */
LBUtil.isVar = function(v) {
    return (v !== undefined) && (v !== null);
};


/**
 * Looks through the elements of an array for the first one with a property called 'name'
 * whose value matches a given name.
 * @param {object[]} array    The array to search.
 * @param {String} name The name to look for.
 * @param {object} [defValue=undefined]   The value to return if an element is not found.
 * @returns {object}    The object, defValue if no element found.
 */
LBUtil.findArrayElementWithName = function(array, name, defValue) {
    for (var i = 0; i < array.length; ++i) {
        if (array[i].name === name) {
            return array[i];
        }
    }
    return defValue;
};


/**
 * Copies the contents of an array, followed by the same contents except in reverse order,
 * into a new array.
 * @param {Array} array    The array to be copied and mirrored.
 * @returns {Array} The new array, undefined/null if array is undefined/null.
 */
LBUtil.copyAndMirrorArray = function(array) {
    if (!array) {
        return array;
    }
    
    var newArray = array.slice();
    for (var i = array.length - 1; i >= 0; --i) {
        newArray.push(array[i]);
    }
    return newArray;
};


/**
 * If a destination object exists, a source object is copied to it using a copy
 * member function, otherwise the source object is cloned using a clone member function.
 * <p>
 * Typical usage is:
 * <p>
 *      dst = LBUtil.copyOrClone(dst, src);
 * 
 * @param {Object} dst  The destination object, may be undefined or null. If it exists,
 * it must have a copy method.
 * @param {Object} src  The source object, must have a clone method.
 * @returns {Object}    dst if dst existed, the clone of src if it did not.
 */
LBUtil.copyOrClone = function(dst, src) {
    return (dst) ? dst.copy(src) : src.clone();
};


/**
 * Registers an object as a namespace with LBUtil so it can be accessed by {@link module:LBUtil.stringToFunction}
 * and {@link module:LBUtil.newClassInstanceFromData}.
 * @param {String} name The namespace name.
 * @param {Object} namespace    The object representing the namespace.
 * @returns {LBUtil}    LBUtil.
 */
LBUtil.registerNamespace = function(name, namespace) {
    LBUtil.registeredNamespaces = LBUtil.registeredNamespaces || {};
    LBUtil.registeredNamespaces[name] = namespace;
    return LBUtil;
};


/**
 * Retrieves the function that is either in a registered namespace or in the 
 * global scope with a given name.
 * @param {String} str  The name of the function.
 * @returns {function}  The function object.
 * @throws {Error} An error is throw if str could not be resolved to a function object.
 */
LBUtil.stringToFunction = function(str) {
    var arr = str.split(".");
    var fn;
    var i = 0;
    if (LBUtil.registeredNamespaces) {
        fn = LBUtil.registeredNamespaces[arr[0]];
    }
    if (!fn) {
        fn = window || this;
    }
    else {
        ++i;
    }
    for (var len = arr.length; i < len; i++) {
        fn = fn[arr[i]];
    }
    if (typeof fn !== 'function') {
        throw new Error("Function " + str + " not found!");
    }
    return fn;
};


/**
 * Creates a new instance of a class object based on properties of a data object.
 * This looks specifically for a 'className' property, which is the name of the class,
 * and an optional 'constructorArgs' property, which is passed as the argument to the
 * class constructor.
 * @param {object} data The data object.
 * @returns {object|undefined}  A new instance of the class or undefined if either data
 * or 'className' is undefined.
 */
LBUtil.newClassInstanceFromData = function(data) {
    if (!data || !data.className) {
        return undefined;
    }
    
    var fn = LBUtil.stringToFunction(data.className);
    return new fn(data.constructorArgs);
};


/**
 * A rolling indexable buffer with a maximum size, the oldest element is always
 * at index 0, the newest at index {@link module:LBUtil.RollingBuffer#getCurrentSize}.
 * Elements are added to the end of the buffer via {@link module:LBUtil.RollingBuffer#push},
 * removed from the end of the buffer via {@link module:LBUtil.RollingBuffer#pop_newest},
 * and removed from the front of the buffer via {@link module:LBUtil.RollingBuffer#pop_oldest}.
 * @constructor
 * @param {Number} maxSize  The maximum number of elements to hold in the buffer.
 * @returns {module:LBUtil.RollingBuffer}
 */
LBUtil.RollingBuffer = function(maxSize) {
    this._buffer = [];
    this._buffer.length = maxSize;
    
    this._frontIndex = 0;
    this._backIndex = -1;
    this._currentSize = 0;
};

LBUtil.RollingBuffer.prototype = {
    /**
     * @returns {Number}    The maximum number of elements the buffer can hold.
     */
    getMaxSize: function() {
        return this._buffer.length;
    },

    /**
     * @returns {Number}    The current number of elements in the buffer.
     */
    getCurrentSize: function() {
        return this._currentSize;
    },
    
    /**
     * @returns {Boolean}    True if the buffer is full, that is if the next call to
     * push will remove the oldest element.
     */
    isFull: function() {
        return this._buffer.length === this._currentSize;
    },
    
    /**
     * Adds a value to the buffer, the value is added so it is at the highest index.
     * @param {Object} value    The value to be added.
     * @returns {Number}    The index the value was added at.
     */
    push: function(value) {
        if (this._currentSize === this._buffer.length) {
            // Gotta get rid of the front...
            ++this._frontIndex;
            if (this._frontIndex >= this._buffer.length) {
                this._frontIndex = 0;
            }
            --this._currentSize;
        }
        
        ++this._backIndex;
        if (this._backIndex >= this._buffer.length) {
            this._backIndex = 0;
        }
        this._buffer[this._backIndex] = value;
        
        return this._currentSize++;
    },
    
    /**
     * Removes the value that was last pushed.
     * @returns {undefined|LBUtil.RollingBuffer._buffer}    The value, undefined
     * if the buffer was empty.
     */
    popNewest: function() {
        if (this._currentSize > 0) {
            var value = this._buffer[this._backIndex];
            --this._backIndex;
            if (this._backIndex < 0) {
                this._backIndex = this._buffer.length - 1;
            }
            --this._currentSize;
            return value;
        }
        return undefined;
    },
    
    /**
     * Removes the value at index 0.
     * @returns {undefined|LBUtil.RollingBuffer._buffer}    The value, undefined
     * if the buffer was empty.
     */
    popOldest: function() {
        if (this._currentSize > 0) {
            var value = this._buffer[this._frontIndex];
            ++this._frontIndex;
            if (this._frontIndex >= this._buffer.length) {
                this._frontIndex = 0;
            }
            --this._currentSize;
            return value;
        }
        return undefined;
    },
    
    /**
     * Removes all elements from the buffer.
     */
    clear: function() {
        this._frontIndex = 0;
        this._backIndex = -1;
        this._currentSize = 0;
    },
    
    /**
     * Retrieves the oldest object.
     * @returns {Object}    The oldest object, undefined if the buffer is empty.
     */
    getOldest: function() {
        return (this._currentSize) ? this._buffer[this._frontIndex] : undefined;
    },
    
    /**
     * Retrieves the oldest object.
     * @returns {Object}    The newest object, undefined if the buffer is empty.
     */
    getNewest: function() {
        return (this._currentSize) ? this._buffer[this._backIndex] : undefined;
    },
    
    /**
     * Retrieves the object at a given index. Index values are &ge; 0 and &lt; {@link module:LBUtil.RollingBuffer#getCurrentSize},
     * with the value at index 0 the oldest value in the buffer.
     * @param {Number} index    The index of interest.
     * @returns {Object}    The object at the index.
     */
    get: function(index) {
        return this._buffer[this._indexToBufferIndex(index)];
    },
    
    /**
     * Sets the object at a given index. Index values are &ge; 0 and &lt; {@link module:LBUtil.RollingBuffer#getCurrentSize},
     * with the value at index 0 the oldest value in the buffer.
     * @param {Number} index    The index of interest.
     * @param {Object} value    The value to assign to the index.
     * @returns {Object}    value.
     */
    set: function(index, value) {
        this._buffer[this._indexToBufferIndex(index)] = value;
        return value;
    },
    
    _indexToBufferIndex: function(index) {
        index += this._frontIndex;
        if (index >= this._buffer.length) {
            index -= this._buffer.length;
        }
        return index;
    },
    
    
    /**
     * Removes the buffer from use.
     * @returns {undefined}
     */
    destroy: function() {
        if (this._buffer) {
            this._buffer.length = 0;
            this._buffer = null;
        }
    },
    
    constructor: LBUtil.RollingBuffer
};


/**
 * A simple class for managing a pool of objects. Objects are obtained via
 * {@link module:LBUtil.Pool#get}, and when done are returned to the pool via
 * {@link module:LBUtil.Pool#release}.
 * @param {Function} allocator  The function called to allocate a new object.
 * @returns {module.LBUtil.Pool}
 */
LBUtil.Pool = function(allocator) {
    this.allocator = allocator;
    this._first = null;
    
    this._allocatedCount = 0;
    this._returnedCount = 0;
    this._recycledCount = 0;
};

LBUtil.Pool.prototype = {
    /**
     * Retrieves an object from the pool, allocating one if the pool is empty.
     * @returns {Object}    The object.
     */
    get: function() {
        var obj;
        if (this._first) {
            obj = this._first;
            this._first = obj._lbPoolNext;
            ++this._recycledCount;
        }
        else {
            obj = this.allocator();
            ++this._allocatedCount;
        }
        
        obj._lbPool = this;
        obj._lbPoolNext = null;
        return obj;
    },
    
    /**
     * Returns an object to the pool.
     * @param {Object} obj  The object.
     * @returns {undefined}
     */
    release: function(obj) {
        if ((obj._lbPool === this) && !obj._lbPoolNext) {
            obj._lbPoolNext = this._first;
            this._first = obj;
            ++this._returnedCount;
        }
    },
    
    /**
     * Marks an object such that calling {@link module:LBUtil.Pool#release} will not
     * return it to the pool. Call this when an object is being used outside of the
     * scope that obtained the object from the pool, so the object does not get
     * accidentally returned to the pool.
     * @param {Object} obj  The object.
     * @returns {Object}    obj.
     */
    removeFromPool: function(obj) {
        obj._lbPool = undefined;
        return obj;
    },
    
    /**
     * Removes all the objects currently in the pool. If the object has a destroy
     * method, that is called.
     * @returns {undefined}
     */
    destroy: function() {
        while (this._first) {
            var obj = this._first;
            if (typeof obj.destroy === 'function') {
                obj.destroy();
            }
            this._first = this._first._lbPoolNext;
        }
    },
    
    constructor: LBUtil.Pool
};


/**
 * Helper for toggling full-screen mode.
 * @param {Element} element  The DOM element to use.
 * @returns {Boolean}   true if full screen mode is entered.
 */
LBUtil.toggleFullScreen = function(element) {
    var fullscreenEnabled;
    var fullscreenElement;
    var requestFullscreen;
    var exitFullscreen;
    if (element.requestFullScreen) {
        fullscreenEnabled = document.fullscreenEnabled;
        fullscreenElement = document.fullscreenElement;
        requestFullscreen = element.requestFullScreen;
        exitFullscreen = document.exitFullscreen;
    }
    else if (element.webkitRequestFullscreen) {
        fullscreenEnabled = document.webkitFullscreenEnabled;
        fullscreenElement = document.webkitFullscreenElement;
        requestFullscreen = element.webkitRequestFullScreen;
        exitFullscreen = document.webkitExitFullscreen;
    }
    else if (element.mozRequestFullScreen) {
        fullscreenEnabled = document.mozFullScreenEnabled;
        fullscreenElement = document.mozFullScreenElement;
        requestFullscreen = element.mozRequestFullScreen;
        exitFullscreen = document.mozCancelFullScreen;
    }
    else if (element.msRequestFullscreen) {
        fullscreenEnabled = document.msFullscreenEnabled;
        fullscreenElement = document.msFullscreenElement;
        requestFullscreen = element.msRequestFullScreen;
        exitFullscreen = document.msExitFullscreen;
    }
    else {
        return;
    }
    if (!fullscreenEnabled) {
        return false;
    }
    if (fullscreenElement) {
        exitFullscreen.call(document);
        return false;
    }
    else {
        requestFullscreen.call(element);
        return true;
    }
};

return LBUtil;
});
