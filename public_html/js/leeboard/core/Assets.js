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
 * 
 * @namespace LBAssets
 */
var LBAssets = LBAssets || {};

/**
 * This is our basic asset loader, it asynchronously loads and caches assets.
 * @constructor
 * @returns {Assets_L18.LBAssets.Loader}
 */
LBAssets.Loader = function() {
    this.jsonAssets = {};
};

LBAssets.Loader.prototype = {
    constructor: LBAssets.Loader
};

/**
 * Loads a JSON object.
 * @param {String} assetName    The name used to identify the asset.
 * @param {String} fileName The asset location relative to the site root.
 * @param {Function} [onLoad]   Optional function to call when the asset has successfully been
 * loaded, the JSON object is passed as the argument.
 * @param {Function} [onProgress]   Optional progress function.
 * @param {Function} [onError]  Optional error function.
 * @returns {LBAssets.Loader}   this.
 */
LBAssets.Loader.prototype.loadJSON = function(assetName, fileName, onLoad, onProgress, onError) {
    if (this.jsonAssets[assetName]) {
        if (onLoad) {
            onLoad(this.jsonAssets[assetName]);
        }
        return this;
    }
    
    onError = onError || function() {
        console.error("LBAssets.Loader.loadJSON() failed to load '" + fileName + "'.");
    };
    
    var me = this;
    var request = new XMLHttpRequest();
    request.open("GET", fileName);
    request.responseType = 'json';
    request.onload = function() {
        me.jsonAssets[assetName] = this.response;
        onLoad(this.response);
    };
    request.onprogress = onProgress;
    request.onerror = onError;
    
    request.send();
    
    return this;
};

/**
 * Retrieves a JSON asset.
 * @param {String} assetName    The name of the asset.
 * @returns {Object}    The JSON object, undefined if it hasn't been successfully loaded.
 */
LBAssets.Loader.prototype.getJSON = function(assetName) {
    return this.jsonAssets[assetName];
};


/**
 * A class that manages the loading of multiple assets concurrently, calling a callback
 * when all the assets have been loaded.
 * <p>
 * Typical usage is:
 *      var coordinator = new LBAssets.MultiLoadCoordinator();
 *      coordinator.setup(function() {
 *              console.log("Load Completed");
 *          },
 *          function() {
 *              console.log("Load failed");
 *          });
 *      
 *      coordinator.beginLoadCalls();
 *      loader.loadJSON('abc', 'abc.json', coordinator.getOnLoadFunction(), null, coordinator.getOnError());
 *      loader.loadJSON('def', 'def.json', coordinator.getOnLoadFunction(), null, coordinator.getOnError());
 *      coordinator.endLoadCalls();
 * 
 * @constructor
 * @returns {Assets_L18.LBAssets.MultiLoadCoordinator}
 */
LBAssets.MultiLoadCoordinator = function() {
    this._loaderCount = 0;
    this.loadState = LBAssets.MultiLoadCoordinator.NOT_LOADED;
};

LBAssets.MultiLoadCoordinator.NOT_LOADED = 0;
LBAssets.MultiLoadCoordinator.LOADING = 1;
LBAssets.MultiLoadCoordinator.LOAD_COMPLETE = 2;
LBAssets.MultiLoadCoordinator.LOAD_FAILED = 3;

LBAssets.MultiLoadCoordinator.prototype = {
    /**
     * Sets up the coordinator, setting the functions to be called on completion and error.
     * @param {Function} onComplete The function to be called on successful completion of all loads.
     * @param {Function} onError    The function to be called on a load failure. This is called
     *  after all the loaders have called either the onload() or onerror() function.
     * @returns {undefined}
     */
    setup: function(onComplete, onError) {
        this.onComplete = onComplete;
        this.onError = onError;
    },
    
    /**
     * Call before starting loading, this locks the callbacks so the onError and onComplete
     * functions are not called before the call to endLoadCalls().
     * @returns {undefined}
     */
    beginLoadCalls: function() {
        ++this._loaderCount;
    },
    
    /**
     * Call after all the loading has been started, this enables the callbacks to onError and
     * onComplete.
     * @returns {undefined}
     */
    endLoadCalls: function() {
        this._markLoadCompleted();
    },
    
    /**
     * Retrieves the function to pass to the loader's onload event handler.
     * @param {Function} [localOnLoad] Optional function that will get called before the
     * function returned by this marks this as load completed.
     * @returns {Function}  The onload handler function.
     */
    getOnLoadFunction: function(localOnLoad) {
        ++this._loaderCount;
        this.loadState = LBAssets.MultiLoadCoordinator.LOADING;
        
        var me = this;
        return function() {
            if (localOnLoad) {
                localOnLoad.apply(null, arguments);
            }
            me._markLoadCompleted();
        };
    },
    
    
    /**
     * Retrieves the function to pass to the loader's onprogress event handler.
     * @returns {Function}  The onprogress handler function.
     */
    getOnProgressFunction: function() {
        return undefined;
    },
    
    /**
     * Retrieves the function to pass to the loader's onerror event handler.
     * @param {Function} [localOnError] Optional function that will get called before the
     * function returned by this marks this as load completed.
     * @returns {Function}  The onerror handler function.
     */
    getOnErrorFunction: function(localOnError) {
        var me = this;
        return function() {
            if (localOnError) {
                localOnError.apply(null, arguments);
            }
            me._markLoadFailed();
        };
    },
    
    
    /**
     * Called by the onload handler function, marks the load as successful.
     * @private
     * @returns {undefined}
     */
    _markLoadCompleted: function() {
        --this._loaderCount;
        if (this._loaderCount === 0) {
            this._finishLoad();
        }
    },
    
    /**
     * Called by the onerror handler function, marks the load as failed.
     * @returns {undefined}
     */
    _markLoadFailed: function() {
        --this._loaderCount;
        this.loadState = LBAssets.MultiLoadCoordinator.LOAD_FAILED;
        if (this.loaderCount === 0) {
            this._finishLoad();
        }
    },
    
    /**
     * Finishes up the loading, this is where the onComplete and onError functions
     * passed to {@link LBAssets.MultiLoadCoordinator#setup} are called.
     * @private
     * @returns {undefined}
     */
    _finishLoad: function() {
        if (this.loadState !== LBAssets.MultiLoadCoordinator.LOAD_FAILED) {
            this.loadState = LBAssets.MultiLoadCoordinator.LOAD_COMPLETE;
            if (this.onComplete) {
                this.onComplete();
            }
        }
        else if (this.onError) {
            this.onError();
        }
        
        this.onComplete = undefined;
        this.onError = undefined;
    },
    
    constructor: LBAssets.MultiLoadCoordinator
};


return LBAssets;
});
