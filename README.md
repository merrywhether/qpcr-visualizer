# qPCR Visualizer

This library uses D3.js to create a fluorescence vs cycles graph for a full qPCR tray dataset, loading JSON data from a remote endpoint. It consists of three optional modules (chart, grid, and details views) that interact with each other to allow for quickly finding trends in your qPCR results. There are a lot of configuration options so that it can customized to best fit different use-cases.

---

[Info page with live demos](http://merrywhether.github.io/qpcr-visualizer/)

---

## Usage

### Initialization
This library is both initialized and configured in a single line and it's only dependency is D3.

    var qpcr = QPCRVisualizer({
        dataUri: //location of JSON
        //global config args
        chart: {
          //chart config args
        },
        grid: {
          //grid config args
        },
        details: {
          //details config args
        }
    });

### Data format
The library expects to be able to load JSON from a remote location. This JSON should be an object containing keys that correspond to cell identifiers and whose values are lists of data points.

The cell identifiers should indicate row and column numbers and will be parsed for their corresponding numeric values. The default regex will look for an r followed by a number then c followed by a number, and will ignoring any intervening "noise". For example, `r1c1`, `row1col1`, and `row1||column1` are all acceptable input formats for the default settings.

The list of data points should include objects with cycle and fluorescence data. By default, these should be `cycle` and `fluorescence`, but these names can be changed in the configuration.

An example data format:

    {
      'r1c1': [
        {
          'cycle': 1,
          'fluorescence': 0
        }, {
          'cycle': 2,
          'fluorescence': 100
        },
        ...
      ],
      'r1c2': [
        ...
      ],
      ...
    }

## Configuration

### Global Configuration
Global configuration arguments are put in the top level of the configuration object.

Mandatory:
+ `dataUri` - the location of the dataset for visualization

Optional:
+ `regex` - a `RegExp` object for parsing the keys/cell names of the input JSON; defaults to `RegExp(/^r.*?(\d+).*?c.*?(\d+)$/)`.
+ `cycleRef` - the key name for cycle data; defaults to 'cycle'
+ `fluorRef` - the key name for fluorescence data; defaults to 'fluorescence'
+ `threshold` - a number upon which to base a threshold fluorescence level, which will be signified in the chart and will be used to partition the details table; no default, and no value means threshold functionality is deactivated
+ `thresholdColor` - the color for the threshold line on the chart; defaults to black
+ `info` - boolean for toggling info box functionality in the chart and grid modules; defaults to false (inactive)

### Chart Configuration
To include a chart, simply add the chart key and configuration object to the payload.

Mandatory:
+ `el` - the selector for the container element for the chart (e.g. `#chart`)

Optional:
+ `width` - the width in pixels for the generated chart; defaults to 700
+ `height` - the height in pixels for the generated chart; defaults to 300
+ `margins` - an object defining all 4 margins in pixels; defaults to `{top: 50, right: 50, bottom: 50, left: 50}`
+ `colorset` - choice of three different colorsets of 20 colors each from 'a', 'b', and 'c' (corresponds to [D3's category20 color schemes](https://github.com/mbostock/d3/wiki/Ordinal-Scales#category20)); defaults to 'a'
+ `grouping` - choice of grouping pattern for the colorization from 'row', 'col', and 'none' (for easily identifying relevant groupings); defaults to 'row'
+ `labels` - boolean for toggling axis labels; defaults to true

The chart exposes the fluor-chart class on its top-level svg element.

### Grid Configuration
To include a grid, simply add the grid key and configuration object to the payload.

Mandatory:
+ `el` - the selector for the container element for the chart (e.g. `#grid`)

Optional:
+ `width` - the width in pixels for the generated chart; defaults to 700
+ `height` - the height in pixels for the generated chart; defaults to 400
+ `margins` - an object defining all 4 margins in pixels; defaults to `{top: 50, right: 50, bottom: 50, left: 50}`
+ `radius` - the raduis in pixels of the circles representing the cells; no default, but if omitted the module will calculate an "optimal" radius to ensure padding given width, height, margins, and dataset
+ `cellColor` - the color of cells in the grid; defaults to lightblue
+ `cellHoverColor` - the color of cells when hovered or otherwise in focus; defaults to blue
+ `groupTextColor` - the color of the row and column header labels; defaults to black
+ `groupTextHoverColor` - the color of the row and column header labels when hovered or otherwise in focus; defaults to orange

The grid exposes the `fluor-grid` class on its top-level svg element.

### Detail Table Configuration
To include a detail table, simply add the detail key and configuration object to the payload. There is very little configuration done for the detail table via the constructor because the resulting output is all html. Therefore, you are able to change the appearance of the table via normal css.

Mandatory:
+ `el` - the selector for the container element for the chart (e.g. `#details`)

The detail table exposes the `fluor-table` class on its top-level table element, as well as the `fluor-detail` class on its text-containing span elements and `above-threshold` and `below-threshold` on the spans if a threshold is set. There is an [example styling implementation](https://github.com/merrywhether/qpcr-visualizer/blob/master/src/qpcr-table.css) in the `src` folder.
