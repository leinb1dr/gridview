
/*global $*/
/*global jQuery*/

/*

	_X_ - Ordering
	_X_ - Header Text
	_X_ - Width
	_X_ - Content Formating
		_X_ - Currency
		_X_ - Decimal Number
		_X_ - Date
		_X_ - Time
		_X_ - Date/Time
	_X_ - Customization
		_x_ - Rows (XOdd XEven XIndividual)
		_X_ - Cols (XOdd XEven XIndividual)
		_x_ - Header
	_X_ - Sort on Click
	___ - Advanced Sort
		___ - allow to sort by multiple rows
	___ - Render Existing Data
	_X_ - Render Data from Inputs
		_X_ - JSON
		_X_ - HTML
		_X_ - XML
		_X_ - Delimited

	------- EXTRAS -------
	___ - pagination
		_X_ - cycle through pages
		_X_ - set viewable rows
		___ - move to last
		___ - move to first
		___ - move to specific page
		_X_ - allow changing of viewable rows
		___ - search for value
	_X_ - In line editing
		_X_ - Set the right form field based on  format
		_X_ - update the model

 */

 // Time Spinner For Time Fields
(function ($) {

	"use strict";
	/*global Globalize*/

	$.widget("ui.timespinner", $.ui.spinner, {
		options: {
			// seconds
			step: 60 * 1000,
			// hours
			page: 60
		},

		_parse: function (value) {
			if (typeof value === "string") {
			// already a timestamp
				if (Number(value) === value) {
					return Number(value);
				}
				return +Globalize.parseDate(value);
			}
			return value;
		},

		_format: function (value) {
			return Globalize.format(new Date(value), "t");
		}
	});

}(jQuery));

(function ($) {
	"use strict";
	/*global document*/
	/*global console*/
	/*global window*/

	// Use $.widget to define our setTrans() widget plugin
	$.widget("ui.gridView", {

		// Set Defaults for all options
		options : {
			columnModel: null,					// Column Model must be supplied by value or ajax
			addClass : {						// Classes for easy customization
				header: "ui-gridView-header",
				oddRow: "ui-gridView-odd",
				evenRow: "ui-gridView-even",
				oddCol: null,
				evenCol: null
			},
			tableData : null,					// Table data, must be supplied by value or ajax
			//columnSort : null,				// Used to order column sorts ** Future Sprint **
			visibleRows : 'all',				// How many rows to be seen by default
			//change : null,					// Event for changing of the table data ** Future Sprint **
			loadJSON : null,					// Ajax request that loads JSON
			loadHTML : null,					// Ajax request that loads HTML
			loadXML : null,						// Ajax request that loads XML
			loadText: null,						// Ajax request that loads comma delimmited files
			selectable: false					// Whether the selectable column will be visible
		},

		_pagination : {on: false, pages: 0, currentPage: 0},	// Private structure for holding pagination data

		_table : null,											// Private structure that holds a copy of the grid

		// _create is called once per element
		// variables starting with underscore are private within the widget framework
		_create : function () {
			// this = the widget instance
			// this.element = jQuery object containing the DOM Element

			// Reference to the current widget instance.
			// Used in all setup
			var $widgetInstance = this;

			if ($widgetInstance.options.loadJSON !== null) {		// LOAD JSON

				$.ajax($widgetInstance.options.loadJSON, {

					type: 'GET',
					dataType: 'xml',

					complete: function (jqXHR, status) {
						// 200 is a successful response
						if (jqXHR.status === 200) {
							var obj = JSON.parse(jqXHR.responseText);
							$.extend($widgetInstance.options, obj);

							$widgetInstance._createTable($widgetInstance);
						}
					}
				});

			} else if ($widgetInstance.options.loadHTML !== null) {	// LOAD HTML

				$.get($widgetInstance.options.loadHTML, {}, function (response, status, jqXHR) {

					$.extend($widgetInstance.options, (function (response) {

						var $htmlObj = $(response),					// Wrap html response in a jQuery object
							$header = $htmlObj.find("thead tr"),	// Pull out the header row from the response
							$body = $htmlObj.find("tbody tr"),		// Pull out the body from the response
							columnModel = [],						// Prep the column model
							tableData = [];							// Prep the table data

						// Covert header to JSON
						$header.find("th").each(function (colIndex, element) {
							columnModel[colIndex] = {};
							columnModel[colIndex].text = $(this).text();
						});

						// Convert body to JSON
						$body.each(function (rowIndex, element) {
							tableData[rowIndex] = [];
							$(element).find("td").each(function (columnIndex, element) {
								tableData[rowIndex][columnIndex] = $(this).text();
							});
						});

						return {columnModel: columnModel, tableData: tableData};

					}(response)));

					$widgetInstance._createTable($widgetInstance);
				}, "html");

			} else if ($widgetInstance.options.loadXML !== null) {	// LOAD XML
				$.ajax($widgetInstance.options.loadXML, {

					type: 'GET',
					dataType: 'xml',

					complete: function (jqXHR, status) {

						if (jqXHR.status === 200) {

							var myOptions = {};

							$.extend($widgetInstance.options, (function (response) {
								var $xmlObj = $(response),						// Wrap XML response in jQuery object
									$header = $xmlObj.find("columnModels"),		// Pull out column models
									$body = $xmlObj.find("tableData"),			// Pull out table data
									columnModel = [],							// Prep column model
									tableData = [];								// Prep table data

								// Convert XML column model to JSON
								$header.find("columnModel").each(function (colIndex, element) {

									columnModel[colIndex] = {};

									$(element).children().each(function (propertyIndex, element) {

										columnModel[colIndex][element.tagName.toLowerCase()] = $(element).text().trim();

									});

								});

								// Convert XML table body to JSON
								$body.find("rowData").each(function (rowIndex, element) {

									tableData[rowIndex] = [];

									$(element).find("data").each(function (colIndex, element) {

										tableData[rowIndex][colIndex] = $(element).text().trim();

									});

								});

								return {columnModel : columnModel, tableData: tableData};
							}(jqXHR.responseText)));

							$widgetInstance._createTable($widgetInstance);
						}
					}
				});

			} else if ($widgetInstance.options.loadText) {			// Load Text

				$.ajax($widgetInstance.options.loadText, {

					type: 'GET',
					dataType: 'text',

					complete: function (jqXHR, status) {

						if (jqXHR.status === 200) {

							var myOptions = {};

							$.extend($widgetInstance.options, (function (response) {

								var rows = response.split("\n"),				// The response of the text
									headerText = rows[0],						// Split off the first row of the response for the header
									header = [],								// Prep list of header for iterating
									bodyText = rows.slice(1, rows.length),		// Split off the rest of the response for the body
									columnModel = [],							// Prep the column model
									tableData = [],								// Prep the table data
									i = null,									// Iterator variable
									j = null,									// Iterator variable
									row = null;									// Define row variable for iterating throught the
																				//	body of the response

								headerText = headerText.replace(/\s+/g, '').replace(/^\"|\"$/g, "");
								header = headerText.split(/(?:[\"\']),(?:[\"\'])/g);

								for (i in header ) {
									if (typeof header[i] !== "undefined" && header[i] !== null) {
										columnModel[i] = {text : header[i]};
									}

								}

								for (i in bodyText) {
									if (typeof bodyText[i] !== "undefined" && bodyText[i] !== null) {
										tableData[i] = [];
										row = bodyText[i].replace(/\s+/g, '').replace(/^\"|\"$/g, "").split(/(?:[\"\']),(?:[\"\'])/g);

										for (j in row) {
											if (typeof row[j] !== "undefined" && row[j] !== null) {
												tableData[i][j] = row[j];
											}

										}
									}

								}

								return {columnModel : columnModel, tableData: tableData};
							}(jqXHR.responseText)));

							$widgetInstance._createTable($widgetInstance);
						}
					}
				});
			} else {												// LOAD NORMAL

				$widgetInstance._createTable($widgetInstance);
			}

		},

		// Similar to _create is init which is called ONCE
		_init : $.noop,

		//destory method tears down the widget when calling
		// $("selector").setTrans("destroy");
		destroy : function () {

			// use the widget framework's base destroy method
			// to eliminate the supporting JS object
			$.Widget.prototype.destroy.call(this);

		},

		// set the value of the option
		// $("selector").setTrans("option", "optionName", "optionValue");
		_setOption : function (optionName, optionValue) {

			var update = true;

			// change dom elements accordingly
			switch (optionName) {

			case " ":

				break;

			}

			// update the supporting JS object using the base
			$.Widget.prototype._setOption.apply(this, arguments);

		},

		_createTable : function ($widgetInstance) {

			// The table stub is created here
			$widgetInstance._table = $("<div class='ui-gridView-container' style='display:inline-block;' id='gridView'>" +
				"<table class='ui-gridView-table'><thead></thead><tbody></tbody></table></div>");

			$widgetInstance._table.on("change", "input[type=checkbox]", function () {$(this).parent().parent().toggleClass("ui-selected"); });

			// DELETE: Key event for deleteing rows
			$(document).on("keydown", function (evt) {

				// 46 is the delete key
				if (evt.which === 46) {

					var toRemove = [],	// Array of indexes to remove
						index = -1;		// Indexes to be added

					$widgetInstance._table.find(".ui-selected").each(function () {

						toRemove.push($(this).attr("class").match(/row[0-9]+/)[0].replace("row", "") - 1);

					});

					while (toRemove.length > 0) {

						index = toRemove.pop();

						if (index >= 0) {
							$widgetInstance.options.tableData.splice(index, 1);
						}

					}
					
					$widgetInstance._pagination.pages = Math.ceil($widgetInstance.options.tableData.length / $widgetInstance.options.visibleRows);
					$widgetInstance._pagination.currentPage = $widgetInstance._pagination.currentPage < $widgetInstance._pagination.pages
						? $widgetInstance._pagination.currentPage
						: $widgetInstance._pagination.pages - 1;

					$widgetInstance._table.find("#currentPage").text($widgetInstance._pagination.currentPage + 1);

					$widgetInstance._table.find("#pages").text($widgetInstance._pagination.pages);

					$widgetInstance._buildBody($widgetInstance);

				}

			});

			// PAGINATION: Visible rows being a number means that pagination is active
			if (typeof $widgetInstance.options.visibleRows === "number") {
				$widgetInstance._pagination.on = true;
				$widgetInstance._pagination.pages = Math.ceil($widgetInstance.options.tableData.length / $widgetInstance.options.visibleRows);

				// Add the navigation bar to the bottom
				$widgetInstance._table.append("<div class='ui-gridView-navigation'>" +
					"<span id='prev' class='ui-icon ui-icon-seek-prev'></span>" +
					"<span id='currentPage'>1</span>&nbsp-&nbsp<span id='pages'>" + ($widgetInstance._pagination.pages) + "</span>" +
					"<span id='next' class='ui-icon ui-icon-seek-next'></span>" +
					"</div>")
					// List of options as a prototype for future revisions
					.prepend("Visible Rows: <select id='visiblePages'><option value = '5'>5</option>" +
						"<option value = '10'>10</option><option value = '15'>15</option>" +
						"<option value = '50'>50</option></select>");

				// Change the visible rows
				$widgetInstance._table.find("#visiblePages").change(function () {

					$widgetInstance.options.visibleRows = parseInt($(this).val(), 10);
					$widgetInstance._pagination.pages = Math.ceil($widgetInstance.options.tableData.length / $widgetInstance.options.visibleRows);
					$widgetInstance._pagination.currentPage = $widgetInstance._pagination.currentPage < $widgetInstance._pagination.pages
						? $widgetInstance._pagination.currentPage
						: $widgetInstance._pagination.pages - 1;

					$widgetInstance._table.find("#currentPage").text($widgetInstance._pagination.currentPage + 1);

					$widgetInstance._table.find("#pages").text($widgetInstance._pagination.pages);
					$widgetInstance._buildBody($widgetInstance);

				});

				// PREVIOUS: previous paging
				$widgetInstance._table.find("#prev").click(function () {
					$widgetInstance._pagination.currentPage = $widgetInstance._pagination.currentPage - 1 >= 0
						? $widgetInstance._pagination.currentPage - 1
						: 0;
					$widgetInstance._table.find("#currentPage").text($widgetInstance._pagination.currentPage + 1);
					$widgetInstance._buildBody($widgetInstance);
				});

				// NEXT: next paging
				$widgetInstance._table.find("#next").click(function () {
					$widgetInstance._pagination.currentPage = $widgetInstance._pagination.currentPage + 2 < $widgetInstance._pagination.pages
						? $widgetInstance._pagination.currentPage + 1
						: $widgetInstance._pagination.pages - 1;
					$widgetInstance._table.find("#currentPage").text($widgetInstance._pagination.currentPage + 1);
					$widgetInstance._buildBody($widgetInstance);
				});
			}
			
			// ADD ROW Removed
			/*
			$widgetInstance._table.append(//"<div><div id='addCol' class=\"ui-icon ui-icon-arrowstop-1-e\">Previous</div>" +
				"<div id='addRow' class=\"ui-icon ui-icon-arrowstop-1-s\">Next</div></div>"
			);
			*/

			// INLINE: double clicking a cell converts it to a form field
			if (typeof $widgetInstance.options.editable === 'undefined' || $widgetInstance.options.editable === true) {
				$widgetInstance._table.find("table").on("dblclick", "td div,td input.inline", function (evt) {
					
					$widgetInstance._inlineEdit(evt, $widgetInstance);
					
				});
			}
			
			$widgetInstance._table.find("table").on("keypress", "td input.inline", function (evt) {
				if (evt.which === 13) {
					$widgetInstance._inlineEdit(evt, $widgetInstance);
				}
			});

			$widgetInstance._buildHeader($widgetInstance);

			// The table body is created from the table data
			$widgetInstance._buildBody($widgetInstance);

			$widgetInstance._stripe($widgetInstance);

			$widgetInstance._table.find("td,th").resizable({
				handles: "e, s",
				resize : $widgetInstance._resize
			});

			// Show the table with a fade in
			$widgetInstance.element.html($widgetInstance._table).hide().fadeIn('slow');

			// SORT1: Add click listeners to the table for sorting
			$widgetInstance._table.find("th").on("click", "span", {}, function (evt) {

				var callClick = function () {
					$widgetInstance._singleClick(evt, $widgetInstance);
				};
				// If 2 clicks are close enough clear the sort and clear the sort request
				if ($widgetInstance._time) {

					if (new Date().getTime() - $widgetInstance._time <= 200) {
						window.clearTimeout(callClick);
						$($widgetInstance._table).find(".ui-icon-arrow")
							.replaceWith("<span style='float:right' class=\"ui-icon-arrow ui-state-highlight ui-icon ui-icon-triangle-2-n-s \">Next</span>");
						$widgetInstance._time = new Date().getTime();
						return;
					}
				}

				$widgetInstance._time = new Date().getTime();

				window.setTimeout(callClick, 250);

			});

			// ADDROW: Add click listener to the add row button
			this.element.find("#addRow").click(function () {
				var rows = $widgetInstance.options.tableData,		// Instance of table data
					cols = $widgetInstance.options.columnModel,		// Instance of column model
					newRow = $("<tr class='newRow'>"),				// New row to be built
					i = 0,											// Iterator variable
					newRowData = [];								// New data to add to the table data

				newRow.append("<td class='ui-gridView-td selector'><input type='checkbox'></input></td>");

				for (i = 0; i < cols.length; i += 1) {

					newRow.append("<td class='newRow ui-gridView-td row" + (rows.length + 1) + " col" + i + "'><div class='newRow' style='overflow:hidden;'>&nbsp</div></td>");
					newRowData[newRowData.length] = " ";

				}

				rows[rows.length] = newRowData;

				// Make new Cells resizable
				$(newRow).find("td").resizable({
					handles: "e, s",
					resize : this._resize
				});

				$widgetInstance.options.tableData = rows;

				$widgetInstance._table.find("tbody").append(newRow)
					.find("tr,td,div")
					.filter(".newRow:not(:animated)")
					.hide().slideDown(250,
						function () {
							$(this).removeClass("newRow");
						});

				$widgetInstance._stripe($widgetInstance);
			});

			// Add a click listener to the add column button
			/*
			this.element.find("#addCol").click(function (evt) {
			//$widgetInstance._pagination.currentPage++;
			//$widgetInstance._buildBody($widgetInstance);

				var rows = $widgetInstance.options.tableData,
					col = $widgetInstance.options.columnModel,

				// Make new Cells resizable
				newHeadCell = $("<th class='newRow ui-gridView-th row" + 0 + " col" + col.length + "'><span class='newRow'>&nbsp</span></th>").resizable({
					handles: "e, s",
					resize : function (evt, ui) {

						if ( ui.originalSize.height != ui.size.height ) {
							$("." + $(ui.helper).attr("class").match(/row[0-9]+/)).css("height", ui.size.height);
						}

						if ( ui.originalSize.width != ui.size.width ) {
							$("." + $(ui.helper).attr("class").match(/col[0-9]+/)).css("width", ui.size.width);
						}

					}
				});

				if ($widgetInstance.options.addClass.header) {
					newHeadCell.addClass($widgetInstance.options.addClass.header);
				}

				$widgetInstance._table.find("thead > tr").append(newHeadCell);

				// Make new Cells resizable
				for ( var count = 0; count < rows.length; count += 1) {
					$("<td class='newRow ui-gridView-td row" + (count + 1) + " col" + col.length + "'><div class='newRow'>&nbsp</div></td>").resizable({
							handles: "e, s",
							resize : function (evt, ui) {

							if ( ui.originalSize.height != ui.size.height ) {
								$("." + $(ui.helper).attr("class").match(/row[0-9]+/)).css("height", ui.size.height);
							}

							if ( ui.originalSize.width != ui.size.width ) {
								$("." + $(ui.helper).attr("class").match(/col[0-9]+/)).css("width", ui.size.width);
							}

						}
						}).appendTo($widgetInstance._table.find("tbody > tr:nth-child(" + (count + 1) + ")"));
					rows[count][col.length] = "";
				}

				col[col.length] = {text:""};

				$widgetInstance._table.find(".newRow").filter(".newRow:not(:animated)").hide().show(250, function () { $(this).removeClass("newRow"); });

				$widgetInstance.options.tableData = rows;
				$widgetInstance.options.columnModel = col;

			});
			*/

		},

		_inlineEdit : function (evt, $widgetInstance) {

			var row = parseInt($(evt.target).parent().attr("class").match(/row[0-9]+/)[0].replace("row", ""), 10) - 1,
				col = parseInt($(evt.target).parent().attr("class").match(/col[0-9]+/)[0].replace("col", ""), 10),
				format = $widgetInstance.options.columnModel[col].format,
				text = "",				// The text from the tableData or the input field depeding on user clicks
				formatParam = "";		// The parameters of the format type

			console.log(row + " : " + col + " = " + $widgetInstance.options.tableData[row][col]);

			// Toggle input field and display div
			if (evt.target.tagName === "INPUT") {
				text = $widgetInstance._formatText($widgetInstance.options.columnModel[col].format, $(evt.target).val());
				if (typeof format !== 'undefined' && format.match(/date/)) {
					formatParam = format.replace(/date\(|\)/, "");

					if (formatParam.match(/[hHmtT]/)) {

						$(evt.target).timespinner("destroy");

					} else if (formatParam.match(/[dMy]/)) {

						$(evt.target).datepicker("hide");	// Ensure datepicker window is closed
						$(evt.target).datepicker("destroy");

					}
				}
				$(evt.target).replaceWith($("<div>").text(text));
				$widgetInstance.options.tableData[row][col] = $(evt.target).val().replace(/^\s|\s$/g, "");
			} else {

				if (typeof format !== 'undefined' && format.match(/date/)) {
					formatParam = format.replace(/date\(|\)/, "");

					if (formatParam.match(/[hHmtT]/)) {

						text = $widgetInstance._formatText(format, $widgetInstance.options.tableData[row][col]);
						$(evt.target).replaceWith($("<input class='inline' value='" + text + "'/>").timespinner());

					} else if (formatParam.match(/[dMy]/)) {
						text = $widgetInstance._formatText(format, $widgetInstance.options.tableData[row][col]);
						format = format.replace(/date\(|\)/g, "");
						$(evt.target).replaceWith($("<input class='inline' value='" + text + "'/>").datepicker({dateFormat: "mm/dd/yy"}));

					}
				} else {
					text = parseFloat($widgetInstance.options.tableData[row][col], 10) || $widgetInstance.options.tableData[row][col];
					$(evt.target).replaceWith($("<input class='inline' value='" + text + "'/>"));

				}

			}
		},

		// SORT2: function that performs sort
		_singleClick : function (evt, $widgetInstance) {

			try {

				var column = parseInt($(evt.target).parent().attr("class").match(/col[0-9]+/)[0].replace("col", ""), 10),
					direction = "",	// Direction of the sorting
					count = 0;		// Iterator variable

				if ($widgetInstance.options.columnModel[column].sort === false) {return; }

				direction = $widgetInstance.options.columnModel[column].direction;

				direction = !(direction) || direction === "desc" ? "asc" : "desc";

				$widgetInstance.options.columnModel[column].direction = direction;

				for (count = 0; count < $widgetInstance.options.columnModel.length; count += 1) {
					if (count !== column) {
						$widgetInstance.options.columnModel[count].direction = null;
					}

				}

				$widgetInstance.options.tableData.sort(function (a, b) {
					//  Convert variables to a comparable format and return 1, -1, or 0
					var valA = null, valB = null;

					if ($widgetInstance.options.columnModel[column].format && $widgetInstance.options.columnModel[column].format.match(/date/)) {
						valA = Date.parse(a[column]);
						valB = Date.parse(b[column]);
					} else {
						valA = parseFloat(a[column]) || a[column];
						valB = parseFloat(b[column]) || b[column];
					}

					if (typeof valA !== typeof valB) {
						return 0;
					}
					
					console.log(typeof valA !== typeof valB);

					if (direction === "asc") {
						if (valB < valA) {
							return -1;
						}
						if (valB > valA) {
							return 1;
						}
						return 0;
					}

					if (direction === "desc") {
						if (valB > valA) {
							return -1;
						}

						if (valB < valA) {
							return 1;
						}
						return 0;
					}
				});

				$($widgetInstance._table).find(".ui-icon-arrow").replaceWith("<span style='float:right' class=\"ui-icon-arrow ui-state-highlight ui-icon ui-icon-triangle-2-n-s \">Next</span>");
				if (direction === "asc") {
					$($widgetInstance._table).find("th:nth-child(" + (column + 2) + ")").find(".ui-icon-arrow").replaceWith("<span style='float:right' class=\"ui-icon-arrow ui-state-highlight ui-icon ui-icon-triangle-1-n \">Next</span>");
				} else {
					$($widgetInstance._table).find("th:nth-child(" + (column + 2) + ")").find(".ui-icon-arrow").replaceWith("<span style='float:right' class=\"ui-icon-arrow ui-state-highlight ui-icon ui-icon-triangle-1-s\">Next</span>");
				}

				$widgetInstance._buildBody($widgetInstance);
			} catch (exc) {
				// Do nothing
			}
		},

		// FORMAT: convert the text to the given format
		_formatText : function (format, text) {

			var specialRegEx = new RegExp("[0-9]|'([\\[\\]\\^\\$\\.\\|\\?\\*\\+\\(\\)\\\\~`\\!@#%&\\-_+={}'\\\"\\\"<>:;, ])'", "g"),
				numbers = null,		// Matched numbers from text
				options = null,		// Options for formating
				num,				// Number being formatted
				places,				// Number of decimal places
				dec,				// Decimal seperator
				thou,				// Thousands seperator
				sign,				// Negative Sign
				dNum,				// Decimal portion of the number
				wNum,				// Whole portion of the number
				cur,				// Currency symbol
				side,				// Side of the number the currency symbol will appear
				date;

			if (!format) { return text; }

			if (format.match(/cur\([\d\[,\'\S\'\[,\'\S\']*\]*\]*\)/)) {
				numbers = text.match(/\d+[\.\d+]*/);
				options = format.replace(/cur\(|\)/g, "").split("|");
				if (numbers.length === 1) {

					num = parseFloat(numbers[0], 10);
					places = options[0] || 2;
					dec = options[2] ||  '.';
					thou = options[1] || ',';
					sign = (num < 0) ? '-' : '';
					dNum = parseInt(num = Math.abs(num).toFixed(places), 10).toString();
					wNum = ((wNum = dNum.length) > 3) ? wNum % 3 : 0;
					cur = options[3] || '$';
					side = options[4] || 'L';

					return (side === 'L' ? cur + " " : "")
						+ sign + (wNum ? dNum.substr(0, wNum) + thou : '')
						+ dNum.substr(wNum).replace(/(\d{3})(?=\d)/g, "$1" + thou)
						+ (places ? dec + Math.abs(num - dNum).toFixed(places).slice(2) : '')
						+ (side === 'R' ? " " + cur : "");

				}

				return text;

			}

			if (format.match(/dec\(\d+[,\'\S\'\[,\'\S\']*\]*\)/)) {
				numbers = text.match(/\d+[\.\d+]*/);
				options = format.replace(/dec\(|\)/g, "").split("|");

				if (typeof numbers !== 'undefined' && numbers !== null && numbers.length === 1) {

					num = parseFloat(numbers[0], 10);
					places = options[0] || 2;
					dec = options[2] || '.';
					thou = options[1] || ',';
					sign = (num < 0) ? '-' : '';
					dNum = parseInt(num = Math.abs(num).toFixed(places), 10).toString();
					wNum = ((wNum = dNum.length) > 3) ? wNum % 3 : 0;
					return sign + (wNum ? dNum.substr(0, wNum) + thou : '')
						+ dNum.substr(wNum).replace(/(\d{3})(?=\d)/g, "$1" + thou)
						+ (places ? dec + Math.abs(num - dNum).toFixed(places).slice(2) : '');

				}

				return text;
			}

			if (format.match(/date/)) {

				options = format.replace(/date\(|\)/g, "");
				date = new Date.parse(text);

				return date.toString(options);

			}

			return text;

		},

		_resize : function (evt, ui) {

			if (ui.originalSize.height !== ui.size.height) {
				$("." + $(ui.helper).attr("class").match(/row[0-9]+/)).css("height", ui.size.height);
			}

			if (ui.originalSize.width !== ui.size.width) {
				$("." + $(ui.helper).attr("class").match(/col[0-9]+/)).css("width", ui.size.width);
			}

		},

		// STRIPE: stripe the table
		_stripe : function ($widgetInstance) {
			if ($widgetInstance.options.addClass.oddRow) {
				$widgetInstance._table.find("tbody tr").filter(":nth-child(odd)").addClass($widgetInstance.options.addClass.oddRow);
			}

			if ($widgetInstance.options.addClass.evenRow) {
				$widgetInstance._table.find("tbody tr").filter(":nth-child(even)").addClass($widgetInstance.options.addClass.evenRow);
			}

			if ($widgetInstance.options.addClass.evenCol) {
				$widgetInstance._table.find("tr td").filter(":nth-child(even)").addClass($widgetInstance.options.addClass.evenCol);
			}

			if ($widgetInstance.options.addClass.oddCol) {
				$widgetInstance._table.find("tr td").filter(":nth-child(odd)").addClass($widgetInstance.options.addClass.oddCol);
			}
		},

		// BODY: build the tbody of the table and replace the existing table
		_buildBody : function ($widgetInstance) {

			// The table body is created from the table data

			var body = $("<tbody class='ui-gridview-tableBody'>"),
				startIndex = 0,
				endIndex = $widgetInstance.options.tableData.length;

			if ($widgetInstance._pagination.on) {
				startIndex = $widgetInstance._pagination.currentPage * $widgetInstance.options.visibleRows;
				endIndex = startIndex + $widgetInstance.options.visibleRows <= $widgetInstance.options.tableData.length
					? startIndex + $widgetInstance.options.visibleRows
					: $widgetInstance.options.tableData.length;
			}

			$.each($widgetInstance.options.tableData, function (rowIndex, row) {

				if (rowIndex >= startIndex) {
					body.append("<tr class='ui-gridView-tr row" + (rowIndex + 1) + "'><td class='ui-gridView-td selector'><input type='checkbox'></input></td></tr>");
					$.each(row, function (colIndex, val) {

						var outputText = val;
						if ($widgetInstance.options.columnModel[colIndex].format) {
							outputText = $widgetInstance._formatText($widgetInstance.options.columnModel[colIndex].format, val);
						}

						body.find("tr:last").append("<td class=\"ui-gridView-td row" + (rowIndex + 1) + " col" + colIndex + "\"><div style='overflow:hidden;'>" + outputText + "</div></td>");

					});
				}
				if (rowIndex >= endIndex - 1) {
					return false;
				}

			});

			// Remove the selector column if the table doesn't have that feature
			if ($widgetInstance.options.selectable === false) {
				body.find(".selector").remove();
			}

			// Replace old tbody with new tbody
			$widgetInstance._table.find("tbody").replaceWith(body);

			// Make table resizable
			$widgetInstance._table.find("tbody td").resizable({
				handles: "e, s",
				resize : this._resize
			});

			// Add hover to the table
			$widgetInstance._table.find("tbody").on("hover", "td", function (evt) {
				var cell = evt.target.tagName === 'TD' ? $(evt.target) : $(evt.target).parent();
				cell.toggleClass("ui-gridView-hover");
			});

			$widgetInstance._stripe($widgetInstance);

		},

		// HEADER: build the header for the table
		_buildHeader : function ($widgetInstance) {
			var header = $("<tr class='ui-gridView-header ui-gridView-tr'><th class='ui-gridView-th selector'></th></tr>");

			// The header row is created from the columnName property

			$.each($widgetInstance.options.columnModel, function (colIndex, val) {

				var newCell = $("<th class=\"ui-gridView-th row0 col" + colIndex + "\"><span>" + val.text + "</span></th>");

				if (val.sort !== false) {
					newCell.append("<span style='float:right' class=\"ui-icon-arrow ui-state-highlight ui-icon ui-icon-triangle-2-n-s \">Next</span>");
				}

				header.append(newCell);

			});

			if ($widgetInstance.options.addClass.header) {
				header.find("th").addClass($widgetInstance.options.addClass.header);
			}

			if ($widgetInstance.options.selectable === false) {
				header.find(".selector").remove();
			}

			// The header row is appended to the thead tag
			$widgetInstance._table.find("thead").append(header);

		}
	});

}(jQuery));