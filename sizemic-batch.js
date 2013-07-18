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
var sleep    = require('sleep');

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
               .default('manifest', 'sizemic-manifest.json')
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
        force = (typeof force === 'undefined') ? false : true;
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
        return imageExtensions.indexOf(ext.toLowerCase()) > -1;
    }

    /**
     * Removes a directory.
     *
     * @param string dir Path to dir to remove.
     * @return boolean True if successful, false if not.
     */
    function removeDir(dir) {
        try {
            rimraf.sync(dir);
        } catch (err) {
            writeLog("Unable to remove '" + dir + "'", FORCE_LOG);
            writeLog("  " + err.message, FORCE_LOG);
            // throw err;
            return false;
        }

        return true;
    }

    /**
     * Makes a directory.
     *
     * @param string dir Path to dir to make.
     * @return boolean True if successful, false if not.
     */
    function makeDir(dir) {
        try {
            mkdirp.sync(dir);
        } catch (err) {
            writeLog("ERROR: Unable to create '" + dir + "'", FORCE_LOG);
            writeLog("  " + err.message, FORCE_LOG);
            // throw err;
            return false;
        }

        return true;
    }

    /**
     * Tests if a file exists. Works for folders too!
     *
     * @param string file Path to file to test.
     * @return boolean Whether or not the file exists.
     */
    function fileExists(file) {
        var exists = false;
        try {
            exists = fs.existsSync(file);
        } catch (err) {
            writeLog("ERROR: Unable to check if '" + file + "' exists.", FORCE_LOG);
            writeLog("  " + err.message, FORCE_LOG);
            return false;
        }

        return exists;
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

        json.sourceDir = source;

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

        // var filename = output + path.sep + name + '.json';
        var filename = name + '.json';
        fs.writeFile(filename, manifest, FILE_ENCODING, function(err) {
            if (err) {
                writeLog("ERROR: Could not write manifest.", FORCE_LOG);
                writeLog("  " + err.message, FORCE_LOG);
                // throw err;
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
            writeLog("  " + err.message, FORCE_LOG);
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

        // Move into the folder where the manifest file lives as
        // all paths in the manifest are relative to the file.
        var dir = manifestFile.substring(0, manifestFile.lastIndexOf(path.sep)).trim();

        if (dir != '') {
            process.chdir(dir.replace(path.sep, '/'));
        }

        var error = function(err) {
            writeLog("ERROR: Could not resize file.", FORCE_LOG);
            writeLog("  "  + err.message, FORCE_LOG);
        };

        var success = function(file) {
            // writeLog("'" + file + "'resized.");
            currentIndex++;
            if (currentIndex < processThese.length) {
                process(processThese[currentIndex]);
            }
        };

        var process = function(file) {
            size.resize(
                manifest.sourceDir + path.sep + file,
                manifest.scale,
                manifest.width,
                manifest.height,
                manifest.outputDir + path.sep + file,
                error,
                success
            );
        }

        // If output dir exists, delete it
        if (fileExists(manifest.outputDir)) {
            removeDir(manifest.outputDir);
            // Windows (maybe Mac too?) complains if you remove a file
            // a folder and then recreate it. Sleeping for a second
            // sidesteps the issue.
            sleep.sleep(1);
        }

        // Create fresh version of output dir
        makeDir(manifest.outputDir);

        try {
            var files = fs.readdirSync(manifest.sourceDir);
        } catch (err) {
            writeLog("ERROR: Unable to read dir '" + manifest.sourceDir + "'.", FORCE_LOG);
            writeLog("  " + err.message, FORCE_LOG);
            return;
        }

        var processThese = [];
        var currentIndex = 0;
        files.forEach(function(file, index, arr) {

            var f = manifest.sourceDir + path.sep + file;
            if (fs.statSync(f).isFile() && hasImageExtension(file)) {
                writeLog("Adding file '" + f + "'.");
                processThese.push(file);
            }

        });

        if (processThese.length > 0) {
            process(processThese[currentIndex]);
        }

        // processThese.forEach(function(file, index, arr) {
        //     size.resize(
        //         manifest.sourceDir + path.sep + file,
        //         manifest.scale,
        //         manifest.width,
        //         manifest.height,
        //         manifest.outputDir + path.sep + file,
        //         error,
        //         success);
        // });

    }

    //==================================================================
    //
    // The Script
    //
    //==================================================================

    if (args.verbose === true) {
        size.enableLogging();
        enableLogging();
    }

    if (args.generate) {

        var json = generateManifest(
                        args.source,
                        args.scale,
                        Math.ceil(parseInt(args.width)),
                        Math.ceil(parseInt(args.height)),
                        args.output,
                        args.verbose);

        if (json) {
            writeManifest(json, args.source, args.name);
        }

    } else if (args.manifest.trim() != '') {

        if (!fileExists(args.manifest)) {
            writeLog("ERROR: '" + args.manifest + "' does not exist.", FORCE_LOG);
            return;
        }

        var data = readManifest(args.manifest);
        if (data) {
            batch(data, args.manifest);
        }

    } else {
        // Usage?
    }
};

module.exports.main = main;