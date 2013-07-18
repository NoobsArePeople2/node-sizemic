//==================================================================
//
// sizemic-batch: command line script for batch sizemic jobs.
//
//==================================================================

//==================================================================
//
// Requires
//
//==================================================================

var optimist = require('optimist');
var size     = require('./sizemic');
var fs       = require('fs');
var path     = require('path');
var rimraf   = require('rimraf');
var mkdirp   = require('mkdirp');

//==================================================================
//
// Vars
//
//==================================================================

var main = function () {

    var FORCE_LOG  = true;
    var logEnabled = false;

    var imageExtensions = [ 'jpg', 'jpeg', 'png', 'gif' ];

    var FILE_ENCODING = 'utf8';
    var TMP_DIR = 'sizemic-tmp';

    var desc = {
        manifest:  'Manifest file to use for batch processing.',
        generate:  'Generate a manifest.',
        scale:     'Amount to scale the image e.g., 0.5.',
        width:     'Resize width to this (in pixels).',
        height:    'Resize height to this (in pixels).',
        output:    'File to save the resized image as. Use relative paths.',
        name:      'Name of the manifest.',
        verbose:   'Barf extra output to console.'
    };

    var argv = optimist
               .default('manifest', 'sizemic-manifest')
               .alias('manifest', 'm')
               .boolean('generate')
               .alias('generate', 'g')
               .default('source', '.')
               .alias('source', 'r')
               .default('scale', 1.0)
               .alias('scale', 's')
               .default('width', 0)
               .alias('width', 'w')
               .default('height', 0)
               .alias('height', 'h')
               .default('output', '')
               .alias('output', 'o')
               .default('name', 'sizemic-manifest')
               .alias('name', 'n)')
               .default('verbose', false)
               .alias('verbose', 'v')
               .describe(desc)
               .argv;

    var args = {
        manifest: argv.manifest,
        generate: argv.generate,
        source:   argv.source,
        scale:    argv.scale,
        width:    argv.width,
        height:   argv.height,
        output:   argv.output,
        name:     argv.name,
        verbose:  argv.verbose
    };

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
    function writeLog(msg, force) {
        force = (force === 'undefined') ? false : true;
        if (logEnabled || force) {
            console.log(msg);
        }
    }

    /**
     * Checks if the extension is one of the allowed image formats.
     *
     * @param string file File to check.
     * @return boolean True if the extension is valid, false if not.
     */
    function hasImageExtension(file) {
        var ext = file.substring(file.lastIndexOf('.') + 1);
        return imageExtensions.indexOf(ext) > -1;
    }

    function removeDir(dir) {
        try {
            // fs.rmdirSync(dir);
            rimraf.sync(dir);
        } catch (err) {
            writeLog("Unable to remove '" + dir + "'", FORCE_LOG);
            throw err;
            return false;
        }

        return true;
    }

    function makeDir(dir) {
        try {
            // fs.mkdirSync(dir);
            mkdirp.sync(dir);
        } catch (err) {
            writeLog("Unable to create '" + dir + "'", FORCE_LOG);
            throw err;
            return false;
        }

        return true;
    }

    /**
     * Generates a manifest based on options.
     *
     * @param string source Relative path to folder containing all images to add to manifest.
     * @param number scale Fractional amount to scale images. E.g., 0.5 for 50% scale.
     * @param int width Width to size images to. Only used if `scale` is not 1.0.
     * @param int height Height to size images to. Only used if `scale` is not 1.0 and `width` is less than 1.
     * @param string output Folder to output resized images relative to `source`.
     * @param boolean verbose Whether or not to use sizemic in verbose mode when processing the manifest.
     * @return string JSON string representing the manifest.
     */
    function generateManifest(source, scale, width, height, output, verbose) {

        writeLog("Generating manifest for '" + source + "'.");
        if (!fs.statSync(source).isDirectory()) {
            writeLog("ERROR: '" + source + "' is not a directory.", FORCE_LOG);
            return;
        }

        var json = {};
        json.description = "Manifest file for batch processing images with sizemic-batch.";

        json.files = [];
        var files = fs.readdirSync(source);
        files.forEach(function(file, index, arr) {

            var f = source + path.sep + file;
            if (fs.statSync(f).isFile() && hasImageExtension(file)) {
                writeLog("Adding file '" + f + "'.");
                json.files.push(file);
            }

        });

        if (scale != 1.0) {
            json.scale = scale;
            json.width = 0;
            json.height = 0;
        } else if (width > 0) {
            json.width = width;
            json.scale = 1.0;
            json.height = 0;
        } else if (height > 0) {
            json.height = height;
            json.scale = 1.0;
            json.width = 0;
        } else {
            writeLog("ERROR: You must set either 'scale', 'width' or 'height'.", FORCE_LOG);
            return;
        }

        output = output.trim();
        if (output == '') {
            output = 'sizemic';
        }

        json.outputDir = output;
        json.verbose = verbose;

        return JSON.stringify(json, null, 2);
    }

    /**
     * Writes the manifest to disk.
     *
     * @param string manifest JSON representation of the manifest.
     * @param string output Relative path to output folder.
     * @param string name Manifest file name.
     */
    function writeManifest(manifest, output, name) {

        var filename = output + path.sep + name + '.json';
        fs.writeFile(filename, manifest, FILE_ENCODING, function(err) {
            if (err) {
                throw err;
            } else {
                writeLog("Manifest written to '" + filename + "'.");
            }
        });
    }

    /**
     * Reads a manifest file from disk into JSON.
     *
     * @param string manifest Relative path to manifest file.
     * @return Object JSON Object.
     */
    function readManifest(manifest) {

        try {
            var data = fs.readFileSync(manifest, FILE_ENCODING);
        } catch (err) {
            writeLog("ERROR: Could not read manifest.", FORCE_LOG);
            return;
        }

        return JSON.parse(data);
    }

    /**
     * Batch processes a manifest.
     *
     * @param Object JSON representation of manifest file.
     */
    function batch(manifest, manifestFile) {

        var dir = manifestFile.substring(0, manifestFile.lastIndexOf(path.sep));
        process.chdir(dir.replace(path.sep, '/'));

        var error = function(err) {
            writeLog("ERROR: Could not resize file.", FORCE_LOG);
        };

        var success = function() {
            writeLog("File resized.");
        };

        // If output dir exists, delete it
        if (fs.existsSync(manifest.outputDir)) {
            removeDir(manifest.outputDir);
        }

        // Create fresh version of output dir
        makeDir(manifest.outputDir);

        manifest.files.forEach(function(file, index, arr) {
            size.resize(file, manifest.scale, manifest.width, manifest.height, manifest.outputDir + path.sep + file, error, success);
        });

    }

    //==================================================================
    //
    // The Script
    //
    //==================================================================

    if (args.verbose) {
        size.enableLogging();
        enableLogging();
    }

    if (args.generate) {
        var json = generateManifest(args.source, args.scale, Math.ceil(parseInt(args.width)), Math.ceil(parseInt(args.height)), args.output, args.verbose);
        if (json) {
            writeManifest(json, args.source, args.name);
        }
    } else if (args.manifest.trim() != '') {
        var data = readManifest(args.manifest);
        if (data) {
            batch(data, args.manifest);
        }
    } else {
        // Usage?
    }
};

module.exports.main = main;