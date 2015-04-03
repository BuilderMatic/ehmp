var dependencies = [
    'backbone',
    'marionette',
    'jquery',
    'underscore',
    'backgrid',
    'main/backgrid/dataGridView',
    'main/backgrid/extensions/clickableRow',
    'main/backgrid/extensions/modalRow',
    "main/backgrid/extensions/headerCell",
    'main/backgrid/extensions/groupBy/groupByBody',
    'main/backgrid/extensions/groupBy/groupByHeader',
    "backgrid-moment-cell",
    'main/backgrid/extensions/defaultOverrides',
    'backgrid.filter',
    'backgrid.paginator'
];

define(dependencies, onResolveDependencies);

function onResolveDependencies(Backbone, Marionette, $, _, Backgrid, dataGridView, ClickableRow, ModalRow, HeaderCell, GroupByBody, GroupByHeader) {
    'use strict';
    var DataGrid = {};

    DataGrid.returnView = function(options) {
        var GridLayoutView = dataGridView.extend({
            initialize: function() {
                this.options = options;
                this.appletConfig = options.appletConfig;
                var groupableOptions = {};
                _.each(options.columns, function(column) {
                    column.editable = false;
                    column.headerCell = HeaderCell;
                    column.sortType = 'toggle';
                    if (options.groupable && column.groupable) {
                        column.headerCell = GroupByHeader;
                        column.sortable = true;
                        column.sortType = "cycle";
                    }
                    column.appletId = options.appletConfig.id;
                    if (column.cell === undefined) {
                        column.cell = 'string';
                    }
                    if (column.sortValue === undefined) {
                        column.sortValue = function(model, sortKey) {
                            if (model.get(sortKey)) {
                                return model.get(sortKey).toLowerCase();
                            } else {
                                return '';
                            }
                        };
                    }
                });

                var body = options.groupable ? GroupByBody : options.body || undefined;

                if (options.enableModal === true) {
                    this.gridView = new Backgrid.Grid({
                        id: 'data-grid-' + options.appletConfig.id,
                        className: 'backgrid table table-hover',
                        row: ModalRow,
                        body: body,
                        columns: options.columns,
                        collection: options.collection,
                        emptyText: options.emptyText,
                        groupableOptions: groupableOptions
                    });
                } else {
                    this.gridView = new Backgrid.Grid({
                        id: 'data-grid-' + options.appletConfig.id,
                        className: 'backgrid table table-hover',
                        row: ClickableRow,
                        body: body,
                        columns: options.columns,
                        collection: options.collection,
                        emptyText: options.emptyText,
                        groupableOptions: groupableOptions
                    });
                }
            },
            onRender: function() {
                this.dataGrid.show(this.gridView);
            },
            events: {
                'click tr.selectable': 'onClickRow',
                'keydown tr.selectable': 'onEnterRow',
                'keydown th': 'onEnterHeader'
            },
            onEnterRow: function(event) {
                if (event.which == 13 || event.which == 32) {
                    $(event.target).click();
                }
            },
            onEnterHeader: function(event) {
                if (event.which == 13 || event.which == 32) {
                    $(event.target).find('a').click();
                }
            },
            onClickRow: function(event) {
                var row = $(event.target).closest("tr");
                var model = row.data('model');
                if (this.options.onClickRow) {
                    this.options.onClickRow(model, event, this);
                } else if (this.options.DetailsView) {
                    this.expandRow(model, event);
                }
            },
            expandRow: function(model, event) {
                var collection = this.options.collection;
                var DetailsView = this.options.DetailsView;
                var row = $(event.currentTarget).closest('tr');
                //Remove any bootstrap modal attributes on row
                row.removeAttr('data-toggle');
                row.removeAttr('data-target');
                var id = row.attr('id');
                var detailsId = 'details-' + id;
                //escape the special characters if any
                id = id.replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/\[/g, '\\[').replace(/\]/g, '\\]').replace(/\{/g, '\\{').replace(/\}/g, '\\}').replace(/\#/g, '\\#');
                var detailsSelector = '#details-' + id;
                if ($(detailsSelector).hasClass('hide')) {
                    $(detailsSelector).removeClass('hide');
                    row.focus();
                } else {
                    $(detailsSelector).addClass('hide');
                }
                if ($(detailsSelector).length === 0) {
                    row.focus();
                    var colspan = row.children().length;
                    var td = $('<td/>').addClass('renderable').attr('colspan', colspan).attr('id', detailsId).addClass('expanded-row');
                    var tr = $('<tr/>');
                    td.appendTo(tr);
                    tr.insertAfter(row);
                    var region = {};
                    region[detailsId] = detailsSelector;
                    this.addRegions(region);
                    var detailsView = new DetailsView({
                        model: model,
                        collection: collection
                    });
                    this[detailsId].show(detailsView);
                }
            }

        });
        return GridLayoutView;
    };

    DataGrid.create = function(options) {
        var temp = this.returnView(options);
        return new temp;
    };

    return DataGrid;
}