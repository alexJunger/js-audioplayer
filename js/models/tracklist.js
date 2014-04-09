/* global console:false */
/* global File:false */
/* global jDataView: false */

/**
 * @fileOverview Defines TrackList constructor which holds all Track information,
 * including currentTrack and current tracktime, as well as shuffle status.
 * @namespace player
 * @author Alexander Junger
 */
window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;

var player = window.player || {};

(function(window, namespace) {
    "use strict";

    var Error = namespace.Error;
    var Track = namespace.Track;

    /**
     * @constructor
     * @memberOf namespace
     */
    var TrackList = function() {
        this._tracks = [];
        this._shuffleOrder = [];
        this._currentTrack = null;
        this._trackMode = this._trackModes.noshuffle;
        this._trackTime = 0;
        this._validTypes = ["audio/mp3"];

        this._feed();
    };

    /**
     * Validates and pushes track to tracks array.
     * @param {Track} track
     * @memberOf namespace.TrackList
     */
    TrackList.prototype.pushTrack = function(track) {
        this._validateTrack(track);
        this._tracks.push(track);
        this._shuffleOrder.push(this._tracks.length - 1);
        this.reshuffle();

        $(this).trigger("change", { msg: "add", track: track});


        if (!this._currentTrack) {
            this.setCurrentTrackByNumber(0);
        }

        if(this.notEmpty()) {
            $(this).trigger("notempty");
        }

        this._store();
    };

    /**
     * Wether or not the Tracklist has tracks to be played
     * @returns {boolean}
     * @ 
     */
    TrackList.prototype.notEmpty = function() {
        return this._tracks.length === 1;
    };

    /**
     * Mixes the internal order of tracks used when shuffle mode is active.
     * @memberOf namespace.TrackList
     */
    TrackList.prototype.reshuffle = function() {
        var i = this._shuffleOrder.length, j, temp;

        if (i === 0) {
            return;
        }

        while (--i) {
            j = Math.floor(Math.random() * ( i + 1 ));
            temp = this._shuffleOrder[i];
            this._shuffleOrder[i] = this._shuffleOrder[j];
            this._shuffleOrder[j] = temp;
        }
    };

    /**
     * Moves a Track to a new position in the trackList
     * @param {Track} track The Track to be moved.
     * @param {number} offset how far up or down the track is to be moved.
     * @memberOf namespace.TrackList
     */
    TrackList.prototype.reorderTrack = function(track, offset) {
        if(track instanceof Track && this.contains(track)) {
            var currentPosition = this._tracks.indexOf(track),
                newPosition = currentPosition + offset;

            if (newPosition >= this._tracks.length) {
                var k = newPosition - this._tracks.length;
                while ((k--) + 1) {
                    this._tracks.push(undefined);
                }
            }
            this._tracks.splice(newPosition, 0, this._tracks.splice(currentPosition, 1)[0]);
            this._store();
        }
    };

    /**
     * Removes a given track from the tracklist.
     * @param {Track} track - the track to be removed
     * @returns {boolean} - wether or not the track was successfully removed
     * @memberOf namespace.TrackList
     */
    TrackList.prototype.removeTrack = function(track) {
        var trackIndex = this._tracks.indexOf(track);

        if(trackIndex === -1) {
            return false;
        } else {
            this._tracks.splice(trackIndex, 1);

            for(var i = this._shuffleOrder.length -1; i >= 0; i--) {
                if (this._shuffleOrder[i] > trackIndex) {
                    this._shuffleOrder[i]--;
                }
            }

            $(this).trigger("change", { msg: "remove", track: track });
            if(!this._tracks.length) {
                $(this).trigger("empty");
            }
            this._store();
            return true;
        }
    };

    /**
     * @returns {Array} tracks array
     * @memberOf namespace.TrackList
     */
    TrackList.prototype.getTracks = function() {
        return this._tracks;
    };

    /**
     * Creates new Track instance from file and pushes it to trackList.
     * @param {File} file - audio file to be added to the list.
     * @memberOf namespace.TrackList
     */
    TrackList.prototype.pushTrackFromFile = function(file) {
        this._validateFile(file);
        var newTrack = new Track(file),
            tagsready = false,
            fileuriready = false,
            check = function(e) {
                if (e.type === "tagsready") {
                    tagsready = true;
                }

                if(e.type === "fileuriready") {
                    fileuriready = true;
                }

                if(tagsready && fileuriready) {
                    this.pushTrack(newTrack);
                }
            }.bind(this);

        $(newTrack).on("tagsready", check);
        $(newTrack).on("fileuriready", check);
    };

    /**
     * Validates and then pushes a JSON track object
     * @param json {object} - A track in JSON
     * @memberOf namespace.TrackList
     */
    TrackList.prototype.pushTrackFromJson = function (json) {
        this._validateJson(json);
        this.pushTrack(new Track(json));
    };


    /**
     * Handles a a list of tracks by pushing them individually.
     * @param json {object} - A list of tracks in JSON
     * @memberOf namespace.TrackList
     */
    TrackList.prototype.pushTracksFromJson = function (json) {
        if (typeof json === "object" && json.tracks) {
            for (var i = json.tracks.length - 1; i >= 0; i--) {
                this.pushTrackFromJson(json.tracks[i]);
            }
        }
    };

    /**
     * Sets new current track by offset relative to old current track.
     * @param offset {number} - negative or positive offset
     * @memberOf namespace.TrackList
     */
    TrackList.prototype.setCurrentTrackByOffset = function (offset) {
        this.setCurrentTrackByNumber(this._trackMode.getIndex.call(this, offset));
        this.setTrackTime(0);
    };

    /**
     * @param {Track} track - Will be set as current track, if contained in tracklist.
     * @returns {boolean} True if the track was successfully set as currentTrack.
     * @memberOf namespace.TrackList
     * @throws {Error} if track paramter is not contained in trackList.
     */
    TrackList.prototype.setCurrentTrack = function(track) {
        if(!this.contains(track)){
            throw new Error({ msg: "Invalid argument track" });
        } else {
            this._currentTrack = track;
            this._store();
            console.log(track);
            $(this).trigger("currenttrack");
            return true;
        }
    };

    /**
     * Sets the current track by a number representing it's index in the list of Tracks.
     * @param {Number} [number=0]
     * @memberOf namespace.TrackList
     */
    TrackList.prototype.setCurrentTrackByNumber = function(number) {
        if (typeof number === "number" && this._validNumber(number)) {
            this.setCurrentTrack(this._tracks[number]);
        } else {
            this.setCurrentTrack(this.getFirstTrack());
        }
    };

    /**
     * @returns {null|Track}
     * @memberOf namespace.TrackList
     */
    TrackList.prototype.getCurrentTrack = function() {
        return this._currentTrack;
    };

    /**
     * Gets the first track in the track list
     * @returns {Track}
     * @memberOf namespace.TrackList
     */
    TrackList.prototype.getFirstTrack = function() {
        return this._tracks[0];
    };

    /**
     * Sets the trackTime value, which will automatically be synced into the Audio element as soon as playing resumes.
     * @param {number} time the time to be set as trackTime in seconds.
     * @memberOf namespace.TrackList
     */
    TrackList.prototype.setTrackTime = function(time) {
        this._trackTime = time;
    };

    /**
     * @returns {number}
     * @memberOf namespace.TrackList
     */
    TrackList.prototype.getTrackTime = function() {
        return this._trackTime;
    };


    /**
     * Stores the current trackTime value to localstorage by either altering or creating the trackList element.
     * @memberOf namespace.TrackList
     */
    TrackList.prototype.storeTrackTime = function () {
        if (localStorage.getItem("trackList")) {
            if (typeof this._tracks !== "undefined") {
                var storedTrackList = JSON.parse(localStorage.getItem("trackList"));
                storedTrackList.trackTime = this._trackTime;
                localStorage.setItem("trackList", JSON.stringify(storedTrackList));
            } else {
                localStorage.clear("trackList");
            }
        }
    };

    /**
     * @param track
     * @returns {boolean} - true if track is a Track contained in the tracklist
     * @memberOf namespace.TrackList
     */
    TrackList.prototype.contains = function (track) {
        return this._tracks.indexOf(track) >= 0;
    };

    /**
     * Returns wether the given type is valid for this playlist
     * @param type {string} a filetype like "audio/mp3"
     * @returns {boolean}
     * @memberOf namespace.TrackList
     */
    TrackList.prototype.isValidFileType = function (type) {
        return this._validTypes.indexOf(type) !== -1;
    };

    /**
     * Toggle the current shuffle state.
     * @param {boolean=} forceEnable override toggle and force shuffle (true) or noshuffle (false)
     * @memberOf namespace.TrackList
     */
    TrackList.prototype.toggleShuffle = function(force) {
        if(force === true) {
            this._trackMode = this._trackModes.shuffle;
        } else if(force === false) {
            this._trackMode = this._trackModes.noshuffle;
        } else {
            this._trackMode.toggle.call(this);
        }
    };

    /**
     * Defines the states for shuffle trackmodes, states satisfy an interface containing getIndex() and toggle().
     * @type {{noshuffle: {getIndex: Function, toggle: Function}, shuffle: {getIndex: Function, toggle: Function}}}
     * @private
     * @memberOf namespace.TrackList
     */
    TrackList.prototype._trackModes = {
        noshuffle: {
            getIndex: function(offset) {
                var currentIdx = this._tracks.indexOf(this._currentTrack);
                var trackNumber = (offset + this._tracks.length + currentIdx);
                trackNumber %= this._tracks.length;
                return trackNumber;
            },

            toggle: function() {
                this.reshuffle();
                this._trackMode = this._trackModes.shuffle;
                $(this).trigger("shufflechange", true);
            }
        },

        shuffle: {
            getIndex: function (offset) {
                var currentIdx = this._tracks.indexOf(this._currentTrack);
                var shuffleTrackNumber = (offset + this._tracks.length + this._shuffleOrder.indexOf(currentIdx));
                shuffleTrackNumber %= this._tracks.length;
                return this._shuffleOrder[shuffleTrackNumber];
            },

            toggle: function () {
                this._trackMode = this._trackModes.noshuffle;
                $(this).trigger("shufflechange", false);
            }
        }
    };

    /**
     * Checks the presence of a localStorage element with key "trackList".
     * If present, it is parsed and fed into the trackList.
     * @private
     * @memberOf namespace.TrackList
     */
    TrackList.prototype._feed = function () {
        var jsonTrackList = JSON.parse(localStorage.getItem("trackList"));

        if (jsonTrackList && typeof jsonTrackList.tracks !== "undefined" && jsonTrackList.tracks.length > 0) {
            var tracks = jsonTrackList.tracks;

            for (var i = tracks.length - 1; i >= 0; i--) {
                this.pushTrackFromJson(tracks[i]);
            }

            this.setCurrentTrackByNumber(jsonTrackList.currentTrack);
            this.setTrackTime(jsonTrackList.trackTime);
            //tracklist gets initialized as noshuffle but is toggled to shuffle if doesShuffle is true in localStorage.
            if(jsonTrackList.doesShuffle === true) {
                this._trackMode.toggle();
            }
            // reshuffle to generate a new shuffleOder
            this.reshuffle();
        } else {
            localStorage.clear("trackList");
        }
    };

    /**
     * Store this trackList object in localStorage under the "trackList" key.
     * Tracks will be merged into an array of JSON objects for further use.
     * Tracktime is also saved so that player can resume at same time after reloading.
     * @private
     * @memberOf namespace.TrackList
     */
    TrackList.prototype._store = function () {
        if(typeof this._tracks !== "undefined") {
            var tracks = this._tracks,
                jsonTrackList = {
                    trackTime: this.getTrackTime(),
                    currentTrack: this._tracks.indexOf(this._currentTrack),
                    tracks: [],
                };

            for (var i = tracks.length - 1; i >= 0; i--) {
                jsonTrackList.tracks.push(tracks[i].json());
            }
            try {
                localStorage.setItem("trackList", JSON.stringify(jsonTrackList));
            } catch(e) {
                console.log(e.message);
                if(e.message === "Error: An attempt was made to add something to storage that exceeded the quota. at TrackList._store") {
                    console.log("true");
                }
            }
        } else {
            localStorage.clear("trackList");
        }
    };

    /**
     * @param idx
     * @returns {boolean}
     * @private
     * @memberOf namespace.TrackList
     */
    TrackList.prototype._validNumber = function(idx) {
        return this._tracks.length && idx < this._tracks.length && idx >= 0;
    };

    /**
     * Validates an object against Track (instanceof) and throws an error if it fails.
     * @memberOf namespace.TrackList
     */
    TrackList.prototype._validateTrack = function(track) {
        if(!track instanceof Track) {
            throw new Error({ msg: "track is not an instance of Track" });
        } else {
            return true;
        }
    };

    /**
     * Validates an object against File (instanceof) and against allowed filetypes and throws an error if it fails.
     * @param file {File} object to be validated
     * @memberOf namespace.TrackList
     */
    TrackList.prototype._validateFile = function(file) {
        if(!file instanceof File) {
            throw new Error({ msg: "Argument file is not an instance of File" });
        }

        if(!this.isValidFileType(file.type)) {
            throw new Error({ msg: "Argument file is not of a valid media type" });
        } else {
            return true;
        }
    };


    /**
     * Validates a JSON Object against being an object and containing a set of properties with string values.
     * @param json {Object}
     * @private
     * @memberOf namespace.TrackList
     */
    TrackList.prototype._validateJson = function(json) {
        if(typeof json !== "object") {
            throw new Error({ msg: "Argument json is not an object" });
        }

        var properties = ["url", "title", "artist", "genre", "album", "year"];
        properties.forEach(function(property) {
            if(typeof json[property] !== "string") {

                console.log(typeof json[property]);
                throw new Error({ msg: "Property " + property + " of argument json is not a String." });
            }
        });
    };

    namespace.TrackList = TrackList;
})(window, player);