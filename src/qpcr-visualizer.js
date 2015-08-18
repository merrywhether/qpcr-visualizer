var QPCRVisualizer = function(opts) {

  var QPCRController = function(opts) {
    this.regex = opts.regex || RegExp(/^r.*?(\d+).*?c.*?(\d+)$/);
    this.cycleRef = opts.cycleRef || 'cycle';
    this.fluorRef = opts.fluorRef || 'fluorescence';
    this.threshold = opts.threshold;  // leave as undefined if not passed in
    this.thresholdColor = opts.thresholdColor || 'black';

    if (opts.chart) this.chart = new QPCRChart(this, opts.chart);
    if (opts.grid) this.grid = new QPCRGrid(this, opts.grid);
    if (opts.details) this.details = new QPCRDetails(this, opts.details);

    if (opts.info) {
      if (this.chart) this.chart.addInfoBox();
      if (this.grid) this.grid.addInfoBox();
    }

    this.cells = [];
    this.rows = [];
    this.cols = [];

    this.loadJSON(opts.dataUri);
  };

  QPCRController.prototype = {
    loadJSON: function(uri) {
      var control = this;
      d3.json(uri, function(err, data) {
        if (err) {
          console.error('Error loading JSON file from ' + uri);
          return err;
        }

        //create individual cell objects with row and col info
        d3.map(data).forEach(function(k, v) {
          var match = control.regex.exec(k);
          control.cells.push({
            id: k,
            row: +match[1],
            col: +match[2],
            data: v,
            focus: true
          });
        });

        //generate statistics about the data set
        control.peakFluor = d3.max(control.cells, function(cell) {
          return d3.max(cell.data, function(cycle) {
            return cycle[control.fluorRef];
          });
        });

        control.cycles = d3.max(control.cells, function(cell) {
          return d3.max(cell.data, function(cycle) {
              return cycle[control.cycleRef];
          });
        });

        control.numRows = d3.max(control.cells, function(cell) {
          return cell.row;
        });
        control.rows = [];
        d3.range(1, control.numRows+1).forEach(function(d) {
          control.rows.push({
            row: d
          });
        });

        control.numCols = d3.max(control.cells, function(cell) {
          return cell.col;
        });
        control.cols = [];
        d3.range(1, control.numCols+1).forEach(function(d) {
          control.cols.push({
            col: d
          });
        });

        control.draw();
      });
    },
    draw: function() {
      if (this.chart) this.chart.draw();
      if (this.grid) this.grid.draw();
      if (this.details) this.details.draw();
    },
    focus: function(target) {
      //change focus between cells, rows, columns, and all
      this.cells.forEach(function(cell) {
        if (!target) cell.focus = true;
        else if (target.row && target.col) cell.focus = (cell.row === target.row && cell.col === target.col);
        else if (target.row) cell.focus = (cell.row === target.row);
        else if (target.col) cell.focus = (cell.col === target.col);
        else cell.focus = true;
      });
      if (this.chart) this.chart.focus();
      if (this.details) this.details.focus(target);
    }
  }

  var QPCRInfoBox = function(opts) {
    this.parent = opts.parent;
    this.info = {
      title: opts.title,
      content: opts.content
    };
    this.toolTip = new QPCRToolTip({
      width: opts.width
    });
  };

  QPCRInfoBox.prototype = {
    //draw little i box for mouseover interaction
    draw: function() {
      var infoBox = this;

      //create box and add toolTip listeners
      var info = d3.select(this.parent.el + ' > svg')
        .datum(infoBox.info)
        .append('g')
        .attr('transform', 'translate(' + [this.parent.width - this.parent.margins.right/2, this.parent.margins.top/2] + ')');

      info.append('circle')
        .attr('r', 10)
        .attr('fill', 'gainsboro ');

      info.append('text')
        .attr('text-anchor', 'middle')
        .attr('fill', 'black')
        .attr('font-size', '16px')
        .attr('font-family', 'serif')
        .attr('font-weight', 'bold')
        .attr('y', 5)
        .text('i');

      info.call(infoBox.toolTip.register.bind(infoBox.toolTip));
    }
  };

  var QPCRToolTip = function(opts) {
    this.width = opts.width;
    this.offset = opts.offset || {x: -30-this.width, y: 0};
    this.backgroundColor = opts.backgroundColor || 'gainsboro';
    this.content = opts.content || function(d) {return d.content};
  };

  QPCRToolTip.prototype = {
    create: function(d) {
      //create tooltip container with relevant styles
      var toolTipContainer = d3.select('body')
        .append('div')
        .datum(d)
        .attr('class', 'tooltip-container')
        .style('width', this.width + 'px')
        .style('position', 'absolute')
        .style('pointer-events', 'none')
        .style('padding', '5px')
        .style('background-color', this.backgroundColor)
        .style('border', 'solid 1px gray')
        .style('border-radius', '5px')
        .style('left', (d3.event.pageX + this.offset.x) + 'px')
        .style('top', (d3.event.pageY + this.offset.y) + 'px');

      //format for title style box
      if (d.title) {
        //add title element
        toolTipContainer.append('p')
          .attr('class', 'tooltip-title')
          .style('font-weight', 'bold')
          .style('text-align', 'center')
          .text(d.title);

        //add title-style content element, using content callback
        toolTipContainer.append('p')
          .attr('class', 'tooltip-content')
          .text(this.content);
      } else {
        //add non-title-style content element, using content callbac
        toolTipContainer.append('p')
          .attr('class', 'tooltip-content')
          .style('margin', '0')
          .text(this.content);
      }
    },
    move: function(d) {
      //move tooltip with mouse movement
      d3.select('div.tooltip-container')
        .style('left', (d3.event.pageX + this.offset.x) + 'px')
        .style('top', (d3.event.pageY + this.offset.y) + 'px');
    },
    remove: function(d) {
      //remove tooltip from dom
      d3.select('div.tooltip-container').remove();
    },
    register: function(selection) {
      //register tooltip listeners on target element
      var toolTip = this;
      selection.each(function(d) {
        d3.select(this)
          .on('mouseover.tooltip', toolTip.create.bind(toolTip))
          .on('mousemove.tooltip', toolTip.move.bind(toolTip))
          .on('mouseout.tooltop', toolTip.remove.bind(toolTip))
      });
    }
  };

  var QPCRChart = function(control, opts) {
    this.control = control;
    this.el = opts.el;
    this.width = opts.width || 700;
    this.height = opts.height || 300;
    this.margins = opts.margins || {top: 50, right: 50, bottom: 50, left: 50};
    this.grouping = opts.grouping || 'row';
    this.labels = opts.labels === undefined ? true : opts.labels;

    //set color map
    switch(opts.colorset) {
      case 'c':
      case '3':
        this.color = d3.scale.category20c();
        break;
      case 'b':
      case '2':
        this.color = d3.scale.category20b();
        break;
      case 'a':
      case '1':
      default:
        this.color = d3.scale.category20();
        break;
    }

    //create scales for x and y axes based on available space
    this.xScale = d3.scale.linear()
      .range([0, this.width - this.margins.right - this.margins.left]);
    this.yScale = d3.scale.linear()
      .range([this.height - this.margins.top - this.margins.bottom, 0]);

    //create base svg object, exposing fluor-chart class
    this.svg = d3.select(this.el)
      .append('svg')
      .attr('class', 'fluor-chart')
      .attr('width', this.width)
      .attr('height', this.height)
      .append('g')
      .attr('transform', 'translate(' + [this.margins.left, this.margins.top] + ')');
  };

  QPCRChart.prototype = {
    //create info box with text
    addInfoBox: function() {
      this.infoBox = new QPCRInfoBox({
        parent: this,
        title: 'Fluoroscence vs Cycle Graph',
        content: 'This chart shows the fluorescence correlated to the cycle count for each of the samples in the qPCR tray.'
          + (this.control.threshold ? ' The threshold value is plotted horizontally for reference, and the line can be hovered on to see the threshold value.' : '')
          + (this.control.grid ? ' Elements that are not currently in focus on the grid will be mostly transparent.' : ''),
        width: 300
      });
    },
    //axis generators
    xAxis: function() { return d3.svg.axis().scale(this.xScale).orient('bottom'); },
    yAxis: function() { return d3.svg.axis().scale(this.yScale).orient('left'); },
    //cell plot line generator
    line: d3.svg.line()
        .interpolate('basis')
        .x(function(d) { return this.xScale(d[this.control.cycleRef]); })
        .y(function(d) { return this.yScale(d[this.control.fluorRef]); }),
    draw: function() {
      var chart = this;
      //tell axes scales data range
      this.xScale.domain([1, this.control.cycles]);
      this.yScale.domain([0, this.control.peakFluor]);

      //create x-axis, exposing x-axis and axis classes
      var xAxis = this.svg.append('g')
        .attr('class', 'x-axis axis')
        .attr('transform', 'translate(' + [0, (this.height - this.margins.top - this.margins.bottom)] + ')')
        .call(this.xAxis());
      xAxis.selectAll('path, line')
        .attr('stroke', 'black')
        .attr('fill', 'none')
        .attr('shape-rendering', 'crispEdges');
      if (this.labels) {
        xAxis.append('text')
          .attr('y', 15)
          .attr('x', 5)
          .style('text-anchor', 'start')
          .text('Cycles');
      }

      //create y-axis, expsoing y-axis and axis classes
      var yAxis = this.svg.append('g')
        .attr('class', 'y-axis axis')
        .call(this.yAxis());
      yAxis.selectAll('path, line')
        .attr('stroke', 'black')
        .attr('fill', 'none')
        .attr('shape-rendering', 'crispEdges');
      if (this.labels) {
        yAxis.append('text')
          .attr('transform', 'rotate(-90)')
          .attr('y', 15)
          .style('text-anchor', 'end')
          .text('Fluorescence');
      }

      //create cell plots, exposing cell-line class
      var cell = this.svg.selectAll('.cell-line')
        .data(this.control.cells)
        .enter()
        .append('g')
        .attr('class', 'cell-line')
        .append('path')
        .attr('class', 'line')
        .attr('d', function(d) { return chart.line(d.data); })
        .style('stroke', chart.getColor.bind(chart))
        .attr('fill', 'none');

      if (this.infoBox) this.infoBox.draw();
      if (this.control.threshold) this.addThreshold();
    },
    getColor: function(d) {
      //get color set based on grouping, mod 20
      switch(this.grouping) {
        case 'col':
        case 'column':
          return this.color(d.col%20);
        case 'none':
        case 'cell':
          var cellNum = ((d.row-1) * this.control.numCols) + d.col;
          return this.color(cellNum%20);
        case 'row':
        default:
          return this.color(d.row%20);
      }
    },
    focus: function() {
      //set opacity of all lines based on whether their corresponding cell is in focus
      this.svg.selectAll('path.line')
        .attr('stroke-opacity', function(d) { return d.focus ? 1 : 0.05; });
    },
    addThreshold: function() {
      var chart = this;
      //create line generator for threshold
      var threshold = d3.svg.line()
        .interpolate('basis')
        .x(function(d) { return chart.xScale(d.x); })
        .y(function(d) { return chart.yScale(d.y); });

      var toolTip = new QPCRToolTip({
        offset: {x: -100, y: -40},
        content: function(d) {
          return 'The fluorescence threshold is set at ' + chart.control.threshold;
        }
      });

      //add threshold line to graph, exposing .threshold-line class
      this.svg.selectAll('.threshold-line')
        .data([[{x: 1, y: chart.control.threshold}, {x: chart.control.cycles, y: chart.control.threshold}]])
        .enter()
        .append('g')
        .attr('class', 'threshold-line')
        .append('path')
        .attr('d', function(d) { return threshold(d); })
        .style('stroke', chart.control.thresholdColor)
        .attr('stroke-width', '3px')
        .attr('fill', 'none')
        .call(toolTip.register.bind(toolTip));
    }
  };

  var QPCRGrid = function(control, opts) {
    //module settings
    this.control = control;
    this.el = opts.el;
    this.width = opts.width || 700;
    this.height = opts.height || 400;
    this.margins = opts.margins || {top: 50, right: 50, bottom: 50, left: 50};
    this.radius = opts.radius;
    this.cellColor = opts.cellColor || 'lightblue';
    this.cellHoverColor = opts.cellHoverColor || 'blue';
    this.groupTextColor = opts.groupTextColor || 'black';
    this.groupTextHoverColor = opts.groupTextHoverColor || 'orange';

    //create base svg object, exposing fluor-grid class
    this.svg = d3.select(this.el)
      .append('svg')
      .attr('class', 'fluor-grid')
      .attr('width', this.width)
      .attr('height', this.height)
      .append('g')
      .attr('transform', 'translate(' + [this.margins.left, this.margins.top] + ')');
  };

  QPCRGrid.prototype = {
    //create info box with text
    addInfoBox: function() {
      this.infoBox = new QPCRInfoBox({
        parent: this,
        title: 'qPCR Tray Grid View',
        content: 'This grid shows all the cells in the qPCR tray, aligned by column and row. Rows, columns, and individual cells can be hovered over for more detail.'
          + (this.control.chart ? ' Hovered cells or groups will be emphasized in the graph.' : '')
          + (this.control.details ? ' Hovered cells will have their exact fluorescence values displayed in the accompanying flourescence data table.' : '')
          + (this.control.details && this.control.threshold ? ' The fluorescence values will be color-coded to indicate whether they are above or below the indicated fluorescence threshold.' : ''),
        width: 350
      });
    },
    draw: function() {
      var grid = this;
      //create appropriate scales for x and y axes based on space and range
      var xScale = d3.scale.ordinal()
        .domain(d3.range(0, this.control.numCols+1))
        .rangePoints([0, this.width - this.margins.left - this.margins.right], 1);
      var yScale = d3.scale.ordinal()
        .domain(d3.range(0, this.control.numRows+1))
        .rangePoints([0, this.height - this.margins.top - this.margins.bottom], 1);

      var toolTip = new QPCRToolTip({
        offset: {x: -35, y: -40},
        content: function(d) {
          if (d.row && d.col) return 'row ' + d.row + ', col ' + d.col;
          else if (d.row) return 'row ' + d.row + ' group';
          else if (d.col) return 'col ' + d.col + ' group';
          else return 'cell info';
        }
      });

      //determine radius
      var radius = this.radius || this.calcRadius();
      //create circles for all wells, with mouseover events triggering focus changes
      this.svg.selectAll('g.cell-item')
        .data(this.control.cells)
        .enter()
        .append('g')
        .attr('class', function(d) { return 'cell-item r' + d.row + ' c' + d.col; })
        .attr('transform', function(d) {
          return 'translate(' + [xScale(d.col), yScale(d.row)] + ')';
        })
        .append('circle')
        .attr('r', radius)
        .attr('fill', grid.cellColor)
        .on('mouseover', function(d) {
          d3.select(this)
            .attr('fill', grid.cellHoverColor);
          grid.control.focus(d);
        })
        .on('mouseout', function(d) {
          d3.select(this)
            .attr('fill', grid.cellColor);
          grid.control.focus();
        })
        .call(toolTip.register.bind(toolTip));

      //create headers for all rows, with mouseover events triggering focus changes
      this.svg.selectAll('g.row-header')
        .data(this.control.rows)
        .enter()
        .append('g')
        .attr('class', 'row-header')
        .attr('transform', function(d) { return 'translate(' + [0, yScale(d.row)] + ')'; })
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('fill', grid.groupTextColor)
        .text(function(d) { return 'r' + d.row; })
        .on('mouseover', function(d) {
          grid.svg.selectAll('g.cell-item.r' + d.row + ' circle')
            .attr('fill', grid.cellHoverColor);
          d3.select(this)
            .attr('fill', grid.groupTextHoverColor);
          grid.control.focus(d);
        })
        .on('mouseout', function(d) {
          grid.svg.selectAll('g.cell-item.r' + d.row + ' circle')
            .attr('fill', grid.cellColor);
          d3.select(this)
            .attr('fill', grid.groupTextColor);
          grid.control.focus();
        })
        .call(toolTip.register.bind(toolTip));

      //create headers for all columns, with mouseover events triggering focus changes
      this.svg.selectAll('g.col-header')
        .data(this.control.cols)
        .enter()
        .append('g')
        .attr('class', 'col-header')
        .attr('transform', function(d) { return 'translate(' + [xScale(d.col), 0] + ')'; })
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('fill', grid.groupTextColor)
        .attr('transform', 'rotate(-90)')
        .text(function(d) { return 'c' + d.col; })
        .on('mouseover', function(d) {
          grid.svg.selectAll('g.cell-item.c' + d.col + ' circle')
            .attr('fill', grid.cellHoverColor);
          d3.select(this)
            .attr('fill', grid.groupTextHoverColor);
          grid.control.focus(d);
        })
        .on('mouseout', function(d) {
          var colItems = grid.svg.selectAll('g.cell-item.c' + d.col + ' circle')
            .attr('fill', grid.cellColor);
          d3.select(this)
            .attr('fill', grid.groupTextColor);
          grid.control.focus();
        })
        .call(toolTip.register.bind(toolTip));

      if (this.infoBox) this.infoBox.draw();
    },
    calcRadius: function() {
      //if radius not set, calculate the largest radius that will fit data and space with padding
      var rY = Math.floor((this.height - this.margins.top - this.margins.bottom) / this.control.numRows * 0.4);
      var rX = Math.floor((this.width - this.margins.right - this.margins.left) / this.control.numCols * 0.4);
      return d3.min([rY, rX]);
    }
  };

  var QPCRDetails = function(control, opts) {
    //sub-module settings
    this.control = control;
    this.el = opts.el;

    //create base svg object, exposing fluor-chart class
    this.table = d3.select(this.el)
      .append('table')
      .attr('class', 'fluor-table');
  };

  QPCRDetails.prototype = {
    draw: function() {
      //create thead with th for cycle and td for all cycle numbers
      var tableHead = this.table.append('thead')
        .append('tr');
      tableHead.append('th')
        .append('span')
        .attr('class', 'fluor-detail')
        .text('Cycle');
      tableHead.selectAll('td')
        .data(d3.range(1, this.control.cycles+1))
        .enter()
        .append('td')
        .append('span')
        .attr('class', 'fluor-detail')
        .text(function(d) { return d; });

      //create tbody with th for fluorescence and empty tds, saving for future reference
      this.tableBody = this.table.append('tbody').append('tr');
      this.tableBody.append('th')
        .append('span')
        .attr('class', 'fluor-detail')
        .text('Fluor');
      this.tableBody.selectAll('td')
        .data(d3.range(1, this.control.cycles+1))
        .enter()
        .append('td')
        .append('span')
        .attr('class', 'fluor-detail')
        .text('');
    },
    focus: function(cell) {
      //if target is a single cell
      if (cell && cell.row && cell.col) {
        var details = this;
        //reset tds as they are bound to different data and confuse d3
        this.tableBody.selectAll('td').remove();

        //add fluorescence readings to table with appropriate threshold class if needed
        this.tableBody.selectAll('td')
          .data(cell.data)
          .enter()
          .append('td')
          .append('span')
          .attr('class', details.addClassWithThreshold.bind(details))
          .text(function(d) { return d[details.control.fluorRef]; });
      } else {
        //target is not a single cell, so clear threshold classes and text
        this.tableBody.selectAll('td span.fluor-detail')
          .attr('class', 'fluor-detail')
          .text('');
      }
    },
    addClassWithThreshold: function(d) {
      //if threshold set, add above- or below-threshold to fluor-detail class
      if (this.control.threshold) {
        var threshold = d[this.control.fluorRef] >= this.control.threshold ? 'above' : 'below';
        return 'fluor-detail ' + threshold + '-threshold';
      } else {
        return 'fluor-detail';
      }
    }
  };

  return new QPCRController(opts);
};
