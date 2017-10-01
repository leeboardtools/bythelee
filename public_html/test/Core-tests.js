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

/* global QUnit, LBUtil, LBMath */

define(['lbutil', 'lbmath'], function (LBUtil, LBMath) {

QUnit.module('Core-tests');

QUnit.assert.nearEqual = function(value, expected, msg, tolerance) {
    this.pushResult({
        result: LBMath.isNearEqual(value, expected, tolerance),
        actual: value,
        expected: expected,
        message: msg
    });
};


QUnit.test( "Core-bsearch", function( assert ) {
    var data = [ -1, 0, 1, 2, 3, 4];
    assert.equal(-1, LBUtil.bsearch(data, -1.1), "Below first");
    assert.equal(0, LBUtil.bsearch(data, -1), "At first");
    assert.equal(0, LBUtil.bsearch(data, -0.9), "At 0.5");
    assert.equal(1, LBUtil.bsearch(data, 0), "At second");
    assert.equal(2, LBUtil.bsearch(data, 1.5), "At mid-point");
    assert.equal(4, LBUtil.bsearch(data, 3), "At last seg");
    assert.equal(4, LBUtil.bsearch(data, 3.9), "At last seg");
    assert.equal(5, LBUtil.bsearch(data, 4), "At last");
    assert.equal(5, LBUtil.bsearch(data, 4.1), "After last");
    });
    
    
QUnit.test( "copyCmmonProperties", function( assert ) {
    var objA = { 'a': 0, 'b': 1, 'c': 2, 'd': 3 };
    var objB = { 'x': 3, 'b': 4, 'c': 5, 'y': 6 };
    
    var objTest = {};
    Object.assign(objTest, objA);
    LBUtil.copyCommonProperties(objTest, objB);
    assert.deepEqual(objTest, { 'a': 0, 'b': 4, 'c': 5, 'd': 3 }, "default Copy");
    
    objTest = {};
    Object.assign(objTest, objA);
    LBUtil.copyCommonProperties(objTest, objB, function(propName, a, b) {
        return (propName !== 'c');
    });
    assert.deepEqual(objTest, { 'a': 0, 'b': 4, 'c': 2, 'd': 3 }, "default Copy");
    });
    

QUnit.test("RollingBuffer", function(assert) {
    var buffer = new LBUtil.RollingBuffer(4);
    assert.equal(buffer.getCurrentSize(), 0, "Empty - currentSize");
    assert.equal(buffer.getMaxSize(), 4, "Max Size");
    
    // 1
    buffer.push(1);
    assert.equal(buffer.getCurrentSize(), 1, "CurrentSize 1");
    assert.equal(buffer.get(0), 1, "get(0) = 1");
    
    // 1 2 3
    buffer.push(2);
    buffer.push(3);
    assert.equal(buffer.getCurrentSize(), 3, "CurrentSize 3");
    assert.equal(buffer.get(0), 1, "get(0) = 1");
    assert.equal(buffer.get(1), 2, "get(1) = 2");
    assert.equal(buffer.get(2), 3, "get(2) = 3");
    
    // 1 2 3 4
    buffer.push(4);
    assert.equal(buffer.getCurrentSize(), 4, "CurrentSize 4");
    assert.equal(buffer.get(3), 4, "get(3) = 4");
    
    // 5 2 3 4
    buffer.push(5);
    assert.equal(buffer.getCurrentSize(), 4, "Roll over");
    assert.equal(buffer.get(0), 2, "get(0) = 2");
    assert.equal(buffer.get(3), 5, "get(3) = 5");
    
    // 5 6 3 4
    buffer.push(6);
    assert.equal(buffer.getCurrentSize(), 4, "Roll over 2");
    assert.equal(buffer.get(0), 3, "get(0) = 3");
    assert.equal(buffer.get(3), 6, "get(3) = 6");
    
    // 5 6 _ 4
    buffer.popOldest();
    assert.equal(buffer.getCurrentSize(), 3, "Pop Oldest");
    assert.equal(buffer.get(0), 4, "get(0) = 4");
    
    // 5 6 _ _
    buffer.popOldest();
    assert.equal(buffer.getCurrentSize(), 2, "Pop Oldest");
    assert.equal(buffer.get(0), 5, "get(0) = 5");
    
    // _ 6 _ _
    buffer.popOldest();
    assert.equal(buffer.get(0), 6, "get(0) = 6");

    // _ _ _ _
    var result = buffer.popOldest();
    assert.equal(result, 6, "popOldest() last result");
    
    result = buffer.popOldest();
    assert.equal(result, undefined, "popOldest() empty");
    
    buffer.clear();
    assert.equal(buffer.getCurrentSize(), 0, "clear");
    
    buffer.push(1);
    buffer.push(2);
    buffer.push(3);
    buffer.push(4);
    
    // 5 2 3 4
    buffer.push(5);
    
    // _ 2 3 4
    result = buffer.popNewest();
    assert.equal(result, 5, "popNewest() = 5");
    assert.equal(buffer.getCurrentSize(), 3, "popNewest() current size = 3");
    
    // _ 2 3 _
    result = buffer.popNewest();
    assert.equal(result, 4, "popNewest() = 4");
    assert.equal(buffer.getCurrentSize(), 2, "popNewest() current size = 2");
    
    // _ 2 _ _
    result = buffer.popNewest();
    assert.equal(result, 3, "popNewest() = 3");
    assert.equal(buffer.getCurrentSize(), 1, "popNewest() current size = 1");
    
    // _ _ _ _
    result = buffer.popNewest();
    assert.equal(result, 2, "popNewest() = 2");
    assert.equal(buffer.getCurrentSize(), 0, "popNewest() current size = 0");
    
    result = buffer.popNewest();
    assert.equal(result, undefined, "popNewest() empty");
    assert.equal(buffer.getCurrentSize(), 0, "popNewest() current size = 0");
});

});