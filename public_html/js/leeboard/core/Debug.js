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


/**
 * 
 * @namespace LBDebug
 */
var LBDebug = LBDebug || {};

/**
 * Utility for writing out a set of values repeatedly to {@link console.log}.
 * The data is written when {@link LBDebug.DataLog.output} is called.
 * @type {type}
 */
LBDebug.DataLog = {
    /**
     * Enable flag, if false text is neither buffered nor output.
     * @type Boolean
     */
    isEnabled: true,

    /**
     * Array containing the names of the data fields output.
     * @member {String[]}
     */
    fieldNames: [],
    
    /**
     * Object whose properties are the fields, with the field name the name of the
     * property and the object having three fields:
     * <p>
     *      value: The object representing the value of the field.
     *      writer: Optional function that takes value and returns the text representation
     *          of the value.
     *      headingString: Optional string to be written for the heading. If not defined
     *          the field name is used.
     * @member {Object}
     */
    fields: {},

    /**
     * Counter for each line output.
     * @type Number
     */
    outputCount: 0
};

/**
 * Adds a field to be output.
 * @param {String} name    The name used to identify the field.
 * @param {Function} [writer]   If defined a function used to convert a value to 
 *  text, it takes the value object as the parameter and returns the string.
 * @param {String} [headingString]    Optional string to be written for the heading,
 *  if not defined fieldName is used.
 * @return {undefined}
 */
LBDebug.DataLog.addField = function(name, writer, headingString) {
    var log = LBDebug.DataLog;
    log.fieldNames.push(name);
    log.fields[name] = { 
        writer: writer,
        headingString: headingString
    };
};

/**
 * Adds an empty column to the output.
 * @return {undefined}
 */
LBDebug.DataLog.addSpacer = function() {
    LBDebug.DataLog.fieldNames.push("");
};

/**
 * Writes a heading line to {@link console.log}, basically a columns heading string
 * for the data fields.
 * @return {undefined}
 */
LBDebug.DataLog.outputHeading = function() {
    var log = LBDebug.DataLog;
    var text = "Output#";
    log.fieldNames.forEach(function(name) {
        text += "\t";
        var field = log.fields[name];
        if (field) {
            var heading = field.headingString;
            if (!heading) {
                heading = name;
            }
            text += heading;
        }
    });
    console.log(text);
};

/**
 * Sets the value of a data field.
 * @param {String} name    The name of the field.
 * @param {Object} value    The value to assign.
 * @return {undefined}
 */
LBDebug.DataLog.setValue = function(name, value) {
    var log = LBDebug.DataLog;
    if (log.isEnabled) {
        if (log.fields[name]) {
            log.fields[name].value = value;
        }
    }
};

/**
 * Writes the current values of all the data fields to {@link console.log}, then
 * setting the current values to undefined.
 * @return {undefined}
 */
LBDebug.DataLog.output = function() {
    var log = LBDebug.DataLog;
    if (log.isEnabled && (log.fieldNames.length > 0)) {
        var text = this.outputCount;
        log.fieldNames.forEach(function(name) {
            text += "\t";

            var field = log.fields[name];
            if (field && (field.value !== undefined)) {
                if (field.writer) {
                    text += field.writer(field.value);
                }
                else {
                    text += field.value;
                }
                field.value = undefined;
            }
        });
        text += '\t';
        
        if (text) {
            console.log(text);
            ++this.outputCount;
        }
    }
};

/**
 * Adds a field for a {@link LBGeometry.Vector2}.
 * @param {String} name The name of the field.
 * @return {undefined}
 */
LBDebug.DataLog.addFieldVector2 = function(name) {
    LBDebug.DataLog.addField(name, function(value) {
        return value.x + '\t' + value.y;
    },
    name + '.x\t' + name + '.y');
};

/**
 * Adds a field for a {@link LBGeometry.Vector3}.
 * @param {String} name The name of the field.
 * @return {undefined}
 */
LBDebug.DataLog.addFieldVector3 = function(name) {
    LBDebug.DataLog.addField(name, function(value) {
        return value.x + '\t' + value.y + '\t' + value.z;
    },
    name + '.x\t' + name + '.y\t' + name + '.z');
};

/**
 * Adds a field for a {@link LBGeometry.Euler}.
 * @param {String} name The name of the field.
 * @return {undefined}
 */
LBDebug.DataLog.addFieldEuler = function(name) {
    LBDebug.DataLog.addField(name, function(value) {
        return value.x + '\t' + value.y + '\t' + value.z;
    },
    name + '.ex\t' + name + '.ey\t' + name + '.ez');
};

