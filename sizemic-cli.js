//==================================================================
//
// sizemic-cli: command line interface to sizemic.
//
//==================================================================

//==================================================================
//
// Requires
//
//==================================================================

var optimist = require('optimist');
var size     = require('./sizemic')

//==================================================================
//
// Vars
//
//==================================================================

var desc = {
    input:     'Image to process. Use relative paths.',
    scale:     'Amount to scale the image e.g., 0.5.',
    width:     'Resize width to this (in pixels).',
    height:    'Resize height to this (in pixels).',
    constrain: 'Constrain proportions when resizing.',
    output:    'File to save the resized image as. Use relative paths.'
};

var argv = optimist
           .demand(['input'])
           .alias('input', 'i')
           .default('scale', 1.0)
           .alias('scale', 's')
           .default('width', 0)
           .alias('width', 'w')
           .default('height', 0)
           .alias('height', 'h')
           .default('output', '.')
           .alias('output', 'o')
           .describe(desc)
           .argv;

var input     = argv.input;
var scale     = argv.scale;
var width     = argv.width;
var height    = argv.height;
var output    = argv.output;

//==================================================================
//
// Functions
//
//==================================================================

size.resize(input, scale, width, height, output);