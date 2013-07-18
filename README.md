# sizemic

A utility for quickly and easily scripting image resizing. Sizemic can be required in Node programs, invoked from the command line and used to batch process a folder of images.

## Installation

    $ npm install -g https://github.com/NoobsArePeople2/node-sizemic

## Command Line Usage

__Resize by Scaling__

    $ sizemic --input your_img.png --scale 0.5

This will scale `your_img.png` by 50% and write a file called `your_img_sizemic.png` to the same folder as `your_img.png`.

__Specifying an Output File Name__

If you want to give your resized image a specific name just specify it:

    $ sizemic --input your_img.png --scale 0.5 --output your_resized_img.png

__Resize by Width__

    $ sizemic --input your_img.png --width 100

The above will resize your image to a width of 100px. Height will be resized proportionally.

__Resize by Height__

    $ sizemic --input your_img.png --height 100

The above will resize your image to a height of 100px. Width will be resized proportionally.

## Batching

Batching allows you to resize a folder of images with a two `sizemic-batch` commands. One-command version coming at some future date!

The first `sizemic-batch` command generates a manifest file called `sizemic-manifest.json`. This folder describes which files you want to resize, how you want to resize them and where you want to save the resized files. Invoke it by:

    $ sizemic-batch --generate --source yourfiles --scale 0.5

Where `yourfiles` is a folder in your current working directory. This will write a manifest file in your current working directory. Run sizemic using the manifest by typing:

    $ sizemic-batch

This will run `sizemic` on all the images in the `yourfiles` folder applying the scale setting from above. All the resized files will be saved in a folder called `sizemic` with the same names as their source files in `yourfiles` (e.g., `yourfiles/img.png` corresponds with `sizemic/img.png`).

`sizemic-batch` accepts all the same parameters as `sizemic` so you can specify `scale`, `width` and `height` scaling options as well as the output name. In the case of `sizemic-batch` the output name will be the name of a folder rather than a file.

## License

Framed is licensed under the MIT license.