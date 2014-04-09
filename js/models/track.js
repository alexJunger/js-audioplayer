/*
 global $:false,
 global console:false,
 global File:false,
 global URL: false,
 global jDataView: false,
 global URL: false,
 */

/**
 * @fileOverview Defines Track constructor that holds audio data.
 * @author Alexander Junger
 * @version: 0.5
 * @namespace player
 */

var player = window.player || {};

(function(window, namespace) {
    "use strict";

    var Error = namespace.Error;

    /**
     * Constructor for Track objects.
     * @memberOf namespace
     * @param data {File|JSON} A FileAPI object or JSON object containing track information in binary or URI form.
     * @constructor
     */
    var Track = function(data) {
        this._fileURI = null;
        this._tags = null;
        this._initialize(data);
    };

    /**
     * Returns the tags of this Track.
     * @returns {Object}
     * @memberOf namespace.Track
     */
    Track.prototype.getTags = function() {
        return this._tags;
    };

    /**
     * Return a JSON object containing all the essential information of the Track.
     * @returns {{uri: (null|*), title: string, album: string, artist: string, genre: (*|string), year: string}}
     * @memberOf namespace.Track
     */
    Track.prototype.json = function () {
        return {
            "url": this._fileURI,
            "title": this._tags.title,
            "album": this._tags.album,
            "artist": this._tags.artist,
            "genre": this._tags.genre,
            "year": this._tags.year
        };
    };

    /**
     * Returns a playable URI, either as a dataURI or as a local file relative to the website.
     * @returns {null|string}
     * @memberOf namespace.Track
     */
    Track.prototype.getSrc = function() {
        return this._fileURI;
    };

    /**
     * Initialize the Track data (tags and file information).
     * @param data {File|JSON}
     * @private
     * @memberOf namespace.Track
     */
    Track.prototype._initialize = function(data) {
        if (data instanceof File) {
            var fileReaderArray = new FileReader();
            var fileReaderData = new FileReader();

            fileReaderArray.onload = this._readTags.bind(this);
            fileReaderData.onload = this._handleFileData.bind(this);

            fileReaderArray.readAsArrayBuffer(data);
            fileReaderData.readAsDataURL(data);
        } else if(typeof data.url !== "undefined") {
            this._setFileURI(data.url);
            this._tags = {title: data.name};
            try {
                this._tags = {
                    title:  data.title,
                    artist: data.artist,
                    album:  data.album,
                    year:   data.year,
                    genre:  data.genre
                };
            } catch (e) {
                console.log("WARNING: Insufficient tags in JSON");
            }
        } else {
            throw new Error( { msg: "Track cannot be initialized with this type of data."} );
        }
    };

    /**
     * @param {string} uri a data URI generated from a FileReader or a file URI passed via JSON.
     * @private
     * @memberOf namespace.Track
     */
    Track.prototype._setFileURI = function(uri) {
        if(typeof uri === "string") {
            this._fileURI = uri;
            $(this).trigger("fileuriready");
        }
    };

    /**
     * Pass the data-URL retrieved from the FileReader to the setter method.
     * @param {Event} e
     * @private
     * @memberOf namespace.Track
     */
    Track.prototype._handleFileData = function(e) {
        this._setFileURI(e.target.result);
    };

    /**
     * Extract Tags from a buffer and set the track's tags.
     * @param {ArrayBuffer} buffer
     * @private
     * @memberOf namespace.Track
     */
    Track.prototype._readTags = function(e) {
        var buffer = e.target.result;

        if(this._bufferHasTags(buffer)) {

            this._tags = {
                title:  this._getStringFromBinary(buffer, -125, 30),
                artist: this._getStringFromBinary(buffer, -95, 30),
                album:  this._getStringFromBinary(buffer, -65, 30),
                year:   this._getStringFromBinary(buffer, -35, 4),
                genre:  this._getStringFromBinary(buffer, -1, 1)
            };

            if(this._tags.genre.charCodeAt(0) === 255) {
                this._tags.genre = "";
            }
        } else {
            this._tags = {
                title: "Unknown title"
            };
        }

        $(this).trigger("tagsready");
    };

    /**
     * @param {buffer} buffer
     * @returns {boolean} wether or not the buffer keyword was found.
     * @private
     * @memberOf namespace.Track
     */
    Track.prototype._bufferHasTags  = function(buffer) {
        var keyword = this._getStringFromBinary(buffer, -128, 3);
        return  keyword === "TAG" || keyword === "ID3";
    };

    /**
     *
     * @param binaryBuffer {Object}
     * @param start {number}
     * @param length {number}
     * @returns {string}
     * @private
     * @memberOf namespace.Track
     */
    Track.prototype._getStringFromBinary = function(binaryBuffer, start, length) {
        if(start < 0) {
            start = binaryBuffer.byteLength - (start * -1);
        }

        if(length === 0) {
            length = binaryBuffer.byteLength - start;
        } else if(length < 0) {
            length = binaryBuffer.byteLength - start - (length * -1);
        }

        var i8Array = new Uint8Array(binaryBuffer, start, length);
        var charArray = [];

        for (var i = i8Array.length - 1; i >= 0; i--) {
            charArray.push(String.fromCharCode(i8Array[i8Array.length - i -1]));
        }

        return charArray.join("");
    };

    namespace.Track = Track;
})(window, player);