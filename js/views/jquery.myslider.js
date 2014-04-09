/* global $:false, jQuery: false, Event:false, console:false */
(function ($) {
    "use strict";

    // The core functionality
    var AbstractSlider = function AbstractSlider(o, config) {
        this._snapping = {
            active: config.snapping.active,
            frequency: config.snapping.frequency,
            attractivity: config.snapping.attractivity
        };

        // Interface to the Slider
        return {
            getPosition: this.getPosition,
            getValue: this.getValue,
            setValue: this.slide,
            setMin: this.setMin,
            setMax: this.setMax
        };
    };

    AbstractSlider.prototype = {
        _initDOM: function ($obj, config) {
            var DOMStructure = "<div class='" + "track" + "'><div class='" + "thumb" + "'>";
            // add tooltip node if applicable
            DOMStructure += config.tooltip ? "<div class='tooltip'>" +
                "<div class='tooltip-inner'></div>" +
                "<div class='tooltip-arrow'></div>" +
                "</div>" +
                "</div></div>" : "</div></div>";
            $obj.html(DOMStructure);
        },

        _valueToPosition: function (value) {
            //our thumb position
            var position = (value - this._minValue) / (this._maxValue - this._minValue) * (this._trackSize - this.thumbSize);
            return position;
        },

        _positionToValue: function (position) {
            return position / (this._trackSize - this.thumbSize) * (this._maxValue - this._minValue) + this._minValue;
        },

        _setPosition: function (newPosition) {
            // don't do anything - fallback for erroneous initialization of AbstractSlider
        },

        getPosition: function () {
            return this._valueToPosition(this._value);
        },

        _dragPosition: function (newValue) {
            var frequency = this._snapping.frequency;
            var attractivity = Math.min(this._snapping.attractivity, frequency / 2);

            if (newValue % frequency >= frequency - attractivity) {
                newValue = newValue - (newValue % frequency) + frequency;
            } else if (newValue % frequency < attractivity) {
                newValue = newValue - (newValue % frequency);
            }

            this._setPosition(this._valueToPosition(newValue));
            this._value = newValue;
        },

        slide: function (newValue) {
            if (newValue < this._minValue) {
                this._setPosition(this._valueToPosition(this._minValue));

            } else if (newValue > this._maxValue) {
                this._setPosition(this._valueToPosition(this._maxValue));
                this._value = this._maxValue;
            } else {
                if (this._snapping.active) {
                    this._dragPosition(newValue);
                } else {
                    this._setPosition(this._valueToPosition(newValue));
                    this._value = newValue;
                }
            }

            $(this._obj).trigger("slided", this.getValue());
        },

        setMin: function (newMin) {
            if (typeof newMin === "number") {
                this._minValue = Math.min(newMin, this._maxValue);
                this.prototype.slide(Math.max(this._value, this._minValue));
            }
        },

        setMax: function (newMax) {
            if (typeof newMax === "number") {
                this._maxValue = Math.max(newMax, this._minValue);
                this.prototype.slide(Math.min(this._value, this._maxValue));
            }
        },

        _calculatePosition: function (e) {
            var cursorOffset = this._getCursorOffset(e);
            var min = Math.min(cursorOffset - this._trackOffset - this._dragOffset, this._trackSize - this.thumbSize);
            return Math.max(0, min);
        },

        _toggleReposition: function (forcedState) {
            if (typeof forcedState === undefined) {
                $("html").toggleClass("reposition");
            } else if (forcedState) {
                $("html").addClass("reposition");
            } else {
                $("html").removeClass("reposition");
            }
        },

        _interactionHandler: function (e, obj) {
            obj.$obj.addClass("active");
            $("html").addClass("sliding");
            if (e.target === obj.thumb) {
                //thumb
                obj._dragOffset = this._getDragOffset(e);
            } else {
                //track
                obj._dragOffset = obj.thumbSize / 2;
                obj._toggleReposition(true);
                var position = obj._calculatePosition(e);
                obj.slide(obj._positionToValue(position));
            }

            $(window).on("mousemove", function (e) {
                obj._toggleReposition(false);
                var position = obj._calculatePosition(e);
                obj.slide(obj._positionToValue(position));
            });

            $(window).on("mouseup", function (e) {
                $(window).off("mousemove").off("mouseup");
                obj.$obj.removeClass("active");
                $("html").removeClass("sliding");
                obj._toggleReposition(false);
                obj.$obj.trigger("ended", obj.getValue());
            });
        },

        getValue: function () {
            return parseInt(this._value, 10);
        }
    };

    /**
     * Implementation of HSlider
     * @param o
     * @constructor
     */
    var HSlider = function HSlider(o, config) {
        this.$obj = $(o);
        this._obj = this.$obj[0];

        this._snapping = {
            active: config.snapping.active,
            frequency: config.snapping.frequency,
            attractivity: config.snapping.attractivity
        };

        this._initDOM(this.$obj, config);

        if (!this.$obj.hasClass("horizontal")) {
            this.$obj.addClass("horizontal");
        }

        this._thumb = this.$obj.find("." + "thumb");
        this._track = this.$obj.find("." + "track");

        this._minValue = isNaN(config.minValue) ? 0 : config.minValue;
        this._maxValue = isNaN(config.maxValue) ? 100 : config.maxValue;
        this._value = isNaN(config.value) ? this._minValue : config.value;
        this._dragOffset = 0;
        this._offsetProperty = "left";

        // set properties according to orientation
        this._trackOffset = this._track.offset().left;
        this._trackSize = this._track.width();
        this.thumbSize = this._thumb.width();

        var _obj = this;

        this.$obj.on("mousedown", function (e) {
            _obj._interactionHandler(e, _obj);
        });

        if (config.tooltip) {
            _obj.$obj.find(".tooltip-inner").text(_obj.getValue());
            this.$obj.on("slided", function () {
                _obj.$obj.find(".tooltip-inner").text(_obj.getValue());
            });
        }

        this.slide(this._value);
    };

    var F = function () {
    };
    F.prototype = AbstractSlider.prototype;
    HSlider.prototype = new F();

    //Student.prototye = Person.prototype
    HSlider.prototype = Object.create(AbstractSlider.prototype);

    $.extend(HSlider.prototype, {
        _getCursorOffset: function (e) {
            return e.pageX;
        },

        _getDragOffset: function (e) {
            return e.pageX - this._thumb.offset().left;
        },

        _setPosition: function (newPosition) {
            this._thumb.css(this._offsetProperty, newPosition);
        }
    });

    /**
     * Implementation of VSlider
     * @param o
     * @constructor
     */
    var VSlider = function VSlider(o, config) {
        this.$obj = $(o);
        this._obj = this.$obj[0];

        this._snapping = {
            active: config.snapping.active,
            frequency: config.snapping.frequency,
            attractivity: config.snapping.attractivity
        };

        this._initDOM(this.$obj, config);

        if (!this.$obj.hasClass("vertical")) {
            this.$obj.addClass("vertical");
        }

        this._thumb = this.$obj.find("." + "thumb");
        this._track = this.$obj.find("." + "track");

        this._minValue = isNaN(config.minValue) ? 0 : config.minValue;
        this._maxValue = isNaN(config.maxValue) ? 100 : config.maxValue;
        this._value = isNaN(config.value) ? this._minValue : config.value;
        this._dragOffset = 0;
        this._offsetProperty = "top";

        // set properties according to orientation
        this._trackOffset = this._track.offset().top;
        this._trackSize = this._track.height();
        this.thumbSize = this._thumb.height();

        var _obj = this;

        this.$obj.on("mousedown", function (e) {
            _obj._interactionHandler(e, _obj);
        });

        if (config.tooltip) {
            _obj.$obj.find(".tooltip-inner").text(_obj.getValue());
            this.$obj.on("slided", function () {
                _obj.$obj.find(".tooltip-inner").text(_obj.getValue());
            });
        }

        this.slide(this._value);
    };

    F = function () {
    };
    F.prototype = AbstractSlider.prototype;
    F.prototype = AbstractSlider.prototype;
    VSlider.prototype = new F();
    VSlider.prototype = Object.create(AbstractSlider.prototype);

    $.extend(VSlider.prototype, {
        _getCursorOffset: function (e) {
            return e.pageY;
        },

        _getDragOffset: function (e) {
            return e.pageY - this._thumb.offset().top;
        },

        _setPosition: function (newPosition) {
            this._thumb.css(this._offsetProperty, newPosition);
        }
    });

    $.fn.slider = function (method) {
        this.each(function () {
            // console.dir(this);
            var newConfig = $.extend(true, {}, $.fn.slider.DEFAULT_CONFIG, method);
            if (newConfig.orientation === "vertical") {
                $(this).data("slider", new VSlider(this, newConfig));
            } else {
                $(this).data("slider", new HSlider(this, newConfig));
            }
        });

        // Add chaining support
        return this;
    };

    $.fn.slider.DEFAULT_CONFIG = {
        snapping: {
            active: false,
            attractivity: 5,
            frequency: 10
        },
        orientation: "horizontal",
        tooltip: true
    };
})(jQuery);