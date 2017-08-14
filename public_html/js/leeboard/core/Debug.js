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
 * Base class for a field in {@link LBDebug.DataLog}, this is also provides a default
 * implementation.
 * @constructor
 * @param {String} fieldName The name of the field.
 * @return {LBDebug.DataLogField}
 */
LBDebug.DataLogField = function(fieldName) {
    
    /**
     * Enable flag, if false the field is not output.
     * @type Boolean
     */
    this.isEnabled = true;

    /**
     * The name of the field.
     * @member {String}
     */
    this.fieldName = fieldName;
    
    /**
     * The value currently associated with the field.
     * @member {Object}
     */
    this.value = undefined;
};

LBDebug.DataLogField.prototype = {
    /**
     * Retrieves the text string describing the field for the output row.
     * @param {String} [baseName] The base name, may be undefined.
     * @return {String} The heading text.
     */
    getHeadingText: function(baseName) {
        if (baseName) {
            return baseName + '.' + this.fieldName;
        }
        return this.fieldName;
    },
    
    /**
     * Retrieves the text representation of the field's current value.
     * @return {String} The text representation.
     */
    getValueText: function() {
        return (this.value === undefined) ? "" : this.value;
    },
    
    /**
     * Sets the current value of the field.
     * @param {Object} value    The value to set.
     */
    setValue: function(value) {
        this.value = value;
    },
    
    /**
     * Called by {@link LBDebug.DataLog.output()} after the current value's text
     * has been retrieved to clear the current value.
     * @return {undefined}
     */
    clearValue: function() {
        this.value = undefined;
    },
    
    constructor: LBDebug.DataLogField
};


/**
 * A {@link LBDebug.DataLogField} that holds other fields.
 * @param {type} fieldName
 * @param {type} valueSetter
 * @return {LBDebug.FieldsDataLogField}
 */
LBDebug.FieldsDataLogField = function(fieldName, valueSetter) {
    LBDebug.DataLogField.call(this, fieldName);

    /**
     * Array containing the names of the data fields output.
     * @member {String[]}
     */
    this.fieldNames = [];
    
    /**
     * Object whose properties are the fields, with the field name the name of the
     * property and the objects based upon {@link LBDebug.DataLogField}.
     * @member {Object}
     */
    this.fields = {};
    
    /**
     * Optional function that is called in {@link LBDebug.FieldsDataLogField#setValue} to
     * handle setting the value. The call signature is:
     * <p>
     *      valueSetter = function(field, value) {
     *      }
     */
    this.valueSetter = valueSetter;
};

LBDebug.FieldsDataLogField.prototype = Object.create(LBDebug.DataLogField.constructor);
LBDebug.FieldsDataLogField.prototype.constructor = LBDebug.FieldsDataLogField;

/**
 * Adds a field.
 * @param {String|String[]} fieldName   The field's name. If a single string, then the
 * field is added directly to this field. If an array of strings, then the field is added
 * to the sub-field represented by the array of strings. Each entry in the array is the
 * name of a field within the current field. Sub-fields are created as necessary.
 * @param {LBDebug.DataLogField} [field] If defined this is the field object, otherwise
 * a {@link LBDebug.DataLogField} is created.
 * @return {LBDebug.DataLogField}   The added field.
 */
LBDebug.FieldsDataLogField.prototype.addField = function(fieldName, field) {
    if (Array.isArray(fieldName)) {
        if (fieldName.length === 1) {
            fieldName = fieldName[0];
        }
        else {
            var subField = this.fields[fieldName[0]];
            if (!subField) {
                subField = new LBDebug.FieldsDataLogField(fieldName[0]);
                this.addField(fieldName[0], subField);
            }
            
            fieldName = fieldName.slice(1);
            return subField.addField(fieldName, field);
        }
    }
    
    if (!field) {
        field = new LBDebug.DataLogField(fieldName);
    }
    else {
        field.fieldName = fieldName;
    }

    this.fieldNames.push(fieldName);
    this.fields[fieldName] = field;
    return field;
};

/**
 * Adds a spacer column to the field.
 * @param {String|String[]} [fieldName] If defined, this is either a single string
 * with the name of the field within this field to which the spacer is to be added,
 * or if an array of strings then the array contains the names of the sub-fields.
 * To add a spacer to this field, this should be undefined or empty.
 * If a specified field does not exist, no spacer is added.
 * @return {undefined}
 */
LBDebug.FieldsDataLogField.prototype.addSpacer = function(fieldName) {
    var nextFieldNames;
    if (fieldName) {
        if (Array.isArray(fieldName)) {
            if (fieldName.length === 0) {
                fieldName = undefined;
            }
            else {
                nextFieldNames = fieldName.slice(1);
                fieldName = fieldName[0];
            }
        }
    }
    
    if (fieldName) {
        var subField = this.fields[fieldName];
        if (!subField) {
            subField = new LBDebug.FieldsDataLogField(fieldName);
            this.addField(fieldName, subField);
        }
        
        subField.addSpacer(nextFieldNames);
    }
    else {
        this.fieldNames.push("");
    }
};

/**
 * Retrieves a given field.
 * @param {String|String[]} fieldName   The name of the field if a single string, or
 * an array of strings containing the names of the sub-field hierarchy.
 * @return {LBDebug.DataLogField/undefined} The field object, undefined if not found.
 */
LBDebug.FieldsDataLogField.prototype.getField = function(fieldName) {
    if (Array.isArray(fieldName)) {
        var nextFields = fieldName.splice(1);
        fieldName = fieldName[0];
        var subField = this.fields[fieldName];
        if (!subField) {
            return undefined;
        }
        return subField.getField(nextFields);
    }
    
    return this.fields[fieldName];
};

// @inheritdoc...
LBDebug.FieldsDataLogField.prototype.getHeadingText = function(baseName) {
    if (!this.isEnabled || (this.fieldNames.length === 0)) {
        return undefined;
    }
    
    var text = "";
    if (this.fieldName) {
        if (baseName) {
            baseName += "." + this.fieldName;
        }
        else {
            baseName = this.fieldName;
        }
    }
    
    var fields = this.fields;
    this.fieldNames.forEach(function(name) {
        var fieldText;
        if (!name) {
            // Spacer...
            fieldText = "";
        }
        else {
            var field = fields[name];
            if (!field || !field.isEnabled) {
                return;
            }

            fieldText = field.getHeadingText(baseName);
        }
        
        if (fieldText !== undefined) {
            if (text) {
                text += "\t";
            }
            text += fieldText;
        }
    });
    
    return text;
};

// @inheritdoc...
LBDebug.FieldsDataLogField.prototype.getValueText = function() {
    if (!this.isEnabled || (this.fieldNames.length === 0)) {
        return undefined;
    }
    
    var text = "";
    var fields = this.fields;
    this.fieldNames.forEach(function(name) {
        var fieldText;
        if (!name) {
            // Spacer...
            fieldText = "";
        }
        else {
            var field = fields[name];
            if (!field || !field.isEnabled) {
                return;
            }

            fieldText = field.getValueText();
        }
        
        if (fieldText !== undefined) {
            if (text) {
                text += "\t";
            }
            text += fieldText;
        }
    });
    
    return text;
};

// @inheritdoc...
LBDebug.FieldsDataLogField.prototype.setValue = function(value) {
    if (this.isEnabled) {
        this.value = value;
        if (this.valueSetter) {
            this.valueSetter(this, value);
        }
    }
};

/**
 * Sets the value of a sub-field.
 * @param {String|String[]} fieldName   The name of the field if a single string, or
 * an array of strings containing the names of the sub-field hierarchy.
 * If the sub-field is not found nothing happens.
 * @param {type} value  The value to assign.
 * @return {undefined}
 */
LBDebug.FieldsDataLogField.prototype.setSubFieldValue = function(fieldName, value) {
    if (this.isEnabled) {
        var field = this.getField(fieldName);
        if (field) {
            field.setValue(value);
        }
    }
};

/**
 * Clears the value of all the fields.
 * @return {undefined}
 */
LBDebug.FieldsDataLogField.prototype.clearValue = function() {
    var fields = this.fields;
    this.fieldNames.forEach(function(name) {
        var field = fields[name];
        if (field) {
            field.clearValue();
        }
    });
};


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
     * The field implementation.
     * @private
     * @type {LBDebug.FieldsDataLogField}
     */
    fields: new LBDebug.FieldsDataLogField(""),

    /**
     * Counter for each line output.
     * @type Number
     */
    outputCount: 0
};

/**
 * Adds a field.
 * @param {String|String[]} name   The field's name. If a single string, then the
 * field is added to the top-level. If an array of strings, then the field is added
 * to the sub-field represented by the array of strings. Each entry in the array is the
 * name of a field within the current field. Sub-fields are created as necessary.
 * @param {LBDebug.DataLogField} [field] If defined this is the field object, otherwise
 * a {@link LBDebug.DataLogField} is created.
 * @return {undefined}
 */
LBDebug.DataLog.addField = function(name, field) {
    LBDebug.DataLog.fields.addField(name, field);
};


/**
 * Retrieves a given field.
 * @param {String|String[]} name   The name of the field if a single string, or
 * an array of strings containing the names of the sub-field hierarchy.
 * @return {LBDebug.DataLogField/undefined} The field object, undefined if not found.
 */
LBDebug.DataLog.getField = function(name) {
    return LBDebug.DataLog.fields.getField(name);
};

/**
 * Adds a spacer column.
 * @param {String|String[]} [name] If defined, this is either a single string
 * with the name of the field within this field to which the spacer is to be added,
 * or if an array of strings then the array contains the names of the sub-fields.
 * To add a spacer to the top level, this should be undefined or empty.
 * If a specified field does not exist, no spacer is added.
 * @return {undefined}
 */
LBDebug.DataLog.addSpacer = function(name) {
    LBDebug.DataLog.fields.addSpacer(name);
};

/**
 * Writes a heading line to {@link console.log}, basically a columns heading string
 * for the data fields.
 * @return {undefined}
 */
LBDebug.DataLog.outputHeading = function() {
    var log = LBDebug.DataLog;
    if (!log.isEnabled) {
        return;
    }
    
    var fields = log.fields;
    var text = fields.getHeadingText();
    if (text) {
        // Final '\t' is to separate the extra file/line info added by console.log.
        console.log("Output#\t" + text + "\t");
    }
};

/**
 * Sets the value of a data field.
 * @param {String|String[]} name   The name of the field if a single string, or
 * an array of strings containing the names of the sub-field hierarchy.
 * @param {Object} value    The value to assign.
 * @return {undefined}
 */
LBDebug.DataLog.setValue = function(name, value) {
    var log = LBDebug.DataLog;
    if (log.isEnabled) {
        var field = log.fields.getField(name);
        if (field) {
            field.setValue(value);
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
    if (log.isEnabled) {
        var fieldsText = log.fields.getValueText();
        if (fieldsText) {
            // Final '\t' is to separate the extra file/line info added by console.log.
            console.log(log.outputCount + "\t" + fieldsText + "\t");
            
            log.fields.clearValue();
            ++this.outputCount;
        }
    }
};


/**
 * Helper that creates a {@link LBDebug.FieldsDataLogField} whose {@link LBDebug.FieldsDataLogField#setValue}
 * takes a {@link LBGeometry.Vector2}.
 * @return {LBDebug.FieldsDataLogField} The field.
 */
LBDebug.DataLog.createFieldVector2 = function() {
    var field = new LBDebug.FieldsDataLogField("", function(fields, value) {
        fields.fields.x.value = value.x;
        fields.fields.y.value = value.y;
    });
    
    field.addField("x");
    field.addField("y");
    
    return field;
};

/**
 * Adds a field for a {@link LBGeometry.Vector2}.
 * @param {String|String[]} name The name of the field, see {@link LBDebug.DataLog.addField}.
 * @return {LBDebug.DataLogField}   The added field.
 */
LBDebug.DataLog.addFieldVector2 = function(name) {
    var field = LBDebug.DataLog.createFieldVector2();
    return LBDebug.DataLog.addField(name, field);
};

/**
 * Helper that creates a {@link LBDebug.FieldsDataLogField} whose {@link LBDebug.FieldsDataLogField#setValue}
 * takes a {@link LBGeometry.Vector3}.
 * @return {LBDebug.FieldsDataLogField} The field.
 */
LBDebug.DataLog.createFieldVector3 = function() {
    var field = new LBDebug.FieldsDataLogField("", function(fields, value) {
        fields.fields.x.value = value.x;
        fields.fields.y.value = value.y;
        fields.fields.z.value = value.z;
    });
    
    field.addField("x");
    field.addField("y");
    field.addField("z");
    
    return field;
};

/**
 * Adds a field for a {@link LBGeometry.Vector3}.
 * @param {String|String[]} name The name of the field, see {@link LBDebug.DataLog.addField}.
 * @return {LBDebug.DataLogField}   The added field.
 */
LBDebug.DataLog.addFieldVector3 = function(name) {
    var field = LBDebug.DataLog.createFieldVector3();
    return LBDebug.DataLog.addField(name, field);
};

/**
 * Helper that creates a {@link LBDebug.FieldsDataLogField} whose {@link LBDebug.FieldsDataLogField#setValue}
 * takes a {@link LBGeometry.Euler}.
 * @return {LBDebug.FieldsDataLogField} The field.
 */
LBDebug.DataLog.createFieldEuler = function() {
    var field = new LBDebug.FieldsDataLogField("", function(fields, value) {
        fields.fields.ex.value = value.x;
        fields.fields.ey.value = value.y;
        fields.fields.ez.value = value.z;
    });
    
    field.addField("ex");
    field.addField("ey");
    field.addField("ez");
    
    return field;
};

/**
 * Adds a field for a {@link LBGeometry.Euler}.
 * @param {String|String[]} name The name of the field, see {@link LBDebug.DataLog.addField}.
 * @return {LBDebug.DataLogField}   The added field.
 */
LBDebug.DataLog.addFieldEuler = function(name) {
    var field = LBDebug.DataLog.createFieldEuler();    
    return LBDebug.DataLog.addField(name, field);
};


/**
 * Helper that creates a {@link LBDebug.FieldsDataLogField} whose {@link LBDebug.FieldsDataLogField#setValue}
 * takes a {@link LBPhysics.Resultant}.
 * @return {LBDebug.FieldsDataLogField} The field.
 */
LBDebug.DataLog.createFieldResultant = function() {
    var field = new LBDebug.FieldsDataLogField("", function(fields, value) {
        fields.fields.applPoint.setValue(value.applPoint);
        fields.fields.force.setValue(value.force);
        fields.fields.moment.setValue(value.moment);
    });
    
    field.addField("applPoint", LBDebug.DataLog.createFieldVector3());
    field.addField("force", LBDebug.DataLog.createFieldVector3());
    field.addField("moment", LBDebug.DataLog.createFieldVector3());
    
    return field;
};

/**
 * Adds a field for a {@link LBPhysics.Resultant3D}.
 * @param {String|String[]} name The name of the field, see {@link LBDebug.DataLog.addField}.
 * @return {LBDebug.DataLogField}   The added field.
 */
LBDebug.DataLog.addFieldResultant = function(name) {
    var field = LBDebug.DataLog.createFieldResultant();
    return LBDebug.DataLog.addField(name, field);
};
