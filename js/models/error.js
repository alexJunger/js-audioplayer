/*global $:false */
/* global console:false */
/* global File:false */


/**
 * @fileOverview Defines a small Error constructor used throughout the project.
 * @namespace player
 * @author Alexander Junger
 */
var player = window.player || {};

(function(window, namespace) {
    "use strict";

    /**
     * @param {Object} data Arbitrary data to be stored in the Error object.
     * @constructor
     * @memberOf namespace
     */
    var Error = function(data) {
        this._data = null;
        this.setData(data);
    };

    /**
     * @param {Object} data
     * @memberOf namespace.Error
     */
    Error.prototype.setData = function(data) {
        if(typeof data === "object") {
            this._data = data;
        }
    };

    /**
     * Retrieve the data object of the error.
     * @returns {null|Object}
     * @memberOf namespace.Error
     */
    Error.prototype.getData = function() {
        return this._data;
    };

    namespace.Error = Error;
})(window, player);