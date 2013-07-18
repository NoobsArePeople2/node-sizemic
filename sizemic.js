//==================================================================
//
// Requires
//
//==================================================================

var im = require('imagemagick');

//==================================================================
//
// Vars
//
//==================================================================

var logEnabled = false;

//==================================================================
//
// Functions
//
//==================================================================

/**
 * Turns logging on.
 */
function enableLogging() {
    logEnabled = true;
}

/**
 * Turns logging off.
 */
function disableLogging() {
    logEnabled = false;
}

/**
 * Wrapper for log writing.
 *
 * @param string msg Message to write.
 */
function writeLog(msg) {
    if (logEnabled) {
        console.log(msg);
    }
}

/**
 * Gets the output file name for the resized image.
 * This will either be the user provided output name or
 * the input name with a `_sizemic` placed at the end of the
 * file name just before the extension.
 *
 * @param string output Output name provided by user.
 * @param string input Input file name.
 * @return string The output file name to use.
 */
function getOuputName(output, input) {

    if (output == '.') {
        var index = input.lastIndexOf('.');
        return input.substring(0, index) + "_sizemic" + input.substring(index);
    }

    return output;
}

/**
 * Gets the format.
 * Allows us to transform variants into a standard name.
 * E.g., 'jpeg' into 'jpg'.
 *
 * @param string input Input file name.
 * @return string Format name.
 */
function getFormat(input) {
    var ext = input.substring(input.lastIndexOf('.') + 1).toLowerCase();
    if (ext == 'jpeg') {
        return 'jpg';
    }

    return ext.toLowerCase();
}

/**
 * Does the actual resizing work.
 *
 * @param string input Input file.
 * @param int width Width to resize to.
 * @param int height Height to resize to.
 * @param string output Output file.
 * @param function errback. Error callback.
 * @param function callback. Complete callback.
 */
function doResize(input, width, height, output, errback, callback) {

    var opts = {
        srcPath: input,
        dstPath: getOuputName(output, input),
        quality: 1.0,
        format:  getFormat(input),
        width:   width,
        height:  height
    };

    im.resize(opts, function(err, stdout, stderr) {
        if (err) {
            if (errback) {
                errback(err);
            }
            return;
        }

        writeLog("Resized '" + input + "' to '" + width + "x" + height + "' into '" + opts.dstPath + "'");

        if (callback) {
            callback(input);
        }
    });

}

/**
 * Resize an image.
 *
 * @param string input Input file.
 * @param number scale Fraction to scale the image.
 * @param int width Width to resize to.
 * @param int height Height to resize to.
 * @param string output Output file.
 * @param function errback. Error callback.
 * @param function callback. Complete callback.
 */
function resize(input, scale, width, height, output, errback, callback) {

    im.identify(input, function(err, features) {

        if (err) {
            // throw err;
            if (errback) {
                errback(err);
            }
            return;
        }

        if (scale != 1.0 || (parseInt(width) < 1 && parseInt(height) < 1)) {
            // Non-default scale value
            // OR
            // Both width and height are invalide sizes
            doResize(input, Math.ceil(features.width * scale), Math.ceil(features.height * scale), output, errback, callback);
        } else {
            // Scale by width or height
            var w = parseInt(width);
            var h = parseInt(height);
            if (w > 0 && h < 1) {
                // Width set, height not set
                doResize(input, w, features.height,  output, errback, callback);
            } else {// if (w < 1 && height > 0)
                // Height set, width not set
                doResize(input, features.width, h,  output, errback, callback);
            }
        }
    });
}

exports.resize         = resize;
exports.enableLogging  = enableLogging;
exports.disableLogging = disableLogging;