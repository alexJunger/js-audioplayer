/* global console:false; EventDispatcher: false; player: false */

/**
 * @fileOverview Defines the View which consists mainly of interaction listeners delegated to the controller
 * and of callback functions attached to model events.
 * @namespace player
 * @author Alexander Junger
 */

var player = window.player || {};

(function($, window, namespace) {
    "use strict";

    var Track = namespace.Track;

    /**
     *
     * @param {PlayerModel} model
     * @param {PlayerController} controller
     * @constructor
     */
    var PlayerView = function PlayerView(model, controller) {
        this._model = model;
        this._controller = controller;
        this._dom = {
            fileSelection:  $("#fileSelection"),
            jsonSelection: $("#jsonSelection"),
            info: $("button#info"),
            trackList:      $("#tracklist"),
            ctl: {
                previous: $("button#previous"),
                play: $("button#play"),
                stop: $("button#stop"),
                next: $("button#next"),
                shuffle: $("#shuffle"),
                repeat: $("#repeat")
            },
            timeline: $("#time").slider({tooltip: false}),
            current: $("#current"),
            total: $("#total"),
            volume: $("#volume").slider({tooltip: false}),
            trackInfo: $("#trackInfo")
        };
        this._isDragging = false;

        $(document).on("mouseup", this._globalDragRelease);
        this._dom.fileSelection.on("change", this._controller.handleFiles);
        this._dom.jsonSelection.on("change", this._controller.handleJson);
        this._dom.ctl.previous.on("click", this._controller.handlePreviousClick);
        this._dom.ctl.play.on("click", this._controller.handlePlayClick);
        this._dom.ctl.stop.on("click", this._controller.handleStopClick);
        this._dom.ctl.next.on("click", this._controller.handleNextClick);
        this._dom.ctl.repeat.on("click", this._controller.handleRepeatToggle);
        this._dom.ctl.shuffle.on("click", this._controller.handleShuffleToggle);
        this._dom.timeline.on("ended", this._controller.handleTimeline);
        this._dom.volume.on("slided", this._controller.handleVolume);
        this._dom.trackList.on("click", ".item .delete", this._controller.itemDelete);
        this._dom.trackList.on("click", ".item .play", this._controller.itemPlay);
        this._dom.trackList.on("dblclick", ".item", this._controller.itemPlay);
        this._dom.trackList.on("mousedown", ".item", this._drag.bind(this));
        $(this._model.getTrackList()).on("change feeded", this._trackListChanged.bind(this));
        $(this._model.getTrackList()).on("currenttrack", this._currentTrack.bind(this));
        $(this._model.getTrackList()).on("shufflechange", this._shuffleChanged.bind(this));
        $(this._model).on("time", this._refreshTime.bind(this));
        $(this._model).on("playing", this._statusPlaying.bind(this));
        $(this._model).on("pausing", this._statusPaused.bind(this));
        $(this._model).on("repeatchange", this._repeatChanged.bind(this));


        this._dom.timeline.on("slided", function () {
            this._isDragging = true;
        }.bind(this));

        this._dom.timeline.on("ended", function () {
            this._isDragging = false;
        }.bind(this));

        $(this._model).on("error", function (e, data) {
            console.log(e);
            console.log(data);
        });

        this._dom.info.on("click", function() {
            var $panel = $("#info-panel");
            $panel.fadeIn(200);

            $("body").addClass("return");
            $panel.css("cursor", "default");

            setTimeout(function() {
                $(document).on("click", function (e) {
                    if (!$(e.target).is($panel)) {
                        $("#info-panel").fadeOut(200);
                        $("body").removeClass("return");
                    }

                    $(document).off("click");
                });
            }, 1000);
        });

        this._refreshTrackList();
        this._refreshTime();
        this._refreshVolume();
        this._currentTrack();
    };

    /**
     * Set the time indicators (timeline, timecount) to match the state of the model.
     * @event
     * @param {jQueryEvent} e
     * @param {Object=} times
     * @private
     */
    PlayerView.prototype._refreshTime = function(e, times) {
        if(typeof times === "undefined") {
            times = this._model.getTimes();
            if(isNaN(times.total)) {
                times.total = 250;
            }
        }

        if(!this._isDragging) {
            var sliderValue = (100 / times.total) * times.current;
            this._dom.timeline.data("slider").slide(sliderValue);
            this._isDragging = false;
        }

        function humanReadable(secs) {
            var hours = parseInt(secs / 3600, 10),
                mins = parseInt(secs / 60, 10) % 60;

            secs = parseInt(secs % 60, 10);

            if(hours <= 0) {
                hours = "";
            } else {
                if(hours < 10) {
                    hours = "0" + hours;
                }

                hours += ":";
            }

            if (mins < 10) {
                mins = "0" + mins;
            }

            if (secs < 10) {
                secs = "0" + secs;
            }

            return hours + mins + ":" + secs;
        }

        this._dom.current.text(humanReadable(times.current));
        this._dom.total.text(humanReadable(times.total));
    };

    PlayerView.prototype._refreshVolume = function() {
        var vol = this._model.getVolume();
        $(this._dom.volume).data("slider").slide(vol * 100);
    };

    /**
     * Refreshes the whole track list in the view.
     * If Track is passed in data argument, only this track is appended.
     * @event
     * @param e {jQueryEvent}
     * @param data {*|Track=}
     * @private
     */
    PlayerView.prototype._trackListChanged = function(e, data) {
        if(data.msg === "add") {
            this._newTrack(data.track);
        } else if(data.msg === "remove") {
            this._removeTrack(data.track);
        } else {
            this._refreshTrackList();
        }
    };

    /**
     * Adds active class to new current Track and removes it any other track.
     * @private
     */
    PlayerView.prototype._currentTrack = function() {
        var currentTrack = this._model.getTrackList().getCurrentTrack(),
            $item = this._getItemOf(currentTrack);

        var updateTrackInfo = function() {
            if(!currentTrack) {
                return;
            }

            var tags =  currentTrack.getTags(),
                $track = this._dom.trackInfo.find(".track");

            $track.find(".title").html(tags.title);
            $track.find(".artist").html(tags.artist);
            $track.find(".year").html(tags.year);
            $track.find(".genre").html(tags.genre);
        }.bind(this);

        if (!this._dom.trackInfo.find(".track").length) {
            var $track = $( "<div class='track'>" +
                "<h4 class='title'></h4>" +
                "<p class='artist'><span></span></p>" +
                "<p class='year'></p> / " +
                "<p class='genre'></p>" +
                "</div>" );
            $track.appendTo(this._dom.trackInfo);
        }

        updateTrackInfo();
        $item.addClass("active");
        this._getTrackItems().not($item).removeClass("active");
    };

    /**
     * Change appearance when status changed to "playing".
     * @private
     */
    PlayerView.prototype._statusPlaying = function() {
        this._dom.ctl.play.html("<span>Pause</span>");
        this._dom.ctl.play.removeClass("pausing");
        this._dom.ctl.play.addClass("playing");
    };

    /**
     * Change appearance when status changed to "paused".
     * @private
     */
    PlayerView.prototype._statusPaused = function () {
        this._dom.ctl.play.html("<span>Play</span>");
        this._dom.ctl.play.removeClass("playing");
        this._dom.ctl.play.addClass("pausing");
    };

    /**
     * Change appearance of View when repeat status changed.
     * @event
     * @param e {jQueryEvent} e
     * @param {boolean} doesRepeat if true, model does repeat tracks and vice verse.
     * @private
     */
    PlayerView.prototype._repeatChanged = function (e, doesRepeat) {
        if(doesRepeat === true) {
            this._dom.ctl.repeat.html("<span>No more repeat</span>");
        } else {
            this._dom.ctl.repeat.html("<span>Repeat</span>");
        }

        this._dom.ctl.repeat.toggleClass("active");
    };

    /**
     * Change appearance of View when shuffle status changed.
     * @event
     * @param {jQueryEvent} e
     * @param {boolean} doesShuffle if true, model does shuffle tracks and vice verse.
     * @private
     */
    PlayerView.prototype._shuffleChanged = function (e, doesShuffle) {
        if (doesShuffle === true) {
            this._dom.ctl.shuffle.html("<span>No more shuffle</span>");
        } else {
            this._dom.ctl.shuffle.html("<span>Shuffle</span>");
        }

        this._dom.ctl.shuffle.toggleClass("active");
    };

    /**
     * Refresh entire trackList of this view.
     * @private
     */
    PlayerView.prototype._refreshTrackList = function() {
        this._dom.trackList.children().not(".header").remove();

        var tracks = this._model.getTrackList().getTracks();

        if(tracks && tracks.length && tracks && tracks.length) {
            for(var i = 0; i < tracks.length; i++) {
                this._newTrack(tracks[i]);
            }
        }
    };

    /**
     * Remove DOM node corresponding to a track.
     * @param {Track} track the Track object of which to remove the corresponding DOM item.
     * @private
     */
    PlayerView.prototype._removeTrack = function(track) {
        this._getItemOf(track).remove();
    };

    /**
     * Inserts a new DOM node holding the given track.
     * @param {Track} track the Track object from which to create a DOM item.
     * @private
     */
    PlayerView.prototype._newTrack = function(track) {
        if(track instanceof Track) {

            console.log(track);

            var tags = track.getTags();
            var $newTrack = $("<li class='item'>" +
                "<span class='button'><button class='play icon-play'><span>Play</span></button></span>" +
                "<span class='title'>" + tags.title + "</span>" +
                "<span class='artist'>" + tags.artist + "</span>" +
                "<span class='genre'>" + tags.genre + "</span>" +
                "<span class='button'><button class='delete icon-close'><span>Delete</span></button></span>" +
                "</li>");
            $newTrack.data("track", track);
            $newTrack.appendTo(this._dom.trackList);
        } else {
            throw { msg: "track is not an instance of Track" };
        }
    };

    /**
     * Returns the DOM node holding a track as a jQuery object.
     * @param {Track} track - the track that the items are matched against.
     * @returns {jQuery[]}
     * @private
     */
    PlayerView.prototype._getItemOf = function(track) {
        var trackItems = this._getTrackItems();
        for (var i = trackItems.length - 1; i >= 0; i--) {
            if ($(trackItems[i]).data("track") === track) {
                return $(trackItems[i]);
            }
        }
        return $();
    };

    /**
     * Returns the track items of this view.
     * @returns {jQuery[]}
     * @private
     */
    PlayerView.prototype._getTrackItems = function() {
        return $(this._dom.trackList).find(".item");
    };

    /**
     * Drag a track item to a new position
     * @event
     * @param e {jQueryEvent}
     * @private
     */
    PlayerView.prototype._drag = function(e) {
        e.preventDefault();

        var $item = $(e.target).parents(".item"),
            $hoveredItem,
            oldPos = e.pageY,
            oldIndex = this._getPositionOf($item[0]),
            newIndex;

        $item.css("cursor", "-webkit-grabbing !important");
        $item.addClass("hovered");

        $(document).on("mousemove", function(e) {
            e.preventDefault();
            $hoveredItem = $(document.elementFromPoint(e.pageX, e.pageY));
            newIndex = this._getPositionOf($item[0]);
            if(newIndex !== oldIndex) {
                this._controller.move(e, newIndex - oldIndex);
            }

            if(e.pageY >= oldPos) {
                $item.insertAfter($hoveredItem.parents(".item"));
            } else {
                $item.insertBefore($hoveredItem.parents(".item"));
            }

            oldPos = e.pageY;
            oldIndex = newIndex;
        }.bind(this));
    };

    /**
     * Remove all listeners on "mousemove" event
     * @event
     * @param {jQueryEvent} e
     * @private
     */
    PlayerView.prototype._globalDragRelease = function(e) {
        $(e.target).parents(".item").css("cursor", "inherit");
        $(document).off("mousemove");
        $(".hovered").removeClass("hovered");
    };

    /**
     * Returns the index of a DOM Element within it's parent
     * @param item - DOM Element to get the index of
     * @returns {index|*}
     * @private
     */
    PlayerView.prototype._getPositionOf = function(item) {
        return $(item).parent().find(".item").index(item);
    };

    namespace.PlayerView = PlayerView;
})(jQuery, window, player);
