/* global console:false; EventDispatcher: false; player: false */

/**
 * @fileOverview Defines Controller constructor that mediates View interaction to the Model.
 * @namespace player
 */
var player = window.player || {};

(function(window, namespace) {
    'use strict';

    /**
     * @param model {PlayerModel}
     * @memberOf namespace
     * @constructor
     */
    var PlayerController = function(model) {
        this._model = model;

        /**
         * Handle a list of audio files by passing it to the model.
         * @type {function(this:PlayerController)}
         */
        this.handleFiles = function(e) {
            if(e.target.files) {
                this._model.newFileList(e.target.files);
            }
        }.bind(this);

        /**
         * Handle a list of JSON files by passing it to the model.
         * @type {function(this:PlayerController)}
         */
        this.handleJson = function (e) {
            if (e.target.files) {
                this._model.newJsonFileList(e.target.files);
            }
        }.bind(this);

        /**
         * Handle click on previous button by going to previous track.
         * @type {function(this:PlayerController)}
         */
        this.handlePreviousClick = function () {
            this._model.previousTrack();
        }.bind(this);

        /**
         * Handle click on play button by playing/pausing, depending on current state.
         * @type {function(this:PlayerController)}
         */
        this.handlePlayClick = function () {
            this._model.play();
        }.bind(this);

        /**
         * Handle click on stop button by stopping the current list.
         * @type {function(this:PlayerController)}
         */
        this.handleStopClick = function () {
            this._model.stop();
        }.bind(this);

        /**
         * Handle click on next button by going to next track.
         * @type {function(this:PlayerController)}
         */
        this.handleNextClick = function() {
            this._model.nextTrack();
        }.bind(this);

        /**
         * Handle timeline interaction by sending precentual value of slider to model's forward method.
         * @type {function(this:PlayerController)}
         */
        this.handleTimeline = function(e, data) {
            this._model.forward(data/100);
        }.bind(this);

        /**
         * Handle volume interaction by sending precentual value of volume slider to model's volume method.
         * @type {function(this:PlayerController)}
         */
        this.handleVolume = function (e, data) {
            this._model.volume(data/100);
        }.bind(this);

        /**
         * Turn track-based repeat on/off depending on current state.
         * @type {function(this:PlayerController)}
         */
        this.handleRepeatToggle = function() {
            this._model.toggleRepeat();
        }.bind(this);

        /**
         * Turn shuffle on/off depending on current state.
         * @type {function(this:PlayerController)}
         */
        this.handleShuffleToggle = function () {
            this._model.getTrackList().toggleShuffle();
        }.bind(this);


        /**
         * Handle timeline interaction by sending precentual value of slider to model's forward method.
         * @type {function(this:PlayerController)}
         */
        this.itemPlay = function(e) {
            var $item = this._getItemOf(e);
            this._model.switchTo(this._getTrackOf($item));
        }.bind(this);

        /**
         * Handle click on delete button by calling the remove method of the model.
         * @type {function(this:PlayerController)}
         */
        this.itemDelete = function(e) {
            var $item = this._getItemOf(e);
            this._model.remove(this._getTrackOf($item));
        }.bind(this);

        /**
         * Move a track to a new position by reordering the trackOrder array.
         * @param e {Event} the event that triggered this function.
         * @param offset {number} how far to move the track.
         */
        this.move = function(e, offset) {
            var $item = this._getItemOf(e);
            var track = this._getTrackOf($item);
            this._model.getTrackList().reorderTrack(track, offset);
        };

        this._getTrackOf = function($el) {
            return $el.data('track');
        };

        this._getItemOf = function(e) {
            if($(e.target).hasClass('item')) {
                return $(e.target);
            } else {
                return $(e.target).parents('li');
            }
        };
    };

    namespace.PlayerController = PlayerController;
})(window, player);