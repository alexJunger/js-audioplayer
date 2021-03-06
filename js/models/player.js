/*global $:false */
/*global console:false, EventDispatcher: false, AudioContext: false */

/**
 * @fileOverview Defines PlayerModel constructor acts as a mediator between most components.
 * @namespace player
 * @author Alexander Junger
 */
var player = window.player || {};

(function(window, namespace) {
    "use strict";

    var Track = namespace.Track;
    var TrackList = namespace.TrackList;
    var Error = namespace.Error;

    /**
     * @param {DOMElement} audioTag The audio element that will be used for the player.
     * @memberOf namespace
     * @constructor
     */
    var PlayerModel = function(audioTag) {

        this._trackList = new TrackList();
        this._ctx = audioTag;
        this._currentState = null;
        this._setState(this._states.idle);

        this._currentRepeatMode = this._repeatModes.norepeat;
        this._initializeVolume();

        $(this._ctx).on("ended", function() {
            console.log(this._currentRepeatMode.continuePlaying);
            this._currentRepeatMode.continuePlaying.call(this);
        }.bind(this));
        setInterval(function() {
            this._trackList.storeTrackTime();
        }.bind(this), 1000);

        $(this._ctx).on("canplay durationchange", this._syncCurrentTime.bind(this));

        if(this._trackList.getTracks().length >= 1) {
            this._setState(this._states.pausing);
        }

        $(this._trackList).on("notempty", function() {
            this._setState(this._states.pausing);
        }.bind(this));

        $(this._trackList).on("empty", function () {
            this._setState(this._states.idle);
        }.bind(this));
    };

    // PUBLIC INTERFACE

    /**
     * Call the play method of the current state.
     * @memberOf namespace.PlayerModel
     */
    PlayerModel.prototype.play = function () {
        this._currentState.play.call(this);
    };

    /**
     * Call the pause method of the current state.
     * @memberOf namespace.PlayerModel
     */
    PlayerModel.prototype.pause = function () {
        this._currentState.pause.call(this);
    };

    /**
     * Call the stop method of the current state.
     * @memberOf namespace.PlayerModel
     */
    PlayerModel.prototype.stop = function () {
        this._currentState.pause.call(this);
        this._trackList.setCurrentTrackByNumber(0);
        this._trackList.setTrackTime(0);
    };

    /**
     * Set the trackTime by a percentual value
     * @param data {number} The seconds to set as trackTime.
     * @memberOf namespace.PlayerModel
     */
    PlayerModel.prototype.forward = function(data) {
        if(typeof data === "number") {
            var seconds = parseInt(this._ctx.duration * data, 10);
            this._currentState.forward.call(this, seconds);
        }
    };

    /**
     * Switch to a given track.
     * @param track {Track} pause the player, set track as currentTrack, reset trackTime and resume playing.
     * @memberOf namespace.PlayerModel
     */
    PlayerModel.prototype.switchTo = function (track) {
		try {
			this.pause();
			this._trackList.setCurrentTrack(track);
			this._trackList.setTrackTime(0);
			this.play();
		} catch (e) {
			this.triggerError(e);
		}
    };

    /**
     * Set the volume of the audio context as a percentual value (0-1)
     * and store it to localstorage
     * @param {Number} data
     * @memberOf namespace.PlayerMode
     */
    PlayerModel.prototype.volume = function (data) {
        if (typeof data === "number" && data >= 0 && data <= 1) {
            this._ctx.volume = data;
            localStorage.setItem("volume", data);
        }
    };

    /**
     * Get the current volume of the audio element
     * @returns {Number}
     * @memberOf namespace.PlayerMode
     */
    PlayerModel.prototype.getVolume = function() {
        return this._ctx.volume;
    };

    /**
     * Removes a track after checking if it is currently being played and switching to next track if necessary.
     * @param {Track} track - the track to be removed
     * @memberOf namespace.PlayerMode
     */
    PlayerModel.prototype.remove = function(track) {
        if(track === this._trackList.getCurrentTrack()) {
            var resume = this.getStatus() === "playing";
            this.nextTrack(resume);
        }
        try {
            this._trackList.removeTrack(track);
        } catch(e) {
            this.triggerError(e);
        }
    };

    /**
     * Switches to next track and resets trackTime.
     * @memberOf namespace.PlayerMode
     */
    PlayerModel.prototype.nextTrack = function() {
        this._trackList.reshuffle();
        this._currentState.nextTrack.call(this);
        this._trackList.setTrackTime(0);
    };

    /**
     * Switches to previous track only if threshold not yet reached but always resets trackTime.
     * @memberOf namespace.PlayerMode
     */
    PlayerModel.prototype.previousTrack = function () {
        this._trackList.reshuffle();
        this._currentState.previousTrack.call(this);
        this._trackList.setTrackTime(0);
    };

    /**
     * Toggles current repeat mode.
     * @memberOf namespace.PlayerMode
     */
    PlayerModel.prototype.toggleRepeat = function() {
        this._currentRepeatMode.toggle.call(this);
    };

    /**
     * Send a new list of audio files to the trackList.
     * @param fileList
     * @memberOf namespace.PlayerMode
     */
    PlayerModel.prototype.newFileList = function (fileList) {
        if (fileList.length) {
            for (var i = fileList.length - 1; i >= 0; i--) {
                try {
                    this._trackList.pushTrackFromFile(fileList[i]);
                } catch (e) {
                    this.triggerError(e);
                }
            }
        }
    };

    /**
     * @param fileList
     * @memberOf namespace.PlayerMode
     */
    PlayerModel.prototype.newJsonFileList = function (fileList) {
        var reader,
            handleFileReaderResults = function (event) {
                var json = JSON.parse(event.target.result);
                this._trackList.pushTracksFromJson(json);
            }.bind(this);

        if (fileList.length) {
            for (var i = fileList.length - 1; i >= 0; i--) {
                try {
                    reader = new FileReader();
                    reader.onload = handleFileReaderResults;
                    reader.readAsText(fileList[i]);
                } catch (e) {
                    this.triggerError(e);
                }
            }
        }
    };

    // PRIVATE

    /**
     * Property defines available states of player with corresponding functions,
     * that can be uniformly called on currentState.
     * @type {{playing: {execute: Function, playpause: Function}, pausing: {execute: Function, playpause: Function}}}
     * @private
     * @memberOf namespace.PlayerModel
     */
    PlayerModel.prototype._states = {
        playing: {
            execute: function () {
                $(this).trigger("playing");
                this._syncCurrentTrack();
                this._ctx.play();
                $(this._ctx).on("playing", this._syncCurrentTime.bind(this));
                this._refreshIntervalId = setInterval(this._refreshTrackTime.bind(this), 100);
            },

            play: function () {
                this._setState(this._states.pausing);
            },

            pause: function () {
                this._setState(this._states.pausing);
            },

            previousTrack: function () {
                this.pause();
                if (this._trackList.getTrackTime() > this._previousTrackThreshold) {
                    this._trackList.setTrackTime(0);
                } else {
                    this._trackList.setCurrentTrackByOffset(-1);
                }
                this.play();
            },

            nextTrack: function () {
                this.pause();
                this._trackList.setCurrentTrackByOffset(1);
                this.play();
            },

            forward: function (sec) {
                this.pause();
                this._trackList.setTrackTime(sec);
                this._triggerTimeUpdate();
                this.play();
            },

            exit: function () {
                clearInterval(this._refreshIntervalId);
            }
        },

        pausing: {
            execute: function () {
                $(this).trigger("pausing");
                this._syncCurrentTrack();
                clearInterval(this._refreshIntervalId);
                this._ctx.pause();
            },

            play: function () {
                this._setState(this._states.playing);
            },

            pause: function () {
                return;
            },

            previousTrack: function () {
                this._trackList.setCurrentTrackByOffset(-1);
            },

            nextTrack: function () {
                this._trackList.setCurrentTrackByOffset(1);
            },

            forward: function (sec) {
                this._trackList.setTrackTime(sec);
                this._triggerTimeUpdate();
            }
        },

        idle: {
            execute: function () {
                $(this).trigger("idling");
            },

            play: function () {
            },

            pause: function () {
            },

            previousTrack: function () {
            },

            nextTrack: function () {
            },

            forward: function () {
            }
        }
    };

    /**
     * Carefully switch audio state to a given state, exiting the old state if necessary.
     * @param {Object} state - a state object containing all the state-dependent functions.
     * @private
     * @memberOf namespace.PlayerModel
     */
    PlayerModel.prototype._setState = function (state) {
        if (this._currentState !== state) {
            if (this._currentState && this._currentState.exit === "function") {
                this._currentState.exit();
            }
            this._currentState = state;
            this._currentState.execute.call(this);
        }
    };

    /**
     * Property defines available repeatmodes with corresponding functions,
     * that can be uniformly called on currentRepeatMode.
     * @type {{repeat: {toggle: Function, continuePlaying: Function}, norepeat: {toggle: Function, continuePlaying: Function}}}
     * @private
     * @memberOf namespace.PlayerModel
     */
    PlayerModel.prototype._repeatModes = {
        repeat: {
            toggle: function () {
                this._currentRepeatMode = this._repeatModes.norepeat;
                $(this).trigger("repeatchange", false);
            },

            continuePlaying: function () {
                this.previousTrack();
            }
        },

        norepeat: {
            toggle: function () {
                this._currentRepeatMode = this._repeatModes.repeat;
                $(this).trigger("repeatchange", true);
            },

            continuePlaying: function () {
                this.nextTrack();
            }
        }
    };

    /**
     * Fallback value if no volume has been set in localStorage
     * @type {number}
     * @private
     * @memberOf namespace.PlayerModel
     */
    PlayerModel.prototype._defaultVolume = 0.5;

    /**
     * Set volume from localStorage or fallback value
     * @private
     * @memberOf namespace.PlayerModel
     */
    PlayerModel.prototype._initializeVolume = function() {
        var initialVolume = JSON.parse(localStorage.getItem("volume"));
        if(!initialVolume) {
            initialVolume = this._defaultVolume;
        }
        this.volume(initialVolume);
    };

    /**
     * Normally, previousTrack only resets the time of the current track.
     * If the current time at calling is smaller than this threshold however,
     * the previous track in the active list is set as the current track.
     * @type {number}
     */
    PlayerModel.prototype._previousTrackThreshold = 3;

    /**
     * Refresh the state of the the trackList to match the currentTime of the audio context,
     * trigger a time event so that the View can update it's time indicators.
     * @private
     * @memberOf namespace.PlayerModel
     */
    PlayerModel.prototype._refreshTrackTime = function() {
        this._trackList.setTrackTime(this._ctx.currentTime);
        this._triggerTimeUpdate();
    };

    /**
     * Get the current and total time of the current track.
     * @returns {{current: {Number}, total: {Number}}}
     */
    PlayerModel.prototype.getTimes = function() {
        return { current: this._trackList.getTrackTime(), total: this._ctx.duration }
    };

    /**
     * Set the currentTrack of the audio context to match the state of the trackList.
     * @private
     * @memberOf namespace.PlayerModel
     */
    PlayerModel.prototype._syncCurrentTrack = function() {
        this._ctx.setAttribute("src", this._trackList.getCurrentTrack().getSrc());
    };

    /**
     * Set the currentTime of the audio context to match the state of the trackList,
     * additionally trigger a time event so that the View can update it's time indicators.
     * @private
     * @memberOf namespace.PlayerModel
     */
    PlayerModel.prototype._syncCurrentTime = function() {
        $(this._ctx).off("playing");
        this._ctx.currentTime = this._trackList.getTrackTime();
        this._triggerTimeUpdate();
    };

    /**
     * Trigger an event containing current and total time of the event.
     * @private
     * @memberOf namespace.PlayerModel
     */
    PlayerModel.prototype._triggerTimeUpdate = function() {
        $(this).trigger("time", {current: this._trackList.getTrackTime(), total: this._ctx.duration});
    };

    /**
     * @returns {TrackList|*} - returns the active trackList instance.
     */
    PlayerModel.prototype.getTrackList = function() {
        return this._trackList;
    };


    /**
     * Triggers an error event that other parts objects can listen for.
     * @param e {Error} an Error object containing the error message.
     */
    PlayerModel.prototype.triggerError = function (e) {
        var errorData;
        if(e instanceof Error) {
            errorData = e.getData();
        } else {
            errorData = e;
        }
        $(this).trigger("error", [errorData]);
    };

    namespace.PlayerModel = PlayerModel;
})(window, player);