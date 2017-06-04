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

/* global QUnit, Leeboard */

QUnit.assert.nearEqual = function(value, expected, msg, tolerance) {
    this.pushResult({
        result: Leeboard.isNearEqual(value, expected, tolerance),
        actual: value,
        expected: expected,
        message: msg
    });
};


QUnit.test( "Core-bsearch", function( assert ) {
    var data = [ -1, 0, 1, 2, 3, 4];
    assert.equal(-1, Leeboard.bsearch(data, -1.1), "Below first");
    assert.equal(0, Leeboard.bsearch(data, -1), "At first");
    assert.equal(0, Leeboard.bsearch(data, -0.9), "At 0.5");
    assert.equal(1, Leeboard.bsearch(data, 0), "At second");
    assert.equal(2, Leeboard.bsearch(data, 1.5), "At mid-point");
    assert.equal(4, Leeboard.bsearch(data, 3), "At last seg");
    assert.equal(4, Leeboard.bsearch(data, 3.9), "At last seg");
    assert.equal(5, Leeboard.bsearch(data, 4), "At last");
    assert.equal(5, Leeboard.bsearch(data, 4.1), "After last");
    });