﻿/**
 * @preserve  textfill
 * @name      jquery.textfill.js
 * @author    Russ Painter
 * @author    Yu-Jie Lin
 * @author    Alexandre Dantas
 * @version   0.6.0
 * @date      2014-08-19
 * @copyright (c) 2014 Alexandre Dantas
 * @copyright (c) 2012-2013 Yu-Jie Lin
 * @copyright (c) 2009 Russ Painter
 * @license   MIT License
 * @homepage  https://github.com/jquery-textfill/jquery-textfill
 * @example   http://jquery-textfill.github.io/jquery-textfill/index.html
 *
 * ( This is an unmerged fork version from: https://github.com/DraughtGlobe/jquery-textfill )
 */
; (function($) {

    /**
     * Resizes an inner element's font so that the
     * inner element completely fills the outer element.
     *
     * @param {Object} options User options that take
     *                         higher precedence when
     *                         merging with the default ones.
     *
     * @return All outer elements processed
     */
    $.fn.textfill = function(options) {

        // ______  _______ _______ _______ _     _        _______ _______
        // |     \ |______ |______ |_____| |     | |         |    |______
        // |_____/ |______ |       |     | |_____| |_____    |    ______|
        //
        // Merging user options with the default values

        var defaults = {
            debug            : false,
            maxFontPixels    : 40,
            minFontPixels    : 4,
            innerTag         : 'span',
            widthOnly        : false,
            success          : null, // callback when a resizing is done
            callback         : null, // callback when a resizing is done (deprecated, use success)
            fail             : null, // callback when a resizing is failed
            complete         : null, // callback when all is done
            explicitWidth    : null,
            explicitHeight   : null,
            changeLineHeight : false
        };

        var Opts = $.extend(defaults, options);

        // _______ _     _ __   _ _______ _______ _____  _____  __   _ _______
        // |______ |     | | \  | |          |      |   |     | | \  | |______
        // |       |_____| |  \_| |_____     |    __|__ |_____| |  \_| ______|
        //
        // Predefining the awesomeness

        // Output arguments to the Debug console
        // if "Debug Mode" is enabled
        function _debug() {
            if (!Opts.debug
                ||  typeof console       == 'undefined'
                ||  typeof console.debug == 'undefined') {
                return;
            }
            console.debug.apply(console, arguments);
        }

        // Output arguments to the Warning console
        function _warn() {
            if (typeof console      == 'undefined' ||
                typeof console.warn == 'undefined') {
                return;
            }
            console.warn.apply(console, arguments);
        }

        // Outputs all information on the current sizing
        // of the font.
        function _debug_sizing(prefix, ourText, maxHeight, maxWidth, minFontPixels, maxFontPixels) {

            function _m(v1, v2) {

                var marker = ' / ';

                if (v1 > v2)
                    marker = ' > ';

                else if (v1 == v2)
                    marker = ' = ';

                return marker;
            }

            _debug(
                '[TextFill] '  + prefix + ' { ' +
                'font-size: ' + ourText.css('font-size') + ',' +
                'Height: '    + ourText.height() + 'px ' + _m(ourText.height(), maxHeight) + maxHeight + 'px,' +
                'Width: '     + ourText.width()  + _m(ourText.width() , maxWidth)  + maxWidth + ',' +
                'minFontPixels: ' + minFontPixels + 'px, ' +
                'maxFontPixels: ' + maxFontPixels + 'px }'
            );
        }

        /**
         * Calculates which size the font can get resized,
         * according to constrains.
         *
         * @param {String} prefix Gets shown on the console before
         *                        all the arguments, if debug mode is on.
         * @param {Object} ourText The DOM element to resize,
         *                         that contains the text.
         * @param {function} func Function called on `ourText` that's
         *                        used to compare with `max`.
         * @param {number} max Maximum value, that gets compared with
         *                     `func` called on `ourText`.
         * @param {number} minFontPixels Minimum value the font can
         *                               get resized to (in pixels).
         * @param {number} maxFontPixels Maximum value the font can
         *                               get resized to (in pixels).
         *
         * @return Size (in pixels) that the font can be resized.
         */
        function _sizing(prefix, ourText, func, max, maxHeight, maxWidth, minFontPixels, maxFontPixels, newLineHeightPerPixel) {

            _debug_sizing(
                prefix, ourText,
                maxHeight, maxWidth,
                minFontPixels, maxFontPixels
            );

            var fontSize = maxFontPixels;
            var fontSizeFound = false;
            do {
                ourText.css('font-size', fontSize+'px');

                if(newLineHeightPerPixel > 0) {
                    ourText.parent().css(
                        'line-height',
                        (newLineHeightPerPixel * fontSize) + 'px'
                    );
                }

                if (func.call(ourText) <= max) {
                    fontSizeFound = true;
                    break;
                }

                fontSize = Math.floor((minFontPixels + fontSize) / 2);

            } while(minFontPixels <= (fontSize - 1));

            if(fontSizeFound) {
                return fontSize;
            }

            return maxFontPixels;
        }

        function getLineHeightInPixelsPerFontSize(line_height, font_size) {

            if((line_height+"").substr(-2) === 'px') {
                line_height = parseFloat(line_height.substr(0, line_height.length - 2)) / parseFloat(font_size);
            } else {
                if(isNaN(line_height)) {
                    line_height = 1
                }
            }

            return line_height

        }

        function getMaxHeight(element) {

            if(Opts.explicitHeight) {
                return Opts.explicitHeight;
            }

            var max_height = parseFloat(element.css('max-height'));
            if( !isNaN(max_height) && max_height > element.height()) {
                return max_height;
            }

            return element.height();
        }

        function getMaxWidth(element) {
            if(Opts.explicitWidth) {
                return Opts.explicitWidth;
            }

            var max_width = parseFloat(element.css('max-width'));
            if( !isNaN(max_width) && max_width > element.width()) {
                return max_width;
            }

            return element.width();
        }

        // _______ _______ _______  ______ _______
        // |______    |    |_____| |_____/    |
        // ______|    |    |     | |    \_    |
        //
        // Let's get it started (yeah)!

        _debug('[TextFill] Start Debug');

        this.each(function() {

            // Contains the child element we will resize.
            // $(this) means the parent container
            var ourText = $(Opts.innerTag + ':visible:first', this);

            // Will resize to this dimensions.
            // Use explicit dimensions when specified
            var maxHeight = getMaxHeight($(this));
            var maxWidth  = getMaxWidth($(this));

            var oldFontSize = ourText.css('font-size');

            var ourTextLineHeight = ourText.css('line-height');
            var lineHeightPerPixel = getLineHeightInPixelsPerFontSize(ourTextLineHeight, oldFontSize);

            _debug('[TextFill] Inner text: ' + ourText.text());
            _debug('[TextFill] All options: ', Opts);
            _debug('[TextFill] Maximum sizes: { ' +
                'Height: ' + maxHeight + 'px, ' +
                'Width: '  + maxWidth  + 'px' + ' }'
            );

            var minFontPixels = Opts.minFontPixels;

            // Remember, if this `maxFontPixels` is negative,
            // the text will resize to as long as the container
            // can accomodate
            var maxFontPixels = (Opts.maxFontPixels <= 0 ?
                maxHeight :
                Opts.maxFontPixels);


            // Let's start it all!

            // 1. Calculate which `font-size` would
            //    be best for the Height
            var fontSizeHeight = undefined;

            if (! Opts.widthOnly)
                fontSizeHeight = _sizing(
                    'Height', ourText,
                    $.fn.height, maxHeight,
                    maxHeight, maxWidth,
                    minFontPixels, maxFontPixels,
                    Opts.changeLineHeight?lineHeightPerPixel:0
                );

            // 2. Calculate which `font-size` would
            //    be best for the Width
            var fontSizeWidth = undefined;

            fontSizeWidth = _sizing(
                'Width', ourText,
                $.fn.width, maxWidth,
                maxHeight, maxWidth,
                minFontPixels, maxFontPixels,
                Opts.changeLineHeight?lineHeightPerPixel:0
            );

            // 3. Actually resize the text!

            if (Opts.widthOnly) {
                ourText.css({
                    'font-size'  : fontSizeWidth,
                    'white-space': 'nowrap'
                });

                if (Opts.changeLineHeight) {
                    ourText.parent().css(
                        'line-height',
                        (lineHeightPerPixel * fontSizeWidth + 'px')
                    );
                }
            }
            else {
                var fontSizeFinal = Math.min(fontSizeHeight, fontSizeWidth);

                ourText.css('font-size', fontSizeFinal);

                if (Opts.changeLineHeight) {
                    ourText.parent().css(
                        'line-height',
                        (lineHeightPerPixel * fontSizeFinal) + 'px'
                    );
                }

            }

            _debug(
                '[TextFill] Finished { ' +
                'Old font-size: ' + oldFontSize              + ', ' +
                'New font-size: ' + ourText.css('font-size') + ' }'
            );

            // Oops, something wrong happened!
            // We weren't supposed to exceed the original size
            if ((ourText.width()  > maxWidth) ||
                (ourText.height() > maxHeight && !Opts.widthOnly)) {

                ourText.css('font-size', oldFontSize);

                // Failure callback
                if (Opts.fail)
                    Opts.fail(this);

                _debug(
                    '[TextFill] Failure { ' +
                    'Current Width: '  + ourText.width()  + ', ' +
                    'Maximum Width: '  + maxWidth         + ', ' +
                    'Current Height: ' + ourText.height() + ', ' +
                    'Maximum Height: ' + maxHeight        + ' }'
                );
            }
            else if (Opts.success) {
                Opts.success(this);
            }
            else if (Opts.callback) {
                _warn('callback is deprecated, use success, instead');

                // Success callback
                Opts.callback(this);
            }
        });

        // Complete callback
        if (Opts.complete)
            Opts.complete(this);

        _debug('[TextFill] End Debug');
        return this;
    };

})(window.jQuery);